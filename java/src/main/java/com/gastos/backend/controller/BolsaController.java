package com.gastos.backend.controller;

import com.gastos.backend.dto.CotizacionBolsa;
import com.gastos.backend.service.BolsaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

//Cotizaciones de bolsa (índices y divisas) para la tarjeta "Bolsa" del panel de usuario
@RestController
@RequestMapping("/api/bolsa")
public class BolsaController{

    private final BolsaService bolsaService;

    public BolsaController(BolsaService bolsaService){
        this.bolsaService = bolsaService;
    }

    @GetMapping
    public List<CotizacionBolsa> listar(){
        return bolsaService.obtenerCotizaciones();
    }
}
