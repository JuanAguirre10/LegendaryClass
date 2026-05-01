import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

interface WelcomeInfo { icon: string; title: string; subtitle: string; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
})

export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  welcome = signal<WelcomeInfo | null>(null);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  private getRoleWelcome(role: string, name: string): WelcomeInfo {
    switch (role) {
      case 'director':
      case 'admin':   return { icon: '👑', title: `¡Bienvenido, Director!`, subtitle: name };
      case 'teacher': return { icon: '🧙‍♂️', title: `¡Bienvenido, Maestro!`, subtitle: name };
      case 'parent':  return { icon: '🛡️', title: `¡Bienvenido, Guardián!`, subtitle: name };
      default:        return { icon: '⚔️', title: `¡Bienvenido, Aventurero!`, subtitle: name };
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () => {
        const user = this.auth.user();
        this.welcome.set(this.getRoleWelcome(user?.role ?? '', user?.name ?? ''));
        setTimeout(() => this.router.navigateByUrl(this.auth.getRoleRedirect()), 1800);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al iniciar sesión');
        this.loading.set(false);
      },
    });
  }
}
