import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ Router } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ PREFIJOS, Pais } from "../prefijos";
import{ cifrarId } from "../cifrado";
import{ Auth } from "../auth";

interface Usuario{
  idUsuario: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  prefijo?: string;
  telefono1?: string;
  telefono2?: string;
  dni?: string;
  sexo?: string;
}

//Sub-usuarios del panel: solo datos básicos (sin email, contraseña, DNI ni teléfono)
interface NuevoUsuario{
  nombre: string;
  apellido1: string;
  apellido2: string;
  sexo: string;
}

@Component({
  selector: "app-usuarios",
  standalone: true,
  imports: [CommonModule, FormsModule, Header, FooterComponent],
  templateUrl: "./usuarios.html",
  styleUrl: "./usuarios.scss"
})
export class Usuarios implements OnInit{
  private readonly apiUrl = "http://localhost:8080/api/usuarios";
  readonly prefijos = PREFIJOS;

  //Usuario principal con la sesión iniciada: su tarjeta es la principal del panel
  usuarioLogeado = computed(() => this.auth.usuario());

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  usuarioABorrar = signal<Usuario | null>(null);
  borrando = signal(false);

  mostrarCrear = signal(false);
  guardando = signal(false);
  errorCrear = signal<string | null>(null);
  nuevoUsuario: NuevoUsuario = this.formularioVacio();

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

  constructor(private http: HttpClient, private router: Router, private auth: Auth, @Inject(PLATFORM_ID) private platformId: Object){}

  //Navega al panel del usuario pulsado (id cifrado en la URL)
  verUsuario(usuario: Usuario): void{
    this.router.navigate(["/panel-usuario", cifrarId(usuario.idUsuario)], { state:{ usuario } });
  }

  ngOnInit(): void{
    if(isPlatformBrowser(this.platformId)){
      this.cargarUsuarios();
    }
  }

  private cargarUsuarios(): void{
    const logeado = this.usuarioLogeado();
    if (!logeado){
      return;
    }

    this.cargando.set(true);
    this.http.get<Usuario[]>(`${this.apiUrl}?principal=${logeado.idUsuario}`).subscribe({
      next: (usuarios) =>{
        this.usuarios.set(usuarios);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (err) =>{
        console.error("Error al conectar:", err);
        this.error.set("Conexión fallida");
        this.cargando.set(false);
      }
    });
  }

  pedirConfirmacion(usuario: Usuario): void{
    this.usuarioABorrar.set(usuario);
  }

  cancelarBorrado(): void{
    if (this.borrando()){
      return;
    }
    this.usuarioABorrar.set(null);
  }

  confirmarBorrado(): void{
    const usuario = this.usuarioABorrar();
    if (!usuario){
      return;
    }

    this.borrando.set(true);
    this.http.delete(`${this.apiUrl}/${usuario.idUsuario}`).subscribe({
      next: () =>{
        //Elimina el usuario sin necesidad de recargar la pantalla
        this.usuarios.update((lista) =>
          lista.filter((u) => u.idUsuario !== usuario.idUsuario)
        );
        this.borrando.set(false);
        this.usuarioABorrar.set(null);
      },
      error: (err) =>{
        console.error("Error al borrar el usuario:", err);
        this.borrando.set(false);
        this.usuarioABorrar.set(null);
        this.error.set(`No se pudo borrar a ${usuario.nombre} ${usuario.apellido1}.`);
      }
    });
  }

  private formularioVacio(): NuevoUsuario{
    return{
      nombre: "",
      apellido1: "",
      apellido2: "",
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

  //Abre el modal de creación con el formulario en blanco
  abrirCrear(): void{
    this.nuevoUsuario = this.formularioVacio();
    this.paisSeleccionado.set(this.paisPorDefecto());
    this.busquedaPrefijo.set("");
    this.prefijoAbierto.set(false);
    this.errorCrear.set(null);
    this.mostrarCrear.set(true);
  }

  cancelarCrear(): void{
    if (this.guardando()){
      return;
    }
    this.mostrarCrear.set(false);
  }

  crearUsuario(): void{
    const u = this.nuevoUsuario;
    const logeado = this.usuarioLogeado();
    if (!logeado){
      return;
    }

    if (!u.nombre.trim() || !u.apellido1.trim()){
      this.errorCrear.set("El nombre y el primer apellido son obligatorios.");
      return;
    }

    const payload ={
      nombre: u.nombre.trim(),
      apellido1: u.apellido1.trim(),
      apellido2: u.apellido2.trim() || null,
      sexo: u.sexo,
      //Relaciona el sub-usuario nuevo con el usuario principal logeado
      idUsuarioPrincipal: logeado.idUsuario,
      //Los sub-usuarios del panel no llevan prefijo, teléfono ni DNI
      prefijo: "+34",
      telefono1: "0",
      dni: "00000000X"
    };

    this.guardando.set(true);
    this.errorCrear.set(null);
    this.http.post<Usuario>(this.apiUrl, payload).subscribe({
      next: (creado) =>{
        this.usuarios.update((lista) => [...lista, creado]);
        this.guardando.set(false);
        this.mostrarCrear.set(false);
      },
      error: (err) =>{
        console.error("Error al crear el usuario:", err);
        this.guardando.set(false);
        this.errorCrear.set("No se pudo crear el usuario. Revisa los datos (el DNI no puede repetirse).");
      }
    });
  }
}
