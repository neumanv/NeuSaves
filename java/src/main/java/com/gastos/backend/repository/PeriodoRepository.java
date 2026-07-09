package com.gastos.backend.repository;

import com.gastos.backend.model.Periodo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PeriodoRepository extends JpaRepository<Periodo, Long>{

    //Periodos ordenados por id (Diario, Semanal, Mensual, 2 meses, Anual)
    List<Periodo> findAllByOrderByIdPeriodoAsc();
}
