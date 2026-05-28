import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api';
import { InventoryItem } from '../core/models/models';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);

  items = signal<InventoryItem[]>([]);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  saving = signal(false);
  formError = signal('');

  selectedItem = signal<InventoryItem | null>(null);

  // Form model
  form: Partial<InventoryItem> = { name: '', sku: '', quantity: 0, price: 0 };

  stockValue = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity * i.price, 0)
  );

  lowStockCount = computed(() =>
    this.items().filter((i) => i.quantity < 5).length
  );

  ngOnInit(): void {
    this.loadItems();
  }

  private loadItems(): void {
    this.loading.set(true);
    this.api.getInventory().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load inventory.');
        this.loading.set(false);
      },
    });
  }

  openAdd(): void {
    this.selectedItem.set(null);
    this.form = { name: '', sku: '', quantity: 0, price: 0 };
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.form = { ...item };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedItem.set(null);
  }

  saveItem(): void {
    if (!this.form.name || !this.form.sku) {
      this.formError.set('Name and SKU are required.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const existing = this.selectedItem();
    if (existing) {
      this.api.updateInventoryItem(existing.id, this.form as InventoryItem).subscribe({
        next: (updated) => {
          this.items.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
          this.closeForm();
          this.saving.set(false);
        },
        error: (err) => {
          this.formError.set(err?.error?.message ?? 'Failed to update item.');
          this.saving.set(false);
        },
      });
    } else {
      this.api.createInventoryItem(this.form).subscribe({
        next: (created) => {
          this.items.update((list) => [...list, created]);
          this.closeForm();
          this.saving.set(false);
        },
        error: (err) => {
          this.formError.set(err?.error?.message ?? 'Failed to create item.');
          this.saving.set(false);
        },
      });
    }
  }

  deleteItem(item: InventoryItem): void {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    this.api.deleteInventoryItem(item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
      },
      error: () => alert('Failed to delete item.'),
    });
  }

  fmt(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
