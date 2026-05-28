import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api';

@Component({
  selector: 'app-job-card-create',
  imports: [FormsModule],
  templateUrl: './job-card-create.html',
  styleUrl: './job-card-create.css',
})
export class JobCardCreateComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  serviceTypes = [
    'PERIODIC_SERVICE',
    'RUNNING_REPAIR',
    'BODYWORK',
    'INSPECTION',
    'ACCIDENTAL',
    'WARRANTY',
    'OTHER',
  ];

  fuelTypes = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'];

  // Form model
  form = {
    customer: { phone: '', name: '', email: '', address: '' },
    vehicle: {
      regNumber: '', make: '', model: '', variant: '',
      year: null as number | null, fuelType: '', color: '', chassisNo: '',
    },
    serviceType: 'GENERAL_SERVICE',
    kmIn: null as number | null,
    advisorName: '',
    expectedDelivery: '',
    customerComplaint: '',
  };

  labelOf(s: string): string {
    return s.replace(/_/g, ' ');
  }

  onSubmit(): void {
    if (!this.form.customer.phone || !this.form.customer.name || !this.form.vehicle.regNumber) {
      this.error.set('Customer phone, name and vehicle registration are required.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const body = {
      customer: {
        phone: this.form.customer.phone,
        name: this.form.customer.name,
        email: this.form.customer.email || null,
        address: this.form.customer.address || null,
      },
      vehicle: {
        regNumber: this.form.vehicle.regNumber,
        make: this.form.vehicle.make || null,
        model: this.form.vehicle.model || null,
        variant: this.form.vehicle.variant || null,
        year: this.form.vehicle.year || null,
        fuelType: this.form.vehicle.fuelType || null,
        color: this.form.vehicle.color || null,
        chassisNo: this.form.vehicle.chassisNo || null,
      },
      serviceType: this.form.serviceType,
      kmIn: this.form.kmIn ?? 0,
      advisorName: this.form.advisorName || null,
      expectedDelivery: this.form.expectedDelivery || null,
      customerComplaint: this.form.customerComplaint || null,
    };

    this.api.createJobCard(body).subscribe({
      next: (jc) => {
        this.router.navigate(['/job-cards', jc.id]);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to create job card.');
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/job-cards']);
  }
}
