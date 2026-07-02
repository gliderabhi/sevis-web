import { Component, inject, signal, AfterViewInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth';
import { SeoService } from '../../../core/services/seo.service';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements AfterViewInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);

  constructor() {
    inject(SeoService).setPage({
      title: 'Log In',
      description: 'Sign in to Sevis to manage your auto workshop — job cards, inventory, billing, and technicians.',
      url: 'https://auto.sevis.store/login',
    });
  }

  email = 'admin@sevis.com';
  password = 'Admin@1234';
  loading = signal(false);
  error = signal('');

  ngAfterViewInit(): void {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: '1059813087193-btfkk2bhtj50grqjta6anvo5i7vq77pl.apps.googleusercontent.com',
        callback: (response: { credential: string }) =>
          this.zone.run(() => this.onGoogleLogin(response.credential)),
      });
      google.accounts.id.renderButton(document.getElementById('google-signin-btn')!, {
        theme: 'outline', size: 'large', width: 300, text: 'signin_with',
      });
    };
    document.head.appendChild(script);
  }

  onGoogleLogin(idToken: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api.loginWithGoogle(idToken).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, {
          name: res.name ?? res.email ?? '',
          email: res.email ?? '',
          role: res.role,
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Google sign-in failed. Please try again.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, {
          name: res.name ?? this.email,
          email: this.email,
          role: res.role,
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
