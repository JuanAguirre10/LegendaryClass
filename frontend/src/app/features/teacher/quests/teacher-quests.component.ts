import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-teacher-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl">📚 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"     class="nav-link-epic active">🗡️ Misiones</a>
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
    <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">🗡️ Misiones</h1>
        <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Crea misiones que dan XP a tus aventureros</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <select [(ngModel)]="selectedClassroom" (ngModelChange)="onClassroomChange()" class="input-epic text-sm">
          <option value="">-- Selecciona un aula --</option>
          @for (c of classrooms(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (selectedClassroom) {
          <button (click)="showCreate = !showCreate" class="btn-epic btn-green text-sm py-2 px-5 whitespace-nowrap">
            ➕ Nueva Misión
          </button>
        }
      </div>
    </div>

    @if (!selectedClassroom) {
      <div class="legendary-card p-16 text-center">
        <div class="text-8xl mb-4 opacity-70">🗡️</div>
        <p class="font-cinzel text-gray-500">Selecciona un aula para gestionar sus misiones</p>
      </div>
    } @else {

      @if (showCreate) {
        <div class="legendary-card p-6 mb-6 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 text-lg mb-4">🗡️ Crear Misión</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input [(ngModel)]="newQuest.title" type="text" placeholder="Título *"
              class="input-epic text-sm sm:col-span-2 lg:col-span-1" />
            <input [(ngModel)]="newQuest.xpReward" type="number" min="10" max="1000" placeholder="XP (10-1000)"
              class="input-epic text-sm" />
            <input [(ngModel)]="newQuest.dueDate" type="date"
              class="input-epic text-sm" />
            <input [(ngModel)]="newQuest.description" type="text" placeholder="Descripción (opcional)"
              class="input-epic text-sm sm:col-span-2 lg:col-span-3" />
          </div>
          <div class="flex gap-3 justify-end mt-4">
            <button (click)="showCreate = false"
              class="font-cinzel text-gray-500 px-4 py-2 text-sm hover:text-gray-700 transition">Cancelar</button>
            <button (click)="createQuest()" [disabled]="saving()" class="btn-epic btn-green text-sm py-2 px-6">
              {{ saving() ? '...' : 'Guardar' }}
            </button>
          </div>
        </div>
      }

      <h2 class="font-cinzel font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Misiones del Aula</h2>
      @if (loading()) {
        <div class="legendary-card p-8 text-center"><div class="text-5xl animate-float mb-3">🗡️</div></div>
      } @else if (quests().length === 0) {
        <div class="legendary-card p-12 text-center">
          <div class="text-6xl mb-4 opacity-70">🗡️</div>
          <p class="font-cinzel text-gray-500 mb-4">No hay misiones para esta aula</p>
          <button (click)="showCreate = true" class="btn-epic btn-green text-sm py-2 px-5">➕ Crear</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (q of quests(); track q.id) {
            <div class="adventure-card p-4 animate-fade-in-up" style="border-left:4px solid #16a34a;">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="font-cinzel font-bold text-gray-800 text-sm">{{ q.title }}</p>
                  @if (q.description) {
                    <p class="font-playfair text-xs text-gray-500 mt-1">{{ q.description }}</p>
                  }
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span class="font-cinzel text-amber-600 font-bold text-xs">✨ {{ q.xpReward }} XP</span>
                    <span class="font-cinzel text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {{ q.students?.length ?? 0 }} asignados
                    </span>
                    @if (q.dueDate) {
                      <span class="font-playfair text-[11px] text-gray-400">📅 {{ q.dueDate | date:'dd/MM/yyyy' }}</span>
                    }
                  </div>
                </div>
                <button (click)="deleteQuest(q)" title="Eliminar misión"
                  class="text-red-400 hover:text-red-600 transition flex-shrink-0 text-lg">🗑️</button>
              </div>
            </div>
          }
        </div>
      }
    }
  </div>
  `,
})
export class TeacherQuestsComponent implements OnInit {
  classrooms = signal<any[]>([]);
  quests     = signal<any[]>([]);
  loading    = signal(false);
  saving     = signal(false);
  selectedClassroom = '';
  showCreate = false;
  toasts     = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  newQuest = { title: '', description: '', xpReward: 50, dueDate: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/mine`).subscribe({
      next: (res) => this.classrooms.set(res),
    });
  }

  onClassroomChange() {
    if (!this.selectedClassroom) return;
    this.loadQuests();
  }

  loadQuests() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/quests/classroom/${this.selectedClassroom}`).subscribe({
      next: (res) => { this.quests.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createQuest() {
    if (!this.newQuest.title || this.saving()) return;
    this.saving.set(true);
    const body: any = {
      title: this.newQuest.title,
      classroomId: this.selectedClassroom,
      xpReward: Number(this.newQuest.xpReward) || 50,
    };
    if (this.newQuest.description) body.description = this.newQuest.description;
    if (this.newQuest.dueDate) body.dueDate = new Date(this.newQuest.dueDate).toISOString();

    this.http.post<any>(`${environment.apiUrl}/quests`, body).subscribe({
      next: (q) => {
        this.quests.update((list) => [q, ...list]);
        this.newQuest = { title: '', description: '', xpReward: 50, dueDate: '' };
        this.showCreate = false;
        this.showToast(`Misión "${q.title}" creada`, 'success', '🗡️');
        this.saving.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al crear la misión', 'error', '❌');
        this.saving.set(false);
      },
    });
  }

  deleteQuest(q: any) {
    this.http.delete(`${environment.apiUrl}/quests/${q.id}`).subscribe({
      next: () => {
        this.quests.update((list) => list.filter((x) => x.id !== q.id));
        this.showToast(`Misión "${q.title}" eliminada`, 'info', '🗑️');
      },
      error: (err) => this.showToast(err.error?.message ?? 'Error al eliminar', 'error', '❌'),
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success', icon = '🗡️') {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, icon, fadingOut: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, fadingOut: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 500);
    }, 4000);
  }
}
