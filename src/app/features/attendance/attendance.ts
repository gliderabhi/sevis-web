import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';
import { AttendanceRecord, LeaveRequest, LeaveType, AttendanceStatus } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';

const BLANK_LEAVE = () => ({ fromDate: '', toDate: '', leaveType: 'CASUAL' as LeaveType, reason: '' });
const BLANK_MARK = () => ({ technicianUserId: null as number | null, date: new Date().toISOString().slice(0, 10), status: 'PRESENT' as AttendanceStatus });

@Component({
  selector: 'app-attendance',
  imports: [FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.css',
})
export class AttendanceComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  loading = signal(true);
  error = signal('');

  today = signal<AttendanceRecord | null>(null);
  myRecords = signal<AttendanceRecord[]>([]);
  myLeaves = signal<LeaveRequest[]>([]);
  teamRecords = signal<AttendanceRecord[]>([]);
  teamLeaves = signal<LeaveRequest[]>([]);

  checkingInOut = signal(false);
  checkError = signal('');

  showLeaveForm = signal(false);
  leaveForm = signal(BLANK_LEAVE());
  savingLeave = signal(false);
  leaveError = signal('');

  showMarkForm = signal(false);
  markForm = signal(BLANK_MARK());
  savingMark = signal(false);
  markError = signal('');

  leaveTypes: LeaveType[] = ['CASUAL', 'SICK', 'PAID', 'UNPAID'];
  attendanceStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'];

  get isTechnician(): boolean { return this.auth.isTechnician(); }

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    if (this.isTechnician) {
      // Staff tier always has their own check-in/out + leave history, and — new — may
      // also have direct reports (e.g. a Technician supervising Helpers), so team
      // attendance/leave is fetched here too; it just comes back empty if they have none.
      forkJoin({
        attendance: this.api.myAttendance(),
        leaves: this.api.myLeaves(),
        teamAttendance: this.api.teamAttendance(),
        teamLeaves: this.api.teamLeaves(),
      }).subscribe({
        next: ({ attendance, leaves, teamAttendance, teamLeaves }) => {
          this.myRecords.set(attendance);
          const todayStr = new Date().toISOString().slice(0, 10);
          this.today.set(attendance.find(r => r.date === todayStr) ?? null);
          this.myLeaves.set(leaves);
          this.teamRecords.set(teamAttendance);
          this.teamLeaves.set(teamLeaves);
          this.loading.set(false);
        },
        error: () => { this.error.set('Failed to load attendance.'); this.loading.set(false); },
      });
    } else {
      forkJoin({
        attendance: this.api.teamAttendance(),
        leaves: this.api.teamLeaves(),
      }).subscribe({
        next: ({ attendance, leaves }) => {
          this.teamRecords.set(attendance);
          this.teamLeaves.set(leaves);
          this.loading.set(false);
        },
        error: () => { this.error.set('Failed to load team attendance.'); this.loading.set(false); },
      });
    }
  }

  // ── Technician: check-in/out ────────────────────────────────────────────
  checkIn(): void {
    this.checkingInOut.set(true);
    this.checkError.set('');
    this.api.checkIn().subscribe({
      next: () => { this.checkingInOut.set(false); this.load(); },
      error: (err) => { this.checkError.set(apiErrorMessage(err, 'Check-in failed.')); this.checkingInOut.set(false); },
    });
  }

  checkOut(): void {
    this.checkingInOut.set(true);
    this.checkError.set('');
    this.api.checkOut().subscribe({
      next: () => { this.checkingInOut.set(false); this.load(); },
      error: (err) => { this.checkError.set(apiErrorMessage(err, 'Check-out failed.')); this.checkingInOut.set(false); },
    });
  }

  // ── Technician: leave requests ──────────────────────────────────────────
  openLeaveForm(): void {
    this.leaveForm.set(BLANK_LEAVE());
    this.leaveError.set('');
    this.showLeaveForm.set(true);
  }
  closeLeaveForm(): void { this.showLeaveForm.set(false); }

  submitLeave(): void {
    const f = this.leaveForm();
    if (!f.fromDate || !f.toDate) { this.leaveError.set('Select both from and to dates.'); return; }
    if (!f.reason.trim()) { this.leaveError.set('Reason is required.'); return; }
    this.savingLeave.set(true);
    this.leaveError.set('');
    this.api.applyLeave(f).subscribe({
      next: () => { this.savingLeave.set(false); this.closeLeaveForm(); this.load(); },
      error: (err) => { this.leaveError.set(apiErrorMessage(err, 'Failed to submit leave request.')); this.savingLeave.set(false); },
    });
  }

  cancelLeave(l: LeaveRequest): void {
    if (!confirm('Cancel this leave request?')) return;
    this.api.cancelLeave(l.id).subscribe({ next: () => this.load() });
  }

  // ── Dealer/Admin: team review ───────────────────────────────────────────
  approve(l: LeaveRequest): void {
    const note = prompt('Remark for the technician (optional):') ?? undefined;
    this.api.approveLeave(l.id, note).subscribe({ next: () => this.load() });
  }
  reject(l: LeaveRequest): void {
    const note = prompt('Reason for rejection (sent to the technician):') ?? undefined;
    if (note === undefined) return;
    this.api.rejectLeave(l.id, note).subscribe({ next: () => this.load() });
  }

  openMarkForm(): void {
    this.markForm.set(BLANK_MARK());
    this.markError.set('');
    this.showMarkForm.set(true);
  }
  closeMarkForm(): void { this.showMarkForm.set(false); }

  submitMark(): void {
    const f = this.markForm();
    if (!f.technicianUserId) { this.markError.set('Enter the technician\'s user account ID.'); return; }
    this.savingMark.set(true);
    this.markError.set('');
    this.api.markAttendance(f.technicianUserId, f.date, f.status).subscribe({
      next: () => { this.savingMark.set(false); this.closeMarkForm(); this.load(); },
      error: (err) => { this.markError.set(apiErrorMessage(err, 'Failed to mark attendance.')); this.savingMark.set(false); },
    });
  }

  fmtDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  fmtTime(t: string | undefined): string {
    if (!t) return '—';
    return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
