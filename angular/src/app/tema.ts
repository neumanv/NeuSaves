import{ Injectable, PLATFORM_ID, inject, signal, effect } from "@angular/core";
import{ isPlatformBrowser } from "@angular/common";
import{ Auth } from "./auth";

const CLAVE_TEMA = "neusaves_tema";

//Modo diurno/nocturno de toda la app: aplica un atributo en <html> que styles.css usa
//para sobreescribir la paleta de colores (--color-*). La preferencia se guarda por cuenta
//principal, de modo que el principal y todos sus subusuarios comparten el mismo modo;
//sin sesión iniciada se usa una preferencia general (modo invitado)
@Injectable({ providedIn: "root" })
export class Tema{
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(Auth);
  oscuro = signal(this.leerPreferencia(this.claveActual()));

  constructor(){
    this.aplicar(this.oscuro(), this.claveActual());

    //Al iniciar sesión o cambiar de perfil activo, se aplica el modo que ese usuario tuviera guardado
    effect(() =>{
      const clave = this.claveActual();
      const preferido = this.leerPreferencia(clave);
      this.oscuro.set(preferido);
      this.aplicar(preferido, clave);
    });
  }

  //Clave de almacenamiento anclada a la cuenta principal: el login siempre lo hace el principal,
  //así que sus subusuarios comparten la misma preferencia de tema. Sin sesión se usa la clave general.
  private claveActual(): string{
    const principal = this.auth.usuario();
    return principal ? `${CLAVE_TEMA}_${principal.idUsuario}` : CLAVE_TEMA;
  }

  private leerPreferencia(clave: string): boolean{
    if (!isPlatformBrowser(this.platformId)){
      return false;
    }
    const guardado = localStorage.getItem(clave);
    if (guardado){
      return guardado === "oscuro";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  private aplicar(oscuro: boolean, clave: string): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    document.documentElement.setAttribute("data-tema", oscuro ? "oscuro" : "claro");
    localStorage.setItem(clave, oscuro ? "oscuro" : "claro");
  }

  alternar(): void{
    const nuevo = !this.oscuro();
    this.oscuro.set(nuevo);
    this.aplicar(nuevo, this.claveActual());
  }
}
