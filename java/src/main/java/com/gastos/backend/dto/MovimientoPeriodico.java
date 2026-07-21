package com.gastos.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

//Movimiento periódico del usuario (plantilla) para la pestaña "Mov. periódicos" del perfil
public interface MovimientoPeriodico{
    Long getIdMovimientoUsuario();
    String getDescripcion();
    String getTipo();
    String getGasto();
    BigDecimal getCantidad();
    Long getIdPeriodo();
    String getPeriodo();
    Integer getDiaCobro();
    Integer getMesCobro();
    LocalDate getFechaFinMovimiento();
    LocalDate getUltimoCobro();
    LocalDate getFechaMovimiento();
}
