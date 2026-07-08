import{ Component, OnInit, Inject, PLATFORM_ID, signal } from "@angular/core";
import{ HttpClient } from "@angular/common/http";
import{ CommonModule, isPlatformBrowser } from "@angular/common";
import{ FormsModule } from "@angular/forms";
import{ ActivatedRoute, RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ FooterComponent } from "../footer/footer";
import{ descifrarId } from "../cifrado";

interface Meta{
  idMetaUsuario: number;
  idUsuario: number;
  titulo: string;
  descripcion: string;
  completado: string; //'S' | 'N'
}

@Component({
  selector: "app-metas",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, FooterComponent],
  templateUrl: "./metas.html"
})
export class Metas implements OnInit{
  private readonly metasUrl = "http://localhost:8080/api/metas-usuario";

  //Token cifrado del usuario en la URL, reutilizado para volver a su panel
  token = "";
  idUsuario = signal<number | null>(null);
  metas = signal<Meta[]>([]);

  //Estado del modal de creación
  modalAbierto = signal(false);
  guardando = signal(false);
  errorCrear = signal("");
  nuevaMeta = { titulo: "", descripcion: "" };

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
    this.cargarMetas();
  }

  private cargarMetas(): void{
    const id = this.idUsuario();
    if (id === null){
      return;
    }
    this.http.get<Meta[]>(`${this.metasUrl}?usuario=${id}`).subscribe({
      next: (metas) => this.metas.set(metas ?? []),
      error: (err) => console.error("Error al cargar las metas:", err)
    });
  }

  //Marca/desmarca una meta como completada y lo persiste
  alternarCompletado(meta: Meta): void{
    const nuevo = meta.completado === "S" ? "N" : "S";
    this.http.patch<Meta>(`${this.metasUrl}/${meta.idMetaUsuario}/completado?valor=${nuevo}`, {}).subscribe({
      next: (actualizada) => this.metas.update((lista) =>
        lista.map((m) => m.idMetaUsuario === meta.idMetaUsuario ? actualizada : m)),
      error: (err) => console.error("Error al actualizar la meta:", err)
    });
  }

  abrirModal(): void{
    this.nuevaMeta = { titulo: "", descripcion: "" };
    this.errorCrear.set("");
    this.modalAbierto.set(true);
  }

  cerrarModal(): void{
    this.modalAbierto.set(false);
  }

  crearMeta(): void{
    const id = this.idUsuario();
    const titulo = this.nuevaMeta.titulo.trim();
    const descripcion = this.nuevaMeta.descripcion.trim();
    if (id === null || !titulo || !descripcion){
      this.errorCrear.set("El título y la descripción son obligatorios.");
      return;
    }

    this.guardando.set(true);
    this.http.post<Meta>(this.metasUrl, { idUsuario: id, titulo, descripcion }).subscribe({
      next: (creada) =>{
        this.metas.update((lista) => [creada, ...lista]);
        this.guardando.set(false);
        this.modalAbierto.set(false);
      },
      error: () =>{
        this.guardando.set(false);
        this.errorCrear.set("No se pudo crear la meta. Revisa los datos.");
      }
    });
  }
}
