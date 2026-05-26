import { Routes } from '@angular/router';

import { Login } from './components/login/login';
import { Pacientes } from './components/pacientes/pacientes';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'pacientes', component: Pacientes },
  { path: '', pathMatch: 'full', redirectTo: 'pacientes' },
  { path: '**', redirectTo: 'pacientes' }
];
