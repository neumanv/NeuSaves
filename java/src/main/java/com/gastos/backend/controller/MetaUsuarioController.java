package com.gastos.backend.controller;

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
public class MetaUsuarioController{

    //Número máximo de metas que puede tener un usuario
    private static final long MAX_METAS = 13;

    private final MetaUsuarioRepository metaUsuarioRepository;

    public MetaUsuarioController(MetaUsuarioRepository metaUsuarioRepository){
        this.metaUsuarioRepository = metaUsuarioRepository;
    }

    @GetMapping
    public List<MetaUsuario> listar(@RequestParam Long usuario){
        return metaUsuarioRepository.findByIdUsuarioOrderByOrdenAscIdMetaUsuarioAsc(usuario);
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

        //No se permite superar el máximo de metas por usuario
        if (metaUsuarioRepository.countByIdUsuario(meta.getIdUsuario()) >= MAX_METAS){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        meta.setTitulo(titulo);
        meta.setDescripcion(descripcion);
        meta.setCompletado("N");
        //La nueva meta se coloca al final de la lista
        int siguienteOrden = metaUsuarioRepository.findByIdUsuario(meta.getIdUsuario()).stream()
                .mapToInt(MetaUsuario::getOrden).max().orElse(0) + 1;
        meta.setOrden(siguienteOrden);
        return ResponseEntity.status(HttpStatus.CREATED).body(metaUsuarioRepository.save(meta));
    }

    //Reordena las metas del usuario: recibe los ids en el nuevo orden y actualiza la columna 'orden'
    @Transactional
    @PutMapping("/orden")
    public ResponseEntity<Void> reordenar(@RequestParam Long usuario, @RequestBody List<Long> idsEnOrden){
        Map<Long, MetaUsuario> metasPorId = metaUsuarioRepository.findByIdUsuario(usuario).stream()
                .collect(Collectors.toMap(MetaUsuario::getIdMetaUsuario, Function.identity()));

        for (int i = 0; i < idsEnOrden.size(); i++){
            //Solo se actualizan las metas que realmente pertenecen al usuario
            MetaUsuario meta = metasPorId.get(idsEnOrden.get(i));
            if (meta != null){
                meta.setOrden(i);
            }
        }
        metaUsuarioRepository.saveAll(metasPorId.values());
        return ResponseEntity.noContent().build();
    }

    //Borra una meta por su id
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> borrar(@PathVariable Long id){
        if (!metaUsuarioRepository.existsById(id)){
            return ResponseEntity.notFound().build();
        }
        metaUsuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
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