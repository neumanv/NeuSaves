import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    //Se renderiza en el navegador: si se prerenderizara, nginx crearía una carpeta física
    //"acceso/" y al pedir "/acceso" (sin barra final) redirigiría a "/acceso/" con el puerto
    //interno del contenedor en vez del puerto real mapeado por Docker, dejando la pantalla en blanco
    path: 'acceso',
    renderMode: RenderMode.Client
  },
  {
    //Rutas con sesión: se renderizan en el navegador (dependen de sessionStorage)
    path: 'panel',
    renderMode: RenderMode.Client
  },
  {
    //Ruta con parámetro: se renderiza en el navegador (no se puede prerenderizar)
    path: 'panel-usuario/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'movimientos/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'metas/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'estadisticas/:token',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
