import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent {
  constructor() {
    inject(SeoService).setPage({
      title: 'Sevis',
      description: 'Sevis helps auto workshops manage job cards, parts inventory, billing, technicians, and vehicle service records — all in one place.',
      url: 'https://auto.sevis.store/',
      imageUrl: 'https://auto.sevis.store/sevis-logo.png',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Sevis',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'Auto workshop management software for job cards, parts inventory, billing, technician management, and vehicle service records.',
        offers: { '@type': 'Offer', price: '0' },
        url: 'https://auto.sevis.store/',
      },
    });
  }
}
