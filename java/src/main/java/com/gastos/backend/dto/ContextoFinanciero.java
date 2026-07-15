package com.gastos.backend.dto;

import java.util.List;

//Resumen económico del usuario que se envía a FinBot para que hable de sus datos reales
public record ContextoFinanciero(
    String nombre,
    Double saldo,
    Double ingresosMes,
    Double gastosMes,
    Integer movimientosMes,
    List<String> movimientosRecientes
){}
