import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LoginRequest, AuthResponse, AuditSummary,
  JobCardSummary, JobCardDetail, CreateJobCardRequest,
  InventoryItem, InvoiceDetail, AppUser, Part, PagedResponse, StockItem,
  Technician, VehicleRecord,
} from '../models/models';

const BASE = 'http://32.194.147.195:8080';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/user-service/api/auth/login`, body);
  }
  logout(): Observable<void> {
    return this.http.post<void>(`${BASE}/user-service/api/auth/logout`, {});
  }

  // ── Audit / Dashboard ────────────────────────────────────────────────────
  getAuditSummary(): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${BASE}/orders-service/api/audit/summary`);
  }
  getStockValue(): Observable<number> {
    return this.http.get<number>(`${BASE}/inventory-service/api/stock/value`);
  }
  getStockByPartNumber(partNumber: string): Observable<StockItem> {
    return this.http.get<StockItem>(`${BASE}/inventory-service/api/stock/${encodeURIComponent(partNumber)}`);
  }

  // ── Job Cards ────────────────────────────────────────────────────────────
  getJobCards(): Observable<JobCardSummary[]> {
    return this.http.get<JobCardSummary[]>(`${BASE}/orders-service/api/job-cards`);
  }
  getJobCard(id: number): Observable<JobCardDetail> {
    return this.http.get<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}`);
  }
  createJobCard(body: CreateJobCardRequest): Observable<JobCardDetail> {
    return this.http.post<JobCardDetail>(`${BASE}/orders-service/api/job-cards`, body);
  }
  updateJobCardStatus(id: number, status: string): Observable<JobCardDetail> {
    return this.http.patch<JobCardDetail>(
      `${BASE}/orders-service/api/job-cards/${id}/status`, {},
      { params: new HttpParams().set('status', status) }
    );
  }
  updateJobCardPayment(id: number, paymentType: string, paymentStatus: string): Observable<JobCardDetail> {
    return this.http.patch<JobCardDetail>(
      `${BASE}/orders-service/api/job-cards/${id}/payment`, {},
      { params: new HttpParams().set('paymentType', paymentType).set('paymentStatus', paymentStatus) }
    );
  }
  addLabour(id: number, body: object): Observable<JobCardDetail> {
    return this.http.post<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/labour`, body);
  }
  deleteLabour(id: number, labourId: number): Observable<JobCardDetail> {
    return this.http.delete<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/labour/${labourId}`);
  }
  addPart(id: number, body: object): Observable<JobCardDetail> {
    return this.http.post<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/parts`, body);
  }
  deletePart(id: number, partId: number): Observable<JobCardDetail> {
    return this.http.delete<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/parts/${partId}`);
  }
  addAncillary(id: number, body: object): Observable<JobCardDetail> {
    return this.http.post<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/ancillary`, body);
  }
  deleteAncillary(id: number, ancId: number): Observable<JobCardDetail> {
    return this.http.delete<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/ancillary/${ancId}`);
  }
  jobCardPdfUrl(id: number): string {
    return `${BASE}/orders-service/api/job-cards/${id}/pdf`;
  }

  // ── Inventory ────────────────────────────────────────────────────────────
  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${BASE}/inventory-service/api/inventory`);
  }
  createInventoryItem(item: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${BASE}/inventory-service/api/inventory`, item);
  }
  updateInventoryItem(id: number, item: InventoryItem): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${BASE}/inventory-service/api/inventory/${id}`, item);
  }
  deleteInventoryItem(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/inventory-service/api/inventory/${id}`);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────
  getInvoices(): Observable<InvoiceDetail[]> {
    return this.http.get<InvoiceDetail[]>(`${BASE}/orders-service/api/invoices`);
  }
  getInvoice(id: number): Observable<InvoiceDetail> {
    return this.http.get<InvoiceDetail>(`${BASE}/orders-service/api/invoices/${id}`);
  }
  uploadInvoicePdf(pdfBytes: ArrayBuffer): Observable<InvoiceDetail> {
    return this.http.post<InvoiceDetail>(`${BASE}/orders-service/api/invoices/upload`, pdfBytes, {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }

  // ── Parts Catalogue ───────────────────────────────────────────────────────
  getParts(page: number, size: number): Observable<PagedResponse<Part>> {
    return this.http.get<PagedResponse<Part>>(`${BASE}/inventory-service/api/parts`, {
      params: new HttpParams().set('page', page).set('size', size),
    });
  }
  searchParts(q: string): Observable<Part[]> {
    return this.http.get<Part[]>(`${BASE}/inventory-service/api/parts/search`, {
      params: new HttpParams().set('q', q).set('size', 20),
    });
  }

  // ── Technicians ───────────────────────────────────────────────────────────
  getTechnicians(): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${BASE}/orders-service/api/technicians`);
  }
  getActiveTechnicians(): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${BASE}/orders-service/api/technicians/active`);
  }
  createTechnician(body: Partial<Technician>): Observable<Technician> {
    return this.http.post<Technician>(`${BASE}/orders-service/api/technicians`, body);
  }
  updateTechnician(id: number, body: Partial<Technician>): Observable<Technician> {
    return this.http.put<Technician>(`${BASE}/orders-service/api/technicians/${id}`, body);
  }
  deleteTechnician(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/orders-service/api/technicians/${id}`);
  }
  reassignTechnician(id: number, body: { specialisation?: string; dealerId?: number | null }): Observable<Technician> {
    return this.http.post<Technician>(`${BASE}/orders-service/api/technicians/${id}/reassign`, body);
  }

  // ── Vehicles ──────────────────────────────────────────────────────────────
  getVehicles(): Observable<VehicleRecord[]> {
    return this.http.get<VehicleRecord[]>(`${BASE}/orders-service/api/vehicles`);
  }
  getVehicleHistory(id: number): Observable<JobCardSummary[]> {
    return this.http.get<JobCardSummary[]>(`${BASE}/orders-service/api/vehicles/${id}/history`);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${BASE}/user-service/api/users`);
  }
}
