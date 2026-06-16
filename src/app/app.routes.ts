import { Routes } from '@angular/router';

import { Consultas } from './components/consultas/consultas';
import { Dashboard } from './components/dashboard/dashboard';
import { Dentistas } from './components/dentistas/dentistas';
import { Especialidades } from './components/especialidades/especialidades';
import { Login } from './components/login/login';
import { Materiais } from './components/materiais/materiais';
import { Pacientes } from './components/pacientes/pacientes';
import { Perfil } from './components/perfil/perfil';
import { Relatorios } from './components/relatorios/relatorios';
import { Admin } from './components/admin/admin';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'pacientes', component: Pacientes, canActivate: [authGuard] },
  { path: 'dentistas', component: Dentistas, canActivate: [authGuard] },
  { path: 'especialidades', component: Especialidades, canActivate: [authGuard] },
  { path: 'materiais', component: Materiais, canActivate: [authGuard] },
  { path: 'consultas', component: Consultas, canActivate: [authGuard] },
  { path: 'relatorios', component: Relatorios, canActivate: [authGuard] },
  { path: 'admin', component: Admin, canActivate: [authGuard], data: { perfis: ['ADMIN'] } },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'usuarios', pathMatch: 'full', redirectTo: 'admin' },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
