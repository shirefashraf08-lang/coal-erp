import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div dir="rtl" style="background:#f5f5f7;min-height:100%">

      <!-- Banner -->
      <div style="background:linear-gradient(135deg,#1a1625 0%,#3b1f7c 100%);padding:20px 18px 24px;position:relative;overflow:hidden">
        <div style="position:relative;z-index:2">
          <div style="color:rgba(255,255,255,0.7);font-size:12px">{{ greeting() }}</div>
          <div style="color:white;font-size:20px;font-weight:800;margin-top:2px">{{ firstName() }} 👋</div>
          @if (stats()) {
            <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
              <div class="stat-chip">📦 {{ stats().totalProducts }} صنف</div>
              <div class="stat-chip">👥 {{ stats().totalCustomers }} عميل</div>
              <div class="stat-chip green">💰 {{ stats().todayRevenue | number:'1.0-0' }} ج.م اليوم</div>
            </div>
          }
        </div>
        <div style="position:absolute;width:150px;height:150px;border-radius:50%;background:rgba(124,58,237,0.25);top:-40px;left:-40px"></div>
        <div style="position:absolute;width:90px;height:90px;border-radius:50%;background:rgba(6,182,212,0.2);bottom:-20px;left:100px"></div>
      </div>

      <!-- Quick Actions -->
      @if (stats()) {
        <div style="display:grid;grid-template-columns:repeat(3,1fr);margin:12px 12px 0;gap:8px">
          <div class="quick-card purple">
            <div class="quick-val">{{ stats().todayInvoices }}</div>
            <div class="quick-lbl">فاتورة اليوم</div>
          </div>
          <div class="quick-card green">
            <div class="quick-val">{{ stats().pendingDeliveries }}</div>
            <div class="quick-lbl">توصيل معلق</div>
          </div>
          <div class="quick-card orange">
            <div class="quick-val">{{ stats().totalDebt | number:'1.0-0' }}</div>
            <div class="quick-lbl">ديون ج.م</div>
          </div>
        </div>
      }

      <!-- Sections -->
      @for (section of visibleSections(); track section.title) {
        <div style="padding:16px 12px 4px">
          <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px;padding-right:2px;display:flex;align-items:center;gap:6px">
            <div style="width:3px;height:16px;background:#7c3aed;border-radius:2px"></div>
            {{ section.title }}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            @for (item of section.items; track item.route) {
              <button (click)="go(item.route)" class="feature-card">
                <div class="feature-icon-wrap" [style.background]="item.bg">
                  <img [src]="item.img" [alt]="item.label" class="feature-img" />
                </div>
                <span class="feature-lbl">{{ item.label }}</span>
              </button>
            }
          </div>
        </div>
      }
      <div style="height:24px"></div>
    </div>
  `,
  styles: [`
    .stat-chip {
      background:rgba(255,255,255,0.15);border-radius:20px;
      padding:5px 12px;color:white;font-size:11px;font-weight:700;
    }
    .stat-chip.green { background:rgba(5,150,105,0.4); }
    .quick-card {
      background:white;border-radius:14px;padding:12px 8px;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.07);
    }
    .quick-card.purple { border-top:3px solid #7c3aed; }
    .quick-card.green  { border-top:3px solid #059669; }
    .quick-card.orange { border-top:3px solid #d97706; }
    .quick-val { font-size:20px;font-weight:800;color:#111827;line-height:1; }
    .quick-lbl { font-size:10px;color:#6b7280;margin-top:4px;font-weight:600; }
    .feature-card {
      display:flex;flex-direction:column;align-items:center;
      background:white;border-radius:18px;padding:16px 8px 12px;
      border:none;cursor:pointer;gap:8px;
      box-shadow:0 2px 10px rgba(0,0,0,0.07);
      transition:transform 0.12s;
    }
    .feature-card:active { transform:scale(0.94); }
    .feature-icon-wrap {
      width:58px;height:58px;border-radius:16px;
      display:flex;align-items:center;justify-content:center;
    }
    .feature-img { width:34px;height:34px;object-fit:contain; }
    .feature-lbl { font-size:11px;font-weight:700;color:#1f2937;text-align:center;line-height:1.3; }
  `],
})
export class DashboardComponent implements OnInit {
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private router = inject(Router);

  stats     = signal<any>(null);
  userRole  = computed(() => this.auth.currentUser()?.role ?? 'Admin');
  fullName  = computed(() => this.auth.currentUser()?.fullName ?? 'مستخدم');
  firstName = computed(() => this.fullName().split(' ')[0]);

  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'صباح الخير ☀️' : h < 17 ? 'مساء النور 🌤️' : 'مساء الخير 🌙';
  }

  // إيموجي كـ data URL مؤقت — سيتم استبدالها بصور حقيقية
  private e(emoji: string, bg: string) {
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='${encodeURIComponent(bg)}'/><text x='32' y='44' text-anchor='middle' font-size='32'>${emoji}</text></svg>`;
  }

  sections = [
    {
      title: 'حركات المبيعات',
      roles: ['Admin','Accountant'],
      items: [
        { label:'العملاء',   route:'/customers',  bg:'#ede9fe', img: this.e('👥','#ede9fe') },
        { label:'الفواتير',  route:'/invoices',   bg:'#dbeafe', img: this.e('🧾','#dbeafe') },
        { label:'المبيعات',  route:'/reports',    bg:'#d1fae5', img: this.e('📈','#d1fae5') },
        { label:'الحسابات', route:'/accounting', bg:'#fef3c7', img: this.e('💳','#fef3c7') },
        { label:'التقارير', route:'/reports',    bg:'#ede9fe', img: this.e('📊','#ede9fe') },
        { label:'الأصناف',  route:'/products',   bg:'#fee2e2', img: this.e('🪨','#fee2e2') },
      ],
    },
    {
      title: 'المخزون والتوصيل',
      roles: ['Admin','Warehouse'],
      items: [
        { label:'المخزون',  route:'/inventory',  bg:'#ccfbf1', img: this.e('📦','#ccfbf1') },
        { label:'التوصيل',  route:'/deliveries', bg:'#ede9fe', img: this.e('🚛','#ede9fe') },
        { label:'الموظفون', route:'/employees',  bg:'#dbeafe', img: this.e('👤','#dbeafe') },
      ],
    },
  ];

  visibleSections = computed(() => {
    const r = this.userRole();
    return this.sections.filter(s => s.roles.includes(r));
  });

  ngOnInit() {
    this.api.getDashboardStats().subscribe({ next: d => this.stats.set(d), error: () => {} });
  }

  go(route: string) { this.router.navigate([route]); }
}
