import { Routes } from '@angular/router';
import { authGuard } from './auth';

//Cada página se carga de forma perezosa (lazy loading): así no entran todas en el bundle inicial,
//que se mantiene pequeño (importante para no superar el presupuesto de tamaño de Angular).
export const routes: Routes = [
  { path: '', loadComponent: () => import('./inicio/inicio').then(m => m.Inicio), title: 'NeuSaves' },
  { path: 'acceso', loadComponent: () => import('./login/login').then(m => m.Login), title: 'NeuSaves' },
  { path: 'panel', loadComponent: () => import('./usuarios/usuarios').then(m => m.Usuarios), canActivate: [authGuard], title: 'NeuSaves' },
  { path: 'panel-usuario/:token', loadComponent: () => import('./usuario-detalle/usuario-detalle').then(m => m.UsuarioDetalle), canActivate: [authGuard], title: 'Panel de usuario' },
  { path: 'movimientos/:token', loadComponent: () => import('./movimientos/movimientos').then(m => m.Movimientos), canActivate: [authGuard], title: 'Movimientos' },
  { path: 'metas/:token', loadComponent: () => import('./metas/metas').then(m => m.Metas), canActivate: [authGuard], title: 'Metas' },
  { path: 'estadisticas/:token', loadComponent: () => import('./estadisticas/estadisticas').then(m => m.Estadisticas), canActivate: [authGuard], title: 'Estadísticas' },
  { path: 'perfil', loadComponent: () => import('./perfil/perfil').then(m => m.Perfil), canActivate: [authGuard], title: 'Editar perfil' },
  { path: '**', redirectTo: '' }
];
