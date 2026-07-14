import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">الأشخاص</div>
          <h1 class="page-title">المستخدمون والموظفون</h1>
        </div>
        <button class="btn-primary text-sm" (click)="openAdd()">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          إضافة مستخدم
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي المستخدمين</div>
          <div class="text-2xl font-bold">{{ users().length }}</div>
          <div class="stat-bar"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">المديرون</div>
          <div class="text-2xl font-bold text-purple-600">{{ countByRole('Admin') }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#7c3aed,#06b6d4)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">السائقون</div>
          <div class="text-2xl font-bold text-blue-600">{{ countByRole('Driver') }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#0891b2,#06b6d4)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">نشط</div>
          <div class="text-2xl font-bold text-green-600">{{ users().length }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#34d399)"></div>
        </div>
      </div>

      <!-- Table -->
      <div class="erp-card overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
        } @else if (users().length === 0) {
          <div class="p-12 text-center">
            <div class="text-5xl mb-4">👤</div>
            <div class="text-gray-500">لا يوجد مستخدمون</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>اسم المستخدم</th>
                <th>الدور</th>
                <th>رقم السيارة</th>
                <th>تاريخ التعيين</th>
              <th></th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-2.5">
                      <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                           [style.background]="roleColor(u.role)">
                        {{ (u.fullName || u.userName || '?').charAt(0) }}
                      </div>
                      <span class="font-medium text-gray-800">{{ u.fullName }}</span>
                    </div>
                  </td>
                  <td class="text-gray-500 font-mono text-sm">{{ u.userName }}</td>
                  <td>
                    <span class="badge"
                          [class.badge-purple]="u.role === 'Admin'"
                          [class.badge-green]="u.role === 'Accountant'"
                          [class.badge-red]="u.role === 'Driver'"
                          [class.badge-gray]="u.role === 'Warehouse'">
                      {{ roleLabel(u.role) }}
                    </span>
                  </td>
                  <td class="text-gray-500 text-sm font-mono">{{ u.vehiclePlate || '—' }}</td>
                  <td class="text-gray-500 text-sm">{{ u.hireDate | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <button class="text-xs text-purple-600 hover:underline" (click)="openEdit(u)">تعديل الدور</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Add Modal -->
    @if (showModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-md p-6 fade-in">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">إضافة مستخدم جديد</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">الاسم الكامل *</label>
              <input [(ngModel)]="form.fullName" class="erp-input" placeholder="مثال: أحمد محمد" />
            </div>
            <div>
              <label class="erp-label">اسم المستخدم *</label>
              <input [(ngModel)]="form.userName" class="erp-input" placeholder="admin2" dir="ltr" />
            </div>
            <div>
              <label class="erp-label">كلمة المرور *</label>
              <input type="password" [(ngModel)]="form.password" class="erp-input" placeholder="8 أحرف على الأقل" dir="ltr" />
            </div>
            <div>
              <label class="erp-label">الدور *</label>
              <select [(ngModel)]="form.role" class="erp-input">
                <option value="Admin">مدير</option>
                <option value="Accountant">محاسب</option>
                <option value="Driver">سائق</option>
                <option value="Warehouse">مستودع</option>
              </select>
            </div>
            @if (form.role === 'Driver') {
              <div>
                <label class="erp-label">رقم لوحة السيارة</label>
                <input [(ngModel)]="form.vehiclePlate" class="erp-input" placeholder="ABC-1234" dir="ltr" />
              </div>
            }
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="save()" [disabled]="saving()">
              @if (saving()) { جاري الحفظ... } @else { إضافة المستخدم }
            </button>
            <button class="btn-ghost" (click)="showModal.set(false)">إلغاء</button>
          </div>
          @if (saveError()) {
            <div class="mt-2 text-red-500 text-sm">{{ saveError() }}</div>
          }
        </div>
      </div>
    }

    <!-- Edit Role Modal -->
    @if (showEditModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-sm p-6 fade-in">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">تعديل دور: {{ editUser?.fullName }}</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showEditModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">الدور الجديد *</label>
              <select [(ngModel)]="editRole" class="erp-input text-base">
                <option value="Admin">🔑 مدير — صلاحيات كاملة</option>
                <option value="Accountant">📊 محاسب — فواتير، حسابات، تقارير</option>
                <option value="Driver">🚛 سائق — شاشة التوصيل فقط</option>
                <option value="Warehouse">📦 مستودع — مخزون ومنتجات</option>
              </select>
            </div>
            @if (editRole === 'Driver') {
              <div>
                <label class="erp-label">رقم لوحة السيارة</label>
                <input [(ngModel)]="editVehiclePlate" class="erp-input" dir="ltr" placeholder="ABC-1234" />
              </div>
            }
          </div>

          <div class="mt-4 p-3 rounded-lg text-sm" style="background:#f3f0ff;color:#7c3aed">
            <strong>الصلاحيات:</strong>
            @if (editRole === 'Admin') { كل الصفحات والوظائف }
            @else if (editRole === 'Accountant') { لوحة التحكم، العملاء، الفواتير، المحاسبة، التقارير }
            @else if (editRole === 'Driver') { شاشة المندوب فقط (بضاعة السيارة + محطات التوصيل) }
            @else if (editRole === 'Warehouse') { لوحة التحكم، المنتجات، المخزون، التوصيل }
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="saveEdit()" [disabled]="saving()">
              @if (saving()) { جاري الحفظ... } @else { حفظ التغيير }
            </button>
            <button class="btn-ghost" (click)="showEditModal.set(false)">إلغاء</button>
          </div>
          @if (saveError()) {
            <div class="mt-2 text-red-500 text-sm">{{ saveError() }}</div>
          }
        </div>
      </div>
    }
  `,
})
export class EmployeesComponent implements OnInit {
  private api  = inject(ApiService);
  private auth = inject(AuthService);

  loading       = signal(true);
  saving        = signal(false);
  showModal     = signal(false);
  showEditModal = signal(false);
  saveError     = signal('');
  users         = signal<any[]>([]);

  editUser        : any = null;
  editRole        = '';
  editVehiclePlate= '';

  form = this.empty();

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getUsers().subscribe({
      next: d => { this.users.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd() { this.form = this.empty(); this.saveError.set(''); this.showModal.set(true); }

  save() {
    if (!this.form.fullName || !this.form.userName || !this.form.password) {
      this.saveError.set('الاسم واسم المستخدم وكلمة المرور مطلوبة'); return;
    }
    this.saving.set(true);
    const payload = {
      username    : this.form.userName,
      fullName    : this.form.fullName,
      password    : this.form.password,
      role        : this.form.role,
      vehiclePlate: this.form.vehiclePlate,
    };
    this.api.registerUser(payload).subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: err => {
        this.saving.set(false);
        const errs = err?.error;
        if (Array.isArray(errs)) this.saveError.set(errs.map((e: any) => e.description).join(' — '));
        else this.saveError.set(errs?.message ?? 'حدث خطأ');
      },
    });
  }

  openEdit(u: any) {
    this.editUser         = u;
    this.editRole         = u.role;
    this.editVehiclePlate = u.vehiclePlate ?? '';
    this.saveError.set('');
    this.showEditModal.set(true);
  }

  saveEdit() {
    if (!this.editRole) { this.saveError.set('اختر الدور'); return; }
    this.saving.set(true);
    this.api.updateUserRole(this.editUser.id, { role: this.editRole, vehiclePlate: this.editVehiclePlate }).subscribe({
      next: () => { this.saving.set(false); this.showEditModal.set(false); this.load(); },
      error: err => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? 'حدث خطأ');
      },
    });
  }

  countByRole(role: string) { return this.users().filter(u => u.role === role).length; }

  roleLabel(role: string): string {
    return { Admin: 'مدير', Accountant: 'محاسب', Driver: 'سائق', Warehouse: 'مستودع' }[role] ?? role;
  }

  roleColor(role: string): string {
    return { Admin: '#7c3aed', Accountant: '#059669', Driver: '#0891b2', Warehouse: '#d97706' }[role] ?? '#6b7280';
  }

  private empty() {
    return { fullName: '', userName: '', password: '', role: 'Driver', vehiclePlate: '' };
  }
}
