import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard },
  { path: 'avistamento', component: Home },
  {
    path: 'avistamentos',
    loadComponent: () => import('./pages/sightings/camera-list/camera-list').then((module) => module.CameraList),
  },
  {
    path: 'avistamentos/:cameraId',
    loadComponent: () => import('./pages/sightings/camera-sightings/camera-sightings').then((module) => module.CameraSightings),
  },
  { path: '**', redirectTo: 'dashboard' },
];
