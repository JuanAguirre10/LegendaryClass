import { Routes } from '@angular/router';

export const directorRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/director-dashboard.component').then((m) => m.DirectorDashboardComponent),
  },
  {
    path: 'teachers',
    loadComponent: () =>
      import('./teachers/director-teachers.component').then((m) => m.DirectorTeachersComponent),
  },
  {
    path: 'students',
    loadComponent: () =>
      import('./students/director-students.component').then((m) => m.DirectorStudentsComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/director-reports.component').then((m) => m.DirectorReportsComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
