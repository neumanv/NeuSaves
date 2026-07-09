import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient, HttpErrorResponse } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
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

type Pestana = "datos" | "contrasena";

@Component({
  selector: "app-perfil",
  standalone: true,
  imports: [CommonModule, FormsModule, Header, FooterComponent],
  templateUrl: "./perfil.html"
})
export class Perfil implements OnInit{
  private readonly usuariosUrl = "http://localhost:8080/api/usuarios";
  private readonly authUrl = "http://localhost:8080/api/auth";
  readonly prefijos = PREFIJOS;

  pestana = signal<Pestana>("datos");

  //--- Pestaña de datos ---
  datos: DatosPerfil = this.datosVacios();
  sexoElegido = signal("M");
  guardando = signal(false);
  errorDatos = signal<string | null>(null);
  avisoDatos = signal<string | null>(null);

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

  //--- Pestaña de contraseña ---
  contrasenas ={ actual: "", nueva: "", repetir: "" };
  verContrasena = signal(false);
  cambiando = signal(false);
  errorContrasena = signal<string | null>(null);
  avisoContrasena = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router, private auth: Auth, @Inject(PLATFORM_ID) private platformId: Object){}

  ngOnInit(): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    const usuario = this.auth.usuario();
    if (!usuario){
      this.router.navigate(["/"]);
      return;
    }
    //Rellena el formulario con los datos de la sesión
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

  cambiarPestana(pestana: Pestana): void{
    this.pestana.set(pestana);
  }

  volver(): void{
    this.router.navigate(["/panel"]);
  }

  //--- Guardar datos (mismas validaciones que la creación de usuario) ---
  guardarDatos(): void{
    const d = this.datos;
    this.avisoDatos.set(null);

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

    const payload ={
      email: d.email.trim(),
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
        //Actualiza la sesión para que el resto de la app vea los datos nuevos
        this.auth.iniciarSesion({ ...usuario, ...actualizado });
        this.avisoDatos.set("Datos guardados correctamente.");
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

  //--- Ayudas (mismas que en el registro) ---
  elegirSexo(valor: string): void{
    this.datos.sexo = valor;
    this.sexoElegido.set(valor);
  }

  toggleVerContrasena(): void{
    this.verContrasena.update((visible) => !visible);
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
