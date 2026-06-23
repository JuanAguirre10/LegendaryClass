# Dark Mode + Settings Page + Design Fixes

## Overview

Add a class-based dark mode system to LegendaryClass (Angular 18 + Tailwind CSS) with:
- `ThemeService`: detects system preference, allows manual override (light/dark/system), persists in `localStorage`
- `ThemeToggleComponent`: small standalone toggle cycling system → dark → light → system
- `SettingsPageComponent`: shared settings page for all 4 roles (theme, account, security)
- CSS custom properties in `styles.css` driving all custom classes in dark mode
- `dark:` Tailwind variants on all hardcoded text/bg utilities across all feature components
- Profile page cleanup (password + avatar move to Settings)

---

## Design Decisions

### Dark palette — Dark RPG Épico
- Body overlay in dark: `rgba(15,23,42,0.92)` over `fondo.png`
- Card surface: `rgba(30,41,59,0.97)` (slate-800)
- Nav surface: `rgba(15,23,42,0.97)` (slate-900 near-opaque)
- Text primary: `#f1f5f9` (slate-100)
- Text secondary: `#94a3b8` (slate-400)
- Border: `rgba(251,191,36,0.15)` (faint gold)
- Shadow: `rgba(0,0,0,0.4)`

### Theme persistence
`localStorage` key: `lc-theme`; values: `'light' | 'dark' | 'system'` (default `'system'`).
System detection via `window.matchMedia('(prefers-color-scheme: dark)')` with `addEventListener('change', ...)` listener.

### Dark class placement
Class `dark` is added/removed on `document.documentElement` (`<html>`). This is the standard Tailwind `darkMode: 'class'` approach.

### Inline styles with dark gradients
Hero cards (profile header, dashboard header) already use dark gradients — no change needed. Only Tailwind utility classes (`text-gray-*`, `bg-white`, `bg-gray-*`, `border-gray-*`) need `dark:` variants. Custom CSS classes (`.legendary-card`, `.legendary-nav`, etc.) get dark mode via CSS variables.

### Settings page
Single `SettingsPageComponent` at `frontend/src/app/shared/settings/settings-page.component.ts` lazy-loaded by all 4 role routes at path `settings`. Uses `AuthService` signals for current user data. Three sections: Apariencia, Cuenta, Seguridad.

### Profile page changes
`student-profile.component.html`: remove the two bottom cards (Cambiar contraseña + Foto de perfil) since they move to Settings. Profile shows: hero card + stats + XP progress only.

### Backend
No changes needed. `PATCH /users/profile` already supports `{ name }` (`users.controller.ts:29`). `PATCH /users/profile/password` already exists.

---

## File Map

### New files
| File | Purpose |
|---|---|
| `frontend/src/app/core/theme/theme.service.ts` | ThemeService with signals |
| `frontend/src/app/shared/theme-toggle/theme-toggle.component.ts` | Toggle button component |
| `frontend/src/app/shared/settings/settings-page.component.ts` | Settings page TS |
| `frontend/src/app/shared/settings/settings-page.component.html` | Settings page template |

### Modified files
| File | Change |
|---|---|
| `frontend/tailwind.config.js` | Add `darkMode: 'class'` |
| `frontend/src/styles.css` | CSS variables + dark mode for all custom classes |
| `frontend/src/app/features/student/student.routes.ts` | Add `settings` route |
| `frontend/src/app/features/teacher/teacher.routes.ts` | Add `settings` route |
| `frontend/src/app/features/director/director.routes.ts` | Add `settings` route |
| `frontend/src/app/features/parent/parent.routes.ts` | Add `settings` route |
| `frontend/src/app/features/student/profile/student-profile.component.html` | Remove pw+avatar cards |
| Student components (7 files) | `dark:` Tailwind classes + nav toggle/settings link |
| Teacher components (7 files) | `dark:` Tailwind classes + nav toggle/settings link |
| Director + parent components (9 files) | `dark:` Tailwind classes + nav toggle/settings link |
| Auth/public pages (login, register) | `dark:` Tailwind classes |

