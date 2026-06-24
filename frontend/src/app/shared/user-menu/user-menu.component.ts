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
  1: 'Novato', 2: 'Veterano', 3: 'Épico', 4: 'Legendario',
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

      <!-- ── Trigger ── -->
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
        @if (charType()) {
          <img [src]="shieldSrc()" alt=""
               class="w-5 h-5 object-contain"
               (error)="onImgError($event)" />
        }
        <span class="max-w-[120px] truncate">{{ user()?.name }}</span>
        <span class="text-xs opacity-50 transition-transform duration-200"
              [class.rotate-180]="open()">▾</span>
      </button>

      <!-- ── Dropdown ── -->
      @if (open()) {
        <div class="absolute right-0 top-full mt-2 z-[9999]
                    rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up
                    bg-white dark:bg-slate-900
                    border border-slate-200 dark:border-slate-700"
             style="width:268px; animation-duration:0.13s; box-shadow: 0 8px 32px rgba(0,0,0,0.18)">

          <!-- ── CHARACTER CARD (students) ── -->
          @if (charType()) {
            <div class="relative overflow-hidden" [style.background]="charGradient()">
              <div class="absolute inset-0 opacity-25"
                   style="background: radial-gradient(ellipse at 80% 40%, white, transparent 65%)"></div>
              <div class="relative flex items-center gap-3 px-4 py-4">
                <div class="relative flex-shrink-0">
                  <img [src]="charImgSrc()" [alt]="charInfo()?.name ?? ''"
                       class="w-16 h-16 object-contain drop-shadow-xl"
                       (error)="onImgError($event)" />
                  <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center
                               bg-amber-400 text-slate-900 font-cinzel font-black text-xs
                               border-2 border-white shadow-md">
                    {{ user()?.level ?? 1 }}
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-cinzel font-black text-white text-sm leading-tight truncate drop-shadow">
                    {{ user()?.name }}
                  </p>
                  <p class="font-cinzel text-white/90 text-xs leading-tight mt-0.5 drop-shadow">
                    {{ charInfo()?.icon }} {{ charInfo()?.name }}
                    <span class="text-white/60">· {{ tierName() }}</span>
                  </p>
                  <div class="flex items-center gap-1 mt-2">
                    <span class="font-cinzel text-[10px] text-amber-300 font-bold">
                      💎 {{ user()?.points ?? 0 }} pts
                    </span>
                  </div>
                  <div class="mt-1.5 w-full h-1.5 rounded-full overflow-hidden"
                       style="background:rgba(255,255,255,0.25)">
                    <div class="h-full rounded-full bg-amber-300 transition-all duration-500"
                         [style.width.%]="xpPercent()"></div>
                  </div>
                  <p class="font-cinzel text-[9px] text-white/55 mt-0.5">
                    {{ user()?.experiencePoints ?? 0 }} / {{ xpNext() }} XP · Nv.{{ (user()?.level ?? 1) + 1 }}
                  </p>
                </div>
              </div>
            </div>

          } @else {
            <!-- Non-student header -->
            <div class="px-4 py-3 bg-amber-50 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700">
              <p class="font-cinzel text-sm font-black text-amber-800 dark:text-amber-400 truncate">
                {{ user()?.name }}
              </p>
              <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                {{ user()?.email }}
              </p>
            </div>
          }

          <!-- ── MENU ITEMS ── -->
          <div class="bg-white dark:bg-slate-900 py-1">

            @if (profileLink()) {
              <a [routerLink]="profileLink()" (click)="open.set(false)" class="menu-row">
                <span class="menu-icon bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">👤</span>
                <span class="menu-label">Mi Perfil</span>
                <span class="menu-arrow">›</span>
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)" class="menu-row">
              <span class="menu-icon bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">⚙️</span>
              <span class="menu-label">Configuración</span>
              <span class="menu-arrow">›</span>
            </a>

            <button (click)="cycleTheme($event)" class="menu-row w-full text-left">
              <span class="menu-icon bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                {{ themeIcon() }}
              </span>
              <span class="menu-label">Modo {{ themeLabel() }}</span>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded-full
                           bg-amber-100 text-amber-700
                           dark:bg-amber-900/40 dark:text-amber-400">
                cambiar
              </span>
            </button>
          </div>

          <!-- ── LOGOUT ── -->
          <div class="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-1">
            <button (click)="logout()" class="menu-row w-full text-left">
              <span class="menu-icon bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400">🚪</span>
              <span class="menu-label text-red-600 dark:text-red-400 font-bold">Cerrar sesión</span>
            </button>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .menu-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .menu-row:hover {
      background: #fef9ec;
    }
    :host-context(.dark) .menu-row:hover {
      background: rgba(255,255,255,0.04);
    }

    .menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      font-size: 14px;
      flex-shrink: 0;
    }

    .menu-label {
      flex: 1;
      font-family: 'Cinzel', serif;
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: 0.01em;
    }
    :host-context(.dark) .menu-label {
      color: #e2e8f0;
    }

    .menu-arrow {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1;
    }
  `],
})
export class UserMenuComponent {
  private auth         = inject(AuthService);
  private themeService = inject(ThemeService);

  open = signal(false);
  user = this.auth.user;

  charType     = computed(() => this.user()?.characterType as CharacterType | undefined);
  charInfo     = computed(() => { const t = this.charType(); return t ? CHARACTER_DATA[t] : null; });
  charGradient = computed(() => {
    const c = this.charInfo()?.color;
    return c ? `linear-gradient(135deg, ${c}ee, ${c}99)` : 'linear-gradient(135deg,#92400e,#78350f)';
  });
  charImgSrc   = computed(() => {
    const t = this.charType(); const lvl = this.user()?.level ?? 1;
    return t ? charImagePath(t, levelToTier(lvl)) : '';
  });
  shieldSrc    = computed(() => { const t = this.charType(); return t ? charShieldPath(t) : ''; });
  tierName     = computed(() => TIER_NAMES[levelToTier(this.user()?.level ?? 1)]);
  xpNext       = computed(() => xpForNextLevel(this.user()?.level ?? 1));
  xpPercent    = computed(() => {
    const xp = this.user()?.experiencePoints ?? 0;
    const max = this.xpNext();
    return max > 0 ? Math.min(100, Math.round((xp / max) * 100)) : 0;
  });

  themeIcon    = computed(() => THEME_ICONS[this.themeService.mode()]);
  themeLabel   = computed(() => THEME_LABELS[this.themeService.mode()]);

  profileLink  = computed(() => this.user()?.role === 'student' ? '/student/profile' : null);
  settingsLink = computed(() => {
    switch (this.user()?.role) {
      case 'teacher':  return '/teacher/settings';
      case 'director':
      case 'admin':    return '/director/settings';
      case 'parent':   return '/parent/settings';
      default:         return '/student/settings';
    }
  });

  toggle(e: Event) { e.stopPropagation(); this.open.update(v => !v); }
  cycleTheme(e: Event) { e.stopPropagation(); this.themeService.cycleMode(); }
  logout() { this.open.set(false); this.auth.logout(); }
  onImgError(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }

  @HostListener('document:click')
  onDocumentClick() { this.open.set(false); }
}
