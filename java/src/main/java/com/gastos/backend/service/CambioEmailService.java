package com.gastos.backend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

//Gestiona los cambios de correo pendientes de confirmar por código.
//El email nuevo y el código se guardan solo en memoria y caducan a los 2 minutos: si el usuario
//no introduce el código a tiempo, el cambio se descarta y el correo de la cuenta no llega a tocarse.
@Service
public class CambioEmailService{

    //Tiempo que tiene el usuario para introducir el código antes de que el cambio caduque
    private static final Duration VALIDEZ = Duration.ofMinutes(2);

    public enum Estado{ OK, INCORRECTO, EXPIRADO, SIN_SOLICITUD }
    public record Resultado(Estado estado, String email){}

    private record Pendiente(String emailNuevo, String codigo, Instant expira){}

    private final Map<Long, Pendiente> pendientes = new ConcurrentHashMap<>();
    private final SecureRandom aleatorio = new SecureRandom();

    //Registra (o reemplaza) el cambio pendiente de un usuario y devuelve el código generado
    public String iniciar(Long idUsuario, String emailNuevo){
        String codigo = String.format("%05d", aleatorio.nextInt(100000));
        pendientes.put(idUsuario, new Pendiente(emailNuevo, codigo, Instant.now().plus(VALIDEZ)));
        return codigo;
    }

    //Comprueba el código: devuelve OK y el email nuevo solo si coincide y no ha caducado.
    //Consume la solicitud, de modo que un código sirve para una única confirmación.
    public Resultado confirmar(Long idUsuario, String codigo){
        Pendiente pendiente = pendientes.get(idUsuario);
        if (pendiente == null){
            return new Resultado(Estado.SIN_SOLICITUD, null);
        }
        //A los 2 minutos el cambio deja de ser válido: se descarta y no se actualiza el correo
        if (Instant.now().isAfter(pendiente.expira())){
            pendientes.remove(idUsuario);
            return new Resultado(Estado.EXPIRADO, null);
        }
        if (!pendiente.codigo().equals(codigo)){
            return new Resultado(Estado.INCORRECTO, null);
        }
        pendientes.remove(idUsuario);
        return new Resultado(Estado.OK, pendiente.emailNuevo());
    }

    //Descarta un cambio pendiente (por ejemplo, si el usuario cierra el diálogo de confirmación)
    public void cancelar(Long idUsuario){
        pendientes.remove(idUsuario);
    }
}
