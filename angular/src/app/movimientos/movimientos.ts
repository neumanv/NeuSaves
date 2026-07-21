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
import{ Periodo, TipoMovimiento, MovimientoLista, PaginaMovimientos, MovimientoPayload } from "../models";

@Component({
  selector: "app-movimientos",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: "./movimientos.html"
})
export class Movimientos implements OnInit{
  private readonly movimientosUrl = `${environment.apiUrl}/movimientos-usuarios`;
  private readonly tiposUrl = `${environment.apiUrl}/movimientos`;
  private readonly periodosUrl = `${environment.apiUrl}/periodos`;

  readonly TAMANO_PAGINA = 30;

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

  //--- Modal "Añadir ingreso" / "Añadir gasto" ---
  modalMovimiento = signal<"N" | "S" | null>(null);
  esGasto = computed(() => this.modalMovimiento() === "S");
  modalTipoAbierto = signal(false);
  tipoSel = signal<TipoMovimiento | null>(null);
  guardandoMovimiento = signal(false);
  errorMovimiento = signal<string | null>(null);
  nuevoMovimiento: { descripcion: string; cantidad: number | null; fechaFin: string } = { descripcion: "", cantidad: null, fechaFin: "" };
  confirmacionMovimiento = signal(false);
  private payloadPendiente: MovimientoPayload | null = null;
  periodos = signal<Periodo[]>([]);
  esPeriodico = signal(false);
  periodoAbierto = signal(false);
  periodoSel = signal<Periodo | null>(null);

  get manana(): string{
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

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

  //Tipos del modal según gasto/ingreso
  tiposModal = computed(() => this.esGasto() ? this.tiposGasto() : this.tiposIngreso());

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


  constructor(private http: HttpClient, private ruta: ActivatedRoute, private auth: Auth, @Inject(PLATFORM_ID) private platformId: Object){}

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
    this.http.get<Periodo[]>(this.periodosUrl).subscribe({
      next: (periodos) => this.periodos.set(periodos ?? []),
      error: (err) => console.error("Error al cargar los periodos:", err)
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
      pagina: String(pagina),
      tamano: String(this.TAMANO_PAGINA)
    });
    //El usuario solo se envía cuando se consulta un subusuario (distinto del principal autenticado)
    const principal = this.auth.usuario();
    if (principal && id !== principal.idUsuario){
      params.set("usuario", String(id));
    }
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

  //--- Modal "Añadir ingreso" / "Añadir gasto" ---
  abrirModalMovimiento(gasto: "N" | "S"): void{
    this.nuevoMovimiento = { descripcion: "", cantidad: null, fechaFin: "" };
    this.tipoSel.set(null);
    this.modalTipoAbierto.set(false);
    this.esPeriodico.set(false);
    this.periodoSel.set(null);
    this.periodoAbierto.set(false);
    this.errorMovimiento.set(null);
    this.modalMovimiento.set(gasto);
  }

  cerrarModalMovimiento(): void{
    this.modalMovimiento.set(null);
    this.modalTipoAbierto.set(false);
  }

  toggleTipoModal(): void{
    this.modalTipoAbierto.update((v) => !v);
  }

  cerrarTipoModal(): void{
    this.modalTipoAbierto.set(false);
  }

  seleccionarTipo(tipo: TipoMovimiento): void{
    this.tipoSel.set(tipo);
    this.modalTipoAbierto.set(false);
  }

  togglePeriodico(): void{
    this.esPeriodico.update((v) => !v);
    if (!this.esPeriodico()){
      this.periodoSel.set(null);
      this.periodoAbierto.set(false);
      this.nuevoMovimiento.fechaFin = "";
    }
  }

  togglePeriodo(): void{
    this.periodoAbierto.update((v) => !v);
  }

  cerrarPeriodo(): void{
    this.periodoAbierto.set(false);
  }

  seleccionarPeriodo(periodo: Periodo): void{
    this.periodoSel.set(periodo);
    this.periodoAbierto.set(false);
  }

  limitarDescripcion(event: Event): void{
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea.value.length > 100){
      this.nuevoMovimiento.descripcion = textarea.value.substring(0, 100);
      textarea.value = this.nuevoMovimiento.descripcion;
    }
  }

