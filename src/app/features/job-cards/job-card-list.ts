import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api';
import { JobCardSummary } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge';

const STATUSES = ['ALL', 'RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CLOSED'];

@Component({
  selector: 'app-job-card-list',
  imports: [FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './job-card-list.html',
  styleUrl: './job-card-list.css',
})
export class JobCardListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  statuses = STATUSES;
  activeStatus = signal('ALL');
  searchQuery = signal('');
  cards = signal<JobCardSummary[]>([]);
  loading = signal(true);
  error = signal('');

  filtered = computed(() => {
    let list = this.cards();
    if (this.activeStatus() !== 'ALL') {
      list = list.filter((c) => c.status === this.activeStatus());
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.jobCardNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.includes(q) ||
          c.vehicleRegNumber.toLowerCase().includes(q) ||
          c.vehicleMakeModel.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.api.getJobCards().subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load job cards.');
        this.loading.set(false);
      },
    });
  }

  setStatus(s: string): void {
    this.activeStatus.set(s);
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmt(n: number | undefined): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  labelOf(s: string): string {
    return s.replace(/_/g, ' ');
  }

  goNew(): void {
    this.router.navigate(['/job-cards/new']);
  }
}
