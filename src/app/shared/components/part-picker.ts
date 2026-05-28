import {
  Component, inject, signal, output, OnDestroy, ElementRef, HostListener
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Part } from '../../core/models/models';

@Component({
  selector: 'app-part-picker',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './part-picker.html',
  styleUrl: './part-picker.css',
})
export class PartPickerComponent implements OnDestroy {
  private api = inject(ApiService);
  private elRef = inject(ElementRef);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  partSelected = output<Part>();
  cleared = output<void>();

  query = signal('');
  suggestions = signal<Part[]>([]);
  selectedPart = signal<Part | null>(null);
  searching = signal(false);
  open = signal(false);

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      if (q.length >= 2) this.fetchSuggestions(q);
      else { this.suggestions.set([]); this.open.set(false); }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(q: string): void {
    this.query.set(q);
    this.searchSubject.next(q);
  }

  private fetchSuggestions(q: string): void {
    this.searching.set(true);
    this.api.searchParts(q).subscribe({
      next: (parts) => {
        this.suggestions.set(parts);
        this.open.set(parts.length > 0);
        this.searching.set(false);
      },
      error: () => { this.searching.set(false); },
    });
  }

  select(part: Part): void {
    this.selectedPart.set(part);
    this.query.set('');
    this.suggestions.set([]);
    this.open.set(false);
    this.partSelected.emit(part);
  }

  clear(): void {
    this.selectedPart.set(null);
    this.query.set('');
    this.suggestions.set([]);
    this.open.set(false);
    this.cleared.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }
}
