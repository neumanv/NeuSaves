package com.gastos.backend.dto;

import java.math.BigDecimal;

//Agregado por tipo de movimiento (total de dinero y número de movimientos) para la pantalla de estadísticas
public interface EstadisticaTipo{
    String getTipo();
    String getGasto();
    BigDecimal getTotal();
    Long getCantidad();
}
