package com.gastos.backend.repository;

import com.gastos.backend.model.MovimientoUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface MovimientoUsuarioRepository extends JpaRepository<MovimientoUsuario, Long>{

    //Cuenta los movimientos de un usuario cuya fecha_movimiento cae dentro de un rango (el mes actual)
    long countByIdUsuarioAndFechaMovimientoBetween(Long idUsuario, LocalDate desde, LocalDate hasta);
}
