import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
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

@Component({
  selector: "app-usuario-detalle",
  standalone: true,
  imports: [CommonModule, RouterLink, Header, FooterComponent],
  templateUrl: "./usuario-detalle.html"
})
export class UsuarioDetalle implements OnInit{
  private readonly apiUrl = "http://localhost:8080/api/usuarios";
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";

  //Token cifrado del usuario en la URL, reutilizado para enlazar a sus metas
  token = "";
  usuario = signal<Usuario | null>(null);
  movimientosMes = signal(0);
  saldo = signal(0);
  ingresosMes = signal(0);
  gastosMes = signal(0);
  //Últimos 5 movimientos del usuario para la tabla
  ultimosMovimientos = signal<UltimoMovimiento[]>([]);
  saldoTexto = computed(() => this.saldo().toFixed(2));

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

    this.http.get<Usuario[]>(this.apiUrl).subscribe({
      next: (usuarios) =>{
        const encontrado = usuarios.find((u) => u.idUsuario === id);
        if (encontrado){
          this.usuario.set(encontrado);
        }
      },
      error: (err) => console.error("Error al cargar el usuario:", err)
    });

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
}