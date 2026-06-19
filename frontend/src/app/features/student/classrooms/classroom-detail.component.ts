import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ClassroomRankingComponent } from '../../shared/classroom-ranking/classroom-ranking.component';

@Component({
  selector: 'app-classroom-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ClassroomRankingComponent],
  templateUrl: './classroom-detail.component.html',
})
export class ClassroomDetailComponent implements OnInit {
  @Input() id!: string;
  classroom = signal<any>(null);
  loading   = signal(true);
  toasts    = signal<{ id: number; message: string; type: string }[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/student/enrolled`).subscribe({
      next: (classrooms) => {
        const found = classrooms.find((c) => c.id === this.id);
        if (found) {
          this.http.get(`${environment.apiUrl}/classrooms/${found.slug}`).subscribe({
            next: (res) => { this.classroom.set(res); this.loading.set(false); },
            error: () => this.loading.set(false),
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  myPoints(): number {
    const c = this.classroom();
    if (!c) return 0;
    return c.studentPoints?.[0]?.totalPoints ?? 0;
  }

  myLevel(): number {
    const c = this.classroom();
    return c?.studentPoints?.[0]?.level ?? 1;
  }

  myXp(): number {
    const c = this.classroom();
    return c?.studentPoints?.[0]?.experiencePoints ?? 0;
  }

  studentsCount(): number {
    const c = this.classroom();
    return c?._count?.students ?? c?.students?.length ?? 0;
  }

  behaviorsCount(): number {
    const c = this.classroom();
    return c?.behaviors?.length ?? c?._count?.behaviors ?? 0;
  }

  questsCount(): number {
    const c = this.classroom();
    return c?.quests?.length ?? c?._count?.quests ?? 0;
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4000);
  }
}
