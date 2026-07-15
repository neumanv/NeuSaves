package com.gastos.backend.controller;

import com.gastos.backend.dto.ChatRequest;
import com.gastos.backend.dto.ChatResponse;
import com.gastos.backend.service.ChatService;
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

    public ChatController(ChatService chatService){
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chatear(@RequestBody ChatRequest peticion){
        return new ChatResponse(chatService.responder(peticion));
    }
}
