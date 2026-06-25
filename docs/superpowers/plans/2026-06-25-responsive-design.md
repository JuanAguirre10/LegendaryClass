# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every role dashboard and sub-page fully usable on mobile (≥360px) and tablet (≥640px) without touching desktop layout (≥1024px).

**Architecture:** Each component owns its own navbar (no shared nav component). Hamburger state lives as a local `menuOpen = false` boolean per component. Changes are HTML/class-only except for the `menuOpen` property addition to `.ts` files. Public pages (home, pricing, features, faq, how-it-works) are already responsive and are out of scope.

**Tech Stack:** Angular 18 standalone, TailwindCSS v3 (default sm/md/lg breakpoints), no new dependencies.

## Global Constraints

- Desktop layout at `lg:` (≥1024px) must remain pixel-identical — never remove or override `lg:` classes
- Only add/change Tailwind classes and `menuOpen` boolean — no logic, services, or routing changes
- Do not touch: colors, gradients, animations, fonts, auth, guards, services, `tailwind.config.js`
- Public pages are out of scope
- Build must pass: `npm run build:prod` from `frontend/` with zero errors

---

## Hamburger overlay HTML pattern (reuse in every navbar task)

Every nav gets this hamburger button inside the existing right-side flex div:

```html
<!-- Hamburger — mobile only -->
<button class="md:hidden flex flex-col justify-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors"
        (click)="menuOpen = !menuOpen" aria-label="Abrir menú">
  <span class="block w-6 h-0.5 bg-current transition-all"></span>
  <span class="block w-6 h-0.5 bg-current transition-all"></span>
  <span class="block w-6 h-0.5 bg-current transition-all"></span>
</button>
```

And this overlay goes **immediately after** `</nav>`, before any other content:

```html
<!-- Mobile menu overlay -->
@if (menuOpen) {
  <div class="fixed inset-0 z-50 md:hidden" (click)="menuOpen = false">
    <div class="absolute inset-0 bg-black/60"></div>
    <div class="absolute top-0 left-0 right-0 legendary-nav shadow-2xl p-4 pt-3"
         (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <span class="legendary-logo text-lg">LegendaryClass</span>
        <button (click)="menuOpen = false"
                class="text-2xl font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Cerrar menú">✕</button>
      </div>
      <div class="flex flex-col gap-1">
        <!-- PASTE SAME LINKS AS DESKTOP NAV HERE, one per line -->
      </div>
    </div>
  </div>
}
```

And in the `.ts` class body (after the last property declaration):

```ts
menuOpen = false;
```

---

## Task 1: Student navbars — hamburger overlay

**Files to modify (all in `frontend/src/app/features/student/`):**
- Modify: `dashboard/student-dashboard.component.html` + `student-dashboard.component.ts`
- Modify: `classrooms/student-classrooms.component.html` + `student-classrooms.component.ts`
- Modify: `achievements/student-achievements.component.html` + `student-achievements.component.ts`
- Modify: `quests/student-quests.component.html` + `student-quests.component.ts`
- Modify: `rewards/student-rewards.component.html` + `student-rewards.component.ts`
- Modify: `profile/student-profile.component.html` + `student-profile.component.ts`
- Modify: `classrooms/classroom-detail.component.html` + `classroom-detail.component.ts`
- Modify: `quests/quest-detail.component.html` + `quest-detail.component.ts`
- Modify: `join-classroom/join-classroom.component.html` + `join-classroom.component.ts`

**Student nav links (use in every overlay):**
```html
<a routerLink="/student/dashboard"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
<a routerLink="/student/classrooms"   routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📚 Dominios</a>
<a routerLink="/student/quests"       routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🗡️ Misiones</a>
<a routerLink="/student/rewards"      routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🛒 Tienda</a>
<a routerLink="/student/achievements" routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Logros</a>
<a routerLink="/student/leaderboard"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🥇 Ranking</a>
```

