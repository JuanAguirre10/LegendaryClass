import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA, charImagePath, charShieldPath, levelToTier } from '../../../core/models/user.model';
import { environment } from '@env/environment';
import { AvatarUploadComponent } from '../../../shared/avatar-upload/avatar-upload.component';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, AvatarUploadComponent],
  templateUrl: './student-profile.component.html',
})
export class StudentProfileComponent implements OnInit {
  profile = signal<any>(null);
  loading = signal(true);
  charInfo: any = null;

  // Cambio de contraseña
  newPassword = '';
  confirmPassword = '';
  savingPw = signal(false);
  pwMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

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

  changePassword() {
    if (this.savingPw()) return;
    if (this.newPassword.length < 8) {
      this.pwMessage.set({ text: 'La contraseña debe tener al menos 8 caracteres', type: 'error' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwMessage.set({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    this.savingPw.set(true);
    this.http.patch(`${environment.apiUrl}/users/profile/password`, { password: this.newPassword }).subscribe({
      next: () => {
        this.pwMessage.set({ text: 'Contraseña actualizada correctamente', type: 'success' });
        this.newPassword = '';
        this.confirmPassword = '';
        this.savingPw.set(false);
      },
      error: (err) => {
        this.pwMessage.set({ text: err.error?.message ?? 'Error al actualizar la contraseña', type: 'error' });
        this.savingPw.set(false);
      },
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

  onAvatarUploaded(avatar: string) {
    this.profile.update((p: any) => (p ? { ...p, avatar } : p));
  }
}
