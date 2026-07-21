package com.gastos.backend.service;

import com.gastos.backend.config.JwtService;
import com.gastos.backend.dto.LoginResponse;
import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class AuthService {

    private static final String REGEX_EMAIL = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    private final UsuarioRepository usuarioRepository;
    private final CorreoService correoService;
    private final CambioEmailService cambioEmailService;
    private final JwtService jwtService;
    private final SecureRandom aleatorio = new SecureRandom();
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UsuarioRepository usuarioRepository, CorreoService correoService,
                       CambioEmailService cambioEmailService, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.correoService = correoService;
        this.cambioEmailService = cambioEmailService;
        this.jwtService = jwtService;
    }

    @Transactional
    public ResponseEntity<Usuario> registrar(Usuario usuario) {
        usuario.setIdUsuario(null);
        usuario.setIdUsuarioPrincipal(null);

        String email = usuario.getEmail() == null ? "" : usuario.getEmail().trim();
        if (email.isEmpty() || email.length() > 50 || !email.matches(REGEX_EMAIL)) {
            return ResponseEntity.badRequest().build();
        }
        usuario.setEmail(email);

        String contrasena = usuario.getContrasena() == null ? "" : usuario.getContrasena();
        if (contrasena.isBlank() || contrasena.length() > 20) {
            return ResponseEntity.badRequest().build();
        }

        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String dni = usuario.getDni() == null ? "" : usuario.getDni().trim();
        if (dni.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (usuarioRepository.existsByDniIgnoreCase(dni)) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build();
        }
        usuario.setDni(dni);

        usuario.setVerificado(false);
        usuario.setCodigoVerificacion(generarCodigo());
        usuario.setContrasena(encoder.encode(contrasena));

        Usuario guardado;
        try {
            guardado = usuarioRepository.save(usuario);
        } catch (DataIntegrityViolationException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
            if (msg.contains("dni")) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build();
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        correoService.enviarCodigoVerificacion(guardado.getEmail(), guardado.getCodigoVerificacion());
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    public ResponseEntity<LoginResponse> login(String email, String contrasena) {
        email = email == null ? "" : email.trim();
        contrasena = contrasena == null ? "" : contrasena;

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null || usuario.getContrasena() == null || !encoder.matches(contrasena, usuario.getContrasena())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!usuario.isVerificado()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String token = jwtService.generarToken(usuario.getIdUsuario());
        return ResponseEntity.ok(new LoginResponse(token, usuario));
    }

    @Transactional
    public ResponseEntity<Usuario> verificar(String email, String codigo) {
        email = email == null ? "" : email.trim();
        codigo = codigo == null ? "" : codigo.trim();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null || usuario.getCodigoVerificacion() == null || !usuario.getCodigoVerificacion().equals(codigo)) {
            return ResponseEntity.badRequest().build();
        }

        usuario.setVerificado(true);
        usuario.setCodigoVerificacion(null);
        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    @Transactional
    public ResponseEntity<Void> reenviar(String email) {
        email = email == null ? "" : email.trim();

        String finalEmail = email;
        usuarioRepository.findByEmailIgnoreCase(finalEmail)
                .filter(usuario -> !usuario.isVerificado())
                .ifPresent(usuario -> {
                    usuario.setCodigoVerificacion(generarCodigo());
                    usuarioRepository.save(usuario);
                    correoService.enviarCodigoVerificacion(usuario.getEmail(), usuario.getCodigoVerificacion());
                });
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> recuperarContrasena(String email) {
        email = email == null ? "" : email.trim();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null || usuario.getEmail() == null) {
            return ResponseEntity.notFound().build();
        }

        String nuevaContrasena = generarContrasena();
        usuario.setContrasena(encoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
        correoService.enviarNuevaContrasena(usuario.getEmail(), nuevaContrasena);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> cambiarContrasena(Long idUsuario, String contrasenaActual, String contrasenaNueva) {
        contrasenaNueva = contrasenaNueva == null ? "" : contrasenaNueva;
        if (idUsuario == null || contrasenaNueva.isBlank() || contrasenaNueva.length() > 20) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
        if (usuario == null || usuario.getContrasena() == null) {
            return ResponseEntity.notFound().build();
        }

        contrasenaActual = contrasenaActual == null ? "" : contrasenaActual;
        if (!encoder.matches(contrasenaActual, usuario.getContrasena())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        usuario.setContrasena(encoder.encode(contrasenaNueva));
        usuarioRepository.save(usuario);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> solicitarCambioEmail(Long idUsuario, String email) {
        if (idUsuario == null) {
            return ResponseEntity.badRequest().build();
        }
        email = email == null ? "" : email.trim();
        if (email.isEmpty() || email.length() > 50 || !email.matches(REGEX_EMAIL)) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
        if (usuario == null || usuario.getIdUsuarioPrincipal() != null) {
            return ResponseEntity.badRequest().build();
        }
        if (email.equalsIgnoreCase(usuario.getEmail())) {
            return ResponseEntity.badRequest().build();
        }
        Usuario existente = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existente != null && !existente.getIdUsuario().equals(idUsuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String codigo = cambioEmailService.iniciar(idUsuario, email);
        correoService.enviarCodigoCambioEmail(email, codigo);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Usuario> confirmarCambioEmail(Long idUsuario, String codigo) {
        if (idUsuario == null) {
            return ResponseEntity.badRequest().build();
        }
        codigo = codigo == null ? "" : codigo.trim();

        CambioEmailService.Resultado resultado = cambioEmailService.confirmar(idUsuario, codigo);
        switch (resultado.estado()) {
            case EXPIRADO:
                return ResponseEntity.status(HttpStatus.GONE).build();
            case INCORRECTO:
            case SIN_SOLICITUD:
                return ResponseEntity.badRequest().build();
            default:
                break;
        }

        Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }
        Usuario existente = usuarioRepository.findByEmailIgnoreCase(resultado.email()).orElse(null);
        if (existente != null && !existente.getIdUsuario().equals(idUsuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        usuario.setEmail(resultado.email());
        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    public void cancelarCambioEmail(Long idUsuario) {
        if (idUsuario != null) {
            cambioEmailService.cancelar(idUsuario);
        }
    }

    private String generarCodigo() {
        return String.format("%05d", aleatorio.nextInt(100000));
    }

    private String generarContrasena() {
        final String caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(caracteres.charAt(aleatorio.nextInt(caracteres.length())));
        }
        return sb.toString();
    }
}
