import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-director-reports',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" style="height:36px;width:auto;vertical-align:middle;"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/users"      class="nav-link-epic">👥 Usuarios</a>
        <a routerLink="/director/reports"    class="nav-link-epic active">📊 Reportes</a>
        <a routerLink="/director/settings" routerLinkActive="active" class="nav-link-epic">⚙️ Config</a>
      </div>
      <div class="flex items-center gap-3">
        <app-theme-toggle />
        <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
        <!-- Hamburger — mobile only -->
        <button class="md:hidden flex flex-col justify-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors"
                (click)="menuOpen = !menuOpen" aria-label="Abrir menú">
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
        </button>
      </div>
    </div>
  </nav>

  @if (menuOpen) {
    <div class="fixed inset-0 z-50 md:hidden" (click)="menuOpen = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="absolute top-0 left-0 right-0 legendary-nav shadow-2xl p-4 pt-3"
           (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <span class="legendary-logo text-lg">LegendaryClass</span>
          <button (click)="menuOpen = false"
                  class="text-2xl font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Cerrar menú">✕</button>
        </div>
        <div class="flex flex-col gap-1">
          <a routerLink="/director/dashboard"   routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
          <a routerLink="/director/classrooms"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏛️ Aulas</a>
          <a routerLink="/director/teachers"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👩‍🏫 Profesores</a>
          <a routerLink="/director/students"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🎓 Estudiantes</a>
          <a routerLink="/director/users"       routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👥 Usuarios</a>
          <a routerLink="/director/reports"     routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📊 Reportes</a>
          <a routerLink="/director/leaderboard" routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Ranking</a>
        </div>
      </div>
    </div>
  }

  <div class="z-content py-6 md:py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📊 Reportes del Sistema</h1>
      <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm tracking-widest uppercase mt-1">Estadísticas globales de la institución</p>
    </div>

    @if (stats()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        @for (stat of [
          { icon: '⭐', label: 'Comportamientos Totales', value: stats().totalBehaviorsAwarded, color: 'text-green-600 dark:text-green-400' },
          { icon: '🎁', label: 'Recompensas Canjeadas',   value: stats().totalRewardsRedeemed,  color: 'text-amber-600' },
          { icon: '📋', label: 'Comportamientos (30d)',   value: stats().monthly?.behaviors,    color: 'text-blue-600 dark:text-blue-400'  },
          { icon: '🧑‍🎓', label: 'Nuevos Estudiantes (30d)', value: stats().monthly?.newStudents, color: 'text-purple-600 dark:text-purple-400' }
        ]; track stat.label) {
          <div class="legendary-card p-6 text-center animate-fade-in-up">
            <div class="text-4xl mb-3">{{ stat.icon }}</div>
            <div class="font-cinzel font-black text-3xl mb-1" [class]="stat.color">{{ stat.value ?? 0 }}</div>
            <div class="font-cinzel text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide leading-tight">{{ stat.label }}</div>
          </div>
        }
      </div>

      <!-- Detalle mensual -->
      <div class="adventure-card p-6 animate-fade-in-up">
        <h2 class="font-cinzel font-black text-gray-800 dark:text-slate-100 text-lg mb-4">📅 Actividad de los Últimos 30 Días</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="legendary-card p-4">
            <p class="font-cinzel text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Comportamientos registrados</p>
            <p class="font-cinzel font-black text-2xl text-blue-600 dark:text-blue-400">{{ stats().monthly?.behaviors ?? 0 }}</p>
          </div>
          <div class="legendary-card p-4">
            <p class="font-cinzel text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Estudiantes nuevos</p>
            <p class="font-cinzel font-black text-2xl text-purple-600 dark:text-purple-400">{{ stats().monthly?.newStudents ?? 0 }}</p>
          </div>
        </div>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">📊</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Cargando estadísticas...</p>
      </div>
    }
  </div>
  `,
})
export class DirectorReportsComponent implements OnInit {
  stats = signal<any>(null);
  menuOpen = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/director/stats`).subscribe({
      next: (res) => this.stats.set(res),
    });
  }
}
