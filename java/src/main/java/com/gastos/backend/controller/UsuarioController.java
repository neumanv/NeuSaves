package com.gastos.backend.controller;

import com.gastos.backend.config.AuthUtils;
import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private static final long MAX_SUBUSUARIOS = 4;
    private final UsuarioRepository usuarioRepository;
    private final AuthUtils authUtils;

    public UsuarioController(UsuarioRepository usuarioRepository, AuthUtils authUtils) {
        this.usuarioRepository = usuarioRepository;
        this.authUtils = authUtils;
    }

    @GetMapping
    public List<Usuario> obtenerSubusuarios() {
        Long idAuth = authUtils.idAutenticado();
        return usuarioRepository.findByIdUsuarioPrincipal(idAuth);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> obtenerUsuario(@PathVariable Long id) {
        authUtils.verificarAcceso(id);
        return usuarioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Usuario> crearUsuario(@RequestBody Usuario usuario) {
        usuario.setIdUsuario(null);
        Long idAuth = authUtils.idAutenticado();
        usuario.setIdUsuarioPrincipal(idAuth);

        Usuario principal = usuarioRepository.findById(idAuth).orElse(null);
        if (principal == null || principal.getIdUsuarioPrincipal() != null || !principal.isVerificado()) {
            return ResponseEntity.badRequest().build();
        }

        if (usuarioRepository.countByIdUsuarioPrincipal(idAuth) >= MAX_SUBUSUARIOS) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        usuario.setEmail(null);
        usuario.setContrasena(null);
        usuario.setDni(null);
        usuario.setVerificado(false);
        usuario.setCodigoVerificacion(null);

        Usuario guardado = usuarioRepository.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizarUsuario(@PathVariable Long id, @RequestBody Usuario datos) {
        authUtils.verificarAcceso(id);
        Usuario usuario = usuarioRepository.findById(id).orElse(null);
        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        if (datos.getNombre() == null || datos.getNombre().isBlank()
                || datos.getApellido1() == null || datos.getApellido1().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        if (usuario.getIdUsuarioPrincipal() != null) {
            usuario.setNombre(datos.getNombre().trim());
            usuario.setApellido1(datos.getApellido1().trim());
            usuario.setApellido2(datos.getApellido2());
            usuario.setSexo(datos.getSexo());
            return ResponseEntity.ok(usuarioRepository.save(usuario));
        }

        usuario.setNombre(datos.getNombre().trim());
        usuario.setApellido1(datos.getApellido1().trim());
        usuario.setApellido2(datos.getApellido2());
        usuario.setPrefijo(datos.getPrefijo());
        usuario.setTelefono1(datos.getTelefono1());
        usuario.setTelefono2(datos.getTelefono2());
        usuario.setSexo(datos.getSexo());

        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> borrarUsuario(@PathVariable Long id) {
        authUtils.verificarAcceso(id);
        Usuario usuario = usuarioRepository.findById(id).orElse(null);
        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }
        if (usuario.getIdUsuarioPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
