import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { Technician } from '../../core/models/models';

const BLANK = (): Partial<Technician> => ({ name: '', phone: '', specialisation: 'MECHANICAL', employeeCode: '', panNumber: '', aadhaarNumber: '' });

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

  showForm = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<number | null>(null);
  form = signal<Partial<Technician>>(BLANK());

  specialisations = ['MECHANICAL', 'ELECTRICAL', 'BODYWORK', 'AC', 'GENERAL'];

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

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
