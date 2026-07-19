export interface UltimoMovimiento{
  descripcion: string;
  tipo: string;
  gasto: string;
  fechaMovimiento: string;
  cantidad: number;
}

export interface MovimientoLista{
  descripcion: string;
  tipo: string;
  gasto: string;
  fechaMovimiento: string;
  cantidad: number;
}

export interface PaginaMovimientos{
  contenido: MovimientoLista[];
  totalPaginas: number;
  totalElementos: number;
  pagina: number;
}

export interface MovimientoPayload{
  idUsuario: number;
  idMovimiento: number;
  descripcion: string;
  cantidad: number;
  fechaMovimiento: string;
  idPeriodo?: number | null;
  fechaFinMovimiento?: string | null;
  diaCobro?: number | null;
  mesCobro?: number | null;
}
