import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell" dir="rtl">

      <!-- TOP HEADER -->
      <header class="app-header">
        <div class="flex items-center gap-2">
          <div class="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:18px;height:18px">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
              <path d="M12 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
            </svg>
          </div>
          <div>
            <div class="app-name">فحم ERP</div>
            <div class="app-subtitle">نظام مصنع الفحم</div>
          </div>
        </div>

        <button (click)="showMenu.set(!showMenu())" class="header-menu-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      <!-- SLIDE MENU -->
      @if (showMenu()) {
        <div class="menu-overlay" (click)="showMenu.set(false)"></div>
        <div class="slide-menu">
          <div class="slide-menu-header">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold" style="background:#7c3aed">
              {{ userName().charAt(0) }}
            </div>
            <div>
              <div class="font-bold text-gray-800">{{ userName() }}</div>
              <div class="text-xs text-gray-400">{{ roleLabel() }}</div>
            </div>
          </div>
          @for (item of menuItems(); track item.route) {
            <a [routerLink]="item.route" (click)="showMenu.set(false)" class="slide-menu-item">
              <div [innerHTML]="item.icon" style="color:#7c3aed"></div>
              <span>{{ item.label }}</span>
            </a>
          }
          <div style="margin-top:auto;padding:16px;border-top:1px solid #f3f4f6">
            <button (click)="logout()" class="slide-menu-item text-red-500 w-full">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      }

      <!-- PAGE CONTENT -->
      <main class="app-main">
        <router-outlet />
      </main>

      <!-- BOTTOM NAV -->
      <nav class="app-bottom-nav">
        @for (tab of bottomTabs(); track tab.route) {
          <a [routerLink]="tab.route" routerLinkActive="active" class="bottom-tab-item">
            <div [innerHTML]="tab.icon" class="tab-icon-wrap"></div>
            <span class="tab-label">{{ tab.label }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .app-shell {
      display: flex; flex-direction: column;
      min-height: 100svh; max-width: 480px;
      margin: 0 auto; background: #f5f5f7;
      position: relative; overflow-x: hidden;
    }
    .app-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: white;
      border-bottom: 1px solid #f0f0f0;
      position: sticky; top: 0; z-index: 100;
      box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    }
    .app-logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg,#7c3aed,#06b6d4);
      display: flex; align-items: center; justify-content: center;
    }
    .app-name { font-size: 15px; font-weight: 800; color: #1f2937; }
    .app-subtitle { font-size: 10px; color: #9ca3af; }
    .header-menu-btn { color: #374151; padding: 6px; border-radius: 8px; background: #f9fafb; }
    .app-main { flex: 1; overflow-y: auto; padding-bottom: 65px; }
    .app-bottom-nav {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 480px;
      display: flex; background: white;
      border-top: 1px solid #f0f0f0;
      box-shadow: 0 -2px 16px rgba(0,0,0,0.08);
      z-index: 99; height: 60px;
    }
    .bottom-tab-item {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 2px; text-decoration: none; color: #9ca3af;
      transition: color 0.2s; font-size: 10px; font-weight: 600;
      padding: 4px 2px;
    }
    .bottom-tab-item.active { color: #7c3aed; }
    .tab-icon-wrap { display: flex; align-items: center; justify-content: center; }
    .tab-label { font-size: 10px; font-weight: 700; }

    /* Slide Menu */
    .menu-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      z-index: 200; backdrop-filter: blur(2px);
    }
    .slide-menu {
      position: fixed; top: 0; right: 0; height: 100%; width: 75%; max-width: 300px;
      background: white; z-index: 201; display: flex; flex-direction: column;
      box-shadow: -8px 0 32px rgba(0,0,0,0.15);
      animation: slideIn 0.25s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .slide-menu-header {
      display: flex; align-items: center; gap: 12px;
      padding: 24px 16px 16px; border-bottom: 1px solid #f3f4f6;
      background: #fafafa;
    }
    .slide-menu-item {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 16px; color: #374151; text-decoration: none;
      font-size: 14px; font-weight: 600; border: none; background: none;
      cursor: pointer; border-bottom: 1px solid #f9fafb; width: 100%;
    }
    .slide-menu-item:hover { background: #f9fafb; }
  `],
})
export class LayoutComponent implements OnInit {
  private auth      = inject(AuthService);
  private router    = inject(Router);
  private translate = inject(TranslateService);

  showMenu = signal(false);
  userName = computed(() => this.auth.currentUser()?.fullName ?? 'مستخدم');
  userRole = computed(() => this.auth.currentUser()?.role ?? '');

  roleLabel = computed(() => ({
    Admin: 'مدير النظام', Accountant: 'محاسب', Driver: 'سائق', Warehouse: 'مستودع'
  })[this.userRole()] ?? '');

  bottomTabs = computed(() => {
    const role = this.userRole();
    if (role === 'Driver') return [
      { route: '/driver',    label: 'رحلتي',    icon: this.tabIcon('truck') },
    ];
    if (role === 'Accountant') return [
      { route: '/dashboard',  label: 'الرئيسية', icon: this.tabIcon('home') },
      { route: '/invoices',   label: 'الفواتير',  icon: this.tabIcon('invoice') },
      { route: '/accounting', label: 'الحسابات', icon: this.tabIcon('money') },
      { route: '/reports',    label: 'التقارير',  icon: this.tabIcon('chart') },
    ];
    if (role === 'Warehouse') return [
      { route: '/dashboard', label: 'الرئيسية', icon: this.tabIcon('home') },
      { route: '/products',  label: 'الأصناف',  icon: this.tabIcon('box') },
      { route: '/inventory', label: 'المخزون',  icon: this.tabIcon('grid') },
    ];
    return [
      { route: '/dashboard',   label: 'الرئيسية', icon: this.tabIcon('home') },
      { route: '/invoices',    label: 'الفواتير',  icon: this.tabIcon('invoice') },
      { route: '/deliveries',  label: 'التوصيل',  icon: this.tabIcon('truck') },
      { route: '/accounting',  label: 'الحسابات', icon: this.tabIcon('money') },
      { route: '/more',        label: 'المزيد',   icon: this.tabIcon('dots') },
    ];
  });

  menuItems = computed(() => {
    const role = this.userRole();
    const all = [
      { route: '/dashboard',  label: 'الرئيسية',       roles: ['Admin','Accountant','Warehouse'], icon: this.menuIcon('home') },
      { route: '/products',   label: 'الأصناف',         roles: ['Admin','Warehouse'],              icon: this.menuIcon('box') },
      { route: '/inventory',  label: 'المخزون',         roles: ['Admin','Warehouse'],              icon: this.menuIcon('grid') },
      { route: '/customers',  label: 'العملاء',         roles: ['Admin','Accountant'],             icon: this.menuIcon('users') },
      { route: '/invoices',   label: 'الفواتير',         roles: ['Admin','Accountant'],             icon: this.menuIcon('invoice') },
      { route: '/deliveries', label: 'التوصيل',         roles: ['Admin','Warehouse'],              icon: this.menuIcon('truck') },
      { route: '/accounting', label: 'المحاسبة',        roles: ['Admin','Accountant'],             icon: this.menuIcon('money') },
      { route: '/reports',    label: 'التقارير',        roles: ['Admin','Accountant'],             icon: this.menuIcon('chart') },
      { route: '/employees',  label: 'الموظفون',        roles: ['Admin'],                          icon: this.menuIcon('person') },
      { route: '/driver',     label: 'شاشة المندوب',    roles: ['Driver'],                         icon: this.menuIcon('truck') },
    ];
    return all.filter(i => i.roles.includes(role));
  });

  ngOnInit() {
    this.translate.use('ar');
    document.documentElement.setAttribute('dir', 'rtl');
  }

  logout() { this.showMenu.set(false); this.auth.logout(); }

  private tabIcon(n: string) {
    const s = 'width:20px;height:20px';
    const m: Record<string,string> = {
      home   : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
      invoice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`,
      truck  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
      money  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      chart  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      box    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
      grid   : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      dots   : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${s}"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>`,
    };
    return m[n] ?? m['home'];
  }

  private menuIcon(n: string) {
    const s = 'width:18px;height:18px';
    const m: Record<string,string> = {
      home   : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
      box    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
      grid   : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      users  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      invoice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/></svg>`,
      truck  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
      money  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      chart  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      person : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${s}"><circle cx="12" cy="7" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
    };
    return m[n] ?? m['home'];
  }
}
