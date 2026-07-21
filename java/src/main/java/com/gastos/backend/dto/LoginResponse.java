package com.gastos.backend.dto;

import com.gastos.backend.model.Usuario;

public record LoginResponse(String token, Usuario usuario) {}
