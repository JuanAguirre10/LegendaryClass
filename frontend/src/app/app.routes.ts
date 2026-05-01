import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  // Sección pública con layout compartido (navbar + footer)
  {
    path: '',
    loadComponent: () =>
      import('./features/public/layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/public/pages/home-page/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: 'caracteristicas',
        loadComponent: () =>
          import('./features/public/pages/features-page/features-page.component').then((m) => m.FeaturesPageComponent),
      },
      {
        path: 'como-funciona',
        loadComponent: () =>
          import('./features/public/pages/how-it-works-page/how-it-works-page.component').then((m) => m.HowItWorksPageComponent),
      },
      {
        path: 'personajes',
        loadComponent: () =>
          import('./features/public/pages/characters-page/characters-page.component').then((m) => m.CharactersPageComponent),
      },
      {
        path: 'precios',
        loadComponent: () =>
          import('./features/public/pages/pricing-page/pricing-page.component').then((m) => m.PricingPageComponent),
      },
      {
        path: 'faq',
        loadComponent: () =>
          import('./features/public/pages/faq-page/faq-page.component').then((m) => m.FaqPageComponent),
      },
    ],
  },

  // Auth routes (solo para no autenticados)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Student routes
  {
    path: 'student',
    canActivate: [authGuard, roleGuard(['student'])],
    loadChildren: () =>
      import('./features/student/student.routes').then((m) => m.studentRoutes),
  },

  // Teacher routes
  {
    path: 'teacher',
    canActivate: [authGuard, roleGuard(['teacher'])],
    loadChildren: () =>
      import('./features/teacher/teacher.routes').then((m) => m.teacherRoutes),
  },

  // Director routes
  {
    path: 'director',
    canActivate: [authGuard, roleGuard(['director', 'admin'])],
    loadChildren: () =>
      import('./features/director/director.routes').then((m) => m.directorRoutes),
  },

  // Parent routes
  {
    path: 'parent',
    canActivate: [authGuard, roleGuard(['parent'])],
    loadChildren: () =>
      import('./features/parent/parent.routes').then((m) => m.parentRoutes),
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
