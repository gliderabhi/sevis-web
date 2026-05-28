import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export interface StoredUser { name: string; email: string; role: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem('sevis_token'));
  private _user  = signal<StoredUser | null>(
    JSON.parse(localStorage.getItem('sevis_user') || 'null')
  );

  readonly token    = this._token.asReadonly();
  readonly user     = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly isAdmin    = computed(() => ['ADMIN', 'admin'].includes(this._user()?.role ?? ''));

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
