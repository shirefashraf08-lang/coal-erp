import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface CustomerForm {
  name: string;
  phone: string;
  address: string;
  paymentType: 'Cash' | 'Credit';
  creditLimit: number;
  openingBalance: number;
  notes: string;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">الأشخاص</div>
          <h1 class="page-title">إدارة العملاء
            <span class="text-base font-normal text-gray-400">({{ filtered().length }})</span>
          </h1>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary text-sm" (click)="openAdd()">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            إضافة عميل
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي العملاء</div>
          <div class="text-2xl font-bold">{{ customers().length }}</div>
          <div class="stat-bar"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">عملاء آجل</div>
          <div class="text-2xl font-bold">{{ creditCount() }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#7c3aed,#06b6d4)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي الديون</div>
          <div class="text-2xl font-bold text-orange-600">{{ totalDebt() | number:'1.0-0' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#ef4444)"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">العملاء النشطون</div>
          <div class="text-2xl font-bold text-green-600">{{ activeCount() }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
        </div>
      </div>

      <!-- Filters + Search -->
      <div class="erp-card mb-4 px-4 py-3 flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          @for (f of filters; track f.value) {
            <button class="text-xs px-3 py-1 rounded-full border transition"
                    [style.background]="activeFilter() === f.value ? '#7c3aed' : 'transparent'"
                    [style.color]="activeFilter() === f.value ? 'white' : '#6b7280'"
                    [style.border-color]="activeFilter() === f.value ? '#7c3aed' : '#e5e7eb'"
                    (click)="activeFilter.set(f.value)">
              {{ f.label }}
            </button>
          }
        </div>
        <div class="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" [(ngModel)]="search" placeholder="بحث بالاسم أو رقم التليفون..." class="erp-input ps-9 text-sm" />
        </div>
      </div>

      <!-- Table -->
      <div class="erp-card overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
        } @else if (filtered().length === 0) {
          <div class="p-12 text-center">
            <div class="text-5xl mb-4">👥</div>
            <div class="text-gray-500 font-medium">لا يوجد عملاء بعد</div>
            <div class="text-gray-400 text-sm mt-1">أضف أول عميل باستخدام زر "إضافة عميل"</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>رقم التليفون</th>
                <th>العنوان</th>
                <th>نوع الدفع</th>
                <th>الرصيد الافتتاحي</th>
                <th>الرصيد الحالي</th>
                <th>الحد الائتماني</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (c of filtered(); track c.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-2.5">
                      <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                           [style.background]="avatarColor(c.id)">
                        {{ (c.name || '').charAt(0) }}
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">{{ c.name }}</div>
                        <div class="text-xs" [style.color]="c.isActive ? '#059669' : '#9ca3af'">
                          {{ c.isActive ? 'نشط' : 'موقوف' }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <a [href]="'tel:' + c.phone" class="text-sm text-purple-600 hover:underline">{{ c.phone || '—' }}</a>
                  </td>
                  <td class="text-gray-500 text-sm max-w-32 truncate">{{ c.address || '—' }}</td>
                  <td>
                    <span class="badge" [class.badge-purple]="c.paymentType === 'Credit'" [class.badge-green]="c.paymentType === 'Cash'">
                      {{ c.paymentType === 'Credit' ? 'آجل' : 'نقدي' }}
                    </span>
                  </td>
                  <td class="font-medium text-sm text-blue-600">{{ c.openingBalance | number:'1.0-0' }}</td>
                  <td>
                    <span class="font-semibold text-sm" [style.color]="c.currentBalance > 0 ? '#d97706' : '#059669'">
                      {{ c.currentBalance | number:'1.0-0' }}
                    </span>
                  </td>
                  <td class="text-gray-500 text-sm">{{ c.creditLimit | number:'1.0-0' }}</td>
                  <td>
                    <div class="flex gap-1">
                      <button class="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                              (click)="openEdit(c)" title="تعديل">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button class="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                              (click)="deleteCustomer(c.id)" title="حذف">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- ─── Add / Edit Modal ───────────────────────────────────────── -->
    @if (showModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-lg p-6 fade-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">{{ editingId() ? 'تعديل العميل' : 'إضافة عميل جديد' }}</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="closeModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="erp-label">اسم العميل *</label>
              <input [(ngModel)]="form.name" class="erp-input" placeholder="مثال: مؤسسة النور" required />
            </div>
            <div>
              <label class="erp-label">رقم التليفون *</label>
              <input [(ngModel)]="form.phone" class="erp-input" type="tel" placeholder="05xxxxxxxx" />
            </div>
            <div>
              <label class="erp-label">نوع الدفع</label>
              <select [(ngModel)]="form.paymentType" class="erp-input">
                <option value="Cash">نقدي</option>
                <option value="Credit">آجل</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="erp-label">العنوان</label>
              <input [(ngModel)]="form.address" class="erp-input" placeholder="المدينة، الحي..." />
            </div>
            @if (form.paymentType === 'Credit') {
              <div>
                <label class="erp-label">الحد الائتماني (ج.م)</label>
                <input type="number" [(ngModel)]="form.creditLimit" class="erp-input" min="0" />
              </div>
            }
            @if (!editingId()) {
              <div [class.col-span-2]="form.paymentType !== 'Credit'">
                <label class="erp-label">الرصيد الافتتاحي (ج.م)</label>
                <input type="number" [(ngModel)]="form.openingBalance" class="erp-input" min="0"
                       placeholder="0 = لا يوجد رصيد قديم" />
                <div class="text-xs text-gray-400 mt-1">المبلغ الذي يدين به العميل من قبل بدء النظام</div>
              </div>
            }
            <div class="col-span-2">
              <label class="erp-label">ملاحظات</label>
              <textarea [(ngModel)]="form.notes" class="erp-input" rows="2" placeholder="أي ملاحظات..."></textarea>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="save()" [disabled]="saving()">
              @if (saving()) { جاري الحفظ... } @else { {{ editingId() ? 'حفظ التعديلات' : 'إضافة العميل' }} }
            </button>
            <button class="btn-ghost" (click)="closeModal()">إلغاء</button>
          </div>
          @if (saveError()) {
            <div class="mt-3 text-red-500 text-sm text-center">{{ saveError() }}</div>
          }
        </div>
      </div>
    }
  `,
})
export class CustomersComponent implements OnInit {
  private api = inject(ApiService);
  private readonly COLORS = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#6366f1'];

  search = '';
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saveError = signal('');
  customers = signal<any[]>([]);
  activeFilter = signal<'all' | 'cash' | 'credit'>('all');

  filters = [
    { value: 'all' as const, label: 'الكل' },
    { value: 'cash' as const, label: 'نقدي' },
    { value: 'credit' as const, label: 'آجل' },
  ];

  form: CustomerForm = this.emptyForm();

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.customers().filter(c => {
      const matchFilter = this.activeFilter() === 'all'
        || (this.activeFilter() === 'cash' && c.paymentType === 'Cash')
        || (this.activeFilter() === 'credit' && c.paymentType === 'Credit');
      const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
      return matchFilter && matchSearch;
    });
  });

  totalDebt  = computed(() => this.customers().reduce((s, c) => s + Math.max(c.currentBalance ?? 0, 0), 0));
  creditCount= computed(() => this.customers().filter(c => c.paymentType === 'Credit').length);
  activeCount= computed(() => this.customers().filter(c => c.isActive).length);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getCustomers().subscribe({
      next: data => { this.customers.set(data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  avatarColor(id: number) { return this.COLORS[id % this.COLORS.length]; }

  openAdd() {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(c: any) {
    this.form = {
      name: c.name, phone: c.phone, address: c.address,
      paymentType: c.paymentType, creditLimit: c.creditLimit,
      openingBalance: c.openingBalance, notes: c.notes ?? '',
    };
    this.editingId.set(c.id);
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.name) { this.saveError.set('اسم العميل مطلوب'); return; }
    this.saving.set(true);
    this.saveError.set('');

    const id = this.editingId();
    const payload = {
      name: this.form.name, phone: this.form.phone, address: this.form.address,
      paymentType: this.form.paymentType, creditLimit: this.form.creditLimit,
      openingBalance: this.form.openingBalance, notes: this.form.notes || null,
    };
    const obs = id ? this.api.updateCustomer(id, payload) : this.api.createCustomer(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: err => { this.saving.set(false); this.saveError.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  deleteCustomer(id: number) {
    if (!confirm('هل تريد حذف هذا العميل؟')) return;
    this.api.deleteCustomer(id).subscribe({ next: () => this.load() });
  }

  private emptyForm(): CustomerForm {
    return { name: '', phone: '', address: '', paymentType: 'Cash', creditLimit: 0, openingBalance: 0, notes: '' };
  }
}
