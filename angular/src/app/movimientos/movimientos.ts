import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ descifrarId } from "../cifrado";

//Fila de la lista completa de movimientos
interface MovimientoLista{
  descripcion: string;
  tipo: string;
  gasto: string;
  fechaMovimiento: string;
  cantidad: number;
}

//Tipo de movimiento del catálogo (Nómina, Regalos, ...) para el filtro por tipo
interface TipoMovimiento{
  idMovimiento: number;
  tipo: string;
  gasto: string;
}

//Respuesta paginada del backend (50 movimientos por página)
interface PaginaMovimientos{
  contenido: MovimientoLista[];
  totalPaginas: number;
  totalElementos: number;
  pagina: number;
}

@Component({
  selector: "app-movimientos",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, FooterComponent],
  templateUrl: "./movimientos.html"
})
export class Movimientos implements OnInit{
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";
  private readonly tiposUrl = "http://localhost:8080/api/movimientos";

  //Movimientos por página (debe coincidir con el valor por defecto del backend)
  readonly TAMANO_PAGINA = 50;

  //Token cifrado del usuario en la URL, reutilizado para volver a su panel
  token = "";
  idUsuario = signal<number | null>(null);

  movimientos = signal<MovimientoLista[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  totalElementos = signal(0);
  cargando = signal(false);

  //Contador de peticiones para descartar respuestas obsoletas al filtrar sobre la marcha
  private ultimaPeticion = 0;

  //Número de página que se muestra al usuario (empieza en 1)
  paginaVisible = computed(() => this.paginaActual() + 1);

  //--- Filtros ---
  //Catálogo de tipos de ingreso y de gasto para el desplegable de tipo
  tiposIngreso = signal<TipoMovimiento[]>([]);
  tiposGasto = signal<TipoMovimiento[]>([]);

  //Valores del formulario de filtros (se aplican sobre la marcha)
  filtroGasto = "";      //""=todos, "N"=ingresos, "S"=gastos
  filtroTipo: number | null = null;  //id_movimiento del tipo concreto, o null = todos
  filtroDesde = "";
  filtroHasta = "";
  filtroMin: number | null = null;
  filtroMax: number | null = null;
  errorFiltro = signal<string | null>(null);

  //Desplegable de tipo personalizado (con iconos, como el de "Añadir gasto/ingreso")
  tipoAbierto = signal(false);
  filtroTipoSel = signal<TipoMovimiento | null>(null);

  //Tipos que se muestran en el desplegable según el gasto/ingreso elegido
  tiposFiltro = computed<TipoMovimiento[]>(() =>{
    if (this.gastoSeleccionado() === "N"){
      return this.tiposIngreso();
    }
    if (this.gastoSeleccionado() === "S"){
      return this.tiposGasto();
    }
    return [...this.tiposIngreso(), ...this.tiposGasto()];
  });
  //Señal espejo de filtroGasto para que el computed de tipos reaccione al cambiarlo
  gastoSeleccionado = signal("");

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

    //Catálogo de tipos para el filtro por tipo
    this.http.get<TipoMovimiento[]>(`${this.tiposUrl}?gasto=N`).subscribe({
      next: (tipos) => this.tiposIngreso.set(tipos ?? []),
      error: (err) => console.error("Error al cargar los tipos de ingreso:", err)
    });
    this.http.get<TipoMovimiento[]>(`${this.tiposUrl}?gasto=S`).subscribe({
      next: (tipos) => this.tiposGasto.set(tipos ?? []),
      error: (err) => console.error("Error al cargar los tipos de gasto:", err)
    });

    this.cargarPagina(0);
  }

