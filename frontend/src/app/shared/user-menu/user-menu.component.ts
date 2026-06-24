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
    <div class="relative">

      <!-- ── Trigger ── -->
      <button
        (click)="toggle($event)"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl
               font-cinzel text-sm font-bold
               border-2 border-amber-400 dark:border-amber-500
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
        <div class="absolute right-0 top-full mt-2 z-[9999] rounded-2xl overflow-hidden animate-fade-in-up
                    bg-white dark:bg-slate-900
                    border-2 border-amber-400 dark:border-amber-500"
             style="width:280px; animation-duration:0.13s;
                    box-shadow: 0 0 0 1px rgba(251,191,36,0.25), 0 16px 48px rgba(0,0,0,0.25)">

          <!-- ── CHARACTER CARD (students) ── -->
          @if (charType()) {
            <div class="relative" [style.background]="charGradient()">
              <!-- glow -->
              <div class="absolute inset-0 opacity-25"
                   style="background:radial-gradient(ellipse at 75% 40%, white, transparent 60%)"></div>

              <div class="relative flex gap-0">

                <!-- Character image — full height left column -->
                <div class="flex-shrink-0 flex items-end justify-center"
                     style="width:90px; height:110px; overflow:hidden; position:relative">
                  <img [src]="charImgSrc()" [alt]="charInfo()?.name ?? ''"
                       (error)="onImgError($event)"
                       style="position:absolute; bottom:0; left:50%; transform:translateX(-50%);
                              height:105px; width:auto; object-fit:contain;
                              filter:drop-shadow(0 4px 12px rgba(0,0,0,0.4))" />
                </div>

                <!-- Info right column -->
                <div class="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-center gap-1">
                  <!-- Name -->
                  <p class="font-cinzel font-black text-white text-sm leading-tight drop-shadow">
                    {{ user()?.name }}
                  </p>
                  <!-- Race + tier -->
                  <p class="font-cinzel text-white/90 text-xs leading-tight">
                    {{ charInfo()?.icon }} {{ charInfo()?.name }}
                    &nbsp;<span class="text-white/60">{{ tierName() }}</span>
                  </p>
                  <!-- Level badge -->
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="inline-flex items-center justify-center
                                 bg-amber-400 text-slate-900 font-cinzel font-black text-xs
                                 rounded-full px-2 py-0.5 shadow">
                      Nv. {{ user()?.level ?? 1 }}
                    </span>
                  </div>
                  <!-- Gems -->
                  <div class="flex items-center gap-1 mt-0.5">
                    <span class="font-cinzel text-[11px] font-bold text-amber-300">💎</span>
                    <span class="font-cinzel text-sm font-black text-amber-300">
                      {{ user()?.points ?? 0 }}
                    </span>
                    <span class="font-cinzel text-[10px] text-white/50">pts</span>
                  </div>
                  <!-- XP bar -->
                  <div class="mt-1 w-full h-1.5 rounded-full overflow-hidden"
                       style="background:rgba(255,255,255,0.2)">
                    <div class="h-full rounded-full bg-amber-300 transition-all duration-500"
                         [style.width.%]="xpPercent()"></div>
                  </div>
                  <p class="font-cinzel text-[9px] text-white/50">
                    {{ user()?.experiencePoints ?? 0 }} / {{ xpNext() }} XP
                  </p>
                </div>
              </div>
            </div>

          } @else {
            <!-- Non-student header -->
            <div class="px-4 py-3 border-b-2 border-amber-400 dark:border-amber-500
                        bg-amber-50 dark:bg-slate-800">
              <!-- Gems row -->
              <div class="flex items-center gap-1.5 mb-2">
                <span class="font-cinzel text-base">💎</span>
                <span class="font-cinzel text-lg font-black text-amber-600 dark:text-amber-400">
                  {{ user()?.points ?? 0 }}
                </span>
                <span class="font-cinzel text-xs text-gray-400">pts</span>
              </div>
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
                <span class="font-cinzel font-bold text-sm text-indigo-900 dark:text-indigo-200 flex-1">
                  Mi Perfil
                </span>
                <span class="text-indigo-400 font-bold text-lg leading-none">›</span>
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                      bg-slate-50 dark:bg-slate-800
                      hover:bg-slate-100 dark:hover:bg-slate-700
                      transition-colors duration-100">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-slate-500 text-white flex-shrink-0 shadow-sm">⚙️</span>
              <span class="font-cinzel font-bold text-sm text-slate-800 dark:text-slate-100 flex-1">
                Configuración
              </span>
              <span class="text-slate-400 font-bold text-lg leading-none">›</span>
            </a>

            <button (click)="cycleTheme($event)"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left
                           bg-violet-50 dark:bg-violet-950/50
                           hover:bg-violet-100 dark:hover:bg-violet-900/50
                           transition-colors duration-100">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-violet-500 text-white flex-shrink-0 shadow-sm">{{ themeIcon() }}</span>
              <span class="font-cinzel font-bold text-sm text-violet-900 dark:text-violet-200 flex-1">
                Modo {{ themeLabel() }}
              </span>
              <span class="font-cinzel text-[10px] font-black px-2 py-0.5 rounded-full
                           bg-amber-400 text-amber-900">TAP</span>
            </button>

          </div>

          <!-- ── LOGOUT ── -->
          <div class="bg-white dark:bg-slate-900 pb-2 px-2
                      border-t border-amber-300 dark:border-amber-700/50">
            <button (click)="logout()"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left
                           bg-red-50 dark:bg-red-950/40
                           hover:bg-red-100 dark:hover:bg-red-900/40
                           transition-colors duration-100 mt-1.5">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base
                           bg-red-500 text-white flex-shrink-0 shadow-sm">🚪</span>
              <span class="font-cinzel font-bold text-sm text-red-700 dark:text-red-400 flex-1">
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
    const xp  = this.user()?.experiencePoints ?? 0;
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