- [ ] **Step 1: Add hamburger button to student-dashboard.component.html**

  In `student-dashboard.component.html`, locate the right-side flex div inside the nav (line ~100):
  ```html
  <div class="flex items-center gap-3">
    <app-notification-bell />
    <app-user-menu />
  ```
  Add the hamburger button **after** `<app-user-menu />` (before closing `</div>`):
  ```html
    <!-- Hamburger — mobile only -->
    <button class="md:hidden flex flex-col justify-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors"
            (click)="menuOpen = !menuOpen" aria-label="Abrir menú">
      <span class="block w-6 h-0.5 bg-current"></span>
      <span class="block w-6 h-0.5 bg-current"></span>
      <span class="block w-6 h-0.5 bg-current"></span>
    </button>
  ```
  Then add the overlay immediately after `</nav>`:
  ```html
  @if (menuOpen) {
    <div class="fixed inset-0 z-50 md:hidden" (click)="menuOpen = false">
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="absolute top-0 left-0 right-0 legendary-nav shadow-2xl p-4 pt-3"
           (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <span class="legendary-logo text-lg">LegendaryClass</span>
          <button (click)="menuOpen = false"
                  class="text-2xl font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Cerrar menú">✕</button>
        </div>
        <div class="flex flex-col gap-1">
          <a routerLink="/student/dashboard"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
          <a routerLink="/student/classrooms"   routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📚 Dominios</a>
          <a routerLink="/student/quests"       routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🗡️ Misiones</a>
          <a routerLink="/student/rewards"      routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🛒 Tienda</a>
          <a routerLink="/student/achievements" routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Logros</a>
          <a routerLink="/student/leaderboard"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🥇 Ranking</a>
        </div>
      </div>
    </div>
  }
  ```

- [ ] **Step 2: Add menuOpen to student-dashboard.component.ts**

  In `student-dashboard.component.ts`, add after the last property declaration in the class body:
  ```ts
  menuOpen = false;
  ```

- [ ] **Step 3: Repeat for remaining 8 student components**

  Apply the exact same changes (hamburger button + overlay + `menuOpen = false`) to:
  - `student-classrooms.component.html` / `.ts` — same student nav links
  - `student-achievements.component.html` / `.ts` — same student nav links
  - `student-quests.component.html` / `.ts` — same student nav links
  - `student-rewards.component.html` / `.ts` — same student nav links
  - `student-profile.component.html` / `.ts` — same student nav links
  - `classrooms/classroom-detail.component.html` / `.ts` — same student nav links
  - `quests/quest-detail.component.html` / `.ts` — same student nav links
  - `join-classroom/join-classroom.component.html` / `.ts` — same student nav links

  Note: some of these navbars have a "← Volver" button in the right flex div — keep it, add the hamburger after it.

- [ ] **Step 4: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```
  Expected: `Build at:` line with no errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/app/features/student/
  git commit -m "feat(responsive): hamburger overlay nav for student role"
  ```

---

## Task 2: Teacher navbars — hamburger overlay

**Files (note: most teacher components use inline templates in `.ts`):**
- Modify: `teacher/dashboard/teacher-dashboard.component.html` + `.ts`
- Modify: `teacher/templates/teacher-templates.component.html` + `.ts`
- Modify: `teacher/classrooms/teacher-classrooms.component.ts` (inline template)
- Modify: `teacher/behaviors/teacher-behaviors.component.ts` (inline template)
- Modify: `teacher/quests/teacher-quests.component.ts` (inline template)
- Modify: `teacher/quest-submissions/teacher-quest-submissions.component.ts` (inline template)
- Modify: `teacher/rewards/teacher-rewards.component.ts` (inline template)
- Modify: `teacher/classrooms/classroom-detail.component.ts` (inline template)

**Teacher nav links:**
```html
<a routerLink="/teacher/dashboard"          routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
<a routerLink="/teacher/classrooms"         routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏛️ Aulas</a>
<a routerLink="/teacher/behaviors"          routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">⭐ Comportamientos</a>
<a routerLink="/teacher/quests"             routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🗡️ Misiones</a>
<a routerLink="/teacher/quest-submissions"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📋 Entregas</a>
<a routerLink="/teacher/rewards"            routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🎁 Recompensas</a>
<a routerLink="/teacher/leaderboard"        routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Ranking</a>
```

- [ ] **Step 1: Update teacher-dashboard.component.html**

  Locate the right-side flex div in the nav:
  ```html
  <div class="flex items-center gap-3">
    <app-notification-bell />
    <app-user-menu />
  ```
  Add hamburger after `<app-user-menu />`, then add overlay after `</nav>` with teacher nav links (see pattern above).

