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
    path: 'quests',
    loadComponent: () =>
      import('./quests/teacher-quests.component').then((m) => m.TeacherQuestsComponent),
  },
  {
    path: 'rewards',
    loadComponent: () =>
      import('./rewards/teacher-rewards.component').then((m) => m.TeacherRewardsComponent),
  },
  {
    path: 'courses/:courseId/templates',
    loadComponent: () =>
      import('./templates/teacher-templates.component').then((m) => m.TeacherTemplatesComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../../shared/settings/settings-page.component')
        .then((m) => m.SettingsPageComponent),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('../../shared/leaderboard/leaderboard-page.component')
        .then((m) => m.LeaderboardPageComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
