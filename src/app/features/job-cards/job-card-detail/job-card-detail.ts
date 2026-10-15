import { Component, inject, signal, input, OnInit, ViewChild, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth';
import { JobCardDetail as JCDetail, Part, Technician, InventoryItem } from '../../../core/models/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { PartPickerComponent } from '../../../shared/components/part-picker/part-picker';
import { apiErrorMessage } from '../../../core/utils/api-error';

const STATUS_STEPS = ['OPEN', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CLOSED'];

interface PartRow { partNumber: string; description: string; partType: string; quantity: number; unitPrice: number; }

@Component({
  selector: 'app-job-card-detail',
  imports: [FormsModule, StatusBadgeComponent, PartPickerComponent],
  templateUrl: './job-card-detail.html',
  styleUrl: './job-card-detail.css',
})
export class JobCardDetailComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  @ViewChild(PartPickerComponent) partPicker?: PartPickerComponent;

  // Route input via withComponentInputBinding
  id = input<string>('');

  card = signal<JCDetail | null>(null);
  loading = signal(true);
  error = signal('');
  updating = signal(false);
  updateError = signal('');

  statusSteps = STATUS_STEPS;
  newStatus = '';

  // Form signals for modals and loading states
  showLabourForm = signal(false);
  showPartForm = signal(false);
  showAncillaryForm = signal(false);
  inventoryAncillaryItems = signal<InventoryItem[]>([]);
  loadingAncillaryInventory = signal(false);
  selectedAncillaryInventoryId = signal<number | null>(null);

  savingLabour = signal(false);
  savingPart = signal(false);
  savingAncillary = signal(false);

  // Technicians list for labour form
  technicians = signal<Technician[]>([]);

  // Form data models
  labourForm = { description: '', type: 'MECHANICAL', technicianId: null as number | null, quantity: 1, rate: 0 };
  partForm = { labourId: null as number | null, partNumber: '', description: '', partType: 'SPARE_PART', quantity: 1, unitPrice: 0 };
  ancillaryForm = { description: '', amount: 0 };

  // Parts attached inline while adding a labour item (e.g. engine oil under "Oil change")
  newLabourParts: PartRow[] = [];
  labourPartError = signal('');

  allParts = computed(() => {
    const card = this.card();
    if (!card) return [];
    const fromLabour = (card.labourItems ?? []).flatMap(l =>
      (l.parts ?? []).map(p => ({ ...p, labourId: l.id, labourDescription: l.description }))
    );
    const seenIds = new Set(fromLabour.map(p => p.id));
    const directParts = (card.parts ?? [])
      .filter(p => !seenIds.has(p.id))
      .map(p => {
        const labour = (p as any).labourId
          ? (card.labourItems ?? []).find(l => l.id === (p as any).labourId)
          : null;
        return {
          ...p,
          labourId: labour?.id,
          labourDescription: labour?.description ?? "—",
        };
      });
    return [...fromLabour, ...directParts];
  });

  // Dropdown only offers stages the job card can legally move to next: any prior
  // stage (back propagation) plus the single immediate next stage (no skipping ahead).
  statuses = computed(() => {
    const current = this.card()?.status;
    const currentIdx = STATUS_STEPS.indexOf(current ?? '');
    if (currentIdx < 0) return STATUS_STEPS;
    return STATUS_STEPS.filter((_, idx) => idx <= currentIdx + 1);
  });

  isClosed = computed(() => this.card()?.status === 'CLOSED');
  isPaid = computed(() => this.card()?.billing?.paymentStatus === 'PAID');
  hasPendingLabour = computed(() =>
    (this.card()?.labourItems ?? []).some(l => l.technicianId != null && l.taskStatus !== 'DONE')
  );
  // Payment only becomes relevant once there's actual labour work on the job card and none
  // of it is still pending — a job card with no labour items yet has nothing to bill for.
  workDone = computed(() => {
    const card = this.card();
    const hasLabour = (card?.labourItems ?? []).length > 0;
    const hasParts = (this.allParts() ?? []).length > 0;
    return (hasLabour || hasParts) && !this.hasPendingLabour();
  });
  partError = signal('');
  checkingStock = signal(false);

  // Payment
  paymentForm = { paymentType: 'CASH', paymentStatus: 'PENDING' };
  savingPayment = signal(false);
  paymentError = signal('');
  paymentModes = ['CASH', 'CARD', 'UPI', 'ONLINE', 'CHEQUE', 'CREDIT'];

  // Billing / tax rates
  showBillingForm = signal(false);
  savingBilling = signal(false);
  billingError = signal('');
  billingForm = { discount: 0, cgstRate: 9, sgstRate: 9, igstRate: 0 };

  ngOnInit(): void {
    const idNum = Number(this.id());
    if (!idNum) {
      this.error.set('Invalid job card ID.');
      this.loading.set(false);
      return;
    }
    this.load(idNum);
    this.api.getActiveTechnicians().subscribe({ next: (t) => this.technicians.set(t) });
  }

  private load(idNum: number): void {
    this.api.getJobCard(idNum).subscribe({
      next: (jc) => {
        this.card.set(jc);
        this.newStatus = jc.status;
        if (jc.billing) {
          this.paymentForm.paymentType = jc.billing.paymentType ?? 'CASH';
          this.paymentForm.paymentStatus = jc.billing.paymentStatus ?? 'PENDING';
          this.billingForm = {
            discount: jc.billing.discount ?? 0,
            cgstRate: jc.billing.cgstRate ?? 9,
            sgstRate: jc.billing.sgstRate ?? 9,
            igstRate: jc.billing.igstRate ?? 0,
          };
        }
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
        this.updateError.set(apiErrorMessage(err, 'Failed to update status.'));
        this.updating.set(false);
      },
    });
  }

  downloadingPdf = signal(false);
  pdfDownloadError = signal('');

  downloadPdf(): void {
    const jc = this.card();
    // downloadingPdf also guards re-entry here: without it, a second click before the
    // first blob finished downloading fired a second browser download of the same file,
    // which Chrome/Edge treat as a multi-file download and block behind a permission
    // prompt instead of just downloading it.
    if (!jc || this.downloadingPdf()) return;
    const filename = jc.jobCardNumber + '.pdf';
    this.pdfDownloadError.set('');
    this.downloadingPdf.set(true);

    if (jc.invoice) {
      this.api.downloadInvoicePdf(jc.invoice.id, filename).subscribe({
        next: () => this.downloadingPdf.set(false),
        error: (err) => {
          this.pdfDownloadError.set(apiErrorMessage(err, 'Failed to download invoice.'));
          this.downloadingPdf.set(false);
        }
      });
      return;
    }

    // No invoice generated yet for this job card — generate one on the fly, then download.
    this.api.generateInvoiceForJobCard(jc.id).subscribe({
      next: (inv) => {
        this.card.set({ ...jc, invoice: inv });
        this.api.downloadInvoicePdf(inv.id, filename).subscribe({
          next: () => this.downloadingPdf.set(false),
          error: (err) => {
            this.pdfDownloadError.set(apiErrorMessage(err, 'Failed to download invoice.'));
            this.downloadingPdf.set(false);
          }
        });
      },
      error: (err) => {
        this.pdfDownloadError.set(apiErrorMessage(err, 'Failed to generate invoice.'));
        this.downloadingPdf.set(false);
      }
    });
  }

  // PDF preview — opens the invoice in a new full browser tab (the browser's native PDF
  // viewer), rather than an in-page modal.
  loadingPdfPreview = signal(false);
  pdfPreviewError = signal('');

  previewPdf(): void {
    const jc = this.card();
    if (!jc || this.loadingPdfPreview()) return;
    this.pdfPreviewError.set('');
    this.loadingPdfPreview.set(true);

    // Open the tab synchronously, in direct response to the click — opening it only after
    // the blob fetch resolves (below) would happen outside the user-gesture window most
    // browsers require, and get silently popup-blocked. We navigate this already-open tab
    // to the object URL once the PDF bytes are in.
    const tab = window.open('', '_blank');

    if (jc.invoice) {
      this.openPdfInTab(jc.invoice.id, tab);
      return;
    }
    // No invoice generated yet for this job card — generate one on the fly, then preview.
    this.api.generateInvoiceForJobCard(jc.id).subscribe({
      next: (inv) => {
        this.card.set({ ...jc, invoice: inv });
        this.openPdfInTab(inv.id, tab);
      },
      error: (err) => {
        tab?.close();
        this.pdfPreviewError.set(apiErrorMessage(err, 'Failed to generate invoice.'));
        this.loadingPdfPreview.set(false);
      }
    });
  }

  private openPdfInTab(invoiceId: number, tab: Window | null): void {
    this.api.getInvoicePdfBlob(invoiceId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) {
          tab.location.href = url;
        } else {
          // Popup was blocked despite the synchronous open() above (e.g. a strict
          // blocker) — fall back to navigating the current tab's new-tab link target.
          window.open(url, '_blank');
        }
        this.loadingPdfPreview.set(false);
        // Revoke once the new tab has had time to load the PDF from the blob URL.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        tab?.close();
        this.pdfPreviewError.set(apiErrorMessage(err, 'Failed to load invoice preview.'));
        this.loadingPdfPreview.set(false);
      }
    });
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

  // Labour Management
  openLabourForm() {
    this.labourForm = { description: '', type: 'MECHANICAL', technicianId: null, quantity: 1, rate: 0 };
    this.newLabourParts = [];
    this.labourPartError.set('');
    this.showLabourForm.set(true);
  }
  onTechnicianSelected(technicianId: number | null) {
    this.labourForm.technicianId = technicianId;
    const tech = this.technicians().find(t => t.id === technicianId);
    this.labourForm.rate = tech?.baseRate ?? 0;
  }
  closeLabourForm() { this.showLabourForm.set(false); }

  addLabourPartRow() {
    this.newLabourParts = [...this.newLabourParts, { partNumber: '', description: '', partType: 'SPARE_PART', quantity: 1, unitPrice: 0 }];
  }
  removeLabourPartRow(index: number) {
    this.newLabourParts = this.newLabourParts.filter((_, i) => i !== index);
  }
  onLabourPartSelected(index: number, part: Part) {
    const row = this.newLabourParts[index];
    row.partNumber = part.partNumber;
    row.description = part.description;
    if (part.mrpPrice) row.unitPrice = part.mrpPrice;
  }
  onLabourPartCleared(index: number) {
    const row = this.newLabourParts[index];
    row.partNumber = '';
    row.description = '';
    row.unitPrice = 0;
  }

  saveLabour() {
    const jc = this.card();
    if (!jc) return;

    const rows = this.newLabourParts.filter(r => r.partNumber.trim() || r.description.trim());
    if (rows.some(r => !r.partNumber.trim() || !r.description.trim())) {
      this.labourPartError.set('Each part needs a part number and description.');
      return;
    }
    this.labourPartError.set('');

    if (rows.length === 0) {
      this.submitLabour(jc, []);
      return;
    }

    this.checkingStock.set(true);
    forkJoin(rows.map(r => this.api.getStockByPartNumber(r.partNumber, jc.dealerId))).subscribe({
      next: (stocks) => {
        this.checkingStock.set(false);
        for (let i = 0; i < rows.length; i++) {
          if (stocks[i].quantity < rows[i].quantity) {
            this.labourPartError.set(
              `Insufficient stock for "${rows[i].partNumber}". Available: ${stocks[i].quantity}, requested: ${rows[i].quantity}.`
            );
            return;
          }
        }
        this.submitLabour(jc, rows);
      },
      error: () => {
        this.checkingStock.set(false);
        this.labourPartError.set('One or more parts were not found in stock.');
      }
    });
  }

  private submitLabour(jc: JCDetail, parts: PartRow[]) {
    this.savingLabour.set(true);
    const body = parts.length ? { ...this.labourForm, parts } : this.labourForm;
    this.api.addLabour(jc.id, body).subscribe({
      next: (updatedJc: JCDetail) => {
        this.card.set(updatedJc);
        this.savingLabour.set(false);
        this.closeLabourForm();
      },
      error: (err) => {
        this.labourPartError.set(apiErrorMessage(err, 'Failed to add labour.'));
        this.savingLabour.set(false);
      }
    });
  }
  deleteLabour(id: number | string) {
    const jc = this.card();
    if (!jc || !confirm('Are you sure you want to remove this labour item?')) return;
    this.api.deleteLabour(jc.id, id as number).subscribe({
      next: (updatedJc: JCDetail) => this.card.set(updatedJc)
    });
  }

  toggleTaskStatus(labourId: number, currentStatus: string) {
    const jc = this.card();
    if (!jc) return;
    const next = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    this.api.updateLabourStatus(jc.id, labourId, next).subscribe({
      next: (updatedJc: JCDetail) => this.card.set(updatedJc)
    });
  }

  onCataloguePartSelected(part: Part): void {
    this.partForm.partNumber = part.partNumber;
    this.partForm.description = part.description;
    if (part.mrpPrice) this.partForm.unitPrice = part.mrpPrice;
  }

  onCataloguePartCleared(): void {
    this.partForm.partNumber = '';
    this.partForm.description = '';
    this.partForm.unitPrice = 0;
  }

  // Parts Management
  openPartForm(labourId?: number) {
    const preselected = labourId ?? this.card()?.labourItems[0]?.id ?? null;
    this.partForm = { labourId: preselected, partNumber: '', description: '', partType: 'SPARE_PART', quantity: 1, unitPrice: 0 };
    this.partError.set('');
    this.partPicker?.clear();
    this.showPartForm.set(true);
  }
  closePartForm() {
    this.showPartForm.set(false);
    this.partError.set('');
  }
  savePart() {
    const jc = this.card();
    if (!jc) return;
    if (!this.partForm.labourId) {
      this.partError.set('Select the labour item this part belongs to.');
      return;
    }
    if (!this.partForm.partNumber) {
      this.partError.set('Part number is required.');
      return;
    }

    this.checkingStock.set(true);
    this.partError.set('');

    this.api.getStockByPartNumber(this.partForm.partNumber, jc.dealerId).subscribe({
      next: (stock) => {
        if (stock.quantity <= 0) {
          this.partError.set(`"${this.partForm.partNumber}" is out of stock.`);
          this.checkingStock.set(false);
          return;
        }
        if (stock.quantity < this.partForm.quantity) {
          this.partError.set(
            `Insufficient stock for "${this.partForm.partNumber}". Available: ${stock.quantity}, requested: ${this.partForm.quantity}.`
          );
          this.checkingStock.set(false);
          return;
        }
        this.checkingStock.set(false);
        this.savingPart.set(true);
        const { labourId, ...body } = this.partForm;
        this.api.addPart(jc.id, body).subscribe({
          next: (updatedJc: JCDetail) => {
            this.card.set(updatedJc);
            this.savingPart.set(false);
            this.closePartForm();
          },
          error: (err) => {
            this.partError.set(apiErrorMessage(err, 'Failed to add part.'));
            this.savingPart.set(false);
          }
        });
      },
      error: () => {
        this.partError.set(`Part "${this.partForm.partNumber}" not found in stock.`);
        this.checkingStock.set(false);
      }
    });
  }
  deletePart(id: number | string) {
    const jc = this.card();
    if (!jc || !confirm('Are you sure you want to remove this part?')) return;
    this.api.deletePart(jc.id, id as number).subscribe({
      next: (updatedJc: JCDetail) => this.card.set(updatedJc)
    });
  }

  // Ancillary Items Management
  openAncillaryForm() {
    this.ancillaryForm = { description: '', amount: 0 };
    this.selectedAncillaryInventoryId.set(null);
    this.showAncillaryForm.set(true);
    this.loadAncillaryInventory();
  }

  loadAncillaryInventory() {
    this.loadingAncillaryInventory.set(true);
    this.api.getInventory('ANCILLARY').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.inventoryAncillaryItems.set(items);
          this.loadingAncillaryInventory.set(false);
        } else {
          this.api.getInventory().subscribe({
            next: (allItems) => {
              const ancillaryOnly = allItems.filter(
                (i) => (i.category || '').toUpperCase() === 'ANCILLARY'
              );
              this.inventoryAncillaryItems.set(ancillaryOnly.length > 0 ? ancillaryOnly : allItems);
              this.loadingAncillaryInventory.set(false);
            },
            error: () => this.loadingAncillaryInventory.set(false),
          });
        }
      },
      error: () => {
        this.api.getInventory().subscribe({
          next: (allItems) => {
            const ancillaryOnly = allItems.filter(
              (i) => (i.category || '').toUpperCase() === 'ANCILLARY'
            );
            this.inventoryAncillaryItems.set(ancillaryOnly.length > 0 ? ancillaryOnly : allItems);
            this.loadingAncillaryInventory.set(false);
          },
          error: () => this.loadingAncillaryInventory.set(false),
        });
      },
    });
  }

  onSelectAncillaryFromInventory(itemId: any) {
    if (!itemId) {
      this.selectedAncillaryInventoryId.set(null);
      return;
    }
    const id = Number(itemId);
    this.selectedAncillaryInventoryId.set(id);
    const item = this.inventoryAncillaryItems().find((i) => i.id === id);
    if (item) {
      this.ancillaryForm.description = item.name;
      this.ancillaryForm.amount = item.price;
    }
  }

  closeAncillaryForm() {
    this.showAncillaryForm.set(false);
    this.selectedAncillaryInventoryId.set(null);
  }
  saveAncillary() {
    const jc = this.card();
    if (!jc) return;
    this.savingAncillary.set(true);
    this.api.addAncillary(jc.id, this.ancillaryForm).subscribe({
      next: (updatedJc: JCDetail) => {
        this.card.set(updatedJc);
        this.savingAncillary.set(false);
        this.closeAncillaryForm();
      },
      error: () => this.savingAncillary.set(false)
    });
  }
  deleteAncillary(id: number | string) {
    const jc = this.card();
    if (!jc || !confirm('Are you sure you want to remove this ancillary item?')) return;
    this.api.deleteAncillary(jc.id, id as number).subscribe({
      next: (updatedJc: JCDetail) => this.card.set(updatedJc)
    });
  }

  // Billing / tax rates
  openBillingForm() {
    this.billingError.set('');
    this.showBillingForm.set(true);
  }
  closeBillingForm() {
    this.showBillingForm.set(false);
  }
  saveBilling() {
    const jc = this.card();
    if (!jc) return;
    this.savingBilling.set(true);
    this.billingError.set('');
    this.api.updateJobCardBilling(jc.id, this.billingForm).subscribe({
      next: (updatedJc: JCDetail) => {
        this.card.set(updatedJc);
        this.savingBilling.set(false);
        this.closeBillingForm();
      },
      error: (err) => {
        this.billingError.set(apiErrorMessage(err, 'Failed to save tax rates.'));
        this.savingBilling.set(false);
      },
    });
  }

  // Payment
  savePayment() {
    const jc = this.card();
    if (!jc) return;
    this.savingPayment.set(true);
    this.paymentError.set('');
    this.api.updateJobCardPayment(jc.id, this.paymentForm.paymentType, this.paymentForm.paymentStatus).subscribe({
      next: (updatedJc: JCDetail) => {
        this.card.set(updatedJc);
        this.savingPayment.set(false);
        // The "payment not PAID yet" message from a prior blocked status update (see
        // updateStatus) is now stale — payment was just recorded, so clear it rather
        // than leaving it on screen looking like the block is still in effect.
        this.updateError.set('');
      },
      error: (err) => {
        this.paymentError.set(apiErrorMessage(err, 'Failed to save payment.'));
        this.savingPayment.set(false);
      }
    });
  }
}
