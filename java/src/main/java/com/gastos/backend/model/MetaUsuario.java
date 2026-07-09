package com.gastos.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "metas_usuario")
public class MetaUsuario{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_meta_usuario")
    private Long idMetaUsuario;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(nullable = false, length = 50)
    private String titulo;

    @Column(nullable = false, length = 100)
    private String descripcion;

    //'S' = completada, 'N' = pendiente
    @Column(nullable = false, length = 1)
    private String completado = "N";

    //Posición en la lista (arrastrable): menor primero
    @Column(nullable = false)
    private Integer orden = 0;

    public Long getIdMetaUsuario(){
        return idMetaUsuario;
    }
    public void setIdMetaUsuario(Long idMetaUsuario){
        this.idMetaUsuario = idMetaUsuario;
    }

    public Long getIdUsuario(){
        return idUsuario;
    }
    public void setIdUsuario(Long idUsuario){
        this.idUsuario = idUsuario;
    }

    public String getTitulo(){
        return titulo;
    }
    public void setTitulo(String titulo){
        this.titulo = titulo;
    }

    public String getDescripcion(){
        return descripcion;
    }
    public void setDescripcion(String descripcion){
        this.descripcion = descripcion;
    }

    public String getCompletado(){
        return completado;
    }
    public void setCompletado(String completado){
        this.completado = completado;
    }

    public Integer getOrden(){
        return orden;
    }
    public void setOrden(Integer orden){
        this.orden = orden;
    }
}