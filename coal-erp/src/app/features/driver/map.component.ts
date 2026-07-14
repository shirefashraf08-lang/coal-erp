import { Component, Input, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-route-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="position:relative">
      <div #mapEl style="height:240px;width:100%;border-radius:16px;overflow:hidden;background:#e8e8e8"></div>
      @if (loading) {
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.7);border-radius:16px">
          <div style="text-align:center">
            <div style="font-size:32px">🗺️</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">تحميل الخريطة...</div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RouteMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef;
  @Input() stops: any[] = [];

  loading = true;
  private map: any;
  private L: any;

  async ngAfterViewInit() {
    try {
      this.L = await import('leaflet');
      const L = this.L;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl      : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl    : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Default center: Cairo
      const defaultCenter: [number, number] = [30.0444, 31.2357];

      const validStops = this.stops.filter(s => s.customerLat && s.customerLng);
      const center: [number, number] = validStops.length
        ? [validStops[0].customerLat, validStops[0].customerLng]
        : defaultCenter;

      this.map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: false })
        .setView(center, validStops.length ? 13 : 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(this.map);

      // Add markers and polyline
      const latLngs: [number,number][] = [];

      validStops.forEach((stop, i) => {
        const lat = stop.customerLat;
        const lng = stop.customerLng;
        latLngs.push([lat, lng]);

        const icon = L.divIcon({
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${stop.status === 'Delivered' ? '#059669' : stop.status === 'Failed' ? '#ef4444' : '#7c3aed'};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${i+1}</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker([lat, lng], { icon })
          .addTo(this.map)
          .bindPopup(`<b>${stop.customerName}</b><br>${stop.status === 'Delivered' ? '✅ تم التسليم' : stop.status === 'Failed' ? '❌ فشل' : '⏳ معلق'}`);
      });

      if (latLngs.length > 1) {
        L.polyline(latLngs, { color: '#7c3aed', weight: 3, opacity: 0.7, dashArray: '8,6' }).addTo(this.map);
        this.map.fitBounds(latLngs, { padding: [20, 20] });
      }

      this.loading = false;
    } catch(e) {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
