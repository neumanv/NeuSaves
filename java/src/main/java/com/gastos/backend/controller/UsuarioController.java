package com.gastos.backend.controller;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class UsuarioController{

    private static final long MAX_SUBUSUARIOS = 4;
    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioRepository usuarioRepository){
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public List<Usuario> obtenerUsuarios(@RequestParam(required = false) Long principal){
        if (principal != null){
            return usuarioRepository.findByIdUsuarioPrincipal(principal);
        }
        return usuarioRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Usuario> crearUsuario(@RequestBody Usuario usuario){
        usuario.setIdUsuario(null);

        Long idUsuarioPrincipal = usuario.getIdUsuarioPrincipal();
        if (idUsuarioPrincipal == null){
            return ResponseEntity.badRequest().build();
        }

        Usuario principal = usuarioRepository.findById(idUsuarioPrincipal).orElse(null);
        if (principal == null || principal.getIdUsuarioPrincipal() != null || !principal.isVerificado()){
            return ResponseEntity.badRequest().build();
        }

        if (usuarioRepository.countByIdUsuarioPrincipal(idUsuarioPrincipal) >= MAX_SUBUSUARIOS){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        usuario.setEmail(null);
        usuario.setContrasena(null);
        usuario.setVerificado(false);
        usuario.setCodigoVerificacion(null);

        Usuario guardado = usuarioRepository.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> borrarUsuario(@PathVariable Long id){
        Usuario usuario = usuarioRepository.findById(id).orElse(null);
        if (usuario == null){
            return ResponseEntity.notFound().build();
        }
        if (usuario.getIdUsuarioPrincipal() == null){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
