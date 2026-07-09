package com.gastos.backend.repository;

import com.gastos.backend.model.MetaUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MetaUsuarioRepository extends JpaRepository<MetaUsuario, Long>{
    List<MetaUsuario> findByIdUsuarioOrderByOrdenAscIdMetaUsuarioAsc(Long idUsuario);
    List<MetaUsuario> findByIdUsuario(Long idUsuario);
    long countByIdUsuario(Long idUsuario);
}