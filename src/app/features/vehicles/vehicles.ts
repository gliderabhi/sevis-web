import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api';
import { VehicleRecord, JobCardSummary } from '../../core/models/models';

@Component({
  selector: 'app-vehicles',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.css',
})
export class VehiclesComponent implements OnInit {
  private api = inject(ApiService);

  vehicles = signal<VehicleRecord[]>([]);
  loading = signal(true);
  error = signal('');
  search = signal('');

  selectedVehicle = signal<VehicleRecord | null>(null);
  history = signal<JobCardSummary[]>([]);
  historyLoading = signal(false);

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.vehicles();
    return this.vehicles().filter(v =>
      v.regNumber.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.chassisNo?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.api.getVehicles().subscribe({
      next: (list) => { this.vehicles.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load vehicles.'); this.loading.set(false); },
    });
  }

  openHistory(v: VehicleRecord): void {
    this.selectedVehicle.set(v);
    this.history.set([]);
    this.historyLoading.set(true);
    this.api.getVehicleHistory(v.id).subscribe({
      next: (h) => { this.history.set(h); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false),
    });
  }

  closeHistory(): void { this.selectedVehicle.set(null); }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmt(n: number | undefined | null): string {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  labelOf(s: string | undefined): string {
    if (!s) return '—';
    return s.replace(/_/g, ' ');
  }
}
