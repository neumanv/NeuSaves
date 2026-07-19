import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environment";
import { UltimoMovimiento, PaginaMovimientos, MovimientoPeriodico } from "../models";
import { EstadisticasDatos } from "../models";

interface ResumenMes {
  ingresos: number;
  gastos: number;
}

@Injectable({ providedIn: "root" })
export class MovimientosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/movimientos-usuarios`;

  contarDelMes(usuario: number): Observable<number> {
    return this.http.get<number>(`${this.url}/count?usuario=${usuario}`);
  }

  saldoActual(usuario: number): Observable<number> {
    return this.http.get<number>(`${this.url}/saldo?usuario=${usuario}`);
  }

  resumenMes(usuario: number): Observable<ResumenMes> {
    return this.http.get<ResumenMes>(`${this.url}/resumen-mes?usuario=${usuario}`);
  }

  ultimos(usuario: number, limite: number): Observable<UltimoMovimiento[]> {
    return this.http.get<UltimoMovimiento[]>(`${this.url}/ultimos?usuario=${usuario}&limite=${limite}`);
  }

  pagina(queryString: string): Observable<PaginaMovimientos> {
    return this.http.get<PaginaMovimientos>(`${this.url}/pagina?${queryString}`);
  }

  crear(payload: any): Observable<any> {
    return this.http.post(this.url, payload);
  }

  periodicos(usuario: number): Observable<MovimientoPeriodico[]> {
    return this.http.get<MovimientoPeriodico[]>(`${this.url}/periodicos?usuario=${usuario}`);
  }

  cambiarPeriodico(idMovimientoUsuario: number, payload: any): Observable<any> {
    return this.http.put(`${this.url}/periodicos/${idMovimientoUsuario}`, payload);
  }

  eliminarPeriodico(idMovimientoUsuario: number, usuario: number): Observable<any> {
    return this.http.delete(`${this.url}/periodicos/${idMovimientoUsuario}?usuario=${usuario}`);
  }

  estadisticas(usuario: number, desde: string, hasta: string): Observable<EstadisticasDatos> {
    return this.http.get<EstadisticasDatos>(`${this.url}/estadisticas?usuario=${usuario}&desde=${desde}&hasta=${hasta}`);
  }

  aniosConDatos(usuario: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}/estadisticas/anios?usuario=${usuario}`);
  }
}
