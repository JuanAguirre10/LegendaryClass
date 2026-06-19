import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-director-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl">👑 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic active">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/users"      class="nav-link-epic">👥 Usuarios</a>
        <a routerLink="/director/reports"    class="nav-link-epic">📊 Reportes</a>
      </div>
      <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <div class="z-content py-10 max-w-6xl mx-auto px-6">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">🏛️ Aulas</h1>
      <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">
        {{ classrooms().length }} aulas en la institución
      </p>
    </div>

    @if (loading()) {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-7xl mb-4 animate-float">🏛️</div>
        <p class="font-cinzel text-gray-500">Cargando aulas...</p>
      </div>
    } @else if (classrooms().length > 0) {
      <div class="adventure-card overflow-hidden animate-fade-in-up">
        <table class="w-full">
          <thead>
            <tr style="background: linear-gradient(135deg, rgba(88,28,135,0.08) 0%, rgba(124,58,237,0.05) 100%); border-bottom: 2px solid rgba(124,58,237,0.15);">
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Aula</th>
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Docente</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Código</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Estudiantes</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (c of classrooms(); track c.id) {
              <tr class="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-cinzel font-bold text-gray-800 text-sm">{{ c.name }}</span>
                  @if (c.subject) {
                    <span class="block font-playfair text-gray-400 text-xs">{{ c.subject }}</span>
                  }
                </td>
                <td class="px-5 py-4">
                  <span class="font-cinzel text-gray-600 text-sm">{{ c.teacher?.name ?? '—' }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-mono text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 tracking-widest">
                    {{ c.classCode }}
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel font-black text-purple-600 text-lg">{{ c._count?.students ?? 0 }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  @if (c.isActive) {
                    <span class="font-cinzel text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">Activa</span>
                  } @else {
                    <span class="font-cinzel text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Inactiva</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 opacity-70">🏛️</div>
        <p class="font-cinzel text-gray-500">No hay aulas registradas aún</p>
      </div>
    }
  </div>
  `,
})
export class DirectorClassroomsComponent implements OnInit {
  classrooms = signal<any[]>([]);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/director/classrooms`).subscribe({
      next: (res) => { this.classrooms.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
