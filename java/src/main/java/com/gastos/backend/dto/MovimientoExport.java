package com.gastos.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

//Fila de movimiento para la exportación a Excel: igual que UltimoMovimiento pero con el saldo
public interface MovimientoExport{
    String getDescripcion();
    String getTipo();
    String getGasto();
    LocalDate getFechaMovimiento();
    BigDecimal getCantidad();
    BigDecimal getSaldo();
}
