// frontend/src/app/core/notifications/notification.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { RealtimeService } from '../realtime/realtime.service';

export interface AppNotification {
  id: string; type: string; title: string; message: string;
  link: string | null; isRead: boolean; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  unreadCount = signal(0);
  items = signal<AppNotification[]>([]);
  private started = false;

  constructor(private http: HttpClient, private realtime: RealtimeService) {}

  // Llamar una vez tras el login (p. ej. desde el bell component).
  start(): void {
    if (this.started) return;
    this.started = true;
    this.refresh();
    this.realtime.onEvent<AppNotification>('notification:new').subscribe((n) => {
      this.items.update((list) => [n, ...list]);
      this.unreadCount.update((c) => c + 1);
    });
  }

  refresh(): void {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`)
      .subscribe({ next: (r) => this.unreadCount.set(r.count) });
    this.http.get<{ data: AppNotification[] }>(`${environment.apiUrl}/notifications?limit=10&page=1`)
      .subscribe({ next: (r) => this.items.set(r.data) });
  }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.http.patch(`${environment.apiUrl}/notifications/${n.id}/read`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  markAllRead(): void {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => ({ ...x, isRead: true })));
        this.unreadCount.set(0);
      },
    });
  }
}
