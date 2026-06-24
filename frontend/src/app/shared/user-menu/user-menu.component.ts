import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import {
  CHARACTER_DATA, CharacterType,
  charImagePath, charShieldPath, levelToTier,
} from '../../core/models/user.model';

const THEME_ICONS: Record<ThemeMode, string>  = { system: '💻', dark: '🌙', light: '☀️' };
const THEME_LABELS: Record<ThemeMode, string> = { system: 'Sistema', dark: 'Nocturno', light: 'Claro' };

const TIER_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Novato',
  2: 'Veterano',
  3: 'Épico',
  4: 'Legendario',
};

function xpForNextLevel(level: number): number {
  return level * level * 100;
}

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
        [class.border-amber-300]="open()"
        aria-haspopup="true"
        [attr.aria-expanded]="open()">
        <!-- Shield thumbnail when student -->
        @if (charType()) {
          <img [src]="shieldSrc()" alt=""
               class="w-5 h-5 object-contain"
               (error)="onImgError($event)" />
        }
        <span class="max-w-[120px] truncate">{{ user()?.name }}</span>
        <span class="text-xs opacity-50 transition-transform duration-200"
              [class.rotate-180]="open()">▾</span>
      </button>

      <!-- Dropdown panel -->
      @if (open()) {
        <div class="absolute right-0 top-full mt-2 z-[9999]
                    bg-white dark:bg-slate-800
                    border border-amber-200/60 dark:border-amber-500/20
                    rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50
                    overflow-hidden animate-fade-in-up"
             style="width:260px; animation-duration:0.15s">

          <!-- ── CHARACTER CARD (students only) ── -->
          @if (charType()) {
            <div class="relative overflow-hidden"
                 [style.background]="charGradient()">
              <!-- Background glow -->
              <div class="absolute inset-0 opacity-20"
                   style="background: radial-gradient(circle at 70% 50%, white 0%, transparent 60%)"></div>

              <div class="relative flex items-center gap-3 px-4 py-3">
                <!-- Character image -->
                <div class="relative flex-shrink-0">
                  <img [src]="charImgSrc()" [alt]="charInfo()?.name ?? ''"
                       class="w-14 h-14 object-contain drop-shadow-lg"
                       (error)="onImgError($event)" />
                  <!-- Level badge -->
                  <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center
                               bg-amber-400 text-slate-900 font-cinzel font-black text-[10px]
                               border-2 border-white dark:border-slate-800 shadow">
                    {{ user()?.level ?? 1 }}
                  </div>
                </div>

                <!-- Info -->
                <div class="min-w-0">
                  <p class="font-cinzel font-black text-white text-sm leading-tight truncate">
                    {{ user()?.name }}
                  </p>
                  <p class="font-cinzel text-white/80 text-xs leading-tight mt-0.5">
                    {{ charInfo()?.icon }} {{ charInfo()?.name }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-1.5">
                    <span class="font-cinzel text-[10px] text-white/70 uppercase tracking-wide">
                      {{ tierName() }}
                    </span>
                    <span class="text-white/40">·</span>
                    <span class="font-cinzel text-[10px] text-amber-300">
                      💎 {{ user()?.points ?? 0 }} pts
                    </span>
                  </div>

                  <!-- XP bar -->
                  <div class="mt-1.5 w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div class="h-full rounded-full bg-amber-400 transition-all duration-500"
                         [style.width.%]="xpPercent()"></div>
                  </div>
                  <p class="font-cinzel text-[9px] text-white/50 mt-0.5">
                    {{ user()?.experiencePoints ?? 0 }} / {{ xpNext() }} XP
                  </p>
                </div>
              </div>
            </div>

          } @else {
            <!-- Non-student header -->
            <div class="px-4 py-3 border-b border-amber-100 dark:border-slate-700
                        bg-gradient-to-r from-amber-50 to-amber-100/40
                        dark:from-slate-700/60 dark:to-slate-700/20">
              <p class="font-cinzel text-sm font-black text-amber-700 dark:text-amber-400 truncate">
                {{ user()?.name }}
              </p>
              <p class="font-playfair text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                {{ user()?.email }}
              </p>
            </div>
          }

          <!-- ── MENU ITEMS ── -->
          <div class="py-1.5">
            @if (profileLink()) {
              <a [routerLink]="profileLink()" (click)="open.set(false)"
                 class="menu-item">
                <span>👤</span> Mi Perfil
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)"
               class="menu-item">
              <span>⚙️</span> Configuración
            </a>

            <!-- Theme row -->
            <button (click)="cycleTheme($event)"
                    class="menu-item w-full text-left justify-between group">
              <span class="flex items-center gap-2.5">
                <span>{{ themeIcon() }}</span>
                <span>Modo {{ themeLabel() }}</span>
              </span>
              <span class="text-[9px] font-cinzel px-1.5 py-0.5 rounded-md
                           bg-amber-100 text-amber-700
                           dark:bg-slate-700 dark:text-amber-400
                           group-hover:bg-amber-200 dark:group-hover:bg-slate-600 transition-colors">
                cambiar
              </span>
            </button>
          </div>

          <!-- ── LOGOUT ── -->
          <div class="border-t border-red-100/80 dark:border-red-900/20 py-1.5">
            <button (click)="logout()"
                    class="menu-item w-full text-left
                           text-red-600 dark:text-red-400
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
             hover:bg-amber-50/80 dark:hover:bg-slate-700/60
             transition-colors duration-150 cursor-pointer;
    }
  `],
})
export class UserMenuComponent {
  private auth         = inject(AuthService);
  private themeService = inject(ThemeService);

  open = signal(false);
  user = this.auth.user;

  charType  = computed(() => this.user()?.characterType as CharacterType | undefined);
  charInfo  = computed(() => {
    const t = this.charType();
    return t ? CHARACTER_DATA[t] : null;
  });
  charGradient = computed(() => {
    const info = this.charInfo();
    if (!info) return 'linear-gradient(135deg, #92400e, #78350f)';
    return `linear-gradient(135deg, ${info.color}, ${info.color}cc)`;
  });

  charImgSrc = computed(() => {
    const t = this.charType();
    const lvl = this.user()?.level ?? 1;
    return t ? charImagePath(t, levelToTier(lvl)) : '';
  });

  shieldSrc = computed(() => {
    const t = this.charType();
    return t ? charShieldPath(t) : '';
  });

  tierName = computed(() => {
    const lvl = this.user()?.level ?? 1;
    return TIER_NAMES[levelToTier(lvl)];
  });

  xpNext = computed(() => {
    const lvl = this.user()?.level ?? 1;
    return xpForNextLevel(lvl);
  });

  xpPercent = computed(() => {
    const xp  = this.user()?.experiencePoints ?? 0;
    const max = this.xpNext();
    return max > 0 ? Math.min(100, Math.round((xp / max) * 100)) : 0;
  });

  themeIcon  = computed(() => THEME_ICONS[this.themeService.mode()]);
  themeLabel = computed(() => THEME_LABELS[this.themeService.mode()]);

  profileLink = computed(() => {
    return this.user()?.role === 'student' ? '/student/profile' : null;
  });

  settingsLink = computed(() => {
    switch (this.user()?.role) {
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

  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.open.set(false);
  }
}
