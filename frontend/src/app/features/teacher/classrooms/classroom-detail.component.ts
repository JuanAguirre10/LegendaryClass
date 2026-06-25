import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ClassroomRankingComponent } from '../../shared/classroom-ranking/classroom-ranking.component';
import { ExportService } from '../../../core/export/export.service';
import { AvatarUploadComponent } from '../../../shared/avatar-upload/avatar-upload.component';
import { MathPipe } from '../../../shared/math/math.pipe';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-teacher-classroom-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, ClassroomRankingComponent, AvatarUploadComponent, MathPipe, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" style="height:36px;width:auto;vertical-align:middle;"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic active">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"     class="nav-link-epic">🗡️ Misiones</a>
        <a routerLink="/teacher/rewards"    class="nav-link-epic">🎁 Recompensas</a>
        <a routerLink="/teacher/settings"   class="nav-link-epic">⚙️ Config</a>
      </div>
      <div class="flex items-center gap-3">
        <app-theme-toggle />
        <a routerLink="/teacher/classrooms" class="btn-epic btn-blue text-xs py-2 px-4">← Mis Aulas</a>
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

  <!-- Toast container -->
  <div class="toast-container">
    @for (t of toasts(); track t.id) {
      <div class="toast-message" [class]="'toast-message ' + t.type" [class.fade-out]="t.fadingOut">
        <span>{{ t.icon }}</span><span>{{ t.message }}</span>
      </div>
    }
  </div>

  <div class="z-content py-6 md:py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    @if (loading()) {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 animate-float">🏛️</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Cargando aula...</p>
      </div>
    } @else if (classroom()) {

      <!-- Header del aula -->
      <div class="rounded-3xl p-8 mb-8 animate-fade-in-up"
        style="background: linear-gradient(135deg,rgba(15,23,42,0.97) 0%,rgba(30,64,175,0.95) 40%,rgba(59,130,246,0.92) 70%,rgba(30,64,175,0.95) 100%);
               border: 3px solid rgba(59,130,246,0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 class="font-cinzel font-black text-white text-3xl mb-2">{{ classroom().name }}</h1>
            <p class="font-cinzel text-blue-200 text-sm mb-1">
              {{ classroom().subject }}
              @if (classroom().gradeLevel) { · <span>{{ classroom().gradeLevel }}</span> }
            </p>
            <p class="font-playfair text-blue-300/60 text-xs">
              Código de acceso: <span class="font-mono font-bold text-amber-400">{{ classroom().classCode }}</span>
              <button (click)="regenerateCode()" [disabled]="regenerating()" title="Generar un nuevo código"
                class="ml-2 font-cinzel text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-amber-300 hover:bg-white/20 transition disabled:opacity-50">
                {{ regenerating() ? '...' : '🔄 Regenerar' }}
              </button>
            </p>
            <div class="mt-3">
              <app-avatar-upload [uploadPath]="'/classrooms/' + classroom().slug + '/avatar'"
                [currentAvatar]="classroom().avatar" (uploaded)="onClassroomAvatarUploaded($event)" />
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <button (click)="exportExcel()" class="btn-epic btn-blue text-xs py-2 px-5 whitespace-nowrap">📊 Exportar a Excel</button>
            <button (click)="showNewBehaviorForm = !showNewBehaviorForm"
              class="btn-epic btn-gold text-xs py-2 px-5 whitespace-nowrap">
              ➕ Nuevo Comportamiento
            </button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        @for (stat of [
          { icon: '👥', label: 'Estudiantes',      value: classroom().students?.length ?? 0,    color: 'text-blue-600' },
          { icon: '⭐', label: 'Comportamientos',  value: classroom().behaviors?.length ?? 0,   color: 'text-amber-600' },
          { icon: '🗡️', label: 'Misiones',         value: classroom().quests?.length ?? 0,      color: 'text-green-600' },
          { icon: '🎁', label: 'Recompensas',      value: classroom().rewards?.length ?? 0,     color: 'text-purple-600' }
        ]; track stat.label) {
          <div class="legendary-card p-4 text-center animate-fade-in-up">
            <div class="text-3xl mb-1">{{ stat.icon }}</div>
            <div class="font-cinzel font-black text-2xl mb-0.5" [class]="stat.color">{{ stat.value }}</div>
            <div class="font-cinzel text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{{ stat.label }}</div>
          </div>
        }
      </div>

      <!-- Formulario nuevo comportamiento -->
      @if (showNewBehaviorForm) {
        <div class="legendary-card p-6 mb-6 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-lg mb-4">⭐ Crear Comportamiento</h3>
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
            <button (click)="showNewBehaviorForm = false"
              class="font-cinzel text-gray-500 dark:text-slate-400 px-4 py-2 text-sm hover:text-gray-700 dark:hover:text-slate-200 transition">Cancelar</button>
            <button (click)="createBehavior()" [disabled]="savingBehavior()"
              class="btn-epic btn-green text-sm py-2 px-6">
              {{ savingBehavior() ? '...' : 'Guardar Comportamiento' }}
            </button>
          </div>
        </div>
      }

      <!-- Tab navigation -->
      <div class="flex gap-1 border-b border-gray-200 dark:border-slate-700 mb-6">
        <button (click)="activeTab.set('students')"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class.border-b-2]="activeTab() === 'students'"
          [class.border-blue-600]="activeTab() === 'students'"
          [class.text-blue-600]="activeTab() === 'students'"
          [class.text-gray-500]="activeTab() !== 'students'">
          ⚔️ Aventureros
        </button>
        <button (click)="activeTab.set('behaviors')"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class.border-b-2]="activeTab() === 'behaviors'"
          [class.border-blue-600]="activeTab() === 'behaviors'"
          [class.text-blue-600]="activeTab() === 'behaviors'"
          [class.text-gray-500]="activeTab() !== 'behaviors'">
          ⭐ Comportamientos
        </button>
        <button (click)="activeTab.set('activities')"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class.border-b-2]="activeTab() === 'activities'"
          [class.border-purple-600]="activeTab() === 'activities'"
          [class.text-purple-600]="activeTab() === 'activities'"
          [class.text-gray-500]="activeTab() !== 'activities'">
          📋 Actividades
        </button>
      </div>

      <!-- Tab: Aventureros (students) -->
      @if (activeTab() === 'students') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          <!-- Lista de estudiantes (col-span-2) -->
          <div class="lg:col-span-2">
            <div class="adventure-card overflow-hidden animate-fade-in-up">
              <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h2 class="font-cinzel font-black text-gray-800 dark:text-slate-100 text-lg">⚔️ Aventureros</h2>
                <span class="font-cinzel text-xs text-gray-400 dark:text-slate-500">Clic en un estudiante para asignar puntos</span>
              </div>

              @if ((classroom().students?.length ?? 0) === 0) {
                <div class="p-10 text-center">
                  <div class="text-6xl mb-4 opacity-70">👥</div>
                  <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm">Aún no hay estudiantes en esta aula</p>
                  <p class="font-playfair text-gray-400 dark:text-slate-500 text-xs mt-2">Comparte el código <span class="font-mono font-bold text-amber-500">{{ classroom().classCode }}</span></p>
                </div>
              } @else {
                <div class="divide-y divide-gray-100 dark:divide-slate-700">
                  @for (enrollment of classroom().students; track enrollment.studentId) {
                    <div>
                      <!-- Fila del estudiante -->
                      <div class="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/30 transition-colors cursor-pointer"
                        (click)="toggleAward(enrollment.student.id)" (keyup.enter)="toggleAward(enrollment.student.id)"
                        tabindex="0" role="button">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                          style="background: linear-gradient(135deg,#3b82f6,#1d4ed8);">
                          {{ charEmoji(enrollment.student?.characterType) }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-sm truncate">{{ enrollment.student?.name }}</div>
                          <div class="font-playfair text-xs text-gray-500 dark:text-slate-400 capitalize">
                            {{ enrollment.student?.characterType ?? 'Sin clase' }} · Nv.{{ enrollment.student?.level ?? 1 }}
                          </div>
                        </div>
                        <!-- Puntos del aula -->
                        <div class="text-right flex-shrink-0">
                          <div class="font-cinzel font-black text-green-600 text-base">{{ getStudentPoints(enrollment.student.id) }}</div>
                          <div class="font-cinzel text-xs text-gray-400 dark:text-slate-500">pts aula</div>
                        </div>
                        <!-- XP global -->
                        <div class="text-right flex-shrink-0 hidden sm:block">
                          <div class="font-cinzel font-bold text-amber-600 text-sm">{{ enrollment.student?.experiencePoints ?? 0 }}</div>
                          <div class="font-cinzel text-xs text-gray-400 dark:text-slate-500">XP total</div>
                        </div>
                        <!-- Toggle icon -->
                        <div class="text-gray-400 dark:text-slate-500 text-sm flex-shrink-0">
                          {{ awardingTo() === enrollment.student.id ? '▲' : '▼' }}
                        </div>
                      </div>

                      <!-- Panel de asignación expandible -->
                      @if (awardingTo() === enrollment.student.id) {
                        <div class="px-5 py-4 animate-fade-in-up"
                          style="background: rgba(239,246,255,0.8); border-top: 1px solid rgba(59,130,246,0.15);">
                          <p class="font-cinzel text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                            Asignar comportamiento a {{ enrollment.student?.name }}
                          </p>
                          @if ((classroom().behaviors?.length ?? 0) === 0) {
                            <p class="font-playfair text-xs text-gray-500 dark:text-slate-400 mb-3">
                              No hay comportamientos en esta aula.
                              <button (click)="showNewBehaviorForm = true; awardingTo.set(null)"
                                class="text-blue-600 underline">Crear uno</button>
                            </p>
                          } @else {
                            <div class="flex flex-wrap gap-2 mb-3">
                              @for (b of classroom().behaviors; track b.id) {
                                <button (click)="selectedBehavior.set(b.id)"
                                  class="font-cinzel text-xs px-3 py-2 rounded-xl border-2 transition-all"
                                  [style.borderColor]="selectedBehavior() === b.id ? (b.points > 0 ? '#16a34a' : '#dc2626') : 'transparent'"
                                  [style.background]="selectedBehavior() === b.id
                                    ? (b.points > 0 ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)')
                                    : 'rgba(255,255,255,0.8)'">
                                  {{ b.points > 0 ? '✅' : '❌' }}
                                  {{ b.name }}
                                  <span class="font-black ml-1" [class.text-green-600]="b.points > 0" [class.text-red-600]="b.points < 0">
                                    {{ b.points > 0 ? '+' : '' }}{{ b.points }}
                                  </span>
                                </button>
                              }
                            </div>
                            <div class="flex items-center gap-3">
                              <input [(ngModel)]="awardNotes" type="text" placeholder="Nota (opcional)"
                                class="input-epic text-xs flex-1 py-2" />
                              <button (click)="awardBehavior(enrollment.student.id)"
                                [disabled]="!selectedBehavior() || awarding()"
                                class="btn-epic btn-green text-xs py-2 px-5 whitespace-nowrap"
                                [style.opacity]="!selectedBehavior() ? '0.5' : '1'">
                                {{ awarding() ? '...' : '⭐ Asignar' }}
                              </button>
                            </div>
                          }

                          <!-- Ajuste manual de puntos -->
                          <div class="mt-4 pt-3 border-t border-blue-200/50">
                            <p class="font-cinzel text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                              Ajuste manual de puntos
                            </p>
                            <div class="flex items-center gap-3">
                              <input [(ngModel)]="adjustValue" type="number" placeholder="Puntos (ej: 50 o -20)"
                                class="input-epic text-xs py-2" style="max-width:160px;" />
                              <input [(ngModel)]="adjustNotes" type="text" placeholder="Motivo (opcional)"
                                class="input-epic text-xs flex-1 py-2" />
                              <button (click)="adjustPoints(enrollment.student.id)"
                                [disabled]="!adjustValue || adjusting()"
                                class="btn-epic btn-gold text-xs py-2 px-5 whitespace-nowrap"
                                [style.opacity]="!adjustValue ? '0.5' : '1'">
                                {{ adjusting() ? '...' : '⚖️ Ajustar' }}
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Ranking lateral -->
          <div>
            <app-classroom-ranking [classroomId]="classroom().id" />
          </div>

        </div>
      }

      <!-- Tab: Comportamientos -->
      @if (activeTab() === 'behaviors') {
        <div class="legendary-card p-5 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span>⭐</span> Comportamientos del aula
          </h3>
          @if ((classroom().behaviors?.length ?? 0) === 0) {
            <div class="text-center py-6">
              <div class="text-5xl mb-3 opacity-50">📋</div>
              <p class="font-cinzel text-gray-500 dark:text-slate-400 text-xs">Sin comportamientos</p>
              <button (click)="showNewBehaviorForm = true; activeTab.set('students')"
                class="mt-3 btn-epic btn-green text-xs py-2 px-4">➕ Crear</button>
            </div>
          } @else {
            <div class="space-y-2">
              @for (b of classroom().behaviors; track b.id) {
                <div class="flex items-center justify-between p-2 rounded-xl"
                  style="background: rgba(248,250,252,0.8); border: 1px solid rgba(226,232,240,0.8);">
                  <div class="flex-1 min-w-0">
                    <p class="font-cinzel text-xs font-bold text-gray-700 dark:text-slate-200 truncate">{{ b.name }}</p>
                    <p class="font-playfair text-[10px] text-gray-400 dark:text-slate-500 capitalize">{{ b.category }}</p>
                  </div>
                  <span class="font-cinzel font-black text-sm ml-2"
                    [class.text-green-600]="b.points > 0"
                    [class.text-red-600]="b.points < 0">
                    {{ b.points > 0 ? '+' : '' }}{{ b.points }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Tab: Actividades -->
      @if (activeTab() === 'activities') {
        <div class="space-y-3 animate-fade-in-up">
          <div class="flex justify-end">
            @if (classroom()?.courseId) {
              <a [routerLink]="['/teacher/courses', classroom()?.courseId, 'templates']"
                class="text-sm text-purple-600 hover:underline">+ Importar del banco</a>
            }
          </div>
          @for (act of activities(); track act.id) {
            <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span class="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">{{ act.activityType }}</span>
                <p class="font-medium text-gray-900 dark:text-slate-50 mt-0.5" [innerHTML]="(act.overrides?.title ?? '(sin título)') | math"></p>
                @if (act.dueDate) {
                  <p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Fecha límite: {{ act.dueDate | date:'dd/MM/yyyy' }}</p>
                }
              </div>
              <button (click)="removeActivity(act.id)"
                class="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>
          }
          @if (activities().length === 0) {
            <p class="text-center text-gray-400 dark:text-slate-500 py-10">No hay actividades en este salón. Importa del banco.</p>
          }
        </div>
      }

    } @else {
      <div class="legendary-card p-12 text-center animate-fade-in-up">
        <div class="text-8xl mb-6 opacity-70">🏛️</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Aula no encontrada</p>
        <a routerLink="/teacher/classrooms" class="btn-epic btn-blue text-sm mt-4 inline-block">← Volver a Aulas</a>
      </div>
    }
  </div>
  `,
})
export class TeacherClassroomDetailComponent implements OnInit {
  @Input() slug!: string;
  classroom = signal<any>(null);
  loading = signal(true);
  menuOpen = false;
  activeTab = signal<'students' | 'behaviors' | 'activities'>('students');
  activities = signal<any[]>([]);
  awardingTo = signal<string | null>(null);
  selectedBehavior = signal<string>('');
  awarding = signal(false);
  savingBehavior = signal(false);
  regenerating = signal(false);
  adjusting = signal(false);
  awardNotes = '';
  adjustValue: number | null = null;
  adjustNotes = '';
  showNewBehaviorForm = false;
  toasts = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  newBehavior = { name: '', type: 'positive', points: 10, category: 'participation', description: '' };

  constructor(private http: HttpClient, private exportService: ExportService) {}

  ngOnInit() {
    this.loadClassroom();
  }

  exportExcel() {
    const c = this.classroom();
    if (!c) return;
    this.exportService.downloadFile(`/export/classroom/${c.id}`, `aula-${c.slug}.xlsx`);
  }

  loadClassroom() {
    this.loading.set(true);
    this.http.get(`${environment.apiUrl}/classrooms/${this.slug}`).subscribe({
      next: (res) => {
        this.classroom.set(res);
        this.loading.set(false);
        this.loadActivities(this.slug);
      },
      error: () => this.loading.set(false),
    });
  }

  loadActivities(slug: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/${slug}/activities`).subscribe({
      next: (data) => this.activities.set(data),
      error: () => undefined,
    });
  }

  removeActivity(activityId: string): void {
    const slug = this.classroom()?.slug;
    if (!slug || !confirm('¿Eliminar esta actividad del salón?')) return;
    this.http.delete(`${environment.apiUrl}/classrooms/${slug}/activities/${activityId}`).subscribe({
      next: () => this.activities.update(list => list.filter(a => a.id !== activityId)),
    });
  }

  charEmoji(type: string): string {
    const map: Record<string, string> = {
      mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
    };
    return map[type?.toLowerCase()] ?? '🎓';
  }

  getStudentPoints(studentId: string): number {
    const pts = this.classroom()?.studentPoints ?? [];
    return pts.find((p: any) => p.studentId === studentId)?.totalPoints ?? 0;
  }

  toggleAward(studentId: string) {
    if (this.awardingTo() === studentId) {
      this.awardingTo.set(null);
    } else {
      this.awardingTo.set(studentId);
      this.selectedBehavior.set('');
      this.awardNotes = '';
    }
  }

  awardBehavior(studentId: string) {
    const behaviorId = this.selectedBehavior();
    if (!behaviorId || this.awarding()) return;
    const classroomId = this.classroom()?.id;

    this.awarding.set(true);
    this.http.post(`${environment.apiUrl}/behaviors/award`, {
      studentId,
      behaviorId,
      classroomId,
      notes: this.awardNotes || undefined,
    }).subscribe({
      next: () => {
        const b = this.classroom()?.behaviors?.find((bh: any) => bh.id === behaviorId);
        const pts = b?.points ?? 0;
        const name = b?.name ?? 'comportamiento';
        this.showToast(`${pts > 0 ? '⭐' : '⚠️'} ${name}: ${pts > 0 ? '+' : ''}${pts} pts`, pts > 0 ? 'success' : 'info', pts > 0 ? '⭐' : '⚠️');

        // Update local studentPoints optimistically
        const c = this.classroom();
        const existing = c.studentPoints.find((p: any) => p.studentId === studentId);
        let newPoints;
        if (existing) {
          newPoints = c.studentPoints.map((p: any) =>
            p.studentId === studentId ? { ...p, totalPoints: Math.max(0, p.totalPoints + pts) } : p
          );
        } else {
          newPoints = [...c.studentPoints, { studentId, classroomId, totalPoints: Math.max(0, pts) }];
        }
        this.classroom.set({ ...c, studentPoints: newPoints });

        this.selectedBehavior.set('');
        this.awardNotes = '';
        this.awardingTo.set(null);
        this.awarding.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al asignar', 'error', '❌');
        this.awarding.set(false);
      },
    });
  }

  regenerateCode() {
    if (this.regenerating()) return;
    this.regenerating.set(true);
    this.http.post<any>(`${environment.apiUrl}/classrooms/${this.slug}/regenerate-code`, {}).subscribe({
      next: (updated) => {
        this.classroom.set({ ...this.classroom(), classCode: updated.classCode });
        this.showToast(`Nuevo código: ${updated.classCode}`, 'success', '🔄');
        this.regenerating.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al regenerar el código', 'error', '❌');
        this.regenerating.set(false);
      },
    });
  }

  adjustPoints(studentId: string) {
    const points = Number(this.adjustValue);
    if (!points || this.adjusting()) return;
    this.adjusting.set(true);
    this.http.post(`${environment.apiUrl}/classrooms/${this.slug}/adjust-points`, {
      studentId,
      points,
      notes: this.adjustNotes || undefined,
    }).subscribe({
      next: () => {
        // Update local studentPoints optimistically (clamped at 0, like the backend)
        const c = this.classroom();
        const existing = c.studentPoints?.find((p: any) => p.studentId === studentId);
        const newPoints = existing
          ? c.studentPoints.map((p: any) =>
              p.studentId === studentId ? { ...p, totalPoints: Math.max(0, p.totalPoints + points) } : p,
            )
          : [...(c.studentPoints ?? []), { studentId, classroomId: c.id, totalPoints: Math.max(0, points) }];
        this.classroom.set({ ...c, studentPoints: newPoints });

        this.showToast(`Puntos ajustados: ${points > 0 ? '+' : ''}${points}`, points > 0 ? 'success' : 'info', '⚖️');
        this.adjustValue = null;
        this.adjustNotes = '';
        this.adjusting.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al ajustar puntos', 'error', '❌');
        this.adjusting.set(false);
      },
    });
  }

  createBehavior() {
    if (!this.newBehavior.name || this.savingBehavior()) return;
    const classroomId = this.classroom()?.id;
    this.savingBehavior.set(true);
    this.http.post(`${environment.apiUrl}/behaviors`, { ...this.newBehavior, classroomId }).subscribe({
      next: (b: any) => {
        const c = this.classroom();
        this.classroom.set({ ...c, behaviors: [...(c.behaviors ?? []), b] });
        this.newBehavior = { name: '', type: 'positive', points: 10, category: 'participation', description: '' };
        this.showNewBehaviorForm = false;
        this.showToast(`Comportamiento "${b.name}" creado`, 'success', '⭐');
        this.savingBehavior.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al crear', 'error', '❌');
        this.savingBehavior.set(false);
      },
    });
  }

  onClassroomAvatarUploaded(avatar: string) {
    const c = this.classroom();
    if (c) this.classroom.set({ ...c, avatar });
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