---

## Task 1 — ThemeService + ThemeToggleComponent + Tailwind config

### 1a. `frontend/tailwind.config.js`
Add `darkMode: 'class'` as first top-level property (before `content`).

### 1b. `frontend/src/app/core/theme/theme.service.ts`

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'lc-theme';

  readonly mode = signal<ThemeMode>(
    (localStorage.getItem(this.STORAGE_KEY) as ThemeMode) ?? 'system'
  );

  private readonly systemDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  readonly isDark = computed(() => {
    const m = this.mode();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return this.systemDark();
  });

  constructor() {
    // Listen to OS theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => this.systemDark.set(e.matches));

    // Apply dark class whenever isDark changes
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }

  /** Cycles: system → dark → light → system */
  cycleMode(): void {
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'dark',
      dark: 'light',
      light: 'system',
    };
    this.setMode(next[this.mode()]);
  }
}
```

### 1c. `frontend/src/app/shared/theme-toggle/theme-toggle.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeMode } from '../../../core/theme/theme.service';

const ICONS: Record<ThemeMode, string> = {
  system: '💻',
  dark:   '🌙',
  light:  '☀️',
};
const LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  dark:   'Nocturno',
  light:  'Claro',
};

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="theme.cycleMode()"
      [title]="label()"
      class="flex items-center gap-1 px-2 py-1.5 rounded-lg font-cinzel text-xs font-semibold transition-all duration-300
             text-gray-600 hover:text-amber-600 hover:bg-amber-50
             dark:text-slate-300 dark:hover:text-amber-400 dark:hover:bg-slate-700"
      aria-label="Cambiar tema">
      <span class="text-base leading-none">{{ icon() }}</span>
    </button>
  `,
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {}
  icon()  { return ICONS[this.theme.mode()]; }
  label() { return LABELS[this.theme.mode()]; }
}
```

---

## Task 2 — Global dark mode in `styles.css`

