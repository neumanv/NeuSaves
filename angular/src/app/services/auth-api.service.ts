import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { UsuarioSesion, LoginResponse } from "../auth";

@Injectable({ providedIn: "root" })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  login(email: string, contrasena: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/login`, { email, contrasena });
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

  cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-contrasena`, { contrasenaActual, contrasenaNueva });
  }

  solicitarCambioEmail(email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-email/solicitar`, { email });
  }

  confirmarCambioEmail(codigo: string): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.url}/cambiar-email/confirmar`, { codigo });
  }

  cancelarCambioEmail(): Observable<void> {
    return this.http.post<void>(`${this.url}/cambiar-email/cancelar`, {});
  }
}
