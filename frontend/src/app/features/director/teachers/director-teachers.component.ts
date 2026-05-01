import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-director-teachers',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl">👑 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic active">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/reports"    class="nav-link-epic">📊 Reportes</a>
      </div>
      <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <div class="z-content py-10 max-w-5xl mx-auto px-6">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📚 Profesores</h1>
      <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Cuerpo docente de la institución</p>
    </div>

    @if (loading()) {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">📚</div>
        <p class="font-cinzel text-gray-500">Convocando a los maestros...</p>
      </div>
    } @else if (teachers().length > 0) {
      <div class="adventure-card overflow-hidden animate-fade-in-up">
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
              <tr class="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-lg">📚</div>
                    <span class="font-cinzel font-bold text-gray-800 text-sm">{{ t.name }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 font-playfair text-gray-500 text-sm">{{ t.email }}</td>
                <td class="px-5 py-4 text-center">
                  <span class="font-cinzel font-black text-purple-600 text-lg">{{ t._count?.taughtClassrooms ?? 0 }}</span>
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
        <p class="font-cinzel text-gray-500">No hay profesores registrados aún</p>
      </div>
    }
  </div>
  `,
})
export class DirectorTeachersComponent implements OnInit {
  teachers = signal<any[]>([]);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/director/teachers`).subscribe({
      next: (res) => { this.teachers.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
