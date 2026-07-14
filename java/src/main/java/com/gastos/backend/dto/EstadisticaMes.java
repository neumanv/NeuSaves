package com.gastos.backend.dto;

import java.math.BigDecimal;

//Agregado por mes (ingresos y gastos) para la gráfica de evolución mensual de la pantalla de estadísticas
public interface EstadisticaMes{
    String getMes();       //Formato 'YYYY-MM'
    BigDecimal getIngresos();
    BigDecimal getGastos();
}
