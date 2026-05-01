import { Routes } from '@angular/router';

export const studentRoutes: Routes = [
  {
    path: 'character-select',
    loadComponent: () =>
      import('./character-select/character-select.component').then((m) => m.CharacterSelectComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/student-dashboard.component').then((m) => m.StudentDashboardComponent),
  },
  {
    path: 'classrooms',
    loadComponent: () =>
      import('./classrooms/student-classrooms.component').then((m) => m.StudentClassroomsComponent),
  },
  {
    path: 'classrooms/:id',
    loadComponent: () =>
      import('./classrooms/classroom-detail.component').then((m) => m.ClassroomDetailComponent),
  },
  {
    path: 'quests',
    loadComponent: () =>
      import('./quests/student-quests.component').then((m) => m.StudentQuestsComponent),
  },
  {
    path: 'achievements',
    loadComponent: () =>
      import('./achievements/student-achievements.component').then((m) => m.StudentAchievementsComponent),
  },
  {
    path: 'rewards',
    loadComponent: () =>
      import('./rewards/student-rewards.component').then((m) => m.StudentRewardsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/student-profile.component').then((m) => m.StudentProfileComponent),
  },
  {
    path: 'join-classroom',
    loadComponent: () =>
      import('./join-classroom/join-classroom.component').then((m) => m.JoinClassroomComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
