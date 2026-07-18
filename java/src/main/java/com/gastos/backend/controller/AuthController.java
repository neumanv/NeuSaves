package com.gastos.backend.controller;

import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.UsuarioRepository;
import com.gastos.backend.service.CambioEmailService;
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
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4300"})
public class AuthController{

    //Formato de email admitido (mismo que en el registro y en la edición de perfil)
    private static final String REGEX_EMAIL = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    public record CredencialesLogin(String email, String contrasena){}
    public record PeticionVerificacion(String email, String codigo){}
    public record PeticionReenvio(String email){}
    public record PeticionCambioContrasena(Long idUsuario, String contrasenaActual, String contrasenaNueva){}
    public record PeticionCambioEmail(Long idUsuario, String email){}
    public record ConfirmacionCambioEmail(Long idUsuario, String codigo){}

    private final UsuarioRepository usuarioRepository;
    private final CorreoService correoService;
    private final CambioEmailService cambioEmailService;
    private final SecureRandom aleatorio = new SecureRandom();
    //Cifra las contraseñas con BCrypt (incluye salt automática, hash de 60 caracteres)
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UsuarioRepository usuarioRepository, CorreoService correoService,
                         CambioEmailService cambioEmailService){
        this.usuarioRepository = usuarioRepository;
        this.correoService = correoService;
        this.cambioEmailService = cambioEmailService;
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

    //Recuperación de contraseña: si el email existe se genera una nueva y se envía por correo.
    //Si no existe responde 404 para avisar por pantalla.
    @PostMapping("/recuperar")
    public ResponseEntity<Void> recuperarContrasena(@RequestBody PeticionReenvio peticion){
        String email = peticion.email() == null ? "" : peticion.email().trim();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null || usuario.getEmail() == null){
            return ResponseEntity.notFound().build();
        }

        String nuevaContrasena = generarContrasena();
        usuario.setContrasena(encoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
        correoService.enviarNuevaContrasena(usuario.getEmail(), nuevaContrasena);
        return ResponseEntity.noContent().build();
    }

    //Cambio de contraseña desde el perfil: la actual debe coincidir con la guardada (401 si no)
    @PostMapping("/cambiar-contrasena")
    public ResponseEntity<Void> cambiarContrasena(@RequestBody PeticionCambioContrasena peticion){
        String nueva = peticion.contrasenaNueva() == null ? "" : peticion.contrasenaNueva();
        if (peticion.idUsuario() == null || nueva.isBlank() || nueva.length() > 20){
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioRepository.findById(peticion.idUsuario()).orElse(null);
        if (usuario == null || usuario.getContrasena() == null){
            return ResponseEntity.notFound().build();
        }

        String actual = peticion.contrasenaActual() == null ? "" : peticion.contrasenaActual();
        if (!encoder.matches(actual, usuario.getContrasena())){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        usuario.setContrasena(encoder.encode(nueva));
        usuarioRepository.save(usuario);
        return ResponseEntity.noContent().build();
    }

    //--- Cambio de email desde el perfil (solo usuarios principales) ---
    //Paso 1: comprueba que el correo nuevo no esté en uso y envía un código de confirmación a ESE correo.
    //El correo de la cuenta NO se cambia todavía: solo se guarda como pendiente durante 2 minutos.
    @PostMapping("/cambiar-email/solicitar")
    public ResponseEntity<Void> solicitarCambioEmail(@RequestBody PeticionCambioEmail peticion){
        if (peticion.idUsuario() == null){
            return ResponseEntity.badRequest().build();
        }
        String email = peticion.email() == null ? "" : peticion.email().trim();
        if (email.isEmpty() || email.length() > 50 || !email.matches(REGEX_EMAIL)){
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioRepository.findById(peticion.idUsuario()).orElse(null);
        //Solo los usuarios principales tienen correo; un subusuario no puede cambiarlo
        if (usuario == null || usuario.getIdUsuarioPrincipal() != null){
            return ResponseEntity.badRequest().build();
        }
        //Si el correo nuevo coincide con el actual no hay nada que confirmar
        if (email.equalsIgnoreCase(usuario.getEmail())){
            return ResponseEntity.badRequest().build();
        }
        //El correo nuevo no puede pertenecer ya a otra cuenta
        Usuario existente = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existente != null && !existente.getIdUsuario().equals(peticion.idUsuario())){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        String codigo = cambioEmailService.iniciar(peticion.idUsuario(), email);
        correoService.enviarCodigoCambioEmail(email, codigo);
        return ResponseEntity.noContent().build();
    }

    //Paso 2: valida el código. Solo si es correcto y no han pasado los 2 minutos se cambia el correo.
    //400 código incorrecto, 410 tiempo agotado, 409 el correo lo ha ocupado otra cuenta entretanto.
    @PostMapping("/cambiar-email/confirmar")
    public ResponseEntity<Usuario> confirmarCambioEmail(@RequestBody ConfirmacionCambioEmail confirmacion){
        if (confirmacion.idUsuario() == null){
            return ResponseEntity.badRequest().build();
        }
        String codigo = confirmacion.codigo() == null ? "" : confirmacion.codigo().trim();

        CambioEmailService.Resultado resultado = cambioEmailService.confirmar(confirmacion.idUsuario(), codigo);
        switch (resultado.estado()){
            case EXPIRADO:
                return ResponseEntity.status(HttpStatus.GONE).build();
            case INCORRECTO:
            case SIN_SOLICITUD:
                return ResponseEntity.badRequest().build();
            default:
                break;
        }

        Usuario usuario = usuarioRepository.findById(confirmacion.idUsuario()).orElse(null);
        if (usuario == null){
            return ResponseEntity.notFound().build();
        }
        //Última comprobación por si otra cuenta ocupó el correo durante esos 2 minutos
        Usuario existente = usuarioRepository.findByEmailIgnoreCase(resultado.email()).orElse(null);
        if (existente != null && !existente.getIdUsuario().equals(confirmacion.idUsuario())){
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        usuario.setEmail(resultado.email());
        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    //Descarta un cambio de email pendiente (al cerrar el diálogo sin confirmar)
    @PostMapping("/cambiar-email/cancelar")
    public ResponseEntity<Void> cancelarCambioEmail(@RequestBody ConfirmacionCambioEmail confirmacion){
        if (confirmacion.idUsuario() != null){
            cambioEmailService.cancelar(confirmacion.idUsuario());
        }
        return ResponseEntity.noContent().build();
    }

    //Código de 5 números (puede empezar por cero)
    private String generarCodigo(){
        return String.format("%05d", aleatorio.nextInt(100000));
    }

    //Contraseña aleatoria de 10 caracteres (letras y números, sin ambiguos)
    private String generarContrasena(){
        final String caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++){
            sb.append(caracteres.charAt(aleatorio.nextInt(caracteres.length())));
        }
        return sb.toString();
    }
}
