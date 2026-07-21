import{ Injectable, PLATFORM_ID, inject, signal } from "@angular/core";
import{ isPlatformBrowser } from "@angular/common";
import{ CanActivateFn, Router } from "@angular/router";

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
}

export interface LoginResponse{
  token: string;
  usuario: UsuarioSesion;
}

const CLAVE_SESION = "neusaves_usuario";
const CLAVE_ACTIVO = "neusaves_usuario_activo";
const CLAVE_TOKEN = "neusaves_token";

@Injectable({ providedIn: "root" })
export class Auth{
  usuario = signal<UsuarioSesion | null>(this.recuperar());
  token = signal<string | null>(this.recuperarTexto(CLAVE_TOKEN));

  usuarioActivo = signal<UsuarioSesion | null>(this.recuperar(CLAVE_ACTIVO));

  private recuperar(clave: string = CLAVE_SESION): UsuarioSesion | null{
    if (typeof sessionStorage === "undefined"){
      return null;
    }
    try{
      const crudo = sessionStorage.getItem(clave);
      return crudo ? (JSON.parse(crudo) as UsuarioSesion) : null;
    }catch{
      return null;
    }
  }

  private recuperarTexto(clave: string): string | null{
    if (typeof sessionStorage === "undefined"){
      return null;
    }
    return sessionStorage.getItem(clave);
  }

  iniciarSesion(response: LoginResponse): void{
    this.usuario.set(response.usuario);
    this.token.set(response.token);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(response.usuario));
    sessionStorage.setItem(CLAVE_TOKEN, response.token);
  }

  actualizarUsuario(usuario: UsuarioSesion): void{
    this.usuario.set(usuario);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
  }

  activarUsuario(usuario: UsuarioSesion): void{
    this.usuarioActivo.set(usuario);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.setItem(CLAVE_ACTIVO, JSON.stringify(usuario));
    }
  }

  limpiarUsuarioActivo(): void{
    this.usuarioActivo.set(null);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.removeItem(CLAVE_ACTIVO);
    }
  }

  usuarioEnGestion(): UsuarioSesion | null{
    return this.usuarioActivo() ?? this.usuario();
  }

  cerrarSesion(): void{
    this.usuario.set(null);
    this.usuarioActivo.set(null);
    this.token.set(null);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.removeItem(CLAVE_SESION);
      sessionStorage.removeItem(CLAVE_ACTIVO);
      sessionStorage.removeItem(CLAVE_TOKEN);
    }
  }

  estaLogeado(): boolean{
    return this.usuario() !== null && this.token() !== null;
  }
}

export const authGuard: CanActivateFn = () =>{
  const platformId = inject(PLATFORM_ID);
  const auth = inject(Auth);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)){
    return false;
  }
  return auth.estaLogeado() ? true : router.createUrlTree(["/acceso"]);
};
