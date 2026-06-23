import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '@env/environment';

interface Course {
  id: string; name: string; description?: string; icon?: string;
  color?: string; category: string; isActive: boolean;
  _count?: { homeworkTemplates: number; exerciseTemplates: number; formTemplates: number; examTemplates: number };
}

@Component({
  selector: 'app-director-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './director-courses.component.html',
})
export class DirectorCoursesComponent implements OnInit {
  courses = signal<Course[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  categories = ['mathematics', 'sciences', 'language', 'social', 'arts', 'other'];
  form = { name: '', description: '', icon: '', color: '#6366F1', category: 'mathematics' };

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<Course[]>(`${environment.apiUrl}/courses`).subscribe({
      next: (data) => this.courses.set(data),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = { name: '', description: '', icon: '', color: '#6366F1', category: 'mathematics' };
    this.showForm.set(true);
  }

  openEdit(c: Course) {
    this.editingId.set(c.id);
    this.form = { name: c.name, description: c.description ?? '', icon: c.icon ?? '', color: c.color ?? '#6366F1', category: c.category };
    this.showForm.set(true);
  }

  save() {
    const id = this.editingId();
    const obs = id
      ? this.http.patch(`${environment.apiUrl}/courses/${id}`, this.form)
      : this.http.post(`${environment.apiUrl}/courses`, this.form);
    obs.subscribe({ next: () => { this.showForm.set(false); this.load(); } });
  }

  deactivate(id: string) {
    if (!confirm('¿Desactivar este curso?')) return;
    this.http.delete(`${environment.apiUrl}/courses/${id}`).subscribe({ next: () => this.load() });
  }

  totalTemplates(c: Course): number {
    if (!c._count) return 0;
    return c._count.homeworkTemplates + c._count.exerciseTemplates + c._count.formTemplates + c._count.examTemplates;
  }
}
