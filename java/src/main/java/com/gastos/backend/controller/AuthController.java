package com.gastos.backend.controller;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record CredencialesLogin(String email, String contrasena) {}
    public record PeticionVerificacion(String email, String codigo) {}
    public record PeticionReenvio(String email) {}
    public record PeticionCambioContrasena(Long idUsuario, String contrasenaActual, String contrasenaNueva) {}
    public record PeticionCambioEmail(Long idUsuario, String email) {}
    public record ConfirmacionCambioEmail(Long idUsuario, String codigo) {}

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    public ResponseEntity<Usuario> registrar(@RequestBody Usuario usuario) {
        return authService.registrar(usuario);
    }

    @PostMapping("/login")
    public ResponseEntity<Usuario> login(@RequestBody CredencialesLogin credenciales) {
        return authService.login(credenciales.email(), credenciales.contrasena());
    }

    @PostMapping("/verificar")
    public ResponseEntity<Usuario> verificar(@RequestBody PeticionVerificacion peticion) {
        return authService.verificar(peticion.email(), peticion.codigo());
    }

    @PostMapping("/reenviar")
    public ResponseEntity<Void> reenviar(@RequestBody PeticionReenvio peticion) {
        return authService.reenviar(peticion.email());
    }

    @PostMapping("/recuperar")
    public ResponseEntity<Void> recuperarContrasena(@RequestBody PeticionReenvio peticion) {
        return authService.recuperarContrasena(peticion.email());
    }

    @PostMapping("/cambiar-contrasena")
    public ResponseEntity<Void> cambiarContrasena(@RequestBody PeticionCambioContrasena peticion) {
        return authService.cambiarContrasena(peticion.idUsuario(), peticion.contrasenaActual(), peticion.contrasenaNueva());
    }

    @PostMapping("/cambiar-email/solicitar")
    public ResponseEntity<Void> solicitarCambioEmail(@RequestBody PeticionCambioEmail peticion) {
        return authService.solicitarCambioEmail(peticion.idUsuario(), peticion.email());
    }

    @PostMapping("/cambiar-email/confirmar")
    public ResponseEntity<Usuario> confirmarCambioEmail(@RequestBody ConfirmacionCambioEmail confirmacion) {
        return authService.confirmarCambioEmail(confirmacion.idUsuario(), confirmacion.codigo());
    }

    @PostMapping("/cambiar-email/cancelar")
    public ResponseEntity<Void> cancelarCambioEmail(@RequestBody ConfirmacionCambioEmail confirmacion) {
        authService.cancelarCambioEmail(confirmacion.idUsuario());
        return ResponseEntity.noContent().build();
    }
}
