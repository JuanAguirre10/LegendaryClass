import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-teacher-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl">📚 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic active">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/rewards"    class="nav-link-epic">🎁 Recompensas</a>
      </div>
      <a routerLink="/teacher/dashboard" class="btn-epic btn-blue text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <div class="z-content py-10 max-w-5xl mx-auto px-6">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">🏛️ Mis Aulas</h1>
        <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Gestiona tus dominios mágicos</p>
      </div>
      <button (click)="showCreate = !showCreate" class="btn-epic btn-green text-sm py-2 px-5">➕ Nueva Aula</button>
    </div>

    @if (showCreate) {
      <div class="legendary-card p-6 mb-6 grid grid-cols-2 gap-4">
        <input [(ngModel)]="newClass.name"        type="text" placeholder="Nombre del aula *"     class="input-epic col-span-2 text-sm" />
        <input [(ngModel)]="newClass.subject"     type="text" placeholder="Asignatura"             class="input-epic text-sm" />
        <input [(ngModel)]="newClass.gradeLevel"  type="text" placeholder="Grado"                  class="input-epic text-sm" />
        <input [(ngModel)]="newClass.description" type="text" placeholder="Descripción (opcional)" class="input-epic col-span-2 text-sm" />
        <div class="col-span-2 flex gap-3 justify-end">
          <button (click)="showCreate = false" class="font-cinzel text-gray-500 px-4 py-2 text-sm hover:text-gray-700 transition">Cancelar</button>
          <button (click)="createClassroom()" class="btn-epic btn-green text-sm py-2 px-6">Crear Aula</button>
        </div>
      </div>
    }

    @if (loading()) {
      <div class="glass-panel p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">🏛️</div>
        <p class="font-cinzel text-gray-500">Cargando aulas...</p>
      </div>
    } @else if (classrooms().length === 0) {
      <div class="legendary-card p-16 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 opacity-70">🏫</div>
        <h2 class="font-cinzel font-black text-2xl text-gray-700 mb-3">¡Aún no tienes aulas!</h2>
        <p class="font-playfair text-gray-500 mb-6">Crea tu primera aula para comenzar a gestionar estudiantes.</p>
        <button (click)="showCreate = true" class="btn-epic btn-green text-sm py-2 px-6">➕ Crear Primera Aula</button>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        @for (c of classrooms(); track c.id) {
          <a [routerLink]="[c.slug]" class="adventure-card p-5 block group animate-fade-in-up">
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style="background: linear-gradient(135deg,#3b82f6,#1d4ed8);">🏫</div>
              <div class="flex-1">
                <h3 class="font-cinzel font-black text-gray-800 text-lg group-hover:text-blue-700 transition">{{ c.name }}</h3>
                <p class="font-playfair text-sm text-gray-500">{{ c.subject }}{{ c.gradeLevel ? ' · ' + c.gradeLevel : '' }}</p>
                <p class="font-playfair text-xs text-gray-400 mt-1">
                  {{ c._count?.students ?? 0 }} estudiantes ·
                  Código: <span class="font-mono font-bold text-amber-600">{{ c.classCode }}</span>
                </p>
              </div>
              <span class="text-blue-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </a>
        }
      </div>
    }
  </div>
  `,
})
export class TeacherClassroomsComponent implements OnInit {
  classrooms = signal<any[]>([]);
  loading = signal(true);
  showCreate = false;
  newClass = { name: '', subject: '', gradeLevel: '', description: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/mine`).subscribe({
      next: (res) => { this.classrooms.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createClassroom() {
    if (!this.newClass.name) return;
    this.http.post(`${environment.apiUrl}/classrooms`, this.newClass).subscribe({
      next: () => { this.showCreate = false; this.newClass = { name: '', subject: '', gradeLevel: '', description: '' }; this.ngOnInit(); },
      error: (err) => alert(err.error?.message ?? 'Error'),
    });
  }
}
