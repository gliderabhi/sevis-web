import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth';
import { PendingGoogleAuthService } from '../../../core/services/pending-google-auth';
import { SeoService } from '../../../core/services/seo.service';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private pendingGoogleAuth = inject(PendingGoogleAuthService);

  constructor() {
    inject(SeoService).setPage({
      title: 'Create Account',
      description: 'Sign up for Sevis and start managing your auto service business — job cards, inventory, billing, and more.',
      url: 'https://auto.sevis.store/signup',
    });
  }

  accountType: 'INDIVIDUAL' | 'COMPANY' = 'INDIVIDUAL';
  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  companyName = '';
  gstNo = '';
  dealerCode = '';
  address = '';
  city = '';
  state = '';
  pinCode = '';

  loading = signal(false);
  error = signal('');
  success = signal(false);
  googleIdToken = signal<string | null>(null);

  readonly inputStyle = 'padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;width:100%;box-sizing:border-box;';

  onFocus(e: Event): void {
    (e.target as HTMLElement).style.borderColor = '#2563eb';
  }
  onBlur(e: Event): void {
    (e.target as HTMLElement).style.borderColor = '#e2e8f0';
  }

  ngOnInit(): void {
    const pending = this.pendingGoogleAuth.consume();
    if (pending) {
      this.googleIdToken.set(pending.idToken);
      this.name = pending.name ?? '';
      this.email = pending.email ?? '';
    }
  }

  onSubmit(): void {
    this.error.set('');

    const idToken = this.googleIdToken();
    if (!idToken) {
      if (this.password !== this.confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }
      if (this.password.length < 8) {
        this.error.set('Password must be at least 8 characters.');
        return;
      }
      if (!/[A-Z]/.test(this.password)) {
        this.error.set('Password must contain at least one uppercase letter.');
        return;
      }
      if (!/[0-9]/.test(this.password)) {
        this.error.set('Password must contain at least one digit.');
        return;
      }
    }
    if (this.accountType === 'COMPANY' && !this.companyName.trim()) {
      this.error.set('Company name is required for company accounts.');
      return;
    }

    this.loading.set(true);

    if (idToken) {
      const body: Record<string, unknown> = {
        idToken,
        name: this.name.trim(),
        phone: this.phone.trim() || undefined,
        role: 'DEALER',
        accountType: this.accountType,
      };
      if (this.companyName.trim()) body['companyName'] = this.companyName.trim();
      if (this.gstNo.trim())      body['gstNo']        = this.gstNo.trim().toUpperCase();
      if (this.dealerCode.trim()) body['dealerCode']   = this.dealerCode.trim();
      if (this.address.trim())    body['address']      = this.address.trim();
      if (this.city.trim())       body['city']         = this.city.trim();
      if (this.state.trim())      body['state']        = this.state.trim();
      if (this.pinCode.trim())    body['pinCode']      = this.pinCode.trim();

      this.api.completeGoogleSignup(body).subscribe({
        next: (res) => {
          this.auth.setSession(res.token, {
            name: res.name ?? this.name,
            email: res.email ?? this.email,
            role: res.role,
          });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, 'Could not complete signup. Please try again.'));
          this.loading.set(false);
        },
      });
      return;
    }

    const body: Record<string, unknown> = {
      name: this.name.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      password: this.password,
      role: 'DEALER',
      accountType: this.accountType,
    };
    if (this.companyName.trim()) body['companyName'] = this.companyName.trim();
    if (this.gstNo.trim())      body['gstNo']        = this.gstNo.trim().toUpperCase();
    if (this.dealerCode.trim()) body['dealerCode']   = this.dealerCode.trim();
    if (this.address.trim())    body['address']      = this.address.trim();
    if (this.city.trim())       body['city']         = this.city.trim();
    if (this.state.trim())      body['state']        = this.state.trim();
    if (this.pinCode.trim())    body['pinCode']      = this.pinCode.trim();

    this.api.registerDealer(body).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Registration failed. Please try again.'));
        this.loading.set(false);
      },
    });
  }
}
