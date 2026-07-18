package com.gastos.backend.service;

import com.gastos.backend.dto.MovimientoExport;
import com.gastos.backend.model.MovimientoUsuario;
import com.gastos.backend.model.Usuario;
import com.gastos.backend.repository.MovimientoUsuarioRepository;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

//Genera el Excel de "Descargar cuentas": una hoja por usuario (el principal y sus subusuarios)
//con el resumen del año y todos los movimientos de ese año en orden cronológico
@Service
public class ExportacionExcelService{

    //Columnas de la tabla de movimientos
    private static final String[] CABECERAS = {"Fecha", "Descripción", "Tipo", "Ingreso/Gasto", "Cantidad", "Saldo"};

    //Nombres de mes para las filas que separan los movimientos de cada mes
    private static final String[] MESES = {"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                           "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"};

    //Colores suaves de fondo para las filas de la tabla: verde para ingresos y rojo para gastos
    private static final byte[] VERDE_SUAVE = {(byte) 0xC6, (byte) 0xEF, (byte) 0xCE};
    private static final byte[] ROJO_SUAVE = {(byte) 0xFF, (byte) 0xC7, (byte) 0xCE};

    private final MovimientoUsuarioRepository movimientoUsuarioRepository;

    public ExportacionExcelService(MovimientoUsuarioRepository movimientoUsuarioRepository){
        this.movimientoUsuarioRepository = movimientoUsuarioRepository;
    }

    //Estilos de las celdas de una fila de movimiento (comparten el color de fondo)
    private record EstilosFila(CellStyle fecha, CellStyle texto, CellStyle dinero){}

    //Estilos compartidos por todas las hojas del libro
    private record Estilos(CellStyle titulo, CellStyle etiqueta, CellStyle cabecera, CellStyle mes,
                           CellStyle dinero, EstilosFila ingreso, EstilosFila gasto){}

    public byte[] generarCuentasAnuales(Usuario principal, List<Usuario> subusuarios, int anio) throws IOException{
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()){
            Estilos estilos = crearEstilos(libro);
            //Los nombres de hoja no pueden repetirse: si dos usuarios se llaman igual se numeran
            Set<String> nombresUsados = new HashSet<>();
            crearHojaUsuario(libro, estilos, principal, anio, nombresUsados);
            for (Usuario subusuario : subusuarios){
                crearHojaUsuario(libro, estilos, subusuario, anio, nombresUsados);
            }
            libro.write(salida);
            return salida.toByteArray();
        }
    }

    private Estilos crearEstilos(Workbook libro){
        Font fuenteTitulo = libro.createFont();
        fuenteTitulo.setBold(true);
        fuenteTitulo.setFontHeightInPoints((short) 14);
        CellStyle titulo = libro.createCellStyle();
        titulo.setFont(fuenteTitulo);

        Font fuenteNegrita = libro.createFont();
        fuenteNegrita.setBold(true);
        CellStyle etiqueta = libro.createCellStyle();
        etiqueta.setFont(fuenteNegrita);

        CellStyle cabecera = libro.createCellStyle();
        cabecera.setFont(fuenteNegrita);
        cabecera.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        cabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        cabecera.setBorderBottom(BorderStyle.THIN);
        cabecera.setAlignment(HorizontalAlignment.CENTER);

        //Fila que separa los movimientos de cada mes
        CellStyle mes = libro.createCellStyle();
        mes.setFont(fuenteNegrita);
        mes.setBorderBottom(BorderStyle.THIN);

        //En el resumen los importes negativos (gastos) se muestran en rojo
        CellStyle dinero = libro.createCellStyle();
        dinero.setDataFormat(libro.createDataFormat().getFormat("#,##0.00 \"€\";[Red]-#,##0.00 \"€\""));

        return new Estilos(titulo, etiqueta, cabecera, mes, dinero,
                crearEstilosFila(libro, VERDE_SUAVE), crearEstilosFila(libro, ROJO_SUAVE));
    }

