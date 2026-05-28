import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadgeComponent {
  status = input<string>('');

  get label(): string {
    return this.status().replace(/_/g, ' ');
  }
}
