import { Component, input, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Auth } from "../auth";

@Component({
  selector: "app-header",
  standalone: true,
  templateUrl: "./header.html"
})
export class Header {
  //Muestra el icono de perfil en todas las pantallas menos en la principal
  mostrarPerfil = input(false);
  menuAbierto = signal(false);

  constructor(private router: Router, private auth: Auth){}

  toggleMenu(): void{
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void{
    this.menuAbierto.set(false);
  }

  //Cierra la sesión y vuelve a la pantalla de inicio de sesión
  salir(): void{
    this.menuAbierto.set(false);
    this.auth.cerrarSesion();
    this.router.navigate(["/"]);
  }
}
