import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ Footer } from "../footer/footer";
import{ descifrarId } from "../cifrado";
import{ Auth } from "../auth";
import{ environment } from "../environment";
import{ EstadisticaTipo, EstadisticaMes, EstadisticasDatos } from "../models";

//Barra horizontal (por tipo o por frecuencia) ya preparada para pintar
interface Barra{
  tipo: string;
  icono: string;
  valor: number;      //dinero o número de movimientos
  porcentaje: number; //ancho relativo respecto al máximo (0-100)
}

//Grupo de barras verticales de un mes (evolución mensual)
interface BarraMes{
  etiqueta: string;
  ingresos: number;
  gastos: number;
  alturaIngresos: number; //px
  alturaGastos: number;   //px
}

@Component({
  selector: "app-estadisticas",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: "./estadisticas.html"
})
export class Estadisticas implements OnInit{
  private readonly movimientosUrl = `${environment.apiUrl}/movimientos-usuarios`;

  token = "";
  idUsuario = signal<number | null>(null);
  datos = signal<EstadisticasDatos | null>(null);
  cargando = signal(false);

  //--- Filtro por mes o año ---
  modo = signal<"mes" | "anio">("anio");
  //Mes seleccionado en formato 'YYYY-MM' (por defecto, el mes actual)
  mesSel = this.mesActual();
  //Año seleccionado (por defecto, el año actual)
  anioSel = new Date().getFullYear();
  //Años disponibles en el desplegable: solo los que tienen movimientos
  anios = signal<number[]>([]);

  //Altura máxima (px) de las barras de la evolución mensual
  private readonly ALTURA_BARRAS = 140;

  //Icono de Bootstrap para cada tipo de movimiento (por nombre de tipo de la BD)
  private readonly iconosTipo: Record<string, string> = {
    "Nómina": "bi-briefcase-fill",
    "Beneficios de inversiones": "bi-graph-up-arrow",
    "Regalos": "bi-gift-fill",
    "Otros": "bi-cash-coin",
    "Fijos": "bi-calendar3",
    "Variables": "bi-list",
    "Gastos de ocio": "bi-cup-straw",
    "Comida y casa": "bi-house-fill",
    "Hijos": "bi-backpack-fill",
    "Transporte/vehículo": "bi-car-front-fill",
    "Inversiones": "bi-bank",
    "Imprevistos": "bi-patch-exclamation-fill",
    "Otros gastos": "bi-cash-coin"
  };
  iconoTipo(tipo: string): string{
    return this.iconosTipo[tipo] ?? "bi-cash-coin";
  }

  //Nombre corto del mes a partir de 'YYYY-MM'
  private readonly nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  //Hay al menos un movimiento con el que dibujar gráficas
  hayDatos = computed(() => (this.datos()?.numeroMovimientos ?? 0) > 0);

  //--- Donut ingresos vs gastos ---
  readonly RADIO_DONUT = 60;
  readonly CIRCUNFERENCIA = 2 * Math.PI * this.RADIO_DONUT;

  //Longitud del arco verde (ingresos) sobre la circunferencia total
  dashIngresos = computed(() =>{
    const d = this.datos();
    if (!d){
      return 0;
    }
    const total = d.totalIngresos + d.totalGastos;
    if (total <= 0){
      return 0;
    }
    return (d.totalIngresos / total) * this.CIRCUNFERENCIA;
  });

  porcentajeIngresos = computed(() =>{
    const d = this.datos();
    const total = (d?.totalIngresos ?? 0) + (d?.totalGastos ?? 0);
    return total > 0 ? Math.round((d!.totalIngresos / total) * 100) : 0;
  });
  porcentajeGastos = computed(() => this.datos() ? 100 - this.porcentajeIngresos() : 0);

  //--- Barras horizontales: gastos por tipo ---
  gastosPorTipo = computed<Barra[]>(() => this.barrasPorDinero("S"));
  //--- Barras horizontales: ingresos por tipo ---
  ingresosPorTipo = computed<Barra[]>(() => this.barrasPorDinero("N"));

