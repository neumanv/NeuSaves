package com.gastos.backend.repository;

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

@Repository
public interface MovimientoUsuarioRepository extends JpaRepository<MovimientoUsuario, Long>{

    //Cuenta los movimientos de un usuario cuya fecha_movimiento cae dentro de un rango (el mes actual)
    long countByIdUsuarioAndFechaMovimientoBetween(Long idUsuario, LocalDate desde, LocalDate hasta);

    Optional<MovimientoUsuario> findFirstByIdUsuarioOrderByIdMovimientoUsuarioDesc(Long idUsuario);

    @Query(value = "SELECT COALESCE(SUM(mu.cantidad), 0) " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
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
                   "ORDER BY mu.id_movimiento_usuario DESC " +
                   "LIMIT :limite", nativeQuery = true)
    List<UltimoMovimiento> ultimosMovimientos(@Param("usuario") Long usuario, @Param("limite") int limite);

    //Todos los movimientos del usuario paginados (los más recientes primero), para la pantalla "Ver todos"
    @Query(value = "SELECT mu.descripcion AS descripcion, m.tipo AS tipo, m.gasto AS gasto, " +
                   "mu.fecha_movimiento AS fechaMovimiento, mu.cantidad AS cantidad " +
                   "FROM movimientos_usuarios mu " +
                   "JOIN movimientos m ON mu.id_movimiento = m.id_movimiento " +
                   "WHERE mu.id_usuario = :usuario " +
                   "ORDER BY mu.id_movimiento_usuario DESC",
           countQuery = "SELECT COUNT(*) FROM movimientos_usuarios mu WHERE mu.id_usuario = :usuario",
           nativeQuery = true)
    Page<UltimoMovimiento> movimientosPaginados(@Param("usuario") Long usuario, Pageable pageable);
}