package com.gastos.backend.controller;

import com.gastos.backend.dto.ChatRequest;
import com.gastos.backend.dto.ChatResponse;
import com.gastos.backend.service.ChatService;
import com.gastos.backend.service.LimitadorPeticiones;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

//Chat FinBot: asistente de finanzas personales del panel de usuario
@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4300"})
public class ChatController{

    private final ChatService chatService;
    private final LimitadorPeticiones limitador;

    public ChatController(ChatService chatService, LimitadorPeticiones limitador){
        this.chatService = chatService;
        this.limitador = limitador;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chatear(@RequestBody ChatRequest peticion, HttpServletRequest solicitud){
        //Protege la cuota de Groq frente al abuso: cada IP tiene un máximo de peticiones por ventana
        if (!limitador.permitir(ipCliente(solicitud))){
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ChatResponse("Has enviado demasiados mensajes seguidos. Espera un momento y vuelve a intentarlo."));
        }
        return ResponseEntity.ok(new ChatResponse(chatService.responder(peticion)));
    }

    //IP real del cliente: detrás de un proxy/nginx llega en la cabecera X-Forwarded-For (primera IP)
    private String ipCliente(HttpServletRequest solicitud){
        String reenviada = solicitud.getHeader("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank()){
            return reenviada.split(",")[0].trim();
        }
        return solicitud.getRemoteAddr();
    }
}
