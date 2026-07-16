import{ Injectable, PLATFORM_ID, inject, signal } from "@angular/core";
import{ isPlatformBrowser } from "@angular/common";

const CLAVE_TEMA = "neusaves_tema";

//Modo diurno/nocturno de toda la app: aplica un atributo en <html> que styles.css usa
//para sobreescribir la paleta de colores (--color-*), y recuerda la preferencia entre sesiones
@Injectable({ providedIn: "root" })
export class Tema{
  private readonly platformId = inject(PLATFORM_ID);
  oscuro = signal(this.leerPreferencia());

  constructor(){
    this.aplicar(this.oscuro());
  }

  private leerPreferencia(): boolean{
    if (!isPlatformBrowser(this.platformId)){
      return false;
    }
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado){
      return guardado === "oscuro";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  private aplicar(oscuro: boolean): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    document.documentElement.setAttribute("data-tema", oscuro ? "oscuro" : "claro");
    localStorage.setItem(CLAVE_TEMA, oscuro ? "oscuro" : "claro");
  }

  alternar(): void{
    const nuevo = !this.oscuro();
    this.oscuro.set(nuevo);
    this.aplicar(nuevo);
  }
}
