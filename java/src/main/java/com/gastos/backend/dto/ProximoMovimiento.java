package com.gastos.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

//Cobro/ingreso periódico previsto para los próximos días, para la ventana "Próximos movimientos" del panel
public record ProximoMovimiento(
        String descripcion,
        String tipo,
        String gasto,
        BigDecimal cantidad,
        String periodo,
        LocalDate fecha) {
}
