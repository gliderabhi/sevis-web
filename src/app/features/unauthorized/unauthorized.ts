import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#64748b;">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <h2 style="margin:0;font-size:18px;font-weight:600;color:#1e293b;">Access Denied</h2>
      <p style="margin:0;font-size:14px;">You don't have permission to view this page.</p>
      <button (click)="goBack()"
        style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">
        Go to Dashboard
      </button>
    </div>
  `,
})
export class UnauthorizedComponent {
  private router = inject(Router);
  goBack() { this.router.navigate(['/dashboard']); }
}
