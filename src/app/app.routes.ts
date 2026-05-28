import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./features/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'job-cards', loadComponent: () => import('./features/job-cards/job-card-list/job-card-list').then(m => m.JobCardListComponent) },
      { path: 'job-cards/new', loadComponent: () => import('./features/job-cards/job-card-create/job-card-create').then(m => m.JobCardCreateComponent) },
      { path: 'job-cards/:id', loadComponent: () => import('./features/job-cards/job-card-detail/job-card-detail').then(m => m.JobCardDetailComponent) },
      { path: 'parts',     loadComponent: () => import('./features/parts/parts-catalogue/parts-catalogue').then(m => m.PartsCatalogueComponent) },
      { path: 'inventory', loadComponent: () => import('./features/inventory/inventory').then(m => m.InventoryComponent) },
      { path: 'billing',   loadComponent: () => import('./features/billing/billing').then(m => m.BillingComponent) },
      { path: 'reports',   loadComponent: () => import('./features/reports/reports').then(m => m.ReportsComponent) },
      { path: 'users',     loadComponent: () => import('./features/users/users').then(m => m.UsersComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
