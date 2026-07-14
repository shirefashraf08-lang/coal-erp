import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(135deg, #1a1625 0%, #2d1f5e 50%, #1a1625 100%);">

      <!-- Logo + Card -->
      <div class="w-full max-w-sm mx-auto p-4 fade-in">

        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-[#7c3aed] flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="w-8 h-8">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
              <path d="M12 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
            </svg>
          </div>
          <h1 class="text-white text-2xl font-bold">نظام إدارة مصنع الفحم</h1>
          <p style="color: #a89ec9;" class="text-sm mt-1">سجّل دخولك للمتابعة</p>
        </div>

        <!-- Card -->
        <div class="erp-card p-6">
          <form (ngSubmit)="onSubmit()" #f="ngForm">

            <!-- Username -->
            <div class="mb-4">
              <label class="erp-label">اسم المستخدم</label>
              <div class="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1\/2">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="username"
                  name="username"
                  required
                  class="erp-input ps-9"
                  placeholder="admin"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="mb-6">
              <label class="erp-label">كلمة المرور</label>
              <div class="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1\/2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  [type]="showPass() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  class="erp-input ps-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="showPass.set(!showPass())"
                  class="absolute end-3 top-1/2 -translate-y-1\/2 text-gray-400 hover:text-gray-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                    @if (showPass()) {
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    } @else {
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <!-- Error -->
            @if (error()) {
              <div class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ error() }}
              </div>
            }

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="loading()"
              class="btn-primary w-full justify-center py-3"
            >
              @if (loading()) {
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                جارٍ تسجيل الدخول...
              } @else {
                تسجيل الدخول
              }
            </button>

          </form>
        </div>

        <!-- Demo hint -->
        <p class="text-center mt-4 text-sm" style="color:#6b5b9a;">
          للتجربة: admin / Admin&#64;1234
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        // توجيه حسب الدور
        const role = res?.role ?? this.auth.currentUser()?.role ?? '';
        if (role === 'Driver') this.router.navigate(['/driver']);
        else this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'فشل تسجيل الدخول. تحقق من البيانات.');
      }
    });
  }
}
