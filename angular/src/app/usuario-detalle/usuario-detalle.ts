import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed, ViewChild, ElementRef } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ Footer } from "../footer/footer";
import{ descifrarId } from "../cifrado";
import{ Auth, UsuarioSesion } from "../auth";
import{ environment } from "../environment";
import{ Usuario, UltimoMovimiento, TipoMovimiento, Periodo, CotizacionBolsa, MensajeChat, ChatResponse, MovimientoPayload } from "../models";

interface ResumenMes{
  ingresos: number;
  gastos: number;
}

@Component({
  selector: "app-usuario-detalle",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: "./usuario-detalle.html"
})
export class UsuarioDetalle implements OnInit{
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;
  private readonly movimientosUrl = `${environment.apiUrl}/movimientos-usuarios`;
  private readonly tiposUrl = `${environment.apiUrl}/movimientos`;
  private readonly periodosUrl = `${environment.apiUrl}/periodos`;
  private readonly bolsaUrl = `${environment.apiUrl}/bolsa`;
  private readonly chatUrl = `${environment.apiUrl}/chat`;

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
  //Cotizaciones para la tarjeta "Bolsa" (índices, divisa y Bitcoin)
  bolsa = signal<CotizacionBolsa[]>([]);
  bolsaCargando = signal(true);

  //--- Chat FinBot ---
  @ViewChild("chatScroll") private chatScroll?: ElementRef<HTMLDivElement>;
  //Mensaje de bienvenida: es solo para mostrar (no se envía como historial ni se persiste)
  private readonly mensajeBienvenida: MensajeChat = { rol: "model", texto: "¡Hola! Soy FinBot 🐷. Puedo ayudarte a entender tus finanzas, organizar tu presupuesto y darte consejos de ahorro. ¿Qué quieres saber?" };
  //Nº de mensajes de la conversación que se guardan entre recargas (sin contar la bienvenida)
  private readonly maxMensajesGuardados = 8;
  chatMensajes = signal<MensajeChat[]>([{ rol: "model", texto: "¡Hola! Soy FinBot 🐷. Puedo ayudarte a entender tus finanzas, organizar tu presupuesto y darte consejos de ahorro. ¿Qué quieres saber?" }]);
  chatInput = "";
  chatCargando = signal(false);
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
  private payloadPendiente: MovimientoPayload | null = null;

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

  //Símbolo de la moneda para la tarjeta "Bolsa"
  simboloMoneda(moneda: string): string{
    switch (moneda){
      case "EUR": return "€";
      case "USD": return "$";
      default: return moneda;
    }
  }

  ingresosTexto = computed(() => this.ingresosMes().toFixed(2));
  gastosTexto = computed(() => this.gastosMes().toFixed(2));

  ahorradoMes = computed(() => this.ingresosMes() - this.gastosMes());
  ahorradoTexto = computed(() => this.ahorradoMes().toFixed(2));

  //Tamaño de fuente común a todas las cantidades del panel: se calcula a partir del importe más largo
  //de todos para que ninguno se parta en dos líneas y, a la vez, todas las tarjetas mantengan el
  //mismo tamaño de número (no se reduce solo el largo dejando los demás grandes).
  //A partir de xl el panel pasa a 5 columnas (tarjetas estrechas), por lo que se aplica un tamaño
  //más reducido en ese punto para que las cantidades largas no se salgan de la tarjeta.
  tamanoCantidad = computed(() =>{
    const largo = Math.max(
      this.saldoTexto().length,
      ("+" + this.ingresosTexto()).length,
      ("-" + this.gastosTexto()).length,
      this.ahorradoTexto().length
    );
    if (largo >= 10){
      return "text-xl sm:text-3xl xl:text-xl";
    }
    if (largo >= 8){
      return "text-2xl sm:text-4xl xl:text-2xl";
    }
    return "text-3xl sm:text-5xl xl:text-3xl";
  });

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

  constructor(private http: HttpClient, private ruta: ActivatedRoute, private auth: Auth, @Inject(PLATFORM_ID) private platformId: Object){}

