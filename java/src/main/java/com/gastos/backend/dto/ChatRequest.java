package com.gastos.backend.dto;

import java.util.List;

//Petición al chat FinBot: el mensaje nuevo, el historial previo y el contexto financiero del usuario
public record ChatRequest(
    String mensaje,
    List<MensajeChat> historial,
    ContextoFinanciero contexto
){}
