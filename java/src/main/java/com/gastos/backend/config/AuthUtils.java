package com.gastos.backend.config;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AuthUtils {

    private final UsuarioRepository usuarioRepository;

    public AuthUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Long idAutenticado() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /**
     * Verifica que el usuario autenticado tiene derecho a operar sobre idObjetivo.
     * Se permite si idObjetivo == idAutenticado, o si idObjetivo es subusuario del autenticado.
     * Devuelve el idObjetivo validado; lanza 403 si no tiene acceso.
     */
    public Long verificarAcceso(Long idObjetivo) {
        Long idAuth = idAutenticado();
        if (idAuth.equals(idObjetivo)) {
            return idObjetivo;
        }
        Usuario objetivo = usuarioRepository.findById(idObjetivo).orElse(null);
        if (objetivo != null && idAuth.equals(objetivo.getIdUsuarioPrincipal())) {
            return idObjetivo;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
