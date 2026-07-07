import{ Component, OnInit, AfterViewInit, ElementRef, Renderer2, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient, HttpErrorResponse } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ Router } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ PREFIJOS, Pais } from "../prefijos";
import{ Auth, UsuarioSesion } from "../auth";

interface NuevoUsuario{
  email: string;
  contrasena: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  prefijo: string;
  telefono1: string;
  telefono2: string;
  dni: string;
  sexo: string;
}

//Pantallas por las que pasa el inicio de sesión
type Modo = "login" | "registro" | "verificar";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, Header, FooterComponent],
  templateUrl: "./login.html",
  styleUrl: "./login.scss"
})
export class Login implements OnInit, AfterViewInit{
  private readonly apiUrl = "http://localhost:8080/api/auth";
  readonly prefijos = PREFIJOS;

  modo = signal<Modo>("login");
  verContrasena = signal(false);

  //Inicio de sesión
  credenciales ={ email: "", contrasena: "" };
  entrando = signal(false);
  errorLogin = signal<string | null>(null);

  //Registro
  nuevoUsuario: NuevoUsuario = this.formularioVacio();
  guardando = signal(false);
  errorCrear = signal<string | null>(null);

  //Verificación del código enviado por correo
  emailPendiente = signal("");
  codigo = "";
  verificando = signal(false);
  reenviando = signal(false);
  errorVerificar = signal<string | null>(null);
  avisoVerificar = signal<string | null>(null);

  //Desplegable prefijos telefónicos
  prefijoAbierto = signal(false);
  busquedaPrefijo = signal("");
  paisSeleccionado = signal<Pais | null>(this.paisPorDefecto());
  prefijosFiltrados = computed(() =>{
    const q = this.normaliza(this.busquedaPrefijo());
    if (!q){
      return this.prefijos;
    }
    return this.prefijos.filter(
      (p) => this.normaliza(p.name).includes(q) || p.phoneCode.includes(q)
    );
  });

  constructor(private http: HttpClient, private router: Router, private auth: Auth, private el: ElementRef<HTMLElement>, private renderer: Renderer2, @Inject(PLATFORM_ID) private platformId: Object){}

  //Un único manejador registra en TypeScript todos los clics de la plantilla (delegación por data-accion)
  ngAfterViewInit(): void{
    this.renderer.listen(this.el.nativeElement, "click", (evento: Event) => this.onClic(evento));
  }

