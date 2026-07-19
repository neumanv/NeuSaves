import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { ChatResponse } from "../models";

@Injectable({ providedIn: "root" })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/chat`;

  enviar(mensaje: string, historial: any[], contexto: any): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.url, { mensaje, historial, contexto });
  }
}
