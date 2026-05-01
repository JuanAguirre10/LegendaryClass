import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');

  roles: { value: Role; label: string; icon: string }[] = [
    { value: 'student', label: 'Estudiante', icon: '🎓' },
    { value: 'teacher', label: 'Profesor',   icon: '📚' },
    { value: 'parent',  label: 'Padre/Madre', icon: '👨‍👩‍👧' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role:     ['student', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.form.value).subscribe({
      next: () => this.router.navigateByUrl(this.auth.getRoleRedirect()),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al registrarse');
        this.loading.set(false);
      },
    });
  }
}
