import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';

interface Template {
  id: string; title: string; description?: string; status: string;
  activityType: string; difficulty: string; xpReward: number;
  author: { id: string; name: string }; rejectionNote?: string;
}

@Component({
  selector: 'app-director-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './director-templates.component.html',
})
export class DirectorTemplatesComponent implements OnInit {
  courseId = '';
  templates = signal<Template[]>([]);
  tab = signal<'pending' | 'approved' | 'rejected'>('pending');
  rejectNote = '';
  rejectingId = signal<{ id: string; type: string } | null>(null);

  filtered = computed(() => this.templates().filter(t => t.status === this.tab()));
  pendingCount = computed(() => this.templates().filter(t => t.status === 'pending').length);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.load();
  }

  load() {
    this.http.get<Template[]>(`${environment.apiUrl}/courses/${this.courseId}/templates`).subscribe({
      next: (data) => this.templates.set(data),
    });
  }

  approve(t: Template) {
    this.http.patch(`${environment.apiUrl}/templates/${t.id}/review?type=${t.activityType}`,
      { approved: true }).subscribe({ next: () => this.load() });
  }

  openReject(t: Template) {
    this.rejectNote = '';
    this.rejectingId.set({ id: t.id, type: t.activityType });
  }

  confirmReject() {
    const r = this.rejectingId();
    if (!r) return;
    this.http.patch(`${environment.apiUrl}/templates/${r.id}/review?type=${r.type}`,
      { approved: false, note: this.rejectNote }).subscribe({ next: () => { this.rejectingId.set(null); this.load(); } });
  }

  remove(t: Template) {
    if (!confirm('¿Eliminar esta plantilla del banco?')) return;
    this.http.delete(`${environment.apiUrl}/templates/${t.id}?type=${t.activityType}`).subscribe({ next: () => this.load() });
  }
}
