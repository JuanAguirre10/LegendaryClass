import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { AvatarUploadComponent } from '../avatar-upload/avatar-upload.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ThemeToggleComponent, AvatarUploadComponent],
  templateUrl: './settings-page.component.html',
})
export class SettingsPageComponent implements OnInit {
  name = signal('');
  savingName = signal(false);
  nameMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  newPassword = '';
  confirmPassword = '';
  savingPw = signal(false);
  pwMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  readonly backRoute = computed(() => {
    const role = this.auth.user()?.role;
    switch (role) {
      case 'teacher':           return '/teacher/dashboard';
      case 'director':
      case 'admin':             return '/director/dashboard';
      case 'parent':            return '/parent/dashboard';
      default:                  return '/student/dashboard';
    }
  });

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.name.set(this.auth.user()?.name ?? '');
  }

  saveName() {
    if (this.savingName()) return;
    const n = this.name().trim();
    if (!n) {
      this.nameMessage.set({ text: 'El nombre no puede estar vacío', type: 'error' });
      return;
    }
    this.savingName.set(true);
    this.http.patch(`${environment.apiUrl}/users/profile`, { name: n }).subscribe({
      next: () => {
        this.auth.updateUser({ name: n });
        this.nameMessage.set({ text: 'Nombre actualizado', type: 'success' });
        this.savingName.set(false);
      },
      error: (err) => {
        this.nameMessage.set({ text: err.error?.message ?? 'Error al guardar', type: 'error' });
        this.savingName.set(false);
      },
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
    this.http
      .patch(`${environment.apiUrl}/users/profile/password`, { password: this.newPassword })
      .subscribe({
        next: () => {
          this.pwMessage.set({ text: 'Contraseña actualizada correctamente', type: 'success' });
          this.newPassword = '';
          this.confirmPassword = '';
          this.savingPw.set(false);
        },
        error: (err) => {
          this.pwMessage.set({ text: err.error?.message ?? 'Error al actualizar', type: 'error' });
          this.savingPw.set(false);
        },
      });
  }

  onAvatarUploaded(avatar: string) {
    this.auth.updateUser({ avatar });
  }
}
