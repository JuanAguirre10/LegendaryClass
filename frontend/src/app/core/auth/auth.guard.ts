import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.parseUrl('/auth/login');
};

export const guestGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return true;
  // Redirect to the role's base dashboard — character-select is enforced separately
  return inject(Router).parseUrl(baseDashboard(auth.user()?.role));
};

// Enforces character selection within the student section before accessing any other route
export const characterSelectGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (!auth.needsCharacterSelection()) return true;
  if (state.url.startsWith('/student/character-select')) return true;
  return inject(Router).parseUrl('/student/character-select');
};

function baseDashboard(role?: string): string {
  switch (role) {
    case 'director':
    case 'admin':   return '/director/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'parent':  return '/parent/dashboard';
    default:        return '/student/dashboard';
  }
}
