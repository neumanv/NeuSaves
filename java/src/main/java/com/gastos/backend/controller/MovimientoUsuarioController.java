package com.gastos.backend.controller;

import com.gastos.backend.dto.UltimoMovimiento;
import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movimientos-usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class MovimientoUsuarioController{

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public MovimientoUsuarioController(MovimientoUsuarioRepository movimientoUsuarioRepository){
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
    }

    //Número de movimientos del usuario en el mes actual (según fecha_movimiento)
    @GetMapping("/count")
    public long contarDelMes(@RequestParam Long usuario){
        LocalDate hoy = LocalDate.now();
        return movimientoUsuarioRepository.countByIdUsuarioAndFechaMovimientoBetween(
                usuario, primerDiaDelMes(hoy), ultimoDiaDelMes(hoy));
    }

    @GetMapping("/saldo")
    public BigDecimal saldoActual(@RequestParam Long usuario){
        return movimientoUsuarioRepository.findFirstByIdUsuarioOrderByIdMovimientoUsuarioDesc(usuario)
                .map(MovimientoUsuario::getSaldo)
                .orElse(BigDecimal.ZERO);
    }

    @GetMapping("/resumen-mes")
    public Map<String, BigDecimal> resumenDelMes(@RequestParam Long usuario){
        LocalDate hoy = LocalDate.now();
        LocalDate desde = primerDiaDelMes(hoy);
        LocalDate hasta = ultimoDiaDelMes(hoy);
        BigDecimal ingresos = movimientoUsuarioRepository.sumarPorTipoEnRango(usuario, "N", desde, hasta);
        BigDecimal gastos = movimientoUsuarioRepository.sumarPorTipoEnRango(usuario, "S", desde, hasta);
        return Map.of("ingresos", ingresos, "gastos", gastos);
    }

    //Últimos movimientos del usuario (por defecto 5), los más recientes primero
    @GetMapping("/ultimos")
    public List<UltimoMovimiento> ultimos(@RequestParam Long usuario,
                                          @RequestParam(defaultValue = "5") int limite){
        return movimientoUsuarioRepository.ultimosMovimientos(usuario, limite);
    }

    //Todos los movimientos del usuario paginados (50 por página) para la pantalla "Ver todos"
    @GetMapping("/pagina")
    public Map<String, Object> pagina(@RequestParam Long usuario,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "50") int tamano){
        Page<UltimoMovimiento> resultado =
                movimientoUsuarioRepository.movimientosPaginados(usuario, PageRequest.of(pagina, tamano));
        return Map.of(
                "contenido", resultado.getContent(),
                "totalPaginas", resultado.getTotalPages(),
                "totalElementos", resultado.getTotalElements(),
                "pagina", resultado.getNumber()
        );
    }

    @PostMapping
    @Transactional
    public MovimientoUsuario crear(@RequestBody MovimientoUsuario movimiento){
        MovimientoUsuario guardado = movimientoUsuarioRepository.save(movimiento);
        entityManager.flush();
        entityManager.refresh(guardado);
        return guardado;
    }

    private LocalDate primerDiaDelMes(LocalDate fecha){
        return fecha.withDayOfMonth(1);
    }

    private LocalDate ultimoDiaDelMes(LocalDate fecha){
        return fecha.withDayOfMonth(fecha.lengthOfMonth());
    }
}