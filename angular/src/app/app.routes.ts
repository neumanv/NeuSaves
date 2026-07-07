import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Usuarios } from './usuarios/usuarios';
import { UsuarioDetalle } from './usuario-detalle/usuario-detalle';
import { authGuard } from './auth';

export const routes: Routes = [
  { path: '', component: Login, title: 'NeuSaves' },
  { path: 'panel', component: Usuarios, canActivate: [authGuard], title: 'NeuSaves' },
  { path: 'panel-usuario/:token', component: UsuarioDetalle, canActivate: [authGuard], title: 'Panel de usuario' },
  { path: '**', redirectTo: '' }
];
