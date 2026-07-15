package com.gastos.backend.dto;

//Un mensaje del chat FinBot. rol = "user" (usuario) o "model" (asistente)
public record MensajeChat(
    String rol,
    String texto
){}