  private onClic(evento: Event): void{
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-accion]");
    if (!objetivo){
      return;
    }
    switch (objetivo.dataset["accion"]){
      case "ver-contrasena": this.toggleVerContrasena(); break;
      case "ir-registro": this.irARegistro(); break;
      case "ir-login": this.irALogin(); break;
      case "toggle-prefijo": this.togglePrefijo(); break;
      case "cerrar-prefijo": this.cerrarPrefijo(); break;
      case "seleccionar-prefijo":{
        const pais = this.prefijos.find((p) => p.code === objetivo.dataset["codigo"]);
        if (pais){
          this.seleccionarPrefijo(pais);
        }
        break;
      }
      case "sexo-m": this.elegirSexo("M"); break;
      case "sexo-f": this.elegirSexo("F"); break;
      case "reenviar-codigo": this.reenviarCodigo(); break;
    }
  }

  ngOnInit(): void{
    //Si ya hay sesión iniciada no tiene sentido volver a pasar por el login
    if (isPlatformBrowser(this.platformId) && this.auth.estaLogeado()){
      this.router.navigate(["/panel"]);
    }
  }

  //--- Cambios de pantalla ---

  irARegistro(): void{
    this.nuevoUsuario = this.formularioVacio();
    this.paisSeleccionado.set(this.paisPorDefecto());
    this.busquedaPrefijo.set("");
    this.prefijoAbierto.set(false);
    this.verContrasena.set(false);
    this.errorCrear.set(null);
    this.modo.set("registro");
  }

  irALogin(): void{
    this.credenciales ={ email: "", contrasena: "" };
    this.verContrasena.set(false);
    this.errorLogin.set(null);
    this.modo.set("login");
  }

  private irAVerificar(email: string, aviso: string): void{
    this.emailPendiente.set(email);
    this.codigo = "";
    this.errorVerificar.set(null);
    this.avisoVerificar.set(aviso);
    this.modo.set("verificar");
  }

  //--- Inicio de sesión ---

  iniciarSesion(): void{
    const email = this.credenciales.email.trim();
    const contrasena = this.credenciales.contrasena;

    if (!email || !contrasena){
      this.errorLogin.set("Introduce el email y la contraseña.");
      return;
    }

    this.entrando.set(true);
    this.errorLogin.set(null);
    this.http.post<UsuarioSesion>(`${this.apiUrl}/login`,{ email, contrasena }).subscribe({
      next: (usuario) =>{
        this.entrando.set(false);
        this.entrar(usuario);
      },
      error: (err: HttpErrorResponse) =>{
        this.entrando.set(false);
        if (err.status === 403){
          //Cuenta creada pero sin verificar: se pide el código antes de dejar pasar
          this.irAVerificar(email, "Tu cuenta aún no está verificada. Introduce el código que te enviamos por correo o pide uno nuevo.");
        }else if (err.status === 401){
          this.errorLogin.set("Email o contraseña incorrectos.");
        }else{
          console.error("Error al iniciar sesión:", err);
          this.errorLogin.set("Conexión fallida");
        }
      }
    });
  }

  private entrar(usuario: UsuarioSesion): void{
    this.auth.iniciarSesion(usuario);
    this.router.navigate(["/panel"]);
  }

  //--- Registro ---

  crearCuenta(): void{
    const u = this.nuevoUsuario;

    if (!u.email.trim() || !u.contrasena || !u.nombre.trim() || !u.apellido1.trim() || !u.prefijo || !u.telefono1.trim() || !u.dni.trim()){
      this.errorCrear.set("El email, la contraseña, el nombre, el primer apellido, el prefijo, el teléfono 1 y el DNI son obligatorios.");
      return;
    }

    if (u.email.trim().length > 50){
      this.errorCrear.set("El email no puede superar los 50 caracteres.");
      return;
    }

    if (!this.emailValido(u.email.trim())){
      this.errorCrear.set("El email no es válido. Formato: nombre@dominio.ext");
      return;
    }

    if (u.contrasena.length > 20){
      this.errorCrear.set("La contraseña no puede superar los 20 caracteres.");
      return;
    }

    if (!this.dniNieValido(u.dni)){
      this.errorCrear.set("El DNI/NIE no es válido. Formato: 8 cifras + letra (DNI) o X/Y/Z + 7 cifras + letra (NIE).");
      return;
    }

    if (!/^[0-9]{1,9}$/.test(u.telefono1.trim())){
      this.errorCrear.set("El teléfono 1 debe contener solo números.");
      return;
    }

    if (u.telefono2.trim() && !/^[0-9]{1,9}$/.test(u.telefono2.trim())){
      this.errorCrear.set("El teléfono 2 debe contener solo números.");
      return;
    }

    const payload ={
      email: u.email.trim(),
      contrasena: u.contrasena,
      nombre: u.nombre.trim(),
      apellido1: u.apellido1.trim(),
      apellido2: u.apellido2.trim() || null,
      prefijo: u.prefijo,
      telefono1: u.telefono1.trim(),
      telefono2: u.telefono2.trim() || null,
      dni: u.dni.trim().toUpperCase(),
      sexo: u.sexo
    };

    this.guardando.set(true);
    this.errorCrear.set(null);
    this.http.post<UsuarioSesion>(`${this.apiUrl}/registro`, payload).subscribe({
      next: (creado) =>{
        this.guardando.set(false);
        this.irAVerificar(creado.email ?? payload.email, "Te hemos enviado un código de 5 números a tu correo. Introdúcelo para activar la cuenta.");
      },
      error: (err: HttpErrorResponse) =>{
        console.error("Error al crear la cuenta:", err);
        this.guardando.set(false);
        if (err.status === 409){
          this.errorCrear.set("El email ya está registrado. Prueba a iniciar sesión.");
        }else if (err.status === 400){
          this.errorCrear.set("No se pudo crear la cuenta. Revisa los datos (el DNI no puede repetirse).");
        }else{
          this.errorCrear.set("Conexión fallida");
        }
      }
    });
  }

  //--- Verificación ---

  verificarCodigo(): void{
    const codigo = this.codigo.trim();
    if (!/^[0-9]{5}$/.test(codigo)){
      this.errorVerificar.set("El código debe tener 5 números.");
      return;
    }

    this.verificando.set(true);
    this.errorVerificar.set(null);
    this.http.post<UsuarioSesion>(`${this.apiUrl}/verificar`,{ email: this.emailPendiente(), codigo }).subscribe({
      next: (usuario) =>{
        this.verificando.set(false);
        this.entrar(usuario);
      },
      error: (err: HttpErrorResponse) =>{
        this.verificando.set(false);
        if (err.status === 400){
          this.errorVerificar.set("El código no es correcto.");
        }else{
          console.error("Error al verificar el código:", err);
          this.errorVerificar.set("Conexión fallida");
        }
      }
    });
  }

  reenviarCodigo(): void{
    this.reenviando.set(true);
    this.errorVerificar.set(null);
    this.http.post<void>(`${this.apiUrl}/reenviar`,{ email: this.emailPendiente() }).subscribe({
      next: () =>{
        this.reenviando.set(false);
        this.avisoVerificar.set("Te hemos enviado un código nuevo a tu correo.");
      },
      error: (err) =>{
        console.error("Error al reenviar el código:", err);
        this.reenviando.set(false);
        this.errorVerificar.set("No se pudo reenviar el código.");
      }
    });
  }

  //Filtra la escritura del código para que solo admita dígitos
  soloNumerosCodigo(evento: Event): void{
    const input = evento.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, "");
    input.value = limpio;
    this.codigo = limpio;
  }

  //--- Ayudas del formulario (mismas que en el panel de usuarios) ---

  private formularioVacio(): NuevoUsuario{
    return{
      email: "",
      contrasena: "",
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

  private paisPorDefecto(): Pais | null{
    return PREFIJOS.find((p) => p.code === "ES") ?? null;
  }

  private normaliza(texto: string): string{
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  elegirSexo(valor: string): void{
    this.nuevoUsuario.sexo = valor;
  }

  toggleVerContrasena(): void{
    this.verContrasena.update((visible) => !visible);
  }

  //Valida el formato del email
  private emailValido(valor: string): boolean{
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
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
    this.nuevoUsuario.prefijo = pais.phoneCode;
    this.prefijoAbierto.set(false);
  }

  //Filtra la escritura de los teléfonos para que solo admitan dígitos
  soloNumeros(evento: Event, campo: "telefono1" | "telefono2"): void{
    const input = evento.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, "");
    input.value = limpio;
    this.nuevoUsuario[campo] = limpio;
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
