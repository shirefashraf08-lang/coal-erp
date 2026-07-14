import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">العمليات</div>
          <h1 class="page-title">حركة المخزون</h1>
        </div>
        <button class="btn-primary text-sm" (click)="openModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          تسجيل حركة
        </button>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="stat-card text-center">
          <div class="text-2xl font-bold text-emerald-600">+{{ totalIn() | number:'1.0-1' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
          <div class="text-sm text-gray-500">إجمالي الوارد</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-2xl font-bold text-red-500">-{{ totalOut() | number:'1.0-1' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#ef4444,#f97316)"></div>
          <div class="text-sm text-gray-500">إجمالي الصادر</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-2xl font-bold text-purple-600">{{ (totalIn() - totalOut()) | number:'1.0-1' }}</div>
          <div class="stat-bar"></div>
          <div class="text-sm text-gray-500">صافي الحركة</div>
        </div>
      </div>

      <!-- Table -->
      <div class="erp-card overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
        } @else if (movements().length === 0) {
          <div class="p-12 text-center">
            <div class="text-5xl mb-4">📋</div>
            <div class="text-gray-500 font-medium">لا توجد حركات مخزون بعد</div>
            <div class="text-gray-400 text-sm mt-1">سجّل أول حركة باستخدام الزر أعلاه</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الصنف</th>
                <th>نوع الحركة</th>
                <th>السبب</th>
                <th>الكمية</th>
                <th>المستودع</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              @for (m of movements(); track m.id) {
                <tr>
                  <td class="text-gray-500 text-sm">{{ m.movementDate | date:'dd/MM/yyyy' }}</td>
                  <td class="font-medium text-gray-800">{{ m.productNameAr || m.productName }}</td>
                  <td>
                    <span class="badge" [class.badge-green]="m.type === 'In'" [class.badge-red]="m.type === 'Out'">
                      {{ m.type === 'In' ? 'وارد' : 'صادر' }}
                    </span>
                  </td>
                  <td><span class="badge badge-purple text-xs">{{ reasonLabel(m.reason) }}</span></td>
                  <td>
                    <span class="font-semibold" [style.color]="m.type === 'In' ? '#059669' : '#ef4444'">
                      {{ m.type === 'In' ? '+' : '-' }}{{ m.quantity | number:'1.0-2' }} {{ m.unit }}
                    </span>
                  </td>
                  <td class="text-gray-500 text-sm">{{ m.warehouse || 'رئيسي' }}</td>
                  <td class="text-gray-400 text-sm">{{ m.notes || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- ─── Modal تسجيل حركة ───────────────────────────────────────── -->
    @if (showModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-md p-6 fade-in">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">تسجيل حركة مخزون</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">نوع الحركة *</label>
              <select [(ngModel)]="form.type" class="erp-input">
                <option value="In">وارد (إضافة للمخزون)</option>
                <option value="Out">صادر (سحب من المخزون)</option>
              </select>
            </div>
            <div>
              <label class="erp-label">الصنف *</label>
              <select [(ngModel)]="form.productId" class="erp-input">
                <option [ngValue]="null">— اختر الصنف —</option>
                @for (p of products(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nameAr }} (رصيد: {{ p.currentStock | number:'1.0-1' }} {{ p.unit }})</option>
                }
              </select>
            </div>
            <div>
              <label class="erp-label">السبب *</label>
              <select [(ngModel)]="form.reason" class="erp-input">
                @if (form.type === 'In') {
                  <option value="Purchase">شراء من مورد</option>
                  <option value="Production">إنتاج</option>
                  <option value="Return">مرتجع من عميل</option>
                  <option value="Adjustment">تعديل / جرد</option>
                  <option value="Opening">رصيد افتتاحي</option>
                } @else {
                  <option value="Sale">بيع</option>
                  <option value="Damage">تلف</option>
                  <option value="Transfer">نقل بين مستودعات</option>
                  <option value="Adjustment">تعديل / جرد</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="erp-label">الكمية *</label>
                <input type="number" [(ngModel)]="form.quantity" class="erp-input" min="0.01" step="0.01" />
              </div>
              <div>
                <label class="erp-label">الوحدة</label>
                <input [(ngModel)]="form.unit" class="erp-input" placeholder="طن، كجم..." />
              </div>
            </div>
            <div>
              <label class="erp-label">المستودع</label>
              <input [(ngModel)]="form.warehouse" class="erp-input" placeholder="المستودع الرئيسي" />
            </div>
            <div>
              <label class="erp-label">ملاحظات</label>
              <input [(ngModel)]="form.notes" class="erp-input" placeholder="اختياري" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="save()" [disabled]="saving()">
              @if (saving()) { جاري الحفظ... } @else { تسجيل الحركة }
            </button>
            <button class="btn-ghost" (click)="showModal.set(false)">إلغاء</button>
          </div>
          @if (error()) {
            <div class="mt-2 text-red-500 text-sm">{{ error() }}</div>
          }
        </div>
      </div>
    }
  `,
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);

  loading   = signal(true);
  saving    = signal(false);
  showModal = signal(false);
  error     = signal('');
  movements = signal<any[]>([]);
  products  = signal<any[]>([]);

  form = this.emptyForm();

  totalIn  = computed(() => this.movements().filter(m => m.type === 'In').reduce((s, m) => s + (m.quantity ?? 0), 0));
  totalOut = computed(() => this.movements().filter(m => m.type === 'Out').reduce((s, m) => s + (m.quantity ?? 0), 0));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getInventoryMovements().subscribe({
      next: d => { this.movements.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getProducts().subscribe({ next: d => this.products.set(d) });
  }

  openModal() {
    this.form = this.emptyForm();
    this.error.set('');
    this.showModal.set(true);
  }

  save() {
    if (!this.form.productId || !this.form.quantity) {
      this.error.set('الصنف والكمية مطلوبان'); return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.addInventoryMovement(this.form).subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: err => { this.saving.set(false); this.error.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  reasonLabel(r: string): string {
    const map: Record<string, string> = {
      Purchase: 'شراء', Production: 'إنتاج', Return: 'مرتجع',
      Sale: 'بيع', Damage: 'تلف', Transfer: 'نقل',
      Adjustment: 'تعديل', Opening: 'افتتاحي',
    };
    return map[r] ?? r;
  }

  private emptyForm() {
    return { type: 'In', productId: null as number | null, reason: 'Purchase', quantity: 0, unit: 'طن', warehouse: 'المستودع الرئيسي', notes: '' };
  }
}
