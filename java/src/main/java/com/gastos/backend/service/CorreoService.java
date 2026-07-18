package com.gastos.backend.service;

import com.gastos.backend.model.Movimiento;
import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.MovimientoRepository;
import com.gastos.backend.repository.PeriodoRepository;
import com.gastos.backend.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class CorreoService{

    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);

    private final JavaMailSender remitente;
    private final UsuarioRepository usuarioRepository;
    private final MovimientoRepository movimientoRepository;
    private final PeriodoRepository periodoRepository;

    public CorreoService(JavaMailSender remitente,
                         UsuarioRepository usuarioRepository,
                         MovimientoRepository movimientoRepository,
                         PeriodoRepository periodoRepository){
        this.remitente = remitente;
        this.usuarioRepository = usuarioRepository;
        this.movimientoRepository = movimientoRepository;
        this.periodoRepository = periodoRepository;
    }

    public void enviarCodigoVerificacion(String email, String codigo){
        //Ayuda de desarrollo: si no hay servidor de correo, el código puede verse en el log
        log.info("Código de verificación para {}: {}", email, codigo);

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom("no-reply@neusaves.local");
        mensaje.setTo(email);
        mensaje.setSubject("Tu código de verificación de NeuSaves");
        mensaje.setText("Hola,\n\nTu código de verificación es: " + codigo
                + "\n\nIntrodúcelo en la pantalla de inicio de sesión para activar tu cuenta.\n\nNeuSaves");
        try{
            remitente.send(mensaje);
        }catch (MailException e){
            //No se corta el registro: el usuario puede pedir el reenvío del código
            log.error("No se pudo enviar el correo de verificación a {}: {}", email, e.getMessage());
        }
    }

    //Envía al correo NUEVO el código para confirmar un cambio de email desde el perfil
    public void enviarCodigoCambioEmail(String email, String codigo){
        //Ayuda de desarrollo: si no hay servidor de correo, el código puede verse en el log
        log.info("Código de cambio de email para {}: {}", email, codigo);

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom("no-reply@neusaves.local");
        mensaje.setTo(email);
        mensaje.setSubject("Confirma tu nuevo correo en NeuSaves");
        mensaje.setText("Hola,\n\nHas solicitado usar esta dirección como correo de tu cuenta de NeuSaves.\n\n"
                + "Tu código de confirmación es: " + codigo
                + "\n\nIntrodúcelo en los próximos 2 minutos para completar el cambio. "
                + "Si no lo haces, tu correo seguirá siendo el actual.\n\nNeuSaves");
        try{
            remitente.send(mensaje);
        }catch (MailException e){
            log.error("No se pudo enviar el código de cambio de email a {}: {}", email, e.getMessage());
        }
    }

    public void enviarNuevaContrasena(String email, String contrasena){
        log.info("Nueva contraseña para {}: {}", email, contrasena);

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom("no-reply@neusaves.local");
        mensaje.setTo(email);
        mensaje.setSubject("Tu nueva contraseña de NeuSaves");
        mensaje.setText("Hola,\n\nTu nueva contraseña es: " + contrasena
                + "\n\nÚsala para iniciar sesión. Te recomendamos cambiarla en cuanto entres.\n\nNeuSaves");
        try{
            remitente.send(mensaje);
        }catch (MailException e){
            log.error("No se pudo enviar la nueva contraseña a {}: {}", email, e.getMessage());
        }
    }

    //Avisa al usuario principal de un movimiento puntual recién creado (no periódico)
    public void avisarMovimiento(MovimientoUsuario movimiento){
        avisarMovimiento(movimiento, movimiento.getIdPeriodo(), movimiento.getFechaFinMovimiento());
    }

    //Avisa al usuario principal de un cobro generado por un movimiento periódico.
    //El cobro en sí no lleva el periodo ni la fecha fin (solo mueve dinero); esos datos
    //se toman de su plantilla para poder indicar que es periódico y cuándo termina.
    public void avisarMovimiento(MovimientoUsuario cobro, MovimientoUsuario plantilla){
        avisarMovimiento(cobro, plantilla.getIdPeriodo(), plantilla.getFechaFinMovimiento());
    }

    //Busca al autor, sube a su usuario principal si es un subusuario (los subusuarios no tienen email),
    //determina si es gasto o ingreso a partir del catálogo de tipos y, si es periódico, el nombre del periodo
    private void avisarMovimiento(MovimientoUsuario movimiento, Long idPeriodo, LocalDate fechaFin){
        Usuario autor = usuarioRepository.findById(movimiento.getIdUsuario()).orElse(null);
        if (autor == null){
            return;
        }
        Usuario principal = autor.getIdUsuarioPrincipal() != null
                ? usuarioRepository.findById(autor.getIdUsuarioPrincipal()).orElse(null)
                : autor;
        if (principal == null || principal.getEmail() == null){
            return;
        }
        Movimiento tipo = movimientoRepository.findById(movimiento.getIdMovimiento()).orElse(null);
        boolean esGasto = tipo != null && "S".equals(tipo.getGasto());
        String nombrePeriodo = idPeriodo != null
                ? periodoRepository.findById(idPeriodo).map(p -> p.getPeriodo()).orElse(null)
                : null;
        String nombreAutor = autor.getNombre() + " " + autor.getApellido1();
        enviarAvisoMovimiento(principal.getEmail(), nombreAutor, esGasto,
                movimiento.getCantidad(), movimiento.getFechaMovimiento(), nombrePeriodo, fechaFin);
    }

    //Avisa al usuario principal de que se ha añadido un ingreso o un gasto, sea desde su propio
    //perfil o desde el de uno de sus subusuarios. Si nombrePeriodo no es null, el movimiento es periódico:
    //se indica la periodicidad y, si la hay, la fecha en la que deja de cobrarse
    public void enviarAvisoMovimiento(String email, String nombreAutor, boolean esGasto, BigDecimal cantidad,
                                      LocalDate fecha, String nombrePeriodo, LocalDate fechaFin){
        String tipo = esGasto ? "gasto" : "ingreso";
        String fechaTexto = fecha != null ? fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "-";
        log.info("Aviso de {} de {} para {}: {}", tipo, cantidad, email, fechaTexto);

        StringBuilder texto = new StringBuilder("Hola,\n\n")
                .append(nombreAutor).append(" ha registrado un nuevo ").append(tipo)
                .append(" de ").append(cantidad).append(" € el ").append(fechaTexto);
        if (nombrePeriodo != null){
            texto.append(".\n\nEs un movimiento periódico (").append(nombrePeriodo).append(")");
            if (fechaFin != null){
                texto.append(" que termina el ").append(fechaFin.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            }else{
                texto.append(" sin fecha de fin");
            }
        }
        texto.append(".\n\nNeuSaves");

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom("no-reply@neusaves.local");
        mensaje.setTo(email);
        mensaje.setSubject((nombrePeriodo != null ? "Nuevo " + tipo + " periódico" : "Nuevo " + tipo) + " registrado en NeuSaves");
        mensaje.setText(texto.toString());
        try{
            remitente.send(mensaje);
        }catch (MailException e){
            log.error("No se pudo enviar el aviso de movimiento a {}: {}", email, e.getMessage());
        }
    }
}