- [ ] **Step 2: Add menuOpen to teacher-dashboard.component.ts**
  ```ts
  menuOpen = false;
  ```

- [ ] **Step 3: Update teacher-templates.component.html + .ts**

  Same pattern. Teacher templates nav links are the same teacher links above.

- [ ] **Step 4: Update inline-template teacher components**

  For each of `teacher-classrooms`, `teacher-behaviors`, `teacher-quests`, `teacher-quest-submissions`, `teacher-rewards`, `classroom-detail` (teacher):
  - Open the `.ts` file
  - In the inline `template: \`` string, find the right-side flex div in the nav and add the hamburger button
  - Add the overlay block immediately after the closing `</nav>` tag (still inside the template string)
  - Add `menuOpen = false;` to the class body

- [ ] **Step 5: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```
  Expected: zero errors.

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/app/features/teacher/
  git commit -m "feat(responsive): hamburger overlay nav for teacher role"
  ```

---

## Task 3: Director navbars — hamburger overlay

**Files:**
- Modify: `director/dashboard/director-dashboard.component.html` + `.ts`
- Modify: `director/courses/director-courses.component.html` + `.ts`
- Modify: `director/templates/director-templates.component.html` + `.ts`
- Modify: `director/classrooms/director-classrooms.component.ts` (inline)
- Modify: `director/students/director-students.component.ts` (inline)
- Modify: `director/teachers/director-teachers.component.ts` (inline)
- Modify: `director/users/director-users.component.ts` (inline)
- Modify: `director/reports/director-reports.component.ts` (inline)

**Director nav links:**
```html
<a routerLink="/director/dashboard"   routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏰 Inicio</a>
<a routerLink="/director/classrooms"  routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏛️ Aulas</a>
<a routerLink="/director/teachers"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👩‍🏫 Profesores</a>
<a routerLink="/director/students"    routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🎓 Estudiantes</a>
<a routerLink="/director/users"       routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">👥 Usuarios</a>
<a routerLink="/director/reports"     routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">📊 Reportes</a>
<a routerLink="/director/leaderboard" routerLinkActive="active" class="nav-link-epic" (click)="menuOpen = false">🏆 Ranking</a>
```

- [ ] **Step 1: Update director-dashboard.component.html**

  The right-side flex div in the director nav only has `<app-user-menu />`. Add hamburger after it:
  ```html
  <div class="flex items-center gap-3">
    <app-user-menu />
    <!-- Hamburger — mobile only -->
    <button class="md:hidden flex flex-col justify-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors"
            (click)="menuOpen = !menuOpen" aria-label="Abrir menú">
      <span class="block w-6 h-0.5 bg-current"></span>
      <span class="block w-6 h-0.5 bg-current"></span>
      <span class="block w-6 h-0.5 bg-current"></span>
    </button>
  </div>
  ```
  Then add overlay after `</nav>` with director nav links.

- [ ] **Step 2: Add menuOpen to director-dashboard.component.ts**
  ```ts
  menuOpen = false;
  ```

- [ ] **Step 3: Update director-courses.component.html + .ts and director-templates.component.html + .ts**

  Same pattern with director nav links.

- [ ] **Step 4: Update inline-template director components**

  For each of `director-classrooms`, `director-students`, `director-teachers`, `director-users`, `director-reports`:
  - Open the `.ts` file, find the inline template string
  - Add hamburger button to right-side flex div in nav
  - Add overlay after `</nav>` with director nav links
  - Add `menuOpen = false;` to class body

