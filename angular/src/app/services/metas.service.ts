import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { Meta } from "../models";

@Injectable({ providedIn: "root" })
export class MetasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/metas-usuario`;

  findByUsuario(usuario?: number): Observable<Meta[]> {
    return this.http.get<Meta[]>(`${this.url}${usuario != null ? `?usuario=${usuario}` : ""}`);
  }

  crear(payload: { idUsuario?: number; titulo: string; descripcion: string }): Observable<Meta> {
    return this.http.post<Meta>(this.url, payload);
  }

  alternarCompletado(idMetaUsuario: number, valor: string): Observable<Meta> {
    return this.http.patch<Meta>(`${this.url}/${idMetaUsuario}/completado?valor=${valor}`, {});
  }

  guardarOrden(ids: number[], usuario?: number): Observable<any> {
    return this.http.put(`${this.url}/orden${usuario != null ? `?usuario=${usuario}` : ""}`, ids);
  }

  eliminar(idMetaUsuario: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${idMetaUsuario}`);
  }
}
