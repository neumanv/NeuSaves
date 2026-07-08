package com.gastos.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(unique = true, length = 50)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(length = 72)
    private String contrasena;

    @Column(nullable = false, length = 50)
    private String nombre;

    @Column(nullable = false, length = 30)
    private String apellido1;

    @Column(length = 30)
    private String apellido2;

    @Column(length = 6)
    private String prefijo;

    @Column(length = 9)
    private String telefono1;

    @Column(length = 9)
    private String telefono2;

    @Column(unique = true, length = 9)
    private String dni;

    @Column(length = 1)
    private String sexo;

    //Hasta que no se introduce el código enviado por correo no se puede iniciar sesión
    @Column(nullable = false)
    private boolean verificado;

    @JsonIgnore
    @Column(name = "codigo_verificacion", length = 5)
    private String codigoVerificacion;

    @Column(name = "id_usuario_principal")
    private Long idUsuarioPrincipal;

    public Long getIdUsuario(){
        return idUsuario;
    }
    public void setIdUsuario(Long idUsuario){
        this.idUsuario = idUsuario;
    }

    public String getEmail(){
        return email;
    }
    public void setEmail(String email){
        this.email = email;
    }

    public String getContrasena(){
        return contrasena;
    }
    public void setContrasena(String contrasena){
        this.contrasena = contrasena;
    }

    public String getNombre(){ 
        return nombre; 
    }
    public void setNombre(String nombre){ 
        this.nombre = nombre; 
    }

    public String getApellido1(){ 
        return apellido1; 
    }
    public void setApellido1(String apellido1){ 
        this.apellido1 = apellido1; 
    }

    public String getApellido2(){ 
        return apellido2; 
    }
    public void setApellido2(String apellido2){ 
        this.apellido2 = apellido2; 
    }

    public String getPrefijo(){
        return prefijo;
    }
    public void setPrefijo(String prefijo){
        this.prefijo = prefijo;
    }

    public String getTelefono1(){
        return telefono1;
    }
    public void setTelefono1(String telefono1){ 
        this.telefono1 = telefono1; 
    }

    public String getTelefono2(){
        return telefono2; 
    }
    public void setTelefono2(String telefono2){ 
        this.telefono2 = telefono2; 
    }

    public String getDni(){ 
        return dni; 
    }
    public void setDni(String dni){ 
        this.dni = dni; 
    }

    public String getSexo(){
        return sexo;
    }
    public void setSexo(String sexo){
        this.sexo = sexo;
    }

    public boolean isVerificado(){
        return verificado;
    }
    public void setVerificado(boolean verificado){
        this.verificado = verificado;
    }

    public String getCodigoVerificacion(){
        return codigoVerificacion;
    }
    public void setCodigoVerificacion(String codigoVerificacion){
        this.codigoVerificacion = codigoVerificacion;
    }

    public Long getIdUsuarioPrincipal(){
        return idUsuarioPrincipal;
    }
    public void setIdUsuarioPrincipal(Long idUsuarioPrincipal){
        this.idUsuarioPrincipal = idUsuarioPrincipal;
    }
}