import{ Component, OnInit, Inject, PLATFORM_ID, signal } from "@angular/core";
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
}

@Component({
  selector: "app-usuario-detalle",
  standalone: true,
  imports: [CommonModule, Header, FooterComponent],
  templateUrl: "./usuario-detalle.html"
})
export class UsuarioDetalle implements OnInit{
  private readonly apiUrl = "http://localhost:8080/api/usuarios";

  usuario = signal<Usuario | null>(null);

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

    //El usuario llega en el estado de la navegación al pulsar la tarjeta
    const estado = history.state as{ usuario?: Usuario };
    if (estado?.usuario){
      this.usuario.set(estado.usuario);
      return;
    }

    //Si se entra directamente por URL (o se refresca), se descifra el token de la ruta
    const id = descifrarId(this.ruta.snapshot.paramMap.get("token") ?? "");
    if (id === null){
      return;
    }
    this.http.get<Usuario[]>(this.apiUrl).subscribe({
      next: (usuarios) => this.usuario.set(usuarios.find((u) => u.idUsuario === id) ?? null),
      error: (err) => console.error("Error al cargar el usuario:", err)
    });
  }
}