- [ ] **Step 5: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/app/features/director/
  git commit -m "feat(responsive): hamburger overlay nav for director role"
  ```

---

## Task 4: Parent navbar + student dashboard character panel

**Files:**
- Modify: `parent/dashboard/parent-dashboard.component.html` + `.ts`
- Modify: `student/dashboard/student-dashboard.component.html`

- [ ] **Step 1: Parent navbar hamburger**

  Parent dashboard has no nav links (only `<app-user-menu />`), so the hamburger is optional — but add it for consistency. The overlay in this case has no links, just the close button. However, since the parent has no nav links, skip the overlay and just ensure the layout is correct. Actually, if parent has no nav links the hamburger is unnecessary — skip this for parent.

  Instead, ensure the parent nav container padding is responsive:
  In `parent-dashboard.component.html` line 3:
  ```html
  <!-- Change: -->
  <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
  <!-- To: -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
  ```

- [ ] **Step 2: Fix student dashboard character panel height**

  In `student-dashboard.component.html`, locate line ~137:
  ```html
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6" style="height: 650px;">
  ```
  Change to:
  ```html
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-auto lg:h-[650px]">
  ```
  (Remove the inline `style="height: 650px"` entirely — use Tailwind class instead.)

- [ ] **Step 3: Fix left stats panel height**

  Line ~140:
  ```html
  <div class="character-stats-panel rounded-2xl p-5 overflow-y-auto" style="height: 100%;">
  ```
  Change to:
  ```html
  <div class="character-stats-panel rounded-2xl p-5 overflow-y-auto lg:h-full">
  ```

- [ ] **Step 4: Fix right character display panel**

  Line ~208:
  ```html
  <div class="lg:col-span-2" style="height: 100%;">
    <div class="relative rounded-2xl overflow-hidden"
      style="background: ...; height: 100%;">
  ```
  Change to:
  ```html
  <div class="lg:col-span-2 lg:h-full">
    <div class="relative rounded-2xl overflow-hidden min-h-[320px] lg:h-full"
      style="background: ...;">
  ```
  (Keep the `style` for background gradient, only remove `height: 100%` from it.)

- [ ] **Step 5: Fix the upgrade stat button inline style**

  Line ~190, the upgrade button has a long inline style. Replace `width: 38px; height: 30px` with Tailwind classes. Change:
  ```html
  <button (click)="upgradeStat(stat.key)"
    ...
    style="background: linear-gradient(135deg, #059669, #047857); color: white; border-radius: 4px; width: 38px; height: 30px; font-size: 0.55rem; font-weight: bold; border: 1px solid rgba(16,185,129,0.3); flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; line-height: 1.1;">
  ```
  To:
  ```html
  <button (click)="upgradeStat(stat.key)"
    ...
    class="w-10 h-8 text-[0.55rem] font-bold flex-shrink-0 flex flex-col items-center justify-center rounded cursor-pointer transition-all duration-200"
    style="background: linear-gradient(135deg, #059669, #047857); color: white; border: 1px solid rgba(16,185,129,0.3); line-height: 1.1;">
  ```

- [ ] **Step 6: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/src/app/features/student/dashboard/ frontend/src/app/features/parent/
  git commit -m "feat(responsive): character panel height responsive, parent nav padding"
  ```

---

## Task 5: Student components — padding, grids, inline sizes

**Files:**
- Modify: `student/classrooms/student-classrooms.component.html`
- Modify: `student/classrooms/classroom-detail.component.html`
- Modify: `student/achievements/student-achievements.component.html`
- Modify: `student/quests/student-quests.component.html`
- Modify: `student/quests/quest-detail.component.html`
- Modify: `student/rewards/student-rewards.component.html`
- Modify: `student/profile/student-profile.component.html`
- Modify: `student/join-classroom/join-classroom.component.html`
- Modify: `student/character-select/character-select.component.html`
- Modify: `shared/classroom-ranking/classroom-ranking.component.ts` (or .html if exists)

**Padding rule:** Every `px-6` on a page-level wrapper → `px-4 sm:px-6 lg:px-8`. Every `px-8` on a section header → `px-4 md:px-8`. Every `py-8` on a main section → `py-6 md:py-8`.

**Grid rule:** `grid-cols-1 lg:grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. `grid-cols-1 lg:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

- [ ] **Step 1: Fix student-classrooms.component.html**

  Line 3 in nav: `px-6` → `px-4 sm:px-6 lg:px-8`
  Line 29 main wrapper: `py-8` → `py-6 md:py-8`, `px-4 sm:px-6` (already partially done — verify and extend)
  Any `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` cards: ensure `sm:grid-cols-2` is present.

- [ ] **Step 2: Fix student-achievements.component.html**

  Nav container: `px-6` → `px-4 sm:px-6 lg:px-8`
  Main content wrapper: `px-4 py-6` (already at line 20) — verify `max-w-5xl mx-auto` is present.
  Achievement grid (find `grid-cols-1` or `grid-cols-2`): add `sm:` breakpoint if missing.
  Achievement icon with `width:60px; height:60px` style: replace with class `w-14 h-14 sm:w-16 sm:h-16` and remove inline style.

