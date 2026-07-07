package com.gastos.backend.controller;

import com.gastos.backend.repository.MovimientoUsuarioRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/movimientos-usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class MovimientoUsuarioController{

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;

    public MovimientoUsuarioController(MovimientoUsuarioRepository movimientoUsuarioRepository){
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
    }

    //Número de movimientos del usuario en el mes actual (según fecha_movimiento)
    @GetMapping("/count")
    public long contarDelMes(@RequestParam Long usuario){
        LocalDate hoy = LocalDate.now();
        LocalDate primerDia = hoy.withDayOfMonth(1);
        LocalDate ultimoDia = hoy.withDayOfMonth(hoy.lengthOfMonth());
        return movimientoUsuarioRepository.countByIdUsuarioAndFechaMovimientoBetween(usuario, primerDia, ultimoDia);
    }
}
