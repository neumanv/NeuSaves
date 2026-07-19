import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { TipoMovimiento } from "../models";

@Injectable({ providedIn: "root" })
export class TiposService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/movimientos`;

  findByGasto(gasto: "N" | "S"): Observable<TipoMovimiento[]> {
    return this.http.get<TipoMovimiento[]>(`${this.url}?gasto=${gasto}`);
  }
}