  //--- Tipos más comunes (por número de movimientos) ---
  tiposComunes = computed<Barra[]>(() =>{
    const d = this.datos();
    if (!d){
      return [];
    }
    const maxCantidad = Math.max(...d.porTipo.map((t) => t.cantidad), 1);
    return [...d.porTipo]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)
      .map((t) => ({
        tipo: t.tipo,
        icono: this.iconoTipo(t.tipo),
        valor: t.cantidad,
        porcentaje: (t.cantidad / maxCantidad) * 100
      }));
  });

  //--- Evolución mensual (barras verticales agrupadas) ---
  evolucionMensual = computed<BarraMes[]>(() =>{
    const d = this.datos();
    if (!d){
      return [];
    }
    //Se rellenan todos los meses del periodo (aunque alguno no tenga movimientos) para que la gráfica sea continua
    const meses = this.mesesDelPeriodo();
    const porClave = new Map(d.porMes.map((m) => [m.mes, m]));
    const maximo = Math.max(
      ...meses.map((clave) => {
        const m = porClave.get(clave);
        return Math.max(m?.ingresos ?? 0, m?.gastos ?? 0);
      }),
      1
    );
    return meses.map((clave) =>{
      const m = porClave.get(clave);
      const ingresos = m?.ingresos ?? 0;
      const gastos = m?.gastos ?? 0;
      return{
        etiqueta: this.nombresMes[parseInt(clave.slice(5), 10) - 1],
        ingresos,
        gastos,
        alturaIngresos: (ingresos / maximo) * this.ALTURA_BARRAS,
        alturaGastos: (gastos / maximo) * this.ALTURA_BARRAS
      };
    });
  });

  descargando = signal(false);

  //Meses en formato largo para el subtítulo de la imagen
  private readonly mesesLargos = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  constructor(private http: HttpClient, private ruta: ActivatedRoute, private auth: Auth, @Inject(PLATFORM_ID) private platformId: Object){}

  //Parámetro de query solo cuando el id corresponde a un subusuario
  private paramUsuario(id: number): string{
    const principal = this.auth.usuario();
    return principal && id !== principal.idUsuario ? `usuario=${id}` : "";
  }

  //Genera un PNG dibujando las estadísticas con Canvas, replicando el estilo de la pantalla.
  //Se dibuja a mano (en vez de capturar el DOM) para que todo el texto y las gráficas salgan nítidos.
  descargarPNG(): void{
    const d = this.datos();
    if (!d || !isPlatformBrowser(this.platformId)){
      return;
    }
    this.descargando.set(true);

    //Paleta según el tema activo (claro/oscuro), igual que styles.css
    const oscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
    const c = oscuro
      ? { fondo: "#1A1C1F", blanco: "#24272B", borde: "#383C41", texto: "#F2F2F2", boton: "#9A9FA6", verde: "#2E9E6B", peligro: "#FF3D3D" }
      : { fondo: "#F2F2F2", blanco: "#FFFFFF", borde: "#E6E6E6", texto: "#000000", boton: "#999999", verde: "#2E9E6B", peligro: "#FF3D3D" };
    const FT = "'Bellota Text', sans-serif";
    const FH = "'Radio Canada Big', sans-serif";

    //Todo el dibujo se hace dentro de esta función, que se ejecuta una vez cargado el logo
    const pinta = (logo: HTMLImageElement | null) =>{

    //--- Geometría ---
    const DPR = 2;
    const W = 900;
    const P = 28;          //margen exterior
    const G = 20;          //separación entre tarjetas
    const PAD = 20;        //padding interior de tarjeta
    const rowH = 30;       //alto de fila de lista
    const halfW = (W - 2 * P - G) / 2;

    const gastos = this.gastosPorTipo();
    const ingresos = this.ingresosPorTipo();
    const comunes = this.tiposComunes();
    const evol = this.evolucionMensual();

    const listCardH = (n: number) => PAD + 34 + Math.max(n, 1) * rowH + 4;
    const headerBlockH = 66;
    const summaryH = 92;
    const midH = 210;
    const row3H = Math.max(listCardH(gastos.length), listCardH(ingresos.length));
    const row4H = listCardH(comunes.length);
    const totalH = P + headerBlockH + summaryH + G + midH + G + row3H + G + row4H + P;

    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = totalH * DPR;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(DPR, DPR);
    ctx.textBaseline = "alphabetic";

    //Helpers de dibujo
    const card = (x: number, y: number, w: number, h: number) =>{
      ctx.fillStyle = c.blanco;
      ctx.strokeStyle = c.borde;
      ctx.lineWidth = 1;
      ctx.beginPath();
      (ctx as any).roundRect(x, y, w, h, 16);
      ctx.fill();
      ctx.stroke();
    };
    const barra = (x: number, y: number, w: number, h: number, r: number, color: string) =>{
      ctx.fillStyle = color;
      ctx.beginPath();
      (ctx as any).roundRect(x, y, Math.max(w, r * 2), h, r);
      ctx.fill();
    };
    const recorta = (txt: string, maxW: number) =>{
      if (ctx.measureText(txt).width <= maxW){
        return txt;
      }
      let t = txt;
      while (t.length > 1 && ctx.measureText(t + "…").width > maxW){
        t = t.slice(0, -1);
      }
      return t + "…";
    };

    //--- Fondo ---
    ctx.fillStyle = c.fondo;
    ctx.fillRect(0, 0, W, totalH);

    //--- Cabecera ---
    let y = P;
    ctx.fillStyle = c.texto;
    ctx.font = `bold 26px ${FH}`;
    ctx.textAlign = "left";
    ctx.fillText("Estadísticas", P, y + 26);
    const periodo = this.modo() === "anio"
      ? `Año ${this.anioSel}`
      : `${this.mesesLargos[parseInt(this.mesSel.slice(5), 10) - 1]} ${this.mesSel.slice(0, 4)}`;
    ctx.fillStyle = c.boton;
    ctx.font = `14px ${FT}`;
    ctx.fillText(periodo, P, y + 48);
    //Logo de la app en la esquina superior derecha (respeta su proporción)
    if (logo && logo.naturalWidth > 0){
      const logoH = 46;
      const logoW = logo.naturalWidth * logoH / logo.naturalHeight;
      //Centrado verticalmente respecto al título para que no descuadre la cabecera
      ctx.drawImage(logo, W - P - logoW, y - 4, logoW, logoH);
    }
    y += headerBlockH;

    //--- Tarjetas de resumen ---
    const sw = (W - 2 * P - 2 * G) / 3;
    const resumen: [string, string, string][] = [
      ["Ingresos totales", "+" + this.euros(d.totalIngresos), c.verde],
      ["Gastos totales", "-" + this.euros(d.totalGastos), c.peligro],
      ["Balance", this.euros(d.balance), c.texto]
    ];
    resumen.forEach(([titulo, valor, color], i) =>{
      const x = P + i * (sw + G);
      card(x, y, sw, summaryH);
      ctx.fillStyle = c.texto;
      ctx.font = `13px ${FT}`;
      ctx.textAlign = "left";
      ctx.fillText(titulo, x + PAD, y + 30);
      ctx.fillStyle = color;
      ctx.font = `bold 26px ${FH}`;
      ctx.fillText(valor, x + PAD, y + 66);
    });
    y += summaryH + G;

    //--- Donut ingresos vs gastos ---
    const donutY = y;
    card(P, donutY, halfW, midH);
    ctx.fillStyle = c.texto;
    ctx.font = `bold 17px ${FH}`;
    ctx.textAlign = "left";
    ctx.fillText("Ingresos vs Gastos", P + PAD, donutY + 32);
    const cx = P + PAD + 66;
    const cy = donutY + 60 + 66;
    const rad = 58;
    ctx.lineWidth = 22;
    ctx.strokeStyle = c.peligro;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
    ctx.stroke();
    const frac = this.porcentajeIngresos() / 100;
    if (frac > 0){
      ctx.strokeStyle = c.verde;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + frac * 2 * Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = c.boton;
    ctx.font = `11px ${FT}`;
    ctx.textAlign = "center";
    ctx.fillText("Balance", cx, cy - 4);
    ctx.fillStyle = c.texto;
    ctx.font = `bold 14px ${FH}`;
    ctx.fillText(this.euros(d.balance), cx, cy + 14);
    //Leyenda
    const lx = cx + rad + 30;
    ctx.textAlign = "left";
    ctx.fillStyle = c.verde;
    ctx.beginPath();
    ctx.arc(lx + 6, cy - 22, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = c.texto;
    ctx.font = `13px ${FT}`;
    ctx.fillText("Ingresos", lx + 20, cy - 18);
    ctx.fillStyle = c.verde;
    ctx.font = `bold 13px ${FT}`;
    ctx.fillText(`${this.porcentajeIngresos()}% · +${this.euros(d.totalIngresos)}`, lx + 20, cy - 2);
    ctx.fillStyle = c.peligro;
    ctx.beginPath();
    ctx.arc(lx + 6, cy + 18, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = c.texto;
    ctx.font = `13px ${FT}`;
    ctx.fillText("Gastos", lx + 20, cy + 22);
    ctx.fillStyle = c.peligro;
    ctx.font = `bold 13px ${FT}`;
    ctx.fillText(`${this.porcentajeGastos()}% · -${this.euros(d.totalGastos)}`, lx + 20, cy + 38);

    //--- Evolución mensual ---
    const ex = P + halfW + G;
    card(ex, donutY, halfW, midH);
    ctx.fillStyle = c.texto;
    ctx.font = `bold 17px ${FH}`;
    ctx.textAlign = "left";
    ctx.fillText("Evolución mensual", ex + PAD, donutY + 32);
    const chartTop = donutY + 56;
    const chartH = 118;
    const baseY = chartTop + chartH;
    const innerW = halfW - 2 * PAD;
    const slot = innerW / Math.max(evol.length, 1);
    const factor = chartH / 140;
    evol.forEach((m, i) =>{
      const slotX = ex + PAD + i * slot + slot / 2;
      const bw = Math.min(8, slot / 3);
      const hi = m.alturaIngresos * factor;
      const hg = m.alturaGastos * factor;
      barra(slotX - bw - 1, baseY - hi, bw, hi, 2, c.verde);
      barra(slotX + 1, baseY - hg, bw, hg, 2, c.peligro);
      ctx.fillStyle = c.boton;
      ctx.font = `10px ${FT}`;
      ctx.textAlign = "center";
      ctx.fillText(m.etiqueta, slotX, baseY + 16);
    });
    y += midH + G;

    //--- Listas de barras horizontales ---
    const listaCard = (x: number, w: number, titulo: string, filas: { tipo: string; valor: number; porcentaje: number }[],
                        color: string, alto: number, formato: (v: number) => string, vacio: string) =>{
      card(x, y, w, alto);
      ctx.fillStyle = c.texto;
      ctx.font = `bold 17px ${FH}`;
      ctx.textAlign = "left";
      ctx.fillText(titulo, x + PAD, y + 30);
      if (filas.length === 0){
        ctx.fillStyle = c.boton;
        ctx.font = `13px ${FT}`;
        ctx.fillText(vacio, x + PAD, y + 58);
        return;
      }
      const labelW = 120;
      const valW = 95;
      const trackX = x + PAD + labelW + 10;
      const trackW = w - 2 * PAD - labelW - valW - 20;
      filas.forEach((b, i) =>{
        const ry = y + 44 + i * rowH + 15;
        ctx.fillStyle = c.texto;
        ctx.font = `13px ${FT}`;
        ctx.textAlign = "left";
        ctx.fillText(recorta(b.tipo, labelW), x + PAD, ry + 4);
        //Track
        barra(trackX, ry - 4, trackW, 8, 4, c.fondo);
        //Valor
        barra(trackX, ry - 4, trackW * b.porcentaje / 100, 8, 4, color);
        ctx.fillStyle = color;
        ctx.font = `bold 13px ${FT}`;
        ctx.textAlign = "right";
        ctx.fillText(formato(b.valor), x + w - PAD, ry + 4);
      });
    };

    listaCard(P, halfW, "Gastos por tipo", gastos, c.peligro, row3H, (v) => this.euros(v), "No hay gastos registrados.");
    listaCard(ex, halfW, "Ingresos por tipo", ingresos, c.verde, row3H, (v) => this.euros(v), "No hay ingresos registrados.");
    y += row3H + G;

    listaCard(P, W - 2 * P, "Tipos de movimiento más comunes", comunes, c.boton, row4H,
      (v) => `${v} ${v === 1 ? "movimiento" : "movimientos"}`, "");

    //--- Descarga ---
    const enlace = document.createElement("a");
    enlace.download = `estadisticas-${this.modo() === "mes" ? this.mesSel : this.anioSel}.png`;
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();
    this.descargando.set(false);
    };

    //Carga el logo según el tema; si falla, se genera la imagen igualmente sin él
    const logo = new Image();
    logo.onload = () => pinta(logo);
    logo.onerror = () => pinta(null);
    logo.src = oscuro ? "NeuSaves_dark.png" : "NeuSaves.png";
  }

  ngOnInit(): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    this.token = this.ruta.snapshot.paramMap.get("token") ?? "";
    const id = descifrarId(this.token);
    if (id === null){
      return;
    }
    this.idUsuario.set(id);

    //Años con movimientos para el desplegable; se elige el más reciente si el año actual no tiene datos
    const paramAnios = this.paramUsuario(id);
    this.http.get<number[]>(`${this.movimientosUrl}/estadisticas/anios${paramAnios ? "?" + paramAnios : ""}`).subscribe({
      next: (anios) =>{
        const lista = anios ?? [];
        this.anios.set(lista.length > 0 ? lista : [this.anioSel]);
        if (lista.length > 0 && !lista.includes(this.anioSel)){
          this.anioSel = lista[0];
        }
        this.cargar();
      },
      error: (err) =>{
        console.error("Error al cargar los años con datos:", err);
        this.anios.set([this.anioSel]);
        this.cargar();
      }
    });
  }

  //Carga las estadísticas del periodo seleccionado (mes o año)
  private cargar(): void{
    const id = this.idUsuario();
    if (id === null){
      return;
    }
    const [desde, hasta] = this.rangoSeleccionado();
    this.cargando.set(true);
    const param = this.paramUsuario(id);
    this.http.get<EstadisticasDatos>(
      `${this.movimientosUrl}/estadisticas?desde=${desde}&hasta=${hasta}${param ? "&" + param : ""}`
    ).subscribe({
      next: (datos) =>{
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (err) =>{
        this.cargando.set(false);
        console.error("Error al cargar las estadísticas:", err);
      }
    });
  }

  //--- Filtro ---
  cambiarModo(modo: "mes" | "anio"): void{
    this.modo.set(modo);
    this.cargar();
  }

  //Se llama al cambiar el mes o el año en los selectores
  cambiarPeriodo(): void{
    this.cargar();
  }

  //Rango [desde, hasta] (YYYY-MM-DD) del periodo seleccionado
  private rangoSeleccionado(): [string, string]{
    if (this.modo() === "anio"){
      return [`${this.anioSel}-01-01`, `${this.anioSel}-12-31`];
    }
    //Mes: del día 1 al último día del mes
    const [anio, mes] = this.mesSel.split("-").map((n) => parseInt(n, 10));
    const ultimoDia = new Date(anio, mes, 0).getDate();
    return [`${this.mesSel}-01`, `${this.mesSel}-${String(ultimoDia).padStart(2, "0")}`];
  }

  //Claves 'YYYY-MM' de los meses del periodo (12 si es año, 1 si es mes)
  private mesesDelPeriodo(): string[]{
    if (this.modo() === "mes"){
      return [this.mesSel];
    }
    return Array.from({ length: 12 }, (_, i) => `${this.anioSel}-${String(i + 1).padStart(2, "0")}`);
  }

  private mesActual(): string{
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  }

  //Barras horizontales de dinero por tipo para gastos ('S') o ingresos ('N')
  private barrasPorDinero(gasto: string): Barra[]{
    const d = this.datos();
    if (!d){
      return [];
    }
    const tipos = d.porTipo.filter((t) => t.gasto === gasto && t.total > 0);
    const maximo = Math.max(...tipos.map((t) => t.total), 1);
    return tipos
      .sort((a, b) => b.total - a.total)
      .map((t) => ({
        tipo: t.tipo,
        icono: this.iconoTipo(t.tipo),
        valor: t.total,
        porcentaje: (t.total / maximo) * 100
      }));
  }

  //Formatea un número como importe en euros
  euros(valor: number): string{
    return valor.toFixed(2) + " €";
  }
}
