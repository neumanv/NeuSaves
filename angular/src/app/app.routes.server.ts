import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
