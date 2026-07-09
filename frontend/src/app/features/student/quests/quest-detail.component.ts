import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { UserMenuComponent } from '../../../shared/user-menu/user-menu.component';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-quest-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UserMenuComponent, NotificationBellComponent],
  templateUrl: './quest-detail.component.html',
})
export class QuestDetailComponent implements OnInit, OnDestroy {
  menuOpen = false;
  quest      = signal<any>(null);
  loading    = signal(true);
  notFound   = signal(false);
  toasts     = signal<{ id: number; message: string; type: string }[]>([]);

  // quiz state
  currentIndex  = signal(0);
  formAnswers   = signal<Record<number, string>>({});
  formSubmitting = signal(false);
  formResult    = signal<{ autoApproved: boolean; score: number; passed: boolean; message: string; breakdown?: any[] } | null>(null);

  // timer
  timeLeft    = signal(0);
  private timerInterval: any = null;

  // file upload
  selectedFile   = signal<File | null>(null);
  previewUrl     = signal<string | null>(null);
  fileError      = signal('');
  fileSubmitting = signal(false);

  // direct complete
  completing = signal(false);

  // derived
  questions = computed(() => (this.quest()?.questions as any[]) ?? []);
  currentQ  = computed(() => this.questions()[this.currentIndex()]);
  totalQ    = computed(() => this.questions().length);
  answeredCount = computed(() => Object.keys(this.formAnswers()).length);
  progress  = computed(() => this.totalQ() > 0 ? Math.round((this.answeredCount() / this.totalQ()) * 100) : 0);

  minutesLeft = computed(() => Math.floor(this.timeLeft() / 60));
  secondsLeft = computed(() => this.timeLeft() % 60);
  timerWarning = computed(() => this.timeLeft() > 0 && this.timeLeft() <= 120);
  timerDanger  = computed(() => this.timeLeft() > 0 && this.timeLeft() <= 30);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`${environment.apiUrl}/quests/my-quests/${id}`).subscribe({
      next: (q) => {
        this.quest.set(q);
        this.loading.set(false);
        if (q?.questions?.length && q.type === 'exam') {
          const mins = q.type === 'exam' ? (q.questions.length * 2) : 0;
          if (mins > 0) this.startTimer(mins * 60);
        }
      },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
  }

  ngOnDestroy() { this.stopTimer(); }

  private startTimer(seconds: number) {
    this.timeLeft.set(seconds);
    this.timerInterval = setInterval(() => {
      const t = this.timeLeft() - 1;
      if (t <= 0) { this.timeLeft.set(0); this.stopTimer(); this.submitFormAnswers(); }
      else { this.timeLeft.set(t); }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  questIcon(type: string): string {
    const m: Record<string, string> = { homework:'📚', project:'🔨', writing:'✍️', reading:'📖', exam:'📝', exercise:'💪', participation:'🙋' };
    return m[type] ?? '⚔️';
  }

  questHasForm(): boolean { return !!this.quest()?.questions?.length; }
  isCompleted():  boolean { return !!this.quest()?.students?.[0]?.isCompleted; }
  latestSub():    any     { return this.quest()?.latestSubmission ?? null; }

  attemptsRemaining(): number {
    return Math.max(0, (this.quest()?.maxAttempts ?? 1) - (this.latestSub()?.attemptNumber ?? 0));
  }

  canSubmit(): boolean {
    const sub = this.latestSub();
    if (!sub) return true;
    if (sub.status === 'pending' || sub.status === 'approved') return false;
    return this.attemptsRemaining() > 0;
  }

  submissionBadge(): { label: string; cls: string } | null {
    const sub = this.latestSub();
    if (!sub) return null;
    if (sub.status === 'pending')  return { label: '⏳ En revisión', cls: 'bg-yellow-100 text-yellow-800' };
    if (sub.status === 'approved') return { label: '✅ Aprobada',    cls: 'bg-green-100 text-green-800' };
    return { label: '❌ Rechazada', cls: 'bg-red-100 text-red-800' };
  }

  // quiz navigation
  goTo(i: number) {
    if (i >= 0 && i < this.totalQ()) this.currentIndex.set(i);
  }
  prev() { this.goTo(this.currentIndex() - 1); }
  next() { this.goTo(this.currentIndex() + 1); }
  isLast() { return this.currentIndex() === this.totalQ() - 1; }

  setAnswer(questionId: number, value: string) {
    this.formAnswers.update(a => ({ ...a, [questionId]: value }));
  }

  questionStatus(q: any): 'current' | 'answered' | 'unanswered' {
    if (this.questions().indexOf(q) === this.currentIndex()) return 'current';
    return this.formAnswers()[q.id] !== undefined ? 'answered' : 'unanswered';
  }

  allAnswered(): boolean {
    return this.questions().every((q: any) =>
      q.type === 'open' ? !!this.formAnswers()[q.id]?.trim() : this.formAnswers()[q.id] !== undefined
    );
  }

  submitFormAnswers() {
    const q = this.quest();
    if (!q || this.formSubmitting()) return;
    this.stopTimer();
    this.formSubmitting.set(true);
    this.http.post<any>(`${environment.apiUrl}/quests/${q.id}/submit-answers`, { answers: this.formAnswers() }).subscribe({
      next: (res) => { this.formResult.set(res); this.formSubmitting.set(false); this.reloadQuest(); },
      error: (err) => { this.showToast(err.error?.message ?? 'Error al enviar', 'error'); this.formSubmitting.set(false); },
    });
  }

  // file upload
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');
    if (!file) { this.selectedFile.set(null); this.previewUrl.set(null); return; }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) { this.fileError.set('Usa imágenes o PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { this.fileError.set('Supera 10 MB.'); return; }
    this.selectedFile.set(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { this.previewUrl.set(null); }
  }

  submitEvidence() {
    const q = this.quest();
    const file = this.selectedFile();
    if (!q || !file || this.fileSubmitting()) return;
    this.fileSubmitting.set(true);
    const form = new FormData();
    form.append('file', file);
    this.http.post(`${environment.apiUrl}/quests/${q.id}/submit`, form).subscribe({
      next: () => { this.showToast('✅ Evidencia enviada.', 'success'); this.reloadQuest(); this.fileSubmitting.set(false); },
      error: (err) => { this.showToast(err.error?.message ?? 'Error', 'error'); this.fileSubmitting.set(false); },
    });
  }

  completeQuest() {
    const q = this.quest();
    if (!q || this.completing()) return;
    this.completing.set(true);
    this.http.post(`${environment.apiUrl}/quests/${q.id}/complete`, {}).subscribe({
      next: (res: any) => { this.showToast(`¡Misión completada! ⚡ +${res.xpPending ?? q.xpReward} XP te esperan en tu buzón`, 'success'); this.completing.set(false); this.reloadQuest(); },
      error: (err) => { this.showToast(err.error?.message ?? 'Error', 'error'); this.completing.set(false); },
    });
  }

  private reloadQuest() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`${environment.apiUrl}/quests/my-quests/${id}`).subscribe({ next: (q) => this.quest.set(q) });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 4500);
  }
}
