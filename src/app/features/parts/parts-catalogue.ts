import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { Part } from '../../core/models/models';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-parts-catalogue',
  imports: [FormsModule],
  templateUrl: './parts-catalogue.html',
  styleUrl: './parts-catalogue.css',
})
export class PartsCatalogueComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  parts = signal<Part[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  searching = signal(false);
  error = signal('');

  currentPage = signal(0);
  hasMore = signal(true);
  totalElements = signal(0);

  searchQuery = signal('');
  isSearchMode = signal(false);

  uniqueGroups = computed(() => {
    const groups = this.parts().map(p => p.productGroup).filter(Boolean);
    return [...new Set(groups)].sort();
  });

  selectedGroup = signal('');

  filteredParts = computed(() => {
    const group = this.selectedGroup();
    if (!group) return this.parts();
    return this.parts().filter(p => p.productGroup === group);
  });

  ngOnInit(): void {
    this.loadPage(0);

    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      if (q.trim().length >= 2) {
        this.runSearch(q.trim());
      } else if (q.trim() === '') {
        this.clearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(q: string): void {
    this.searchQuery.set(q);
    this.searchSubject.next(q);
  }

  private runSearch(q: string): void {
    this.searching.set(true);
    this.isSearchMode.set(true);
    this.selectedGroup.set('');
    this.api.searchParts(q).subscribe({
      next: (results) => {
        this.parts.set(results);
        this.hasMore.set(false);
        this.totalElements.set(results.length);
        this.searching.set(false);
      },
      error: () => {
        this.error.set('Search failed.');
        this.searching.set(false);
      },
    });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.isSearchMode.set(false);
    this.selectedGroup.set('');
    this.loadPage(0);
  }

  private loadPage(page: number): void {
    if (page === 0) {
      this.loading.set(true);
      this.parts.set([]);
    } else {
      this.loadingMore.set(true);
    }
    this.error.set('');
    this.api.getParts(page, PAGE_SIZE).subscribe({
      next: (resp) => {
        this.parts.update(existing => page === 0 ? resp.content : [...existing, ...resp.content]);
        this.hasMore.set(!resp.last);
        this.currentPage.set(resp.number);
        this.totalElements.set(Number(resp.totalElements));
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.error.set('Failed to load parts catalogue.');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore() || this.isSearchMode()) return;
    this.loadPage(this.currentPage() + 1);
  }

  fmt(n: number | undefined): string {
    if (!n) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }
}
