package com.gastos.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface UltimoMovimiento{
    String getDescripcion();
    String getTipo();
    String getGasto();
    LocalDate getFechaMovimiento();
    BigDecimal getCantidad();
}