import{ Component, OnInit, AfterViewInit, ElementRef, Renderer2, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient, HttpErrorResponse } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ Router } from "@angular/router";
import{ Header } from "../header/header";
import{ Footer } from "../footer/footer";
import{ cifrarId } from "../cifrado";
import{ Auth } from "../auth";
import{ environment } from "../environment";
import{ Usuario } from "../models";

//Subusuarios
interface NuevoUsuario{
  nombre: string;
  apellido1: string;
  apellido2: string;
  sexo: string;
}

@Component({
  selector: "app-usuarios",
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: "./usuarios.html",
  styleUrl: "./usuarios.scss"
})
export class Usuarios implements OnInit, AfterViewInit{
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;
  readonly maxUsuarios = 4;

  //Usuario principal
  usuarioLogeado = computed(() => this.auth.usuario());

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  puedeCrear = computed(() => this.usuarios().length < this.maxUsuarios);

  usuarioABorrar = signal<Usuario | null>(null);
  borrando = signal(false);

  mostrarCrear = signal(false);
  guardando = signal(false);
  errorCrear = signal<string | null>(null);
  nuevoUsuario: NuevoUsuario = this.formularioVacio();
  //Sexo elegido como signal: sin él (app zoneless) la vista no se re-renderiza al pulsar
  sexoElegido = signal("M");

  constructor(private http: HttpClient, private router: Router, private auth: Auth, private el: ElementRef<HTMLElement>, private renderer: Renderer2, @Inject(PLATFORM_ID) private platformId: Object){}

  ngAfterViewInit(): void{
    this.renderer.listen(this.el.nativeElement, "click", (evento: Event) => this.onClic(evento));
  }

  private onClic(evento: Event): void{
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-accion]");
    if (!objetivo){
      return;
    }
    switch (objetivo.dataset["accion"]){
      case "ver-principal":{
        const yo = this.usuarioLogeado();
        if (yo){
          this.verUsuario(yo);
        }
        break;
      }
      case "ver-usuario":{
        const usuario = this.buscarUsuario(objetivo.dataset["id"]);
        if (usuario){
          this.verUsuario(usuario);
        }
        break;
      }
      case "borrar-usuario":{
        const usuario = this.buscarUsuario(objetivo.dataset["id"]);
        if (usuario){
          this.pedirConfirmacion(usuario);
        }
        break;
      }
      case "abrir-crear": this.abrirCrear(); break;
      case "cancelar-borrado": this.cancelarBorrado(); break;
      case "confirmar-borrado": this.confirmarBorrado(); break;
      case "cancelar-crear": this.cancelarCrear(); break;
      case "sexo-m": this.elegirSexo("M"); break;
      case "sexo-f": this.elegirSexo("F"); break;
    }
  }

  private buscarUsuario(id: string | undefined): Usuario | undefined{
    const idNum = Number(id);
    return this.usuarios().find((u) => u.idUsuario === idNum);
  }

  //Navega al panel del usuario pulsado (id cifrado en la URL)
  verUsuario(usuario: Usuario): void{
    this.router.navigate(["/panel-usuario", cifrarId(usuario.idUsuario)], { state:{ usuario } });
  }

  ngOnInit(): void{
    if(isPlatformBrowser(this.platformId)){
      //En la selección de perfiles se gestiona al usuario principal
      this.auth.limpiarUsuarioActivo();
      this.cargarUsuarios();
    }
  }

  private cargarUsuarios(): void{
    const logeado = this.usuarioLogeado();
    if (!logeado){
      return;
    }

    this.cargando.set(true);
    this.http.get<Usuario[]>(this.apiUrl).subscribe({
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

  elegirSexo(valor: string): void{
    this.nuevoUsuario.sexo = valor;
    this.sexoElegido.set(valor);
  }

  abrirCrear(): void{
    if (!this.puedeCrear()){
      return;
    }
    this.nuevoUsuario = this.formularioVacio();
    this.sexoElegido.set(this.nuevoUsuario.sexo);
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

    if (!this.puedeCrear()){
      this.errorCrear.set(`Solo puedes tener ${this.maxUsuarios} usuarios como máximo.`);
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
      idUsuarioPrincipal: logeado.idUsuario
    };

    this.guardando.set(true);
    this.errorCrear.set(null);
    this.http.post<Usuario>(this.apiUrl, payload).subscribe({
      next: (creado) =>{
        this.usuarios.update((lista) => [...lista, creado]);
        this.guardando.set(false);
        this.mostrarCrear.set(false);
      },
      error: (err: HttpErrorResponse) =>{
        console.error("Error al crear el usuario:", err);
        this.guardando.set(false);
        if (err.status === 409){
          //El backend rechaza pasar del máximo de sub-usuarios
          this.errorCrear.set(`Solo puedes tener ${this.maxUsuarios} usuarios como máximo.`);
        }else{
          this.errorCrear.set("No se pudo crear el usuario. Revisa los datos e inténtalo de nuevo.");
        }
      }
    });
  }
}