  private cargarPagina(pagina: number): void{
    const id = this.idUsuario();
    if (id === null){
      return;
    }
    this.cargando.set(true);
    //Solo se añaden a la URL los filtros que tengan valor
    const params = new URLSearchParams({
      usuario: String(id),
      pagina: String(pagina),
      tamano: String(this.TAMANO_PAGINA)
    });
    if (this.filtroGasto){
      params.set("gasto", this.filtroGasto);
    }
    if (this.filtroTipo !== null){
      params.set("tipo", String(this.filtroTipo));
    }
    if (this.filtroDesde){
      params.set("desde", this.filtroDesde);
    }
    if (this.filtroHasta){
      params.set("hasta", this.filtroHasta);
    }
    if (this.filtroMin !== null){
      params.set("min", String(this.filtroMin));
    }
    if (this.filtroMax !== null){
      params.set("max", String(this.filtroMax));
    }
    //Al filtrar sobre la marcha se lanzan peticiones seguidas: se numera cada una y solo
    //se aplica la respuesta si sigue siendo la última, para que una respuesta tardía no pise a otra más reciente
    const peticion = ++this.ultimaPeticion;
    this.http.get<PaginaMovimientos>(
      `${this.movimientosUrl}/pagina?${params.toString()}`
    ).subscribe({
      next: (datos) =>{
        if (peticion !== this.ultimaPeticion){
          return;
        }
        this.movimientos.set(datos?.contenido ?? []);
        this.paginaActual.set(datos?.pagina ?? 0);
        this.totalPaginas.set(datos?.totalPaginas ?? 0);
        this.totalElementos.set(datos?.totalElementos ?? 0);
        this.cargando.set(false);
      },
      error: (err) =>{
        if (peticion !== this.ultimaPeticion){
          return;
        }
        this.cargando.set(false);
        console.error("Error al cargar los movimientos:", err);
      }
    });
  }

  paginaAnterior(): void{
    if (this.paginaActual() > 0){
      this.cargarPagina(this.paginaActual() - 1);
    }
  }

  paginaSiguiente(): void{
    if (this.paginaActual() + 1 < this.totalPaginas()){
      this.cargarPagina(this.paginaActual() + 1);
    }
  }

  //--- Filtros ---
  //Al cambiar entre ingresos/gastos/todos se resetea el tipo concreto (ya no aplica al nuevo grupo)
  //y se aplica el filtro sobre la marcha
  cambiarGasto(valor: string): void{
    this.filtroGasto = valor;
    this.gastoSeleccionado.set(valor);
    this.filtroTipo = null;
    this.filtroTipoSel.set(null);
    this.tipoAbierto.set(false);
    this.aplicarFiltros();
  }

  //--- Desplegable de tipo (personalizado, con iconos) ---
  toggleTipoFiltro(): void{
    this.tipoAbierto.update((abierto) => !abierto);
  }

  cerrarTipoFiltro(): void{
    this.tipoAbierto.set(false);
  }

  //Selecciona un tipo concreto (o null = todos los tipos) y aplica el filtro sobre la marcha
  seleccionarTipoFiltro(tipo: TipoMovimiento | null): void{
    this.filtroTipoSel.set(tipo);
    this.filtroTipo = tipo ? tipo.idMovimiento : null;
    this.tipoAbierto.set(false);
    this.aplicarFiltros();
  }

  //Valida los rangos y recarga desde la primera página con los filtros aplicados
  aplicarFiltros(): void{
    this.errorFiltro.set(null);
    if (this.filtroDesde && this.filtroHasta && this.filtroHasta < this.filtroDesde){
      this.errorFiltro.set("La fecha 'hasta' no puede ser anterior a 'desde'.");
      return;
    }
    if (this.filtroMin !== null && this.filtroMax !== null && this.filtroMax < this.filtroMin){
      this.errorFiltro.set("La cantidad máxima no puede ser menor que la mínima.");
      return;
    }
    this.cargarPagina(0);
  }

  //Limpia todos los filtros y recarga la lista completa
  limpiarFiltros(): void{
    this.filtroGasto = "";
    this.gastoSeleccionado.set("");
    this.filtroTipo = null;
    this.filtroTipoSel.set(null);
    this.tipoAbierto.set(false);
    this.filtroDesde = "";
    this.filtroHasta = "";
    this.filtroMin = null;
    this.filtroMax = null;
    this.errorFiltro.set(null);
    this.cargarPagina(0);
  }

  //Indica si hay algún filtro activo, para mostrar mensajes adecuados
  hayFiltros(): boolean{
    return !!(this.filtroGasto || this.filtroTipo !== null || this.filtroDesde
      || this.filtroHasta || this.filtroMin !== null || this.filtroMax !== null);
  }
}
