import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CHARACTER_DATA } from '../../../core/models/user.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './parent-dashboard.component.html',
})
export class ParentDashboardComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(true);
  showLink = false;
  linkEmail = '';
  charData: any = CHARACTER_DATA;
  linkError = signal('');

  constructor(private http: HttpClient, public auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/parent/dashboard`).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  get user() { return this.auth.user(); }

  linkChild() {
    if (!this.linkEmail) return;
    this.linkError.set('');
    this.http.post(`${environment.apiUrl}/parent/link-child`, { email: this.linkEmail }).subscribe({
      next: () => { this.showLink = false; this.linkEmail = ''; this.ngOnInit(); },
      error: (err) => this.linkError.set(err.error?.message ?? 'Error al vincular'),
    });
  }

  hideElement(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
