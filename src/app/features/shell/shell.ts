import { Component, OnDestroy, OnInit, inject, computed, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth';
import { ApiService } from '../../core/services/api';
import { IdleTimeoutService } from '../../core/services/idle-timeout.service';
import { SeoService } from '../../core/services/seo.service';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/job-cards': 'Job Cards',
  '/job-cards/new': 'New Job Card',
  '/inventory': 'Inventory',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/users': 'Users',
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class ShellComponent implements OnInit, OnDestroy {
  auth        = inject(AuthService);
  idleTimeout = inject(IdleTimeoutService);
  private api    = inject(ApiService);
  private router = inject(Router);
  private seo    = inject(SeoService);

  today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  sidebarOpen     = signal(false);
  accountMenuOpen = signal(false);
  showChangePwd   = signal(false);
  changePwdForm   = signal({ current: '', next: '', confirm: '' });
  changePwdError  = signal('');
  changePwdDone   = signal(false);
  changePwdSaving = signal(false);

  userInitial = computed(() => (this.auth.user()?.name ?? '?').charAt(0).toUpperCase());

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => {
        this.sidebarOpen.set(false);
        return (e as NavigationEnd).urlAfterRedirects;
      })
    ),
    { initialValue: this.router.url }
  );

  pageTitle = computed(() => {
    const u = this.url() ?? '';
    if (u.match(/^\/job-cards\/\d+$/)) return 'Job Card Detail';
    return PAGE_TITLES[u] ?? PAGE_TITLES[u.split('?')[0]] ?? 'Sevis CRM';
  });

  private _ = effect(() => {
    this.seo.setPage({
      title: this.pageTitle(),
      description: 'Sevis auto workshop management — job cards, inventory, billing, and technician tracking.',
      url: `https://auto.sevis.store${this.url() ?? ''}`,
    });
  });

  ngOnInit(): void  { this.idleTimeout.start(); }
  ngOnDestroy(): void { this.idleTimeout.stop(); }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  toggleAccountMenu() { this.accountMenuOpen.update(v => !v); }

  openChangePwd() {
    this.accountMenuOpen.set(false);
    this.changePwdForm.set({ current: '', next: '', confirm: '' });
    this.changePwdError.set('');
    this.changePwdDone.set(false);
    this.showChangePwd.set(true);
  }

  closeChangePwd() { this.showChangePwd.set(false); }

  submitChangePwd() {
    const f = this.changePwdForm();
    this.changePwdError.set('');
    if (!f.current) { this.changePwdError.set('Current password is required.'); return; }
    if (f.next.length < 8) { this.changePwdError.set('New password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(f.next)) { this.changePwdError.set('New password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(f.next)) { this.changePwdError.set('New password must contain at least one digit.'); return; }
    if (f.next !== f.confirm) { this.changePwdError.set('Passwords do not match.'); return; }
    this.changePwdSaving.set(true);
    this.api.changePassword(f.current, f.next).subscribe({
      next: () => { this.changePwdDone.set(true); this.changePwdSaving.set(false); setTimeout(() => this.closeChangePwd(), 1500); },
      error: (err) => { this.changePwdError.set(err?.error?.message ?? 'Failed to change password.'); this.changePwdSaving.set(false); },
    });
  }

  logout() {
    this.accountMenuOpen.set(false);
    this.api.logout().subscribe({ complete: () => this.auth.clearSession() });
  }
}
