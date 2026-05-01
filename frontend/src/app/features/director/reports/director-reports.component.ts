import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-director-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl">👑 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/reports"    class="nav-link-epic active">📊 Reportes</a>
      </div>
      <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <div class="z-content py-10 max-w-5xl mx-auto px-6">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📊 Reportes del Sistema</h1>
      <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Estadísticas globales de la institución</p>
    </div>

    @if (stats()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        @for (stat of [
          { icon: '⭐', label: 'Comportamientos Totales', value: stats().totalBehaviorsAwarded, color: 'text-green-600' },
          { icon: '🎁', label: 'Recompensas Canjeadas',   value: stats().totalRewardsRedeemed,  color: 'text-amber-600' },
          { icon: '📋', label: 'Comportamientos (30d)',   value: stats().monthly?.behaviors,    color: 'text-blue-600'  },
          { icon: '🧑‍🎓', label: 'Nuevos Estudiantes (30d)', value: stats().monthly?.newStudents, color: 'text-purple-600' }
        ]; track stat.label) {
          <div class="legendary-card p-6 text-center animate-fade-in-up">
            <div class="text-4xl mb-3">{{ stat.icon }}</div>
            <div class="font-cinzel font-black text-3xl mb-1" [class]="stat.color">{{ stat.value ?? 0 }}</div>
            <div class="font-cinzel text-xs text-gray-500 uppercase tracking-wide leading-tight">{{ stat.label }}</div>
          </div>
        }
      </div>

      <!-- Detalle mensual -->
      <div class="adventure-card p-6 animate-fade-in-up">
        <h2 class="font-cinzel font-black text-gray-800 text-lg mb-4">📅 Actividad de los Últimos 30 Días</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="legendary-card p-4">
            <p class="font-cinzel text-xs text-gray-500 uppercase tracking-wide mb-1">Comportamientos registrados</p>
            <p class="font-cinzel font-black text-2xl text-blue-600">{{ stats().monthly?.behaviors ?? 0 }}</p>
          </div>
          <div class="legendary-card p-4">
            <p class="font-cinzel text-xs text-gray-500 uppercase tracking-wide mb-1">Estudiantes nuevos</p>
            <p class="font-cinzel font-black text-2xl text-purple-600">{{ stats().monthly?.newStudents ?? 0 }}</p>
          </div>
        </div>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">📊</div>
        <p class="font-cinzel text-gray-500">Cargando estadísticas...</p>
      </div>
    }
  </div>
  `,
})
export class DirectorReportsComponent implements OnInit {
  stats = signal<any>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/director/stats`).subscribe({
      next: (res) => this.stats.set(res),
    });
  }
}
