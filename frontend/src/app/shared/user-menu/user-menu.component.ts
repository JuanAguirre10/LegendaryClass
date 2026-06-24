import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';

const THEME_ICONS: Record<ThemeMode, string> = { system: '💻', dark: '🌙', light: '☀️' };
const THEME_LABELS: Record<ThemeMode, string> = { system: 'Sistema', dark: 'Nocturno', light: 'Claro' };

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="relative">
      <!-- Trigger -->
      <button
        (click)="toggle($event)"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl font-cinzel text-sm font-semibold
               transition-all duration-200 select-none
               text-gray-700 dark:text-slate-200
               hover:bg-amber-50 dark:hover:bg-slate-700
               border border-transparent hover:border-amber-300 dark:hover:border-amber-500/40"
        [class.bg-amber-50]="open()"
        [class.dark:bg-slate-700]="open()"
        [class.border-amber-300]="open()"
        aria-haspopup="true"
        [attr.aria-expanded]="open()">
        <span class="max-w-[140px] truncate">{{ user()?.name }}</span>
        <span class="text-xs opacity-60 transition-transform duration-200"
              [class.rotate-180]="open()">▾</span>
      </button>

      <!-- Dropdown panel -->
      @if (open()) {
        <div class="absolute right-0 top-full mt-2 w-52 z-[9999]
                    bg-white dark:bg-slate-800
                    border border-amber-200/60 dark:border-amber-500/20
                    rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40
                    overflow-hidden animate-fade-in-up"
             style="animation-duration:0.15s">

          <!-- User header -->
          <div class="px-4 py-3 border-b border-amber-100 dark:border-slate-700 bg-amber-50/60 dark:bg-slate-700/40">
            <p class="font-cinzel text-xs font-black text-amber-600 dark:text-amber-400 truncate">
              {{ user()?.name }}
            </p>
            <p class="font-playfair text-xs text-gray-400 dark:text-slate-500 truncate">
              {{ user()?.email }}
            </p>
          </div>

          <!-- Menu items -->
          <div class="py-1.5">
            @if (profileLink()) {
              <a [routerLink]="profileLink()" (click)="open.set(false)"
                 class="menu-item">
                <span>👤</span> Perfil
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)"
               class="menu-item">
              <span>⚙️</span> Configuración
            </a>

            <!-- Dark mode row -->
            <button (click)="cycleTheme($event)" class="menu-item w-full text-left justify-between">
              <span class="flex items-center gap-2">
                <span>{{ themeIcon() }}</span> Modo {{ themeLabel() }}
              </span>
              <span class="text-[10px] font-cinzel px-1.5 py-0.5 rounded-md
                           bg-amber-100 text-amber-700
                           dark:bg-slate-600 dark:text-amber-400">
                click
              </span>
            </button>
          </div>

          <!-- Divider + logout -->
          <div class="border-t border-red-100 dark:border-red-900/30 py-1.5">
            <button (click)="logout()" class="menu-item w-full text-left text-red-600 dark:text-red-400
                                              hover:bg-red-50 dark:hover:bg-red-900/20">
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .menu-item {
      @apply flex items-center gap-2.5 px-4 py-2 text-sm font-cinzel
             text-gray-700 dark:text-slate-300
             hover:bg-amber-50 dark:hover:bg-slate-700/60
             transition-colors duration-150 cursor-pointer;
    }
  `],
})
export class UserMenuComponent {
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);

  open = signal(false);
  user = this.auth.user;

  themeIcon  = computed(() => THEME_ICONS[this.themeService.mode()]);
  themeLabel = computed(() => THEME_LABELS[this.themeService.mode()]);

  profileLink = computed(() => {
    const role = this.user()?.role;
    return role === 'student' ? '/student/profile' : null;
  });

  settingsLink = computed(() => {
    const role = this.user()?.role;
    switch (role) {
      case 'teacher':  return '/teacher/settings';
      case 'director':
      case 'admin':    return '/director/settings';
      case 'parent':   return '/parent/settings';
      default:         return '/student/settings';
    }
  });

  toggle(e: Event) {
    e.stopPropagation();
    this.open.update(v => !v);
  }

  cycleTheme(e: Event) {
    e.stopPropagation();
    this.themeService.cycleMode();
  }

  logout() {
    this.open.set(false);
    this.auth.logout();
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.open.set(false);
  }
}
