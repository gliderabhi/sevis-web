import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api';
import { InvoiceDetail } from '../core/models/models';

@Component({
  selector: 'app-billing',
  imports: [FormsModule],
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
  search = signal('');

  filteredInvoices = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.invoices();
    return this.invoices().filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.originalJobCardNumber?.toLowerCase().includes(q) ||
      inv.vehicleRegNo?.toLowerCase().includes(q) ||
      inv.serviceType?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.api.getInvoices().subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? `Server error (${err?.status ?? 'unknown'})`;
        this.error.set(`Failed to load invoices. ${msg}`);
        this.loading.set(false);
      },
    });
  }

  openInvoice(inv: InvoiceDetail): void {
    this.selectedInvoice.set(inv);
    this.detailLoading.set(true);
    this.api.getInvoice(inv.id).subscribe({
      next: (detail) => {
        this.selectedInvoice.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
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

  labelOf(s: string | undefined): string {
    if (!s) return '—';
    return s.replace(/_/g, ' ');
  }
}
