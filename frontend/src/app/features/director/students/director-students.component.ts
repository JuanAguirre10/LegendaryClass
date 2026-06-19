import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-director-students',
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
        <a routerLink="/director/students"   class="nav-link-epic active">⚔️ Estudiantes</a>
        <a routerLink="/director/users"      class="nav-link-epic">👥 Usuarios</a>
        <a routerLink="/director/reports"    class="nav-link-epic">📊 Reportes</a>
      </div>
      <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <div class="z-content py-10 max-w-6xl mx-auto px-6">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">⚔️ Estudiantes</h1>
      <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">
        {{ students().length }} aventureros registrados en la institución
      </p>
    </div>

    @if (students().length > 0) {
      <div class="adventure-card overflow-hidden animate-fade-in-up">
        <table class="w-full">
          <thead>
            <tr style="background: linear-gradient(135deg, rgba(88,28,135,0.08) 0%, rgba(124,58,237,0.05) 100%); border-bottom: 2px solid rgba(124,58,237,0.15);">
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Aventurero</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Personaje</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Nivel</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">XP Total</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Puntos</th>
            </tr>
          </thead>
          <tbody>
            @for (s of students(); track s.id) {
              <tr class="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-cinzel font-bold text-gray-800 text-sm">{{ s.name }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel text-sm px-2 py-1 rounded-full bg-purple-50 text-purple-700 capitalize">
                    {{ charEmoji(s.characterType) }} {{ s.characterType ?? '—' }}
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel font-black text-purple-600 text-lg">{{ s.level }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel text-amber-600 font-bold text-sm">{{ s.experiencePoints }} XP</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel text-green-600 font-bold text-sm">{{ s.points }} pts</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 opacity-70">⚔️</div>
        <p class="font-cinzel text-gray-500">No hay estudiantes registrados aún</p>
      </div>
    }
  </div>
  `,
})
export class DirectorStudentsComponent implements OnInit {
  students = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/director/students`).subscribe({
      next: (res) => this.students.set(res.data),
    });
  }

  charEmoji(type: string): string {
    const map: Record<string, string> = {
      mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
    };
    return map[type?.toLowerCase()] ?? '🧑‍🎓';
  }
}
