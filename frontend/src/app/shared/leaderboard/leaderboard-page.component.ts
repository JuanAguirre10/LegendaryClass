import { Component, OnInit, OnDestroy, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { AuthService } from '../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../core/realtime/realtime.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { ClassroomRankingComponent } from '../../features/shared/classroom-ranking/classroom-ranking.component';

const CHARACTER_ICONS: Record<string, string> = {
  mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
};

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ThemeToggleComponent, ClassroomRankingComponent],
  templateUrl: './leaderboard-page.component.html',
})
export class LeaderboardPageComponent implements OnInit, OnDestroy {
  activeTab      = signal<'classroom' | 'global'>('classroom');
  classrooms     = signal<{ id: string; name: string }[]>([]);
  selectedId     = signal('');
  globalRanking  = signal<RankingEntry[]>([]);
  loadingGlobal  = signal(false);

  get selectedIdValue(): string { return this.selectedId(); }
  set selectedIdValue(v: string) { this.selectedId.set(v); }

  private globalSub?: Subscription;
  private destroyRef = inject(DestroyRef);

  readonly backRoute = computed(() => {
    switch (this.auth.user()?.role) {
      case 'teacher':           return '/teacher/dashboard';
      case 'director':
      case 'admin':             return '/director/dashboard';
      default:                  return '/student/dashboard';
    }
  });

  readonly podium = computed(() => this.globalRanking().slice(0, 3));
  readonly rest   = computed(() => this.globalRanking().slice(3, 10));
  readonly myGlobalEntry = computed(() => {
    const me = this.globalRanking().find(r => r.studentId === this.auth.user()?.id);
    return me && me.rank > 10 ? me : null;
  });

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private realtime: RealtimeService,
  ) {}

  ngOnInit() {
    this.loadClassrooms();
    this.loadGlobalRanking();
    this.globalSub = this.realtime.onGlobalRanking().subscribe(r => this.globalRanking.set(r));
  }

  private loadClassrooms() {
    const role = this.auth.user()?.role;
    const endpoint = role === 'teacher'   ? '/classrooms/mine'
                   : role === 'director'  ? '/director/classrooms'
                   : '/classrooms/student/enrolled';
    this.http
      .get<{ data: { id: string; name: string }[] }>(`${environment.apiUrl}${endpoint}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = res.data ?? (res as any);
          this.classrooms.set(Array.isArray(list) ? list : []);
          if (this.classrooms().length > 0) this.selectedId.set(this.classrooms()[0].id);
        },
        error: () => {},
      });
  }

  private loadGlobalRanking() {
    this.loadingGlobal.set(true);
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/global`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { this.globalRanking.set(res.ranking); this.loadingGlobal.set(false); },
        error: () => { this.loadingGlobal.set(false); },
      });
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  charIcon(type: string | null): string {
    return type ? (CHARACTER_ICONS[type] ?? '👤') : '👤';
  }

  rankChangeClass(change: number | null): string {
    if (change === null || change === 0) return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
    if (change > 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  rankChangeLabel(change: number | null): string {
    if (change === null || change === 0) return '—';
    return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
  }

  ngOnDestroy() {
    this.globalSub?.unsubscribe();
  }
}
