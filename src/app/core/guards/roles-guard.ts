import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserRole } from '../models/models';

export const rolesGuard = (allowed: UserRole[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  const role = auth.user()?.role as UserRole;
  return allowed.includes(role) ? true : router.createUrlTree(['/unauthorized']);
};
