import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api';
import { InvoiceDetail } from '../../../core/models/models';

@Component({
  selector: 'app-billing',
  imports: [FormsModule],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class BillingComponent implements OnInit {
  private api = inject(ApiService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  invoices = signal<InvoiceDetail[]>([]);
  loading = signal(true);
  error = signal('');
  selectedInvoice = signal<InvoiceDetail | null>(null);
  detailLoading = signal(false);
  search = signal('');

  // Upload state
  uploading = signal(false);
  uploadError = signal('');
  uploadSuccess = signal('');
  dragOver = signal(false);

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
    this.loadInvoices();
  }

  private loadInvoices(): void {
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

  // ── PDF Upload ──────────────────────────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
    (event.target as HTMLInputElement).value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      this.uploadError.set('Please upload a PDF file.');
      return;
    }
    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    const reader = new FileReader();
    reader.onload = () => {
      this.api.uploadInvoicePdf(reader.result as ArrayBuffer).subscribe({
        next: (inv) => {
          this.uploadSuccess.set(
            `Invoice ${inv.invoiceNumber} imported — Job Card ${inv.originalJobCardNumber ?? ''} created/updated.`
          );
          this.uploading.set(false);
          // Refresh list and open the new invoice
          this.api.getInvoices().subscribe(list => {
            this.invoices.set(list);
            this.openInvoice(inv);
          });
        },
        error: (err) => {
          this.uploadError.set(err?.error?.message ?? 'Failed to process PDF.');
          this.uploading.set(false);
        },
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Formatters ──────────────────────────────────────────────────────────────

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
