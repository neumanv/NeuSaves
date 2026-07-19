import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { Periodo } from "../models";

@Injectable({ providedIn: "root" })
export class PeriodosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/periodos`;

  findAll(): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(this.url);
  }
}
