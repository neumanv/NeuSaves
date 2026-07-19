package com.gastos.backend.controller;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import com.gastos.backend.repository.UsuarioRepository;
import com.gastos.backend.service.ExportacionExcelService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

//Exportación de cuentas a Excel: solo la puede pedir el usuario principal e incluye
//una hoja por cada usuario (él mismo y sus subusuarios)
@RestController
@RequestMapping("/api/exportaciones")
public class ExportacionController{

    private final UsuarioRepository usuarioRepository;
    private final MovimientoUsuarioRepository movimientoUsuarioRepository;
    private final ExportacionExcelService exportacionExcelService;

    public ExportacionController(UsuarioRepository usuarioRepository,
                                 MovimientoUsuarioRepository movimientoUsuarioRepository,
                                 ExportacionExcelService exportacionExcelService){
        this.usuarioRepository = usuarioRepository;
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
        this.exportacionExcelService = exportacionExcelService;
    }

    //Años con algún movimiento del principal o de sus subusuarios, los más recientes primero,
    //para el desplegable de la ventana de "Descargar cuentas"
    @GetMapping("/anios")
    public ResponseEntity<List<Integer>> anios(@RequestParam Long principal){
        Usuario usuario = buscarPrincipal(principal);
        if (usuario == null){
            return ResponseEntity.badRequest().build();
        }
        TreeSet<Integer> anios = new TreeSet<>(Comparator.reverseOrder());
        anios.addAll(movimientoUsuarioRepository.aniosConMovimientos(usuario.getIdUsuario()));
        for (Usuario subusuario : usuarioRepository.findByIdUsuarioPrincipal(usuario.getIdUsuario())){
            anios.addAll(movimientoUsuarioRepository.aniosConMovimientos(subusuario.getIdUsuario()));
        }
        return ResponseEntity.ok(new ArrayList<>(anios));
    }

    //Excel con las cuentas de un año: resumen y movimientos del principal y de cada subusuario
    @GetMapping("/excel")
    public ResponseEntity<byte[]> excel(@RequestParam Long principal, @RequestParam int anio) throws IOException{
        Usuario usuario = buscarPrincipal(principal);
        if (usuario == null){
            return ResponseEntity.badRequest().build();
        }
        List<Usuario> subusuarios = usuarioRepository.findByIdUsuarioPrincipal(usuario.getIdUsuario());
        byte[] excel = exportacionExcelService.generarCuentasAnuales(usuario, subusuarios, anio);

        HttpHeaders cabeceras = new HttpHeaders();
        cabeceras.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        cabeceras.setContentDisposition(ContentDisposition.attachment()
                .filename("NeuSaves_cuentas_" + anio + ".xlsx")
                .build());
        return ResponseEntity.ok().headers(cabeceras).body(excel);
    }

    //La exportación solo tiene sentido para un usuario principal (sin id_usuario_principal)
    private Usuario buscarPrincipal(Long id){
        Usuario usuario = usuarioRepository.findById(id).orElse(null);
        if (usuario == null || usuario.getIdUsuarioPrincipal() != null){
            return null;
        }
        return usuario;
    }
}
