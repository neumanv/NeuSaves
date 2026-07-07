import{ Component, OnInit, Inject, PLATFORM_ID, signal, computed } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ ActivatedRoute } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ descifrarId } from "../cifrado";

interface Usuario{
  idUsuario: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  saldo?: number;
}

@Component({
  selector: "app-usuario-detalle",
  standalone: true,
  imports: [CommonModule, Header, FooterComponent],
  templateUrl: "./usuario-detalle.html"
})
export class UsuarioDetalle implements OnInit{
  private readonly apiUrl = "http://localhost:8080/api/usuarios";
  private readonly movimientosUrl = "http://localhost:8080/api/movimientos-usuarios";

  usuario = signal<Usuario | null>(null);
  //Movimientos del usuario en el mes actual (0 si no hay ninguno)
  movimientosMes = signal(0);

  //Saldo del usuario mostrado, formateado a 2 decimales. Si es null se muestra 0
  saldoTexto = computed(() =>{
    const saldo = this.usuario()?.saldo ?? 0;
    return saldo.toFixed(2);
  });

  //Nivel de saldo para colorearlo: bajo (<300) rojo, medio (300-1000) ámbar, alto (>1000) verde
  saldoNivel = computed<"bajo" | "medio" | "alto">(() =>{
    const saldo = this.usuario()?.saldo ?? 0;
    if (saldo < 300){
      return "bajo";
    }
    if (saldo > 1000){
      return "alto";
    }
    return "medio";
  });

  //Saludo según la hora del día
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

    //El usuario llega en el estado de la navegación al pulsar la tarjeta: se muestra al instante
    const estado = history.state as{ usuario?: Usuario };
    if (estado?.usuario){
      this.usuario.set(estado.usuario);
    }

    //Aun así se recarga del backend por id para tener el saldo actualizado
    const id = descifrarId(this.ruta.snapshot.paramMap.get("token") ?? "");
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

    //Número de movimientos del usuario en el mes actual
    this.http.get<number>(`${this.movimientosUrl}/count?usuario=${id}`).subscribe({
      next: (total) => this.movimientosMes.set(total ?? 0),
      error: (err) => console.error("Error al cargar los movimientos:", err)
    });
  }
}
