import { Component, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../core/services/api';
import { InvoiceDetail } from '../core/models/models';

@Component({
  selector: 'app-billing',
  imports: [],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class BillingComponent implements OnInit {
  private api = inject(ApiService);

  invoices = signal<InvoiceDetail[]>([]);
  loading = signal(true);
  error = signal('');
  selectedInvoice = signal<InvoiceDetail | null>(null);
  detailLoading = signal(false);

  ngOnInit(): void {
    this.api.getInvoices().subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load invoices.');
        this.loading.set(false);
      },
    });
  }

  openInvoice(inv: InvoiceDetail): void {
    this.detailLoading.set(true);
    this.api.getInvoice(inv.id).subscribe({
      next: (detail) => {
        this.selectedInvoice.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.selectedInvoice.set(inv);
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.selectedInvoice.set(null);
  }

  fmt(n: number | undefined | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
