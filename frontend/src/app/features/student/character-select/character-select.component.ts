import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA, CharacterType, charImagePath, charShieldPath } from '../../../core/models/user.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-character-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-select.component.html',
})
export class CharacterSelectComponent {
  characters = Object.entries(CHARACTER_DATA).map(([type, data]) => ({ type: type as CharacterType, ...data }));
  selected = signal<CharacterType | null>(null);
  selecting = signal<CharacterType | null>(null);
  loading = signal(false);
  error = signal('');

  // 10 floating background particles (like PHP character select)
  bgParticles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: [5, 18, 33, 48, 63, 78, 90, 12, 52, 70][i],
    y: [8,  25, 55, 12, 40, 68, 20, 80, 35, 90][i],
    size: [5, 8, 4, 7, 5, 9, 4, 6, 5, 7][i],
    duration: [6, 8, 5, 7, 6, 9, 5, 7, 6, 8][i],
    delay:    [0, 1.2, 2.5, 0.6, 1.8, 3.1, 0.3, 2.0, 1.0, 3.5][i],
  }));

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  select(type: CharacterType) {
    this.selected.set(type);
    this.selecting.set(type);
    setTimeout(() => this.selecting.set(null), 500);
  }

  get selectedCharacterName(): string {
    return this.characters.find((c) => c.type === this.selected())?.name ?? '';
  }

  charImage(type: CharacterType): string { return charImagePath(type, 1); }
  charShield(type: CharacterType): string { return charShieldPath(type); }

  onImgError(event: Event, fallbackIcon: string) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      const span = document.createElement('span');
      span.style.fontSize = '80px';
      span.textContent = fallbackIcon;
      parent.insertBefore(span, img);
    }
  }

  hideElement(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }

  confirm() {
    const characterType = this.selected();
    if (!characterType || this.loading()) return;

    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/student/character/select`, { characterType }).subscribe({
      next: () => {
        this.auth.updateUser({ characterType, firstCharacterSelection: true });
        this.router.navigate(['/student/dashboard']);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al seleccionar personaje');
        this.loading.set(false);
      },
    });
  }

  skipForNow() {
    this.router.navigate(['/student/dashboard']);
  }
}
