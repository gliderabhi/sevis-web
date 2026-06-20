import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { rolesGuard } from './core/guards/roles-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/landing/landing').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./features/auth/signup/signup').then(m => m.SignupComponent) },
  {
    path: '',
    loadComponent: () => import('./features/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'unauthorized', loadComponent: () => import('./features/unauthorized/unauthorized').then(m => m.UnauthorizedComponent) },

      // Both roles
      { path: 'dashboard',  loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'job-cards',  loadComponent: () => import('./features/job-cards/job-card-list/job-card-list').then(m => m.JobCardListComponent) },
      { path: 'job-cards/:id', loadComponent: () => import('./features/job-cards/job-card-detail/job-card-detail').then(m => m.JobCardDetailComponent) },

      // Admin + Dealer (not Technician)
      { path: 'job-cards/new', canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/job-cards/job-card-create/job-card-create').then(m => m.JobCardCreateComponent) },
      { path: 'parts',      canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/parts/parts-catalogue/parts-catalogue').then(m => m.PartsCatalogueComponent) },
      { path: 'inventory',  canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/inventory/inventory').then(m => m.InventoryComponent) },
      { path: 'billing',    canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/billing/billing').then(m => m.BillingComponent) },
      { path: 'reports',    canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/reports/reports').then(m => m.ReportsComponent) },
      { path: 'users',      canActivate: [rolesGuard(['ADMIN'])],           loadComponent: () => import('./features/users/users').then(m => m.UsersComponent) },
      { path: 'technicians', canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/technicians/technicians').then(m => m.TechniciansComponent) },
      { path: 'vehicles',   canActivate: [rolesGuard(['ADMIN', 'DEALER'])], loadComponent: () => import('./features/vehicles/vehicles').then(m => m.VehiclesComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
