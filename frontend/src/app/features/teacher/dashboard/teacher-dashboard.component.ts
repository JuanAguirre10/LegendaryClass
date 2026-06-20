import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '@env/environment';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './teacher-dashboard.component.html',
})
export class TeacherDashboardComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient, public auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/teacher/dashboard`).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  get user() { return this.auth.user(); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
