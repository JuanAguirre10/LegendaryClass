import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

@Component({
  selector: 'app-director-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/director/dashboard" class="legendary-logo text-xl"><img src="assets/imagensinfondo.png" alt="LegendaryClass" style="height:36px;width:auto;vertical-align:middle;"> LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/director/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/director/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/director/teachers"   class="nav-link-epic">📚 Profesores</a>
        <a routerLink="/director/students"   class="nav-link-epic">⚔️ Estudiantes</a>
        <a routerLink="/director/users"      class="nav-link-epic active">👥 Usuarios</a>
        <a routerLink="/director/reports"    class="nav-link-epic">📊 Reportes</a>
        <a routerLink="/director/settings" routerLinkActive="active" class="nav-link-epic">⚙️ Config</a>
      </div>
      <div class="flex items-center gap-3">
        <app-theme-toggle />
        <a routerLink="/director/dashboard" class="btn-epic btn-purple text-xs py-2 px-4">← Dashboard</a>
        <!-- Hamburger — mobile only -->
        <button class="md:hidden flex flex-col justify-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors"
                (click)="menuOpen = !menuOpen" aria-label="Abrir menú">
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
          <span class="block w-6 h-0.5 bg-current transition-all"></span>
        </button>
      </div>
    </div>
  </nav>

  @if (menuOpen) {
    <div class="fixed inset-0 z-50 md:hidden" (click)="menuOpen = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="absolute top-0 left-0 right-0 legendary-nav shadow-2xl p-4 pt-3"
           (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <span class="legendary-logo text-lg">LegendaryClass</span>
          <button (click)="menuOpen = false"
                  class="text-2xl font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Cerrar menú">✕</button>
        </div>
        <div class="flex flex-col gap-1">
          <a routerLink="/director/dashboard"   routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
          <a routerLink="/director/classrooms"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏛️ Aulas</a>
          <a routerLink="/director/teachers"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👩‍🏫 Profesores</a>
          <a routerLink="/director/students"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🎓 Estudiantes</a>
          <a routerLink="/director/users"       routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👥 Usuarios</a>
          <a routerLink="/director/reports"     routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📊 Reportes</a>
          <a routerLink="/director/leaderboard" routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Ranking</a>
        </div>
      </div>
    </div>
  }

  <div class="z-content py-10 max-w-6xl mx-auto px-6">
    <div class="mb-8">
      <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">👥 Gestión de Usuarios</h1>
      <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm tracking-widest uppercase mt-1">
        Crea cuentas y administra roles y accesos de la institución
      </p>
    </div>

    @if (toast()) {
      <div class="mb-6 px-5 py-3 rounded-xl font-cinzel text-sm animate-fade-in-up"
           [class]="toast()!.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
        {{ toast()!.msg }}
      </div>
    }

    <!-- Crear usuario -->
    <div class="adventure-card p-6 mb-8 animate-fade-in-up">
      <h2 class="font-cinzel font-bold text-purple-700 text-lg mb-4">➕ Crear nuevo usuario</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <input [(ngModel)]="form.name" type="text" placeholder="Nombre completo"
          class="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 font-playfair text-sm focus:border-purple-400 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50">
        <input [(ngModel)]="form.email" type="email" placeholder="Email"
          class="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 font-playfair text-sm focus:border-purple-400 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50">
        <input [(ngModel)]="form.password" type="password" placeholder="Contraseña (mín. 8)"
          class="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 font-playfair text-sm focus:border-purple-400 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50">
        <select [(ngModel)]="form.role"
          class="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 font-cinzel text-sm focus:border-purple-400 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50">
          <option value="teacher">📚 Profesor</option>
          <option value="student">⚔️ Estudiante</option>
          <option value="parent">👨‍👩‍👧 Padre/Madre</option>
          <option value="director">👑 Director</option>
        </select>
      </div>
      <button (click)="createUser()" [disabled]="creating()"
        class="btn-epic btn-purple text-sm py-2 px-6 mt-4 disabled:opacity-50">
        {{ creating() ? 'Creando...' : 'Crear usuario' }}
      </button>
    </div>

    <!-- Lista -->
    @if (loading()) {
      <div class="legendary-card p-12 text-center"><div class="text-7xl mb-4 animate-float">👥</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Cargando usuarios...</p></div>
    } @else if (users().length > 0) {
      <div class="adventure-card overflow-hidden animate-fade-in-up">
        <table class="w-full">
          <thead>
            <tr style="background: linear-gradient(135deg, rgba(88,28,135,0.08) 0%, rgba(124,58,237,0.05) 100%); border-bottom: 2px solid rgba(124,58,237,0.15);">
              <th class="text-left px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Usuario</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Rol</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Estado</th>
              <th class="text-center px-5 py-4 font-cinzel text-xs font-bold text-purple-700 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-purple-50/30 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-cinzel font-bold text-gray-800 dark:text-slate-100 text-sm">{{ u.name }}</span>
                  <span class="block font-playfair text-gray-400 dark:text-slate-500 text-xs">{{ u.email }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)"
                    class="px-3 py-1 rounded-full border border-gray-200 dark:border-slate-600 font-cinzel text-xs capitalize focus:border-purple-400 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50">
                    <option value="teacher">Profesor</option>
                    <option value="student">Estudiante</option>
                    <option value="parent">Padre/Madre</option>
                    <option value="director">Director</option>
                  </select>
                </td>
                <td class="px-5 py-4 text-center">
                  @if (u.isActive) {
                    <span class="font-cinzel text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">Activo</span>
                  } @else {
                    <span class="font-cinzel text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">Inactivo</span>
                  }
                </td>
                <td class="px-5 py-4 text-center">
                  <button (click)="toggleStatus(u)"
                    class="font-cinzel text-xs py-1 px-3 rounded-full transition-colors"
                    [class]="u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'">
                    {{ u.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="legendary-card p-12 text-center"><div class="text-8xl mb-6 opacity-70">👥</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">No hay usuarios para mostrar</p></div>
    }
  </div>
  `,
})
export class DirectorUsersComponent implements OnInit {
  users = signal<ManagedUser[]>([]);
  loading = signal(true);
  creating = signal(false);
  menuOpen = false;
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  form = { name: '', email: '', password: '', role: 'teacher' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.loading.set(true);
    forkJoin({
      teachers: this.http.get<{ data: ManagedUser[] }>(`${environment.apiUrl}/director/teachers`),
      students: this.http.get<{ data: ManagedUser[] }>(`${environment.apiUrl}/director/students`),
    }).subscribe({
      next: ({ teachers, students }) => {
        const merged = [
          ...teachers.data.map((t) => ({ ...t, role: 'teacher' })),
          ...students.data.map((s) => ({ ...s, role: 'student' })),
        ];
        this.users.set(merged);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  createUser() {
    if (!this.form.name || !this.form.email || !this.form.password) {
      this.showToast('Completa nombre, email y contraseña', 'error');
      return;
    }
    this.creating.set(true);
    this.http.post(`${environment.apiUrl}/director/users`, this.form).subscribe({
      next: () => {
        this.showToast(`Usuario ${this.form.name} creado`, 'success');
        this.form = { name: '', email: '', password: '', role: 'teacher' };
        this.creating.set(false);
        this.loadUsers();
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al crear usuario', 'error');
        this.creating.set(false);
      },
    });
  }

  toggleStatus(u: ManagedUser) {
    this.http.patch<ManagedUser>(`${environment.apiUrl}/director/users/${u.id}/toggle-status`, {}).subscribe({
      next: (res) => {
        this.users.update((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: res.isActive } : x)));
        this.showToast(`${u.name} ${res.isActive ? 'activado' : 'desactivado'}`, 'success');
      },
      error: () => this.showToast('Error al cambiar el estado', 'error'),
    });
  }

  changeRole(u: ManagedUser, role: string) {
    if (role === u.role) return;
    this.http.patch(`${environment.apiUrl}/director/users/${u.id}/role`, { role }).subscribe({
      next: () => {
        this.users.update((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
        this.showToast(`Rol de ${u.name} actualizado a ${role}`, 'success');
      },
      error: () => this.showToast('Error al cambiar el rol', 'error'),
    });
  }
}
