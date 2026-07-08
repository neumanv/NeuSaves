package com.gastos.backend.controller;

import com.gastos.backend.model.MetaUsuario;
import com.gastos.backend.repository.MetaUsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metas-usuario")
@CrossOrigin(origins = "http://localhost:4200")
public class MetaUsuarioController{

    private final MetaUsuarioRepository metaUsuarioRepository;

    public MetaUsuarioController(MetaUsuarioRepository metaUsuarioRepository){
        this.metaUsuarioRepository = metaUsuarioRepository;
    }

    @GetMapping
    public List<MetaUsuario> listar(@RequestParam Long usuario){
        return metaUsuarioRepository.findByIdUsuarioOrderByIdMetaUsuarioDesc(usuario);
    }

    @PostMapping
    public ResponseEntity<MetaUsuario> crear(@RequestBody MetaUsuario meta){
        meta.setIdMetaUsuario(null);

        String titulo = meta.getTitulo() == null ? "" : meta.getTitulo().trim();
        String descripcion = meta.getDescripcion() == null ? "" : meta.getDescripcion().trim();
        if (meta.getIdUsuario() == null || titulo.isEmpty() || titulo.length() > 50
                || descripcion.isEmpty() || descripcion.length() > 100){
            return ResponseEntity.badRequest().build();
        }

        meta.setTitulo(titulo);
        meta.setDescripcion(descripcion);
        meta.setCompletado("N");
        return ResponseEntity.status(HttpStatus.CREATED).body(metaUsuarioRepository.save(meta));
    }

    @PatchMapping("/{id}/completado")
    public ResponseEntity<MetaUsuario> cambiarCompletado(@PathVariable Long id, @RequestParam String valor){
        if (!"S".equals(valor) && !"N".equals(valor)){
            return ResponseEntity.badRequest().build();
        }
        return metaUsuarioRepository.findById(id)
                .map(meta ->{
                    meta.setCompletado(valor);
                    return ResponseEntity.ok(metaUsuarioRepository.save(meta));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}