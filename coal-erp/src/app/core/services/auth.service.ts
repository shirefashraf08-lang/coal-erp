import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

export interface LoginResponse {
  token: string;
  userId: string;
  fullName: string;
  role: string;
  expires: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API = '/api';
  private readonly TOKEN_KEY = 'coal_erp_token';
  private readonly USER_KEY = 'coal_erp_user';

  currentUser = signal<LoginResponse | null>(this.loadUser());
  isLoggedIn = signal(!!this.loadToken());

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${this.API}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response));
          this.currentUser.set(response);
          this.isLoggedIn.set(true);
        })
      );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  isAdmin() { return this.hasRole('Admin'); }
  isDriver() { return this.hasRole('Driver'); }
  isAccountant() { return this.hasRole('Accountant'); }

  private loadToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(this.TOKEN_KEY) : null;
  }

  private loadUser(): LoginResponse | null {
    if (typeof window === 'undefined') return null;
    const json = localStorage.getItem(this.USER_KEY);
    return json ? JSON.parse(json) : null;
  }
}