  limitarCantidad(event: Event): void{
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/[^\d.]/g, "");
    if (valor.length > 9){ valor = valor.substring(0, 9); }
    if (valor){
      const num = parseFloat(valor);
      this.nuevoMovimiento.cantidad = isNaN(num) ? null : num;
    }else{
      this.nuevoMovimiento.cantidad = null;
    }
    input.value = valor;
  }

  guardarMovimiento(): void{
    const id = this.idUsuario();
    const tipo = this.tipoSel();
    const cantidad = this.nuevoMovimiento.cantidad;
    const nombre = this.esGasto() ? "gasto" : "ingreso";
    this.errorMovimiento.set(null);
    if (id === null){ return; }
    if (!tipo){ this.errorMovimiento.set(`Selecciona un tipo de ${nombre}.`); return; }
    if (!this.nuevoMovimiento.descripcion.trim()){ this.errorMovimiento.set("La descripción es obligatoria."); return; }
    if (cantidad === null || isNaN(cantidad) || cantidad <= 0){ this.errorMovimiento.set("Introduce una cantidad mayor que 0."); return; }
    if (cantidad > 999999.99){ this.errorMovimiento.set("La cantidad máxima por movimiento es 999.999,99 €."); return; }
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    if (this.esPeriodico()){
      if (!this.periodoSel()){ this.errorMovimiento.set("Selecciona el periodo de repetición."); return; }
      //La fecha fin es opcional: sin ella el movimiento se cobra indefinidamente
      if (this.nuevoMovimiento.fechaFin && this.nuevoMovimiento.fechaFin <= fecha){ this.errorMovimiento.set("La fecha fin debe ser posterior a hoy."); return; }
    }
    this.payloadPendiente = {
      idUsuario: id,
      idMovimiento: tipo.idMovimiento,
      descripcion: this.nuevoMovimiento.descripcion.trim(),
      cantidad,
      fechaMovimiento: fecha,
      idPeriodo: this.esPeriodico() ? this.periodoSel()!.idPeriodo : null,
      fechaFinMovimiento: this.esPeriodico() && this.nuevoMovimiento.fechaFin ? this.nuevoMovimiento.fechaFin : null
    };
    this.confirmacionMovimiento.set(true);
  }

  cerrarConfirmacionMovimiento(): void{
    this.confirmacionMovimiento.set(false);
    this.payloadPendiente = null;
  }

  textoCobroPeriodico(): string{
    switch (this.periodoSel()?.periodo){
      case "Diario": return "cada día";
      case "Semanal": return "cada lunes (primer día de la semana)";
      case "Mensual": return "el día 1 de cada mes";
      case "2 meses": return "el día 1 cada 2 meses";
      case "Anual": return "cada 1 de enero (primer día del año)";
      default: return "";
    }
  }

  confirmarGuardarMovimiento(): void{
    const id = this.idUsuario();
    const nombre = this.esGasto() ? "gasto" : "ingreso";
    if (id === null || !this.payloadPendiente){ return; }
    this.guardandoMovimiento.set(true);
    this.http.post(this.movimientosUrl, this.payloadPendiente).subscribe({
      next: () =>{
        this.guardandoMovimiento.set(false);
        this.confirmacionMovimiento.set(false);
        this.payloadPendiente = null;
        this.cerrarModalMovimiento();
        this.cargarPagina(this.paginaActual());
      },
      error: (err) =>{
        this.guardandoMovimiento.set(false);
        this.confirmacionMovimiento.set(false);
        if (err.status === 409){
          this.errorMovimiento.set("Ya tienes 10 movimientos periódicos (el máximo). Elimina alguno desde tu perfil para añadir otro.");
        }else{
          this.errorMovimiento.set(`No se pudo añadir el ${nombre}. Inténtalo de nuevo.`);
        }
        console.error(`Error al añadir el ${nombre}:`, err);
      }
    });
  }
}
