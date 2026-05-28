import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { Technician, TechnicianSalary } from '../../core/models/models';

const BLANK = (): Partial<Technician> => ({ name: '', phone: '', specialisation: 'MECHANICAL', employeeCode: '', panNumber: '', aadhaarNumber: '' });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-technicians',
  imports: [FormsModule],
  templateUrl: './technicians.html',
  styleUrl: './technicians.css',
})
export class TechniciansComponent implements OnInit {
  private api = inject(ApiService);

  technicians = signal<Technician[]>([]);
  loading = signal(true);
  error = signal('');
  search = signal('');
  showInactive = signal(false);

  // Add/Edit modal
  showForm = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<number | null>(null);
  form = signal<Partial<Technician>>(BLANK());

  specialisations = ['MECHANICAL', 'ELECTRICAL', 'BODYWORK', 'AC', 'GENERAL'];
  months = MONTHS;

  // Salary modal
  salaryTechnician = signal<Technician | null>(null);
  salaries = signal<TechnicianSalary[]>([]);
  salaryLoading = signal(false);
  savingSalary = signal(false);
  salaryError = signal('');
  salaryForm = signal({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), baseSalary: 0, bonus: 0, deductions: 0, notes: '' });

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.showInactive() ? this.technicians() : this.technicians().filter(t => t.active);
    if (!q) return list;
    return list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.employeeCode?.toLowerCase().includes(q) ||
      t.specialisation?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.api.getTechnicians().subscribe({
      next: (list) => { this.technicians.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load technicians.'); this.loading.set(false); },
    });
  }

  // ── Add/Edit ──────────────────────────────────────────────────────────────
  openAdd(): void {
    this.editingId.set(null);
    this.form.set(BLANK());
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(t: Technician): void {
    this.editingId.set(t.id);
    this.form.set({ name: t.name, phone: t.phone, specialisation: t.specialisation, employeeCode: t.employeeCode, panNumber: t.panNumber, aadhaarNumber: t.aadhaarNumber });
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    const f = this.form();
    if (!f.name?.trim()) { this.formError.set('Name is required.'); return; }
    this.saving.set(true);
    this.formError.set('');
    const id = this.editingId();
    const req$ = id ? this.api.updateTechnician(id, f) : this.api.createTechnician(f);
    req$.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (err) => { this.formError.set(err?.error?.message ?? 'Failed to save.'); this.saving.set(false); },
    });
  }

  deactivate(t: Technician): void {
    if (!confirm(`Mark ${t.name} as inactive? Their historical records will be preserved.`)) return;
    this.api.deleteTechnician(t.id).subscribe({ next: () => this.load() });
  }

  reassign(t: Technician): void {
    if (!confirm(`Re-activate ${t.name} at this dealer? A new assignment will be created.`)) return;
    this.api.reassignTechnician(t.id, { specialisation: t.specialisation }).subscribe({ next: () => this.load() });
  }

  // ── Salary ────────────────────────────────────────────────────────────────
  openSalary(t: Technician): void {
    this.salaryTechnician.set(t);
    this.salaryError.set('');
    this.salaryForm.set({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), baseSalary: 0, bonus: 0, deductions: 0, notes: '' });
    this.salaryLoading.set(true);
    this.api.getSalariesByTechnician(t.id).subscribe({
      next: (list) => { this.salaries.set(list); this.salaryLoading.set(false); },
      error: () => this.salaryLoading.set(false),
    });
  }

  closeSalary(): void { this.salaryTechnician.set(null); }

  saveSalary(): void {
    const t = this.salaryTechnician();
    if (!t) return;
    const f = this.salaryForm();
    this.savingSalary.set(true);
    this.salaryError.set('');
    this.api.upsertSalary({ technicianId: t.id, ...f }).subscribe({
      next: () => {
        this.savingSalary.set(false);
        this.api.getSalariesByTechnician(t.id).subscribe({ next: (list) => this.salaries.set(list) });
      },
      error: (err) => { this.salaryError.set(err?.error?.message ?? 'Failed to save salary.'); this.savingSalary.set(false); },
    });
  }

  markPaid(s: TechnicianSalary): void {
    const t = this.salaryTechnician();
    if (!t) return;
    this.api.markSalaryPaid(s.id).subscribe({
      next: () => this.api.getSalariesByTechnician(t.id).subscribe({ next: (list) => this.salaries.set(list) }),
    });
  }

  deleteSalary(s: TechnicianSalary): void {
    const t = this.salaryTechnician();
    if (!t || !confirm('Delete this salary record?')) return;
    this.api.deleteSalary(s.id).subscribe({
      next: () => this.api.getSalariesByTechnician(t.id).subscribe({ next: (list) => this.salaries.set(list) }),
    });
  }

  netPay(): number {
    const f = this.salaryForm();
    return (f.baseSalary || 0) + (f.bonus || 0) - (f.deductions || 0);
  }

  monthName(m: number): string { return MONTHS[m - 1]; }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmt(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
