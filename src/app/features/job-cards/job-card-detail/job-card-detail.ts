import { Component, inject, signal, input, OnInit, ViewChild, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/services/auth';
import { JobCardDetail as JCDetail, Part, Technician } from '../../../core/models/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { PartPickerComponent } from '../../../shared/components/part-picker/part-picker';

const STATUS_STEPS = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CLOSED'];

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

  savingLabour = signal(false);
  savingPart = signal(false);
  savingAncillary = signal(false);

  // Technicians list for labour form
  technicians = signal<Technician[]>([]);

  // Form data models
  labourForm = { description: '', type: 'MECHANICAL', technicianId: null as number | null, quantity: 1, rate: 0 };
  partForm = { partNumber: '', description: '', partType: 'SPARE_PART', quantity: 1, unitPrice: 0 };
  ancillaryForm = { description: '', amount: 0 };

  statuses = STATUS_STEPS;

  isClosed = computed(() => this.card()?.status === 'CLOSED');
  isPaid = computed(() => this.card()?.billing?.paymentStatus === 'PAID');
  partError = signal('');
  checkingStock = signal(false);

  // Payment
  paymentForm = { paymentType: 'CASH', paymentStatus: 'PENDING' };
  savingPayment = signal(false);
  paymentError = signal('');
  paymentModes = ['CASH', 'CARD', 'UPI', 'ONLINE', 'CHEQUE', 'CREDIT'];

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
        this.updateError.set(err?.error?.message ?? 'Failed to update status.');
        this.updating.set(false);
      },
    });
  }

  downloadPdf(): void {
    const card = this.card();
    const filename = (card?.jobCardNumber ?? 'job-card') + '.pdf';
    this.api.downloadJobCardPdf(Number(this.id()), filename);
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
    this.showLabourForm.set(true);
  }
  closeLabourForm() { this.showLabourForm.set(false); }
  saveLabour() {
    const jc = this.card();
    if (!jc) return;
    this.savingLabour.set(true);
    this.api.addLabour(jc.id, this.labourForm).subscribe({
      next: (updatedJc: JCDetail) => {
        this.card.set(updatedJc);
        this.savingLabour.set(false);
        this.closeLabourForm();
      },
      error: () => this.savingLabour.set(false)
    });
  }
  deleteLabour(id: number | string) {
    const jc = this.card();
    if (!jc || !confirm('Are you sure you want to remove this labour item?')) return;
    this.api.deleteLabour(jc.id, id as number).subscribe({
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
  openPartForm() {
    this.partForm = { partNumber: '', description: '', partType: 'SPARE_PART', quantity: 1, unitPrice: 0 };
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
    if (!this.partForm.partNumber) {
      this.partError.set('Part number is required.');
      return;
    }

    this.checkingStock.set(true);
    this.partError.set('');

    this.api.getStockByPartNumber(this.partForm.partNumber).subscribe({
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
        this.api.addPart(jc.id, this.partForm).subscribe({
          next: (updatedJc: JCDetail) => {
            this.card.set(updatedJc);
            this.savingPart.set(false);
            this.closePartForm();
          },
          error: (err) => {
            this.partError.set(err?.error?.message ?? 'Failed to add part.');
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
    this.showAncillaryForm.set(true);
  }
  closeAncillaryForm() { this.showAncillaryForm.set(false); }
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
      },
      error: (err) => {
        this.paymentError.set(err?.error?.message ?? 'Failed to save payment.');
        this.savingPayment.set(false);
      }
    });
  }
}
