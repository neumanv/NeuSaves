package com.gastos.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gastos.backend.dto.CotizacionBolsa;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

//Cotizaciones de bolsa para la tarjeta "Bolsa" del panel de usuario.
//Consulta la API pública de Yahoo Finance (sin clave) desde el servidor y
//cachea el resultado 10 minutos para no hacer una petición por cada usuario.
@Service
public class BolsaService{

    private static final Logger log = LoggerFactory.getLogger(BolsaService.class);

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
    private final ObjectMapper objectMapper = new ObjectMapper();

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

            String cuerpo = respuesta.body();
            JsonNode meta = objectMapper.readTree(cuerpo).at("/chart/result/0/meta");
            if (meta.isMissingNode()){
                return null;
            }

            JsonNode precioNode = meta.get("regularMarketPrice");
            JsonNode cierreNode = meta.get("chartPreviousClose");
            if (precioNode == null || cierreNode == null || cierreNode.asDouble() == 0){
                return null;
            }

            double precio = precioNode.asDouble();
            double cierreAnterior = cierreNode.asDouble();
            double variacion = (precio - cierreAnterior) / cierreAnterior * 100;
            String moneda = meta.has("currency") ? meta.get("currency").asText() : "";
            return new CotizacionBolsa(nombre, simbolo, precio, variacion, moneda);
        }catch (Exception e){
            log.error("Error al consultar la cotización de {}: {}", simbolo, e.getMessage());
            return null;
        }
    }
}
