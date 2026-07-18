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
  orden?: number;
}

@Component({
  selector: "app-metas",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, FooterComponent],
  templateUrl: "./metas.html"
})
export class Metas implements OnInit{
  private readonly metasUrl = "http://localhost:8080/api/metas-usuario";

  //Número máximo de metas que puede tener un usuario
  readonly MAX_METAS = 13;

  //Token cifrado del usuario en la URL, reutilizado para volver a su panel
  token = "";
  idUsuario = signal<number | null>(null);
  metas = signal<Meta[]>([]);

  //Estado del modal de creación
  modalAbierto = signal(false);
  guardando = signal(false);
  errorCrear = signal("");
  nuevaMeta = { titulo: "", descripcion: "" };

  //Índice de la meta que se está arrastrando (null si no hay arrastre)
  arrastrando = signal<number | null>(null);

  //Meta pendiente de confirmar borrado (null si no hay ninguna)
  metaABorrar = signal<Meta | null>(null);
  borrando = signal(false);

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

  //--- Arrastre para reordenar las metas ---
  //Se usan Pointer Events (no el arrastre nativo HTML5) para que funcione
  //igual con ratón, dedo o lápiz. El arrastre nativo no se dispara al tocar
  //la pantalla y además choca con la emulación táctil del navegador.
  private moverPointer = (evento: PointerEvent) => this.alMoverArrastre(evento);
  private soltarPointer = () => this.alSoltarArrastre();

  //Empieza el arrastre al pulsar sobre el asa de una tarjeta
  alEmpezarArrastre(indice: number, evento: PointerEvent): void{
    evento.preventDefault();
    this.arrastrando.set(indice);
    document.addEventListener("pointermove", this.moverPointer);
    document.addEventListener("pointerup", this.soltarPointer);
    document.addEventListener("pointercancel", this.soltarPointer);
  }

  //Mientras se arrastra, se busca la tarjeta que hay debajo y se reordena en vivo
  private alMoverArrastre(evento: PointerEvent): void{
    const origen = this.arrastrando();
    if (origen === null){
      return;
    }
    //Se evita que la página haga scroll mientras se reordena
    evento.preventDefault();
    const elemento = document.elementFromPoint(evento.clientX, evento.clientY);
    const tarjeta = elemento?.closest("[data-indice]") as HTMLElement | null;
    if (!tarjeta){
      return;
    }
    const destino = Number(tarjeta.dataset["indice"]);
    if (Number.isNaN(destino) || destino === origen){
      return;
    }
    this.metas.update((lista) =>{
      const copia = [...lista];
      const [movida] = copia.splice(origen, 1);
      copia.splice(destino, 0, movida);
      return copia;
    });
    this.arrastrando.set(destino);
  }

  //Al soltar, se limpia el estado y se guarda el nuevo orden en el backend
  private alSoltarArrastre(): void{
    document.removeEventListener("pointermove", this.moverPointer);
    document.removeEventListener("pointerup", this.soltarPointer);
    document.removeEventListener("pointercancel", this.soltarPointer);
    if (this.arrastrando() === null){
      return;
    }
    this.arrastrando.set(null);
    this.guardarOrden();
  }

  private guardarOrden(): void{
    const id = this.idUsuario();
    if (id === null){
      return;
    }
    const ids = this.metas().map((m) => m.idMetaUsuario);
    this.http.put(`${this.metasUrl}/orden?usuario=${id}`, ids).subscribe({
      error: (err) => console.error("Error al guardar el orden:", err)
    });
  }

  //--- Borrado de metas con confirmación ---
  pedirBorrar(meta: Meta): void{
    this.metaABorrar.set(meta);
  }

  cancelarBorrar(): void{
    this.metaABorrar.set(null);
  }

  confirmarBorrar(): void{
    const meta = this.metaABorrar();
    if (!meta){
      return;
    }
    this.borrando.set(true);
    this.http.delete(`${this.metasUrl}/${meta.idMetaUsuario}`).subscribe({
      next: () =>{
        this.metas.update((lista) => lista.filter((m) => m.idMetaUsuario !== meta.idMetaUsuario));
        this.borrando.set(false);
        this.metaABorrar.set(null);
      },
      error: (err) =>{
        this.borrando.set(false);
        console.error("Error al borrar la meta:", err);
      }
    });
  }

  abrirModal(): void{
    //No se abre el modal si ya se alcanzó el máximo de metas
    if (this.metas().length >= this.MAX_METAS){
      return;
    }
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
        //La nueva meta se añade al final (así la coloca el backend)
        this.metas.update((lista) => [...lista, creada]);
        this.guardando.set(false);
        this.modalAbierto.set(false);
      },
      error: (err) =>{
        this.guardando.set(false);
        if (err?.status === 409){
          this.errorCrear.set(`No puedes tener más de ${this.MAX_METAS} metas.`);
        } else {
          this.errorCrear.set("No se pudo crear la meta. Revisa los datos.");
        }
      }
    });
  }
}
