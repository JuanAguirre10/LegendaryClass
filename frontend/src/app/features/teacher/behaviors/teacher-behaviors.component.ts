import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-teacher-behaviors',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl">📚 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic active">⭐ Comportamientos</a>
        <a routerLink="/teacher/rewards"    class="nav-link-epic">🎁 Recompensas</a>
      </div>
      <a routerLink="/teacher/dashboard" class="btn-epic btn-blue text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <!-- Toasts -->
  <div class="toast-container">
    @for (t of toasts(); track t.id) {
      <div class="toast-message" [class]="'toast-message ' + t.type" [class.fade-out]="t.fadingOut">
        <span>{{ t.icon }}</span><span>{{ t.message }}</span>
      </div>
    }
  </div>

  <div class="z-content py-10 max-w-6xl mx-auto px-6">
    <!-- Header + selectors -->
    <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">⭐ Comportamientos</h1>
        <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Catálogo y asignación de puntos</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <select [(ngModel)]="selectedClassroom" (ngModelChange)="onClassroomChange()"
          class="input-epic text-sm">
          <option value="">-- Selecciona un aula --</option>
          @for (c of classrooms(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (selectedClassroom) {
          <button (click)="showCreate = !showCreate" class="btn-epic btn-green text-sm py-2 px-5 whitespace-nowrap">
            ➕ Nuevo Comportamiento
          </button>
        }
      </div>
    </div>

    @if (!selectedClassroom) {
      <div class="legendary-card p-16 text-center">
        <div class="text-8xl mb-4 opacity-70">⭐</div>
        <p class="font-cinzel text-gray-500">Selecciona un aula para gestionar sus comportamientos</p>
      </div>
    } @else {

      <!-- Formulario crear comportamiento -->
      @if (showCreate) {
        <div class="legendary-card p-6 mb-6 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 text-lg mb-4">⭐ Crear Comportamiento</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input [(ngModel)]="newBehavior.name" type="text" placeholder="Nombre *"
              class="input-epic text-sm sm:col-span-2 lg:col-span-1" />
            <select [(ngModel)]="newBehavior.type" class="input-epic text-sm">
              <option value="positive">✅ Positivo</option>
              <option value="negative">❌ Negativo</option>
            </select>
            <input [(ngModel)]="newBehavior.points" type="number" placeholder="Puntos (ej: 10 o -5)"
              class="input-epic text-sm" />
            <select [(ngModel)]="newBehavior.category" class="input-epic text-sm sm:col-span-2 lg:col-span-1">
              <option value="participation">Participación</option>
              <option value="homework">Tarea</option>
              <option value="behavior">Comportamiento</option>
              <option value="creativity">Creatividad</option>
              <option value="teamwork">Trabajo en equipo</option>
              <option value="punctuality">Puntualidad</option>
              <option value="respect">Respeto</option>
              <option value="effort">Esfuerzo</option>
            </select>
            <input [(ngModel)]="newBehavior.description" type="text" placeholder="Descripción (opcional)"
              class="input-epic text-sm sm:col-span-2" />
          </div>
          <div class="flex gap-3 justify-end mt-4">
            <button (click)="showCreate = false"
              class="font-cinzel text-gray-500 px-4 py-2 text-sm hover:text-gray-700 transition">Cancelar</button>
            <button (click)="createBehavior()" [disabled]="saving()"
              class="btn-epic btn-green text-sm py-2 px-6">
              {{ saving() ? '...' : 'Guardar' }}
            </button>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <!-- Catálogo de comportamientos (col-span-3) -->
        <div class="lg:col-span-3">
          <h2 class="font-cinzel font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Comportamientos del Aula</h2>
          @if (loading()) {
            <div class="legendary-card p-8 text-center"><div class="text-5xl animate-float mb-3">⭐</div></div>
          } @else if (behaviors().length === 0) {
            <div class="legendary-card p-12 text-center">
              <div class="text-6xl mb-4 opacity-70">⭐</div>
              <p class="font-cinzel text-gray-500 mb-4">No hay comportamientos para esta aula</p>
              <button (click)="showCreate = true" class="btn-epic btn-green text-sm py-2 px-5">➕ Crear</button>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (b of behaviors(); track b.id) {
                <div class="adventure-card p-4 animate-fade-in-up flex items-center gap-4"
                  [style.border-left]="'4px solid ' + (b.points > 0 ? '#16a34a' : '#dc2626')">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    [style.background]="b.points > 0 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'">
                    {{ b.points > 0 ? '✅' : '❌' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-cinzel font-bold text-gray-800 text-sm truncate">{{ b.name }}</p>
                    <p class="font-playfair text-xs text-gray-500 capitalize">{{ b.category }}</p>
                  </div>
                  <span class="font-cinzel font-black text-lg flex-shrink-0"
                    [class.text-green-600]="b.points > 0"
                    [class.text-red-600]="b.points < 0">
                    {{ b.points > 0 ? '+' : '' }}{{ b.points }}
                  </span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Awards recientes (col-span-2) -->
        <div class="lg:col-span-2">
          <h2 class="font-cinzel font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Asignaciones Recientes</h2>
          @if (awardsLoading()) {
            <div class="legendary-card p-8 text-center"><div class="text-4xl animate-float mb-2">📋</div></div>
          } @else if (recentAwards().length === 0) {
            <div class="legendary-card p-10 text-center">
              <div class="text-5xl mb-3 opacity-50">📋</div>
              <p class="font-cinzel text-gray-400 text-sm">Sin asignaciones recientes</p>
              <p class="font-playfair text-xs text-gray-400 mt-1">
                Ve al <a [routerLink]="'/teacher/classrooms'" class="text-blue-600 underline">detalle del aula</a> para asignar puntos
              </p>
            </div>
          } @else {
            <div class="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              @for (a of recentAwards(); track a.id) {
                <div class="legendary-card p-3 animate-fade-in-up flex items-center gap-3">
                  <div class="text-xl">{{ a.pointsAwarded > 0 ? '⭐' : '⚠️' }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-cinzel font-bold text-gray-800 text-xs truncate">{{ a.student?.name }}</p>
                    <p class="font-playfair text-[10px] text-gray-500 truncate">{{ a.behavior?.name }}</p>
                  </div>
                  <span class="font-cinzel font-black text-sm flex-shrink-0"
                    [class.text-green-600]="a.pointsAwarded > 0"
                    [class.text-red-600]="a.pointsAwarded < 0">
                    {{ a.pointsAwarded > 0 ? '+' : '' }}{{ a.pointsAwarded }}
                  </span>
                </div>
              }
            </div>
          }
        </div>

      </div>
    }
  </div>
  `,
})
export class TeacherBehaviorsComponent implements OnInit {
  classrooms    = signal<any[]>([]);
  behaviors     = signal<any[]>([]);
  recentAwards  = signal<any[]>([]);
  loading       = signal(false);
  awardsLoading = signal(false);
  saving        = signal(false);
  selectedClassroom = '';
  showCreate    = false;
  toasts        = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  newBehavior = { name: '', type: 'positive', points: 10, category: 'participation', description: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/mine`).subscribe({
      next: (res) => this.classrooms.set(res),
    });
  }

  onClassroomChange() {
    if (!this.selectedClassroom) return;
    this.loadBehaviors();
    this.loadRecentAwards();
  }

  loadBehaviors() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/behaviors/classroom/${this.selectedClassroom}`).subscribe({
      next: (res) => { this.behaviors.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadRecentAwards() {
    this.awardsLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/behaviors/student-behaviors/${this.selectedClassroom}`).subscribe({
      next: (res) => { this.recentAwards.set(res ?? []); this.awardsLoading.set(false); },
      error: () => this.awardsLoading.set(false),
    });
  }

  createBehavior() {
    if (!this.newBehavior.name || this.saving()) return;
    this.saving.set(true);
    const body = { ...this.newBehavior, classroomId: this.selectedClassroom };
    this.http.post<any>(`${environment.apiUrl}/behaviors`, body).subscribe({
      next: (b) => {
        this.behaviors.update((list) => [b, ...list]);
        this.newBehavior = { name: '', type: 'positive', points: 10, category: 'participation', description: '' };
        this.showCreate = false;
        this.showToast(`"${b.name}" creado`, 'success', '⭐');
        this.saving.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al crear', 'error', '❌');
        this.saving.set(false);
      },
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success', icon = '⭐') {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, icon, fadingOut: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, fadingOut: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 500);
    }, 4000);
  }
}
