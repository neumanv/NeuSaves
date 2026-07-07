import{ Injectable, PLATFORM_ID, inject, signal } from "@angular/core";
import{ isPlatformBrowser } from "@angular/common";
import{ CanActivateFn, Router } from "@angular/router";

//Datos del usuario principal que ha iniciado sesión
export interface UsuarioSesion{
  idUsuario: number;
  email?: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  prefijo?: string;
  telefono1?: string;
  telefono2?: string;
  dni?: string;
  sexo?: string;
  verificado?: boolean;
  idUsuarioPrincipal?: number | null;
  saldo?: number;
}

const CLAVE_SESION = "neusaves_usuario";

//Guarda la sesión en memoria y en sessionStorage para sobrevivir a los refrescos
@Injectable({ providedIn: "root" })
export class Auth{
  usuario = signal<UsuarioSesion | null>(this.recuperar());

  //sessionStorage no existe cuando Angular renderiza en el servidor
  private recuperar(): UsuarioSesion | null{
    if (typeof sessionStorage === "undefined"){
      return null;
    }
    try{
      const crudo = sessionStorage.getItem(CLAVE_SESION);
      return crudo ? (JSON.parse(crudo) as UsuarioSesion) : null;
    }catch{
      return null;
    }
  }

  iniciarSesion(usuario: UsuarioSesion): void{
    this.usuario.set(usuario);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
  }

  cerrarSesion(): void{
    this.usuario.set(null);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.removeItem(CLAVE_SESION);
    }
  }

  estaLogeado(): boolean{
    return this.usuario() !== null;
  }
}

//Protege las rutas que necesitan sesión iniciada: si no la hay, vuelve al login
export const authGuard: CanActivateFn = () =>{
  const platformId = inject(PLATFORM_ID);
  const auth = inject(Auth);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)){
    return false;
  }
  return auth.estaLogeado() ? true : router.createUrlTree(["/"]);
};
