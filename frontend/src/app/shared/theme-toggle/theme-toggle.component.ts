import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';

const ICONS: Record<ThemeMode, string> = {
  system: '💻',
  dark:   '🌙',
  light:  '☀️',
};
const LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  dark:   'Nocturno',
  light:  'Claro',
};

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="theme.cycleMode()"
      [title]="label()"
      class="flex items-center gap-1 px-2 py-1.5 rounded-lg font-cinzel text-xs font-semibold
             transition-all duration-300
             text-gray-600 hover:text-amber-600 hover:bg-amber-50
             dark:text-slate-300 dark:hover:text-amber-400 dark:hover:bg-slate-700"
      aria-label="Cambiar tema">
      <span class="text-base leading-none">{{ icon() }}</span>
    </button>
  `,
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {}
  icon()  { return ICONS[this.theme.mode()]; }
  label() { return LABELS[this.theme.mode()]; }
}
