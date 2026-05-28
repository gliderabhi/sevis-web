import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ApiService } from '../core/services/api';
import { AppUser } from '../core/models/models';

@Component({
  selector: 'app-users',
  imports: [],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);

  users = signal<AppUser[]>([]);
  loading = signal(true);
  error = signal('');

  adminCount = computed(() =>
    this.users().filter((u) => u.role?.toUpperCase() === 'ADMIN').length
  );

  ngOnInit(): void {
    this.api.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
      },
    });
  }
}
