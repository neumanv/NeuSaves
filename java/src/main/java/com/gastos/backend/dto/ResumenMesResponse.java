package com.gastos.backend.dto;

import java.math.BigDecimal;

public record ResumenMesResponse(
    BigDecimal ingresos,
    BigDecimal gastos
) {}
