import { Routes } from '@angular/router';

export const directorRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/director-dashboard.component').then((m) => m.DirectorDashboardComponent),
  },
  {
    path: 'classrooms',
    loadComponent: () =>
      import('./classrooms/director-classrooms.component').then((m) => m.DirectorClassroomsComponent),
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
    path: 'users',
    loadComponent: () =>
      import('./users/director-users.component').then((m) => m.DirectorUsersComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/director-reports.component').then((m) => m.DirectorReportsComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
