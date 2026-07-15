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
}

const CLAVE_SESION = "neusaves_usuario";
const CLAVE_ACTIVO = "neusaves_usuario_activo";

//Guarda la sesión en memoria y en sessionStorage para sobrevivir a los refrescos
@Injectable({ providedIn: "root" })
export class Auth{
  usuario = signal<UsuarioSesion | null>(this.recuperar());

  //Usuario cuyo perfil se está gestionando (principal o subusuario). El login siempre lo hace
  //el principal, pero al entrar en el panel de un subusuario pasa a ser el "usuario activo".
  usuarioActivo = signal<UsuarioSesion | null>(this.recuperar(CLAVE_ACTIVO));

  //sessionStorage no existe cuando Angular renderiza en el servidor
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

  iniciarSesion(usuario: UsuarioSesion): void{
    this.usuario.set(usuario);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
  }

  //Marca qué usuario (principal o subusuario) se está gestionando
  activarUsuario(usuario: UsuarioSesion): void{
    this.usuarioActivo.set(usuario);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.setItem(CLAVE_ACTIVO, JSON.stringify(usuario));
    }
  }

  //Vuelve a gestionar al usuario principal (al salir a la selección de perfiles)
  limpiarUsuarioActivo(): void{
    this.usuarioActivo.set(null);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.removeItem(CLAVE_ACTIVO);
    }
  }

  //Devuelve el usuario que se está gestionando: el subusuario activo o, si no hay, el principal
  usuarioEnGestion(): UsuarioSesion | null{
    return this.usuarioActivo() ?? this.usuario();
  }

  cerrarSesion(): void{
    this.usuario.set(null);
    this.usuarioActivo.set(null);
    if (typeof sessionStorage !== "undefined"){
      sessionStorage.removeItem(CLAVE_SESION);
      sessionStorage.removeItem(CLAVE_ACTIVO);
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
