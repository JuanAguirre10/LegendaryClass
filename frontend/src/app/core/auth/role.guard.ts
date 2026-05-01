import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';

export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return (_route, _state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) return router.parseUrl('/auth/login');

    const role = auth.user()?.role;
    if (!role) return router.parseUrl('/auth/login');

    // Director and admin bypass role checks
    if (['director', 'admin'].includes(role)) return true;

    if (allowedRoles.includes(role as Role)) return true;

    // Redirect to own dashboard
    return router.parseUrl(auth.getRoleRedirect());
  };
};
