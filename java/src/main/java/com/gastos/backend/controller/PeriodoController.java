package com.gastos.backend.controller;

import com.gastos.backend.model.Periodo;
import com.gastos.backend.repository.PeriodoRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

//Catálogo de periodos de repetición. Se usa en el desplegable de movimientos periódicos
@RestController
@RequestMapping("/api/periodos")
public class PeriodoController{

    private final PeriodoRepository periodoRepository;

    public PeriodoController(PeriodoRepository periodoRepository){
        this.periodoRepository = periodoRepository;
    }

    @GetMapping
    public List<Periodo> listar(){
        return periodoRepository.findAllByOrderByIdPeriodoAsc();
    }
}
