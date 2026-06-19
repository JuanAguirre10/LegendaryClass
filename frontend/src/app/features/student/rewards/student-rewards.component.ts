import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-rewards',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-rewards.component.html',
})
export class StudentRewardsComponent implements OnInit {
  rewards    = signal<any[]>([]);
  myRewards  = signal<any[]>([]);
  profile    = signal<any>(null);
  loading    = signal(true);
  activeFilter = signal('all');
  toasts     = signal<{ id: number; message: string; type: string }[]>([]);
  buyingId   = signal<string | null>(null);

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/users/profile`).subscribe({
      next: (p) => this.profile.set(p),
      error: () => {},
    });

    this.http.get<any[]>(`${environment.apiUrl}/classrooms/student/enrolled`).pipe(
      switchMap((classrooms) => {
        if (!classrooms || !classrooms.length) return of([] as any[]);
        return forkJoin(
          classrooms.map((c: any) =>
            this.http.get<any[]>(`${environment.apiUrl}/rewards/classroom/${c.id}?activeOnly=true`).pipe(
              map((rewards) => rewards.map((r) => ({ ...r, classroomId: c.id, classroomName: c.name }))),
              catchError(() => of([] as any[]))
            )
          )
        ).pipe(map((arrays) => (arrays as any[][]).flat()));
      })
    ).subscribe({
      next: (rewards) => {
        const seen = new Set<string>();
        this.rewards.set(rewards.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http.get<{ data: any[] }>(`${environment.apiUrl}/rewards/student/history`).subscribe({
      next: (res) => this.myRewards.set(res.data ?? []),
      error: () => {},
    });
  }

  filteredRewards = computed(() => {
    const filter = this.activeFilter();
    const all = this.rewards();
    if (filter === 'all') return all;
    const pts = this.profile()?.points ?? 0;
    if (filter === 'affordable') return all.filter((r) => (r.costPoints ?? r.cost ?? 0) <= pts);
    return all.filter((r) => (r.rarity ?? 'common') === filter);
  });

  filters = [
    { key: 'all',        label: 'Todas' },
    { key: 'common',     label: 'Comunes' },
    { key: 'rare',       label: 'Raras' },
    { key: 'epic',       label: 'Épicas' },
    { key: 'legendary',  label: 'Legendarias' },
    { key: 'affordable', label: 'Alcanzables' },
  ];

  setFilter(f: string) { this.activeFilter.set(f); }

  rarityBorderColor(rarity: string): string {
    const m: Record<string, string> = { legendary: '#fbbf24', epic: '#7c3aed', rare: '#3b82f6', common: '#9ca3af' };
    return m[rarity] ?? '#9ca3af';
  }

  rarityBadgeBg(rarity: string): string {
    const m: Record<string, string> = { legendary: '#fef3c7', epic: '#ede9fe', rare: '#dbeafe', common: '#f3f4f6' };
    return m[rarity] ?? '#f3f4f6';
  }

  rarityBadgeColor(rarity: string): string {
    const m: Record<string, string> = { legendary: '#92400e', epic: '#5b21b6', rare: '#1e40af', common: '#374151' };
    return m[rarity] ?? '#374151';
  }

  canAfford(r: any): boolean {
    return (this.profile()?.points ?? 0) >= (r.costPoints ?? r.cost ?? 0);
  }

  buy(r: any) {
    if (!this.canAfford(r) || this.buyingId()) return;
    this.buyingId.set(r.id);
    this.http.post(`${environment.apiUrl}/rewards/redeem`, { rewardId: r.id, classroomId: r.classroomId }).subscribe({
      next: () => {
        this.showToast(`¡${r.name} canjeada exitosamente!`, 'success');
        const p = this.profile();
        if (p) this.profile.set({ ...p, points: (p.points ?? 0) - (r.costPoints ?? r.cost ?? 0) });
        this.buyingId.set(null);
        this.http.get<{ data: any[] }>(`${environment.apiUrl}/rewards/student/history`).subscribe({ next: (res) => this.myRewards.set(res.data ?? []) });
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al canjear', 'error');
        this.buyingId.set(null);
      },
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4000);
  }
}
