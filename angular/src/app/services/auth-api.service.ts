import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { UsuarioSesion } from "../auth";

@Injectable({ providedIn: "root" })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  login(email: string, contrasena: string): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.url}/login`, { email, contrasena });
  }

  registro(payload: any): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.url}/registro`, payload);
  }

  verificar(email: string, codigo: string): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.url}/verificar`, { email, codigo });
  }

  reenviar(email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/reenviar`, { email });
  }

  recuperar(email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/recuperar`, { email });
  }

  cambiarContrasena(idUsuario: number, contrasenaActual: string, contrasenaNueva: string): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-contrasena`, { idUsuario, contrasenaActual, contrasenaNueva });
  }

  solicitarCambioEmail(idUsuario: number, email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-email/solicitar`, { idUsuario, email });
  }

  confirmarCambioEmail(idUsuario: number, codigo: string): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.url}/cambiar-email/confirmar`, { idUsuario, codigo });
  }

  cancelarCambioEmail(idUsuario: number): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-email/cancelar`, { idUsuario, codigo: "" });
  }
}
