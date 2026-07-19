package com.gastos.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record EstadisticasResponse(
    BigDecimal totalIngresos,
    BigDecimal totalGastos,
    BigDecimal balance,
    long numeroMovimientos,
    List<EstadisticaTipo> porTipo,
    List<EstadisticaMes> porMes
) {}
