import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ Footer } from "../footer/footer";
import{ descifrarId } from "../cifrado";
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

  constructor(private http: HttpClient, private ruta: ActivatedRoute, @Inject(PLATFORM_ID) private platformId: Object){}

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
    this.http.get<number[]>(`${this.movimientosUrl}/estadisticas/anios?usuario=${id}`).subscribe({
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
    this.http.get<EstadisticasDatos>(
      `${this.movimientosUrl}/estadisticas?usuario=${id}&desde=${desde}&hasta=${hasta}`
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
