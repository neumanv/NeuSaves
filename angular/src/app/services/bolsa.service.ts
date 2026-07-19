import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { CotizacionBolsa } from "../models";

@Injectable({ providedIn: "root" })
export class BolsaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/bolsa`;

  getCotizaciones(): Observable<CotizacionBolsa[]> {
    return this.http.get<CotizacionBolsa[]>(this.url);
  }
}
