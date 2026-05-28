import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import Chart from 'chart.js/auto';
import { ApiService } from '../core/services/api';
import { AuditSummary } from '../core/models/models';

@Component({
  selector: 'app-reports',
  imports: [DecimalPipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);

  @ViewChild('revenueBarCanvas') revenueBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusDoughnutCanvas') statusDoughnutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('momBarCanvas') momBarCanvas!: ElementRef<HTMLCanvasElement>;

  summary = signal<AuditSummary | null>(null);
  loading = signal(true);
  error = signal('');

  private revenueChart: Chart | null = null;
  private statusChart: Chart | null = null;
  private momChart: Chart | null = null;
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
        this.error.set('Failed to load report data.');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.summary()) this.drawCharts();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.statusChart?.destroy();
    this.momChart?.destroy();
  }

  private drawCharts(): void {
    const s = this.summary()!;

    // Revenue breakdown bar
    if (this.revenueBarCanvas) {
      this.revenueChart?.destroy();
      this.revenueChart = new Chart(this.revenueBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Labour', 'Parts', 'Ancillary'],
          datasets: [{
            label: 'Revenue (₹)',
            data: [s.labourChargesTotal, s.partsRevenueTotal, s.ancillaryRevenueTotal],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
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

    // Status doughnut
    if (this.statusDoughnutCanvas) {
      this.statusChart?.destroy();
      this.statusChart = new Chart(this.statusDoughnutCanvas.nativeElement, {
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
          cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } } },
        },
      });
    }

    // MoM revenue bar
    if (this.momBarCanvas) {
      this.momChart?.destroy();
      this.momChart = new Chart(this.momBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Previous Month', 'This Month'],
          datasets: [
            {
              label: 'Revenue',
              data: [s.revenuePreviousMonth, s.revenueThisMonth],
              backgroundColor: ['#e2e8f0', '#3b82f6'],
              borderRadius: 6,
              borderSkipped: false,
              yAxisID: 'y',
            },
            {
              label: 'Invoices',
              data: [s.invoicesPreviousMonth, s.invoicesThisMonth],
              backgroundColor: ['#fef3c7', '#f59e0b'],
              borderRadius: 6,
              borderSkipped: false,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: {
              beginAtZero: true,
              position: 'left',
              grid: { color: '#f1f5f9' },
              ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }) },
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { stepSize: 1 },
            },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }
}
