export interface EstadisticaTipo{
  tipo: string;
  gasto: string;
  total: number;
  cantidad: number;
}

export interface EstadisticaMes{
  mes: string;       //'YYYY-MM'
  ingresos: number;
  gastos: number;
}

export interface EstadisticasDatos{
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  numeroMovimientos: number;
  porTipo: EstadisticaTipo[];
  porMes: EstadisticaMes[];
}