  ngOnInit(): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }

    const estado = history.state as{ usuario?: Usuario };
    if (estado?.usuario){
      this.usuario.set(estado.usuario);
      //Este es ahora el usuario que se gestiona (para "Editar perfil" del menú)
      this.auth.activarUsuario(estado.usuario as unknown as UsuarioSesion);
    }

    this.token = this.ruta.snapshot.paramMap.get("token") ?? "";
    const id = descifrarId(this.token);
    if (id === null){
      return;
    }
    this.idActual.set(id);

    //Recupera la última conversación con FinBot guardada para este usuario
    this.restaurarChat(id);

    this.http.get<Usuario[]>(this.apiUrl).subscribe({
      next: (usuarios) =>{
        const encontrado = usuarios.find((u) => u.idUsuario === id);
        if (encontrado){
          this.usuario.set(encontrado);
          //Datos completos del backend (incluye idUsuarioPrincipal): fija bien el usuario activo
          this.auth.activarUsuario(encontrado as unknown as UsuarioSesion);
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

    //Cotizaciones de bolsa (el backend las cachea, no se recargan al añadir movimientos)
    this.http.get<CotizacionBolsa[]>(this.bolsaUrl).subscribe({
      next: (cotizaciones) =>{
        this.bolsa.set(cotizaciones ?? []);
        this.bolsaCargando.set(false);
      },
      error: (err) =>{
        console.error("Error al cargar la bolsa:", err);
        this.bolsaCargando.set(false);
      }
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

    //Si el movimiento es periódico el periodo es obligatorio; la fecha fin es opcional
    if (this.esPeriodico()){
      if (!this.periodoSel()){
        this.errorMovimiento.set("Selecciona el periodo de repetición.");
        return;
      }
      //Sin fecha fin el movimiento se cobra indefinidamente; si se indica debe ser posterior a hoy
      if (this.nuevoMovimiento.fechaFin && this.nuevoMovimiento.fechaFin <= fecha){
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
      fechaFinMovimiento: this.esPeriodico() && this.nuevoMovimiento.fechaFin ? this.nuevoMovimiento.fechaFin : null
    };
    this.confirmacionMovimiento.set(true);
  }

  cerrarConfirmacionMovimiento(): void{
    this.confirmacionMovimiento.set(false);
    this.payloadPendiente = null;
  }

  //Texto para la confirmación: cuándo se cobrará/ingresará el movimiento periódico por defecto
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
        //409: el usuario ya tiene el máximo de movimientos periódicos
        if (err.status === 409){
          this.errorMovimiento.set("Ya tienes 10 movimientos periódicos (el máximo). Elimina alguno desde tu perfil para añadir otro.");
        }else{
          this.errorMovimiento.set(`No se pudo añadir el ${nombre}. Inténtalo de nuevo.`);
        }
        console.error(`Error al añadir el ${nombre}:`, err);
      }
    });
  }

  //--- Chat FinBot ---
  //Resumen económico que se envía a FinBot para que hable de los datos reales del usuario
  private contextoFinanciero(){
    return{
      nombre: this.usuario()?.nombre ?? null,
      saldo: this.saldo(),
      ingresosMes: this.ingresosMes(),
      gastosMes: this.gastosMes(),
      movimientosMes: this.movimientosMes(),
      movimientosRecientes: this.ultimosMovimientos().map((m) =>
        `${m.tipo}: ${m.gasto === "S" ? "-" : "+"}${m.cantidad.toFixed(2)} € (${m.descripcion})`
      )
    };
  }

  enviarChat(): void{
    const texto = this.chatInput.trim();
    if (!texto || this.chatCargando()){
      return;
    }

    //Historial previo (sin el mensaje de bienvenida inicial) para que Gemini mantenga el contexto
    const historial = this.chatMensajes().slice(1).map((m) => ({ rol: m.rol, texto: m.texto }));

    this.chatMensajes.update((lista) => [...lista, { rol: "user", texto }]);
    this.chatInput = "";
    this.chatCargando.set(true);
    this.guardarChat();
    this.desplazarChat();

    this.http.post<ChatResponse>(this.chatUrl, {
      mensaje: texto,
      historial,
      contexto: this.contextoFinanciero()
    }).subscribe({
      next: (res) =>{
        this.chatMensajes.update((lista) => [...lista, { rol: "model", texto: res.respuesta }]);
        this.chatCargando.set(false);
        this.guardarChat();
        this.desplazarChat();
      },
      error: (err) =>{
        console.error("Error en el chat:", err);
        //429: se ha superado el límite de peticiones por IP; el backend envía el aviso concreto
        const texto = err?.status === 429
          ? (err?.error?.respuesta ?? "Has enviado demasiados mensajes seguidos. Espera un momento y vuelve a intentarlo.")
          : "Ahora mismo no puedo responder. Inténtalo de nuevo en un momento.";
        this.chatMensajes.update((lista) => [...lista, { rol: "model", texto }]);
        this.chatCargando.set(false);
        this.guardarChat();
        this.desplazarChat();
      }
    });
  }

  //Clave de localStorage donde se guarda la conversación de FinBot de cada usuario
  private claveChat(id: number): string{
    return `finbot_chat_${id}`;
  }

  //Guarda los últimos mensajes de la conversación (sin la bienvenida) para este usuario
  private guardarChat(): void{
    const id = this.idActual();
    if (id === null || !isPlatformBrowser(this.platformId)){
      return;
    }
    //Se descarta la bienvenida (índice 0) y se conservan solo los últimos N mensajes
    const conversacion = this.chatMensajes().slice(1).slice(-this.maxMensajesGuardados);
    try{
      localStorage.setItem(this.claveChat(id), JSON.stringify(conversacion));
    }catch (err){
      console.error("No se pudo guardar la conversación de FinBot:", err);
    }
  }

  //Restaura la conversación guardada de este usuario, tras el mensaje de bienvenida
  private restaurarChat(id: number): void{
    if (!isPlatformBrowser(this.platformId)){
      return;
    }
    try{
      const guardado = localStorage.getItem(this.claveChat(id));
      if (!guardado){
        return;
      }
      const conversacion = JSON.parse(guardado) as MensajeChat[];
      if (Array.isArray(conversacion) && conversacion.length > 0){
        this.chatMensajes.set([this.mensajeBienvenida, ...conversacion.slice(-this.maxMensajesGuardados)]);
        this.desplazarChat();
      }
    }catch (err){
      console.error("No se pudo restaurar la conversación de FinBot:", err);
    }
  }

  //Baja el scroll del chat al último mensaje tras pintar la vista
  private desplazarChat(): void{
    setTimeout(() =>{
      const el = this.chatScroll?.nativeElement;
      if (el){
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}