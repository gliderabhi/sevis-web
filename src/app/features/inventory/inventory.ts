import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { InventoryItem, Part } from '../../core/models/models';
import { PartPickerComponent } from '../../shared/components/part-picker/part-picker';
import { apiErrorMessage } from '../../core/utils/api-error';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, PartPickerComponent],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);

  @ViewChild(PartPickerComponent) partPicker?: PartPickerComponent;

  items = signal<InventoryItem[]>([]);
  loading = signal(true);
  error = signal('');
  showForm = signal(false);
  saving = signal(false);
  formError = signal('');

  selectedItem = signal<InventoryItem | null>(null);
  selectedCategoryFilter = signal<'ALL' | 'PART' | 'ANCILLARY'>('ALL');

  // Form model
  form: Partial<InventoryItem> = { name: '', sku: '', quantity: 1, price: 0, category: 'PART' };

  onPartSelected(part: Part): void {
    this.form.name = part.description;
    this.form.sku = part.partNumber;
    if (part.mrpPrice) this.form.price = part.mrpPrice;
  }

  onPartCleared(): void {
    this.form.name = '';
    this.form.sku = '';
  }

  setCategory(category: 'PART' | 'ANCILLARY'): void {
    this.form.category = category;
    if (category === 'ANCILLARY' && (!this.form.sku || this.form.sku.startsWith('PART-'))) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      this.form.sku = `ANC-${randomSuffix}`;
    }
  }

  filteredItems = computed(() => {
    const f = this.selectedCategoryFilter();
    const list = this.items();
    if (f === 'ALL') return list;
    return list.filter((i) => (i.category || 'PART').toUpperCase() === f);
  });

  stockValue = computed(() =>
    this.filteredItems().reduce((sum, i) => sum + i.quantity * i.price, 0)
  );

  lowStockCount = computed(() =>
    this.filteredItems().filter((i) => i.quantity < 5).length
  );

  partCount = computed(() =>
    this.items().filter((i) => (i.category || 'PART').toUpperCase() === 'PART').length
  );

  ancillaryCount = computed(() =>
    this.items().filter((i) => (i.category || '').toUpperCase() === 'ANCILLARY').length
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

  openAdd(defaultCategory: 'PART' | 'ANCILLARY' = 'PART'): void {
    this.selectedItem.set(null);
    const sku = defaultCategory === 'ANCILLARY' ? `ANC-${Math.floor(1000 + Math.random() * 9000)}` : '';
    this.form = { name: '', sku, quantity: 1, price: 0, category: defaultCategory };
    this.formError.set('');
    this.partPicker?.clear();
    this.showForm.set(true);
  }

  openEdit(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.form = { ...item, category: item.category || 'PART' };
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
          this.formError.set(apiErrorMessage(err, 'Failed to update item.'));
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
          this.formError.set(apiErrorMessage(err, 'Failed to create item.'));
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
