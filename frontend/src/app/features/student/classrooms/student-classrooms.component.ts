import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-student-classrooms',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './student-classrooms.component.html',
})
export class StudentClassroomsComponent implements OnInit {
  classrooms = signal<any[]>([]);
  loading    = signal(true);
  showJoin   = false;
  classCode  = '';
  joinError  = signal('');
  joinLoading = signal(false);
  leaveId    = signal<string | null>(null);
  toasts     = signal<{ id: number; message: string; type: string }[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/student/enrolled`).subscribe({
      next: (res) => { this.classrooms.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  joinClass() {
    this.joinError.set('');
    if (!this.classCode.trim()) { this.joinError.set('Ingresa un código de aula'); return; }
    this.joinLoading.set(true);
    this.http.post(`${environment.apiUrl}/classrooms/join`, { classCode: this.classCode.trim().toUpperCase() }).subscribe({
      next: () => {
        this.showJoin = false;
        this.classCode = '';
        this.joinLoading.set(false);
        this.ngOnInit();
      },
      error: (err) => {
        this.joinError.set(err.error?.message ?? 'Código inválido o aula no encontrada');
        this.joinLoading.set(false);
      },
    });
  }

  leaveClassroom(id: string, name: string) {
    if (!confirm(`¿Estás seguro de que quieres abandonar "${name}"?`)) return;
    this.leaveId.set(id);
    this.http.delete(`${environment.apiUrl}/classrooms/${id}/leave`).subscribe({
      next: () => {
        this.leaveId.set(null);
        this.classrooms.update((list) => list.filter((c) => c.id !== id));
        this.showToast('Abandonaste el aula', 'info');
      },
      error: (err) => {
        this.leaveId.set(null);
        this.showToast(err.error?.message ?? 'Error al abandonar', 'error');
      },
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4000);
  }

  pointsInClassroom(c: any): number {
    return c.studentPoints?.[0]?.totalPoints ?? 0;
  }

  studentsCount(c: any): number {
    return c._count?.students ?? c.students?.length ?? 0;
  }

  questsCount(c: any): number {
    return c._count?.quests ?? c.quests?.length ?? 0;
  }
}
