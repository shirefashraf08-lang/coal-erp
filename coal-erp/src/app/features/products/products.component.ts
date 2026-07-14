import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface ProductForm {
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
  wholesalePrice: number;
  retailPrice: number;
  minimumStock: number;
  openingStock: number;
  imageUrl: string;
  barcode: string;
  notes: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [TranslatePipe, CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="text-gray-500 text-sm mb-0.5">المستودع</div>
          <h1 class="page-title">إدارة الأصناف</h1>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary text-sm" (click)="openAdd()">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            إضافة صنف
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي الأصناف</div>
          <div class="text-2xl font-bold">{{ products().length }}</div>
          <div class="stat-bar"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">إجمالي المخزون</div>
          <div class="text-2xl font-bold">{{ totalStock() | number:'1.0-1' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#059669,#06b6d4)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">مخزون منخفض</div>
          <div class="text-2xl font-bold text-red-600">{{ lowCount() }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#ef4444,#f97316)"></div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 uppercase font-semibold mb-1">قيمة المخزون</div>
          <div class="text-2xl font-bold">{{ stockValue() | number:'1.0-0' }}</div>
          <div class="stat-bar" style="background:linear-gradient(90deg,#d97706,#7c3aed)"></div>
          <div class="text-xs text-gray-400">ج.م</div>
        </div>
      </div>

      <!-- Search -->
      <div class="erp-card mb-4 px-4 py-3">
        <div class="relative max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" [(ngModel)]="search" placeholder="بحث عن صنف..." class="erp-input ps-9 text-sm" />
        </div>
      </div>

      <!-- Table -->
      <div class="erp-card overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-400">جاري التحميل...</div>
        } @else if (filtered().length === 0) {
          <div class="p-12 text-center">
            <div class="text-5xl mb-4">📦</div>
            <div class="text-gray-500 font-medium">لا توجد أصناف بعد</div>
            <div class="text-gray-400 text-sm mt-1">أضف أول صنف باستخدام زر "إضافة صنف"</div>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الفئة</th>
                <th>الوحدة</th>
                <th>سعر الجملة</th>
                <th>سعر المفرد</th>
                <th>المخزون الحالي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-2.5">
                      @if (p.imageUrl) {
                        <img [src]="p.imageUrl" class="w-9 h-9 rounded-lg object-cover border border-gray-100" [alt]="p.nameAr" />
                      } @else {
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                             style="background: linear-gradient(135deg,#7c3aed,#06b6d4)">
                          {{ p.nameAr.charAt(0) }}
                        </div>
                      }
                      <div>
                        <div class="font-medium text-gray-800">{{ p.nameAr }}</div>
                        <div class="text-xs text-gray-400">{{ p.nameEn }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-purple">{{ p.category }}</span></td>
                  <td class="text-gray-500 text-sm">{{ p.unit }}</td>
                  <td class="font-semibold text-sm">{{ p.wholesalePrice | number:'1.0-0' }}</td>
                  <td class="font-semibold text-sm text-purple-600">{{ p.retailPrice | number:'1.0-0' }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-16 progress-bar">
                        <div class="progress-fill"
                             [style.width.%]="stockPercent(p)"
                             [style.background]="p.currentStock < p.minimumStock ? '#ef4444' : 'linear-gradient(90deg,#7c3aed,#06b6d4)'">
                        </div>
                      </div>
                      <span class="text-sm font-medium">{{ p.currentStock | number:'1.0-1' }}</span>
                    </div>
                  </td>
                  <td>
                    @if (p.currentStock < p.minimumStock) {
                      <span class="badge badge-red">⚠ منخفض</span>
                    } @else {
                      <span class="badge badge-green">جيد</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                              (click)="openEdit(p)" title="تعديل">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button class="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                              (click)="deleteProduct(p.id)" title="حذف">
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
        <div class="erp-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 fade-in">
          <div class="flex justify-between items-center mb-5">
            <h2 class="text-lg font-bold">{{ editingId() ? 'تعديل الصنف' : 'إضافة صنف جديد' }}</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="closeModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Image preview -->
          <div class="mb-4 flex flex-col items-center">
            @if (form.imageUrl) {
              <img [src]="form.imageUrl" class="w-28 h-28 rounded-xl object-cover border-2 border-purple-200 mb-2" alt="صورة الصنف" />
            } @else {
              <div class="w-28 h-28 rounded-xl flex items-center justify-center mb-2 text-4xl"
                   style="background:#f3f0ff; border:2px dashed #c4b5fd">📦</div>
            }
            <label class="btn-ghost text-xs cursor-pointer">
              رابط الصورة (URL)
            </label>
            <input type="url" [(ngModel)]="form.imageUrl" placeholder="https://example.com/image.jpg"
                   class="erp-input text-sm mt-1 w-full" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2 sm:col-span-1">
              <label class="erp-label">الاسم بالعربية *</label>
              <input [(ngModel)]="form.nameAr" class="erp-input" placeholder="مثال: فحم كتلي ممتاز" required />
            </div>
            <div class="col-span-2 sm:col-span-1">
              <label class="erp-label">الاسم بالإنجليزية</label>
              <input [(ngModel)]="form.nameEn" class="erp-input" placeholder="Premium Lump Coal" />
            </div>
            <div>
              <label class="erp-label">الفئة *</label>
              <input [(ngModel)]="form.category" class="erp-input" list="categories" placeholder="فحم كتلي، فحم مضغوط..." />
              <datalist id="categories">
                <option value="فحم كتلي"></option>
                <option value="فحم مضغوط"></option>
                <option value="فحم طبيعي"></option>
                <option value="فحم شيشة"></option>
              </datalist>
            </div>
            <div>
              <label class="erp-label">وحدة القياس *</label>
              <select [(ngModel)]="form.unit" class="erp-input">
                <option value="Ton">طن</option>
                <option value="Kg">كجم</option>
                <option value="Bag">كيس</option>
                <option value="Box">صندوق</option>
                <option value="Piece">قطعة</option>
              </select>
            </div>
            <div>
              <label class="erp-label">سعر الجملة *</label>
              <input type="number" [(ngModel)]="form.wholesalePrice" class="erp-input" min="0" />
            </div>
            <div>
              <label class="erp-label">سعر المفرد *</label>
              <input type="number" [(ngModel)]="form.retailPrice" class="erp-input" min="0" />
            </div>
            <div>
              <label class="erp-label">الحد الأدنى للمخزون</label>
              <input type="number" [(ngModel)]="form.minimumStock" class="erp-input" min="0" />
            </div>
            @if (!editingId()) {
              <div>
                <label class="erp-label">الرصيد الافتتاحي</label>
                <input type="number" [(ngModel)]="form.openingStock" class="erp-input" min="0" />
              </div>
            }
            <div class="col-span-2">
              <label class="erp-label">الباركود</label>
              <input [(ngModel)]="form.barcode" class="erp-input" placeholder="اختياري" />
            </div>
            <div class="col-span-2">
              <label class="erp-label">ملاحظات</label>
              <textarea [(ngModel)]="form.notes" class="erp-input" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="btn-primary flex-1" (click)="save()" [disabled]="saving()">
              @if (saving()) { جاري الحفظ... } @else { {{ editingId() ? 'حفظ التعديلات' : 'إضافة الصنف' }} }
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
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);

  search = '';
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saveError = signal('');
  products = signal<any[]>([]);

  form: ProductForm = this.emptyForm();

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.products().filter(
      p => !q || p.nameAr?.toLowerCase().includes(q) || p.nameEn?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  });

  totalStock = computed(() => this.products().reduce((s, p) => s + (p.currentStock ?? 0), 0));
  lowCount   = computed(() => this.products().filter(p => p.currentStock < p.minimumStock).length);
  stockValue = computed(() => this.products().reduce((s, p) => s + (p.currentStock ?? 0) * (p.wholesalePrice ?? 0), 0));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: data => { this.products.set(data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  stockPercent(p: any): number {
    const max = Math.max(p.minimumStock * 3, p.currentStock, 1);
    return Math.min((p.currentStock / max) * 100, 100);
  }

  openAdd() {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(p: any) {
    this.form = {
      nameAr: p.nameAr, nameEn: p.nameEn, category: p.category, unit: p.unit,
      wholesalePrice: p.wholesalePrice, retailPrice: p.retailPrice,
      minimumStock: p.minimumStock, openingStock: p.currentStock,
      imageUrl: p.imageUrl ?? '', barcode: p.barcode ?? '', notes: p.notes ?? '',
    };
    this.editingId.set(p.id);
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.nameAr || !this.form.category || !this.form.unit) {
      this.saveError.set('الرجاء تعبئة الحقول الإلزامية'); return;
    }
    this.saving.set(true);
    this.saveError.set('');

    const id = this.editingId();
    const obs = id
      ? this.api.updateProduct(id, {
          nameAr: this.form.nameAr, nameEn: this.form.nameEn,
          category: this.form.category, unit: this.form.unit,
          wholesalePrice: this.form.wholesalePrice, retailPrice: this.form.retailPrice,
          minimumStock: this.form.minimumStock, imageUrl: this.form.imageUrl || null,
          barcode: this.form.barcode || null, notes: this.form.notes || null,
        })
      : this.api.createProduct({
          nameAr: this.form.nameAr, nameEn: this.form.nameEn,
          category: this.form.category, unit: this.form.unit,
          wholesalePrice: this.form.wholesalePrice, retailPrice: this.form.retailPrice,
          minimumStock: this.form.minimumStock, openingStock: this.form.openingStock,
          imageUrl: this.form.imageUrl || null, barcode: this.form.barcode || null,
          notes: this.form.notes || null,
        });

    obs.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: err => { this.saving.set(false); this.saveError.set(err?.error?.message ?? 'حدث خطأ'); },
    });
  }

  deleteProduct(id: number) {
    if (!confirm('هل تريد حذف هذا الصنف؟')) return;
    this.api.deleteProduct(id).subscribe({ next: () => this.load() });
  }

  private emptyForm(): ProductForm {
    return { nameAr: '', nameEn: '', category: '', unit: 'Ton', wholesalePrice: 0, retailPrice: 0, minimumStock: 0, openingStock: 0, imageUrl: '', barcode: '', notes: '' };
  }
}
