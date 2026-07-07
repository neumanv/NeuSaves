package com.gastos.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class CorreoService{

    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);

    private final JavaMailSender remitente;

    public CorreoService(JavaMailSender remitente){
        this.remitente = remitente;
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
}
