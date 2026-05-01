import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { User, AuthResponse, Role } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'lc_token';
  private readonly USER_KEY = 'lc_user';

  // Reactive state using Angular signals
  private _user = signal<User | null>(this.loadUser());
  private _token = signal<string | null>(this.loadToken());

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isStudent = computed(() => this._user()?.role === 'student');
  readonly isTeacher = computed(() => this._user()?.role === 'teacher');
  readonly isDirector = computed(() => ['director', 'admin'].includes(this._user()?.role ?? ''));
  readonly isParent = computed(() => this._user()?.role === 'parent');
  readonly needsCharacterSelection = computed(
    () => this._user()?.role === 'student' && !this._user()?.firstCharacterSelection,
  );

  constructor(private http: HttpClient, private router: Router) {}

  register(data: { name: string; email: string; password: string; role?: Role }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap((res) => this.saveSession(res)),
    );
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.saveSession(res)),
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  updateUser(user: Partial<User>) {
    const current = this._user();
    if (current) {
      const updated = { ...current, ...user };
      this._user.set(updated);
      localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
    }
  }

  getRoleRedirect(): string {
    const role = this._user()?.role;
    if (this.needsCharacterSelection()) return '/student/character-select';
    switch (role) {
      case 'director':
      case 'admin':    return '/director/dashboard';
      case 'teacher':  return '/teacher/dashboard';
      case 'student':  return '/student/dashboard';
      case 'parent':   return '/parent/dashboard';
      default:         return '/auth/login';
    }
  }

  private saveSession(res: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }

  private loadToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
