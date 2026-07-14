import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly BASE = '/api';

  // ─── Dashboard ───────────────────────────────────────────────
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/dashboard/stats`);
  }

  getRecentInvoices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/dashboard/recent-invoices`);
  }

  getTopCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/dashboard/top-customers`);
  }

  getSalesChart(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/dashboard/sales-chart`);
  }

  // ─── Customers ───────────────────────────────────────────────
  getCustomers(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/customers`, { params: this.toParams(params) });
  }

  getCustomer(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE}/customers/${id}`);
  }

  getCustomerStatement(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE}/customers/${id}/statement`);
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/customers`, data);
  }

  updateCustomer(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.BASE}/customers/${id}`, data);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/customers/${id}`);
  }

  // ─── Products ────────────────────────────────────────────────
  getProducts(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/products`, { params: this.toParams(params) });
  }

  createProduct(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/products`, data);
  }

  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.BASE}/products/${id}`, data);
  }

  getInventoryMovements(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/products/movements`, { params: this.toParams(params) });
  }

  addInventoryMovement(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/products/movements`, data);
  }

  // ─── Invoices ────────────────────────────────────────────────
  getInvoices(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/invoices`, { params: this.toParams(params) });
  }

  createInvoice(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/invoices`, data);
  }

  addPayment(invoiceId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/invoices/${invoiceId}/payments`, data);
  }

  getDebtReport(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/invoices/debt-report`);
  }

  // ─── Deliveries ──────────────────────────────────────────────
  getTodayRoute(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/deliveries/today`);
  }

  getDeliverySummary(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/deliveries/summary`);
  }

  getAllRoutes(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/deliveries`, { params: this.toParams(params) });
  }

  updateDeliveryStop(stopId: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.BASE}/deliveries/stops/${stopId}`, data);
  }

  createDeliveryRoute(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/deliveries`, data);
  }

  deleteDeliveryRoute(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/deliveries/${id}`);
  }

  getDrivers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/auth/drivers`);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/auth/users`);
  }

  registerUser(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/register`, data);
  }

  updateUserRole(id: string, data: { role: string; vehiclePlate?: string }): Observable<any> {
    return this.http.patch<any>(`${this.BASE}/auth/users/${id}/role`, data);
  }

  // ─── Vehicle Loads ────────────────────────────────────────────
  getVehicleLoadToday(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/vehicle-loads/today`);
  }

  getVehicleLoads(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/vehicle-loads`, { params: this.toParams(params) });
  }

  createVehicleLoad(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/vehicle-loads`, data);
  }

  deleteVehicleLoad(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/vehicle-loads/${id}`);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/products/${id}`);
  }

  // ─── Treasury ────────────────────────────────────────────────
  getTreasury(params?: Record<string, string>): Observable<any> {
    return this.http.get<any>(`${this.BASE}/treasury`, { params: this.toParams(params) });
  }

  addTreasuryTransaction(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/treasury`, data);
  }

  // ─── Adjustments ─────────────────────────────────────────────
  getAdjustments(params?: Record<string, string>): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/adjustments`, { params: this.toParams(params) });
  }

  createAdjustment(data: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/adjustments`, data);
  }

  deleteAdjustment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/adjustments/${id}`);
  }

  // ─── Driver Stops ────────────────────────────────────────
  getDriverStops(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/deliveries/my-stops`);
  }

  markStopDelivered(stopId: number, items: any[], collectedAmount: number): Observable<any> {
    return this.http.patch<any>(`${this.BASE}/deliveries/stops/${stopId}/deliver`, { items, collectedAmount });
  }

  markStopFailed(stopId: number): Observable<any> {
    return this.http.patch<any>(`${this.BASE}/deliveries/stops/${stopId}/fail`, {});
  }

  // ─── Reports ─────────────────────────────────────────────────
  getSalesReport(params?: Record<string, string>): Observable<any> {
    return this.http.get<any>(`${this.BASE}/reports/sales`, { params: this.toParams(params) });
  }

  private toParams(obj?: Record<string, string>): HttpParams {
    let params = new HttpParams();
    if (obj) {
      Object.entries(obj).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, v);
      });
    }
    return params;
  }
}
