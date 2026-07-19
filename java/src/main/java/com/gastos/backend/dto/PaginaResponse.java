package com.gastos.backend.dto;

import java.util.List;

public record PaginaResponse<T>(
    List<T> contenido,
    int totalPaginas,
    long totalElementos,
    int pagina
) {}
