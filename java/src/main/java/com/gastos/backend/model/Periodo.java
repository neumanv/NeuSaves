package com.gastos.backend.model;

import jakarta.persistence.*;

//Catálogo de periodos de repetición para los movimientos periódicos (Diario, Semanal, Mensual, ...)
@Entity
@Table(name = "periodos")
public class Periodo{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_periodo")
    private Long idPeriodo;

    @Column(nullable = false, length = 20, unique = true)
    private String periodo;

    public Long getIdPeriodo(){
        return idPeriodo;
    }
    public void setIdPeriodo(Long idPeriodo){
        this.idPeriodo = idPeriodo;
    }

    public String getPeriodo(){
        return periodo;
    }
    public void setPeriodo(String periodo){
        this.periodo = periodo;
    }
}
