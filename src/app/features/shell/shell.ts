import { Component, inject, computed, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth';
import { ApiService } from '../../core/services/api';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class ShellComponent {
  auth   = inject(AuthService);
  private api    = inject(ApiService);
  private router = inject(Router);

  today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  sidebarOpen = signal(false);

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

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  logout() {
    this.api.logout().subscribe({ complete: () => this.auth.clearSession() });
  }
}
