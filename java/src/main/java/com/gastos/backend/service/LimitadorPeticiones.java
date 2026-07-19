package com.gastos.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

//Limitador de peticiones por IP (ventana fija en memoria) para proteger endpoints que
//consumen recursos externos, como el chat de Groq. Sin dependencias externas: basta para
//frenar el abuso básico de un despliegue público pequeño.
@Component
public class LimitadorPeticiones{

    //Nº máximo de peticiones permitidas por IP dentro de cada ventana
    @Value("${limite.chat.peticiones:15}")
    private int maxPeticiones;

    //Duración de la ventana en segundos
    @Value("${limite.chat.ventana-segundos:60}")
    private long ventanaSegundos;

    //Si el mapa crece por encima de este tamaño se hace una limpieza de ventanas caducadas
    private static final int LIMITE_LIMPIEZA = 10_000;

    private final Map<String, Ventana> ventanas = new ConcurrentHashMap<>();

    //Devuelve true si la petición de esa IP se permite; false si ha superado el límite
    public boolean permitir(String ip){
        if (ip == null || ip.isBlank()){
            ip = "desconocida";
        }
        long ahora = System.currentTimeMillis();
        long duracionMs = ventanaSegundos * 1000L;

        if (ventanas.size() > LIMITE_LIMPIEZA){
            ventanas.values().removeIf(v -> ahora - v.inicio > duracionMs);
        }

        Ventana ventana = ventanas.compute(ip, (clave, actual) ->{
            if (actual == null || ahora - actual.inicio > duracionMs){
                return new Ventana(ahora);
            }
            return actual;
        });

        return ventana.contador.incrementAndGet() <= maxPeticiones;
    }

    private static final class Ventana{
        final long inicio;
        final AtomicInteger contador = new AtomicInteger(0);

        Ventana(long inicio){
            this.inicio = inicio;
        }
    }
}
