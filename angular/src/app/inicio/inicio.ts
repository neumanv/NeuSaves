import{ Component } from "@angular/core";
import{ RouterLink } from "@angular/router";
import{ Header } from "../header/header";
import{ Footer } from "../footer/footer";

//Funcionalidad que se muestra en la rejilla de características de la página principal
interface Caracteristica{
  icono: string;
  titulo: string;
  descripcion: string;
}

//Página principal (landing) pública: explica qué es NeuSaves y todo lo que permite hacer.
//No requiere sesión; reutiliza el mismo header y footer que el resto de la app.
@Component({
  selector: "app-inicio",
  standalone: true,
  imports: [RouterLink, Header, Footer],
  templateUrl: "./inicio.html",
  styleUrl: "./inicio.scss"
})
export class Inicio{
  //Bloques de "todo lo que puedes hacer": cada uno se pinta como una tarjeta
  readonly caracteristicas: Caracteristica[] = [
    {
      icono: "bi-cash-coin",
      titulo: "Ingresos y gastos",
      descripcion: "Registra cada movimiento con su tipo, cantidad y descripción, y ve tu saldo actualizado al instante."
    },
    {
      icono: "bi-arrow-repeat",
      titulo: "Movimientos periódicos",
      descripcion: "Automatiza los pagos y cobros que se repiten (nóminas, recibos, suscripciones...) indicando su periodo."
    },
    {
      icono: "bi-flag-fill",
      titulo: "Metas de ahorro",
      descripcion: "Fija objetivos con su título y descripción para mantener el rumbo y motivarte a ahorrar."
    },
    {
      icono: "bi-bar-chart-line",
      titulo: "Estadísticas y gráficos",
      descripcion: "Analiza ingresos vs. gastos, la evolución mensual y el desglose por tipo con gráficos claros."
    },
    {
      icono: "bi-people",
      titulo: "Varios usuarios",
      descripcion: "Gestiona las cuentas de toda la familia: un usuario principal y sus subusuarios, cada uno con sus datos."
    },
    {
      icono: "bi-robot",
      titulo: "FinBot, tu asistente",
      descripcion: "Un chat con IA que entiende tus finanzas y te da consejos de ahorro personalizados sobre tus propios datos."
    },
    {
      icono: "bi-graph-up-arrow",
      titulo: "Cotizaciones de bolsa",
      descripcion: "Consulta de un vistazo la cotización de los principales valores desde tu propio panel."
    },
    {
      icono: "bi-file-earmark-excel",
      titulo: "Exporta a Excel",
      descripcion: "Descarga las cuentas de cualquier año en una hoja de cálculo para guardarlas o revisarlas fuera de la app."
    },
    {
      icono: "bi-shield-lock",
      titulo: "Seguro y privado",
      descripcion: "Verificación por correo, contraseñas cifradas y tus datos siempre bajo tu control."
    }
  ];

  //Pasos para empezar, en el bloque "Cómo funciona"
  readonly pasos = [
    { numero: 1, titulo: "Crea tu cuenta", descripcion: "Regístrate con tu correo y verifícalo con el código que te enviamos." },
    { numero: 2, titulo: "Registra tus movimientos", descripcion: "Añade tus ingresos y gastos, o configúralos como periódicos." },
    { numero: 3, titulo: "Controla y ahorra", descripcion: "Consulta estadísticas, fija metas y deja que FinBot te aconseje." }
  ];
}
