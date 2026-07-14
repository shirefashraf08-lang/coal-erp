import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RouteMapComponent } from './map.component';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule, FormsModule, RouteMapComponent],
  template: `
    <div dir="rtl" style="background:#f5f5f7;min-height:100%;padding-bottom:100px">

      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#1a1625 0%,#3b1f7c 100%);padding:20px 18px 60px;position:relative;overflow:hidden">
        <div style="position:relative;z-index:2">
          <div style="color:rgba(255,255,255,0.6);font-size:12px">يوم موفق 🚛</div>
          <div style="color:white;font-size:20px;font-weight:800">{{ userName() }}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px">{{ today | date:'EEEE، d MMMM yyyy' }}</div>
        </div>
        <div style="position:absolute;width:160px;height:160px;border-radius:50%;background:rgba(124,58,237,0.2);top:-50px;left:-50px"></div>
      </div>

      <!-- SUMMARY CARDS (overlap header) -->
      <div style="margin:-36px 14px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div class="sum-card purple">
          <div class="sum-icon">💰</div>
          <div class="sum-val">{{ summary()?.collectedToday | number:'1.0-0' }}</div>
          <div class="sum-lbl">محصّل (ج.م)</div>
        </div>
        <div class="sum-card blue">
          <div class="sum-icon">📦</div>
          <div class="sum-val">{{ pendingStops() }}</div>
          <div class="sum-lbl">توصيلات معلقة</div>
        </div>
        <div class="sum-card green">
          <div class="sum-icon">✅</div>
          <div class="sum-val">{{ deliveredStops() }}</div>
          <div class="sum-lbl">تم التسليم</div>
        </div>
      </div>

      <!-- MAP SECTION -->
      <div style="margin:16px 14px 0">
        <div class="sec-header">
          <span>📍 خريطة خط السير</span>
          <button (click)="toggleMap()" class="mini-btn">{{ showMap() ? 'إخفاء' : 'عرض' }}</button>
        </div>
        @if (showMap()) {
          <div style="background:white;border-radius:18px;padding:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-top:8px">
            <app-route-map [stops]="allStops()" />
            <!-- Current Location Button -->
            <button (click)="openMyLocation()" class="loc-btn">
              📍 موقعي الحالي على Google Maps
            </button>
          </div>
        }
      </div>

      <!-- VEHICLE LOAD -->
      <div style="margin:14px 14px 0">
        <div class="sec-header">
          <span>🚛 البضاعة في السيارة</span>
          <span class="badge purple-badge">{{ vehicleLoads()?.loads?.length ?? 0 }} صنف</span>
        </div>
        @if (loadingData()) {
          <div class="skeleton-card"></div>
        } @else if (!vehicleLoads()?.loads?.length) {
          <div class="empty-card">
            <div style="font-size:36px">📭</div>
            <div style="font-size:13px;color:#6b7280;margin-top:6px">لا توجد بضاعة محملة اليوم</div>
          </div>
        } @else {
          <div class="white-card" style="padding:12px;margin-top:8px">
            @for (load of vehicleLoads()!.loads; track load.productId) {
              <div class="load-row">
                <div style="flex:1">
                  <div style="font-weight:700;color:#111827;font-size:13px">{{ load.productName }}</div>
                  <div style="font-size:11px;color:#6b7280">محمّل: {{ load.quantityLoaded }} {{ load.unit }}</div>
                </div>
                <div style="text-align:left">
                  <div style="font-size:13px;font-weight:800;color:#7c3aed">{{ load.quantityRemaining }} {{ load.unit }}</div>
                  <div style="font-size:10px;color:#059669">متبقي</div>
                </div>
                <div style="width:50px">
                  <div style="height:6px;background:#ede9fe;border-radius:3px;overflow:hidden">
                    <div style="height:100%;background:#7c3aed;border-radius:3px;transition:width 0.4s"
                         [style.width]="getLoadPct(load) + '%'"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- DELIVERY STOPS -->
      <div style="margin:14px 14px 0">
        <div class="sec-header">
          <span>🏠 محطات التوصيل</span>
          <span class="badge blue-badge">{{ allStops().length }} محطة</span>
        </div>

        @if (loadingStops()) {
          @for (x of [1,2,3]; track x) { <div class="skeleton-card"></div> }
        } @else if (!allStops().length) {
          <div class="empty-card">
            <div style="font-size:36px">🗺️</div>
            <div style="font-size:13px;color:#6b7280;margin-top:6px">لا توجد محطات توصيل اليوم</div>
          </div>
        } @else {
          @for (stop of allStops(); track stop.id; let i = $index) {
            <div class="stop-card" [class.delivered]="stop.status==='Delivered'" [class.failed]="stop.status==='Failed'">
              <!-- Stop number + status badge -->
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <div class="stop-num" [class.num-green]="stop.status==='Delivered'" [class.num-red]="stop.status==='Failed'">
                  {{ i + 1 }}
                </div>
                <div style="flex:1">
                  <div style="font-weight:800;color:#111827;font-size:14px">{{ stop.customerName }}</div>
                  <div style="font-size:11px;color:#6b7280">{{ stop.notes || 'لا توجد ملاحظات' }}</div>
                </div>
                <span class="status-chip" [class.chip-green]="stop.status==='Delivered'" [class.chip-red]="stop.status==='Failed'" [class.chip-gray]="stop.status==='Pending'">
                  {{ stop.status === 'Delivered' ? '✅ تم' : stop.status === 'Failed' ? '❌ فشل' : '⏳ معلق' }}
                </span>
              </div>

              <!-- Items -->
              <div style="background:#f9f9fb;border-radius:10px;padding:8px 10px;margin-bottom:10px">
                @for (item of stop.items; track item.productId) {
                  <div style="display:flex;justify-content:space-between;font-size:12px;color:#374151;padding:3px 0">
                    <span>{{ item.productName }}</span>
                    <span style="font-weight:700">{{ item.quantityPlanned }} {{ item.unit }}</span>
                  </div>
                }
              </div>

              <!-- Navigation + Actions -->
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                @if (stop.customerLat && stop.customerLng) {
                  <button (click)="navigate(stop)" class="nav-btn">
                    📍 فتح خرائط جوجل
                  </button>
                }
                @if (stop.status === 'Pending') {
                  <button (click)="openDeliver(stop)" class="action-btn green-btn">✅ تسليم</button>
                  <button (click)="markFailed(stop)" class="action-btn red-btn">❌ فشل</button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Deliver Modal -->
      @if (deliveringStop()) {
        <div class="modal-overlay" (click)="closeDeliver()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div style="font-size:18px;font-weight:800;margin-bottom:16px;color:#111827">تأكيد التسليم</div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:14px">{{ deliveringStop()!.customerName }}</div>
            @for (item of deliverItems(); track item.productId) {
              <div style="margin-bottom:12px">
                <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">{{ item.productName }} (المخطط: {{ item.quantityPlanned }} {{ item.unit }})</label>
                <input type="number" [(ngModel)]="item.quantityDelivered" [max]="item.quantityPlanned" min="0"
                  style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box" />
              </div>
            }
            <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">مبلغ محصّل (ج.م)</label>
            <input type="number" [(ngModel)]="collectAmount" min="0"
              style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:16px;box-sizing:border-box" />
            <div style="display:flex;gap:8px">
              <button (click)="confirmDeliver()" [disabled]="submitting()"
                style="flex:1;background:#7c3aed;color:white;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer">
                {{ submitting() ? '...' : '✅ تأكيد التسليم' }}
              </button>
              <button (click)="closeDeliver()"
                style="padding:14px 18px;border:2px solid #e5e7eb;background:white;border-radius:12px;cursor:pointer;font-size:14px">✕</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sum-card {
      background:white;border-radius:14px;padding:12px 6px;text-align:center;
      box-shadow:0 4px 14px rgba(0,0,0,0.12);
    }
    .sum-card.purple { border-top:3px solid #7c3aed; }
    .sum-card.blue   { border-top:3px solid #0891b2; }
    .sum-card.green  { border-top:3px solid #059669; }
    .sum-icon { font-size:18px; }
    .sum-val  { font-size:18px;font-weight:800;color:#111827;line-height:1; }
    .sum-lbl  { font-size:9px;color:#6b7280;margin-top:2px;font-weight:600; }

    .sec-header {
      display:flex;align-items:center;justify-content:space-between;
      font-size:13px;font-weight:800;color:#111827;margin-bottom:2px;
    }
    .white-card { background:white;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,0.07); }
    .empty-card {
      background:white;border-radius:16px;padding:30px;text-align:center;
      box-shadow:0 2px 10px rgba(0,0,0,0.07);margin-top:8px;
    }
    .skeleton-card {
      background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);
      background-size:200% 100%;animation:shimmer 1.2s infinite;
      border-radius:16px;height:70px;margin-top:8px;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .badge { padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700; }
    .purple-badge { background:#ede9fe;color:#7c3aed; }
    .blue-badge   { background:#dbeafe;color:#1d4ed8; }

    .mini-btn { background:#ede9fe;color:#7c3aed;border:none;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer; }
    .loc-btn {
      display:block;width:100%;margin-top:10px;padding:10px;
      background:linear-gradient(135deg,#4285f4,#34a853);color:white;
      border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;
    }

    .load-row { display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6; }
    .load-row:last-child { border-bottom:none; }

    .stop-card {
      background:white;border-radius:18px;padding:14px;margin-top:10px;
      box-shadow:0 2px 12px rgba(0,0,0,0.08);border-right:4px solid #d1d5db;
    }
    .stop-card.delivered { border-right-color:#059669; }
    .stop-card.failed    { border-right-color:#ef4444; }

    .stop-num {
      width:28px;height:28px;border-radius:50%;background:#7c3aed;color:white;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;
    }
    .stop-num.num-green { background:#059669; }
    .stop-num.num-red   { background:#ef4444; }

    .status-chip { padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700; }
    .chip-green { background:#d1fae5;color:#065f46; }
    .chip-red   { background:#fee2e2;color:#991b1b; }
    .chip-gray  { background:#f3f4f6;color:#374151; }

    .nav-btn {
      background:#dbeafe;color:#1d4ed8;border:none;border-radius:10px;
      padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;flex:1;
    }
    .action-btn { border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer; }
    .green-btn { background:#d1fae5;color:#065f46; }
    .red-btn   { background:#fee2e2;color:#991b1b; }

    .modal-overlay {
      position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
      display:flex;align-items:flex-end;justify-content:center;padding:0;
    }
    .modal-box {
      background:white;border-radius:24px 24px 0 0;padding:24px 20px;width:100%;max-width:480px;
      max-height:90vh;overflow-y:auto;animation:slideUp 0.25s ease;
    }
    @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  `],
})
export class DriverComponent implements OnInit {
  private api  = inject(ApiService);
  private auth = inject(AuthService);

