package com.gastos.backend.controller;

import com.gastos.backend.config.AuthUtils;
import com.gastos.backend.model.MetaUsuario;
import com.gastos.backend.repository.MetaUsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/metas-usuario")
public class MetaUsuarioController {

    private static final long MAX_METAS = 13;

    private final MetaUsuarioRepository metaUsuarioRepository;
    private final AuthUtils authUtils;

    public MetaUsuarioController(MetaUsuarioRepository metaUsuarioRepository, AuthUtils authUtils) {
        this.metaUsuarioRepository = metaUsuarioRepository;
        this.authUtils = authUtils;
    }

    @GetMapping
    public List<MetaUsuario> listar(@RequestParam(required = false) Long usuario) {
        Long id = usuario != null ? authUtils.verificarAcceso(usuario) : authUtils.idAutenticado();
        return metaUsuarioRepository.findByIdUsuarioOrderByOrdenAscIdMetaUsuarioAsc(id);
    }

    @PostMapping
    public ResponseEntity<MetaUsuario> crear(@RequestBody MetaUsuario meta) {
        Long idAuth = authUtils.idAutenticado();
        Long idUsuario = meta.getIdUsuario() != null ? authUtils.verificarAcceso(meta.getIdUsuario()) : idAuth;
        meta.setIdMetaUsuario(null);
        meta.setIdUsuario(idUsuario);

        String titulo = meta.getTitulo() == null ? "" : meta.getTitulo().trim();
        String descripcion = meta.getDescripcion() == null ? "" : meta.getDescripcion().trim();
        if (titulo.isEmpty() || titulo.length() > 50
                || descripcion.isEmpty() || descripcion.length() > 100) {
            return ResponseEntity.badRequest().build();
        }

        if (metaUsuarioRepository.countByIdUsuario(idUsuario) >= MAX_METAS) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        meta.setTitulo(titulo);
        meta.setDescripcion(descripcion);
        meta.setCompletado("N");
        int siguienteOrden = metaUsuarioRepository.findByIdUsuario(idUsuario).stream()
                .mapToInt(MetaUsuario::getOrden).max().orElse(0) + 1;
        meta.setOrden(siguienteOrden);
        return ResponseEntity.status(HttpStatus.CREATED).body(metaUsuarioRepository.save(meta));
    }

    @Transactional
    @PutMapping("/orden")
    public ResponseEntity<Void> reordenar(@RequestParam(required = false) Long usuario, @RequestBody List<Long> idsEnOrden) {
        Long id = usuario != null ? authUtils.verificarAcceso(usuario) : authUtils.idAutenticado();
        Map<Long, MetaUsuario> metasPorId = metaUsuarioRepository.findByIdUsuario(id).stream()
                .collect(Collectors.toMap(MetaUsuario::getIdMetaUsuario, Function.identity()));

        for (int i = 0; i < idsEnOrden.size(); i++) {
            MetaUsuario meta = metasPorId.get(idsEnOrden.get(i));
            if (meta != null) {
                meta.setOrden(i);
            }
        }
        metaUsuarioRepository.saveAll(metasPorId.values());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> borrar(@PathVariable Long id) {
        MetaUsuario meta = metaUsuarioRepository.findById(id).orElse(null);
        if (meta == null) {
            return ResponseEntity.notFound().build();
        }
        authUtils.verificarAcceso(meta.getIdUsuario());
        metaUsuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/completado")
    public ResponseEntity<MetaUsuario> cambiarCompletado(@PathVariable Long id, @RequestParam String valor) {
        if (!"S".equals(valor) && !"N".equals(valor)) {
            return ResponseEntity.badRequest().build();
        }
        return metaUsuarioRepository.findById(id)
                .map(meta -> {
                    authUtils.verificarAcceso(meta.getIdUsuario());
                    meta.setCompletado(valor);
                    return ResponseEntity.ok(metaUsuarioRepository.save(meta));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
