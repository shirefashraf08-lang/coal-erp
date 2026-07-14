import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-more',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-4">
      <div class="text-gray-500 text-sm font-semibold mb-4 px-1">المزيد</div>
      <div class="space-y-2">
        @for (item of items; track item.route) {
          <a [routerLink]="item.route" class="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="item.bg">
              <div [innerHTML]="item.icon" [style.color]="item.color"></div>
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-800 text-sm">{{ item.label }}</div>
              <div class="text-gray-400 text-xs">{{ item.desc }}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" class="w-4 h-4 flex-shrink-0" style="transform:scaleX(-1)">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        }
      </div>
    </div>
  `,
})
export class MoreComponent {
  items = [
    { label: 'الأصناف والمنتجات', desc: 'إدارة قائمة الفحم والأصناف', route: '/products',   color: '#dc2626', bg: '#fee2e2', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>` },
    { label: 'المخزون',            desc: 'حركات الوارد والصادر',       route: '/inventory',  color: '#0f766e', bg: '#ccfbf1', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/><line x1="8" y1="3" x2="8" y2="21"/></svg>` },
    { label: 'الموظفون',           desc: 'إدارة المستخدمين والصلاحيات', route: '/employees',  color: '#0891b2', bg: '#e0f2fe', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><circle cx="12" cy="7" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>` },
    { label: 'التقارير',           desc: 'تقارير المبيعات والديون',     route: '/reports',    color: '#6366f1', bg: '#eef2ff', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>` },
    { label: 'العملاء',            desc: 'قائمة العملاء والأرصدة',      route: '/customers',  color: '#7c3aed', bg: '#f3f0ff', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` },
  ];
}