  today         = new Date();
  vehicleLoads  = signal<any>(null);
  summary       = computed(() => this.vehicleLoads());
  allStops      = signal<any[]>([]);
  loadingData   = signal(true);
  loadingStops  = signal(true);
  submitting    = signal(false);
  showMap       = signal(true);

  deliveringStop = signal<any>(null);
  deliverItems   = signal<any[]>([]);
  collectAmount  = 0;

  userName = () => this.auth.currentUser()?.fullName ?? 'المندوب';

  pendingStops  = () => this.allStops().filter(s => s.status === 'Pending').length;
  deliveredStops = () => this.allStops().filter(s => s.status === 'Delivered').length;

  getLoadPct(load: any) {
    if (!load.quantityLoaded) return 0;
    return Math.round((load.quantityRemaining / load.quantityLoaded) * 100);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadingData.set(true);
    this.loadingStops.set(true);

    this.api.getVehicleLoadToday().subscribe({
      next: d => { this.vehicleLoads.set(d); this.loadingData.set(false); },
      error: () => this.loadingData.set(false),
    });

    this.api.getDriverStops().subscribe({
      next: d => { this.allStops.set(d ?? []); this.loadingStops.set(false); },
      error: () => this.loadingStops.set(false),
    });
  }

  toggleMap() { this.showMap.update(v => !v); }

  navigate(stop: any) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.customerLat},${stop.customerLng}&travelmode=driving`;
    window.open(url, '_blank');
  }

  openMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const url = `https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`;
        window.open(url, '_blank');
      }, () => {
        window.open('https://www.google.com/maps', '_blank');
      });
    }
  }

  openDeliver(stop: any) {
    this.deliveringStop.set(stop);
    this.deliverItems.set((stop.items ?? []).map((it: any) => ({ ...it, quantityDelivered: it.quantityPlanned })));
    this.collectAmount = 0;
  }

  closeDeliver() { this.deliveringStop.set(null); }

  confirmDeliver() {
    const stop = this.deliveringStop();
    if (!stop) return;
    this.submitting.set(true);
    this.api.markStopDelivered(stop.id, this.deliverItems(), this.collectAmount).subscribe({
      next: () => { this.submitting.set(false); this.closeDeliver(); this.loadData(); },
      error: () => this.submitting.set(false),
    });
  }

  markFailed(stop: any) {
    this.api.markStopFailed(stop.id).subscribe({ next: () => this.loadData(), error: () => {} });
  }
}
