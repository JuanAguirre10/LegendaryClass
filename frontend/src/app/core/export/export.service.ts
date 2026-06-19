import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(private http: HttpClient) {}

  // Descarga un archivo de un endpoint autenticado (el interceptor adjunta el JWT),
  // luego dispara la descarga en el navegador.
  downloadFile(path: string, filename: string): void {
    this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
