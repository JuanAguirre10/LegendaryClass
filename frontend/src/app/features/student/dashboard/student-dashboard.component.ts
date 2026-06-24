import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA, charImagePath, charShieldPath, levelToTier } from '../../../core/models/user.model';
import { environment } from '@env/environment';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { UserMenuComponent } from '../../../shared/user-menu/user-menu.component';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent, UserMenuComponent],
  templateUrl: './student-dashboard.component.html',
})
export class StudentDashboardComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(true);
  showEvolution = signal(false);
  evolutionBonus = 100;
  tierEvolution = signal<0 | 25 | 50 | 75>(0);
  characterLevelUp = signal(false);
  prevCharImage = signal('');
  charEvolutionActive = signal(false);
  upgradingStat = signal<string | null>(null);
  toasts = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  // XP Inbox
  inboxItems = signal<{ id: string; type: 'quest' | 'behavior' | 'achievement'; label: string; icon: string; xp: number; earnedAt: string | null }[]>([]);
  inboxTotalPending = signal(0);
  inboxLoading = signal(false);
  claimingId = signal<string | null>(null);
  claimingAll = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  claimingSelected = signal(false);

  // 10 background particles with pseudo-random positions (like PHP)
  bgParticles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: [8, 20, 35, 50, 65, 80, 92, 15, 55, 75][i],
    y: [10, 30, 15, 60, 25, 45, 70, 80, 50, 90][i],
    size: [4, 6, 3, 5, 4, 7, 3, 5, 4, 6][i],
    duration: [6, 8, 5, 7, 6, 9, 5, 7, 6, 8][i],
    delay: [0, 1, 2, 0.5, 1.5, 2.5, 3, 0.8, 1.8, 2.8][i],
  }));

  // Evolution particles (random positions spread across overlay)
  evolutionParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (i * 37 + 10) % 90,
    y: (i * 53 + 5) % 90,
    delay: (i * 0.15) % 2.5,
  }));

  stats = [
    { key: 'strength',     icon: '💪', name: 'Fuerza',        color: 'linear-gradient(90deg,#dc2626,#ef4444)' },
    { key: 'intelligence', icon: '🧠', name: 'Inteligencia',  color: 'linear-gradient(90deg,#2563eb,#3b82f6)' },
    { key: 'agility',      icon: '⚡', name: 'Agilidad',      color: 'linear-gradient(90deg,#16a34a,#22c55e)' },
    { key: 'creativity',   icon: '🎨', name: 'Creatividad',   color: 'linear-gradient(90deg,#7c3aed,#8b5cf6)' },
    { key: 'leadership',   icon: '👑', name: 'Liderazgo',     color: 'linear-gradient(90deg,#ea580c,#f97316)' },
    { key: 'resilience',   icon: '🛡️', name: 'Resistencia',  color: 'linear-gradient(90deg,#0891b2,#06b6d4)' },
  ];

  constructor(private http: HttpClient, public auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadDashboard();
    this.loadInbox();
  }

  private loadDashboard() {
    this.http.get<any>(`${environment.apiUrl}/student/dashboard`).subscribe({
      next: (res) => {
        if (res?.user) this.auth.updateUser({ experiencePoints: res.user.experiencePoints, level: res.user.level, points: res.user.points });
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadInbox() {
    this.inboxLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/student/xp-inbox`).subscribe({
      next: (res) => {
        this.inboxItems.set(res.items ?? []);
        this.inboxTotalPending.set(res.totalPending ?? 0);
        this.selectedIds.set(new Set());
        this.inboxLoading.set(false);
      },
      error: (err) => { console.error('[XP Inbox] error:', err); this.inboxLoading.set(false); },
    });
  }

  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  toggleSelect(id: string) {
    this.selectedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll() {
    const all = this.inboxItems().map(i => i.id);
    const allSelected = all.every(id => this.selectedIds().has(id));
    this.selectedIds.set(allSelected ? new Set() : new Set(all));
  }

  get allSelected(): boolean {
    const items = this.inboxItems();
    return items.length > 0 && items.every(i => this.selectedIds().has(i.id));
  }

  get selectedXpTotal(): number {
    return this.inboxItems()
      .filter(i => this.selectedIds().has(i.id))
      .reduce((sum, i) => sum + i.xp, 0);
  }

  get selectedCount(): number { return this.selectedIds().size; }

  isBusy(): boolean { return this.claimingAll() || this.claimingSelected() || !!this.claimingId(); }

  claimItem(item: { id: string; type: 'quest' | 'behavior' | 'achievement'; xp: number }) {
    if (this.isBusy()) return;
    this.claimingId.set(item.id);
    this.http.post<any>(`${environment.apiUrl}/student/claim-xp`, { claims: [{ type: item.type, id: item.id }] }).subscribe({
      next: (res) => this.handleClaimResult(res),
      error: () => { this.claimingId.set(null); this.showToast('Error al canjear XP', 'error', '⚠️'); },
    });
  }

  claimSelected() {
    if (this.isBusy() || this.selectedIds().size === 0) return;
    const claims = this.inboxItems()
      .filter(i => this.selectedIds().has(i.id))
      .map(i => ({ type: i.type, id: i.id }));
    this.claimingSelected.set(true);
    this.http.post<any>(`${environment.apiUrl}/student/claim-xp`, { claims }).subscribe({
      next: (res) => this.handleClaimResult(res),
      error: () => { this.claimingSelected.set(false); this.showToast('Error al canjear XP', 'error', '⚠️'); },
    });
  }

  claimAll() {
    if (this.isBusy() || this.inboxItems().length === 0) return;
    this.claimingAll.set(true);
    this.http.post<any>(`${environment.apiUrl}/student/claim-xp`, { claimAll: true }).subscribe({
      next: (res) => this.handleClaimResult(res),
      error: () => { this.claimingAll.set(false); this.showToast('Error al canjear XP', 'error', '⚠️'); },
    });
  }

  private handleClaimResult(res: any) {
    this.claimingId.set(null);
    this.claimingAll.set(false);
    this.claimingSelected.set(false);
    if (res.totalXpClaimed > 0) {
      const isTierChange = ([25, 50, 75] as number[]).includes(res.newLevel);
      if (isTierChange) {
        const currentType = this.user?.characterType;
        if (currentType) {
          const oldTier = levelToTier(this.user?.level ?? 1);
          this.prevCharImage.set(charImagePath(currentType, oldTier));
        }
      }
      this.auth.updateUser({ experiencePoints: res.newXp, level: res.newLevel });
      this.showToast(`+${res.totalXpClaimed} XP canjeados!`, 'success', '⚡');
      if (res.leveledUp) {
        const tier = isTierChange ? res.newLevel as 25 | 50 | 75 : 0;
        if (tier) {
          this.tierEvolution.set(tier);
        } else {
          this.showEvolution.set(true);
        }
      }
      this.loadDashboard();
    }
    this.loadInbox();
  }

  closeTierEvolution() { this.tierEvolution.set(0); this.scrollToCharacter(); }

  getTierConfig(tier: number): { gradient: string; glow: string; particleColor: string; name: string; subtitle: string; icon: string } {
    if (tier === 25) return { gradient: 'linear-gradient(135deg,#0c1a4a,#1565c0,#0d47a1,#01579b)', glow: '#42a5f5', particleColor: '#90caf9', name: 'VETERANO', subtitle: 'La batalla te ha forjado', icon: '🛡️' };
    if (tier === 50) return { gradient: 'linear-gradient(135deg,#1a0033,#6a1b9a,#8e24aa,#4a148c)', glow: '#ce93d8', particleColor: '#e040fb', name: 'ÉPICO', subtitle: 'Leyendas hablan de ti', icon: '💜' };
    return { gradient: 'linear-gradient(135deg,#1a0800,#e65100,#f57f17,#bf360c)', glow: '#ffd54f', particleColor: '#ffca28', name: 'LEGENDARIO', subtitle: 'Has alcanzado la cúspide del poder', icon: '👑' };
  }

  get user() { return this.auth.user(); }

  get charInfo() {
    const t = this.user?.characterType;
    return t ? CHARACTER_DATA[t] : null;
  }

  getStatValue(key: string): number {
    const d = this.data();
    return d?.stats?.[key] ?? 10;
  }

  getStatPercent(key: string): number {
    return Math.min(100, (this.getStatValue(key) / 50) * 100);
  }

  getTier(): 1 | 2 | 3 | 4 {
    return levelToTier(this.data()?.xpInfo?.level ?? 1);
  }

  getTierName(): string {
    const t = this.getTier();
    return t === 4 ? 'LEGENDARIO' : t === 3 ? 'ÉPICO' : t === 2 ? 'VETERANO' : 'NOVATO';
  }

  getTierBadgeClass(): string {
    const t = this.getTier();
    return t === 4 ? 'badge-legendary' : t === 3 ? 'badge-epic' : t === 2 ? 'badge-rare' : 'badge-common';
  }

  getCharacterImage(): string {
    const type = this.user?.characterType;
    if (!type) return '';
    return charImagePath(type, this.getTier());
  }

  getShieldImage(): string {
    const type = this.user?.characterType;
    if (!type) return '';
    return charShieldPath(type);
  }

  // Creates emoji particles on character hover (PHP: createParticles())
  onCharacterHover(event: MouseEvent) {
    const emojis = ['✨', '⭐', '🌟', '💫', '⚡'];
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.cssText = `
        position: fixed;
        font-size: 1.4rem;
        pointer-events: none;
        z-index: 9000;
        animation: particleFloat 2s ease-out forwards;
        left: ${rect.left + Math.random() * rect.width}px;
        top: ${rect.top + Math.random() * rect.height}px;
      `;
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 2000);
    }
  }

  closeEvolution() {
    this.showEvolution.set(false);
    this.scrollToCharacter();
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success', icon = '⚔️') {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, icon, fadingOut: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, fadingOut: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 500);
    }, 4000);
  }

  onImgError(event: Event, fallbackIcon: string) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      const span = document.createElement('span');
      span.style.fontSize = '180px';
      span.style.filter = 'drop-shadow(0 8px 30px rgba(251,191,36,0.4))';
      span.textContent = fallbackIcon;
      parent.insertBefore(span, img);
    }
  }

  getCharEvolutionImages(): { oldSrc: string; newSrc: string } {
    return { oldSrc: this.prevCharImage(), newSrc: this.getCharacterImage() };
  }

  private scrollToCharacter() {
    setTimeout(() => {
      document.getElementById('character-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (this.prevCharImage()) {
        this.charEvolutionActive.set(true);
        setTimeout(() => {
          this.charEvolutionActive.set(false);
          this.prevCharImage.set('');
        }, 2200);
      } else {
        this.characterLevelUp.set(true);
        setTimeout(() => this.characterLevelUp.set(false), 2200);
      }
    }, 50);
  }

  hideElement(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }

  upgradeStat(stat: string) {
    if (this.upgradingStat()) return;

    const COST = 50;
    const currentPoints = this.auth.user()?.points ?? 0;
    if (currentPoints < COST) {
      this.showToast(`Necesitas ${COST} puntos para mejorar. Tienes ${currentPoints}`, 'error', '⚠️');
      return;
    }

    this.upgradingStat.set(stat);
    this.http.post<any>(`${environment.apiUrl}/student/upgrade-stat`, { stat }).subscribe({
      next: (res) => {
        const d = this.data();
        this.data.set({
          ...d,
          stats: { ...d.stats, [stat]: (d.stats?.[stat] ?? 10) + 5 },
        });
        this.auth.updateUser({ points: res.newPoints ?? (currentPoints - COST) });
        const statName = this.stats.find(s => s.key === stat)?.name ?? stat;
        this.showToast(`¡${statName} mejorada +5!`, 'success', '💪');
        this.upgradingStat.set(null);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al mejorar estadística', 'error', '⚠️');
        this.upgradingStat.set(null);
      },
    });
  }

  canUpgrade(): boolean {
    return (this.auth.user()?.points ?? 0) >= 50;
  }

  getClassroomPoints(): number {
    return this.data()?.classrooms?.[0]?.myPoints ?? 0;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