Approach: add direct `.dark .class {}` override blocks in `styles.css` — cleaner and more reliable than CSS variables for multi-stop gradients. Do NOT attempt to store gradient stop lists in CSS custom properties (they don't compose into `linear-gradient()` via `var()`).

Add these blocks at the END of `styles.css`, after all existing rules:

### 2a. Body overlay dark override

```css
.dark body::before {
  background: linear-gradient(
    135deg,
    rgba(15,23,42,0.92) 0%,
    rgba(15,23,42,0.88) 25%,
    rgba(15,23,42,0.90) 50%,
    rgba(15,23,42,0.88) 75%,
    rgba(15,23,42,0.92) 100%
  );
}
```

### 2b. Card dark overrides

```css
.dark .legendary-card {
  background: linear-gradient(135deg,
    rgba(30,41,59,0.97) 0%,
    rgba(30,41,59,0.94) 50%,
    rgba(30,41,59,0.97) 100%);
  border-color: rgba(251,191,36,0.15);
  box-shadow:
    0 10px 30px rgba(0,0,0,0.40),
    0 0 20px rgba(251,191,36,0.06),
    inset 0 1px 0 rgba(255,255,255,0.05);
}
.dark .legendary-card:hover {
  box-shadow:
    0 20px 50px rgba(0,0,0,0.55),
    0 0 30px rgba(251,191,36,0.10),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

.dark .adventure-card {
  background: linear-gradient(135deg,
    rgba(30,41,59,0.97) 0%,
    rgba(30,41,59,0.94) 50%,
    rgba(30,41,59,0.97) 100%);
  border-color: rgba(251,191,36,0.15);
  box-shadow:
    0 15px 40px rgba(0,0,0,0.45),
    0 0 30px rgba(34,197,94,0.05),
    inset 0 2px 0 rgba(255,255,255,0.03);
}

.dark .glass-panel {
  background: rgba(15,23,42,0.90);
  border-color: rgba(251,191,36,0.12);
}
```

### 2c. Nav dark override

```css
.dark .legendary-nav {
  background: linear-gradient(135deg,
    rgba(15,23,42,0.97) 0%,
    rgba(15,23,42,0.95) 50%,
    rgba(15,23,42,0.97) 100%);
  border-bottom-color: rgba(251,191,36,0.20);
  box-shadow: 0 2px 15px rgba(0,0,0,0.3), 0 0 15px rgba(217,119,6,0.06);
}

.dark .nav-link-epic {
  color: #cbd5e1;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.dark .nav-link-epic:hover {
  color: #fbbf24;
  border-bottom-color: rgba(251,191,36,0.5);
}
.dark .nav-link-epic.active {
  color: #fbbf24;
  border-bottom-color: #f59e0b;
  background: linear-gradient(135deg, rgba(217,119,6,0.15) 0%, rgba(245,158,11,0.10) 100%);
}
```

### 2d. Input dark override

```css
.dark .input-epic {
  background: rgba(30,41,59,0.90);
  border-color: rgba(71,85,105,0.7);
  color: #e2e8f0;
}
.dark .input-epic::placeholder {
  color: rgba(148,163,184,0.6);
}
.dark .input-epic:focus {
  border-color: rgba(99,102,241,0.8);
  background: rgba(30,41,59,0.95);
  box-shadow: 0 0 15px rgba(99,102,241,0.2), 0 2px 8px rgba(0,0,0,0.2);
}
```

### 2e. Scrollbar dark override

```css
.dark ::-webkit-scrollbar-track { background: #1e293b; }
.dark ::-webkit-scrollbar-thumb { background: #d97706; }
```

---

## Task 3 — SettingsPageComponent + routes

### 3a. `frontend/src/app/shared/settings/settings-page.component.ts`

Standalone component. Imports: `CommonModule`, `FormsModule`, `ThemeToggleComponent`, `AvatarUploadComponent`.

Signals:
- `name = signal('')` — bound to name input (initialized from `AuthService.user()?.name`)
- `savingName = signal(false)`
- `nameMessage = signal<{text:string;type:'success'|'error'}|null>(null)`
- `newPassword = ''`, `confirmPassword = ''`
- `savingPw = signal(false)`
- `pwMessage = signal<{text:string;type:'success'|'error'}|null>(null)`
- `currentTheme = this.themeService.mode` (direct signal reference)

Methods:
- `saveName()` — `PATCH /users/profile` with `{ name: this.name() }`, updates `nameMessage`
- `changePassword()` — same validation as old profile (min 8 chars, must match), `PATCH /users/profile/password`
- `onAvatarUploaded(avatar: string)` — calls `authService.updateAvatar(avatar)` if that method exists, or just shows success message

The component has its own nav (same structure as existing role navs — copies the role-appropriate nav). Actually, since this is a shared component used by all roles, it should NOT include a nav (each role route wraps it inside its authenticated layout). The settings page renders as a content-only page; each role's nav is already part of the router outlet hierarchy.

Wait — looking at the existing components: there is no shared layout shell. Each component renders its own `<nav>` + content. So `SettingsPageComponent` must render its own nav. Since the role differs, use `AuthService.user()?.role` to determine which nav back-link to render.

Actually, simpler: render a generic settings nav with just:
- Logo left: "⚔️ LegendaryClass"
- Nav links based on role (from `authService.user()?.role`)
- Theme toggle + back button

Use a `backRoute()` computed that returns `'/student/dashboard'` | `'/teacher/dashboard'` | etc. based on role.

### 3b. Settings HTML structure

Three sections in a `max-w-2xl mx-auto` container:

**Section 1 — Apariencia**
```html
<div class="legendary-card p-7 mb-6">
  <h3>🎨 Apariencia</h3>
  <div class="flex gap-3 mt-4">
    <button (click)="theme.setMode('light')"  [class.ring-2]="theme.mode()==='light'">☀️ Claro</button>
    <button (click)="theme.setMode('dark')"   [class.ring-2]="theme.mode()==='dark'">🌙 Nocturno</button>
    <button (click)="theme.setMode('system')" [class.ring-2]="theme.mode()==='system'">💻 Sistema</button>
  </div>
</div>
```
Active button has `ring-2 ring-amber-500` and `bg-amber-50 dark:bg-slate-700` styling.

**Section 2 — Cuenta**
```html
<div class="legendary-card p-7 mb-6">
  <h3>👤 Cuenta</h3>
  <!-- Name field (editable) -->
  <label>Nombre</label>
  <input [(ngModel)]="name" class="input-epic" />
  <button (click)="saveName()">Guardar</button>
  <!-- Email (readonly) -->
  <label>Email</label>
  <p class="input-epic opacity-60">{{ auth.user()?.email }}</p>
  <!-- Avatar -->
  <h4>Foto de perfil</h4>
  <app-avatar-upload ... />
</div>
```

**Section 3 — Seguridad**
```html
<div class="legendary-card p-7">
  <h3>🔒 Seguridad</h3>
  <input [(ngModel)]="newPassword" type="password" placeholder="Nueva contraseña" class="input-epic" />
  <input [(ngModel)]="confirmPassword" type="password" placeholder="Confirmar" class="input-epic" />
  <button (click)="changePassword()">Actualizar contraseña</button>
</div>
```

### 3c. Add `settings` route to all 4 role route files

```typescript
// In studentRoutes, teacherRoutes, directorRoutes, parentRoutes:
{
  path: 'settings',
  loadComponent: () =>
    import('../../../shared/settings/settings-page.component')
      .then(m => m.SettingsPageComponent),
}
```

(Adjust relative import path per route file location.)

---

## Task 4 — Student components: dark mode + nav update + profile cleanup

### Scope
Files: `student-dashboard.component.html`, `student-classrooms.component.html`, `classroom-detail.component.html`, `student-quests.component.html`, `student-achievements.component.html`, `student-rewards.component.html`, `student-profile.component.html`

### Nav changes (in each student component nav)
1. Import `ThemeToggleComponent` in each `.ts` file's `imports` array
2. Add `<app-theme-toggle />` before the back button in each nav
3. Add `<a routerLink="/student/settings" class="nav-link-epic">⚙️ Config</a>` to the nav links list

### Common dark mode pattern for Tailwind classes
In ALL templates, apply these substitutions:
- `text-gray-900` → `text-gray-900 dark:text-slate-50`
- `text-gray-800` → `text-gray-800 dark:text-slate-100`
- `text-gray-700` → `text-gray-700 dark:text-slate-200`
- `text-gray-600` → `text-gray-600 dark:text-slate-300`
- `text-gray-500` → `text-gray-500 dark:text-slate-400`
- `text-gray-400` → `text-gray-400 dark:text-slate-500`
- `bg-white` → `bg-white dark:bg-slate-800`
- `bg-gray-50` → `bg-gray-50 dark:bg-slate-900`
- `bg-gray-100` → `bg-gray-100 dark:bg-slate-700`
- `border-gray-200` → `border-gray-200 dark:border-slate-700`
- `border-gray-300` → `border-gray-300 dark:border-slate-600`
- Modals: `bg-white rounded-2xl` → `bg-white dark:bg-slate-800 rounded-2xl`
- `text-purple-600` → `text-purple-600 dark:text-purple-400`
- `bg-purple-600` stays (button bg — keep as is, dark enough)
- `hover:bg-gray-100` → `hover:bg-gray-100 dark:hover:bg-slate-700`

### Profile cleanup (`student-profile.component.html`)
Remove the two bottom `adventure-card` sections:
- `<!-- Cambiar contraseña -->` block (lines ~133–151)
- `<!-- Foto de perfil -->` block (lines ~153–158)

Also in `student-profile.component.ts`: remove `newPassword`, `confirmPassword`, `savingPw`, `pwMessage`, `changePassword()` method and the `FormsModule` import (no longer needed in profile; moved to settings).

---

## Task 5 — Teacher components: dark mode + nav update

### Scope
Files: `teacher-dashboard.component.html`, `teacher-classrooms.component.html` (teacher), `classroom-detail.component.html` (teacher), `teacher-behaviors.component.html`, `teacher-quests.component.html`, `teacher-rewards.component.html`, `teacher-templates.component.html`

Plus corresponding `.ts` files for ThemeToggleComponent import.

### Nav changes
Same pattern as student but link to `/teacher/settings`.
Add `ThemeToggleComponent` import to each `.ts`.

### Dark mode pattern
Apply same Tailwind substitutions from Task 4. Teacher templates have many `bg-white` cards and `text-gray-*` texts — all need dark variants.

---

## Task 6 — Director + parent components: dark mode + nav update

### Scope
Files: `director-dashboard.component.html`, `director-classrooms.component.html`, `director-teachers.component.html`, `director-students.component.html`, `director-users.component.html`, `director-reports.component.html`, `director-courses.component.html`, `director-templates.component.html`, `parent-dashboard.component.html`

Plus corresponding `.ts` files.

### Nav changes
- Director nav links point to `/director/settings`
- Parent nav links point to `/parent/settings`

### Dark mode pattern
Same Tailwind substitutions as Tasks 4–5.

---

## Task 7 — Auth + public pages: dark mode

### Scope
Files: `login.component.html`, `register.component.html`, public layout + pages (`public-layout.component.html`, `home-page.component.html`, `features-page.component.html`, `how-it-works-page.component.html`, `pricing-page.component.html`, `faq-page.component.html`, `characters-page.component.html`)

### Auth pages
Login + register already use `.epic-header` or dark gradient backgrounds. Apply dark substitutions to any `bg-white` form containers and `text-gray-*` labels.

### Public pages
Apply dark substitutions. Note: public pages may have custom inline styles for sections; convert any `bg-white` section backgrounds to use `bg-white dark:bg-slate-900`.

---

## Global Constraints

- Angular 18 standalone components — no NgModules. Every new component uses `standalone: true`.
- `ThemeToggleComponent` must be added to the `imports: []` array of every component that uses `<app-theme-toggle />`.
- `ThemeService` is `providedIn: 'root'` — no module registration needed.
- Never add Co-Authored-By to commits — attribute solely to JuanAguirre10.
- Dark mode for custom CSS classes (`.legendary-card`, `.legendary-nav`, `.adventure-card`, `.glass-panel`, `.input-epic`, `.nav-link-epic`) is implemented via direct `.dark .class {}` override blocks appended at the END of `styles.css`. Do NOT use CSS custom properties for gradient stop lists — they don't compose into `linear-gradient()` via `var()`.
- `darkMode: 'class'` must be added to `tailwind.config.js` before any dark: utility classes will work.
- Settings page import path from student.routes.ts: `'../../shared/settings/settings-page.component'`; from teacher/director/parent routes: `'../../shared/settings/settings-page.component'` (same since all are under `features/*/`).
- Verify: after `PATCH /users/profile` for name update, the profile signal in SettingsPageComponent should update the displayed name — call `GET /users/profile` again or update the signal directly from the response.

---

## Testing Checklist

After implementation:
- [ ] Toggle cycles correctly: 💻 → 🌙 → ☀️ → 💻
- [ ] Dark class appears on `<html>` when dark mode is active
- [ ] `localStorage.getItem('lc-theme')` persists through page reload
- [ ] System preference auto-detects on first visit (no localStorage entry)
- [ ] Settings page loads for all 4 roles (student, teacher, director, parent)
- [ ] Settings/Apariencia: clicking each mode button activates it with gold ring
- [ ] Settings/Cuenta: name update saves and shows success message
- [ ] Settings/Seguridad: password change works (min 8 chars, match validation)
- [ ] Settings/Avatar: upload works
- [ ] Student profile no longer shows password/avatar sections
- [ ] All navs have ⚙️ link + toggle
- [ ] No `bg-white` without `dark:bg-slate-800` pair in card modals
- [ ] Custom CSS classes (legendary-card, legendary-nav) look correct in both modes
