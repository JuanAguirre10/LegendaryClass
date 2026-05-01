import { Routes } from '@angular/router';

export const parentRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/parent-dashboard.component').then((m) => m.ParentDashboardComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
