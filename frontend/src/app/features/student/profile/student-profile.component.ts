import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA, charImagePath, charShieldPath, levelToTier } from '../../../core/models/user.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-profile.component.html',
})
export class StudentProfileComponent implements OnInit {
  profile = signal<any>(null);
  loading = signal(true);
  charInfo: any = null;

  constructor(private http: HttpClient, public auth: AuthService) {}

  stats(): any[] {
    const p = this.profile();
    if (!p) return [];
    return [
      { name: 'Fuerza',        icon: '💪', value: p.strength,     color: '#dc2626' },
      { name: 'Inteligencia',  icon: '🧠', value: p.intelligence, color: '#2563eb' },
      { name: 'Agilidad',      icon: '⚡', value: p.agility,      color: '#16a34a' },
      { name: 'Creatividad',   icon: '🎨', value: p.creativity,   color: '#7c3aed' },
      { name: 'Liderazgo',     icon: '👑', value: p.leadership,   color: '#ea580c' },
      { name: 'Resiliencia',   icon: '🛡️', value: p.resilience,  color: '#0891b2' },
    ];
  }

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/users/profile`).subscribe({
      next: (res: any) => {
        this.profile.set(res);
        if (res.characterType) this.charInfo = CHARACTER_DATA[res.characterType as import('../../../core/models/user.model').CharacterType];
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getTier(): 1 | 2 | 3 | 4 {
    return levelToTier(this.profile()?.level ?? 1);
  }

  getTierName(): string {
    return ['', 'NOVATO', 'VETERANO', 'ÉPICO', 'LEGENDARIO'][this.getTier()];
  }

  getXpInfo() {
    const xp = this.profile()?.experiencePoints ?? 0;
    const level = this.profile()?.level ?? 1;
    const nextLevelXp = level * level * 100;
    const currentLevelXp = (level - 1) * (level - 1) * 100;
    const progress = nextLevelXp > currentLevelXp
      ? Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
      : 0;
    return { xp, nextLevelXp, xpProgress: Math.min(100, Math.max(0, progress)) };
  }

  getCharacterImage(): string {
    const type = this.profile()?.characterType;
    if (!type) return '';
    return charImagePath(type, this.getTier());
  }

  getShieldImage(): string {
    const type = this.profile()?.characterType;
    if (!type) return '';
    return charShieldPath(type);
  }

  onImgError(event: Event, fallbackIcon: string) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      const span = document.createElement('span');
      span.style.fontSize = '60px';
      span.textContent = fallbackIcon;
      parent.appendChild(span);
    }
  }

  hideElement(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }
}
