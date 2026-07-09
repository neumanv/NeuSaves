package com.gastos.backend.controller;

import com.gastos.backend.model.Movimiento;
import com.gastos.backend.repository.MovimientoRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

//Catálogo de tipos de movimiento. Se usa, por ejemplo, para el desplegable de "Añadir ingreso"
@RestController
@RequestMapping("/api/movimientos")
@CrossOrigin(origins = "http://localhost:4200")
public class MovimientoController{

    private final MovimientoRepository movimientoRepository;

    public MovimientoController(MovimientoRepository movimientoRepository){
        this.movimientoRepository = movimientoRepository;
    }

    //Devuelve los tipos. Si se pasa ?gasto=N (ingresos) o ?gasto=S (gastos) filtra por ese tipo
    @GetMapping
    public List<Movimiento> listar(@RequestParam(required = false) String gasto){
        if (gasto != null){
            return movimientoRepository.findByGastoOrderByIdMovimientoAsc(gasto);
        }
        return movimientoRepository.findAll();
    }
}
