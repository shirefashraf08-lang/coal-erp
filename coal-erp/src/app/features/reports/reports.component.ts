import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

type ReportTab = 'sales' | 'debt' | 'inventory' | 'driver' | 'statement';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">المالية</div>
          <h1 class="page-title">التقارير</h1>
        </div>
        <button class="btn-ghost text-sm" (click)="print()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          طباعة
        </button>
      </div>

      <!-- Report cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        @for (t of tabs; track t.id) {
          <button class="erp-card p-4 text-center cursor-pointer transition-all hover:shadow-md"
                  [style.border]="activeTab() === t.id ? '2px solid #7c3aed' : '2px solid transparent'"
                  (click)="selectTab(t.id)">
            <div class="text-3xl mb-2">{{ t.icon }}</div>
            <div class="text-sm font-semibold text-gray-700">{{ t.label }}</div>
          </button>
        }
      </div>

      <!-- Date filter bar -->
      <div class="erp-card px-4 py-3 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="erp-label">من</label>
          <input type="date" [(ngModel)]="fromDate" class="erp-input text-sm" />
        </div>
        <div>
          <label class="erp-label">إلى</label>
          <input type="date" [(ngModel)]="toDate" class="erp-input text-sm" />
        </div>
        @if (activeTab() === 'statement' || activeTab() === 'driver') {
          <div>
            <label class="erp-label">{{ activeTab() === 'statement' ? 'العميل' : 'السائق' }}</label>
            @if (activeTab() === 'statement') {
              <select [(ngModel)]="selectedCustomerId" class="erp-input text-sm">
                <option [ngValue]="null">— كل العملاء —</option>
                @for (c of customers(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
            }
          </div>
        }
        <button class="btn-primary text-sm" (click)="generate()" [disabled]="loading()">
          @if (loading()) { جاري التحميل... } @else { إنشاء التقرير }
        </button>
        <div class="flex gap-2 ms-auto">
          <button class="btn-ghost text-xs" (click)="setRange('today')">اليوم</button>
          <button class="btn-ghost text-xs" (click)="setRange('week')">الأسبوع</button>
          <button class="btn-ghost text-xs" (click)="setRange('month')">الشهر</button>
        </div>
      </div>

      <!-- ─── تقرير المبيعات ──────────────────────────────────── -->
      @if (activeTab() === 'sales' && reportData()) {
        <div id="printable">
          <!-- Summary -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-purple-600">{{ reportData().totalInvoices }}</div>
              <div class="text-xs text-gray-500 mt-1">إجمالي الفواتير</div>
              <div class="stat-bar"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-green-600">{{ reportData().totalSales | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">إجمالي المبيعات (ج.م)</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-emerald-600">{{ reportData().totalPaid | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">محصّل</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#34d399)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-orange-500">{{ reportData().totalRemaining | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">متبقي</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#ef4444)"></div>
            </div>
          </div>

          <!-- Invoices table -->
          <div class="erp-card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span class="font-semibold text-gray-700">فواتير المبيعات</span>
              <span class="text-sm text-gray-400">{{ reportData().invoices?.length || 0 }} فاتورة</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الإجمالي</th>
                  <th>محصّل</th>
                  <th>متبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of reportData().invoices; track inv.id) {
                  <tr>
                    <td class="font-mono text-purple-600 font-bold text-sm">{{ inv.invoiceNumber }}</td>
                    <td class="text-gray-500 text-sm">{{ inv.invoiceDate | date:'dd/MM/yyyy' }}</td>
                    <td class="font-medium text-sm">{{ inv.customerName }}</td>
                    <td class="font-bold text-sm">{{ inv.totalAmount | number:'1.0-0' }}</td>
                    <td class="text-green-600 text-sm">{{ inv.paidAmount | number:'1.0-0' }}</td>
                    <td class="text-sm" [style.color]="(inv.totalAmount - inv.paidAmount) > 0 ? '#d97706' : '#059669'">
                      {{ (inv.totalAmount - inv.paidAmount) | number:'1.0-0' }}
                    </td>
                    <td>
                      <span class="badge text-xs"
                            [class.badge-green]="inv.status === 'Paid'"
                            [class.badge-red]="inv.status === 'Pending'"
                            [class.badge-purple]="inv.status === 'Partial'">
                        {{ inv.status === 'Paid' ? 'مدفوعة' : inv.status === 'Partial' ? 'جزئي' : 'معلقة' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ─── تقرير الديون ────────────────────────────────────── -->
      @if (activeTab() === 'debt' && reportData()) {
        <div id="printable">
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-orange-600">{{ reportData().totalDebt | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">إجمالي الديون (ج.م)</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#ef4444)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-gray-700">{{ reportData().debtors?.length || 0 }}</div>
              <div class="text-xs text-gray-500 mt-1">عميل لديه دين</div>
              <div class="stat-bar"></div>
            </div>
          </div>

          <div class="erp-card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700">قائمة العملاء المدينين</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم العميل</th>
                  <th>رقم الهاتف</th>
                  <th>الرصيد المستحق</th>
                  <th>الحد الائتماني</th>
                  <th>نوع الدفع</th>
                </tr>
              </thead>
              <tbody>
                @for (d of reportData().debtors; track d.customerId; let i = $index) {
                  <tr>
                    <td class="text-gray-400 text-sm">{{ i + 1 }}</td>
                    <td class="font-semibold text-gray-800">{{ d.customerName }}</td>
                    <td>
                      <a [href]="'tel:' + d.phone" class="text-purple-600 text-sm hover:underline">{{ d.phone || '—' }}</a>
                    </td>
                    <td class="font-bold text-orange-600">{{ d.balance | number:'1.0-0' }} ج.م</td>
                    <td class="text-gray-500 text-sm">{{ d.creditLimit | number:'1.0-0' }}</td>
                    <td>
                      <span class="badge" [class.badge-purple]="d.paymentType === 'Credit'" [class.badge-green]="d.paymentType === 'Cash'">
                        {{ d.paymentType === 'Credit' ? 'آجل' : 'نقدي' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ─── تقرير المخزون ──────────────────────────────────── -->
      @if (activeTab() === 'inventory' && reportData()) {
        <div id="printable">
          <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-purple-600">{{ reportData().totalProducts }}</div>
              <div class="text-xs text-gray-500 mt-1">إجمالي الأصناف</div>
              <div class="stat-bar"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-red-500">{{ reportData().lowStockCount }}</div>
              <div class="text-xs text-gray-500 mt-1">مخزون منخفض</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#ef4444,#f97316)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-green-600">{{ reportData().totalValue | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">قيمة المخزون (ج.م)</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
            </div>
          </div>

          <div class="erp-card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700">حالة المخزون</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الفئة</th>
                  <th>الوحدة</th>
                  <th>الرصيد الحالي</th>
                  <th>الحد الأدنى</th>
                  <th>سعر الجملة</th>
                  <th>القيمة الإجمالية</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                @for (p of reportData().products; track p.id) {
                  <tr>
                    <td class="font-medium text-gray-800">{{ p.nameAr }}</td>
                    <td><span class="badge badge-purple text-xs">{{ p.category }}</span></td>
                    <td class="text-gray-500 text-sm">{{ p.unit }}</td>
                    <td class="font-bold text-sm">{{ p.currentStock | number:'1.0-2' }}</td>
                    <td class="text-gray-500 text-sm">{{ p.minimumStock | number:'1.0-0' }}</td>
                    <td class="text-sm">{{ p.wholesalePrice | number:'1.0-0' }}</td>
                    <td class="font-semibold text-purple-600 text-sm">{{ (p.currentStock * p.wholesalePrice) | number:'1.0-0' }}</td>
                    <td>
                      @if (p.currentStock < p.minimumStock) {
                        <span class="badge badge-red text-xs">⚠ منخفض</span>
                      } @else {
                        <span class="badge badge-green text-xs">جيد</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ─── كشف حساب عميل ─────────────────────────────────── -->
      @if (activeTab() === 'statement' && reportData()) {
        <div id="printable">
          @if (reportData().customer) {
            <div class="erp-card p-4 mb-4 flex gap-4 items-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                   style="background:#7c3aed">
                {{ reportData().customer.name.charAt(0) }}
              </div>
              <div>
                <div class="font-bold text-lg text-gray-800">{{ reportData().customer.name }}</div>
                <div class="text-sm text-gray-500">{{ reportData().customer.phone }}</div>
              </div>
              <div class="ms-auto text-end">
                <div class="text-xs text-gray-400">الرصيد الحالي</div>
                <div class="text-xl font-bold text-orange-600">{{ reportData().customer.currentBalance | number:'1.0-0' }} ج.م</div>
              </div>
            </div>
          }

          <div class="erp-card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700">الفواتير والمدفوعات</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>البيان</th>
                  <th>المدين</th>
                  <th>الدائن</th>
                  <th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                @let balance = 0;
                @for (row of reportData().statement; track $index) {
                  <tr>
                    <td class="text-gray-500 text-sm">{{ row.date | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge text-xs"
                            [class.badge-red]="row.type === 'Invoice'"
                            [class.badge-green]="row.type === 'Payment'">
                        {{ row.type === 'Invoice' ? 'فاتورة' : 'دفعة' }}
                      </span>
                    </td>
                    <td class="font-medium text-sm">{{ row.description }}</td>
                    <td class="font-bold text-red-600 text-sm">{{ row.debit > 0 ? (row.debit | number:'1.0-0') : '—' }}</td>
                    <td class="font-bold text-green-600 text-sm">{{ row.credit > 0 ? (row.credit | number:'1.0-0') : '—' }}</td>
                    <td class="font-bold text-sm" [style.color]="row.runningBalance > 0 ? '#d97706' : '#059669'">
                      {{ row.runningBalance | number:'1.0-0' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ─── تقرير المندوب ──────────────────────────────────── -->
      @if (activeTab() === 'driver' && reportData()) {
        <div id="printable">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-purple-600">{{ reportData().totalDeliveries }}</div>
              <div class="text-xs text-gray-500 mt-1">إجمالي التسليمات</div>
              <div class="stat-bar"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-green-600">{{ reportData().delivered }}</div>
              <div class="text-xs text-gray-500 mt-1">تم التسليم</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#34d399)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-emerald-600">{{ reportData().totalCollected | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">محصّل (ج.م)</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
            </div>
            <div class="stat-card text-center">
              <div class="text-2xl font-bold text-orange-500">{{ reportData().totalDue - reportData().totalCollected | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-1">متبقي (ج.م)</div>
              <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#ef4444)"></div>
            </div>
          </div>

          <div class="erp-card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700">تفاصيل رحلات التوصيل</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الأصناف</th>
                  <th>المستحق</th>
                  <th>المحصّل</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                @for (stop of reportData().stops; track stop.id) {
                  <tr>
                    <td class="text-gray-500 text-sm">{{ stop.date | date:'dd/MM/yyyy' }}</td>
                    <td class="font-medium text-sm">{{ stop.customerName }}</td>
                    <td class="text-xs text-gray-500">
                      @for (item of stop.items?.slice(0,2); track $index) {
                        <div>{{ item.productNameAr || item.productName }} × {{ item.quantityDelivered }}</div>
                      }
                    </td>
                    <td class="text-sm font-semibold">{{ stop.amountDue | number:'1.0-0' }}</td>
                    <td class="text-green-600 text-sm font-semibold">{{ stop.amountCollected | number:'1.0-0' }}</td>
                    <td>
                      <span class="badge text-xs"
                            [class.badge-green]="stop.status === 'Delivered'"
                            [class.badge-red]="stop.status === 'Failed'"
                            [class.badge-purple]="stop.status === 'Pending'">
                        {{ stop.status === 'Delivered' ? 'تم' : stop.status === 'Failed' ? 'فشل' : 'معلق' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (!reportData() && !loading()) {
        <div class="erp-card p-12 text-center">
          <div class="text-5xl mb-4">📊</div>
          <div class="text-gray-500 font-medium">اختر نوع التقرير ثم اضغط "إنشاء التقرير"</div>
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);

  activeTab        = signal<ReportTab>('sales');
  loading          = signal(false);
  reportData       = signal<any>(null);
  customers        = signal<any[]>([]);
  selectedCustomerId: number | null = null;

  fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  toDate   = new Date().toISOString().split('T')[0];

  tabs = [
    { id: 'sales' as ReportTab,      icon: '📈', label: 'المبيعات' },
    { id: 'debt' as ReportTab,       icon: '💳', label: 'الديون' },
    { id: 'inventory' as ReportTab,  icon: '📦', label: 'المخزون' },
    { id: 'statement' as ReportTab,  icon: '👤', label: 'كشف عميل' },
    { id: 'driver' as ReportTab,     icon: '🚛', label: 'المندوب' },
  ];

  ngOnInit() {
    this.api.getCustomers().subscribe({ next: d => this.customers.set(d) });
    this.generate();
  }

  selectTab(tab: ReportTab) { this.activeTab.set(tab); this.reportData.set(null); this.generate(); }

  setRange(range: 'today' | 'week' | 'month') {
    const now = new Date();
    this.toDate = now.toISOString().split('T')[0];
    if (range === 'today') {
      this.fromDate = this.toDate;
    } else if (range === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      this.fromDate = d.toISOString().split('T')[0];
    } else {
      this.fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    this.generate();
  }

  generate() {
    this.loading.set(true);
    this.reportData.set(null);

    const tab = this.activeTab();

    if (tab === 'sales') {
      this.api.getInvoices({ from: this.fromDate, to: this.toDate }).subscribe({
        next: invoices => {
          this.reportData.set({
            invoices,
            totalInvoices : invoices.length,
            totalSales    : invoices.reduce((s: number, i: any) => s + i.totalAmount, 0),
            totalPaid     : invoices.reduce((s: number, i: any) => s + i.paidAmount, 0),
            totalRemaining: invoices.reduce((s: number, i: any) => s + (i.totalAmount - i.paidAmount), 0),
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (tab === 'debt') {
      this.api.getDebtReport().subscribe({
        next: debtors => {
          this.reportData.set({
            debtors,
            totalDebt: debtors.reduce((s: number, d: any) => s + d.balance, 0),
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (tab === 'inventory') {
      this.api.getProducts().subscribe({
        next: products => {
          this.reportData.set({
            products,
            totalProducts  : products.length,
            lowStockCount  : products.filter((p: any) => p.currentStock < p.minimumStock).length,
            totalValue     : products.reduce((s: number, p: any) => s + p.currentStock * p.wholesalePrice, 0),
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (tab === 'statement' && this.selectedCustomerId) {
      this.api.getCustomerStatement(this.selectedCustomerId).subscribe({
        next: data => { this.reportData.set(data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (tab === 'driver') {
      this.api.getAllRoutes({ from: this.fromDate, to: this.toDate }).subscribe({
        next: routes => {
          const stops = routes.flatMap((r: any) => (r.stops ?? []).map((s: any) => ({ ...s, date: r.routeDate })));
          this.reportData.set({
            stops,
            totalDeliveries: stops.length,
            delivered      : stops.filter((s: any) => s.status === 'Delivered').length,
            totalDue       : stops.reduce((sum: number, s: any) => sum + s.amountDue, 0),
            totalCollected : stops.filter((s: any) => s.status === 'Delivered').reduce((sum: number, s: any) => sum + s.amountCollected, 0),
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  print() {
    window.print();
  }
}
