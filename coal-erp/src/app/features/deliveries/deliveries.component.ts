import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">العمليات</div>
          <h1 class="page-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" class="w-6 h-6">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 5v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            مسار التوصيل
          </h1>
        </div>
        <div class="flex gap-2">
          <button class="btn-ghost text-sm" (click)="loadAll()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.86"/>
            </svg>
            تحديث
          </button>
          <button class="btn-ghost text-sm" (click)="openLoadVehicle()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            تحميل السيارة
          </button>
          <button class="btn-primary text-sm" (click)="openCreateRoute()">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            رحلة جديدة
          </button>
        </div>
      </div>

      <!-- ─── ملخص السائق ─────────────────────────────── -->
      @if (summary()) {
        <div class="erp-card p-4 mb-5">
          <h2 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" class="w-5 h-5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            ملخص يوم التوصيل
          </h2>

          <!-- Stat row -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="rounded-xl p-3 text-center" style="background:#f3f0ff">
              <div class="text-2xl font-bold text-purple-600">{{ summary().deliveredStops }}</div>
              <div class="text-xs text-gray-500 mt-0.5">تم التسليم</div>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:#f0fdf4">
              <div class="text-2xl font-bold text-emerald-600">{{ summary().totalCollected | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-0.5">ج.م محصّل</div>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:#fff7ed">
              <div class="text-2xl font-bold text-orange-500">{{ summary().totalDue - summary().totalCollected | number:'1.0-0' }}</div>
              <div class="text-xs text-gray-500 mt-0.5">ج.م متبقي</div>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:#fef2f2">
              <div class="text-2xl font-bold text-gray-600">{{ summary().pendingStops }}</div>
              <div class="text-xs text-gray-500 mt-0.5">معلق</div>
            </div>
          </div>

          <!-- Progress -->
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>تقدم الرحلة</span>
            <span>{{ summary().totalStops > 0 ? (summary().deliveredStops / summary().totalStops * 100 | number:'1.0-0') : 0 }}%</span>
          </div>
          <div class="progress-bar h-2 rounded">
            <div class="progress-fill h-2 rounded"
                 [style.width.%]="summary().totalStops > 0 ? (summary().deliveredStops / summary().totalStops * 100) : 0">
            </div>
          </div>

          <!-- Loaded inventory table -->
          @if (summary().loadedItems?.length > 0) {
            <div class="mt-4">
              <div class="text-xs font-semibold text-gray-500 uppercase mb-2">الكميات المحملة على السيارة</div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-xs text-gray-400 border-b border-gray-100">
                      <th class="text-start py-1.5 font-semibold">الصنف</th>
                      <th class="text-center py-1.5 font-semibold">محمّل</th>
                      <th class="text-center py-1.5 font-semibold">سُلِّم</th>
                      <th class="text-center py-1.5 font-semibold">متبقي على السيارة</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of summary().loadedItems; track item.productId) {
                      @let delivered = getDeliveredQty(item.productId);
                      <tr class="border-b border-gray-50">
                        <td class="py-1.5 font-medium">{{ item.productName }}</td>
                        <td class="py-1.5 text-center">{{ item.ordered | number:'1.0-2' }} {{ item.unit }}</td>
                        <td class="py-1.5 text-center text-emerald-600 font-semibold">{{ delivered | number:'1.0-2' }}</td>
                        <td class="py-1.5 text-center font-bold"
                            [style.color]="(item.ordered - delivered) > 0 ? '#d97706' : '#059669'">
                          {{ (item.ordered - delivered) | number:'1.0-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ─── قائمة المحطات ────────────────────────────── -->
      @if (loading()) {
        <div class="erp-card p-12 text-center text-gray-400">جاري التحميل...</div>
      } @else if (stops().length === 0) {
        <div class="erp-card p-12 text-center">
          <div class="text-6xl mb-4">🚚</div>
          <div class="text-gray-500 font-medium text-lg">لا توجد رحلات توصيل اليوم</div>
          <div class="text-gray-400 text-sm mt-2">أنشئ رحلة جديدة من زر "رحلة جديدة" أعلاه</div>
        </div>
      } @else {
        <div class="space-y-3">
          @for (stop of stops(); track stop.id; let i = $index) {
            <div class="erp-card overflow-hidden transition-all"
                 [style.opacity]="stop.status === 'Delivered' ? '0.7' : '1'">
              <div class="p-4">
                <!-- Stop header -->
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                       [style.background]="stop.status === 'Delivered' ? '#059669' : stop.status === 'Failed' ? '#ef4444' : '#7c3aed'">
                    @if (stop.status === 'Delivered') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else if (stop.status === 'Failed') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div class="font-bold text-gray-900">{{ stop.customerName }}</div>
                        <div class="text-sm text-gray-500">{{ stop.customerAddress }}</div>
                        @if (stop.customerPhone) {
                          <a [href]="'tel:' + stop.customerPhone" class="text-xs text-purple-500 hover:underline">
                            📞 {{ stop.customerPhone }}
                          </a>
                        }
                      </div>
                      <span class="badge flex-shrink-0"
                            [class.badge-green]="stop.status === 'Delivered'"
                            [class.badge-red]="stop.status === 'Failed'"
                            [class.badge-purple]="stop.status === 'Pending'">
                        {{ stop.status === 'Delivered' ? 'تم التسليم' : stop.status === 'Failed' ? 'فشل' : 'معلق' }}
                      </span>
                    </div>

                    <!-- Items ordered vs delivered -->
                    <div class="mt-3 rounded-xl p-3" style="background:#f9f8ff">
                      <div class="text-xs font-semibold text-gray-400 mb-2 uppercase">الأصناف</div>
                      @for (item of stop.items; track item.id) {
                        <div class="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                          <span class="text-sm font-medium text-gray-700 flex-1">{{ item.productNameAr || item.productName }}</span>
                          <div class="flex items-center gap-2 text-sm">
                            @if (stop.status === 'Pending') {
                              <!-- Editable actual qty -->
                              <div class="flex items-center gap-1">
                                <span class="text-gray-400 text-xs">مطلوب: {{ item.quantityOrdered | number:'1.0-2' }}</span>
                                <input type="number"
                                       [(ngModel)]="stop._deliveredQtys[item.id]"
                                       class="erp-input text-xs py-0.5 w-20 text-center"
                                       [placeholder]="item.quantityOrdered"
                                       min="0" [max]="item.quantityOrdered"
                                       step="0.01"
                                       style="padding-top:2px;padding-bottom:2px" />
                                <span class="text-gray-400 text-xs">{{ item.unit }}</span>
                              </div>
                            } @else {
                              <span class="text-gray-400 text-xs">طُلِب {{ item.quantityOrdered | number:'1.0-2' }}</span>
                              <span class="font-bold text-emerald-600 text-xs">
                                سُلِّم {{ item.quantityDelivered | number:'1.0-2' }} {{ item.unit }}
                              </span>
                            }
                          </div>
                        </div>
                      }
                      <div class="flex justify-between mt-2 pt-2 border-t border-gray-200">
                        <span class="text-sm text-gray-500">المبلغ المستحق</span>
                        <span class="font-bold text-gray-800">{{ stop.amountDue | number:'1.0-0' }} ج.م</span>
                      </div>
                    </div>

                    <!-- Actions for pending stops -->
                    @if (stop.status === 'Pending') {
                      <div class="mt-3 space-y-2">
                        <div class="flex items-center gap-2">
                          <span class="text-sm text-gray-600 flex-shrink-0">المحصّل (ج.م):</span>
                          <div class="relative flex-1">
                            <span class="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">ر</span>
                            <input type="number" [(ngModel)]="stop._collected"
                                   [placeholder]="stop.amountDue"
                                   class="erp-input ps-7 text-sm" min="0" />
                          </div>
                        </div>
                        <input type="text" [(ngModel)]="stop._note"
                               placeholder="ملاحظة اختيارية..." class="erp-input text-sm" />
                        <div class="flex gap-2">
                          <button class="btn-primary flex-1 text-sm justify-center"
                                  (click)="markDelivered(stop)" [disabled]="savingId() === stop.id">
                            @if (savingId() === stop.id) { جاري... }
                            @else {
                              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" class="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                              تم التسليم
                            }
                          </button>
                          <button class="btn-ghost text-sm text-red-500 border-red-200 hover:bg-red-50"
                                  (click)="markFailed(stop)" [disabled]="savingId() === stop.id">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            فشل
                          </button>
                        </div>
                      </div>
                    }

                    @if (stop.status === 'Delivered') {
                      <div class="mt-2 flex items-center gap-4 text-sm">
                        <span class="text-emerald-600 font-semibold">✓ محصّل: {{ stop.amountCollected | number:'1.0-0' }} ج.م</span>
                        @if ((stop.amountDue - stop.amountCollected) > 0) {
                          <span class="text-orange-500">متبقي: {{ (stop.amountDue - stop.amountCollected) | number:'1.0-0' }} ج.م</span>
                        }
                        @if (stop.arrivalTime) {
                          <span class="text-gray-400 text-xs">{{ stop.arrivalTime | date:'HH:mm' }}</span>
                        }
                      </div>
                    }

                    @if (stop.note && stop.status !== 'Pending') {
                      <div class="mt-2 text-sm text-gray-500 rounded-lg px-3 py-2" style="background:#fef9e7">
                        💬 {{ stop.note }}
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- ─── Modal إنشاء رحلة جديدة ────────────────────────────────── -->
    @if (showCreate()) {
      <div class="modal-overlay" style="align-items:flex-start">
        <div class="erp-card w-full max-w-2xl p-6 fade-in my-4">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-xl font-bold">إنشاء رحلة توصيل جديدة</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showCreate.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Route info -->
          <div class="grid grid-cols-3 gap-3 mb-5 p-4 rounded-xl" style="background:#f8f7ff">
            <div>
              <label class="erp-label">التاريخ *</label>
              <input type="date" [(ngModel)]="route.date" class="erp-input" />
            </div>
            <div>
              <label class="erp-label">السائق *</label>
              <select [(ngModel)]="route.driverId" class="erp-input">
                <option value="">— اختر السائق —</option>
                @for (d of drivers(); track d.id) {
                  <option [value]="d.id">{{ d.fullName }} {{ d.vehiclePlate ? '(' + d.vehiclePlate + ')' : '' }}</option>
                }
              </select>
            </div>
            <div>
              <label class="erp-label">لوحة السيارة</label>
              <input [(ngModel)]="route.vehiclePlate" class="erp-input" placeholder="ABC-1234" />
            </div>
          </div>

          <!-- Stops -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-gray-700">محطات التوصيل</h3>
              <button class="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1" (click)="addStop()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                إضافة محطة
              </button>
            </div>

            @for (stop of route.stops; track $index; let si = $index) {
              <div class="border border-gray-100 rounded-xl p-4 mb-3">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm font-semibold text-gray-600">محطة {{ si + 1 }}</span>
                  <button class="text-gray-300 hover:text-red-500" (click)="removeStop(si)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label class="erp-label">العميل *</label>
                    <select [(ngModel)]="stop.customerId" class="erp-input text-sm">
                      <option [ngValue]="null">— اختر العميل —</option>
                      @for (c of customers(); track c.id) {
                        <option [ngValue]="c.id">{{ c.name }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="erp-label">المبلغ المستحق</label>
                    <input type="number" [(ngModel)]="stop.amountDue" class="erp-input text-sm" min="0" />
                  </div>
                </div>

                <!-- Items for this stop -->
                <div class="space-y-2">
                  @for (item of stop.items; track $index; let ii = $index) {
                    <div class="flex gap-2 items-end">
                      <div class="flex-1">
                        @if (ii === 0) { <label class="erp-label">الصنف</label> }
                        <select [(ngModel)]="item.productId" class="erp-input text-xs" (change)="onStopProductSelect(si, ii)">
                          <option [ngValue]="null">— اختر الصنف —</option>
                          @for (p of products(); track p.id) {
                            <option [ngValue]="p.id">{{ p.nameAr }} ({{ p.currentStock | number:'1.0-1' }} {{ p.unit }})</option>
                          }
                        </select>
                      </div>
                      <div class="w-24">
                        @if (ii === 0) { <label class="erp-label">الكمية</label> }
                        <input type="number" [(ngModel)]="item.quantity" class="erp-input text-xs" min="0.01" step="0.01" />
                      </div>
                      <div class="w-20">
                        @if (ii === 0) { <label class="erp-label">السعر</label> }
                        <input type="number" [(ngModel)]="item.unitPrice" class="erp-input text-xs" min="0" />
                      </div>
                      <div class="w-16">
                        @if (ii === 0) { <label class="erp-label">الوحدة</label> }
                        <input [(ngModel)]="item.unit" class="erp-input text-xs" placeholder="طن" />
                      </div>
                      <button class="text-gray-300 hover:text-red-500 mb-1" (click)="removeStopItem(si, ii)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  }
                  <button class="text-xs text-purple-500 hover:text-purple-700" (click)="addStopItem(si)">
                    + إضافة صنف آخر
                  </button>
                </div>
              </div>
            }

            @if (route.stops.length === 0) {
              <div class="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-xl border-gray-100">
                اضغط "إضافة محطة" لبدء بناء الرحلة
              </div>
            }
          </div>

          <div class="flex gap-2">
            <button class="btn-primary flex-1 justify-center" (click)="saveRoute()" [disabled]="creatingRoute()">
              @if (creatingRoute()) { جاري الإنشاء... } @else { إنشاء الرحلة }
            </button>
            <button class="btn-ghost" (click)="showCreate.set(false)">إلغاء</button>
          </div>
          @if (createError()) {
            <div class="mt-2 text-red-500 text-sm">{{ createError() }}</div>
          }
        </div>
      </div>
    }

    <!-- ─── Modal: تحميل السيارة ─────────────────────────── -->
    @if (showLoadModal()) {
      <div class="modal-overlay">
        <div class="erp-card w-full max-w-md p-6 fade-in">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">🚛 تحميل بضاعة على السيارة</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="showLoadModal.set(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="erp-label">السائق *</label>
              <select [(ngModel)]="loadForm.driverId" class="erp-input">
                <option value="">— اختر السائق —</option>
                @for (d of drivers(); track d.id) {
                  <option [value]="d.id">{{ d.fullName }}</option>
                }
              </select>
            </div>
            <div>
              <label class="erp-label">الصنف *</label>
              <select [(ngModel)]="loadForm.productId" class="erp-input">
                <option [ngValue]="null">— اختر الصنف —</option>
                @for (p of products(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nameAr }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="erp-label">الكمية *</label>
                <input type="number" [(ngModel)]="loadForm.quantityLoaded" class="erp-input" min="0" step="0.5" />
              </div>
              <div>
                <label class="erp-label">الوحدة</label>
                <select [(ngModel)]="loadForm.unit" class="erp-input">
                  <option value="طن">طن</option>
                  <option value="كيلو">كيلو</option>
                  <option value="كيس">كيس</option>
                  <option value="قطعة">قطعة</option>
                </select>
              </div>
            </div>
            <div>
              <label class="erp-label">تاريخ التحميل</label>
              <input type="date" [(ngModel)]="loadForm.loadDate" class="erp-input" />
            </div>
            <div>
              <label class="erp-label">ملاحظات</label>
              <input [(ngModel)]="loadForm.notes" class="erp-input" placeholder="اختياري" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="saveLoad()" [disabled]="savingLoad()">
              @if (savingLoad()) { جاري الحفظ... } @else { تسجيل التحميل }
            </button>
            <button class="btn-ghost" (click)="showLoadModal.set(false)">إلغاء</button>
          </div>
          @if (loadError()) {
            <div class="mt-2 text-red-500 text-sm">{{ loadError() }}</div>
          }
        </div>
      </div>
    }
  `,
})
export class DeliveriesComponent implements OnInit {
  private api = inject(ApiService);

  loading      = signal(true);
  savingId     = signal<number | null>(null);
  stops        = signal<any[]>([]);
  summary      = signal<any>(null);
  customers    = signal<any[]>([]);
  products     = signal<any[]>([]);
  drivers      = signal<any[]>([]);
  showCreate   = signal(false);
  creatingRoute= signal(false);
  createError  = signal('');

  // Vehicle Load
  showLoadModal = signal(false);
  savingLoad    = signal(false);
  loadError     = signal('');
  loadForm      = this.emptyLoadForm();

  route = this.emptyRoute();

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.api.getTodayRoute().subscribe({
      next: d => {
        const arr = Array.isArray(d) ? d : [];
        this.stops.set(arr.map(s => ({
          ...s,
          _collected: s.amountDue,
          _note: '',
          _deliveredQtys: Object.fromEntries((s.items ?? []).map((item: any) => [item.id, item.quantityOrdered])),
        })));
        this.loading.set(false);
      },
      error: () => { this.stops.set([]); this.loading.set(false); },
    });

    this.api.getDeliverySummary().subscribe({ next: d => this.summary.set(d), error: () => {} });
    this.api.getCustomers().subscribe({ next: d => this.customers.set(d) });
    this.api.getProducts().subscribe({ next: d => this.products.set(d) });
    this.api.getDrivers().subscribe({ next: d => this.drivers.set(d) });
  }

  getDeliveredQty(productId: number): number {
    const s = this.summary();
    if (!s?.deliveredItems) return 0;
    return s.deliveredItems.find((i: any) => i.productId === productId)?.delivered ?? 0;
  }

  markDelivered(stop: any) {
    this.savingId.set(stop.id);
    const deliveredItems = (stop.items ?? []).map((i: any) => ({
      itemId: i.id,
      quantityDelivered: stop._deliveredQtys?.[i.id] ?? i.quantityOrdered,
    }));
    this.api.updateDeliveryStop(stop.id, {
      status: 'Delivered',
      amountCollected: stop._collected ?? stop.amountDue,
      notes: stop._note,
      deliveredItems,
    }).subscribe({
      next: updated => {
        this.savingId.set(null);
        this.stops.update(list => list.map(s => s.id === stop.id ? { ...updated, _collected: 0, _note: '', _deliveredQtys: {} } : s));
        this.api.getDeliverySummary().subscribe({ next: d => this.summary.set(d) });
      },
      error: () => this.savingId.set(null),
    });
  }

  markFailed(stop: any) {
    this.savingId.set(stop.id);
    this.api.updateDeliveryStop(stop.id, {
      status: 'Failed',
      amountCollected: 0,
      notes: stop._note,
      deliveredItems: [],
    }).subscribe({
      next: updated => {
        this.savingId.set(null);
        this.stops.update(list => list.map(s => s.id === stop.id ? { ...updated, _collected: 0, _note: '', _deliveredQtys: {} } : s));
      },
      error: () => this.savingId.set(null),
    });
  }

  // ─── Create Route ────────────────────────────────────────────────
  openCreateRoute() {
    this.route = this.emptyRoute();
    this.createError.set('');
    this.showCreate.set(true);
  }

  addStop() {
    this.route.stops.push({ customerId: null, amountDue: 0, items: [this.emptyItem()] });
  }

  removeStop(i: number) { this.route.stops.splice(i, 1); }

  addStopItem(si: number) { this.route.stops[si].items.push(this.emptyItem()); }

  removeStopItem(si: number, ii: number) { this.route.stops[si].items.splice(ii, 1); }

  onStopProductSelect(si: number, ii: number) {
    const item = this.route.stops[si].items[ii];
    const prod = this.products().find(p => p.id === item.productId);
    if (prod) { item.unitPrice = prod.retailPrice; item.unit = prod.unit; }
  }

  saveRoute() {
    if (!this.route.driverId) { this.createError.set('اختر السائق'); return; }
    if (this.route.stops.length === 0) { this.createError.set('أضف محطة واحدة على الأقل'); return; }
    this.creatingRoute.set(true);
    this.createError.set('');

    const payload = {
      routeDate   : this.route.date,
      driverId    : this.route.driverId,
      vehiclePlate: this.route.vehiclePlate,
      notes       : '',
      stops       : this.route.stops.map(s => ({
        customerId: s.customerId,
        invoiceId : null,
        amountDue : s.amountDue,
        items     : s.items.filter((i: any) => i.productId).map((i: any) => ({
          productId : i.productId,
          quantity  : i.quantity,
          unitPrice : i.unitPrice,
          unit      : i.unit,
        })),
      })),
    };

    this.api.createDeliveryRoute(payload).subscribe({
      next: () => { this.creatingRoute.set(false); this.showCreate.set(false); this.loadAll(); },
      error: err => { this.creatingRoute.set(false); this.createError.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  openLoadVehicle() {
    this.loadForm = this.emptyLoadForm();
    this.loadError.set('');
    this.showLoadModal.set(true);
  }

  saveLoad() {
    if (!this.loadForm.driverId || !this.loadForm.productId || !this.loadForm.quantityLoaded) {
      this.loadError.set('السائق والصنف والكمية مطلوبة'); return;
    }
    this.savingLoad.set(true);
    this.api.createVehicleLoad({
      driverId      : this.loadForm.driverId,
      productId     : this.loadForm.productId,
      quantityLoaded: this.loadForm.quantityLoaded,
      unit          : this.loadForm.unit,
      loadDate      : this.loadForm.loadDate,
      notes         : this.loadForm.notes,
    }).subscribe({
      next: () => {
        this.savingLoad.set(false);
        this.showLoadModal.set(false);
        this.api.getDeliverySummary().subscribe({ next: d => this.summary.set(d) });
      },
      error: err => {
        this.savingLoad.set(false);
        this.loadError.set(err?.error?.message ?? 'حدث خطأ');
      },
    });
  }

  private emptyLoadForm() {
    return {
      driverId      : '',
      productId     : null as number | null,
      quantityLoaded: 0,
      unit          : 'طن',
      loadDate      : new Date().toISOString().split('T')[0],
      notes         : '',
    };
  }

  private emptyRoute() {
    return { date: new Date().toISOString().split('T')[0], driverId: '', vehiclePlate: '', stops: [] as any[] };
  }

  private emptyItem() {
    return { productId: null as number | null, quantity: 1, unitPrice: 0, unit: 'طن' };
  }
}
