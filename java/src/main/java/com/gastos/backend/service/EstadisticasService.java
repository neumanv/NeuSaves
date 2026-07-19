package com.gastos.backend.service;

import com.gastos.backend.dto.EstadisticaMes;
import com.gastos.backend.dto.EstadisticasResponse;
import com.gastos.backend.dto.EstadisticaTipo;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class EstadisticasService {

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;

    public EstadisticasService(MovimientoUsuarioRepository movimientoUsuarioRepository) {
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
    }

    public EstadisticasResponse estadisticas(Long usuario, LocalDate desde, LocalDate hasta) {
        List<EstadisticaTipo> porTipo = movimientoUsuarioRepository.estadisticasPorTipo(usuario, desde, hasta);

        BigDecimal totalIngresos = BigDecimal.ZERO;
        BigDecimal totalGastos = BigDecimal.ZERO;
        long numeroMovimientos = 0;
        for (EstadisticaTipo t : porTipo) {
            if ("N".equals(t.getGasto())) {
                totalIngresos = totalIngresos.add(t.getTotal());
            } else {
                totalGastos = totalGastos.add(t.getTotal());
            }
            numeroMovimientos += t.getCantidad();
        }

        List<EstadisticaMes> porMes = movimientoUsuarioRepository.estadisticasPorMes(usuario, desde, hasta);

        return new EstadisticasResponse(
                totalIngresos, totalGastos,
                totalIngresos.subtract(totalGastos),
                numeroMovimientos, porTipo, porMes
        );
    }

    public List<Integer> aniosConDatos(Long usuario) {
        return movimientoUsuarioRepository.aniosConMovimientos(usuario);
    }
}
