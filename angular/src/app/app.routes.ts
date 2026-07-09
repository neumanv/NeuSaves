import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Usuarios } from './usuarios/usuarios';
import { UsuarioDetalle } from './usuario-detalle/usuario-detalle';
import { Movimientos } from './movimientos/movimientos';
import { Metas } from './metas/metas';
import { Perfil } from './perfil/perfil';
import { authGuard } from './auth';

export const routes: Routes = [
  { path: '', component: Login, title: 'NeuSaves' },
  { path: 'panel', component: Usuarios, canActivate: [authGuard], title: 'NeuSaves' },
  { path: 'panel-usuario/:token', component: UsuarioDetalle, canActivate: [authGuard], title: 'Panel de usuario' },
  { path: 'movimientos/:token', component: Movimientos, canActivate: [authGuard], title: 'Movimientos' },
  { path: 'metas/:token', component: Metas, canActivate: [authGuard], title: 'Metas' },
  { path: 'perfil', component: Perfil, canActivate: [authGuard], title: 'Editar perfil' },
  { path: '**', redirectTo: '' }
];