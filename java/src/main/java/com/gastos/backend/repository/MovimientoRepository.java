package com.gastos.backend.repository;

import com.gastos.backend.model.Movimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoRepository extends JpaRepository<Movimiento, Long>{

    //Tipos de movimiento filtrados por gasto ('S' gastos, 'N' ingresos), ordenados por id
    List<Movimiento> findByGastoOrderByIdMovimientoAsc(String gasto);
}
