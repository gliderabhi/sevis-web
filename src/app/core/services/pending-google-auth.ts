import { Injectable, signal } from '@angular/core';

export interface PendingGoogleAuth {
  idToken: string;
  name?: string;
  email?: string;
}

// Holds a verified-but-not-yet-linked Google sign-in in memory just long
// enough to hand it from the login page to the signup page after a 404
// ("no account for this app yet"), so signup can skip the password field
// and prefill name/email. Never persisted — cleared once consumed.
@Injectable({ providedIn: 'root' })
export class PendingGoogleAuthService {
  private _pending = signal<PendingGoogleAuth | null>(null);

  readonly pending = this._pending.asReadonly();

  set(auth: PendingGoogleAuth): void {
    this._pending.set(auth);
  }

  consume(): PendingGoogleAuth | null {
    const value = this._pending();
    this._pending.set(null);
    return value;
  }

  // Decodes the (already server-verified-on-login-attempt) idToken payload
  // purely for prefill purposes — this is not itself a trust boundary, the
  // token is re-verified server-side in completeGoogleSignup.
  static decode(idToken: string): { name?: string; email?: string } {
    try {
      const payload = idToken.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const claims = JSON.parse(json);
      return { name: claims.name, email: claims.email };
    } catch {
      return {};
    }
  }
}
