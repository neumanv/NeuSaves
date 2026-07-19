package com.gastos.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errores.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errores);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Void> handleIntegrity(DataIntegrityViolationException ex) {
        log.warn("Violación de integridad: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(409).build();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Void> handleGeneric(Exception ex) {
        log.error("Error no controlado", ex);
        return ResponseEntity.internalServerError().build();
    }
}
