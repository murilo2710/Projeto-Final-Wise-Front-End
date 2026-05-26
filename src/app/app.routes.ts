import { Routes } from '@angular/router';

import { Dentistas } from './components/dentistas/dentistas';
import { Login } from './components/login/login';
import { Pacientes } from './components/pacientes/pacientes';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'pacientes', component: Pacientes },
  { path: 'dentistas', component: Dentistas },
  { path: '', pathMatch: 'full', redirectTo: 'pacientes' },
  { path: '**', redirectTo: 'pacientes' }
];
