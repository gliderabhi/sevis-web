import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  LoginRequest, AuthResponse, AuditSummary,
  JobCardSummary, JobCardDetail, CreateJobCardRequest,
  InventoryItem, InvoiceDetail, AppUser, Part, PagedResponse,
  Technician, VehicleRecord, TechnicianSalary,
  AttendanceRecord, LeaveRequest, LeaveType, LeaveStatus, AttendanceStatus,
} from '../models/models';

const BASE = '';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/user-service/api/auth/login`, body);
  }
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/user-service/api/auth/google`, { idToken });
  }
  completeGoogleSignup(body: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/user-service/api/auth/google/complete`, body);
  }
  logout(): Observable<void> {
    return this.http.post<void>(`${BASE}/user-service/api/auth/logout`, {});
  }
  registerDealer(body: Record<string, unknown>): Observable<{ message: string; userId: number }> {
    return this.http.post<{ message: string; userId: number }>(`${BASE}/user-service/api/auth/signup`, body);
  }
  registerTechnician(body: { name: string; email: string; password: string; phone?: string; role?: string }): Observable<{ message: string; userId: number }> {
    const payload: Record<string, unknown> = { name: body.name, email: body.email, password: body.password, role: body.role ?? 'TECHNICIAN', accountType: 'INDIVIDUAL' };
    if (body.phone?.trim()) payload['phone'] = body.phone.trim();
    return this.http.post<{ message: string; userId: number }>(`${BASE}/user-service/api/auth/signup`, payload);
  }
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${BASE}/user-service/api/auth/change-password`, { currentPassword, newPassword });
  }

  // ── Audit / Dashboard ────────────────────────────────────────────────────
  getAuditSummary(): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${BASE}/orders-service/api/audit/summary`);
  }
  getStockValue(): Observable<number> {
    // /api/inventory/value (not the older /api/stock/value) — matches what dealers
    // actually add through the Inventory page; /api/stock is a separate, disconnected
    // FIFO-batch valuation that inventory_items writes never populate.
    return this.http.get<number>(`${BASE}/inventory-service/api/inventory/value`);
  }
  getStockByPartNumber(partNumber: string, companyId?: number): Observable<InventoryItem> {
    let params = new HttpParams();
    if (companyId != null) params = params.set('companyId', companyId);
    return this.http.get<InventoryItem>(`${BASE}/inventory-service/api/inventory/by-sku/${encodeURIComponent(partNumber)}`, { params });
  }

  // ── Job Cards ────────────────────────────────────────────────────────────
  getJobCards(from?: string, to?: string): Observable<JobCardSummary[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<JobCardSummary[]>(`${BASE}/orders-service/api/job-cards`, { params });
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
  updateJobCardBilling(id: number, body: { discount: number; cgstRate: number; sgstRate: number; igstRate: number }): Observable<JobCardDetail> {
    return this.http.patch<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/billing`, body);
  }
  addLabour(id: number, body: object): Observable<JobCardDetail> {
    return this.http.post<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/labour`, body);
  }
  deleteLabour(id: number, labourId: number): Observable<JobCardDetail> {
    return this.http.delete<JobCardDetail>(`${BASE}/orders-service/api/job-cards/${id}/labour/${labourId}`);
  }
  updateLabourStatus(id: number, labourId: number, taskStatus: string): Observable<JobCardDetail> {
    return this.http.patch<JobCardDetail>(
      `${BASE}/orders-service/api/job-cards/${id}/labour/${labourId}/status`, {},
      { params: new HttpParams().set('taskStatus', taskStatus) }
    );
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
  generateInvoiceForJobCard(id: number): Observable<InvoiceDetail> {
    return this.http.post<InvoiceDetail>(`${BASE}/orders-service/api/job-cards/${id}/invoice`, {});
  }

  // ── Inventory ────────────────────────────────────────────────────────────
  getInventory(category?: string): Observable<InventoryItem[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.http.get<InventoryItem[]>(`${BASE}/inventory-service/api/inventory${params}`);
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
  getInvoices(from?: string, to?: string): Observable<InvoiceDetail[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<InvoiceDetail[]>(`${BASE}/orders-service/api/invoices`, { params });
  }
  getInvoice(id: number): Observable<InvoiceDetail> {
    return this.http.get<InvoiceDetail>(`${BASE}/orders-service/api/invoices/${id}`);
  }
  // Returns an Observable (rather than firing the download itself) so callers can track
  // completion and guard against a second click starting a second download before the
  // first one finishes — see job-card-detail's downloadPdf().
  downloadInvoicePdf(id: number, filename: string): Observable<void> {
    return this.http.get(`${BASE}/orders-service/api/invoices/${id}/pdf`, { responseType: 'blob' }).pipe(
      map(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      })
    );
  }
  // Raw blob for inline preview (an <iframe>/<embed>) — unlike downloadInvoicePdf this
  // doesn't trigger a save-as, since the server's Content-Disposition: attachment header
  // only matters when navigating straight to the URL, not when we hand the bytes to the
  // browser ourselves via an object URL.
  getInvoicePdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/orders-service/api/invoices/${id}/pdf`, { responseType: 'blob' });
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

  // ── Technician Salaries ───────────────────────────────────────────────────
  getSalariesByTechnician(technicianId: number): Observable<TechnicianSalary[]> {
    return this.http.get<TechnicianSalary[]>(`${BASE}/orders-service/api/technician-salaries/technician/${technicianId}`);
  }
  getSalariesByMonth(month: number, year: number): Observable<TechnicianSalary[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<TechnicianSalary[]>(`${BASE}/orders-service/api/technician-salaries`, { params });
  }
  upsertSalary(body: Partial<TechnicianSalary>): Observable<TechnicianSalary> {
    return this.http.post<TechnicianSalary>(`${BASE}/orders-service/api/technician-salaries`, body);
  }
  markSalaryPaid(id: number): Observable<TechnicianSalary> {
    return this.http.patch<TechnicianSalary>(`${BASE}/orders-service/api/technician-salaries/${id}/pay`, {});
  }
  deleteSalary(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/orders-service/api/technician-salaries/${id}`);
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

  // ── Attendance ────────────────────────────────────────────────────────────
  checkIn(): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${BASE}/attendance-service/api/attendance/check-in`, {});
  }
  checkOut(): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${BASE}/attendance-service/api/attendance/check-out`, {});
  }
  myAttendance(from?: string, to?: string): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<AttendanceRecord[]>(`${BASE}/attendance-service/api/attendance/me`, { params });
  }
  teamAttendance(from?: string, to?: string): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<AttendanceRecord[]>(`${BASE}/attendance-service/api/attendance/team`, { params });
  }
  markAttendance(technicianUserId: number, date: string, status: AttendanceStatus): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${BASE}/attendance-service/api/attendance/mark`, { technicianUserId, date, status });
  }

  // ── Leave Requests ────────────────────────────────────────────────────────
  applyLeave(body: { fromDate: string; toDate: string; leaveType: LeaveType; reason: string }): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${BASE}/attendance-service/api/leaves`, body);
  }
  myLeaves(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${BASE}/attendance-service/api/leaves/me`);
  }
  teamLeaves(status?: LeaveStatus): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<LeaveRequest[]>(`${BASE}/attendance-service/api/leaves/team`, { params });
  }
  approveLeave(id: number, note?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${BASE}/attendance-service/api/leaves/${id}/approve`, { note });
  }
  rejectLeave(id: number, note?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${BASE}/attendance-service/api/leaves/${id}/reject`, { note });
  }
  cancelLeave(id: number): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${BASE}/attendance-service/api/leaves/${id}/cancel`, {});
  }
}
