import{ Component, OnInit, OnDestroy, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient, HttpErrorResponse } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser, Location } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ Router } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ PREFIJOS, Pais } from "../prefijos";
import{ Auth, UsuarioSesion } from "../auth";

//Datos editables del perfil (mismos campos que el registro, sin contraseña)
interface DatosPerfil{
  email: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  prefijo: string;
  telefono1: string;
  telefono2: string;
  dni: string;
  sexo: string;
}

//Movimiento periódico del usuario (plantilla) para la pestaña "Mov. periódicos"
interface MovimientoPeriodico{
  idMovimientoUsuario: number;
  descripcion: string;
  tipo: string;
  gasto: string;
  cantidad: number;
  idPeriodo: number;
  periodo: string;
  diaCobro: number | null;
  mesCobro: number | null;
  fechaFinMovimiento: string;
}

//Periodo de repetición del catálogo (Diario, Semanal, ...) para el desplegable del modal
interface Periodo{
  idPeriodo: number;
  periodo: string;
}

type Pestana = "datos" | "contrasena" | "periodicos";

@Component({
  selector: "app-perfil",
  standalone: true,
  imports: [CommonModule, FormsModule, Header, FooterComponent],
  templateUrl: "./perfil.html"
})
export class Perfil implements OnInit, OnDestroy{
  private readonly usuariosUrl = "http://localhost:8080/api/usuarios";
  private readonly authUrl = "http://localhost:8080/api/auth";
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";
  private readonly periodosUrl = "http://localhost:8080/api/periodos";
  readonly prefijos = PREFIJOS;

  //Nombres para los desplegables del día de cobro de los movimientos periódicos
  readonly diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  readonly meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  //Días máximos de cada mes (febrero con 29 para permitir los bisiestos)
  private readonly diasPorMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  pestana = signal<Pestana>("datos");

  //Usuario que se está editando: el subusuario activo o, si no hay, el principal
  private usuarioEditando: UsuarioSesion | null = null;
  //Un subusuario solo tiene nombre, apellidos y sexo (ni email, ni DNI, ni teléfono, ni contraseña)
  esSubusuario = signal(false);

  //--- Pestaña de datos ---
  datos: DatosPerfil = this.datosVacios();
  sexoElegido = signal("M");
  guardando = signal(false);
  errorDatos = signal<string | null>(null);
  avisoDatos = signal<string | null>(null);

