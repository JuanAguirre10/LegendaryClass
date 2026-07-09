import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { UserMenuComponent } from '../../../shared/user-menu/user-menu.component';

interface QuestSubmission {
  id:            string;
  questId:       string;
  studentId:     string;
  fileUrl:       string;
  fileName:      string;
  status:        'pending' | 'approved' | 'rejected';
  attemptNumber: number;
  teacherNotes:  string | null;
  submittedAt:   string;
  reviewedAt:    string | null;
}

@Component({
  selector: 'app-student-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UserMenuComponent],
  templateUrl: './student-quests.component.html',
})
export class StudentQuestsComponent implements OnInit {
  menuOpen = false;
  quests    = signal<any[]>([]);
  loading   = signal(true);
  toasts    = signal<{ id: number; message: string; type: string }[]>([]);

  // Submission modal state
  modalQuestId  = signal<string | null>(null);
  selectedFile  = signal<File | null>(null);
  submitting    = signal(false);
  fileError     = signal('');
  previewUrl    = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadQuests();
  }

  loadQuests() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/quests/my-quests`).subscribe({
      next: (res) => { this.quests.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  activeQuests    = computed(() => this.quests().filter((q) => !q.students?.[0]?.isCompleted));
  completedQuests = computed(() => this.quests().filter((q) =>  q.students?.[0]?.isCompleted));
  totalXp         = computed(() => this.quests().reduce((s: number, q: any) => s + (q.xpReward ?? 0), 0));

  questIcon(type: string): string {
    const icons: Record<string, string> = { homework: '📚', project: '🔨', writing: '✍️', reading: '📖' };
    return icons[type] ?? '⚔️';
  }

  // ─── Instant complete (non-submission quests) ─────────────────────────────

  completeQuest(questId: string) {
    this.http.post(`${environment.apiUrl}/quests/${questId}/complete`, {}).subscribe({
      next: (res: any) => {
        this.showToast(`¡Misión completada! ⚡ +${res.xpPending ?? 0} XP te esperan en tu buzón`, 'success');
        this.loadQuests();
      },
      error: (err) => this.showToast(err.error?.message ?? 'Error al completar la misión', 'error'),
    });
  }

  // ─── Submission modal ─────────────────────────────────────────────────────

  openModal(questId: string) {
    this.modalQuestId.set(questId);
    this.selectedFile.set(null);
    this.fileError.set('');
    this.previewUrl.set(null);
  }

  closeModal() {
    this.submitting.set(false);
    this.modalQuestId.set(null);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileError.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');
    if (!file) { this.selectedFile.set(null); this.previewUrl.set(null); return; }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) {
      this.fileError.set('Tipo no permitido. Usa imágenes (JPG/PNG/GIF/WEBP) o PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.fileError.set('El archivo supera el límite de 10 MB.');
      return;
    }
    this.selectedFile.set(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.previewUrl.set(null);
    }
  }

  submitEvidence() {
    const questId = this.modalQuestId();
    const file = this.selectedFile();
    if (!questId || !file || this.submitting()) return;
    this.submitting.set(true);
    const form = new FormData();
    form.append('file', file);
    this.http.post(`${environment.apiUrl}/quests/${questId}/submit`, form).subscribe({
      next: () => {
        this.showToast('✅ Evidencia enviada. El profesor la revisará pronto.', 'success');
        this.closeModal();
        this.loadQuests();
        this.submitting.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al enviar la evidencia', 'error');
        this.submitting.set(false);
      },
    });
  }

  // ─── Submission status helpers ────────────────────────────────────────────

  latestSub(quest: any): QuestSubmission | null {
    return quest.latestSubmission ?? null;
  }

  attemptsRemaining(quest: any): number {
    const used = quest.latestSubmission?.attemptNumber ?? 0;
    return Math.max(0, (quest.maxAttempts ?? 1) - used);
  }

  canSubmit(quest: any): boolean {
    const sub = this.latestSub(quest);
    if (!sub) return true;
    if (sub.status === 'pending') return false;
    if (sub.status === 'approved') return false;
    // rejected: can resubmit if attempts remain
    return this.attemptsRemaining(quest) > 0;
  }

  submissionBadge(quest: any): { label: string; cls: string } | null {
    const sub = this.latestSub(quest);
    if (!sub) return null;
    if (sub.status === 'pending') return { label: '⏳ Pendiente revisión', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
    if (sub.status === 'approved') return { label: '✅ Aprobada', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
    return { label: '❌ Rechazada', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4500);
  }
}
