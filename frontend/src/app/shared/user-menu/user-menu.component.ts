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
    <div class="relative flex items-stretch gap-0">

      <!-- ── Pastilla izquierda: 💎 puntos ── -->
      <div class="flex items-center gap-1.5 px-3 py-2
                  font-cinzel font-black text-sm
                  bg-amber-400/20 dark:bg-amber-500/20
                  border-2 border-r-0 border-amber-400 dark:border-amber-500
                  rounded-l-xl text-amber-800 dark:text-amber-300 select-none">
        <span class="text-base leading-none">💎</span>
        <span>{{ user()?.points ?? 0 }}</span>
      </div>

      <!-- ── Pastilla derecha: nombre + trigger ── -->
      <button
        (click)="toggle($event)"
        class="flex items-center gap-2 px-3 py-2
               font-cinzel text-sm font-bold
               border-2 border-amber-400 dark:border-amber-500
               rounded-r-xl text-gray-800 dark:text-slate-100
               transition-all duration-150 select-none"
        [ngClass]="open()
          ? 'bg-amber-300/40 dark:bg-amber-500/30'
          : 'bg-amber-400/10 dark:bg-amber-500/10 hover:bg-amber-300/30 dark:hover:bg-amber-500/20'"
        aria-haspopup="true"
        [attr.aria-expanded]="open()">
        @if (charType()) {
          <img [src]="shieldSrc()" alt=""
               class="w-6 h-6 object-contain flex-shrink-0"
               (error)="onImgError($event)" />
        }
        <!-- Nombre en dos líneas si es largo -->
        <span class="leading-tight text-left">{{ user()?.name }}</span>
        <span class="text-amber-600 dark:text-amber-400 font-black text-xs
                     transition-transform duration-200 flex-shrink-0"
              [class.rotate-180]="open()">▾</span>
      </button>

      <!-- ── Dropdown ── -->
      @if (open()) {
        <div class="absolute right-0 top-full mt-2 z-[9999] rounded-2xl overflow-hidden animate-fade-in-up
                    bg-white dark:bg-slate-900
                    border-2 border-amber-400 dark:border-amber-500"
             style="width:290px; animation-duration:0.13s;
                    box-shadow:0 0 0 1px rgba(251,191,36,0.3), 0 16px 48px rgba(0,0,0,0.28)">

          <!-- ── CHARACTER CARD ── -->
          @if (charType()) {
            <div class="relative flex" [style.background]="charGradient()" style="min-height:130px">
              <!-- Capa oscura para garantizar contraste en cualquier color de personaje -->
              <div class="absolute inset-0 pointer-events-none"
                   style="background:rgba(0,0,0,0.45)"></div>

              <!-- Imagen -->
              <div class="relative flex-shrink-0 z-10" style="width:100px; overflow:hidden">
                <img [src]="charImgSrc()" [alt]="charInfo()?.name ?? ''"
                     (error)="onImgError($event)"
                     style="position:absolute; bottom:0; left:50%; transform:translateX(-50%);
                            height:130px; width:auto; object-fit:contain;
                            filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6))" />
              </div>

              <!-- Info -->
              <div class="flex-1 py-3 pr-4 pl-2 flex flex-col justify-center gap-1.5 relative z-10">
                <!-- Nombre -->
                <p class="font-cinzel font-black leading-snug"
                   style="font-size:14px; word-break:break-word; color:#fff;
                          text-shadow:0 1px 4px rgba(0,0,0,0.9)">
                  {{ user()?.name }}
                </p>
                <!-- Raza · Tier -->
                <p class="font-cinzel text-xs leading-tight"
                   style="color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8)">
                  {{ charInfo()?.icon }} {{ charInfo()?.name }}
                  <span style="color:rgba(255,255,255,0.75)">&nbsp;· {{ tierName() }}</span>
                </p>
                <!-- Nivel -->
                <span class="self-start inline-flex items-center font-cinzel font-black text-xs rounded-full px-2.5 py-0.5"
                      style="background:#fbbf24; color:#1c1917; box-shadow:0 2px 6px rgba(0,0,0,0.4)">
                  Nv. {{ user()?.level ?? 1 }}
                </span>
                <!-- Gemas -->
                <div class="flex items-baseline gap-1">
                  <span style="font-size:16px; line-height:1">💎</span>
                  <span class="font-cinzel font-black"
                        style="font-size:20px; line-height:1; color:#fde68a;
                               text-shadow:0 1px 4px rgba(0,0,0,0.7)">
                    {{ user()?.points ?? 0 }}
                  </span>
                  <span class="font-cinzel text-xs" style="color:rgba(255,255,255,0.65)">pts</span>
                </div>
                <!-- XP bar -->
                <div class="w-full rounded-full overflow-hidden" style="height:5px; background:rgba(255,255,255,0.2)">
                  <div class="h-full rounded-full transition-all duration-500"
                       style="background:#fbbf24"
                       [style.width.%]="xpPercent()"></div>
                </div>
                <p class="font-cinzel" style="font-size:9px; color:rgba(255,255,255,0.6)">
                  {{ user()?.experiencePoints ?? 0 }} / {{ xpNext() }} XP
                </p>
              </div>
            </div>

          } @else {
            <div class="px-4 py-3 border-b-2 border-amber-400 dark:border-amber-500
                        bg-amber-50 dark:bg-slate-800">
              <div class="flex items-baseline gap-1.5 mb-1.5">
                <span style="font-size:16px">💎</span>
                <span class="font-cinzel font-black text-amber-600 dark:text-amber-400"
                      style="font-size:20px; line-height:1">{{ user()?.points ?? 0 }}</span>
                <span class="font-cinzel text-xs text-gray-400">pts</span>
              </div>
              <p class="font-cinzel font-black text-sm text-amber-800 dark:text-amber-300">
                {{ user()?.name }}
              </p>
              <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {{ user()?.email }}
              </p>
            </div>
          }

          <!-- ── ITEMS ── -->
          <div class="py-2 px-2 flex flex-col gap-1" style="background:#fff">

            @if (profileLink()) {
              <a [routerLink]="profileLink()" (click)="open.set(false)"
                 class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                 style="background:#eef2ff"
                 onmouseenter="this.style.background='#e0e7ff'"
                 onmouseleave="this.style.background='#eef2ff'">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base flex-shrink-0"
                      style="background:#6366f1;color:#fff">👤</span>
                <span class="font-cinzel font-bold text-sm flex-1" style="color:#1e1b4b">Mi Perfil</span>
                <span class="font-bold text-xl leading-none" style="color:#6366f1">›</span>
              </a>
            }

            <a [routerLink]="settingsLink()" (click)="open.set(false)"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
               style="background:#f1f5f9"
               onmouseenter="this.style.background='#e2e8f0'"
               onmouseleave="this.style.background='#f1f5f9'">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base flex-shrink-0"
                    style="background:#475569;color:#fff">⚙️</span>
              <span class="font-cinzel font-bold text-sm flex-1" style="color:#0f172a">Configuración</span>
              <span class="font-bold text-xl leading-none" style="color:#64748b">›</span>
            </a>

            <!-- Fila del tema: fondo violeta sólido, texto blanco -->
            <button (click)="cycleTheme($event)"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left transition-colors"
                    style="background:#7c3aed"
                    onmouseenter="this.style.background='#6d28d9'"
                    onmouseleave="this.style.background='#7c3aed'">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base flex-shrink-0"
                    style="background:rgba(255,255,255,0.2);color:#fff">{{ themeIcon() }}</span>
              <span class="font-cinzel font-bold text-sm flex-1" style="color:#fff">Modo {{ themeLabel() }}</span>
              <span class="font-cinzel font-black rounded-full px-2 py-0.5"
                    style="font-size:10px;background:#fbbf24;color:#78350f">TAP</span>
            </button>

          </div>

          <!-- ── LOGOUT ── -->
          <div class="pb-2 px-2" style="background:#fff;border-top:1px solid #fde68a">
            <button (click)="logout()"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer w-full text-left mt-1.5 transition-colors"
                    style="background:#fff1f2"
                    onmouseenter="this.style.background='#ffe4e6'"
                    onmouseleave="this.style.background='#fff1f2'">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-base flex-shrink-0"
                    style="background:#ef4444;color:#fff">🚪</span>
              <span class="font-cinzel font-bold text-sm flex-1" style="color:#991b1b">Cerrar sesión</span>
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
    return c ? `linear-gradient(135deg,${c}f0,${c}88)` : 'linear-gradient(135deg,#92400e,#78350f)';
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
