import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export interface StoredUser { name: string; email: string; role: string; }

// Workshop staff hierarchy: owner > GM > manager > service advisor > supervisor
// > senior technician > technician > helper. STAFF_TIER_ROLES mirrors
// RoleTiers.STAFF_TIER on the backend (orders-service/sevis-common) — keep in
// sync if that list changes. Everything outside STAFF_TIER_ROLES (DEALER and
// the other management-hierarchy roles, plus ADMIN) behaves like the
// original "management" (non-technician) role for UI purposes.
const STAFF_TIER_ROLES = ['TECHNICIAN', 'SENIOR_TECHNICIAN', 'HELPER'];
export const MANAGEMENT_ROLES = ['DEALER', 'OWNER', 'GM', 'MANAGER', 'SERVICE_ADVISOR', 'SUPERVISOR'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem('sevis_token'));
  private _user  = signal<StoredUser | null>(
    JSON.parse(localStorage.getItem('sevis_user') || 'null')
  );

  readonly token    = this._token.asReadonly();
  readonly user     = this._user.asReadonly();
  readonly isLoggedIn    = computed(() => !!this._token());
  readonly isAdmin       = computed(() => ['ADMIN', 'admin'].includes(this._user()?.role ?? ''));
  readonly isTechnician  = computed(() => STAFF_TIER_ROLES.includes(this._user()?.role ?? ''));
  readonly isManagement  = computed(() => MANAGEMENT_ROLES.includes(this._user()?.role ?? ''));

  setSession(token: string, user: StoredUser): void {
    localStorage.setItem('sevis_token', token);
    localStorage.setItem('sevis_user', JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  clearSession(): void {
    localStorage.removeItem('sevis_token');
    localStorage.removeItem('sevis_user');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
