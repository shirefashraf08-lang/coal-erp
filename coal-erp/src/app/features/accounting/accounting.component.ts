import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

type Tab = 'treasury' | 'adjustments';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">المالية</div>
          <h1 class="page-title">المحاسبة</h1>
        </div>
        <div class="flex gap-2">
          @if (activeTab() === 'treasury') {
            <button class="btn-primary text-sm" (click)="openTreasuryModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              تسجيل معاملة
            </button>
          } @else {
            <button class="btn-primary text-sm" (click)="openAdjModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              إضافة تسوية
            </button>
          }
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div class="stat-card border-s-4 border-emerald-500">
          <div class="text-xs font-semibold text-gray-500 uppercase mb-1">إجمالي الدخل</div>
          <div class="text-2xl font-bold text-emerald-600">{{ totalIncome() | number:'1.0-0' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
        <div class="stat-card border-s-4 border-red-400">
          <div class="text-xs font-semibold text-gray-500 uppercase mb-1">إجمالي المصروفات</div>
          <div class="text-2xl font-bold text-red-500">{{ totalExpense() | number:'1.0-0' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#ef4444,#f97316)"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
        <div class="stat-card border-s-4 border-purple-500">
          <div class="text-xs font-semibold text-gray-500 uppercase mb-1">الرصيد الصافي</div>
          <div class="text-2xl font-bold" [style.color]="netBalance() >= 0 ? '#7c3aed' : '#dc2626'">
            {{ netBalance() | number:'1.0-0' }}
          </div>
          <div class="stat-bar"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 p-1 rounded-xl w-fit" style="background:#f3f0ff">
        <button class="px-5 py-2 rounded-lg text-sm font-medium transition"
                [style.background]="activeTab() === 'treasury' ? '#7c3aed' : 'transparent'"
                [style.color]="activeTab() === 'treasury' ? 'white' : '#6b7280'"
                (click)="activeTab.set('treasury')">
          الخزينة
        </button>
        <button class="px-5 py-2 rounded-lg text-sm font-medium transition"
                [style.background]="activeTab() === 'adjustments' ? '#7c3aed' : 'transparent'"
                [style.color]="activeTab() === 'adjustments' ? 'white' : '#6b7280'"
                (click)="activeTab.set('adjustments'); loadAdjustments()">
          التسويات
        </button>
      </div>

      <!-- Treasury Tab -->
      @if (activeTab() === 'treasury') {
        <div class="erp-card overflow-hidden">
          @if (loadingT()) {
            <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
          } @else if (transactions().length === 0) {
            <div class="p-12 text-center">
              <div class="text-5xl mb-4">💰</div>
              <div class="text-gray-500">لا توجد معاملات بعد</div>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الوصف</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>المرجع</th>
                </tr>
              </thead>
              <tbody>
                @for (t of transactions(); track t.id) {
                  <tr>
                    <td class="text-gray-500 text-sm">{{ t.transactionDate | date:'dd/MM/yyyy' }}</td>
                    <td class="font-medium text-sm">{{ t.description }}</td>
                    <td>
                      <span class="badge" [class.badge-green]="t.type === 'Income'" [class.badge-red]="t.type === 'Expense'">
                        {{ t.type === 'Income' ? 'دخل' : 'مصروف' }}
                      </span>
                    </td>
                    <td class="font-bold" [style.color]="t.type === 'Income' ? '#059669' : '#dc2626'">
                      {{ t.type === 'Income' ? '+' : '-' }} {{ t.amount | number:'1.0-0' }}
                    </td>
                    <td class="text-gray-500 text-sm">{{ t.method }}</td>
                    <td class="text-gray-400 text-xs font-mono">{{ t.reference || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Adjustments Tab -->
      @if (activeTab() === 'adjustments') {
        <div class="erp-card overflow-hidden">
          @if (loadingA()) {
            <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
          } @else if (adjustments().length === 0) {
            <div class="p-12 text-center">
              <div class="text-5xl mb-4">⚖️</div>
              <div class="text-gray-500 font-medium">لا توجد تسويات بعد</div>
              <div class="text-gray-400 text-sm mt-1">
                التسويات تُستخدم لتعديل أرصدة العملاء — مثل الأرصدة الافتتاحية أو التعديلات اليدوية
              </div>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>العميل / المورد</th>
                  <th>المبلغ</th>
                  <th>السبب</th>
                  <th>المرجع</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                @for (a of adjustments(); track a.id) {
                  <tr>
                    <td class="text-gray-500 text-sm">{{ a.adjustmentDate | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge text-xs"
                            [class.badge-purple]="a.type === 'OpeningBalance'"
                            [class.badge-green]="a.type === 'CustomerCredit'"
                            [class.badge-red]="a.type === 'CustomerDebit'"
                            [class.badge-green]="a.type === 'SupplierDebit'"
                            [class.badge-red]="a.type === 'SupplierCredit'">
                        {{ typeLabel(a.type) }}
                      </span>
                    </td>
                    <td class="font-medium text-sm">{{ a.customerName || a.supplierName || '—' }}</td>
                    <td class="font-bold text-sm">{{ a.amount | number:'1.0-0' }}</td>
                    <td class="text-gray-600 text-sm">{{ a.reason }}</td>
                    <td class="text-gray-400 text-xs font-mono">{{ a.reference || '—' }}</td>
                    <td>
                      <button class="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                              (click)="deleteAdj(a.id)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>

    <!-- ─── Treasury Modal ────────────────────────────────────────────── -->
    @if (showTrModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-sm p-6 fade-in">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold">تسجيل معاملة خزينة</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showTrModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">النوع *</label>
              <select [(ngModel)]="trForm.type" class="erp-input">
                <option value="Income">دخل</option>
                <option value="Expense">مصروف</option>
              </select>
            </div>
            <div>
              <label class="erp-label">الوصف *</label>
              <input [(ngModel)]="trForm.description" class="erp-input" placeholder="مثال: مصروف شحن" />
            </div>
            <div>
              <label class="erp-label">المبلغ *</label>
              <input type="number" [(ngModel)]="trForm.amount" class="erp-input" min="0" />
            </div>
            <div>
              <label class="erp-label">طريقة الدفع</label>
              <select [(ngModel)]="trForm.method" class="erp-input">
                <option value="Cash">نقدي</option>
                <option value="Transfer">تحويل</option>
                <option value="Cheque">شيك</option>
              </select>
            </div>
            <div>
              <label class="erp-label">رقم مرجعي</label>
              <input [(ngModel)]="trForm.reference" class="erp-input" placeholder="اختياري" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="saveTr()" [disabled]="savingTr()">
              @if (savingTr()) { جاري الحفظ... } @else { حفظ }
            </button>
            <button class="btn-ghost" (click)="showTrModal.set(false)">إلغاء</button>
          </div>
        </div>
      </div>
    }

    <!-- ─── Adjustment Modal ───────────────────────────────────────────── -->
    @if (showAdjModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-md p-6 fade-in">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold">إضافة تسوية</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showAdjModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">نوع التسوية *</label>
              <select [(ngModel)]="adjForm.type" class="erp-input">
                <option value="OpeningBalance">رصيد افتتاحي (عميل)</option>
                <option value="CustomerDebit">مديونية إضافية على عميل</option>
                <option value="CustomerCredit">خصم / دفعة يدوية لعميل</option>
                <option value="SupplierCredit">مبلغ مستحق لمورد</option>
                <option value="SupplierDebit">دفعة لمورد</option>
              </select>
            </div>
            @if (adjForm.type?.startsWith('Customer')) {
              <div>
                <label class="erp-label">العميل *</label>
                <select [(ngModel)]="adjForm.customerId" class="erp-input">
                  <option [ngValue]="null">— اختر العميل —</option>
                  @for (c of customers(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
            }
            @if (adjForm.type === 'OpeningBalance') {
              <div>
                <label class="erp-label">العميل *</label>
                <select [(ngModel)]="adjForm.customerId" class="erp-input">
                  <option [ngValue]="null">— اختر العميل —</option>
                  @for (c of customers(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
            }
            <div>
              <label class="erp-label">المبلغ (ج.م) *</label>
              <input type="number" [(ngModel)]="adjForm.amount" class="erp-input" min="0" />
            </div>
            <div>
              <label class="erp-label">السبب / البيان *</label>
              <input [(ngModel)]="adjForm.reason" class="erp-input" placeholder="مثال: رصيد افتتاحي، تسوية فاتورة..." />
            </div>
            <div>
              <label class="erp-label">رقم مرجعي</label>
              <input [(ngModel)]="adjForm.reference" class="erp-input" placeholder="رقم فاتورة أو سند" />
            </div>
            <div>
              <label class="erp-label">ملاحظات</label>
              <textarea [(ngModel)]="adjForm.notes" class="erp-input" rows="2" placeholder="اختياري"></textarea>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="saveAdj()" [disabled]="savingAdj()">
              @if (savingAdj()) { جاري الحفظ... } @else { حفظ التسوية }
            </button>
            <button class="btn-ghost" (click)="showAdjModal.set(false)">إلغاء</button>
          </div>
          @if (adjError()) {
            <div class="mt-2 text-red-500 text-sm">{{ adjError() }}</div>
          }
        </div>
      </div>
    }
  `,
})
export class AccountingComponent implements OnInit {
  private api = inject(ApiService);

  activeTab = signal<Tab>('treasury');
  loadingT  = signal(true);
  loadingA  = signal(false);
  transactions = signal<any[]>([]);
  adjustments  = signal<any[]>([]);
  customers    = signal<any[]>([]);

  showTrModal  = signal(false);
  savingTr     = signal(false);
  trForm = { type: 'Income', description: '', amount: 0, method: 'Cash', reference: '' };

  showAdjModal = signal(false);
  savingAdj    = signal(false);
  adjError     = signal('');
  adjForm = { type: 'OpeningBalance', customerId: null as number | null, amount: 0, reason: '', reference: '', notes: '' };

  totalIncome  = computed(() => this.transactions().filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0));
  totalExpense = computed(() => this.transactions().filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0));
  netBalance   = computed(() => this.totalIncome() - this.totalExpense());

  ngOnInit() {
    this.loadTreasury();
    this.api.getCustomers().subscribe({ next: d => this.customers.set(d) });
  }

  loadTreasury() {
    this.loadingT.set(true);
    this.api.getTreasury().subscribe({
      next: (d: any) => { this.transactions.set(d.transactions ?? d ?? []); this.loadingT.set(false); },
      error: () => this.loadingT.set(false),
    });
  }

  loadAdjustments() {
    this.loadingA.set(true);
    this.api.getAdjustments().subscribe({
      next: d => { this.adjustments.set(d); this.loadingA.set(false); },
      error: () => this.loadingA.set(false),
    });
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      OpeningBalance : 'رصيد افتتاحي',
      CustomerDebit  : 'مديونية عميل',
      CustomerCredit : 'خصم عميل',
      SupplierDebit  : 'دفعة مورد',
      SupplierCredit : 'مستحق مورد',
    };
    return map[t] ?? t;
  }

  openTreasuryModal() {
    this.trForm = { type: 'Income', description: '', amount: 0, method: 'Cash', reference: '' };
    this.showTrModal.set(true);
  }

  saveTr() {
    if (!this.trForm.description || !this.trForm.amount) return;
    this.savingTr.set(true);
    this.api.addTreasuryTransaction(this.trForm).subscribe({
      next: () => { this.savingTr.set(false); this.showTrModal.set(false); this.loadTreasury(); },
      error: () => this.savingTr.set(false),
    });
  }

  openAdjModal() {
    this.adjForm = { type: 'OpeningBalance', customerId: null, amount: 0, reason: '', reference: '', notes: '' };
    this.adjError.set('');
    this.showAdjModal.set(true);
  }

  saveAdj() {
    if (!this.adjForm.amount || !this.adjForm.reason) { this.adjError.set('المبلغ والسبب مطلوبان'); return; }
    this.savingAdj.set(true);
    this.adjError.set('');
    this.api.createAdjustment({ ...this.adjForm, adjustmentDate: new Date().toISOString() }).subscribe({
      next: () => { this.savingAdj.set(false); this.showAdjModal.set(false); this.loadAdjustments(); },
      error: err => { this.savingAdj.set(false); this.adjError.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  deleteAdj(id: number) {
    if (!confirm('هل تريد حذف هذه التسوية؟')) return;
    this.api.deleteAdjustment(id).subscribe({ next: () => this.loadAdjustments() });
  }
}
