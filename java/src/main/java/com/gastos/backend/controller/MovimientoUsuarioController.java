package com.gastos.backend.controller;

import com.gastos.backend.dto.EstadisticaMes;
import com.gastos.backend.dto.EstadisticaTipo;
import com.gastos.backend.dto.MovimientoPeriodico;
import com.gastos.backend.dto.UltimoMovimiento;
import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import com.gastos.backend.service.MovimientoPeriodicoService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
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
import java.util.Map;

@RestController
@RequestMapping("/api/movimientos-usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class MovimientoUsuarioController{

    //Cambio de periodicidad y día de cobro de un movimiento periódico desde el perfil
    public record CambioPeriodico(Long idUsuario, Long idPeriodo, Integer diaCobro, Integer mesCobro){}

    //Máximo de movimientos periódicos por usuario
    private static final int MAX_PERIODICOS = 10;

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;
    private final MovimientoPeriodicoService movimientoPeriodicoService;

    @PersistenceContext
    private EntityManager entityManager;

    public MovimientoUsuarioController(MovimientoUsuarioRepository movimientoUsuarioRepository,
                                       MovimientoPeriodicoService movimientoPeriodicoService){
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
        this.movimientoPeriodicoService = movimientoPeriodicoService;
    }

    //Número de movimientos del usuario en el mes actual (según fecha_movimiento)
    @GetMapping("/count")
    public long contarDelMes(@RequestParam Long usuario){
        LocalDate hoy = LocalDate.now();
        return movimientoUsuarioRepository.countByIdUsuarioAndIdPeriodoIsNullAndFechaMovimientoBetween(
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

    //Todos los movimientos del usuario paginados (50 por página) para la pantalla "Ver todos".
    //Admite filtros opcionales: tipo (gasto/ingreso y tipo concreto), rango de fechas y rango de cantidad.
    @GetMapping("/pagina")
    public Map<String, Object> pagina(@RequestParam Long usuario,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "50") int tamano,
                                      @RequestParam(required = false) String gasto,
                                      @RequestParam(required = false) Long tipo,
                                      @RequestParam(required = false) LocalDate desde,
                                      @RequestParam(required = false) LocalDate hasta,
                                      @RequestParam(required = false) BigDecimal min,
                                      @RequestParam(required = false) BigDecimal max){
        //Se normaliza el gasto vacío a null para no filtrar por él
        String gastoFiltro = (gasto == null || gasto.isBlank()) ? null : gasto;
        Page<UltimoMovimiento> resultado = movimientoUsuarioRepository.movimientosFiltrados(
                usuario, gastoFiltro, tipo, desde, hasta, min, max, PageRequest.of(pagina, tamano));
        return Map.of(
                "contenido", resultado.getContent(),
                "totalPaginas", resultado.getTotalPages(),
                "totalElementos", resultado.getTotalElements(),
                "pagina", resultado.getNumber()
        );
    }

    @PostMapping
    @Transactional
    public ResponseEntity<MovimientoUsuario> crear(@RequestBody MovimientoUsuario movimiento){
        //Máximo de movimientos periódicos por usuario: 409 si ya lo ha alcanzado
        if (movimiento.getIdPeriodo() != null
                && movimientoUsuarioRepository.countByIdUsuarioAndIdPeriodoIsNotNull(movimiento.getIdUsuario()) >= MAX_PERIODICOS){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        //Si es periódico se guarda como plantilla con el día de cobro por defecto
        //(lunes / día 1 / 1 de enero); el dinero lo mueven los cobros automáticos
        movimientoPeriodicoService.asignarDiaCobroPorDefecto(movimiento);
        MovimientoUsuario guardado = movimientoUsuarioRepository.save(movimiento);
        entityManager.flush();
        entityManager.refresh(guardado);
        return ResponseEntity.ok(guardado);
    }

    //Movimientos periódicos del usuario para la pestaña "Mov. periódicos" del perfil
    @GetMapping("/periodicos")
    public List<MovimientoPeriodico> periodicos(@RequestParam Long usuario){
        return movimientoUsuarioRepository.movimientosPeriodicos(usuario);
    }

    //Cambia la periodicidad y el día de cobro (y el mes si es anual) de un movimiento periódico
    @PutMapping("/periodicos/{id}")
    public ResponseEntity<Void> cambiarPeriodico(@PathVariable Long id, @RequestBody CambioPeriodico cambio){
        MovimientoUsuario plantilla = buscarPlantillaDelUsuario(id, cambio.idUsuario());
        if (plantilla == null){
            return ResponseEntity.notFound().build();
        }
        if (cambio.idPeriodo() == null
                || !movimientoPeriodicoService.aplicarCambio(plantilla, cambio.idPeriodo(), cambio.diaCobro(), cambio.mesCobro())){
            return ResponseEntity.badRequest().build();
        }
        movimientoUsuarioRepository.save(plantilla);
        return ResponseEntity.ok().build();
    }

    //Elimina un movimiento periódico: deja de cobrarse, pero los cobros ya generados se conservan
    @DeleteMapping("/periodicos/{id}")
    public ResponseEntity<Void> eliminarPeriodico(@PathVariable Long id, @RequestParam Long usuario){
        MovimientoUsuario plantilla = buscarPlantillaDelUsuario(id, usuario);
        if (plantilla == null){
            return ResponseEntity.notFound().build();
        }
        movimientoUsuarioRepository.delete(plantilla);
        return ResponseEntity.ok().build();
    }

    //Busca una plantilla periódica comprobando que pertenece al usuario indicado
    private MovimientoUsuario buscarPlantillaDelUsuario(Long id, Long idUsuario){
        MovimientoUsuario plantilla = movimientoUsuarioRepository.findById(id).orElse(null);
        if (plantilla == null || plantilla.getIdPeriodo() == null
                || idUsuario == null || !idUsuario.equals(plantilla.getIdUsuario())){
            return null;
        }
        return plantilla;
    }

    //Estadísticas del usuario para la pantalla de gráficas: totales, desglose por tipo y evolución mensual.
    //Se puede filtrar por un rango de fechas (para ver un mes o un año concretos).
    @GetMapping("/estadisticas")
    public Map<String, Object> estadisticas(@RequestParam Long usuario,
                                            @RequestParam(required = false) LocalDate desde,
                                            @RequestParam(required = false) LocalDate hasta){
        List<EstadisticaTipo> porTipo = movimientoUsuarioRepository.estadisticasPorTipo(usuario, desde, hasta);

        //Totales agregados a partir del desglose por tipo
        BigDecimal totalIngresos = BigDecimal.ZERO;
        BigDecimal totalGastos = BigDecimal.ZERO;
        long numeroMovimientos = 0;
        for (EstadisticaTipo t : porTipo){
            if ("N".equals(t.getGasto())){
                totalIngresos = totalIngresos.add(t.getTotal());
            }else{
                totalGastos = totalGastos.add(t.getTotal());
            }
            numeroMovimientos += t.getCantidad();
        }

        List<EstadisticaMes> porMes = movimientoUsuarioRepository.estadisticasPorMes(usuario, desde, hasta);

        Map<String, Object> respuesta = new java.util.LinkedHashMap<>();
        respuesta.put("totalIngresos", totalIngresos);
        respuesta.put("totalGastos", totalGastos);
        respuesta.put("balance", totalIngresos.subtract(totalGastos));
        respuesta.put("numeroMovimientos", numeroMovimientos);
        respuesta.put("porTipo", porTipo);
        respuesta.put("porMes", porMes);
        return respuesta;
    }

    //Años con movimientos del usuario, para poblar el desplegable de años del filtro de estadísticas
    @GetMapping("/estadisticas/anios")
    public List<Integer> aniosConDatos(@RequestParam Long usuario){
        return movimientoUsuarioRepository.aniosConMovimientos(usuario);
    }

    private LocalDate primerDiaDelMes(LocalDate fecha){
        return fecha.withDayOfMonth(1);
    }

    private LocalDate ultimoDiaDelMes(LocalDate fecha){
        return fecha.withDayOfMonth(fecha.lengthOfMonth());
    }
}
