import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-director-teachers',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" class="brand-logo"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic active">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/users"      class="nav-link-epic">👥 Usuarios</a>
        <a routerLink="/director/reports"    class="nav-link-epic">📊 Reportes</a>
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
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📚 Profesores</h1>
      <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm tracking-widest uppercase mt-1">Cuerpo docente de la institución</p>
    </div>

    @if (loading()) {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">📚</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Convocando a los maestros...</p>
      </div>
    } @else if (teachers().length > 0) {
      <div class="adventure-card overflow-x-auto animate-fade-in-up">
        <table class="w-full">
          <thead>
            <tr style="background: linear-gradient(135deg, rgba(88,28,135,0.08) 0%, rgba(124,58,237,0.05) 100%); border-bottom: 2px solid rgba(124,58,237,0.15);">
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Maestro</th>
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Correo</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Aulas</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (t of teachers(); track t.id) {
              <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-purple-50/30 transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-purple-100 dark:bg-slate-700 flex items-center justify-center text-lg">📚</div>
                    <span class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-sm">{{ t.name }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 font-playfair text-gray-500 dark:text-slate-400 text-sm">{{ t.email }}</td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel font-black text-purple-600 dark:text-purple-400 text-lg">{{ t._count?.taughtClassrooms ?? 0 }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel text-xs font-bold px-3 py-1 rounded-full"
                    [class.bg-green-100]="t.isActive" [class.text-green-700]="t.isActive"
                    [class.bg-red-100]="!t.isActive"  [class.text-red-700]="!t.isActive">
                    {{ t.isActive ? '✓ Activo' : '✗ Inactivo' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 opacity-70">📚</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">No hay profesores registrados aún</p>
      </div>
    }
  </div>
  `,
})
export class DirectorTeachersComponent implements OnInit {
  teachers = signal<any[]>([]);
  loading = signal(true);
  menuOpen = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/director/teachers`).subscribe({
      next: (res) => { this.teachers.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
