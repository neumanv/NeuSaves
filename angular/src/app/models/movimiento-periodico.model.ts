export interface MovimientoPeriodico{
  idMovimientoUsuario: number;
  descripcion: string;
  tipo: string;
  gasto: string;
  cantidad: number;
  idPeriodo: number;
  periodo: string;
  diaCobro: number | null;
  mesCobro: number | null;
  fechaFinMovimiento: string | null;
}
