import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'lc-theme';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<ThemeMode>(
    this.isBrowser
      ? ((localStorage.getItem(this.STORAGE_KEY) as ThemeMode) ?? 'system')
      : 'system'
  );

  private readonly systemDark = signal(
    this.isBrowser ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );

  readonly isDark = computed(() => {
    const m = this.mode();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return this.systemDark();
  });

  constructor() {
    if (!this.isBrowser) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    if (this.isBrowser) localStorage.setItem(this.STORAGE_KEY, mode);
  }

  /** Toggles between dark and light only */
  cycleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }
}
