package com.gastos.backend.service;

import com.gastos.backend.dto.CotizacionBolsa;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

//Cotizaciones de bolsa para la tarjeta "Bolsa" del panel de usuario.
//Consulta la API pública de Yahoo Finance (sin clave) desde el servidor y
//cachea el resultado 10 minutos para no hacer una petición por cada usuario.
@Service
public class BolsaService{

    //Índices/valores fijos que se muestran en la tarjeta, en este orden
    private static final Map<String, String> SIMBOLOS = new LinkedHashMap<>();
    static{
        SIMBOLOS.put("^IBEX", "IBEX 35");
        SIMBOLOS.put("^GSPC", "S&P 500");
        SIMBOLOS.put("^IXIC", "NASDAQ");
        SIMBOLOS.put("EURUSD=X", "EUR/USD");
        SIMBOLOS.put("BTC-EUR", "Bitcoin");
    }

    private static final Duration CADUCIDAD_CACHE = Duration.ofMinutes(10);

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    //Caché en memoria: última respuesta y cuándo se obtuvo
    private List<CotizacionBolsa> cache = List.of();
    private Instant obtenidoEn = Instant.EPOCH;

    public synchronized List<CotizacionBolsa> obtenerCotizaciones(){
        if (Instant.now().isBefore(obtenidoEn.plus(CADUCIDAD_CACHE)) && !cache.isEmpty()){
            return cache;
        }

        List<CotizacionBolsa> cotizaciones = new ArrayList<>();
        for (Map.Entry<String, String> entrada : SIMBOLOS.entrySet()){
            CotizacionBolsa cotizacion = consultarSimbolo(entrada.getKey(), entrada.getValue());
            if (cotizacion != null){
                cotizaciones.add(cotizacion);
            }
        }

        //Si Yahoo falla por completo se mantiene la caché anterior (aunque esté caducada)
        if (!cotizaciones.isEmpty()){
            cache = List.copyOf(cotizaciones);
            obtenidoEn = Instant.now();
        }
        return cache;
    }

    //Consulta un símbolo en Yahoo Finance y devuelve su cotización (o null si falla)
    private CotizacionBolsa consultarSimbolo(String simbolo, String nombre){
        try{
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/"
                + URLEncoder.encode(simbolo, StandardCharsets.UTF_8)
                + "?range=1d&interval=1d";
            HttpRequest peticion = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                //Yahoo rechaza peticiones sin User-Agent de navegador
                .header("User-Agent", "Mozilla/5.0")
                .GET()
                .build();

            HttpResponse<String> respuesta = http.send(peticion, HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() != 200){
                return null;
            }

            //Solo hacen falta 3 campos del bloque "meta": se extraen directamente del JSON
            String cuerpo = respuesta.body();
            Double precio = extraerNumero(cuerpo, "regularMarketPrice");
            Double cierreAnterior = extraerNumero(cuerpo, "chartPreviousClose");
            if (precio == null || cierreAnterior == null || cierreAnterior == 0){
                return null;
            }

            double variacion = (precio - cierreAnterior) / cierreAnterior * 100;
            String moneda = extraerTexto(cuerpo, "currency");
            return new CotizacionBolsa(nombre, simbolo, precio, variacion, moneda);
        }catch (Exception e){
            System.err.println("Error al consultar la cotización de " + simbolo + ": " + e.getMessage());
            return null;
        }
    }

    //Valor numérico de un campo del JSON ("campo":123.45), o null si no aparece
    private static Double extraerNumero(String json, String campo){
        Matcher m = Pattern.compile("\"" + Pattern.quote(campo) + "\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)").matcher(json);
        return m.find() ? Double.valueOf(m.group(1)) : null;
    }

    //Valor de texto de un campo del JSON ("campo":"EUR"), o cadena vacía si no aparece
    private static String extraerTexto(String json, String campo){
        Matcher m = Pattern.compile("\"" + Pattern.quote(campo) + "\"\\s*:\\s*\"([^\"]*)\"").matcher(json);
        return m.find() ? m.group(1) : "";
    }
}
