import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'lc-theme';

  readonly mode = signal<ThemeMode>(
    (localStorage.getItem(this.STORAGE_KEY) as ThemeMode) ?? 'system'
  );

  private readonly systemDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  readonly isDark = computed(() => {
    const m = this.mode();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return this.systemDark();
  });

  constructor() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => this.systemDark.set(e.matches));

    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }

  /** Cycles: system → dark → light → system */
  cycleMode(): void {
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'dark',
      dark:   'light',
      light:  'system',
    };
    this.setMode(next[this.mode()]);
  }
}
