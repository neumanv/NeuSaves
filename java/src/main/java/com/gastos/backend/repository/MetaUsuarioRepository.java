package com.gastos.backend.repository;

import com.gastos.backend.model.MetaUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MetaUsuarioRepository extends JpaRepository<MetaUsuario, Long>{

    //Metas de un usuario, las más recientes primero
    List<MetaUsuario> findByIdUsuarioOrderByIdMetaUsuarioDesc(Long idUsuario);
}