    //Estilos de una fila de la tabla de movimientos: letras en negro y el color suave de fondo
    private EstilosFila crearEstilosFila(Workbook libro, byte[] rgb){
        XSSFColor color = new XSSFColor(rgb, null);

        CellStyle fecha = libro.createCellStyle();
        fecha.setDataFormat(libro.createDataFormat().getFormat("dd/mm/yyyy"));
        aplicarFondo(fecha, color);

        CellStyle texto = libro.createCellStyle();
        aplicarFondo(texto, color);

        CellStyle dinero = libro.createCellStyle();
        dinero.setDataFormat(libro.createDataFormat().getFormat("#,##0.00 \"€\""));
        aplicarFondo(dinero, color);

        return new EstilosFila(fecha, texto, dinero);
    }

    private void aplicarFondo(CellStyle estilo, XSSFColor color){
        ((XSSFCellStyle) estilo).setFillForegroundColor(color);
        estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    }

    private void crearHojaUsuario(Workbook libro, Estilos estilos, Usuario usuario, int anio, Set<String> nombresUsados){
        Sheet hoja = libro.createSheet(nombreDeHoja(usuario, nombresUsados));
        Long idUsuario = usuario.getIdUsuario();
        LocalDate desde = LocalDate.of(anio, 1, 1);
        LocalDate hasta = LocalDate.of(anio, 12, 31);

        //Datos del resumen: saldo actual, número de movimientos e ingresos/gastos del año
        BigDecimal saldoTotal = movimientoUsuarioRepository.findFirstByIdUsuarioOrderByIdMovimientoUsuarioDesc(idUsuario)
                .map(MovimientoUsuario::getSaldo)
                .orElse(BigDecimal.ZERO);
        long movimientosDelAnio = movimientoUsuarioRepository
                .countByIdUsuarioAndIdPeriodoIsNullAndFechaMovimientoBetween(idUsuario, desde, hasta);
        BigDecimal ingresos = movimientoUsuarioRepository.sumarPorTipoEnRango(idUsuario, "N", desde, hasta);
        BigDecimal gastos = movimientoUsuarioRepository.sumarPorTipoEnRango(idUsuario, "S", desde, hasta);
        List<MovimientoExport> movimientos = movimientoUsuarioRepository.movimientosDelRango(idUsuario, desde, hasta);

        //Título de la hoja
        Row filaTitulo = hoja.createRow(0);
        Cell celdaTitulo = filaTitulo.createCell(0);
        celdaTitulo.setCellValue("Cuentas de " + usuario.getNombre() + " " + usuario.getApellido1() + " - " + anio);
        celdaTitulo.setCellStyle(estilos.titulo());
        hoja.addMergedRegion(new CellRangeAddress(0, 0, 0, CABECERAS.length - 1));

        //Bloque de resumen
        escribirResumenDinero(hoja, estilos, 2, "Saldo total:", saldoTotal);
        Row filaMovs = hoja.createRow(3);
        celdaEtiqueta(filaMovs, estilos, "Movimientos del año:");
        filaMovs.createCell(2).setCellValue(movimientosDelAnio);
        escribirResumenDinero(hoja, estilos, 4, "Ingresos del año:", ingresos);
        escribirResumenDinero(hoja, estilos, 5, "Gastos del año:", gastos.negate());
        escribirResumenDinero(hoja, estilos, 6, "Ahorro del año:", ingresos.subtract(gastos));

        //Cabecera de la tabla de movimientos
        Row filaCabecera = hoja.createRow(8);
        for (int i = 0; i < CABECERAS.length; i++){
            Cell celda = filaCabecera.createCell(i);
            celda.setCellValue(CABECERAS[i]);
            celda.setCellStyle(estilos.cabecera());
        }

        //Filas de movimientos (o un aviso si el usuario no tiene movimientos ese año)
        int numeroFila = 9;
        if (movimientos.isEmpty()){
            Row fila = hoja.createRow(numeroFila);
            fila.createCell(0).setCellValue("Sin movimientos en este año");
            hoja.addMergedRegion(new CellRangeAddress(numeroFila, numeroFila, 0, CABECERAS.length - 1));
        }
        int mesActual = -1;
        for (MovimientoExport movimiento : movimientos){
            //Separación entre meses: fila en blanco y una fila con el nombre del mes antes de sus movimientos
            int mes = movimiento.getFechaMovimiento() == null ? 0 : movimiento.getFechaMovimiento().getMonthValue();
            if (mes != mesActual){
                if (mesActual != -1){
                    numeroFila++;
                }
                Row filaMes = hoja.createRow(numeroFila++);
                Cell celdaMes = filaMes.createCell(0);
                celdaMes.setCellValue(mes == 0 ? "Sin fecha" : MESES[mes - 1] + " " + anio);
                celdaMes.setCellStyle(estilos.mes());
                hoja.addMergedRegion(new CellRangeAddress(filaMes.getRowNum(), filaMes.getRowNum(), 0, CABECERAS.length - 1));
                mesActual = mes;
            }

            Row fila = hoja.createRow(numeroFila++);
            boolean esGasto = "S".equals(movimiento.getGasto());
            //Toda la fila lleva un fondo suave: verde si es ingreso y rojo si es gasto
            EstilosFila estilosFila = esGasto ? estilos.gasto() : estilos.ingreso();

            Cell celdaFecha = fila.createCell(0);
            if (movimiento.getFechaMovimiento() != null){
                celdaFecha.setCellValue(movimiento.getFechaMovimiento());
            }
            celdaFecha.setCellStyle(estilosFila.fecha());

            escribirTexto(fila, 1, movimiento.getDescripcion(), estilosFila);
            escribirTexto(fila, 2, movimiento.getTipo(), estilosFila);
            escribirTexto(fila, 3, esGasto ? "Gasto" : "Ingreso", estilosFila);

            //La cantidad se guarda en positivo: en el Excel los gastos van en negativo
            BigDecimal cantidad = movimiento.getCantidad() == null ? BigDecimal.ZERO : movimiento.getCantidad();
            Cell celdaCantidad = fila.createCell(4);
            celdaCantidad.setCellValue((esGasto ? cantidad.negate() : cantidad).doubleValue());
            celdaCantidad.setCellStyle(estilosFila.dinero());

            Cell celdaSaldo = fila.createCell(5);
            celdaSaldo.setCellValue((movimiento.getSaldo() == null ? BigDecimal.ZERO : movimiento.getSaldo()).doubleValue());
            celdaSaldo.setCellStyle(estilosFila.dinero());
        }

        //Anchos fijos de columna (en caracteres) para que todo se lea sin ajustar nada a mano
        int[] anchos = {12, 45, 22, 14, 14, 14};
        for (int i = 0; i < anchos.length; i++){
            hoja.setColumnWidth(i, anchos[i] * 256);
        }
    }

