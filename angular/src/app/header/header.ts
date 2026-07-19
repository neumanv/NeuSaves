import { AfterViewInit, Component, ElementRef, Renderer2, computed, input, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Auth } from "../auth";
import { Tema } from "../tema";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: "./header.html"
})
export class Header implements AfterViewInit {
  mostrarPerfil = input(false);
  mostrarEditarPerfil = input(true);
  mostrarCambiarPerfil = input(true);
  //Pantallas sin sesión (login, registro...) no admiten modo nocturno: fuerza el logo claro
  forzarClaro = input(false);
  //Solo en la pantalla de acceso: el logo/nombre lleva a la web de presentación
  enlaceInicio = input(false);
  menuAbierto = signal(false);
  confirmarSalir = signal(false);

  //"Descargar cuentas" solo se ofrece al gestionar al usuario principal:
  //en la selección de perfiles (sin usuario activo) o dentro de su propio panel
  mostrarDescargarCuentas = computed(() => {
    const principal = this.auth.usuario();
    if (!principal){
      return false;
    }
    const activo = this.auth.usuarioActivo();
    return activo === null || activo.idUsuario === principal.idUsuario;
  });

  //Ventana de "Descargar cuentas": selección de año y confirmación
  private readonly exportacionesUrl = "http://localhost:8080/api/exportaciones";
  modalDescarga = signal(false);
  pasoConfirmar = signal(false);
  cargandoAnios = signal(false);
  descargando = signal(false);
  errorDescarga = signal<string | null>(null);
  anios = signal<number[]>([]);
  anioSel = new Date().getFullYear();

  constructor(private router: Router, private auth: Auth, public tema: Tema, private http: HttpClient, private el: ElementRef<HTMLElement>, private renderer: Renderer2){}

  ngAfterViewInit(): void{
    this.renderer.listen(this.el.nativeElement, "click", (evento: Event) => this.onClic(evento));
  }

  private onClic(evento: Event): void{
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-accion]");
    if (!objetivo){
      return;
    }
    switch (objetivo.dataset["accion"]){
      case "alternar-tema": this.tema.alternar(); break;
      case "abrir-menu": this.toggleMenu(); break;
      case "cerrar-menu": this.cerrarMenu(); break;
      case "editar-perfil": this.editarPerfil(); break;
      case "cambiar-perfil": this.cambiarPerfil(); break;
      case "abrir-descarga": this.abrirModalDescarga(); break;
      case "cerrar-descarga": this.cerrarModalDescarga(); break;
      case "pedir-descarga": this.pedirConfirmacionDescarga(); break;
      case "volver-descarga": this.volverSeleccionAnio(); break;
      case "confirmar-descarga": this.descargarExcel(); break;
      case "pedir-salir": this.pedirCerrarSesion(); break;
      case "cancelar-salir": this.cancelarCerrarSesion(); break;
      case "confirmar-salir": this.salir(); break;
    }
  }

  toggleMenu(): void{
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void{
    this.menuAbierto.set(false);
  }

  editarPerfil(): void{
    this.menuAbierto.set(false);
    this.router.navigate(["/perfil"]);
  }

  cambiarPerfil(): void{
    this.menuAbierto.set(false);
    this.router.navigate(["/panel"]);
  }

  //Abre la ventana de descarga y carga los años que tienen movimientos (del principal y sus subusuarios)
  abrirModalDescarga(): void{
    const principal = this.auth.usuario();
    if (!principal){
      return;
    }
    this.menuAbierto.set(false);
    this.modalDescarga.set(true);
    this.pasoConfirmar.set(false);
    this.errorDescarga.set(null);
    this.anios.set([]);
    this.cargandoAnios.set(true);
    this.http.get<number[]>(`${this.exportacionesUrl}/anios?principal=${principal.idUsuario}`).subscribe({
      next: (anios) =>{
        const lista = anios ?? [];
        this.anios.set(lista);
        if (lista.length > 0 && !lista.includes(this.anioSel)){
          this.anioSel = lista[0];
        }
        this.cargandoAnios.set(false);
      },
      error: (err) =>{
        console.error("Error al cargar los años con movimientos:", err);
        this.errorDescarga.set("No se pudieron cargar los años disponibles.");
        this.cargandoAnios.set(false);
      }
    });
  }

  cerrarModalDescarga(): void{
    if (this.descargando()){
      return;
    }
    this.modalDescarga.set(false);
  }

  pedirConfirmacionDescarga(): void{
    this.errorDescarga.set(null);
    this.pasoConfirmar.set(true);
  }

  volverSeleccionAnio(): void{
    if (this.descargando()){
      return;
    }
    this.errorDescarga.set(null);
    this.pasoConfirmar.set(false);
  }

  //Descarga el Excel del año elegido y lo guarda como archivo en el navegador
  descargarExcel(): void{
    const principal = this.auth.usuario();
    if (!principal || this.descargando()){
      return;
    }
    this.descargando.set(true);
    this.errorDescarga.set(null);
    this.http.get(`${this.exportacionesUrl}/excel?principal=${principal.idUsuario}&anio=${this.anioSel}`, { responseType: "blob" }).subscribe({
      next: (archivo) =>{
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `NeuSaves_cuentas_${this.anioSel}.xlsx`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
        this.modalDescarga.set(false);
      },
      error: (err) =>{
        console.error("Error al descargar las cuentas:", err);
        this.descargando.set(false);
        this.errorDescarga.set("No se pudo descargar el archivo. Inténtalo de nuevo.");
      }
    });
  }

  pedirCerrarSesion(): void{
    this.menuAbierto.set(false);
    this.confirmarSalir.set(true);
  }

  cancelarCerrarSesion(): void{
    this.confirmarSalir.set(false);
  }

  salir(): void{
    this.confirmarSalir.set(false);
    this.menuAbierto.set(false);
    this.auth.cerrarSesion();
    this.router.navigate(["/"]);
  }
}
