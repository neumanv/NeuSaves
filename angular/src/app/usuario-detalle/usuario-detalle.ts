import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ descifrarId } from "../cifrado";

interface Usuario{
  idUsuario: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
}

interface ResumenMes{
  ingresos: number;
  gastos: number;
}

//Fila de la tabla de últimos movimientos
interface UltimoMovimiento{
  descripcion: string;
  tipo: string;
  gasto: string;
  fechaMovimiento: string;
  cantidad: number;
}

//Tipo de movimiento del catálogo (Nómina, Regalos, ...) para el desplegable de "Añadir ingreso"
interface TipoMovimiento{
  idMovimiento: number;
  tipo: string;
  gasto: string;
}

//Periodo de repetición del catálogo (Diario, Semanal, ...) para los movimientos periódicos
interface Periodo{
  idPeriodo: number;
  periodo: string;
}

@Component({
  selector: "app-usuario-detalle",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, FooterComponent],
  templateUrl: "./usuario-detalle.html"
})
export class UsuarioDetalle implements OnInit{
  private readonly apiUrl = "http://localhost:8080/api/usuarios";
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";
  private readonly tiposUrl = "http://localhost:8080/api/movimientos";
  private readonly periodosUrl = "http://localhost:8080/api/periodos";

  //Token cifrado del usuario en la URL, reutilizado para enlazar a sus metas
  token = "";
  //Id del usuario ya descifrado, para recargar los datos tras añadir un movimiento
  idActual = signal<number | null>(null);
  usuario = signal<Usuario | null>(null);
  movimientosMes = signal(0);
  saldo = signal(0);
  ingresosMes = signal(0);
  gastosMes = signal(0);
  //Últimos 5 movimientos del usuario para la tabla
  ultimosMovimientos = signal<UltimoMovimiento[]>([]);
  saldoTexto = computed(() => this.saldo().toFixed(2));

  //--- Modal "Añadir ingreso" / "Añadir gasto" ---
  tiposIngreso = signal<TipoMovimiento[]>([]);
  tiposGasto = signal<TipoMovimiento[]>([]);
  //null = cerrado; "N" = añadir ingreso; "S" = añadir gasto
  modalMovimiento = signal<"N" | "S" | null>(null);
  esGasto = computed(() => this.modalMovimiento() === "S");
  //Tipos que se muestran en el desplegable según el modo del modal
  tiposModal = computed(() => this.esGasto() ? this.tiposGasto() : this.tiposIngreso());
  tipoAbierto = signal(false);
  tipoSel = signal<TipoMovimiento | null>(null);
  guardandoMovimiento = signal(false);
  errorMovimiento = signal<string | null>(null);
  nuevoMovimiento: { descripcion: string; cantidad: number | null; fechaFin: string } = { descripcion: "", cantidad: null, fechaFin: "" };

  //Confirmación previa al guardado: el movimiento no se puede borrar después
  confirmacionMovimiento = signal(false);
  private payloadPendiente: any = null;

  //Movimiento periódico: check, desplegable de periodos y fecha fin
  periodos = signal<Periodo[]>([]);
  esPeriodico = signal(false);
  periodoAbierto = signal(false);
  periodoSel = signal<Periodo | null>(null);

  //Fecha mínima para la fecha fin del movimiento periódico (mañana)
  get manana(): string{
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

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

  saldoNivel = computed<"bajo" | "medio" | "alto">(() =>{
    const saldo = this.saldo();
    if (saldo < 300){
      return "bajo";
    }
    if (saldo > 1000){
      return "alto";
    }
    return "medio";
  });

  ingresosTexto = computed(() => this.ingresosMes().toFixed(2));
  gastosTexto = computed(() => this.gastosMes().toFixed(2));

  ahorradoMes = computed(() => this.ingresosMes() - this.gastosMes());
  ahorradoTexto = computed(() => this.ahorradoMes().toFixed(2));

  ahorradoNivel = computed<"bajo" | "medio" | "alto">(() =>{
    const ahorrado = this.ahorradoMes();
    if (ahorrado <= 400){
      return "bajo";
    }
    if (ahorrado > 500){
      return "alto";
    }
    return "medio";
  });

  get saludo(): string{
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12){
      return "Buenos días";
    }
    if (hora >= 12 && hora < 21){
      return "Buenas tardes";
    }
    return "Buenas noches";
  }

