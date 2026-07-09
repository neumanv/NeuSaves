import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
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
  imports: [CommonModule, RouterLink, Header, FooterComponent],
  templateUrl: "./movimientos.html"
})
export class Movimientos implements OnInit{
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";

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

  //Número de página que se muestra al usuario (empieza en 1)
  paginaVisible = computed(() => this.paginaActual() + 1);

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
    this.cargarPagina(0);
  }

  private cargarPagina(pagina: number): void{
    const id = this.idUsuario();
    if (id === null){
      return;
    }
    this.cargando.set(true);
    this.http.get<PaginaMovimientos>(
      `${this.movimientosUrl}/pagina?usuario=${id}&pagina=${pagina}&tamano=${this.TAMANO_PAGINA}`
    ).subscribe({
      next: (datos) =>{
        this.movimientos.set(datos?.contenido ?? []);
        this.paginaActual.set(datos?.pagina ?? 0);
        this.totalPaginas.set(datos?.totalPaginas ?? 0);
        this.totalElementos.set(datos?.totalElementos ?? 0);
        this.cargando.set(false);
      },
      error: (err) =>{
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
}
