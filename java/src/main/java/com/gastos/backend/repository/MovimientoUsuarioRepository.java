package com.gastos.backend.repository;

import com.gastos.backend.dto.MovimientoPeriodico;
import com.gastos.backend.dto.UltimoMovimiento;
import com.gastos.backend.model.MovimientoUsuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

//Nota: los movimientos periódicos (id_periodo relleno) son plantillas y no mueven dinero,
//por eso se excluyen de los contadores, sumas y listados. El dinero lo mueven los cobros
//que genera MovimientoPeriodicoService (filas normales con id_periodo a null).
@Repository
public interface MovimientoUsuarioRepository extends JpaRepository<MovimientoUsuario, Long>{

    //Cuenta los movimientos de un usuario cuya fecha_movimiento cae dentro de un rango (el mes actual)
    long countByIdUsuarioAndIdPeriodoIsNullAndFechaMovimientoBetween(Long idUsuario, LocalDate desde, LocalDate hasta);

    Optional<MovimientoUsuario> findFirstByIdUsuarioOrderByIdMovimientoUsuarioDesc(Long idUsuario);

    //Plantillas de movimientos periódicos de todos los usuarios, para el proceso de cobros automáticos
    List<MovimientoUsuario> findByIdPeriodoIsNotNull();

    //Número de movimientos periódicos del usuario, para el límite de 10 por usuario
    long countByIdUsuarioAndIdPeriodoIsNotNull(Long idUsuario);

    @Query(value = "SELECT COALESCE(SUM(mu.cantidad), 0) " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "AND mu.id_periodo IS NULL " +
                   "AND m.gasto = :gasto " +
                   "AND mu.fecha_movimiento BETWEEN :desde AND :hasta", nativeQuery = true)
    BigDecimal sumarPorTipoEnRango(@Param("usuario") Long usuario,
                                   @Param("gasto") String gasto,
                                   @Param("desde") LocalDate desde,
                                   @Param("hasta") LocalDate hasta);

    //Últimos movimientos del usuario (los más recientes primero), con el tipo y el flag gasto ya unidos
    @Query(value = "SELECT mu.descripcion AS descripcion, m.tipo AS tipo, m.gasto AS gasto, " +
                   "mu.fecha_movimiento AS fechaMovimiento, mu.cantidad AS cantidad " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "AND mu.id_periodo IS NULL " +
                   "ORDER BY mu.id_movimiento_usuario DESC " +
                   "LIMIT :limite", nativeQuery = true)
    List<UltimoMovimiento> ultimosMovimientos(@Param("usuario") Long usuario, @Param("limite") int limite);

    //Todos los movimientos del usuario paginados (los más recientes primero), para la pantalla "Ver todos"
    @Query(value = "SELECT mu.descripcion AS descripcion, m.tipo AS tipo, m.gasto AS gasto, " +
                   "mu.fecha_movimiento AS fechaMovimiento, mu.cantidad AS cantidad " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "AND mu.id_periodo IS NULL " +
                   "ORDER BY mu.id_movimiento_usuario DESC",
           countQuery = "SELECT COUNT(*) FROM movimientos_usuarios mu WHERE mu.id_usuario = :usuario AND mu.id_periodo IS NULL",
           nativeQuery = true)
    Page<UltimoMovimiento> movimientosPaginados(@Param("usuario") Long usuario, Pageable pageable);

    //Igual que el anterior pero con filtros opcionales (cualquiera puede ir a null = sin filtrar):
    //gasto ('S'/'N'), tipo concreto (id_movimiento), rango de fechas y rango de cantidad.
    //Los CAST permiten a Postgres inferir el tipo de los parámetros cuando llegan nulos.
    @Query(value = "SELECT mu.descripcion AS descripcion, m.tipo AS tipo, m.gasto AS gasto, " +
                   "mu.fecha_movimiento AS fechaMovimiento, mu.cantidad AS cantidad " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "AND mu.id_periodo IS NULL " +
                   "AND (CAST(:gasto AS varchar) IS NULL OR m.gasto = :gasto) " +
                   "AND (CAST(:idMovimiento AS bigint) IS NULL OR mu.id_movimiento = :idMovimiento) " +
                   "AND (CAST(:desde AS date) IS NULL OR mu.fecha_movimiento >= :desde) " +
                   "AND (CAST(:hasta AS date) IS NULL OR mu.fecha_movimiento <= :hasta) " +
                   "AND (CAST(:minCantidad AS numeric) IS NULL OR (CASE WHEN m.gasto = 'S' THEN -mu.cantidad ELSE mu.cantidad END) >= :minCantidad) " +
                   "AND (CAST(:maxCantidad AS numeric) IS NULL OR (CASE WHEN m.gasto = 'S' THEN -mu.cantidad ELSE mu.cantidad END) <= :maxCantidad) " +
                   "ORDER BY mu.id_movimiento_usuario DESC",
           countQuery = "SELECT COUNT(*) FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "AND mu.id_periodo IS NULL " +
                   "AND (CAST(:gasto AS varchar) IS NULL OR m.gasto = :gasto) " +
                   "AND (CAST(:idMovimiento AS bigint) IS NULL OR mu.id_movimiento = :idMovimiento) " +
                   "AND (CAST(:desde AS date) IS NULL OR mu.fecha_movimiento >= :desde) " +
                   "AND (CAST(:hasta AS date) IS NULL OR mu.fecha_movimiento <= :hasta) " +
                   "AND (CAST(:minCantidad AS numeric) IS NULL OR (CASE WHEN m.gasto = 'S' THEN -mu.cantidad ELSE mu.cantidad END) >= :minCantidad) " +
                   "AND (CAST(:maxCantidad AS numeric) IS NULL OR (CASE WHEN m.gasto = 'S' THEN -mu.cantidad ELSE mu.cantidad END) <= :maxCantidad)",
           nativeQuery = true)
    Page<UltimoMovimiento> movimientosFiltrados(@Param("usuario") Long usuario,
                                                @Param("gasto") String gasto,
                                                @Param("idMovimiento") Long idMovimiento,
                                                @Param("desde") LocalDate desde,
                                                @Param("hasta") LocalDate hasta,
                                                @Param("minCantidad") BigDecimal minCantidad,
                                                @Param("maxCantidad") BigDecimal maxCantidad,
                                                Pageable pageable);

    //Movimientos periódicos del usuario con el tipo y el periodo ya unidos, para la pestaña del perfil
    @Query(value = "SELECT mu.id_movimiento_usuario AS idMovimientoUsuario, mu.descripcion AS descripcion, " +
                   "m.tipo AS tipo, m.gasto AS gasto, mu.cantidad AS cantidad, p.id_periodo AS idPeriodo, p.periodo AS periodo, " +
                   "mu.dia_cobro AS diaCobro, mu.mes_cobro AS mesCobro, mu.fecha_fin_movimiento AS fechaFinMovimiento " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "JOIN periodos p ON mu.id_periodo = p.id_periodo " +
                   "WHERE mu.id_usuario = :usuario " +
                   "ORDER BY mu.id_movimiento_usuario DESC", nativeQuery = true)
    List<MovimientoPeriodico> movimientosPeriodicos(@Param("usuario") Long usuario);
}
