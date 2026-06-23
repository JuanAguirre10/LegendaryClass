import { Component, Input, OnInit, OnDestroy, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../../core/realtime/realtime.service';

const CHARACTER_ICONS: Record<string, string> = {
  mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
};

@Component({
  selector: 'app-classroom-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="adventure-card p-5 animate-fade-in-up">
    <h3 class="font-cinzel font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
      <span>🏆</span> Ranking del Aula
    </h3>

    @if (ranking().length === 0) {
      <p class="font-cinzel text-gray-400 dark:text-slate-500 text-sm text-center py-6">
        Aún no hay puntos en esta aula
      </p>
    } @else {
      <!-- Podio top 3 -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        @for (p of podium(); track p.studentId) {
          <div class="text-center p-3 rounded-xl"
            [ngClass]="p.rank === 1 ? 'bg-amber-50 dark:bg-amber-900/20' : ''">
            <div class="text-2xl">{{ medal(p.rank) }}</div>
            <div class="text-lg">{{ charIcon(p.characterType) }}</div>
            <div class="font-cinzel font-bold text-xs truncate dark:text-slate-100">{{ p.name }}</div>
            <div class="font-cinzel text-green-600 dark:text-green-400 font-black text-sm">{{ p.totalPoints }}</div>
            <div class="text-xs text-gray-400 dark:text-slate-500">Lv.{{ p.level }}</div>
            @if (p.rankChange !== null) {
              <span class="text-xs px-1 rounded font-bold"
                [ngClass]="rankChangeClass(p.rankChange)">
                {{ rankChangeLabel(p.rankChange) }}
              </span>
            }
          </div>
        }
      </div>

      <!-- Filas 4–10 -->
      <div class="space-y-1">
        @for (r of rest(); track r.studentId) {
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg"
            [ngClass]="r.studentId === myId ? 'bg-blue-50 dark:bg-blue-900/20' : ''">
            <span class="font-cinzel font-black text-gray-400 dark:text-slate-500 w-5 text-sm">{{ r.rank }}</span>
            @if (r.rankChange !== null) {
              <span class="text-xs px-1 rounded font-bold w-8 text-center"
                [ngClass]="rankChangeClass(r.rankChange)">
                {{ rankChangeLabel(r.rankChange) }}
              </span>
            }
            <span class="text-base">{{ charIcon(r.characterType) }}</span>
            <span class="font-cinzel text-sm flex-1 truncate dark:text-slate-100">{{ r.name }}</span>
            <span class="font-cinzel text-xs text-gray-400 dark:text-slate-400">Lv.{{ r.level }}</span>
            <span class="font-cinzel text-green-600 dark:text-green-400 font-bold text-sm">{{ r.totalPoints }}</span>
            @if (r.streakDays > 0) {
              <span class="text-xs text-orange-500" title="Racha">🔥{{ r.streakDays }}</span>
            }
          </div>
        }
      </div>

      <!-- Tu posición si estás fuera del top 10 -->
      @if (myEntryOutsideTop10(); as me) {
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 mt-2 border-t-2 border-blue-200 dark:border-blue-700">
          <span class="font-cinzel font-black text-blue-500 dark:text-blue-400 w-5 text-sm">{{ me.rank }}</span>
          <span class="text-base">{{ charIcon(me.characterType) }}</span>
          <span class="font-cinzel text-sm flex-1 truncate dark:text-slate-100">{{ me.name }} (tú)</span>
          <span class="font-cinzel text-green-600 dark:text-green-400 font-bold text-sm">{{ me.totalPoints }}</span>
        </div>
      }
    }
  </div>
  `,
})
export class ClassroomRankingComponent implements OnInit, OnDestroy {
  @Input({ required: true }) classroomId!: string;

  ranking = signal<RankingEntry[]>([]);
  myId = '';
  private sub?: Subscription;
  private destroyRef = inject(DestroyRef);

  podium  = computed(() => this.ranking().slice(0, 3));
  rest    = computed(() => this.ranking().slice(3, 10));
  myEntryOutsideTop10 = computed(() => {
    const me = this.ranking().find((r) => r.studentId === this.myId);
    return me && me.rank > 10 ? me : null;
  });

  constructor(
    private http: HttpClient,
    private realtime: RealtimeService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.myId = this.auth.user()?.id ?? '';
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/classroom/${this.classroomId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (res) => this.ranking.set(res.ranking) });
    this.sub = this.realtime.onClassroomRanking(this.classroomId).subscribe((r) => this.ranking.set(r));
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  charIcon(type: string | null): string {
    return type ? (CHARACTER_ICONS[type] ?? '👤') : '👤';
  }

  rankChangeClass(change: number): string {
    if (change > 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (change < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
  }

  rankChangeLabel(change: number): string {
    if (change > 0) return `↑${change}`;
    if (change < 0) return `↓${Math.abs(change)}`;
    return '—';
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
