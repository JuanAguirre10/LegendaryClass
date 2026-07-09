import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

interface QuestionDraft {
  uid: number;
  type: 'multiple_choice' | 'true_false' | 'open';
  text: string;
  options: string[];
  correctIndex: number;
  correctAnswer: 'true' | 'false';
  points: number;
}

@Component({
  selector: 'app-teacher-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" class="brand-logo"> <span class="hidden sm:inline">LegendaryClass</span></a>
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

              <!-- Constructor de formulario en línea -->
              <div class="sm:col-span-2 lg:col-span-3 mt-2 rounded-2xl border border-purple-200 dark:border-purple-900/50 p-4">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <p class="font-cinzel text-sm font-bold text-gray-700 dark:text-slate-200">📝 Formulario en línea (opcional)</p>
                  <button type="button" (click)="addQuestion()" class="btn-epic btn-blue text-xs py-1.5 px-4">➕ Agregar pregunta</button>
                </div>
                <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 mb-3">
                  Si agregas preguntas, los estudiantes responden en la plataforma. Sin preguntas abiertas, se califica automáticamente.
                </p>

                @if (questions.length > 0) {
                  <div class="mb-3">
                    <label class="block font-cinzel text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide mb-1">
                      Nota mínima para aprobar (%)
                    </label>
                    <input type="number" [(ngModel)]="newQuest.passingScore" min="0" max="100" class="input-epic text-sm w-32" />
                  </div>
                }

                @for (q of questions; track q.uid; let qi = $index) {
                  <div class="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 mb-3">
                    <div class="flex items-start gap-2 flex-wrap">
                      <span class="font-cinzel font-black text-purple-600 dark:text-purple-400 text-sm mt-2">{{ qi + 1 }}.</span>
                      <input [(ngModel)]="q.text" type="text" placeholder="Enunciado de la pregunta *"
                        class="input-epic text-sm flex-1 min-w-[200px]" />
                      <select [(ngModel)]="q.type" (ngModelChange)="onTypeChange(q)" class="input-epic text-sm">
                        <option value="multiple_choice">Opción múltiple</option>
                        <option value="true_false">Verdadero / Falso</option>
                        <option value="open">Abierta (revisión manual)</option>
                      </select>
                      <input [(ngModel)]="q.points" type="number" min="1" max="100" title="Puntos"
                        class="input-epic text-sm w-20" />
                      <button type="button" (click)="removeQuestion(qi)" title="Quitar pregunta"
                        class="text-red-400 hover:text-red-600 transition text-lg mt-1">🗑️</button>
                    </div>

                    @if (q.type === 'multiple_choice') {
                      <div class="mt-2 space-y-1.5 pl-6">
                        @for (opt of q.options; track $index; let oi = $index) {
                          <div class="flex items-center gap-2">
                            <input type="radio" [name]="'correct-' + q.uid" [checked]="q.correctIndex === oi"
                              (change)="q.correctIndex = oi" title="Marcar como correcta"
                              class="h-4 w-4 text-green-600 focus:ring-green-500">
                            <input [(ngModel)]="q.options[oi]" type="text"
                              [placeholder]="'Opción ' + (oi + 1)" class="input-epic text-sm flex-1" />
                            @if (q.options.length > 2) {
                              <button type="button" (click)="removeOption(q, oi)" class="text-gray-400 hover:text-red-500 transition">✕</button>
                            }
                          </div>
                        }
                        <button type="button" (click)="q.options.push('')" class="font-cinzel text-xs text-purple-600 dark:text-purple-400 hover:underline">
                          + opción
                        </button>
                        <p class="font-playfair text-[11px] text-gray-400 dark:text-slate-500">Marca con el círculo la opción correcta.</p>
                      </div>
                    } @else if (q.type === 'true_false') {
                      <div class="mt-2 pl-6 flex items-center gap-3">
                        <span class="font-cinzel text-xs font-bold text-gray-600 dark:text-slate-300 uppercase">Respuesta correcta:</span>
                        <select [(ngModel)]="q.correctAnswer" class="input-epic text-sm w-40">
                          <option value="true">Verdadero</option>
                          <option value="false">Falso</option>
                        </select>
                      </div>
                    } @else {
                      <p class="mt-2 pl-6 font-playfair text-xs text-amber-600 dark:text-amber-400">
                        ✍️ El profesor revisará esta respuesta manualmente.
                      </p>
                    }
                  </div>
                }
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
                    @if (q.questions?.length) {
                      <span class="font-cinzel text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:text-blue-400">
                        📝 {{ q.questions.length }} preguntas
                      </span>
                    }
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

  newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1, passingScore: 60 };
  questions: QuestionDraft[] = [];
  private nextUid = 1;

  addQuestion() {
    this.questions.push({ uid: this.nextUid++, type: 'multiple_choice', text: '', options: ['', ''], correctIndex: -1, correctAnswer: 'true', points: 10 });
  }

  removeQuestion(i: number) {
    this.questions.splice(i, 1);
  }

  removeOption(q: QuestionDraft, oi: number) {
    q.options.splice(oi, 1);
    if (q.correctIndex === oi) q.correctIndex = -1;
    else if (q.correctIndex > oi) q.correctIndex--;
  }

  onTypeChange(q: QuestionDraft) {
    if (q.type === 'multiple_choice' && q.options.length < 2) q.options = ['', ''];
    if (q.type === 'true_false' && q.correctAnswer !== 'false') q.correctAnswer = 'true';
  }

  private buildQuestionsPayload(): any[] | string {
    const payload: any[] = [];
    for (const [i, q] of this.questions.entries()) {
      const text = q.text.trim();
      if (!text) return `La pregunta ${i + 1} no tiene enunciado`;
      const item: any = { id: i + 1, type: q.type, text, points: Number(q.points) || 1 };
      if (q.type === 'multiple_choice') {
        const options = q.options.map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) return `La pregunta ${i + 1} necesita al menos 2 opciones`;
        const correct = q.options[q.correctIndex]?.trim();
        if (!correct) return `Marca la opción correcta de la pregunta ${i + 1}`;
        item.options = options;
        item.correctAnswer = correct;
      } else if (q.type === 'true_false') {
        item.correctAnswer = q.correctAnswer === 'false' ? 'false' : 'true';
      }
      payload.push(item);
    }
    return payload;
  }

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
    const body: any = {
      title: this.newQuest.title,
      classroomId: this.selectedClassroom,
      xpReward: Number(this.newQuest.xpReward) || 50,
    };
    if (this.newQuest.description) body.description = this.newQuest.description;
    if (this.newQuest.dueDate) body.dueDate = new Date(this.newQuest.dueDate).toISOString();
    body.requiresSubmission = this.newQuest.requiresSubmission;
    if (this.newQuest.requiresSubmission) {
      body.maxAttempts = Number(this.newQuest.maxAttempts) || 1;
      if (this.questions.length > 0) {
        const payload = this.buildQuestionsPayload();
        if (typeof payload === 'string') { this.showToast(payload, 'error', '❌'); return; }
        body.questions = payload;
        body.passingScore = Math.min(100, Math.max(0, Number(this.newQuest.passingScore) || 60));
      }
    }
    this.saving.set(true);

    this.http.post<any>(`${environment.apiUrl}/quests`, body).subscribe({
      next: (q) => {
        this.quests.update((list) => [q, ...list]);
        this.newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1, passingScore: 60 };
        this.questions = [];
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
