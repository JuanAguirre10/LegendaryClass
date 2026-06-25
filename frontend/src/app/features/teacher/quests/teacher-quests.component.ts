import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-teacher-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" style="height:36px;width:auto;vertical-align:middle;"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"     class="nav-link-epic active">🗡️ Misiones</a>
        <a routerLink="/teacher/rewards"    class="nav-link-epic">🎁 Recompensas</a>
        <a routerLink="/teacher/settings"   class="nav-link-epic">⚙️ Config</a>
      </div>
      <div class="flex items-center gap-3">
        <app-theme-toggle />
        <a routerLink="/teacher/dashboard" class="btn-epic btn-blue text-xs py-2 px-4">← Dashboard</a>
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
          <a routerLink="/teacher/dashboard"          routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
          <a routerLink="/teacher/classrooms"         routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏛️ Aulas</a>
          <a routerLink="/teacher/behaviors"          routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">⭐ Comportamientos</a>
          <a routerLink="/teacher/quests"             routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🗡️ Misiones</a>
          <a routerLink="/teacher/quest-submissions"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📋 Entregas</a>
          <a routerLink="/teacher/rewards"            routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🎁 Recompensas</a>
          <a routerLink="/teacher/leaderboard"        routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Ranking</a>
        </div>
      </div>
    </div>
  }

  <!-- Toasts -->
  <div class="toast-container">
    @for (t of toasts(); track t.id) {
      <div class="toast-message" [class]="'toast-message ' + t.type" [class.fade-out]="t.fadingOut">
        <span>{{ t.icon }}</span><span>{{ t.message }}</span>
      </div>
    }
  </div>

  <div class="z-content py-6 md:py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">🗡️ Misiones</h1>
        <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm tracking-widest uppercase mt-1">Crea misiones que dan XP a tus aventureros</p>
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
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Selecciona un aula para gestionar sus misiones</p>
      </div>
    } @else {

      @if (showCreate) {
        <div class="legendary-card p-6 mb-6 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-lg mb-4">🗡️ Crear Misión</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input [(ngModel)]="newQuest.title" type="text" placeholder="Título *"
              class="input-epic text-sm sm:col-span-2 lg:col-span-1" />
            <input [(ngModel)]="newQuest.xpReward" type="number" min="10" max="1000" placeholder="XP (10-1000)"
              class="input-epic text-sm" />
            <input [(ngModel)]="newQuest.dueDate" type="date"
              class="input-epic text-sm" />
            <input [(ngModel)]="newQuest.description" type="text" placeholder="Descripción (opcional)"
              class="input-epic text-sm sm:col-span-2 lg:col-span-3" />

            <!-- requiresSubmission toggle -->
            <div class="flex items-center gap-3 mt-2 sm:col-span-2 lg:col-span-3">
              <input type="checkbox" id="requires-submission" [(ngModel)]="newQuest.requiresSubmission"
                class="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500">
              <label for="requires-submission" class="font-cinzel text-sm font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                Requiere entrega de evidencia
              </label>
            </div>

            <!-- maxAttempts — shown only when requiresSubmission is true -->
            @if (newQuest.requiresSubmission) {
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block font-cinzel text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Intentos permitidos (1–10)
                </label>
                <input type="number" [(ngModel)]="newQuest.maxAttempts" min="1" max="10"
                  class="input-epic" />
              </div>
            }
          </div>
          <div class="flex gap-3 justify-end mt-4">
            <button (click)="showCreate = false"
              class="font-cinzel text-gray-500 dark:text-slate-400 px-4 py-2 text-sm hover:text-gray-700 dark:hover:text-slate-200 transition">Cancelar</button>
            <button (click)="createQuest()" [disabled]="saving()" class="btn-epic btn-green text-sm py-2 px-6">
              {{ saving() ? '...' : 'Guardar' }}
            </button>
          </div>
        </div>
      }

      <h2 class="font-cinzel font-bold text-gray-700 dark:text-slate-200 text-sm uppercase tracking-wide mb-3">Misiones del Aula</h2>
      @if (loading()) {
        <div class="legendary-card p-8 text-center"><div class="text-5xl animate-float mb-3">🗡️</div></div>
      } @else if (quests().length === 0) {
        <div class="legendary-card p-12 text-center">
          <div class="text-6xl mb-4 opacity-70">🗡️</div>
          <p class="font-cinzel text-gray-500 dark:text-slate-400 mb-4">No hay misiones para esta aula</p>
          <button (click)="showCreate = true" class="btn-epic btn-green text-sm py-2 px-5">➕ Crear</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (q of quests(); track q.id) {
            <div class="adventure-card p-4 animate-fade-in-up" style="border-left:4px solid #16a34a;">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-sm">{{ q.title }}</p>
                  @if (q.description) {
                    <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 mt-1">{{ q.description }}</p>
                  }
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span class="font-cinzel text-amber-600 font-bold text-xs">✨ {{ q.xpReward }} XP</span>
                    <span class="font-cinzel text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:text-purple-400">
                      {{ q.students?.length ?? 0 }} asignados
                    </span>
                    @if (q.dueDate) {
                      <span class="font-playfair text-[11px] text-gray-400 dark:text-slate-500">📅 {{ q.dueDate | date:'dd/MM/yyyy' }}</span>
                    }
                  </div>
                </div>
                <button (click)="deleteQuest(q)" title="Eliminar misión"
                  class="text-red-400 hover:text-red-600 dark:text-red-400 transition flex-shrink-0 text-lg">🗑️</button>
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
  menuOpen   = false;
  toasts     = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1 };

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
    body.requiresSubmission = this.newQuest.requiresSubmission;
    if (this.newQuest.requiresSubmission) body.maxAttempts = this.newQuest.maxAttempts;

    this.http.post<any>(`${environment.apiUrl}/quests`, body).subscribe({
      next: (q) => {
        this.quests.update((list) => [q, ...list]);
        this.newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1 };
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
