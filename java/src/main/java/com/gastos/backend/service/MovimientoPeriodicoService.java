package com.gastos.backend.service;

import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.model.Periodo;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import com.gastos.backend.repository.PeriodoRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.WeekFields;
import java.util.HashMap;
import java.util.Map;

//Genera los cobros/ingresos automáticos de los movimientos periódicos.
//El movimiento periódico que guarda el usuario es una plantilla (no mueve dinero):
//este servicio crea cada día de cobro un movimiento normal con su cantidad,
//y el trigger de la base de datos calcula el saldo como con cualquier otro movimiento.
@Service
public class MovimientoPeriodicoService{

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;
    private final PeriodoRepository periodoRepository;
    private final CorreoService correoService;

    public MovimientoPeriodicoService(MovimientoUsuarioRepository movimientoUsuarioRepository,
                                      PeriodoRepository periodoRepository,
                                      CorreoService correoService){
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
        this.periodoRepository = periodoRepository;
        this.correoService = correoService;
    }

    //Se ejecuta al arrancar (por si el servidor estuvo apagado algún día de cobro)
    //y todos los días a las 00:05 para generar los cobros que toquen.
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void generarCobrosPendientes(){
        LocalDate hoy = LocalDate.now();
        Map<Long, String> periodos = nombresDePeriodos();

        for (MovimientoUsuario plantilla : movimientoUsuarioRepository.findByIdPeriodoIsNotNull()){
            String periodo = periodos.get(plantilla.getIdPeriodo());
            //Si nunca se ha cobrado, se parte de la fecha de creación del movimiento
            LocalDate referencia = plantilla.getUltimoCobro() != null ? plantilla.getUltimoCobro() : plantilla.getFechaMovimiento();
            if (periodo == null || referencia == null){
                continue;
            }

            LocalDate fin = plantilla.getFechaFinMovimiento();
            boolean primerCobro = plantilla.getUltimoCobro() == null;
            LocalDate siguiente = siguienteCobro(periodo, plantilla, referencia, primerCobro);
            boolean generado = false;

            //Genera todos los cobros pendientes hasta hoy (recupera los días perdidos) sin pasar la fecha fin
            while (siguiente != null && !siguiente.isAfter(hoy) && (fin == null || !siguiente.isAfter(fin))){
                MovimientoUsuario cobro = movimientoUsuarioRepository.save(crearCobro(plantilla, siguiente));
                //Avisa por correo de cada cobro periódico generado, indicando que es periódico y cuándo termina
                correoService.avisarMovimiento(cobro, plantilla);
                plantilla.setUltimoCobro(siguiente);
                siguiente = siguienteCobro(periodo, plantilla, siguiente, false);
                generado = true;
            }
            if (generado){
                movimientoUsuarioRepository.save(plantilla);
            }
        }
    }

    //Día de cobro por defecto al crear un movimiento periódico:
    //lunes (semanal), día 1 (mensual y 2 meses) y 1 de enero (anual)
    public void asignarDiaCobroPorDefecto(MovimientoUsuario movimiento){
        movimiento.setUltimoCobro(null);
        movimiento.setDiaCobro(null);
        movimiento.setMesCobro(null);
        if (movimiento.getIdPeriodo() == null){
            return;
        }
        String periodo = nombrePeriodo(movimiento.getIdPeriodo());
        if ("Semanal".equals(periodo) || "Mensual".equals(periodo) || "2 meses".equals(periodo)){
            movimiento.setDiaCobro(1);
        }else if ("Anual".equals(periodo)){
            movimiento.setDiaCobro(1);
            movimiento.setMesCobro(1);
        }
        //Diario: no necesita día de cobro, se cobra todos los días
    }

