package com.gastos.backend.dto;

//Cotización de un índice/valor de bolsa para la tarjeta "Bolsa" del panel de usuario
public record CotizacionBolsa(
    String nombre,     //Nombre para mostrar (IBEX 35, S&P 500...)
    String simbolo,    //Símbolo en Yahoo Finance (^IBEX, ^GSPC...)
    double precio,     //Último precio conocido
    double variacion,  //Variación en % respecto al cierre anterior
    String moneda      //EUR, USD...
){}
