import { AfterViewInit, Component, ElementRef, Renderer2, input, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Auth } from "../auth";

@Component({
  selector: "app-header",
  standalone: true,
  templateUrl: "./header.html"
})
export class Header implements AfterViewInit {
  mostrarPerfil = input(false);
  mostrarCambiarPerfil = input(true);
  menuAbierto = signal(false);
  confirmarSalir = signal(false);

  constructor(private router: Router, private auth: Auth, private el: ElementRef<HTMLElement>, private renderer: Renderer2){}

  ngAfterViewInit(): void{
    this.renderer.listen(this.el.nativeElement, "click", (evento: Event) => this.onClic(evento));
  }

  private onClic(evento: Event): void{
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-accion]");
    if (!objetivo){
      return;
    }
    switch (objetivo.dataset["accion"]){
      case "abrir-menu": this.toggleMenu(); break;
      case "cerrar-menu": this.cerrarMenu(); break;
      case "cambiar-perfil": this.cambiarPerfil(); break;
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

  cambiarPerfil(): void{
    this.menuAbierto.set(false);
    this.router.navigate(["/panel"]);
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