    //Valida y aplica el periodo y el día de cobro elegidos por el usuario. Devuelve false si no son válidos.
    //El día máximo en mensual/2 meses es el 30 porque no todos los meses tienen día 31.
    public boolean aplicarCambio(MovimientoUsuario plantilla, Long idPeriodo, Integer dia, Integer mes){
        String periodo = nombrePeriodo(idPeriodo);
        if (periodo == null){
            return false;
        }

        Integer diaFinal;
        Integer mesFinal;
        if ("Diario".equals(periodo)){
            //Diario: se cobra todos los días, no necesita día de cobro
            diaFinal = null;
            mesFinal = null;
        }else if ("Semanal".equals(periodo)){
            if (dia == null || dia < 1 || dia > 7){
                return false;
            }
            diaFinal = dia;
            mesFinal = null;
        }else if ("Mensual".equals(periodo) || "2 meses".equals(periodo)){
            if (dia == null || dia < 1 || dia > 30){
                return false;
            }
            diaFinal = dia;
            mesFinal = null;
        }else if ("Anual".equals(periodo)){
            //Se valida el día contra un año bisiesto para permitir el 29 de febrero
            if (mes == null || mes < 1 || mes > 12 || dia == null || dia < 1 || dia > YearMonth.of(2024, mes).lengthOfMonth()){
                return false;
            }
            diaFinal = dia;
            mesFinal = mes;
        }else{
            return false;
        }

        //Si cambia la periodicidad, el ciclo empieza de cero desde hoy:
        //así no se generan cobros retroactivos con las reglas del periodo nuevo
        if (!idPeriodo.equals(plantilla.getIdPeriodo())){
            plantilla.setUltimoCobro(LocalDate.now());
        }
        plantilla.setIdPeriodo(idPeriodo);
        plantilla.setDiaCobro(diaFinal);
        plantilla.setMesCobro(mesFinal);
        return true;
    }

    //Calcula la fecha del siguiente cobro después de una fecha dada.
    //En el primer cobro puede caer dentro del mismo periodo (semana/mes/año) de la creación;
    //después siempre se salta al periodo siguiente para cobrar una sola vez por periodo.
    private LocalDate siguienteCobro(String periodo, MovimientoUsuario plantilla, LocalDate despuesDe, boolean primerCobro){
        int dia = plantilla.getDiaCobro() != null ? plantilla.getDiaCobro() : 1;

        if ("Diario".equals(periodo)){
            return despuesDe.plusDays(1);
        }
        if ("Semanal".equals(periodo)){
            //dia: 1=lunes ... 7=domingo, dentro de la semana ISO (de lunes a domingo)
            LocalDate mismaSemana = despuesDe.with(WeekFields.ISO.dayOfWeek(), dia);
            if (primerCobro && mismaSemana.isAfter(despuesDe)){
                return mismaSemana;
            }
            return despuesDe.plusWeeks(1).with(WeekFields.ISO.dayOfWeek(), dia);
        }
        if ("Mensual".equals(periodo) || "2 meses".equals(periodo)){
            LocalDate mismoMes = diaDelMes(YearMonth.from(despuesDe), dia);
            if (primerCobro && mismoMes.isAfter(despuesDe)){
                return mismoMes;
            }
            //El primer cobro cae en el mes siguiente; a partir de ahí se respeta el salto del periodo
            int salto = primerCobro || "Mensual".equals(periodo) ? 1 : 2;
            return diaDelMes(YearMonth.from(despuesDe).plusMonths(salto), dia);
        }
        if ("Anual".equals(periodo)){
            int mes = plantilla.getMesCobro() != null ? plantilla.getMesCobro() : 1;
            LocalDate mismoAnio = diaDelMes(YearMonth.of(despuesDe.getYear(), mes), dia);
            if (primerCobro && mismoAnio.isAfter(despuesDe)){
                return mismoAnio;
            }
            return diaDelMes(YearMonth.of(despuesDe.getYear() + 1, mes), dia);
        }
        return null;
    }

    //Devuelve el día pedido dentro del mes; si el mes es más corto (p. ej. día 31 en abril), el último día del mes
    private LocalDate diaDelMes(YearMonth mes, int dia){
        return mes.atDay(Math.min(dia, mes.lengthOfMonth()));
    }

    //Crea el movimiento real del cobro: una fila normal (sin periodo) que sí mueve dinero
    private MovimientoUsuario crearCobro(MovimientoUsuario plantilla, LocalDate fecha){
        MovimientoUsuario cobro = new MovimientoUsuario();
        cobro.setIdUsuario(plantilla.getIdUsuario());
        cobro.setIdMovimiento(plantilla.getIdMovimiento());
        cobro.setDescripcion(plantilla.getDescripcion());
        cobro.setCantidad(plantilla.getCantidad());
        cobro.setFechaMovimiento(fecha);
        return cobro;
    }

    private Map<Long, String> nombresDePeriodos(){
        Map<Long, String> nombres = new HashMap<>();
        for (Periodo periodo : periodoRepository.findAll()){
            nombres.put(periodo.getIdPeriodo(), periodo.getPeriodo());
        }
        return nombres;
    }

    private String nombrePeriodo(Long idPeriodo){
        if (idPeriodo == null){
            return null;
        }
        return periodoRepository.findById(idPeriodo).map(Periodo::getPeriodo).orElse(null);
    }
}