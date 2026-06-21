// frontend/src/app/shared/notification-bell/notification-bell.component.ts
import { Component, ElementRef, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="relative">
    <button (click)="toggle()" class="relative text-xl px-2 py-1" aria-label="Notificaciones">
      🔔
      @if (notifications.unreadCount() > 0) {
        <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {{ notifications.unreadCount() }}
        </span>
      }
    </button>
    @if (open()) {
      <div class="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-100 z-50">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span class="font-cinzel font-bold text-gray-800 text-sm">Notificaciones</span>
          <button (click)="notifications.markAllRead()" class="font-cinzel text-xs text-purple-600 hover:underline">Marcar todas</button>
        </div>
        @if (notifications.items().length === 0) {
          <p class="font-playfair text-gray-400 text-sm text-center py-6">Sin notificaciones</p>
        } @else {
          @for (n of notifications.items(); track n.id) {
            <button (click)="onClick(n)" class="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-purple-50/40 transition-colors"
              [class.bg-blue-50]="!n.isRead">
              <p class="font-cinzel font-bold text-gray-800 text-xs">{{ n.title }}</p>
              <p class="font-playfair text-gray-500 text-xs mt-0.5">{{ n.message }}</p>
            </button>
          }
        }
      </div>
    }
  </div>
  `,
})
export class NotificationBellComponent implements OnInit {
  open = signal(false);
  constructor(public notifications: NotificationService, private router: Router, private host: ElementRef) {}
  ngOnInit() { this.notifications.start(); }
  toggle() { this.open.update((o) => !o); }

  // Cierra el dropdown al hacer clic fuera del componente.
  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: HTMLElement) {
    if (this.open() && !this.host.nativeElement.contains(target)) this.open.set(false);
  }
  onClick(n: AppNotification) {
    this.notifications.markRead(n);
    this.open.set(false);
    if (n.link) this.router.navigate([n.link]);
  }
}
