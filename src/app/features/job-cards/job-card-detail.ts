import { Component, inject, signal, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api';
import { JobCardDetail as JCDetail } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge';

const STATUS_STEPS = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CLOSED'];

@Component({
  selector: 'app-job-card-detail',
  imports: [FormsModule, StatusBadgeComponent],
  templateUrl: './job-card-detail.html',
  styleUrl: './job-card-detail.css',
})
export class JobCardDetailComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  // Route input via withComponentInputBinding
  id = input<string>('');

  card = signal<JCDetail | null>(null);
  loading = signal(true);
  error = signal('');
  updating = signal(false);
  updateError = signal('');

  statusSteps = STATUS_STEPS;
  newStatus = '';

  statuses = STATUS_STEPS;

  ngOnInit(): void {
    const idNum = Number(this.id());
    if (!idNum) {
      this.error.set('Invalid job card ID.');
      this.loading.set(false);
      return;
    }
    this.load(idNum);
  }

  private load(idNum: number): void {
    this.api.getJobCard(idNum).subscribe({
      next: (jc) => {
        this.card.set(jc);
        this.newStatus = jc.status;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load job card.');
        this.loading.set(false);
      },
    });
  }

  stepState(step: string): 'done' | 'current' | 'todo' {
    const c = this.card();
    if (!c) return 'todo';
    const currentIdx = STATUS_STEPS.indexOf(c.status);
    const stepIdx = STATUS_STEPS.indexOf(step);
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'todo';
  }

  updateStatus(): void {
    if (!this.newStatus || this.newStatus === this.card()?.status) return;
    const idNum = Number(this.id());
    this.updating.set(true);
    this.updateError.set('');
    this.api.updateJobCardStatus(idNum, this.newStatus).subscribe({
      next: (jc) => {
        this.card.set(jc);
        this.newStatus = jc.status;
        this.updating.set(false);
      },
      error: (err) => {
        this.updateError.set(err?.error?.message ?? 'Failed to update status.');
        this.updating.set(false);
      },
    });
  }

  pdfUrl(): string {
    return this.api.jobCardPdfUrl(Number(this.id()));
  }

  goBack(): void {
    this.router.navigate(['/job-cards']);
  }

  fmt(n: number | undefined | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  labelOf(s: string): string {
    return s.replace(/_/g, ' ');
  }
}
