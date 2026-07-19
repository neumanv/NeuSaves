import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { Usuario } from "../models";
import { UsuarioSesion } from "../auth";

@Injectable({ providedIn: "root" })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  findAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  findByPrincipal(principal: number): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.url}?principal=${principal}`);
  }

  findById(id: number): Observable<UsuarioSesion> {
    return this.http.get<UsuarioSesion>(`${this.url}/${id}`);
  }

  create(payload: any): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, payload);
  }

  update(id: number, payload: any): Observable<UsuarioSesion> {
    return this.http.put<UsuarioSesion>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
