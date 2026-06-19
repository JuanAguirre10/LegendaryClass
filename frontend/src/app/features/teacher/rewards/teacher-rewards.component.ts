import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-teacher-rewards',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl">📚 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"  class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms" class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"  class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"     class="nav-link-epic">🗡️ Misiones</a>
        <a routerLink="/teacher/rewards"    class="nav-link-epic active">🎁 Recompensas</a>
      </div>
      <a routerLink="/teacher/dashboard" class="btn-epic btn-blue text-xs py-2 px-4">← Dashboard</a>
    </div>
  </nav>

  <!-- Toasts -->
  <div class="toast-container">
    @for (t of toasts(); track t.id) {
      <div class="toast-message" [class]="'toast-message ' + t.type" [class.fade-out]="t.fadingOut">
        <span>{{ t.icon }}</span><span>{{ t.message }}</span>
      </div>
    }
  </div>

  <div class="z-content py-10 max-w-6xl mx-auto px-6">
    <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">🎁 Recompensas</h1>
        <p class="font-cinzel text-gray-500 text-sm tracking-widest uppercase mt-1">Gestiona y aprueba recompensas</p>
      </div>
      <div class="flex items-center gap-3">
        <select [(ngModel)]="selectedClassroom" (ngModelChange)="onClassroomChange()"
          class="input-epic text-sm">
          <option value="">-- Selecciona un aula --</option>
          @for (c of classrooms(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (selectedClassroom) {
          <button (click)="showCreate = !showCreate" class="btn-epic btn-green text-sm py-2 px-5 whitespace-nowrap">
            ➕ Nueva Recompensa
          </button>
        }
      </div>
    </div>

    @if (!selectedClassroom) {
      <div class="legendary-card p-16 text-center">
        <div class="text-8xl mb-4 opacity-70">🎁</div>
        <p class="font-cinzel text-gray-500">Selecciona un aula para gestionar sus recompensas</p>
      </div>
    } @else {

      <!-- Formulario nueva recompensa -->
      @if (showCreate) {
        <div class="legendary-card p-6 mb-6 animate-fade-in-up">
          <h3 class="font-cinzel font-bold text-gray-800 text-lg mb-4">🎁 Crear Recompensa</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input [(ngModel)]="newReward.name" type="text" placeholder="Nombre *"
              class="input-epic text-sm sm:col-span-2 lg:col-span-1" />
            <select [(ngModel)]="newReward.rarity" class="input-epic text-sm">
              <option value="common">📌 Común</option>
              <option value="rare">💙 Rara</option>
              <option value="epic">💜 Épica</option>
              <option value="legendary">⭐ Legendaria</option>
            </select>
            <input [(ngModel)]="newReward.costPoints" type="number" min="1" placeholder="Costo en puntos *"
              class="input-epic text-sm" />
            <select [(ngModel)]="newReward.type" class="input-epic text-sm">
              <option value="xp_boost">⭐ Boost XP</option>
              <option value="stat_boost">💪 Boost Stat</option>
              <option value="level_boost">🆙 Boost Nivel</option>
              <option value="special_ability">✨ Habilidad</option>
              <option value="character_upgrade">🎭 Evolución</option>
            </select>
            <select [(ngModel)]="newReward.rewardType" class="input-epic text-sm">
              <option value="experience">⭐ XP</option>
              <option value="stat">💪 Estadística</option>
              <option value="ability">✨ Habilidad</option>
              <option value="cosmetic">🎨 Cosmético</option>
            </select>
            <input [(ngModel)]="newReward.xpBonus" type="number" min="0" placeholder="Bonus XP (opcional)"
              class="input-epic text-sm" />
            <textarea [(ngModel)]="newReward.description" placeholder="Descripción *"
              class="input-epic text-sm sm:col-span-2 lg:col-span-3 resize-none" rows="2"></textarea>
          </div>
          <div class="flex gap-3 justify-end mt-4">
            <button (click)="showCreate = false"
              class="font-cinzel text-gray-500 px-4 py-2 text-sm hover:text-gray-700 transition">Cancelar</button>
            <button (click)="createReward()" [disabled]="saving()"
              class="btn-epic btn-green text-sm py-2 px-6">
              {{ saving() ? '...' : 'Crear Recompensa' }}
            </button>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <!-- Recompensas (col-span-3) -->
        <div class="lg:col-span-3">
          <h2 class="font-cinzel font-bold text-gray-700 text-base mb-3 uppercase tracking-wide">🎁 Recompensas del Aula</h2>
          @if (loading()) {
            <div class="legendary-card p-8 text-center"><div class="text-5xl animate-float mb-3">🎁</div><p class="font-cinzel text-gray-400">Cargando...</p></div>
          } @else if (rewards().length === 0) {
            <div class="legendary-card p-12 text-center">
              <div class="text-6xl mb-4 opacity-70">🎁</div>
              <p class="font-cinzel text-gray-500 mb-4">No hay recompensas para esta aula</p>
              <button (click)="showCreate = true" class="btn-epic btn-green text-sm py-2 px-5">➕ Crear Recompensa</button>
            </div>
          } @else {
            <div class="space-y-3">
              @for (r of rewards(); track r.id) {
                <div class="adventure-card p-4 animate-fade-in-up"
                  [style.border-left]="'4px solid ' + rarityColor(r.rarity)">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-cinzel font-black text-gray-800">{{ r.name }}</span>
                        <span class="font-cinzel text-xs px-2 py-0.5 rounded-full"
                          [style.background]="rarityBg(r.rarity)"
                          [style.color]="rarityColor(r.rarity)">
                          {{ rarityLabel(r.rarity) }}
                        </span>
                        @if (!r.isActive) {
                          <span class="font-cinzel text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactiva</span>
                        }
                      </div>
                      <p class="font-playfair text-gray-500 text-xs mb-1">{{ r.description }}</p>
                      <div class="flex items-center gap-3 text-xs">
                        <span class="font-cinzel font-bold text-amber-600">💎 {{ r.costPoints }} pts</span>
                        @if (r.xpBonus > 0) { <span class="font-cinzel text-green-600">+{{ r.xpBonus }} XP bonus</span> }
                        @if (r.stockQuantity !== null) { <span class="font-cinzel text-gray-400">Stock: {{ r.stockQuantity }}</span> }
                      </div>
                    </div>
                    <button (click)="toggleStatus(r)"
                      class="btn-epic text-xs py-1 px-3 flex-shrink-0 whitespace-nowrap"
                      [class.btn-green]="!r.isActive"
                      [class.btn-red]="r.isActive">
                      {{ r.isActive ? '⏸ Desactivar' : '▶ Activar' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Canjes pendientes (col-span-2) -->
        <div class="lg:col-span-2">
          <h2 class="font-cinzel font-bold text-gray-700 text-base mb-3 uppercase tracking-wide flex items-center gap-2">
            ⏳ Canjes Pendientes
            @if (pendingCount() > 0) {
              <span class="bg-red-500 text-white font-cinzel font-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {{ pendingCount() }}
              </span>
            }
          </h2>
          @if (redemptionsLoading()) {
            <div class="legendary-card p-8 text-center"><div class="text-4xl animate-float mb-2">⏳</div></div>
          } @else if (redemptions().length === 0) {
            <div class="legendary-card p-10 text-center">
              <div class="text-5xl mb-3 opacity-50">✅</div>
              <p class="font-cinzel text-gray-400 text-sm">Sin canjes pendientes</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (rd of redemptions(); track rd.id) {
                <div class="legendary-card p-4 animate-fade-in-up">
                  <div class="mb-2">
                    <p class="font-cinzel font-bold text-gray-800 text-sm">{{ rd.student?.name }}</p>
                    <p class="font-playfair text-gray-500 text-xs">{{ rd.reward?.name }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="font-cinzel text-xs px-2 py-0.5 rounded-full"
                        [class.bg-yellow-100]="rd.status==='pending'"
                        [class.text-yellow-700]="rd.status==='pending'"
                        [class.bg-green-100]="rd.status==='approved'"
                        [class.text-green-700]="rd.status==='approved'"
                        [class.bg-red-100]="rd.status==='cancelled'"
                        [class.text-red-700]="rd.status==='cancelled'">
                        {{ statusLabel(rd.status) }}
                      </span>
                      <span class="font-cinzel text-xs text-amber-600">💎 {{ rd.reward?.costPoints }} pts</span>
                    </div>
                  </div>
                  @if (rd.status === 'pending') {
                    <div class="flex gap-2 mt-2">
                      <button (click)="updateStatus(rd.id, 'approved')"
                        [disabled]="processingId() === rd.id"
                        class="btn-epic btn-green text-xs py-1 px-3 flex-1">
                        ✓ Aprobar
                      </button>
                      <button (click)="updateStatus(rd.id, 'cancelled')"
                        [disabled]="processingId() === rd.id"
                        class="btn-epic btn-red text-xs py-1 px-3 flex-1">
                        ✗ Rechazar
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

      </div>
    }
  </div>
  `,
})
export class TeacherRewardsComponent implements OnInit {
  classrooms     = signal<any[]>([]);
  rewards        = signal<any[]>([]);
  redemptions    = signal<any[]>([]);
  loading        = signal(false);
  redemptionsLoading = signal(false);
  saving         = signal(false);
  processingId   = signal<string | null>(null);
  selectedClassroom = '';
  showCreate     = false;
  toasts         = signal<{ id: number; message: string; type: string; icon: string; fadingOut: boolean }[]>([]);

  newReward = {
    name: '', description: '', costPoints: 50, type: 'xp_boost',
    rewardType: 'experience', rarity: 'common', xpBonus: 0,
  };

  pendingCount = () => this.redemptions().filter((r) => r.status === 'pending').length;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/classrooms/mine`).subscribe({
      next: (res) => this.classrooms.set(res),
    });
  }

  onClassroomChange() {
    if (!this.selectedClassroom) return;
    this.loadRewards();
    this.loadRedemptions();
  }

  loadRewards() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/rewards/classroom/${this.selectedClassroom}`).subscribe({
      next: (res) => { this.rewards.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadRedemptions() {
    this.redemptionsLoading.set(true);
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/rewards/classroom/${this.selectedClassroom}/redemptions`).subscribe({
      next: (res) => { this.redemptions.set(res.data); this.redemptionsLoading.set(false); },
      error: () => this.redemptionsLoading.set(false),
    });
  }

  createReward() {
    if (!this.newReward.name || !this.newReward.description || this.saving()) return;
    this.saving.set(true);
    const body = { ...this.newReward, classroomId: this.selectedClassroom };
    this.http.post<any>(`${environment.apiUrl}/rewards`, body).subscribe({
      next: (r) => {
        this.rewards.update((list) => [...list, r]);
        this.newReward = { name: '', description: '', costPoints: 50, type: 'xp_boost', rewardType: 'experience', rarity: 'common', xpBonus: 0 };
        this.showCreate = false;
        this.showToast(`"${r.name}" creada`, 'success', '🎁');
        this.saving.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al crear', 'error', '❌');
        this.saving.set(false);
      },
    });
  }

  toggleStatus(r: any) {
    this.http.patch(`${environment.apiUrl}/rewards/${r.id}/toggle-status`, {}).subscribe({
      next: (updated: any) => {
        this.rewards.update((list) => list.map((x) => x.id === r.id ? { ...x, isActive: updated.isActive } : x));
        this.showToast(`"${r.name}" ${updated.isActive ? 'activada' : 'desactivada'}`, 'info', '🔄');
      },
      error: (err) => this.showToast(err.error?.message ?? 'Error', 'error', '❌'),
    });
  }

  updateStatus(id: string, status: 'approved' | 'cancelled') {
    if (this.processingId()) return;
    this.processingId.set(id);
    this.http.patch(`${environment.apiUrl}/rewards/student-reward/${id}/status`, { status }).subscribe({
      next: () => {
        this.redemptions.update((list) =>
          list.map((r) => r.id === id ? { ...r, status } : r)
        );
        this.showToast(status === 'approved' ? '✅ Canje aprobado' : '✗ Canje rechazado', status === 'approved' ? 'success' : 'info', status === 'approved' ? '✅' : '✗');
        this.processingId.set(null);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error', 'error', '❌');
        this.processingId.set(null);
      },
    });
  }

  rarityColor(r: string): string {
    const m: Record<string, string> = { legendary: '#d97706', epic: '#7c3aed', rare: '#2563eb', common: '#6b7280' };
    return m[r] ?? '#6b7280';
  }

  rarityBg(r: string): string {
    const m: Record<string, string> = { legendary: '#fef3c7', epic: '#ede9fe', rare: '#dbeafe', common: '#f3f4f6' };
    return m[r] ?? '#f3f4f6';
  }

  rarityLabel(r: string): string {
    const m: Record<string, string> = { legendary: '⭐ Legendaria', epic: '💜 Épica', rare: '💙 Rara', common: '📌 Común' };
    return m[r] ?? r;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { pending: '⏳ Pendiente', approved: '✅ Aprobado', delivered: '📦 Entregado', cancelled: '✗ Rechazado' };
    return m[s] ?? s;
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success', icon = '🎁') {
    const id = Date.now();
    this.toasts.update(t => [...t, { id, message, type, icon, fadingOut: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, fadingOut: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 500);
    }, 4000);
  }
}
