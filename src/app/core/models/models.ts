// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'ADMIN' | 'DEALER' | 'TECHNICIAN'
  | 'OWNER' | 'GM' | 'MANAGER' | 'SERVICE_ADVISOR' | 'SUPERVISOR' | 'SENIOR_TECHNICIAN' | 'HELPER';
export interface LoginRequest { email: string; password: string; }
export interface AuthResponse  { token: string; role: string; name?: string; email?: string; }

// ── Audit / Dashboard ─────────────────────────────────────────────────────────
export interface AuditSummary {
  openJobCards: number; inProgressJobCards: number; readyJobCards: number;
  deliveredJobCards: number; closedJobCards: number; totalJobCards: number;
  labourChargesTotal: number; partsRevenueTotal: number; ancillaryRevenueTotal: number;
  totalRevenue: number; revenueThisMonth: number; invoicesThisMonth: number;
  revenuePreviousMonth: number; invoicesPreviousMonth: number;
  totalInvoices: number; averageInvoiceValue: number;
  totalSalaryPaid: number; salaryPaidThisMonth: number; netProfitThisMonth: number;
}

export interface TechnicianSalary {
  id: number; technicianId: number; technicianName: string;
  month: number; year: number;
  baseSalary: number; bonus: number; deductions: number; netPay: number;
  status: string; paidDate?: string; notes?: string;
}

// ── Job Cards ─────────────────────────────────────────────────────────────────
export interface JobCardSummary {
  id: number; jobCardNumber: string; customerName: string; customerPhone: string;
  vehicleRegNumber: string; vehicleMakeModel: string; serviceType: string;
  status: string; dateIn?: string; kmIn: number; grandTotal?: number;
}
export interface CustomerInfo { id: number; name: string; phone: string; email?: string; address?: string; }
export interface VehicleInfo  {
  id: number; regNumber: string; make?: string; model?: string; variant?: string;
  year?: number; chassisNo?: string; engineNo?: string; color?: string; fuelType?: string;
}
export interface LabourItemInfo   { id: number; description: string; type: string; technicianId?: number; technicianName?: string; taskStatus: string; quantity: number; rate: number; amount: number; parts: PartItemInfo[]; }
export interface Technician       { id: number; userId?: number | null; name: string; phone?: string; specialisation?: string; employeeCode?: string; panNumber?: string; aadhaarNumber?: string; baseRate?: number; active: boolean; dealerId?: number | null; joinedDate?: string; leftDate?: string; supervisorTechnicianId?: number | null; supervisorName?: string; }

// ── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
export type LeaveType = 'CASUAL' | 'SICK' | 'PAID' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AttendanceRecord {
  id: number; technicianUserId: number; dealerId?: number | null; date: string;
  status: AttendanceStatus; checkInTime?: string; checkOutTime?: string; manuallyMarked: boolean;
}

export interface LeaveRequest {
  id: number; technicianUserId: number; dealerId?: number | null;
  fromDate: string; toDate: string; leaveType: LeaveType; reason?: string;
  status: LeaveStatus; appliedAt?: string; decidedBy?: number | null;
  decidedAt?: string; decisionNote?: string;
}
export interface VehicleRecord    { id: number; regNumber: string; make?: string; model?: string; variant?: string; year?: number; chassisNo?: string; engineNo?: string; color?: string; fuelType?: string; }
export interface PartItemInfo     { id: number; partNumber: string; description: string; partType: string; quantity: number; unitPrice: number; totalPrice: number; }
export interface AncillaryItemInfo{ id: number; description: string; amount: number; }
export interface ChecksInfo {
  fuelLevel: number; tireFLPsi?: string; tireRLPsi?: string; tireFRPsi?: string;
  tireRRPsi?: string; tireSparePsi?: string; hasToolKit: boolean; hasStepney: boolean;
  hasBrochure: boolean; hasInsurance: boolean; hasPUC: boolean; hasRC: boolean; notes?: string;
}
export interface BillingInfo {
  labourTotal: number; partsTotal: number; ancillaryTotal: number; subTotal: number;
  discount: number; taxableAmount: number; cgstRate: number; cgstAmount: number;
  sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number;
  grandTotal: number; advanceAmount: number; balanceDue: number;
  paymentType: string; paymentStatus: string;
}
export interface InvoiceInfo {
  id: number; invoiceNumber: string; invoiceDate?: string;
  originalJobCardNumber?: string; grandTotal?: number; paymentMethod?: string;
}
export interface JobCardDetail {
  id: number; dealerId?: number; jobCardNumber: string; serviceType: string; status: string;
  kmIn: number; expectedDelivery?: string; customerComplaint?: string;
  technicianRemarks?: string; advisorName?: string; dateIn?: string; dateOut?: string;
  customer: CustomerInfo; vehicle: VehicleInfo;
  labourItems: LabourItemInfo[]; parts?: PartItemInfo[];
  ancillaryItems: AncillaryItemInfo[]; checks?: ChecksInfo; billing?: BillingInfo;
  invoice?: InvoiceInfo;
}

// Create request shapes
export interface CreateJobCardRequest {
  customer:  { phone: string; name: string; email?: string | null; address?: string | null; };
  vehicle:   { regNumber: string; make?: string|null; model?: string|null; variant?: string|null; year?: number|null; fuelType?: string|null; color?: string|null; chassisNo?: string|null; };
  serviceType: string; kmIn: number; advisorName?: string|null;
  expectedDelivery?: string|null; customerComplaint?: string|null;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export interface InventoryItem { id: number; name: string; sku: string; quantity: number; price: number; category?: 'PART' | 'ANCILLARY' | string; }

// ── Invoices ─────────────────────────────────────────────────────────────────
export interface InvoiceLineItem {
  id: number; lineNumber?: number; hsnCode?: string; partNumber?: string;
  description?: string; type?: string; quantity?: number; rate?: number;
  baseAmount?: number; discountAmount?: number; taxableAmount?: number;
  cgstRate?: number; cgstAmount?: number; sgstRate?: number; sgstAmount?: number; totalAmount?: number;
}
export interface InvoiceDetail {
  id: number; invoiceNumber: string; invoiceDate?: string; originalJobCardNumber?: string;
  jobCardId?: number; dealerGstin?: string; dealerName?: string; serviceType?: string;
  paymentMethod?: string; vehicleRegNo?: string; chassisNo?: string; kms?: number;
  preparedBy?: string; partsNetTaxableAmount?: number; taxableAmount?: number; totalTaxAmount?: number;
  grandTotal?: number; adjustments?: number; lineItems: InvoiceLineItem[];
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface AppUser { id: number; name: string; email: string; phone?: string; role?: string; }

// ── Stock ─────────────────────────────────────────────────────────────────────
export interface StockItem {
  id: number; partNumber: string; quantity: number; purchasePrice?: number;
  description: string; mrpPrice: number; uom: string; productGroup: string;
}

// ── Parts Catalogue ───────────────────────────────────────────────────────────
export interface Part {
  id: number; partNumber: string; description: string;
  mrpPrice: number; purchasePrice: number;
  uom: string; productGroup: string; hsnCode: string; taxSlab: string;
}

export interface PagedResponse<T> {
  content: T[]; totalElements: number; totalPages: number; last: boolean; number: number;
}
