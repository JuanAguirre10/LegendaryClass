// frontend/src/app/features/shared/classroom-ranking/classroom-ranking.component.ts
import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../../core/realtime/realtime.service';

@Component({
  selector: 'app-classroom-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="adventure-card p-5 animate-fade-in-up">
    <h3 class="font-cinzel font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🏆</span> Ranking del Aula</h3>

    @if (ranking().length === 0) {
      <p class="font-cinzel text-gray-400 text-sm text-center py-6">Aún no hay puntos en esta aula</p>
    } @else {
      <!-- Podio top 3 -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        @for (p of podium(); track p.studentId) {
          <div class="text-center p-3 rounded-xl" [class.bg-amber-50]="p.rank === 1">
            <div class="text-2xl">{{ medal(p.rank) }}</div>
            <div class="font-cinzel font-bold text-xs truncate">{{ p.name }}</div>
            <div class="font-cinzel text-green-600 font-black text-sm">{{ p.totalPoints }}</div>
          </div>
        }
      </div>
      <!-- Filas 4-10 -->
      <div class="space-y-1">
        @for (r of rest(); track r.studentId) {
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg" [class.bg-blue-50]="r.studentId === myId">
            <span class="font-cinzel font-black text-gray-400 w-6">{{ r.rank }}</span>
            <span class="font-cinzel text-sm flex-1 truncate">{{ r.name }}</span>
            <span class="font-cinzel text-green-600 font-bold text-sm">{{ r.totalPoints }}</span>
          </div>
        }
      </div>
      <!-- Tu posición si estás fuera del top 10 -->
      @if (myEntryOutsideTop10(); as me) {
        <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 mt-2 border-t-2 border-blue-200">
          <span class="font-cinzel font-black text-blue-500 w-6">{{ me.rank }}</span>
          <span class="font-cinzel text-sm flex-1 truncate">{{ me.name }} (tú)</span>
          <span class="font-cinzel text-green-600 font-bold text-sm">{{ me.totalPoints }}</span>
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

  podium = computed(() => this.ranking().slice(0, 3));
  rest = computed(() => this.ranking().slice(3, 10));
  myEntryOutsideTop10 = computed(() => {
    const me = this.ranking().find((r) => r.studentId === this.myId);
    return me && me.rank > 10 ? me : null;
  });

  constructor(private http: HttpClient, private realtime: RealtimeService, private auth: AuthService) {}

  ngOnInit() {
    this.myId = this.auth.user()?.id ?? '';
    // Carga inicial vía REST
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/classroom/${this.classroomId}`)
      .subscribe({ next: (res) => this.ranking.set(res.ranking) });
    // Updates en vivo
    this.sub = this.realtime.onClassroomRanking(this.classroomId).subscribe((r) => this.ranking.set(r));
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
