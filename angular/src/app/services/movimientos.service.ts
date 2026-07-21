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

  contarDelMes(usuario?: number): Observable<number> {
    return this.http.get<number>(`${this.url}/count${this.q(usuario)}`);
  }

  saldoActual(usuario?: number): Observable<number> {
    return this.http.get<number>(`${this.url}/saldo${this.q(usuario)}`);
  }

  resumenMes(usuario?: number): Observable<ResumenMes> {
    return this.http.get<ResumenMes>(`${this.url}/resumen-mes${this.q(usuario)}`);
  }

  ultimos(limite: number, usuario?: number): Observable<UltimoMovimiento[]> {
    const params = usuario != null ? `usuario=${usuario}&limite=${limite}` : `limite=${limite}`;
    return this.http.get<UltimoMovimiento[]>(`${this.url}/ultimos?${params}`);
  }

  pagina(queryString: string): Observable<PaginaMovimientos> {
    return this.http.get<PaginaMovimientos>(`${this.url}/pagina?${queryString}`);
  }

  crear(payload: any): Observable<any> {
    return this.http.post(this.url, payload);
  }

  periodicos(usuario?: number): Observable<MovimientoPeriodico[]> {
    return this.http.get<MovimientoPeriodico[]>(`${this.url}/periodicos${this.q(usuario)}`);
  }

  cambiarPeriodico(idMovimientoUsuario: number, payload: any): Observable<any> {
    return this.http.put(`${this.url}/periodicos/${idMovimientoUsuario}`, payload);
  }

  eliminarPeriodico(idMovimientoUsuario: number): Observable<any> {
    return this.http.delete(`${this.url}/periodicos/${idMovimientoUsuario}`);
  }

  estadisticas(desde: string, hasta: string, usuario?: number): Observable<EstadisticasDatos> {
    const params = usuario != null ? `usuario=${usuario}&desde=${desde}&hasta=${hasta}` : `desde=${desde}&hasta=${hasta}`;
    return this.http.get<EstadisticasDatos>(`${this.url}/estadisticas?${params}`);
  }

  aniosConDatos(usuario?: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}/estadisticas/anios${this.q(usuario)}`);
  }

  private q(usuario?: number): string {
    return usuario != null ? `?usuario=${usuario}` : "";
  }
}
