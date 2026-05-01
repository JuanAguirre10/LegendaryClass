import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-achievements',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-achievements.component.html',
})
export class StudentAchievementsComponent implements OnInit {
  achievements = signal<any[]>([]);
  loading      = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/achievements/my`).subscribe({
      next: (res) => { this.achievements.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  completed  = computed(() => this.achievements().filter((a) => a.isCompleted));
  totalXp    = computed(() => this.achievements().reduce((s, a) => s + (a.xpReward ?? 0), 0));
  legendary  = computed(() => this.achievements().filter((a) => a.rarity === 'legendary').length);

  rarityOrder = ['legendary', 'epic', 'rare', 'common'];

  rarityLabel(r: string): string {
    const m: Record<string, string> = { legendary: '⭐ Legendarios', epic: '💜 Épicos', rare: '💙 Raros', common: '📌 Comunes' };
    return m[r] ?? r;
  }

  byRarity(rarity: string): any[] {
    return this.achievements().filter((a) => (a.rarity ?? 'common') === rarity);
  }

  hasRarity(rarity: string): boolean {
    return this.byRarity(rarity).length > 0;
  }

  rarityIconBg(rarity: string): string {
    const m: Record<string, string> = {
      legendary: 'rgba(217,119,6,0.15)', epic: 'rgba(124,58,237,0.15)', rare: 'rgba(59,130,246,0.15)', common: 'rgba(107,114,128,0.1)'
    };
    return m[rarity] ?? 'rgba(107,114,128,0.1)';
  }

  rarityIconBorder(rarity: string): string {
    const m: Record<string, string> = {
      legendary: 'rgba(217,119,6,0.4)', epic: 'rgba(124,58,237,0.4)', rare: 'rgba(59,130,246,0.3)', common: 'rgba(107,114,128,0.2)'
    };
    return m[rarity] ?? 'rgba(107,114,128,0.2)';
  }

  rarityBadgeBg(rarity: string): string {
    const m: Record<string, string> = {
      legendary: 'rgba(217,119,6,0.15)', epic: 'rgba(124,58,237,0.15)', rare: 'rgba(59,130,246,0.15)', common: 'rgba(107,114,128,0.1)'
    };
    return m[rarity] ?? 'rgba(107,114,128,0.1)';
  }

  rarityBadgeColor(rarity: string): string {
    const m: Record<string, string> = { legendary: '#92400e', epic: '#5b21b6', rare: '#1e40af', common: '#374151' };
    return m[rarity] ?? '#374151';
  }

  rarityCardBorder(rarity: string): string {
    const m: Record<string, string> = {
      legendary: 'rgba(217,119,6,0.5)', epic: 'rgba(124,58,237,0.5)', rare: 'rgba(59,130,246,0.4)', common: 'rgba(107,114,128,0.2)'
    };
    return m[rarity] ?? 'rgba(107,114,128,0.2)';
  }

  rarityCardBg(rarity: string): string {
    const m: Record<string, string> = {
      legendary: 'linear-gradient(135deg,rgba(255,251,235,0.97),rgba(255,255,255,0.95))',
      epic: 'linear-gradient(135deg,rgba(245,243,255,0.97),rgba(255,255,255,0.95))',
      rare: 'linear-gradient(135deg,rgba(239,246,255,0.97),rgba(255,255,255,0.95))',
      common: 'linear-gradient(135deg,rgba(255,255,255,0.97),rgba(255,255,255,0.92))',
    };
    return m[rarity] ?? m['common'];
  }

  progressPct(a: any): number {
    return a.maxProgress > 0 ? Math.min(100, Math.round((a.progress / a.maxProgress) * 100)) : 0;
  }
}
