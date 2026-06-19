import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-avatar-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="flex items-center gap-3">
    @if (previewUrl()) {
      <img [src]="previewUrl()" alt="avatar" class="w-16 h-16 rounded-full object-cover border-2 border-amber-300" />
    }
    <div>
      <label class="btn-epic btn-blue text-xs py-2 px-4 cursor-pointer inline-block">
        {{ uploading() ? 'Subiendo...' : '📷 Cambiar imagen' }}
        <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
          (change)="onSelect($event)" [disabled]="uploading()" />
      </label>
      @if (error()) { <p class="font-cinzel text-xs text-red-600 mt-1">{{ error() }}</p> }
    </div>
  </div>
  `,
})
export class AvatarUploadComponent {
  @Input({ required: true }) uploadPath!: string;
  @Input() set currentAvatar(url: string | null | undefined) { this.previewUrl.set(this.resolve(url)); }
  @Output() uploaded = new EventEmitter<string>();

  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private origin(): string { return environment.apiUrl.replace(/\/api\/v1\/?$/, ''); }
  private resolve(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('/uploads/') ? `${this.origin()}${url}` : url;
  }

  onSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set(null);
    if (!ALLOWED.includes(file.type)) { this.error.set('Solo JPG, PNG o WEBP'); return; }
    if (file.size > MAX_BYTES) { this.error.set('Máximo 2 MB'); return; }

    const form = new FormData();
    form.append('file', file);
    this.uploading.set(true);
    this.http.post<{ avatar: string }>(`${environment.apiUrl}${this.uploadPath}`, form).subscribe({
      next: (res) => {
        this.previewUrl.set(this.resolve(res.avatar));
        this.uploaded.emit(res.avatar);
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al subir la imagen');
        this.uploading.set(false);
      },
    });
  }
}
