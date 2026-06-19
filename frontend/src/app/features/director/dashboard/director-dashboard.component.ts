import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { ExportService } from '../../../core/export/export.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-director-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './director-dashboard.component.html',
})
export class DirectorDashboardComponent implements OnInit {
  stats = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient, public auth: AuthService, private router: Router, private exportService: ExportService) {}

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/director/stats`).subscribe({
      next: (res) => { this.stats.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  get user() { return this.auth.user(); }

  exportExcel() {
    this.exportService.downloadFile('/export/institution', 'institucion.xlsx');
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
