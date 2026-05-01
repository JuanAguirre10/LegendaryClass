import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA } from '../../../core/models/user.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-join-classroom',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './join-classroom.component.html',
})
export class JoinClassroomComponent {
  classCode = '';
  loading   = signal(false);
  error     = signal('');
  success   = signal('');

  constructor(private http: HttpClient, public auth: AuthService, private router: Router) {}

  get user() { return this.auth.user(); }

  get charInfo() {
    const t = this.user?.characterType;
    return t ? CHARACTER_DATA[t] : null;
  }

  get charIcon(): string { return this.charInfo?.icon ?? '⚔️'; }
  get charName(): string { return this.charInfo?.name ?? 'Aventurero'; }

  onCodeInput() {
    this.classCode = this.classCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.error.set('');
  }

  joinClass() {
    const code = this.classCode.trim();
    if (!code || code.length < 3) {
      this.error.set('Por favor ingresa un código válido de al menos 3 caracteres');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.http.post(`${environment.apiUrl}/classrooms/join`, { classCode: code }).subscribe({
      next: (res: any) => {
        this.success.set(`¡Te uniste a "${res.name ?? 'la nueva aula'}" exitosamente!`);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/student/classrooms']), 1800);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Código inválido o aula no encontrada');
        this.loading.set(false);
      },
    });
  }
}
