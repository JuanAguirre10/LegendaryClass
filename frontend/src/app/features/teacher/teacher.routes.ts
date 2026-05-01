import { Routes } from '@angular/router';

export const teacherRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/teacher-dashboard.component').then((m) => m.TeacherDashboardComponent),
  },
  {
    path: 'classrooms',
    loadComponent: () =>
      import('./classrooms/teacher-classrooms.component').then((m) => m.TeacherClassroomsComponent),
  },
  {
    path: 'classrooms/:slug',
    loadComponent: () =>
      import('./classrooms/classroom-detail.component').then((m) => m.TeacherClassroomDetailComponent),
  },
  {
    path: 'behaviors',
    loadComponent: () =>
      import('./behaviors/teacher-behaviors.component').then((m) => m.TeacherBehaviorsComponent),
  },
  {
    path: 'rewards',
    loadComponent: () =>
      import('./rewards/teacher-rewards.component').then((m) => m.TeacherRewardsComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
