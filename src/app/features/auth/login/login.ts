import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

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
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