  //--- Cambio de email con confirmación por código enviado al correo nuevo ---
  //Modal de confirmación abierto (true mientras se espera el código)
  verificandoEmail = signal(false);
  //Correo nuevo a la espera de confirmación (se muestra en el modal)
  emailPendiente = signal("");
  //Código de 5 cifras que el usuario recibe en el correo nuevo
  codigoEmail = "";
  confirmandoEmail = signal(false);
  errorCodigoEmail = signal<string | null>(null);
  //Cuenta atrás de 2 minutos; al llegar a 0 el código deja de ser válido
  segundosRestantesEmail = signal(0);
  private temporizadorEmail: ReturnType<typeof setInterval> | null = null;
  //Formatea los segundos restantes como m:ss para el modal
  tiempoRestanteEmail = computed(() =>{
    const total = this.segundosRestantesEmail();
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${minutos}:${segundos.toString().padStart(2, "0")}`;
  });

  //Desplegable de prefijos (mismo comportamiento que en el registro)
  prefijoAbierto = signal(false);
  busquedaPrefijo = signal("");
  paisSeleccionado = signal<Pais | null>(null);
  prefijosFiltrados = computed(() =>{
    const q = this.normaliza(this.busquedaPrefijo());
    if (!q){
      return this.prefijos;
    }
    return this.prefijos.filter(
      (p) => this.normaliza(p.name).includes(q) || p.phoneCode.includes(q)
    );
  });

  //--- Pestaña de movimientos periódicos ---
  periodicos = signal<MovimientoPeriodico[]>([]);
  cargandoPeriodicos = signal(false);
  errorPeriodicos = signal<string | null>(null);
  //Catálogo de periodos para el desplegable de periodicidad del modal
  periodos = signal<Periodo[]>([]);

  //Modal de edición de la periodicidad y el día de cobro (abierto si hay un movimiento seleccionado)
  editandoPeriodico = signal<MovimientoPeriodico | null>(null);
  periodoEdit = "";
  diaCobroEdit = 1;
  mesCobroEdit = 1;
  guardandoPeriodico = signal(false);
  errorDiaCobro = signal<string | null>(null);

  //Modal de confirmación para eliminar un movimiento periódico
  eliminandoPeriodico = signal<MovimientoPeriodico | null>(null);
  borrandoPeriodico = signal(false);
  errorEliminar = signal<string | null>(null);

  //--- Pestaña de contraseña ---
  contrasenas ={ actual: "", nueva: "", repetir: "" };
  //Cada campo controla por separado si su contraseña se ve o se oculta
  verContrasena = signal({ actual: false, nueva: false, repetir: false });
  cambiando = signal(false);
  errorContrasena = signal<string | null>(null);
  avisoContrasena = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router, private auth: Auth, private location: Location, @Inject(PLATFORM_ID) private platformId: Object){}

  ngOnInit(): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    //El usuario a editar es el subusuario cuyo panel se está viendo o, si no hay, el principal
    const usuario = this.auth.usuarioEnGestion();
    if (!usuario){
      this.router.navigate(["/acceso"]);
      return;
    }
    this.usuarioEditando = usuario;
    this.esSubusuario.set(usuario.idUsuarioPrincipal != null);
    this.rellenarDatos(usuario);

    //Trae los datos completos del backend (incluye idUsuarioPrincipal) por si en sesión venían parciales
    this.http.get<UsuarioSesion>(`${this.usuariosUrl}/${usuario.idUsuario}`).subscribe({
      next: (completo) =>{
        if (completo){
          this.usuarioEditando = completo;
          this.esSubusuario.set(completo.idUsuarioPrincipal != null);
          this.rellenarDatos(completo);
        }
      },
      error: (err) => console.error("Error al cargar los datos del usuario:", err)
    });

    this.cargarPeriodicos();

    //Catálogo de periodos para el desplegable de periodicidad
    this.http.get<Periodo[]>(this.periodosUrl).subscribe({
      next: (periodos) => this.periodos.set(periodos ?? []),
      error: (err) => console.error("Error al cargar los periodos:", err)
    });
  }

  cambiarPestana(pestana: Pestana): void{
    //Un subusuario no tiene contraseña propia, así que esa pestaña no existe para él
    if (pestana === "contrasena" && this.esSubusuario()){
      return;
    }
    this.pestana.set(pestana);
  }

  //Vuelca los datos del usuario en el formulario
  private rellenarDatos(usuario: UsuarioSesion): void{
    this.datos ={
      email: usuario.email ?? "",
      nombre: usuario.nombre ?? "",
      apellido1: usuario.apellido1 ?? "",
      apellido2: usuario.apellido2 ?? "",
      prefijo: usuario.prefijo ?? "+34",
      telefono1: usuario.telefono1 ?? "",
      telefono2: usuario.telefono2 ?? "",
      dni: usuario.dni ?? "",
      sexo: usuario.sexo ?? "M"
    };
    this.sexoElegido.set(this.datos.sexo);
    this.paisSeleccionado.set(this.prefijos.find((p) => p.phoneCode === this.datos.prefijo) ?? null);
  }

  //--- Movimientos periódicos ---
  private cargarPeriodicos(): void{
    const usuario = this.usuarioEditando;
    if (!usuario){
      return;
    }
    this.cargandoPeriodicos.set(true);
    this.errorPeriodicos.set(null);
    this.http.get<MovimientoPeriodico[]>(`${this.movimientosUrl}/periodicos?usuario=${usuario.idUsuario}`).subscribe({
      next: (movimientos) =>{
        this.cargandoPeriodicos.set(false);
        this.periodicos.set(movimientos ?? []);
      },
      error: (err) =>{
        this.cargandoPeriodicos.set(false);
        this.errorPeriodicos.set("No se pudieron cargar los movimientos periódicos.");
        console.error("Error al cargar los movimientos periódicos:", err);
      }
    });
  }

  //Texto descriptivo de cuándo se cobra/ingresa cada movimiento periódico
  textoCobro(m: MovimientoPeriodico): string{
    const verbo = m.gasto === "S" ? "Se cobra" : "Se ingresa";
    const dia = m.diaCobro ?? 1;
    switch (m.periodo){
      case "Diario": return `${verbo} cada día`;
      case "Semanal": return `${verbo} cada ${this.diasSemana[dia - 1].toLowerCase()}`;
      case "Mensual": return `${verbo} el día ${dia} de cada mes`;
      case "2 meses": return `${verbo} el día ${dia} cada 2 meses`;
      case "Anual": return `${verbo} cada ${dia} de ${this.meses[(m.mesCobro ?? 1) - 1].toLowerCase()}`;
      default: return verbo;
    }
  }

  //Icono de Bootstrap para cada tipo de movimiento (mismo mapa que en el panel de usuario)
  private readonly iconosTipo: Record<string, string> = {
    "Nómina": "bi-briefcase-fill",
    "Beneficios de inversiones": "bi-graph-up-arrow",
    "Regalos": "bi-gift-fill",
    "Otros": "bi-cash-coin",
    "Fijos": "bi-calendar3",
    "Variables": "bi-list",
    "Gastos de ocio": "bi-cup-straw",
    "Comida y casa": "bi-house-fill",
    "Hijos": "bi-backpack-fill",
    "Transporte/vehículo": "bi-car-front-fill",
    "Inversiones": "bi-bank",
    "Imprevistos": "bi-patch-exclamation-fill",
    "Otros gastos": "bi-cash-coin"
  };
  iconoTipo(tipo: string): string{
    return this.iconosTipo[tipo] ?? "bi-cash-coin";
  }

  //Días seleccionables en el modal según la periodicidad elegida (y el mes si es anual).
  //En mensual/2 meses el máximo es el 30 porque no todos los meses tienen día 31.
  get diasEditables(): number[]{
    const tope = this.periodoEdit === "Anual" ? this.diasPorMes[this.mesCobroEdit - 1] : 30;
    return Array.from({ length: tope }, (_, i) => i + 1);
  }

  abrirEditarPeriodico(m: MovimientoPeriodico): void{
    this.periodoEdit = m.periodo;
    this.diaCobroEdit = m.diaCobro ?? 1;
    this.mesCobroEdit = m.mesCobro ?? 1;
    this.errorDiaCobro.set(null);
    this.editandoPeriodico.set(m);
  }

  cerrarEditarPeriodico(): void{
    this.editandoPeriodico.set(null);
  }

  //Al cambiar la periodicidad se ajusta el día para que quepa en la nueva escala
  cambioPeriodoEdit(): void{
    if (this.periodoEdit === "Semanal" && this.diaCobroEdit > 7){
      this.diaCobroEdit = 1;
    }
    this.ajustarDiaCobro();
  }

  //Ajusta el día si el tope de la periodicidad o del mes elegido es menor
  ajustarDiaCobro(): void{
    const tope = this.periodoEdit === "Anual" ? this.diasPorMes[this.mesCobroEdit - 1] : 30;
    if (this.diaCobroEdit > tope){
      this.diaCobroEdit = tope;
    }
  }

  guardarPeriodico(): void{
    const usuario = this.usuarioEditando;
    const m = this.editandoPeriodico();
    const periodo = this.periodos().find((p) => p.periodo === this.periodoEdit);
    if (!usuario || !m || !periodo){
      return;
    }
    this.guardandoPeriodico.set(true);
    this.errorDiaCobro.set(null);
    this.http.put(`${this.movimientosUrl}/periodicos/${m.idMovimientoUsuario}`,{
      idUsuario: usuario.idUsuario,
      idPeriodo: periodo.idPeriodo,
      diaCobro: this.periodoEdit === "Diario" ? null : this.diaCobroEdit,
      mesCobro: this.periodoEdit === "Anual" ? this.mesCobroEdit : null
    }).subscribe({
      next: () =>{
        this.guardandoPeriodico.set(false);
        this.editandoPeriodico.set(null);
        this.cargarPeriodicos();
      },
      error: (err) =>{
        this.guardandoPeriodico.set(false);
        this.errorDiaCobro.set("No se pudo guardar el cambio. Inténtalo de nuevo.");
        console.error("Error al guardar el movimiento periódico:", err);
      }
    });
  }

  //--- Eliminar un movimiento periódico ---
  abrirEliminarPeriodico(m: MovimientoPeriodico): void{
    this.errorEliminar.set(null);
    this.eliminandoPeriodico.set(m);
  }

  cerrarEliminarPeriodico(): void{
    this.eliminandoPeriodico.set(null);
  }

  eliminarPeriodico(): void{
    const usuario = this.usuarioEditando;
    const m = this.eliminandoPeriodico();
    if (!usuario || !m){
      return;
    }
    this.borrandoPeriodico.set(true);
    this.errorEliminar.set(null);
    this.http.delete(`${this.movimientosUrl}/periodicos/${m.idMovimientoUsuario}?usuario=${usuario.idUsuario}`).subscribe({
      next: () =>{
        this.borrandoPeriodico.set(false);
        this.eliminandoPeriodico.set(null);
        this.cargarPeriodicos();
      },
      error: (err) =>{
        this.borrandoPeriodico.set(false);
        this.errorEliminar.set("No se pudo eliminar el movimiento. Inténtalo de nuevo.");
        console.error("Error al eliminar el movimiento periódico:", err);
      }
    });
  }

  //Vuelve a la página anterior del historial (de donde se abrió "Editar perfil"),
  //en vez de una ruta fija. Si no hay historial previo dentro de la app, cae al panel.
  volver(): void{
    const historial = isPlatformBrowser(this.platformId) ? window.history.length : 0;
    if (historial > 1){
      this.location.back();
    }else{
      this.router.navigate(["/panel"]);
    }
  }

  //--- Guardar datos (mismas validaciones que la creación de usuario) ---
  guardarDatos(): void{
    const d = this.datos;
    this.avisoDatos.set(null);

    //Un subusuario solo edita nombre, apellidos y sexo
    if (this.esSubusuario()){
      this.guardarDatosSubusuario();
      return;
    }

    if (!d.email.trim() || !d.nombre.trim() || !d.apellido1.trim() || !d.prefijo || !d.telefono1.trim() || !d.dni.trim()){
      this.errorDatos.set("El email, el nombre, el primer apellido, el prefijo, el teléfono 1 y el DNI son obligatorios.");
      return;
    }

    if (d.email.trim().length > 50){
      this.errorDatos.set("El email no puede superar los 50 caracteres.");
      return;
    }

    if (!this.emailValido(d.email.trim())){
      this.errorDatos.set("El email no es válido. Formato: nombre@dominio.ext");
      return;
    }

    if (!this.dniNieValido(d.dni)){
      this.errorDatos.set("El DNI/NIE no es válido. Formato: 8 cifras + letra (DNI) o X/Y/Z + 7 cifras + letra (NIE).");
      return;
    }

    if (!/^[0-9]{1,9}$/.test(d.telefono1.trim())){
      this.errorDatos.set("El teléfono 1 debe contener solo números.");
      return;
    }

    if (d.telefono2.trim() && !/^[0-9]{1,9}$/.test(d.telefono2.trim())){
      this.errorDatos.set("El teléfono 2 debe contener solo números.");
      return;
    }

    const usuario = this.auth.usuario();
    if (!usuario){
      return;
    }

    //El correo no se envía en el PUT: si ha cambiado, se confirma aparte por código.
    const emailNuevo = d.email.trim();
    const emailCambiado = emailNuevo.toLowerCase() !== (usuario.email ?? "").trim().toLowerCase();

    const payload ={
      nombre: d.nombre.trim(),
      apellido1: d.apellido1.trim(),
      apellido2: d.apellido2.trim() || null,
      prefijo: d.prefijo,
      telefono1: d.telefono1.trim(),
      telefono2: d.telefono2.trim() || null,
      dni: d.dni.trim().toUpperCase(),
      sexo: d.sexo
    };

    this.guardando.set(true);
    this.errorDatos.set(null);
    this.http.put<UsuarioSesion>(`${this.usuariosUrl}/${usuario.idUsuario}`, payload).subscribe({
      next: (actualizado) =>{
        this.guardando.set(false);
        const fusion = { ...usuario, ...actualizado };
        //Actualiza la sesión para que el resto de la app vea los datos nuevos
        this.auth.iniciarSesion(fusion);
        this.usuarioEditando = fusion;
        //Si el principal también era el usuario activo, mantenlo al día
        if (this.auth.usuarioActivo()){
          this.auth.activarUsuario(fusion);
        }
        //Si además ha cambiado el correo, se pide el código de confirmación al correo nuevo
        if (emailCambiado){
          this.solicitarCambioEmail(emailNuevo);
        }else{
          this.avisoDatos.set("Datos guardados correctamente.");
        }
      },
      error: (err: HttpErrorResponse) =>{
        this.guardando.set(false);
        if (err.status === 409){
          this.errorDatos.set("El email ya está registrado por otro usuario.");
        }else if (err.status === 400){
          this.errorDatos.set("No se pudieron guardar los datos. Revísalos.");
        }else{
          this.errorDatos.set("Conexión fallida");
        }
      }
    });
  }

  //Guardado de un subusuario: solo nombre, apellidos y sexo
  private guardarDatosSubusuario(): void{
    const d = this.datos;
    const usuario = this.usuarioEditando;
    if (!usuario){
      return;
    }

    if (!d.nombre.trim() || !d.apellido1.trim()){
      this.errorDatos.set("El nombre y el primer apellido son obligatorios.");
      return;
    }

    const payload ={
      nombre: d.nombre.trim(),
      apellido1: d.apellido1.trim(),
      apellido2: d.apellido2.trim() || null,
      sexo: d.sexo
    };

    this.guardando.set(true);
    this.errorDatos.set(null);
    this.http.put<UsuarioSesion>(`${this.usuariosUrl}/${usuario.idUsuario}`, payload).subscribe({
      next: (actualizado) =>{
        this.guardando.set(false);
        const fusion = { ...usuario, ...actualizado };
        this.usuarioEditando = fusion;
        //Mantiene al día el usuario activo (el subusuario que se está gestionando)
        this.auth.activarUsuario(fusion);
        this.avisoDatos.set("Datos guardados correctamente.");
      },
      error: (err: HttpErrorResponse) =>{
        this.guardando.set(false);
        if (err.status === 400){
          this.errorDatos.set("No se pudieron guardar los datos. Revísalos.");
        }else{
          this.errorDatos.set("Conexión fallida");
        }
      }
    });
  }

  //--- Cambio de contraseña ---
  cambiarContrasena(): void{
    const c = this.contrasenas;
    this.avisoContrasena.set(null);

    if (!c.actual || !c.nueva || !c.repetir){
      this.errorContrasena.set("Los tres campos son obligatorios.");
      return;
    }

    if (c.nueva.length > 20){
      this.errorContrasena.set("La contraseña nueva no puede superar los 20 caracteres.");
      return;
    }

    if (c.nueva !== c.repetir){
      this.errorContrasena.set("La contraseña nueva no coincide en los dos campos.");
      return;
    }

    const usuario = this.auth.usuario();
    if (!usuario){
      return;
    }

    this.cambiando.set(true);
    this.errorContrasena.set(null);
    this.http.post<void>(`${this.authUrl}/cambiar-contrasena`,{
      idUsuario: usuario.idUsuario,
      contrasenaActual: c.actual,
      contrasenaNueva: c.nueva
    }).subscribe({
      next: () =>{
        this.cambiando.set(false);
        this.contrasenas ={ actual: "", nueva: "", repetir: "" };
        this.avisoContrasena.set("Contraseña cambiada correctamente.");
      },
      error: (err: HttpErrorResponse) =>{
        this.cambiando.set(false);
        if (err.status === 401){
          this.errorContrasena.set("La contraseña actual no es correcta.");
        }else if (err.status === 400){
          this.errorContrasena.set("No se pudo cambiar la contraseña. Revisa los datos.");
        }else{
          this.errorContrasena.set("Conexión fallida");
        }
      }
    });
  }

  //--- Cambio de email con confirmación por código ---
  //Paso 1: pide al backend que envíe un código al correo nuevo y abre el modal de confirmación.
  //Los demás datos ya se han guardado; el correo solo cambiará si se confirma el código a tiempo.
  private solicitarCambioEmail(emailNuevo: string): void{
    const usuario = this.auth.usuario();
    if (!usuario){
      return;
    }
    this.errorDatos.set(null);
    this.errorCodigoEmail.set(null);
    this.codigoEmail = "";
    this.http.post<void>(`${this.authUrl}/cambiar-email/solicitar`,{
      idUsuario: usuario.idUsuario,
      email: emailNuevo
    }).subscribe({
      next: () =>{
        this.emailPendiente.set(emailNuevo);
        this.verificandoEmail.set(true);
        this.iniciarCuentaAtrasEmail();
      },
      error: (err: HttpErrorResponse) =>{
        //El resto de datos sí se guardaron; solo falla el cambio de correo
        if (err.status === 409){
          this.errorDatos.set("Ese correo ya está registrado por otra cuenta. El resto de datos sí se han guardado.");
        }else if (err.status === 400){
          this.errorDatos.set("El correo nuevo no es válido. El resto de datos sí se han guardado.");
        }else{
          this.errorDatos.set("No se pudo iniciar el cambio de correo. El resto de datos sí se han guardado.");
        }
        //Se restaura en el formulario el correo actual, ya que no ha llegado a cambiar
        this.datos.email = usuario.email ?? "";
      }
    });
  }

  //Paso 2: envía el código introducido. Solo si es correcto y dentro de los 2 minutos se cambia el correo.
  confirmarCambioEmail(): void{
    const usuario = this.auth.usuario();
    if (!usuario){
      return;
    }
    const codigo = this.codigoEmail.trim();
    if (!/^[0-9]{5}$/.test(codigo)){
      this.errorCodigoEmail.set("Introduce el código de 5 cifras que has recibido por correo.");
      return;
    }
    this.confirmandoEmail.set(true);
    this.errorCodigoEmail.set(null);
    this.http.post<UsuarioSesion>(`${this.authUrl}/cambiar-email/confirmar`,{
      idUsuario: usuario.idUsuario,
      codigo
    }).subscribe({
      next: (actualizado) =>{
        this.confirmandoEmail.set(false);
        const fusion = { ...usuario, ...actualizado };
        this.auth.iniciarSesion(fusion);
        this.usuarioEditando = fusion;
        if (this.auth.usuarioActivo()){
          this.auth.activarUsuario(fusion);
        }
        this.datos.email = fusion.email ?? "";
        this.cerrarVerificacionEmail();
        this.avisoDatos.set("Correo actualizado correctamente.");
      },
      error: (err: HttpErrorResponse) =>{
        this.confirmandoEmail.set(false);
        if (err.status === 410){
          //Han pasado los 2 minutos: el cambio ya no es válido
          this.detenerCuentaAtrasEmail();
          this.segundosRestantesEmail.set(0);
          this.errorCodigoEmail.set("El tiempo ha expirado. Cierra y vuelve a guardar para pedir un código nuevo.");
        }else if (err.status === 409){
          this.errorCodigoEmail.set("Ese correo ya está registrado por otra cuenta.");
        }else{
          this.errorCodigoEmail.set("El código no es correcto.");
        }
      }
    });
  }

  //Cierra el modal sin confirmar: descarta el cambio pendiente y restaura el correo actual
  cerrarVerificacionEmail(): void{
    const usuario = this.auth.usuario();
    if (usuario && this.verificandoEmail()){
      this.http.post<void>(`${this.authUrl}/cambiar-email/cancelar`, { idUsuario: usuario.idUsuario, codigo: "" })
        .subscribe({ error: () => {} });
    }
    this.detenerCuentaAtrasEmail();
    this.verificandoEmail.set(false);
    this.emailPendiente.set("");
    this.codigoEmail = "";
    this.errorCodigoEmail.set(null);
    if (usuario){
      this.datos.email = usuario.email ?? "";
    }
  }

  //Cuenta atrás visual de 2 minutos (la validez real la controla el backend)
  private iniciarCuentaAtrasEmail(): void{
    this.detenerCuentaAtrasEmail();
    this.segundosRestantesEmail.set(120);
    this.temporizadorEmail = setInterval(() =>{
      const restante = this.segundosRestantesEmail() - 1;
      if (restante <= 0){
        this.segundosRestantesEmail.set(0);
        this.detenerCuentaAtrasEmail();
        this.errorCodigoEmail.set("El tiempo ha expirado. Cierra y vuelve a guardar para pedir un código nuevo.");
      }else{
        this.segundosRestantesEmail.set(restante);
      }
    }, 1000);
  }

  private detenerCuentaAtrasEmail(): void{
    if (this.temporizadorEmail){
      clearInterval(this.temporizadorEmail);
      this.temporizadorEmail = null;
    }
  }

  ngOnDestroy(): void{
    this.detenerCuentaAtrasEmail();
  }

  //--- Ayudas (mismas que en el registro) ---
  elegirSexo(valor: string): void{
    this.datos.sexo = valor;
    this.sexoElegido.set(valor);
  }

  toggleVerContrasena(campo: "actual" | "nueva" | "repetir"): void{
    this.verContrasena.update((estado) => ({ ...estado, [campo]: !estado[campo] }));
  }

  togglePrefijo(): void{
    this.busquedaPrefijo.set("");
    this.prefijoAbierto.update((abierto) => !abierto);
  }

  cerrarPrefijo(): void{
    this.prefijoAbierto.set(false);
  }

  seleccionarPrefijo(pais: Pais): void{
    this.paisSeleccionado.set(pais);
    this.datos.prefijo = pais.phoneCode;
    this.prefijoAbierto.set(false);
  }

  soloNumeros(evento: Event, campo: "telefono1" | "telefono2"): void{
    const input = evento.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, "");
    input.value = limpio;
    this.datos[campo] = limpio;
  }

  private datosVacios(): DatosPerfil{
    return{
      email: "",
      nombre: "",
      apellido1: "",
      apellido2: "",
      prefijo: "+34",
      telefono1: "",
      telefono2: "",
      dni: "",
      sexo: "M"
    };
  }

  private normaliza(texto: string): string{
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  private emailValido(valor: string): boolean{
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  }

  //Valida un DNI o NIE español (formato + letra de control)
  private dniNieValido(valor: string): boolean{
    const v = valor.toUpperCase().trim();
    const letras = "TRWAGMYFPDXBNJZSQVHLCKE";
    let numero: number;
    if (/^[0-9]{8}[A-Z]$/.test(v)){
      numero = parseInt(v.substring(0, 8), 10);
    } else if (/^[XYZ][0-9]{7}[A-Z]$/.test(v)){
      const prefijoNie ={ X: "0", Y: "1", Z: "2" }[v[0]]!;
      numero = parseInt(prefijoNie + v.substring(1, 8), 10);
    } else{
      return false;
    }
    return letras[numero % 23] === v[v.length - 1];
  }
}