  constructor(private http: HttpClient, private ruta: ActivatedRoute, @Inject(PLATFORM_ID) private platformId: Object){}

  ngOnInit(): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }

    const estado = history.state as{ usuario?: Usuario };
    if (estado?.usuario){
      this.usuario.set(estado.usuario);
    }

    this.token = this.ruta.snapshot.paramMap.get("token") ?? "";
    const id = descifrarId(this.token);
    if (id === null){
      return;
    }
    this.idActual.set(id);

    this.http.get<Usuario[]>(this.apiUrl).subscribe({
      next: (usuarios) =>{
        const encontrado = usuarios.find((u) => u.idUsuario === id);
        if (encontrado){
          this.usuario.set(encontrado);
        }
      },
      error: (err) => console.error("Error al cargar el usuario:", err)
    });

    //Tipos de ingreso y de gasto para el desplegable del modal
    this.http.get<TipoMovimiento[]>(`${this.tiposUrl}?gasto=N`).subscribe({
      next: (tipos) => this.tiposIngreso.set(tipos ?? []),
      error: (err) => console.error("Error al cargar los tipos de ingreso:", err)
    });

    this.http.get<TipoMovimiento[]>(`${this.tiposUrl}?gasto=S`).subscribe({
      next: (tipos) => this.tiposGasto.set(tipos ?? []),
      error: (err) => console.error("Error al cargar los tipos de gasto:", err)
    });

    //Periodos de repetición para los movimientos periódicos
    this.http.get<Periodo[]>(this.periodosUrl).subscribe({
      next: (periodos) => this.periodos.set(periodos ?? []),
      error: (err) => console.error("Error al cargar los periodos:", err)
    });

    this.cargarDatos(id);
  }

  //Carga (o recarga) los importes y la tabla de movimientos del usuario
  private cargarDatos(id: number): void{
    this.http.get<number>(`${this.movimientosUrl}/count?usuario=${id}`).subscribe({
      next: (total) => this.movimientosMes.set(total ?? 0),
      error: (err) => console.error("Error al cargar los movimientos:", err)
    });

    this.http.get<number>(`${this.movimientosUrl}/saldo?usuario=${id}`).subscribe({
      next: (saldo) => this.saldo.set(saldo ?? 0),
      error: (err) => console.error("Error al cargar el saldo:", err)
    });

    this.http.get<ResumenMes>(`${this.movimientosUrl}/resumen-mes?usuario=${id}`).subscribe({
      next: (resumen) =>{
        this.ingresosMes.set(resumen?.ingresos ?? 0);
        this.gastosMes.set(resumen?.gastos ?? 0);
      },
      error: (err) => console.error("Error al cargar el resumen del mes:", err)
    });

    //Últimos 5 movimientos
    this.http.get<UltimoMovimiento[]>(`${this.movimientosUrl}/ultimos?usuario=${id}&limite=5`).subscribe({
      next: (movimientos) => this.ultimosMovimientos.set(movimientos ?? []),
      error: (err) => console.error("Error al cargar los últimos movimientos:", err)
    });
  }

  //--- Modal "Añadir ingreso" / "Añadir gasto" ---
  abrirModalMovimiento(gasto: "N" | "S"): void{
    this.nuevoMovimiento = { descripcion: "", cantidad: null, fechaFin: "" };
    this.tipoSel.set(null);
    this.tipoAbierto.set(false);
    this.esPeriodico.set(false);
    this.periodoSel.set(null);
    this.periodoAbierto.set(false);
    this.errorMovimiento.set(null);
    this.modalMovimiento.set(gasto);
  }

  cerrarModalMovimiento(): void{
    this.modalMovimiento.set(null);
    this.tipoAbierto.set(false);
  }

  toggleTipo(): void{
    this.tipoAbierto.update((abierto) => !abierto);
  }

  cerrarTipo(): void{
    this.tipoAbierto.set(false);
  }

  seleccionarTipo(tipo: TipoMovimiento): void{
    this.tipoSel.set(tipo);
    this.tipoAbierto.set(false);
  }

  //--- Movimiento periódico ---
  togglePeriodico(): void{
    this.esPeriodico.update((activo) => !activo);
    //Al desmarcar el check se limpian el periodo y la fecha fin
    if (!this.esPeriodico()){
      this.periodoSel.set(null);
      this.periodoAbierto.set(false);
      this.nuevoMovimiento.fechaFin = "";
    }
  }

  togglePeriodo(): void{
    this.periodoAbierto.update((abierto) => !abierto);
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

    if (valor.length > 9){
      valor = valor.substring(0, 9);
    }

    if (valor){
      const num = parseFloat(valor);
      this.nuevoMovimiento.cantidad = isNaN(num) ? null : num;
    } else{
      this.nuevoMovimiento.cantidad = null;
    }

    input.value = valor;
  }

  guardarMovimiento(): void{
    const id = this.idActual();
    const tipo = this.tipoSel();
    const cantidad = this.nuevoMovimiento.cantidad;
    const nombre = this.esGasto() ? "gasto" : "ingreso";
    this.errorMovimiento.set(null);

    if (id === null){
      return;
    }
    if (!tipo){
      this.errorMovimiento.set(`Selecciona un tipo de ${nombre}.`);
      return;
    }
    if (!this.nuevoMovimiento.descripcion.trim()){
      this.errorMovimiento.set("La descripción es obligatoria.");
      return;
    }
    if (cantidad === null || isNaN(cantidad) || cantidad <= 0){
      this.errorMovimiento.set("Introduce una cantidad mayor que 0.");
      return;
    }
    if (cantidad > 999999.99){
      this.errorMovimiento.set("La cantidad máxima por movimiento es 999.999,99 €.");
      return;
    }

    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    //Si el movimiento es periódico, el periodo y la fecha fin son obligatorios
    if (this.esPeriodico()){
      if (!this.periodoSel()){
        this.errorMovimiento.set("Selecciona el periodo de repetición.");
        return;
      }
      if (!this.nuevoMovimiento.fechaFin){
        this.errorMovimiento.set("Selecciona la fecha fin del movimiento.");
        return;
      }
      if (this.nuevoMovimiento.fechaFin <= fecha){
        this.errorMovimiento.set("La fecha fin debe ser posterior a hoy.");
        return;
      }
    }

    //Los datos son válidos: se guarda el payload y se pide confirmación antes de enviarlo
    this.payloadPendiente = {
      idUsuario: id,
      idMovimiento: tipo.idMovimiento,
      descripcion: this.nuevoMovimiento.descripcion.trim(),
      cantidad: cantidad,
      fechaMovimiento: fecha,
      idPeriodo: this.esPeriodico() ? this.periodoSel()!.idPeriodo : null,
      fechaFinMovimiento: this.esPeriodico() ? this.nuevoMovimiento.fechaFin : null
    };
    this.confirmacionMovimiento.set(true);
  }

  cerrarConfirmacionMovimiento(): void{
    this.confirmacionMovimiento.set(false);
    this.payloadPendiente = null;
  }

  confirmarGuardarMovimiento(): void{
    const id = this.idActual();
    const nombre = this.esGasto() ? "gasto" : "ingreso";
    if (id === null || !this.payloadPendiente){
      return;
    }

    this.guardandoMovimiento.set(true);
    this.http.post(this.movimientosUrl, this.payloadPendiente).subscribe({
      next: () =>{
        this.guardandoMovimiento.set(false);
        this.confirmacionMovimiento.set(false);
        this.payloadPendiente = null;
        this.cerrarModalMovimiento();
        //Recarga saldo, resumen y últimos movimientos: el nuevo saldo ya incluye el movimiento
        this.cargarDatos(id);
      },
      error: (err) =>{
        this.guardandoMovimiento.set(false);
        this.confirmacionMovimiento.set(false);
        this.errorMovimiento.set(`No se pudo añadir el ${nombre}. Inténtalo de nuevo.`);
        console.error(`Error al añadir el ${nombre}:`, err);
      }
    });
  }
}