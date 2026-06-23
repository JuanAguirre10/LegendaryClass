import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';
import { MathPipe } from '../../../shared/math/math.pipe';

interface Template {
  id: string;
  title: string;
  description?: string;
  activityType: string;
  difficulty: string;
  xpReward: number;
}

interface Classroom {
  id: string;
  slug: string;
  name: string;
}

@Component({
  selector: 'app-teacher-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, MathPipe],
  templateUrl: './teacher-templates.component.html',
})
export class TeacherTemplatesComponent implements OnInit {
  courseId = '';
  templates = signal<Template[]>([]);
  classrooms = signal<Classroom[]>([]);
  importing = signal<Template | null>(null);
  importForm = { classroomSlug: '', mode: 'copy' as 'copy' | 'reference', dueDate: '' };
  importSuccess = signal(false);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.http.get<Template[]>(`${environment.apiUrl}/courses/${this.courseId}/templates`).subscribe({
      next: (data) => this.templates.set(data),
    });
    this.http.get<Classroom[]>(`${environment.apiUrl}/classrooms/mine`).subscribe({
      next: (data) => this.classrooms.set(data),
    });
  }

  openImport(t: Template) {
    this.importForm = { classroomSlug: '', mode: 'copy', dueDate: '' };
    this.importing.set(t);
    this.importSuccess.set(false);
  }

  confirmImport() {
    const t = this.importing();
    if (!t || !this.importForm.classroomSlug) return;
    this.http
      .post(`${environment.apiUrl}/classrooms/${this.importForm.classroomSlug}/activities`, {
        activityType: t.activityType,
        templateId: t.id,
        mode: this.importForm.mode,
        dueDate: this.importForm.dueDate || undefined,
      })
      .subscribe({
        next: () => {
          this.importSuccess.set(true);
          setTimeout(() => this.importing.set(null), 1200);
        },
      });
  }
}
