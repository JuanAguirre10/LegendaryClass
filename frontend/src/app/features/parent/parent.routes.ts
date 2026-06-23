import { Routes } from '@angular/router';

export const parentRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/parent-dashboard.component').then((m) => m.ParentDashboardComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../../shared/settings/settings-page.component')
        .then((m) => m.SettingsPageComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
