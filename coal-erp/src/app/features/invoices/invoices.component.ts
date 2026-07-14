import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface InvoiceItem {
  productId: number | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">المبيعات</div>
          <h1 class="page-title">فواتير المبيعات</h1>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary text-sm" (click)="openNew()">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            فاتورة جديدة
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي الفواتير</div>
          <div class="text-2xl font-bold">{{ invoices().length }}</div>
          <div class="stat-bar"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">مبيعات الشهر</div>
          <div class="text-2xl font-bold">{{ monthSales() | number:'1.0-0' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">مدفوعة</div>
          <div class="text-2xl font-bold text-green-600">{{ paidCount() }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#34d399)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">غير مدفوعة</div>
          <div class="text-2xl font-bold text-orange-600">{{ pendingCount() }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#ef4444)"></div>
        </div>
      </div>

      <!-- Filters + Search -->
      <div class="erp-card mb-4 px-4 py-3 flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          @for (f of statusFilters; track f.value) {
            <button class="text-xs px-3 py-1 rounded-full border transition"
                    [style.background]="statusFilter() === f.value ? '#7c3aed' : 'transparent'"
                    [style.color]="statusFilter() === f.value ? 'white' : '#6b7280'"
                    [style.border-color]="statusFilter() === f.value ? '#7c3aed' : '#e5e7eb'"
                    (click)="statusFilter.set(f.value)">
              {{ f.label }}
            </button>
          }
        </div>
        <div class="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" [(ngModel)]="search" placeholder="بحث برقم الفاتورة أو اسم العميل..." class="erp-input ps-9 text-sm" />
        </div>
      </div>

      <!-- Invoices List -->
      <div class="erp-card overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
        } @else if (filtered().length === 0) {
          <div class="p-12 text-center">
            <div class="text-5xl mb-4">🧾</div>
            <div class="text-gray-500 font-medium">لا توجد فواتير بعد</div>
            <div class="text-gray-400 text-sm mt-1">ابدأ بإنشاء فاتورة مبيعات جديدة</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>المواصفات</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (inv of filtered(); track inv.id) {
                <tr>
                  <td>
                    <span class="font-mono font-bold text-purple-600 text-sm">{{ inv.invoiceNumber }}</span>
                  </td>
                  <td class="text-gray-500 text-sm">{{ inv.invoiceDate | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <div class="font-medium text-gray-800 text-sm">{{ inv.customerName }}</div>
                    <div class="text-xs text-gray-400">{{ inv.paymentType === 'Credit' ? 'آجل' : 'نقدي' }}</div>
                  </td>
                  <td class="max-w-40">
                    <div class="text-xs text-gray-500 space-y-0.5">
                      @for (item of inv.items?.slice(0,2); track $index) {
                        <div class="truncate">{{ item.productNameAr || item.productName }} × {{ item.quantity | number:'1.0-1' }}</div>
                      }
                      @if (inv.items?.length > 2) {
                        <div class="text-purple-400">+{{ inv.items.length - 2 }} أصناف أخرى</div>
                      }
                    </div>
                  </td>
                  <td class="font-bold text-sm">{{ inv.totalAmount | number:'1.0-0' }}</td>
                  <td class="text-green-600 font-medium text-sm">{{ inv.paidAmount | number:'1.0-0' }}</td>
                  <td class="font-medium text-sm" [style.color]="(inv.totalAmount - inv.paidAmount) > 0 ? '#d97706' : '#059669'">
                    {{ (inv.totalAmount - inv.paidAmount) | number:'1.0-0' }}
                  </td>
                  <td>
                    <span class="badge"
                          [class.badge-green]="inv.status === 'Paid'"
                          [class.badge-red]="inv.status === 'Pending'"
                          [class.badge-purple]="inv.status === 'Partial'">
                      {{ inv.status === 'Paid' ? 'مدفوعة' : inv.status === 'Partial' ? 'جزئي' : 'معلقة' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                              (click)="viewInvoice(inv)" title="عرض">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      @if (inv.status !== 'Paid') {
                        <button class="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                                (click)="openPayment(inv)" title="تسجيل دفعة">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- ─── New Invoice Modal ───────────────────────────────────────────── -->
    @if (showNewModal()) {
      <div class="modal-overlay" style="align-items:flex-start">
        <div class="erp-card w-full max-w-3xl p-6 fade-in my-4">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-xl font-bold text-gray-800">فاتورة مبيعات جديدة</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showNewModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Invoice header fields -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl" style="background:#f8f7ff">
            <div>
              <label class="erp-label">رقم الفاتورة</label>
              <input [(ngModel)]="newInv.invoiceNumber" class="erp-input font-mono" placeholder="INV-0001" />
            </div>
            <div>
              <label class="erp-label">تاريخ الفاتورة *</label>
              <input type="date" [(ngModel)]="newInv.invoiceDate" class="erp-input" />
            </div>
            <div>
              <label class="erp-label">نوع الدفع</label>
              <select [(ngModel)]="newInv.paymentType" class="erp-input">
                <option value="Cash">نقدي</option>
                <option value="Credit">آجل</option>
              </select>
            </div>
            <div class="col-span-2 sm:col-span-2">
              <label class="erp-label">العميل *</label>
              <select [(ngModel)]="newInv.customerId" class="erp-input" (change)="onCustomerChange()">
                <option [ngValue]="null">— اختر العميل —</option>
                @for (c of customers(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }} {{ c.phone ? '(' + c.phone + ')' : '' }}</option>
                }
              </select>
            </div>
            <div>
              <label class="erp-label">ملاحظات</label>
              <input [(ngModel)]="newInv.notes" class="erp-input" placeholder="اختياري" />
            </div>
          </div>

          <!-- Line items -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-semibold text-gray-700">مواصفات الفاتورة (الأصناف)</h3>
              <button class="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1" (click)="addLine()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                إضافة صنف
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-xs text-gray-500 border-b border-gray-100">
                    <th class="text-start py-2 pe-2 font-semibold">الصنف</th>
                    <th class="text-start py-2 pe-2 font-semibold w-20">الوحدة</th>
                    <th class="text-start py-2 pe-2 font-semibold w-24">الكمية</th>
                    <th class="text-start py-2 pe-2 font-semibold w-28">سعر الوحدة</th>
                    <th class="text-start py-2 pe-2 font-semibold w-24">خصم%</th>
                    <th class="text-start py-2 font-semibold w-28">الإجمالي</th>
                    <th class="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of newInv.items; track $index; let i = $index) {
                    <tr class="border-b border-gray-50">
                      <td class="py-1.5 pe-2">
                        <select [(ngModel)]="line.productId" class="erp-input text-xs py-1" (change)="onProductSelect(i)">
                          <option [ngValue]="null">— اختر الصنف —</option>
                          @for (p of products(); track p.id) {
                            <option [ngValue]="p.id">{{ p.nameAr }}</option>
                          }
                        </select>
                      </td>
                      <td class="py-1.5 pe-2">
                        <input [(ngModel)]="line.unit" class="erp-input text-xs py-1 w-16" placeholder="طن" />
                      </td>
                      <td class="py-1.5 pe-2">
                        <input type="number" [(ngModel)]="line.quantity" class="erp-input text-xs py-1 w-20" min="0.01" step="0.01"
                               (ngModelChange)="recalcLine(i)" />
                      </td>
                      <td class="py-1.5 pe-2">
                        <input type="number" [(ngModel)]="line.unitPrice" class="erp-input text-xs py-1 w-24" min="0"
                               (ngModelChange)="recalcLine(i)" />
                      </td>
                      <td class="py-1.5 pe-2">
                        <input type="number" [(ngModel)]="line.discount" class="erp-input text-xs py-1 w-20" min="0" max="100"
                               (ngModelChange)="recalcLine(i)" />
                      </td>
                      <td class="py-1.5 font-semibold text-gray-800">
                        {{ line.total | number:'1.0-0' }}
                      </td>
                      <td class="py-1.5 ps-1">
                        <button class="text-gray-300 hover:text-red-500 transition" (click)="removeLine(i)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (newInv.items.length === 0) {
              <div class="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-xl border-gray-100 mt-2">
                اضغط "إضافة صنف" لبدء إدخال مواصفات الفاتورة
              </div>
            }
          </div>

          <!-- Totals -->
          <div class="flex justify-end mb-5">
            <div class="w-64 space-y-2 text-sm">
              <div class="flex justify-between text-gray-500">
                <span>المجموع الفرعي</span>
                <span class="font-medium text-gray-700">{{ subTotal() | number:'1.0-2' }}</span>
              </div>
              <div class="flex justify-between items-center text-gray-500">
                <span>خصم إجمالي (ج.م)</span>
                <input type="number" [(ngModel)]="newInv.extraDiscount" class="erp-input text-xs py-0.5 w-24 text-center" min="0"
                       style="padding-top:2px;padding-bottom:2px" />
              </div>
              <div class="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>الإجمالي</span>
                <span class="text-purple-600">{{ grandTotal() | number:'1.0-2' }}</span>
              </div>
              @if (newInv.paymentType === 'Cash') {
                <div class="flex justify-between items-center text-gray-500">
                  <span>المبلغ المدفوع</span>
                  <input type="number" [(ngModel)]="newInv.paidAmount" class="erp-input text-xs py-0.5 w-24 text-center"
                         min="0" style="padding-top:2px;padding-bottom:2px" />
                </div>
              }
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn-primary flex-1 justify-center" (click)="saveInvoice()" [disabled]="savingInv()">
              @if (savingInv()) { جاري الحفظ... } @else { حفظ الفاتورة }
            </button>
            <button class="btn-ghost" (click)="showNewModal.set(false)">إلغاء</button>
          </div>
          @if (invError()) {
            <div class="mt-3 text-red-500 text-sm text-center">{{ invError() }}</div>
          }
        </div>
      </div>
    }

    <!-- ─── Invoice View Modal ─────────────────────────────────────────── -->
    @if (viewingInv()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-2xl p-6 fade-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-xl font-bold">فاتورة مبيعات</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="viewingInv.set(null)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Invoice details -->
          <div class="grid grid-cols-3 gap-4 p-4 rounded-xl mb-4" style="background:#f8f7ff">
            <div>
              <div class="text-xs text-gray-500">رقم الفاتورة</div>
              <div class="font-mono font-bold text-purple-600">{{ viewingInv()!.invoiceNumber }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">التاريخ</div>
              <div class="font-semibold">{{ viewingInv()!.invoiceDate | date:'dd/MM/yyyy' }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">نوع الدفع</div>
              <div class="font-semibold">{{ viewingInv()!.paymentType === 'Credit' ? 'آجل' : 'نقدي' }}</div>
            </div>
            <div class="col-span-3">
              <div class="text-xs text-gray-500">العميل</div>
              <div class="font-bold text-lg">{{ viewingInv()!.customerName }}</div>
            </div>
          </div>

          <!-- Items -->
          <table class="w-full text-sm mb-4">
            <thead>
              <tr class="text-xs text-gray-500 border-b border-gray-200">
                <th class="text-start py-2">الصنف</th>
                <th class="text-center py-2">الكمية</th>
                <th class="text-center py-2">الوحدة</th>
                <th class="text-start py-2">سعر الوحدة</th>
                <th class="text-start py-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              @for (item of viewingInv()!.items; track $index) {
                <tr class="border-b border-gray-50">
                  <td class="py-2 font-medium">{{ item.productNameAr || item.productName }}</td>
                  <td class="py-2 text-center">{{ item.quantity | number:'1.0-2' }}</td>
                  <td class="py-2 text-center text-gray-500">{{ item.unit }}</td>
                  <td class="py-2">{{ item.unitPrice | number:'1.0-0' }}</td>
                  <td class="py-2 font-bold">{{ item.totalPrice | number:'1.0-0' }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="flex justify-end">
            <div class="w-56 space-y-1 text-sm">
              <div class="flex justify-between text-gray-500">
                <span>المجموع الفرعي</span><span>{{ viewingInv()!.subTotal | number:'1.0-0' }}</span>
              </div>
              @if (viewingInv()!.discount > 0) {
                <div class="flex justify-between text-red-500">
                  <span>خصم</span><span>- {{ viewingInv()!.discount | number:'1.0-0' }}</span>
                </div>
              }
              <div class="flex justify-between font-bold text-base border-t pt-1">
                <span>الإجمالي</span>
                <span class="text-purple-600">{{ viewingInv()!.totalAmount | number:'1.0-0' }}</span>
              </div>
              <div class="flex justify-between text-green-600">
                <span>المدفوع</span><span>{{ viewingInv()!.paidAmount | number:'1.0-0' }}</span>
              </div>
              @if ((viewingInv()!.totalAmount - viewingInv()!.paidAmount) > 0) {
                <div class="flex justify-between text-orange-600 font-semibold">
                  <span>المتبقي</span>
                  <span>{{ (viewingInv()!.totalAmount - viewingInv()!.paidAmount) | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          </div>

          @if (viewingInv()!.notes) {
            <div class="mt-3 p-3 rounded-lg text-sm text-gray-600" style="background:#f9fafb">
              ملاحظات: {{ viewingInv()!.notes }}
            </div>
          }
        </div>
      </div>
    }

    <!-- ─── Payment Modal ──────────────────────────────────────────────── -->
    @if (paymentInv()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-sm p-6 fade-in">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold">تسجيل دفعة</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="paymentInv.set(null)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="p-3 rounded-xl mb-4 text-sm" style="background:#f8f7ff">
            <div class="font-bold text-purple-600">{{ paymentInv()!.invoiceNumber }}</div>
            <div class="text-gray-600">{{ paymentInv()!.customerName }}</div>
            <div class="mt-1 font-semibold text-orange-600">
              المتبقي: {{ (paymentInv()!.totalAmount - paymentInv()!.paidAmount) | number:'1.0-0' }} ج.م
            </div>
          </div>

          <div class="mb-3">
            <label class="erp-label">المبلغ المدفوع *</label>
            <input type="number" [(ngModel)]="payAmount" class="erp-input text-lg font-bold" min="1"
                   [max]="paymentInv()!.totalAmount - paymentInv()!.paidAmount" />
          </div>
          <div class="mb-4">
            <label class="erp-label">طريقة الدفع</label>
            <select [(ngModel)]="payMethod" class="erp-input">
              <option value="Cash">نقدي</option>
              <option value="Transfer">تحويل بنكي</option>
              <option value="Cheque">شيك</option>
            </select>
          </div>

          <div class="flex gap-2">
            <button class="btn-primary flex-1" (click)="submitPayment()" [disabled]="savingPay()">
              @if (savingPay()) { جاري الحفظ... } @else { تسجيل الدفعة }
            </button>
            <button class="btn-ghost" (click)="paymentInv.set(null)">إلغاء</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InvoicesComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  invoices = signal<any[]>([]);
  customers = signal<any[]>([]);
  products = signal<any[]>([]);
  search = '';
  statusFilter = signal('all');
  showNewModal = signal(false);
  savingInv = signal(false);
  invError = signal('');
  viewingInv = signal<any>(null);
  paymentInv = signal<any>(null);
  payAmount = 0;
  payMethod = 'Cash';
  savingPay = signal(false);

  statusFilters = [
    { value: 'all', label: 'الكل' },
    { value: 'Pending', label: 'معلقة' },
    { value: 'Partial', label: 'جزئي' },
    { value: 'Paid', label: 'مدفوعة' },
  ];

  newInv = this.emptyInv();

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.invoices().filter(inv => {
      const matchStatus = this.statusFilter() === 'all' || inv.status === this.statusFilter();
      const matchSearch = !q
        || inv.invoiceNumber?.toLowerCase().includes(q)
        || inv.customerName?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  });

  monthSales = computed(() => {
    const now = new Date();
    return this.invoices()
      .filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, inv) => s + inv.totalAmount, 0);
  });

  paidCount   = computed(() => this.invoices().filter(i => i.status === 'Paid').length);
  pendingCount= computed(() => this.invoices().filter(i => i.status === 'Pending').length);

  subTotal = computed(() => this.newInv.items.reduce((s, l) => s + l.total, 0));
  grandTotal= computed(() => Math.max(0, this.subTotal() - (this.newInv.extraDiscount || 0)));

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.api.getInvoices().subscribe({ next: d => { this.invoices.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.api.getCustomers().subscribe({ next: d => this.customers.set(d) });
    this.api.getProducts().subscribe({ next: d => this.products.set(d) });
  }

  openNew() {
    this.newInv = this.emptyInv();
    this.invError.set('');
    // Auto-generate invoice number
    const num = (this.invoices().length + 1).toString().padStart(4, '0');
    this.newInv.invoiceNumber = `INV-${num}`;
    this.newInv.invoiceDate = new Date().toISOString().split('T')[0];
    this.showNewModal.set(true);
  }

  onCustomerChange() {}

  addLine() {
    this.newInv.items.push({ productId: null, productName: '', unit: 'طن', quantity: 1, unitPrice: 0, discount: 0, total: 0 });
  }

  removeLine(i: number) { this.newInv.items.splice(i, 1); }

  onProductSelect(i: number) {
    const line = this.newInv.items[i];
    const prod = this.products().find(p => p.id === line.productId);
    if (prod) {
      line.unit      = prod.unit;
      line.unitPrice = prod.retailPrice;
      line.productName = prod.nameAr;
      this.recalcLine(i);
    }
  }

  recalcLine(i: number) {
    const l = this.newInv.items[i];
    const disc = Math.min(Math.max(l.discount || 0, 0), 100);
    l.total = l.quantity * l.unitPrice * (1 - disc / 100);
  }

  saveInvoice() {
    if (!this.newInv.customerId) { this.invError.set('الرجاء اختيار العميل'); return; }
    if (this.newInv.items.length === 0) { this.invError.set('أضف صنفاً واحداً على الأقل'); return; }

    this.savingInv.set(true);
    this.invError.set('');

    const payload = {
      invoiceNumber : this.newInv.invoiceNumber,
      customerId    : this.newInv.customerId,
      invoiceDate   : this.newInv.invoiceDate,
      paymentType   : this.newInv.paymentType,
      discount      : this.newInv.extraDiscount || 0,
      paidAmount    : this.newInv.paymentType === 'Cash' ? (this.newInv.paidAmount || this.grandTotal()) : 0,
      notes         : this.newInv.notes,
      items         : this.newInv.items.map(l => ({
        productId : l.productId,
        quantity  : l.quantity,
        unit      : l.unit,
        unitPrice : l.unitPrice,
        discount  : l.discount || 0,
      })),
    };

    this.api.createInvoice(payload).subscribe({
      next: () => { this.savingInv.set(false); this.showNewModal.set(false); this.loadAll(); },
      error: err => { this.savingInv.set(false); this.invError.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  viewInvoice(inv: any) { this.viewingInv.set(inv); }

  openPayment(inv: any) {
    this.paymentInv.set(inv);
    this.payAmount = inv.totalAmount - inv.paidAmount;
    this.payMethod = 'Cash';
  }

  submitPayment() {
    const inv = this.paymentInv();
    if (!inv || !this.payAmount) return;
    this.savingPay.set(true);
    this.api.addPayment(inv.id, { amount: this.payAmount, method: this.payMethod }).subscribe({
      next: () => { this.savingPay.set(false); this.paymentInv.set(null); this.loadAll(); },
      error: () => this.savingPay.set(false),
    });
  }

  private emptyInv() {
    return {
      invoiceNumber: '', invoiceDate: '', paymentType: 'Cash',
      customerId: null as number | null,
      extraDiscount: 0, paidAmount: 0, notes: '',
      items: [] as InvoiceItem[],
    };
  }
}
