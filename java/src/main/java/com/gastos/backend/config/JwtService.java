package com.gastos.backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey clave;
    private final long horasExpiracion;

    public JwtService(@Value("${jwt.secreto}") String secreto,
                      @Value("${jwt.expiracion-horas:8}") long horasExpiracion) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRETO debe tener al menos 32 caracteres");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.horasExpiracion = horasExpiracion;
    }

    public String generarToken(Long idUsuario) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(idUsuario))
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(horasExpiracion, ChronoUnit.HOURS)))
                .signWith(clave)
                .compact();
    }

    public Long extraerIdUsuario(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(clave)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.parseLong(claims.getSubject());
        } catch (JwtException | NumberFormatException e) {
            return null;
        }
    }
}
