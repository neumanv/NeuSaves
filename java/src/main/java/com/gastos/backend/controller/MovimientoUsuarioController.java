package com.gastos.backend.controller;

import com.gastos.backend.dto.EstadisticasResponse;
import com.gastos.backend.dto.MovimientoPeriodico;
import com.gastos.backend.dto.PaginaResponse;
import com.gastos.backend.dto.ResumenMesResponse;
import com.gastos.backend.dto.UltimoMovimiento;
import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import com.gastos.backend.service.CorreoService;
import com.gastos.backend.service.EstadisticasService;
import com.gastos.backend.service.MovimientoPeriodicoService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/movimientos-usuarios")
public class MovimientoUsuarioController {

    public record CambioPeriodico(Long idUsuario, Long idPeriodo, Integer diaCobro, Integer mesCobro, LocalDate fechaFin) {}

    private static final int MAX_PERIODICOS = 10;

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;
    private final MovimientoPeriodicoService movimientoPeriodicoService;
    private final CorreoService correoService;
    private final EstadisticasService estadisticasService;

    @PersistenceContext
    private EntityManager entityManager;

    public MovimientoUsuarioController(MovimientoUsuarioRepository movimientoUsuarioRepository,
                                       MovimientoPeriodicoService movimientoPeriodicoService,
                                       CorreoService correoService,
                                       EstadisticasService estadisticasService) {
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
        this.movimientoPeriodicoService = movimientoPeriodicoService;
        this.correoService = correoService;
        this.estadisticasService = estadisticasService;
    }

    @GetMapping("/count")
    public long contarDelMes(@RequestParam Long usuario) {
        LocalDate hoy = LocalDate.now();
        return movimientoUsuarioRepository.countByIdUsuarioAndIdPeriodoIsNullAndFechaMovimientoBetween(
                usuario, hoy.withDayOfMonth(1), hoy.withDayOfMonth(hoy.lengthOfMonth()));
    }

    @GetMapping("/saldo")
    public BigDecimal saldoActual(@RequestParam Long usuario) {
        return movimientoUsuarioRepository.findFirstByIdUsuarioOrderByIdMovimientoUsuarioDesc(usuario)
                .map(MovimientoUsuario::getSaldo)
                .orElse(BigDecimal.ZERO);
    }

    @GetMapping("/resumen-mes")
    public ResumenMesResponse resumenDelMes(@RequestParam Long usuario) {
        LocalDate hoy = LocalDate.now();
        LocalDate desde = hoy.withDayOfMonth(1);
        LocalDate hasta = hoy.withDayOfMonth(hoy.lengthOfMonth());
        BigDecimal ingresos = movimientoUsuarioRepository.sumarPorTipoEnRango(usuario, "N", desde, hasta);
        BigDecimal gastos = movimientoUsuarioRepository.sumarPorTipoEnRango(usuario, "S", desde, hasta);
        return new ResumenMesResponse(ingresos, gastos);
    }

    @GetMapping("/ultimos")
    public List<UltimoMovimiento> ultimos(@RequestParam Long usuario,
                                          @RequestParam(defaultValue = "5") int limite) {
        return movimientoUsuarioRepository.ultimosMovimientos(usuario, limite);
    }

    @GetMapping("/pagina")
    public PaginaResponse<UltimoMovimiento> pagina(@RequestParam Long usuario,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "50") int tamano,
                                      @RequestParam(required = false) String gasto,
                                      @RequestParam(required = false) Long tipo,
                                      @RequestParam(required = false) LocalDate desde,
                                      @RequestParam(required = false) LocalDate hasta,
                                      @RequestParam(required = false) BigDecimal min,
                                      @RequestParam(required = false) BigDecimal max) {
        String gastoFiltro = (gasto == null || gasto.isBlank()) ? null : gasto;
        Page<UltimoMovimiento> resultado = movimientoUsuarioRepository.movimientosFiltrados(
                usuario, gastoFiltro, tipo, desde, hasta, min, max, PageRequest.of(pagina, tamano));
        return new PaginaResponse<>(
                resultado.getContent(),
                resultado.getTotalPages(),
                resultado.getTotalElements(),
                resultado.getNumber()
        );
    }

    @PostMapping
    @Transactional
    public ResponseEntity<MovimientoUsuario> crear(@RequestBody MovimientoUsuario movimiento) {
        if (movimiento.getIdPeriodo() != null
                && movimientoUsuarioRepository.countByIdUsuarioAndIdPeriodoIsNotNull(movimiento.getIdUsuario()) >= MAX_PERIODICOS) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        movimientoPeriodicoService.asignarDiaCobroPorDefecto(movimiento);
        MovimientoUsuario guardado = movimientoUsuarioRepository.save(movimiento);
        entityManager.flush();
        entityManager.refresh(guardado);
        correoService.avisarMovimiento(guardado);
        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/periodicos")
    public List<MovimientoPeriodico> periodicos(@RequestParam Long usuario) {
        return movimientoUsuarioRepository.movimientosPeriodicos(usuario);
    }

    @PutMapping("/periodicos/{id}")
    public ResponseEntity<Void> cambiarPeriodico(@PathVariable Long id, @RequestBody CambioPeriodico cambio) {
        MovimientoUsuario plantilla = buscarPlantillaDelUsuario(id, cambio.idUsuario());
        if (plantilla == null) {
            return ResponseEntity.notFound().build();
        }
        if (cambio.idPeriodo() == null
                || !movimientoPeriodicoService.aplicarCambio(plantilla, cambio.idPeriodo(), cambio.diaCobro(), cambio.mesCobro(), cambio.fechaFin())) {
            return ResponseEntity.badRequest().build();
        }
        movimientoUsuarioRepository.save(plantilla);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/periodicos/{id}")
    public ResponseEntity<Void> eliminarPeriodico(@PathVariable Long id, @RequestParam Long usuario) {
        MovimientoUsuario plantilla = buscarPlantillaDelUsuario(id, usuario);
        if (plantilla == null) {
            return ResponseEntity.notFound().build();
        }
        movimientoUsuarioRepository.delete(plantilla);
        return ResponseEntity.ok().build();
    }

    private MovimientoUsuario buscarPlantillaDelUsuario(Long id, Long idUsuario) {
        MovimientoUsuario plantilla = movimientoUsuarioRepository.findById(id).orElse(null);
        if (plantilla == null || plantilla.getIdPeriodo() == null
                || idUsuario == null || !idUsuario.equals(plantilla.getIdUsuario())) {
            return null;
        }
        return plantilla;
    }

    @GetMapping("/estadisticas")
    public EstadisticasResponse estadisticas(@RequestParam Long usuario,
                                            @RequestParam(required = false) LocalDate desde,
                                            @RequestParam(required = false) LocalDate hasta) {
        return estadisticasService.estadisticas(usuario, desde, hasta);
    }

    @GetMapping("/estadisticas/anios")
    public List<Integer> aniosConDatos(@RequestParam Long usuario) {
        return estadisticasService.aniosConDatos(usuario);
    }
}
