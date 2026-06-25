import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

interface PendingSubmission {
  id:            string;
  questId:       string;
  studentId:     string;
  fileUrl:       string;
  fileName:      string;
  status:        'pending' | 'approved' | 'rejected';
  attemptNumber: number;
  teacherNotes:  string | null;
  submittedAt:   string;
  quest:  { id: string; title: string; classroomId: string; xpReward: number };
  student: { id: string; name: string; avatar: string | null };
}

@Component({
  selector: 'app-teacher-quest-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" style="height:36px;width:auto;vertical-align:middle;"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"          class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms"         class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"          class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"             class="nav-link-epic">🗡️ Misiones</a>
        <a routerLink="/teacher/quest-submissions"  routerLinkActive="active" class="nav-link-epic">📋 Entregas</a>
        <a routerLink="/teacher/rewards"            class="nav-link-epic">🎁 Recompensas</a>
        <a routerLink="/teacher/settings"           class="nav-link-epic">⚙️ Config</a>
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

  <div class="z-content py-6 md:py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📋 Bandeja de Entregas</h1>
        <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm mt-1">
          Revisa y aprueba las evidencias de tus estudiantes
        </p>
      </div>
      @if (submissions().length > 0) {
        <span class="font-cinzel font-black text-white text-lg px-5 py-2 rounded-full"
          style="background:linear-gradient(135deg,#7c3aed,#5b21b6);">
          {{ submissions().length }} pendientes
        </span>
      }
    </div>

    @if (loading()) {
      <div class="text-center py-16">
        <div class="text-8xl mb-4 animate-float">📋</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Cargando entregas...</p>
      </div>
    } @else if (submissions().length === 0) {
      <div class="legendary-card text-center py-16">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="font-cinzel font-bold text-xl text-gray-700 dark:text-slate-200 mb-2">
          Sin entregas pendientes
        </h3>
        <p class="font-playfair text-gray-500 dark:text-slate-400">
          Todos los envíos han sido revisados.
        </p>
      </div>
    } @else {
      <div class="space-y-4">
        @for (sub of submissions(); track sub.id) {
          <div class="legendary-card p-5 animate-fade-in-up">
            <div class="flex items-start gap-4 flex-wrap">

              <!-- Avatar -->
              @if (sub.student.avatar) {
                <img [src]="sub.student.avatar" alt="" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
              } @else {
                <div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <span class="font-cinzel font-black text-purple-700 dark:text-purple-400 text-lg">
                    {{ sub.student.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
              }

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-cinzel font-bold text-gray-800 dark:text-slate-100">
                  {{ sub.student.name }}
                </p>
                <p class="font-playfair text-sm text-gray-500 dark:text-slate-400">
                  Misión: <span class="font-semibold text-gray-700 dark:text-slate-300">{{ sub.quest.title }}</span>
                  · <span class="text-purple-600 dark:text-purple-400 font-bold">+{{ sub.quest.xpReward }} XP</span>
                </p>
                <p class="font-playfair text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Intento #{{ sub.attemptNumber }} · {{ sub.submittedAt | date:'d MMM yyyy, HH:mm' }}
                </p>
                <a [href]="apiBase + sub.fileUrl" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 mt-2 font-cinzel text-xs text-purple-600 dark:text-purple-400 hover:underline">
                  📎 Ver archivo: {{ sub.fileName }}
                </a>
              </div>

              <!-- Approve / Reject buttons -->
              <div class="flex flex-col gap-2 min-w-[180px]">
                @if (rejectingId() !== sub.id) {
                  <button (click)="approve(sub)"
                    [disabled]="processingId() === sub.id"
                    class="btn-epic btn-green text-xs py-2 px-4 disabled:opacity-50">
                    {{ processingId() === sub.id ? '⏳...' : '✅ Aprobar' }}
                  </button>
                  <button (click)="startReject(sub.id)"
                    class="btn-epic text-xs py-2 px-4"
                    style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;">
                    ❌ Rechazar
                  </button>
                }

                @if (rejectingId() === sub.id) {
                  <textarea
                    [(ngModel)]="rejectNote"
                    placeholder="Motivo del rechazo (obligatorio)"
                    rows="3"
                    class="input-epic text-xs resize-none"></textarea>
                  <div class="flex gap-2">
                    <button (click)="confirmReject(sub)"
                      [disabled]="!rejectNote.trim() || processingId() === sub.id"
                      class="flex-1 btn-epic text-xs py-2 disabled:opacity-50"
                      style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;">
                      Confirmar rechazo
                    </button>
                    <button (click)="cancelReject()"
                      class="btn-epic btn-blue text-xs py-2 px-3">
                      Cancelar
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  </div>
  `,
})
export class TeacherQuestSubmissionsComponent implements OnInit {
  submissions = signal<PendingSubmission[]>([]);
  loading     = signal(true);
  processingId = signal<string | null>(null);
  rejectingId  = signal<string | null>(null);
  rejectNote   = '';
  apiBase      = environment.apiUrl.replace('/api/v1', '');
  menuOpen     = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<PendingSubmission[]>(`${environment.apiUrl}/quests/submissions/pending`).subscribe({
      next: (res) => { this.submissions.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  approve(sub: PendingSubmission) {
    this.processingId.set(sub.id);
    this.http.patch(`${environment.apiUrl}/quests/submissions/${sub.id}/approve`, {}).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== sub.id));
        this.processingId.set(null);
      },
      error: () => this.processingId.set(null),
    });
  }

  startReject(id: string) {
    this.rejectingId.set(id);
    this.rejectNote = '';
  }

  cancelReject() {
    this.rejectingId.set(null);
    this.rejectNote = '';
  }

  confirmReject(sub: PendingSubmission) {
    if (!this.rejectNote.trim()) return;
    this.processingId.set(sub.id);
    this.http.patch(`${environment.apiUrl}/quests/submissions/${sub.id}/reject`, { teacherNotes: this.rejectNote }).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== sub.id));
        this.processingId.set(null);
        this.rejectingId.set(null);
        this.rejectNote = '';
      },
      error: () => this.processingId.set(null),
    });
  }
}
