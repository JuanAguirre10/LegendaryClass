import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-quests.component.html',
})
export class StudentQuestsComponent implements OnInit {
  quests  = signal<any[]>([]);
  loading = signal(true);
  toasts  = signal<{ id: number; message: string; type: string }[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/quests/my-quests`).subscribe({
      next: (res) => { this.quests.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  activeQuests    = computed(() => this.quests().filter((q) => !q.students?.[0]?.isCompleted));
  completedQuests = computed(() => this.quests().filter((q) =>  q.students?.[0]?.isCompleted));
  totalXp         = computed(() => this.quests().reduce((s, q) => s + (q.xpReward ?? 0), 0));

  questIcon(type: string): string {
    const icons: Record<string, string> = { homework: '📚', project: '🔨', writing: '✍️', reading: '📖' };
    return icons[type] ?? '⚔️';
  }

  completeQuest(questId: string) {
    this.http.post(`${environment.apiUrl}/quests/${questId}/complete`, {}).subscribe({
      next: (res: any) => {
        const msg = `¡Misión completada! +${res.xpEarned ?? 0} XP` + (res.leveledUp ? ` 🎉 ¡Subiste al nivel ${res.newLevel}!` : '');
        this.showToast(msg, 'success');
        this.ngOnInit();
      },
      error: (err) => this.showToast(err.error?.message ?? 'Error al completar la misión', 'error'),
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4500);
  }
}
