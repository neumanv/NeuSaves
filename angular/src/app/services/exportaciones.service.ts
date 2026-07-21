import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";

@Injectable({ providedIn: "root" })
export class ExportacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/exportaciones`;

  aniosConMovimientos(): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}/anios`);
  }

  descargarExcel(anio: number): Observable<Blob> {
    return this.http.get(`${this.url}/excel?anio=${anio}`, { responseType: "blob" });
  }
}
