import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { ApiService } from '../../../core/services/api';
import { AuditSummary } from '../../../core/models/models';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);

  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;

  summary = signal<AuditSummary | null>(null);
  stockValue = signal<number>(0);
  loading = signal(true);
  error = signal('');

  private doughnutChart: Chart | null = null;
  private barChart: Chart | null = null;
  private chartsReady = false;

  fmt(n: number | undefined): string {
    return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  ngOnInit(): void {
    this.api.getAuditSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
        if (this.chartsReady) this.drawCharts();
      },
      error: () => {
        this.error.set('Failed to load dashboard data.');
        this.loading.set(false);
      },
    });

    this.api.getStockValue().subscribe({
      next: (v) => this.stockValue.set(v),
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.summary()) this.drawCharts();
  }

  ngOnDestroy(): void {
    this.doughnutChart?.destroy();
    this.barChart?.destroy();
  }

  private drawCharts(): void {
    const s = this.summary()!;

    // Doughnut — status breakdown
    if (this.doughnutCanvas) {
      this.doughnutChart?.destroy();
      this.doughnutChart = new Chart(this.doughnutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Received', 'In Progress', 'Ready', 'Delivered', 'Closed'],
          datasets: [{
            data: [s.openJobCards, s.inProgressJobCards, s.readyJobCards, s.deliveredJobCards, s.closedJobCards],
            backgroundColor: ['#94a3b8', '#3b82f6', '#10b981', '#22c55e', '#64748b'],
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: {
          cutout: '68%',
          plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 } } } },
        },
      });
    }

    // Bar — revenue MoM
    if (this.barCanvas) {
      this.barChart?.destroy();
      this.barChart = new Chart(this.barCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Previous Month', 'This Month'],
          datasets: [{
            label: 'Revenue (₹)',
            data: [s.revenuePreviousMonth, s.revenueThisMonth],
            backgroundColor: ['#e2e8f0', '#3b82f6'],
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }) },
            },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }

  goNewJobCard(): void {
    this.router.navigate(['/job-cards/new']);
  }
}
