package com.gastos.backend.controller;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import com.gastos.backend.service.CorreoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController{

    public record CredencialesLogin(String email, String contrasena){}
    public record PeticionVerificacion(String email, String codigo){}
    public record PeticionReenvio(String email){}

    private final UsuarioRepository usuarioRepository;
    private final CorreoService correoService;
    private final SecureRandom aleatorio = new SecureRandom();
    //Cifra las contraseñas con BCrypt (incluye salt automática, hash de 60 caracteres)
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UsuarioRepository usuarioRepository, CorreoService correoService){
        this.usuarioRepository = usuarioRepository;
        this.correoService = correoService;
    }

    //Registro de un superusuario: queda sin verificar hasta introducir el código del correo
    @PostMapping("/registro")
    public ResponseEntity<Usuario> registrar(@RequestBody Usuario usuario){
        usuario.setIdUsuario(null);
        usuario.setIdUsuarioPrincipal(null);

        //Email obligatorio, con formato válido y máximo 50 caracteres
        String email = usuario.getEmail() == null ? "" : usuario.getEmail().trim();
        if (email.isEmpty() || email.length() > 50 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")){
            return ResponseEntity.badRequest().build();
        }
        usuario.setEmail(email);

        //Contraseña obligatoria y máximo 20 caracteres
        String contrasena = usuario.getContrasena() == null ? "" : usuario.getContrasena();
        if (contrasena.isBlank() || contrasena.length() > 20){
            return ResponseEntity.badRequest().build();
        }

        if (usuarioRepository.existsByEmailIgnoreCase(email)){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        usuario.setVerificado(false);
        usuario.setCodigoVerificacion(generarCodigo());
        //Nunca se guarda la contraseña en claro: se cifra con BCrypt
        usuario.setContrasena(encoder.encode(contrasena));

        Usuario guardado = usuarioRepository.save(usuario);
        correoService.enviarCodigoVerificacion(guardado.getEmail(), guardado.getCodigoVerificacion());
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    //Inicio de sesión: 401 si las credenciales fallan, 403 si la cuenta aún no está verificada
    @PostMapping("/login")
    public ResponseEntity<Usuario> login(@RequestBody CredencialesLogin credenciales){
        String email = credenciales.email() == null ? "" : credenciales.email().trim();
        String contrasena = credenciales.contrasena() == null ? "" : credenciales.contrasena();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        //Compara la contraseña recibida contra el hash BCrypt guardado
        if (usuario == null || usuario.getContrasena() == null || !encoder.matches(contrasena, usuario.getContrasena())){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!usuario.isVerificado()){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(usuario);
    }

    //Verificación del código de 5 números enviado por correo
    @PostMapping("/verificar")
    public ResponseEntity<Usuario> verificar(@RequestBody PeticionVerificacion peticion){
        String email = peticion.email() == null ? "" : peticion.email().trim();
        String codigo = peticion.codigo() == null ? "" : peticion.codigo().trim();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null || usuario.getCodigoVerificacion() == null || !usuario.getCodigoVerificacion().equals(codigo)){
            return ResponseEntity.badRequest().build();
        }

        usuario.setVerificado(true);
        usuario.setCodigoVerificacion(null);
        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    //Reenvía un código nuevo. Responde siempre 204 para no revelar si el email existe
    @PostMapping("/reenviar")
    public ResponseEntity<Void> reenviar(@RequestBody PeticionReenvio peticion){
        String email = peticion.email() == null ? "" : peticion.email().trim();

        usuarioRepository.findByEmailIgnoreCase(email)
                .filter(usuario -> !usuario.isVerificado())
                .ifPresent(usuario ->{
                    usuario.setCodigoVerificacion(generarCodigo());
                    usuarioRepository.save(usuario);
                    correoService.enviarCodigoVerificacion(usuario.getEmail(), usuario.getCodigoVerificacion());
                });
        return ResponseEntity.noContent().build();
    }

    //Código de 5 números (puede empezar por cero)
    private String generarCodigo(){
        return String.format("%05d", aleatorio.nextInt(100000));
    }
}
