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
const TIER_NAMES:  Record<1|2|3|4, string>   = { 1:'Novato', 2:'Veterano', 3:'Épico', 4:'Legendario' };

function xpForNext(lvl: number) { return lvl * lvl * 100; }

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="relative flex items-center gap-0">

      <!-- ── 💎 puntos globales (pegado al trigger) ── -->
      <div class="flex items-center gap-1 px-3 py-1.5 rounded-l-xl font-cinzel text-xs font-bold
                  bg-amber-400/20 dark:bg-amber-500/20
                  border border-r-0 border-amber-400 dark:border-amber-500
                  text-amber-800 dark:text-amber-300 select-none">
        💎 {{ user()?.points ?? 0 }}
      </div>

      <!-- ── Trigger con nombre ── -->
      <button
        (click)="toggle($event)"
        class="flex items-center gap-2 pl-3 pr-2.5 py-1.5
               font-cinzel text-sm font-bold
               border border-amber-400 dark:border-amber-500
               rounded-r-xl
               text-gray-800 dark:text-slate-100
               transition-all duration-150 select-none"
        [ngClass]="open()
          ? 'bg-amber-300/40 dark:bg-amber-500/30'
          : 'bg-amber-400/10 dark:bg-amber-500/10 hover:bg-amber-300/30 dark:hover:bg-amber-500/20'"
        aria-haspopup="true"
        [attr.aria-expanded]="open()">
        @if (charType()) {
          <img [src]="shieldSrc()" alt=""
               class="w-5 h-5 object-contain flex-shrink-0"
               (error)="onImgError($event)" />
        }
        <span>{{ user()?.name }}</span>
        <span class="text-amber-600 dark:text-amber-400 text-xs font-black transition-transform duration-200"
              [class.rotate-180]="open()">▾</span>
      </button>

      <!-- ── Dropdown panel ── -->
      @if (open()) {
        <div class="absolute right-0 top-full mt-2 z-[9999]
                    rounded-2xl overflow-hidden animate-fade-in-up
                    bg-white dark:bg-slate-900
                    border-2 border-amber-400 dark:border-amber-500"
             style="width:280px; animation-duration:0.13s;
                    box-shadow: 0 0 0 1px rgba(251,191,36,0.3), 0 12px 40px rgba(0,0,0,0.22)">

          <!-- ── CHARACTER CARD ── -->
          @if (charType()) {
            <div class="relative overflow-hidden" [style.background]="charGradient()">
              <div class="absolute inset-0 opacity-30"
                   style="background:radial-gradient(ellipse at 80% 40%, white, transparent 65%)"></div>
              <div class="relative flex items-center gap-3 px-4 py-4">
                <div class="relative flex-shrink-0">
                  <img [src]="charImgSrc()" [alt]="charInfo()?.name ?? ''"
                       class="w-16 h-16 object-contain drop-shadow-xl"
                       (error)="onImgError($event)" />
                  <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center
                               bg-amber-400 text-slate-900 font-cinzel font-black text-xs
                               border-2 border-white shadow-lg">
                    {{ user()?.level ?? 1 }}
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-cinzel font-black text-white text-sm leading-tight drop-shadow">
                    {{ user()?.name }}
                  </p>
                  <p class="font-cinzel text-white/90 text-xs mt-0.5">
                    {{ charInfo()?.icon }} {{ charInfo()?.name }}
                    <span class="text-white/65">· {{ tierName() }}</span>
                  </p>
                  <p class="font-cinzel text-[10px] text-amber-300 font-bold mt-1.5">
                    💎 {{ user()?.points ?? 0 }} pts globales
                  </p>
                  <div class="mt-1.5 w-full h-1.5 rounded-full overflow-hidden"
                       style="background:rgba(255,255,255,0.25)">
                    <div class="h-full rounded-full bg-amber-300 transition-all duration-500"
                         [style.width.%]="xpPercent()"></div>
                  </div>
                  <p class="font-cinzel text-[9px] text-white/55 mt-0.5">
                    {{ user()?.experiencePoints ?? 0 }} / {{ xpNext() }} XP · próx. Nv.{{ (user()?.level ?? 1) + 1 }}
                  </p>
                </div>
              </div>
            </div>

          } @else {
            <div class="px-4 py-3 border-b-2 border-amber-400 dark:border-amber-500
                        bg-amber-50 dark:bg-slate-800">
              <p class="font-cinzel text-sm font-black text-amber-800 dark:text-amber-300">
                {{ user()?.name }}
              </p>
              <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {{ user()?.email }}
              </p>
            </div>
          }

          <!-- ── MENU ITEMS ── -->
          <div class="bg-white dark:bg-slate-900 py-2 px-2 flex flex-col gap-0.5">

            @if (profileLink()) {
              <a [routerLink]="profileLink()" (click)="open.set(false)"
                 class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                        bg-indigo-50 dark:bg-indigo-950/60
                        hover:bg-indigo-100 dark:hover:bg-indigo-900/60
                        transition-colors duration-100">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                             bg-indigo-500 text-white flex-shrink-0 shadow-sm">👤</span>
                <span class="font-cinzel font-bold text-sm text-indigo-900 dark:text-indigo-200">
                  Mi Perfil
                </span>
                <span class="ml-auto text-indigo-400 font-bold text-base leading-none">›</span>
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                      bg-slate-50 dark:bg-slate-800
                      hover:bg-slate-100 dark:hover:bg-slate-700
                      transition-colors duration-100">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-slate-500 text-white flex-shrink-0 shadow-sm">⚙️</span>
              <span class="font-cinzel font-bold text-sm text-slate-800 dark:text-slate-100">
                Configuración
              </span>
              <span class="ml-auto text-slate-400 font-bold text-base leading-none">›</span>
            </a>

            <button (click)="cycleTheme($event)"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left
                           bg-violet-50 dark:bg-violet-950/50
                           hover:bg-violet-100 dark:hover:bg-violet-900/50
                           transition-colors duration-100">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-violet-500 text-white flex-shrink-0 shadow-sm">
                {{ themeIcon() }}
              </span>
              <span class="font-cinzel font-bold text-sm text-violet-900 dark:text-violet-200">
                Modo {{ themeLabel() }}
              </span>
              <span class="ml-auto font-cinzel text-[10px] font-bold px-2 py-0.5 rounded-full
                           bg-amber-400 text-amber-900 shadow-sm">
                TAP
              </span>
            </button>

          </div>

          <!-- ── LOGOUT ── -->
          <div class="bg-white dark:bg-slate-900 pb-2 px-2 border-t border-amber-200 dark:border-amber-800/40">
            <button (click)="logout()"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left
                           bg-red-50 dark:bg-red-950/40
                           hover:bg-red-100 dark:hover:bg-red-900/40
                           transition-colors duration-100 mt-1.5">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-red-500 text-white flex-shrink-0 shadow-sm">🚪</span>
              <span class="font-cinzel font-bold text-sm text-red-700 dark:text-red-400">
                Cerrar sesión
              </span>
            </button>
          </div>

        </div>
      }
    </div>
  `,
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
    return c ? `linear-gradient(135deg,${c}f0,${c}90)` : 'linear-gradient(135deg,#92400e,#78350f)';
  });
  charImgSrc   = computed(() => {
    const t = this.charType(); const lvl = this.user()?.level ?? 1;
    return t ? charImagePath(t, levelToTier(lvl)) : '';
  });
  shieldSrc    = computed(() => { const t = this.charType(); return t ? charShieldPath(t) : ''; });
  tierName     = computed(() => TIER_NAMES[levelToTier(this.user()?.level ?? 1)]);
  xpNext       = computed(() => xpForNext(this.user()?.level ?? 1));
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

  toggle(e: Event)     { e.stopPropagation(); this.open.update(v => !v); }
  cycleTheme(e: Event) { e.stopPropagation(); this.themeService.cycleMode(); }
  logout()             { this.open.set(false); this.auth.logout(); }
  onImgError(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }

  @HostListener('document:click')
  onDocumentClick() { this.open.set(false); }
}