    //Fila del resumen con etiqueta en negrita y valor con formato de dinero
    private void escribirResumenDinero(Sheet hoja, Estilos estilos, int numeroFila, String etiqueta, BigDecimal valor){
        Row fila = hoja.createRow(numeroFila);
        celdaEtiqueta(fila, estilos, etiqueta);
        Cell celdaValor = fila.createCell(2);
        celdaValor.setCellValue(valor.doubleValue());
        celdaValor.setCellStyle(estilos.dinero());
    }

    //Celda de texto de una fila de movimiento, con el fondo suave de la fila
    private void escribirTexto(Row fila, int columna, String valor, EstilosFila estilosFila){
        Cell celda = fila.createCell(columna);
        celda.setCellValue(valor);
        celda.setCellStyle(estilosFila.texto());
    }

    //La etiqueta ocupa las columnas A y B fusionadas para que se lea completa
    //sin tener que ensanchar la columna de la fecha de la tabla
    private void celdaEtiqueta(Row fila, Estilos estilos, String texto){
        Cell celda = fila.createCell(0);
        celda.setCellValue(texto);
        celda.setCellStyle(estilos.etiqueta());
        fila.getSheet().addMergedRegion(new CellRangeAddress(fila.getRowNum(), fila.getRowNum(), 0, 1));
    }

    //Nombre de hoja seguro para Excel (sin caracteres prohibidos, máximo 31) y único dentro del libro
    private String nombreDeHoja(Usuario usuario, Set<String> nombresUsados){
        String base = WorkbookUtil.createSafeSheetName(usuario.getNombre() + " " + usuario.getApellido1());
        String nombre = base;
        int contador = 2;
        while (!nombresUsados.add(nombre.toLowerCase())){
            String sufijo = " (" + contador++ + ")";
            String recortado = base.length() + sufijo.length() > 31 ? base.substring(0, 31 - sufijo.length()) : base;
            nombre = recortado + sufijo;
        }
        return nombre;
    }
}