- [ ] **Step 3: Fix student-quests.component.html**

  Nav container: `px-6` → `px-4 sm:px-6 lg:px-8`
  Quest card grid: add `sm:grid-cols-2` if jumping from 1 to 3 columns.
  Header padding `px-8` → `px-4 md:px-8`.

- [ ] **Step 4: Fix quest-detail.component.html**

  Nav container: `px-6` → `px-4 sm:px-6 lg:px-8`
  Any `max-width: 1400px` inline style → replace with `max-w-7xl mx-auto` class.
  Inner sections `px-8` → `px-4 md:px-8`.

- [ ] **Step 5: Fix student-rewards.component.html**

  Nav container: `px-6` → `px-4 sm:px-6 lg:px-8`
  Reward card grid: ensure `sm:grid-cols-2` step present between 1 and 3/4 columns.
  Header section `p-8` → `p-4 md:p-8`.

- [ ] **Step 6: Fix student-profile.component.html**

  Main wrapper line 20: `px-6` → `px-4 sm:px-6 lg:px-8`.
  Profile hero card `p-8` → `p-4 sm:p-8`.
  Stat grid: add `sm:` breakpoint if missing.

- [ ] **Step 7: Fix classroom-detail.component.html (student)**

  Nav + content padding: same `px-6` → `px-4 sm:px-6 lg:px-8` pattern.
  Any ranking or student list grid: add `sm:` column step.

- [ ] **Step 8: Fix character-select.component.html**

  Character grid currently `grid-cols-2 lg:grid-cols-5` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

- [ ] **Step 9: Fix classroom-ranking component**

  Open `shared/classroom-ranking/classroom-ranking.component.ts` (or .html).
  Find ranking table/grid. If it has `grid-cols-1 lg:grid-cols-X`, add `sm:` step.
  Ensure table wrapper has `overflow-x-auto` so it scrolls horizontally on mobile rather than breaking layout.

- [ ] **Step 10: Fix join-classroom.component.html**

  Nav + form container: `px-6` → `px-4 sm:px-6`. Form card: ensure `w-full max-w-md mx-auto`.

- [ ] **Step 11: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```

- [ ] **Step 12: Commit**
  ```bash
  git add frontend/src/app/features/student/ frontend/src/app/features/shared/
  git commit -m "feat(responsive): student components padding, grids, inline sizes"
  ```

---

## Task 6: Teacher components — padding, grids, modals

**Files:**
- Modify: `teacher/dashboard/teacher-dashboard.component.html`
- Modify: `teacher/templates/teacher-templates.component.html`
- Modify: `teacher/classrooms/teacher-classrooms.component.ts` (inline)
- Modify: `teacher/behaviors/teacher-behaviors.component.ts` (inline)
- Modify: `teacher/quests/teacher-quests.component.ts` (inline)
- Modify: `teacher/quest-submissions/teacher-quest-submissions.component.ts` (inline)
- Modify: `teacher/rewards/teacher-rewards.component.ts` (inline)
- Modify: `teacher/classrooms/classroom-detail.component.ts` (inline)

- [ ] **Step 1: Fix teacher-dashboard.component.html**

  Main content wrapper line 46: `px-6` → `px-4 sm:px-6 lg:px-8`.
  Stats grid (`grid-cols-1 sm:grid-cols-3`) — already has `sm:`, verify no further issues.
  Any `text-4xl` or `text-5xl` heading without breakpoints → `text-2xl sm:text-3xl lg:text-4xl`.

- [ ] **Step 2: Fix teacher-templates.component.html**

  Nav container `px-6` → `px-4 sm:px-6 lg:px-8`.
  Content padding same pattern.
  Template card grid: add `sm:grid-cols-2` if missing.

- [ ] **Step 3: Fix inline-template teacher components**

  For each of `teacher-classrooms`, `teacher-behaviors`, `teacher-quests`, `teacher-quest-submissions`, `teacher-rewards`, `classroom-detail` (teacher):
  - Inside the inline `template` string, apply the same padding and grid rules:
    - Nav div `px-6` → `px-4 sm:px-6 lg:px-8`
    - Main wrapper `px-6` → `px-4 sm:px-6 lg:px-8`, `py-8` → `py-6 md:py-8`
    - Any modal: `w-[600px]` → `w-full max-w-lg mx-4 sm:mx-auto`, `w-96` → `w-full max-w-sm mx-4 sm:mx-auto`
    - Any grid missing `sm:` step: add it

- [ ] **Step 4: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/app/features/teacher/
  git commit -m "feat(responsive): teacher components padding, grids, modals"
  ```

