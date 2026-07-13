package com.gastos.backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "movimientos_usuarios")
public class MovimientoUsuario{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento_usuario")
    private Long idMovimientoUsuario;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(name = "id_movimiento", nullable = false)
    private Long idMovimiento;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal cantidad = BigDecimal.ZERO;

    @Column(insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal saldo;

    @Column(name = "fecha_movimiento")
    private LocalDate fechaMovimiento;

    @Column(name = "fecha_fin_movimiento")
    private LocalDate fechaFinMovimiento;

    //Periodo de repetición si el movimiento es periódico; null si es puntual
    @Column(name = "id_periodo")
    private Long idPeriodo;

    //Día en el que se cobra el periódico: 1-7 (semanal, 1=lunes) o 1-31 (mensual/2 meses/anual)
    @Column(name = "dia_cobro")
    private Integer diaCobro;

    //Mes en el que se cobra el periódico anual: 1-12
    @Column(name = "mes_cobro")
    private Integer mesCobro;

    //Fecha del último cobro generado por el proceso automático, para no duplicar cobros
    @Column(name = "ultimo_cobro")
    private LocalDate ultimoCobro;

    public Long getIdMovimientoUsuario(){
        return idMovimientoUsuario;
    }
    public void setIdMovimientoUsuario(Long idMovimientoUsuario){
        this.idMovimientoUsuario = idMovimientoUsuario;
    }

    public Long getIdUsuario(){
        return idUsuario;
    }
    public void setIdUsuario(Long idUsuario){
        this.idUsuario = idUsuario;
    }

    public Long getIdMovimiento(){
        return idMovimiento;
    }
    public void setIdMovimiento(Long idMovimiento){
        this.idMovimiento = idMovimiento;
    }

    public String getDescripcion(){
        return descripcion;
    }
    public void setDescripcion(String descripcion){
        this.descripcion = descripcion;
    }

    public BigDecimal getCantidad(){
        return cantidad;
    }
    public void setCantidad(BigDecimal cantidad){
        this.cantidad = cantidad;
    }

    public BigDecimal getSaldo(){
        return saldo;
    }
    public void setSaldo(BigDecimal saldo){
        this.saldo = saldo;
    }

    public LocalDate getFechaMovimiento(){
        return fechaMovimiento;
    }
    public void setFechaMovimiento(LocalDate fechaMovimiento){
        this.fechaMovimiento = fechaMovimiento;
    }

    public LocalDate getFechaFinMovimiento(){
        return fechaFinMovimiento;
    }
    public void setFechaFinMovimiento(LocalDate fechaFinMovimiento){
        this.fechaFinMovimiento = fechaFinMovimiento;
    }

    public Long getIdPeriodo(){
        return idPeriodo;
    }
    public void setIdPeriodo(Long idPeriodo){
        this.idPeriodo = idPeriodo;
    }

    public Integer getDiaCobro(){
        return diaCobro;
    }
    public void setDiaCobro(Integer diaCobro){
        this.diaCobro = diaCobro;
    }

    public Integer getMesCobro(){
        return mesCobro;
    }
    public void setMesCobro(Integer mesCobro){
        this.mesCobro = mesCobro;
    }

    public LocalDate getUltimoCobro(){
        return ultimoCobro;
    }
    public void setUltimoCobro(LocalDate ultimoCobro){
        this.ultimoCobro = ultimoCobro;
    }
}