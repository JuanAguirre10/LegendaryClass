import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA, charImagePath, charShieldPath, levelToTier } from '../../../core/models/user.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-dashboard.component.html',
})
export class StudentDashboardComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(true);
  showEvolution = signal(false);
  evolutionBonus = 100;
  upgradingStat = signal<string | null>(null);
  toasts = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

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
    this.http.get(`${environment.apiUrl}/student/dashboard`).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
