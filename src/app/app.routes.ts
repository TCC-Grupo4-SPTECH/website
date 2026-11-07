import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard },
  { path: 'avistamento', component: Home },
  { path: '**', redirectTo: 'dashboard' },
];
