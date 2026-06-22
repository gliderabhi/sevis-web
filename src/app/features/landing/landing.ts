import { Component, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animId = 0;
  private t = 0;

  // Marching squares edge table: index = TL*8 + TR*4 + BR*2 + BL*1
  // Edges: 0=top, 1=right, 2=bottom, 3=left
  private readonly MS = [
    [],            // 0000
    [[3, 2]],      // 0001 BL
    [[2, 1]],      // 0010 BR
    [[3, 1]],      // 0011 BL+BR
    [[1, 0]],      // 0100 TR
    [[1, 0],[3, 2]],// 0101 saddle
    [[0, 2]],      // 0110 TR+BR
    [[3, 0]],      // 0111 TR+BR+BL
    [[0, 3]],      // 1000 TL
    [[0, 2]],      // 1001 TL+BL
    [[0, 1],[3, 2]],// 1010 saddle
    [[0, 1]],      // 1011 TL+BR+BL
    [[3, 1]],      // 1100 TL+TR
    [[2, 1]],      // 1101 TL+TR+BL
    [[3, 2]],      // 1110 TL+TR+BR
    [],            // 1111
  ];

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

  ngAfterViewInit(): void {
    // Scroll-reveal observer
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); this.observer?.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => this.observer!.observe(el));

    // Blob canvas
    this.canvas = document.querySelector('.hero-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.animate();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.animId);
  }

  private resize(): void {
    const hero = this.canvas.parentElement!.getBoundingClientRect();
    // Render at 35% resolution — CSS scales it up, bilinear gives smooth look
    this.canvas.width  = Math.floor(hero.width  * 0.35);
    this.canvas.height = Math.floor(hero.height * 0.35);
  }

  private animate(): void {
    this.drawBlob();
    this.t += 0.0035;
    this.animId = requestAnimationFrame(() => this.animate());
  }

  private drawBlob(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    // Blob radius — slightly taller than wide to fill portrait-ish hero
    const R = Math.min(cx, cy) * 0.93;

    const cols = w + 1;
    const rows = h + 1;

    // Pre-compute field grid (one value per pixel corner)
    const grid = new Float32Array(cols * rows);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        grid[gy * cols + gx] = this.field(gx, gy, cx, cy, R);
      }
    }

    // Draw black background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);

    // March through cells and draw contour lines at multiple iso-levels
    const isoLevels = 18;
    const minV = 0.02;
    const maxV = 0.92;

    this.ctx.lineWidth = 0.8;
    this.ctx.lineCap = 'round';

    for (let iso = 0; iso < isoLevels; iso++) {
      const threshold = minV + (iso / (isoLevels - 1)) * (maxV - minV);
      // Brightness: brighter near the "top" of the blob, dimmer at edges
      const brightness = Math.floor(80 + 140 * (iso / isoLevels));
      this.ctx.strokeStyle = `rgb(${brightness},${brightness},${brightness})`;
      this.ctx.beginPath();

      for (let gy = 0; gy < h; gy++) {
        for (let gx = 0; gx < w; gx++) {
          const tl = grid[ gy      * cols + gx    ];
          const tr = grid[ gy      * cols + gx + 1];
          const br = grid[(gy + 1) * cols + gx + 1];
          const bl = grid[(gy + 1) * cols + gx    ];

          // Skip cells completely outside the blob
          if (tl < 0 && tr < 0 && br < 0 && bl < 0) continue;

          const idx =
            (tl > threshold ? 8 : 0) |
            (tr > threshold ? 4 : 0) |
            (br > threshold ? 2 : 0) |
            (bl > threshold ? 1 : 0);

          const segs = this.MS[idx];
          for (const [e1, e2] of segs) {
            const p1 = this.edgePoint(e1, gx, gy, tl, tr, br, bl, threshold);
            const p2 = this.edgePoint(e2, gx, gy, tl, tr, br, bl, threshold);
            this.ctx.moveTo(p1[0], p1[1]);
            this.ctx.lineTo(p2[0], p2[1]);
          }
        }
      }
      this.ctx.stroke();
    }
  }

  /** Interpolated point on a cell edge for the given threshold */
  private edgePoint(
    edge: number, gx: number, gy: number,
    tl: number, tr: number, br: number, bl: number,
    th: number
  ): [number, number] {
    switch (edge) {
      case 0: { // top: TL → TR
        const t = (th - tl) / (tr - tl || 1e-9);
        return [gx + t, gy];
      }
      case 1: { // right: TR → BR
        const t = (th - tr) / (br - tr || 1e-9);
        return [gx + 1, gy + t];
      }
      case 2: { // bottom: BL → BR
        const t = (th - bl) / (br - bl || 1e-9);
        return [gx + t, gy + 1];
      }
      default: { // left (3): TL → BL
        const t = (th - tl) / (bl - tl || 1e-9);
        return [gx, gy + t];
      }
    }
  }

  /** Scalar field: hemisphere base + wave turbulence, negative outside blob */
  private field(px: number, py: number, cx: number, cy: number, R: number): number {
    const dx = (px - cx) / R;
    const dy = (py - cy) / R;
    const r2 = dx * dx + dy * dy;
    if (r2 >= 1.0) return -1;          // outside unit circle

    const z = Math.sqrt(1 - r2);       // sphere surface
    const t = this.t;

    // Multiple wave deformations give the organic topology
    const w =
      Math.sin(dx * 4.2 + t * 0.42) * Math.cos(dy * 3.7 + t * 0.30) * 0.26 +
      Math.sin(dx * 2.6 - dy * 3.2 + t * 0.28) * 0.18 +
      Math.cos(dx * 6.1 + dy * 5.4 + t * 0.17) * 0.11 +
      Math.sin(Math.sqrt(r2) * 7.8 - t * 0.52) * 0.20 +
      Math.cos(dx * 3.4 - dy * 2.8 - t * 0.38) * 0.14 +
      Math.sin(dx * 5.0 + dy * 4.3 + t * 0.23) * 0.09;

    return z + w;
  }
}