---

## Task 7: Director components — padding, grids, modals

**Files:**
- Modify: `director/dashboard/director-dashboard.component.html`
- Modify: `director/courses/director-courses.component.html`
- Modify: `director/templates/director-templates.component.html`
- Modify: `director/classrooms/director-classrooms.component.ts` (inline)
- Modify: `director/students/director-students.component.ts` (inline)
- Modify: `director/teachers/director-teachers.component.ts` (inline)
- Modify: `director/users/director-users.component.ts` (inline)
- Modify: `director/reports/director-reports.component.ts` (inline)

- [ ] **Step 1: Fix director-dashboard.component.html**

  Nav container `px-6` → `px-4 sm:px-6 lg:px-8`.
  Line 34: `px-6 pt-6` → `px-4 sm:px-6 pt-6`.
  Stats grid: director dashboard uses `grid-cols-2 md:grid-cols-4` for 8 stats — this is good. Verify `gap-4` is present for mobile.
  Any section `py-8 px-6` → `py-6 md:py-8 px-4 sm:px-6 lg:px-8`.

- [ ] **Step 2: Fix director-courses.component.html and director-templates.component.html**

  Same padding pattern. Course/template card grids: add `sm:grid-cols-2` if missing between 1 and 3+ columns.

- [ ] **Step 3: Fix inline-template director components**

  For each of `director-classrooms`, `director-students`, `director-teachers`, `director-users`, `director-reports`:
  - In the inline template string, apply:
    - Nav div `px-6` → `px-4 sm:px-6 lg:px-8`
    - Content wrappers `px-6` → `px-4 sm:px-6 lg:px-8`, `py-8` → `py-6 md:py-8`
    - Tables: wrap in `<div class="overflow-x-auto">` if not already wrapped
    - Any modal: `w-[600px]` → `w-full max-w-lg mx-4 sm:mx-auto`
    - Any grid missing `sm:` step: add it

- [ ] **Step 4: Build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -20
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/app/features/director/
  git commit -m "feat(responsive): director components padding, grids, modals"
  ```

---

## Task 8: Auth components — responsive fixes

**Files:**
- Modify: `auth/login/login.component.html`
- Modify: `auth/register/register.component.html`

- [ ] **Step 1: Fix login.component.html**

  Ensure login card uses `w-full max-w-md mx-auto px-4` so it doesn't overflow on phones.
  Any fixed width on the card (`w-[400px]`, `w-96`) → `w-full max-w-sm mx-4 sm:mx-auto`.

- [ ] **Step 2: Fix register.component.html**

  Same pattern. Multi-column form fields (`grid-cols-2` for name fields) → `grid-cols-1 sm:grid-cols-2`.

- [ ] **Step 3: Final full build check**
  ```bash
  cd frontend && npm run build:prod 2>&1 | tail -30
  ```
  Expected: zero errors, zero warnings about template issues.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/app/features/auth/
  git commit -m "feat(responsive): auth components mobile layout"
  ```

---

## Verification checklist (manual, after all tasks)

Open Chrome DevTools → Toggle device toolbar. Test each URL at 375px (iPhone SE) and 768px (iPad):

- [ ] `/student/dashboard` — no horizontal scroll, nav hamburger opens overlay, character panel stacks vertically
- [ ] `/student/classrooms` — grid 1→2→3 columns
- [ ] `/student/quests` — quest cards visible, no overflow
- [ ] `/student/rewards` — reward cards visible
- [ ] `/student/achievements` — achievement icons visible
- [ ] `/teacher/dashboard` — nav hamburger works, stat cards visible
- [ ] `/teacher/classrooms` — table scrollable or grid adapts
- [ ] `/director/dashboard` — stats grid 2 cols on mobile
- [ ] `/parent/dashboard` — content fits
- [ ] Desktop 1280px on all above — visually identical to before
