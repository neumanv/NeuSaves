package com.gastos.backend.model;

import jakarta.persistence.*;

//Catálogo de tipos de movimiento (Nómina, Regalos, Fijos, ...). gasto = 'S' (gasto) o 'N' (ingreso)
@Entity
@Table(name = "movimientos")
public class Movimiento{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    private Long idMovimiento;

    @Column(nullable = false, length = 40, unique = true)
    private String tipo;

    @Column(nullable = false, length = 1)
    private String gasto;

    public Long getIdMovimiento(){
        return idMovimiento;
    }
    public void setIdMovimiento(Long idMovimiento){
        this.idMovimiento = idMovimiento;
    }

    public String getTipo(){
        return tipo;
    }
    public void setTipo(String tipo){
        this.tipo = tipo;
    }

    public String getGasto(){
        return gasto;
    }
    public void setGasto(String gasto){
        this.gasto = gasto;
    }
}
