# Responsive Design — LegendaryClass Frontend

**Date:** 2026-06-25
**Scope:** Angular 18 frontend — web, tablet, mobile
**Constraint:** Desktop layout (≥1024px) must remain pixel-identical to current

---

## Goal

Make all role dashboards (student, teacher, director, parent) and their sub-pages fully usable on mobile phones (≥360px) and tablets (≥640px) without altering any visual design, colors, animations, or desktop layout.

---

## Section 1 — Shared Layout Infrastructure

### Navbar hamburger (4 role navbars)

Each role navbar (`student`, `teacher`, `director`, `parent`) gets:

- A hamburger button `md:hidden` on the right side of the navbar
- An overlay `fixed inset-0 z-50` with `bg-black/50` backdrop
- A panel that drops from the top containing the same links as the desktop nav plus a close (✕) button
- Closes on: backdrop tap, link navigation, close button
- Open/closed state via local boolean (`menuOpen = false`) — no service needed
- All 4 navbars share the same HTML pattern (copy-paste with role-specific link lists)

### Container padding scale

Replace all instances of the old pattern with the new one:

| Old | New |
|-----|-----|
| `px-6` (on page wrappers) | `px-4 sm:px-6 lg:px-8` |
| `px-8` (on inner sections) | `px-4 md:px-8` |
| `py-8` (on main sections) | `py-6 md:py-8` |

Affects ~20 components. Applied mechanically by search pattern.

### Student dashboard character panel

- Container: `style="height: 650px"` → `min-h-[400px] lg:min-h-[650px] h-auto`
- Inner layout: `flex flex-row` → `flex flex-col lg:flex-row`
- Child width constraints: `w-[X%]` → `w-full lg:w-[X%]`
- Character illustration: scales naturally within `flex-1`

---

## Section 2 — Grids and Component Breakpoints

### Intermediate tablet breakpoints

Grids that jump from 1 column directly to 3+ columns get a `sm:` step:

| Pattern | Replacement |
|---------|-------------|
| `grid-cols-1 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `grid-cols-1 lg:grid-cols-4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `grid-cols-1 md:grid-cols-5` | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` |

Affects ~15 components.

### Inline fixed sizes → Tailwind utilities

| Old inline style | Tailwind replacement |
|-----------------|---------------------|
| `width:60px; height:60px` | `w-14 h-14 sm:w-16 sm:h-16` |
| `width:38px; height:30px` | `w-10 h-8` |
| `width:18px; height:18px` | `w-4 h-4` |
| `max-width: 1400px` | `max-w-7xl mx-auto` |

Affects ~10 components.

### Modals and overlays

All modals with fixed widths:

- `w-[600px]` → `w-full max-w-lg mx-4 sm:mx-auto`
- `w-96` → `w-full max-w-sm mx-4 sm:mx-auto`

### Typography scaling

Large headings without breakpoints:

| Old | New |
|-----|-----|
| `text-4xl` | `text-2xl sm:text-3xl lg:text-4xl` |
| `text-5xl` | `text-3xl sm:text-4xl lg:text-5xl` |

Applies only to role dashboard headings; public pages already use `clamp()`.

---

## Section 3 — Scope and Constraints

### What changes

| Area | Files | Change type |
|------|-------|-------------|
| 4 role navbars | `student-classrooms`, `teacher-classrooms`, `director-dashboard`, `parent-dashboard` nav sections | Hamburger + overlay logic + HTML |
| Student dashboard | `student-dashboard.component.html` | Panel height + flex direction |
| Student components (10) | All files under `features/student/` | Padding, grids, inline sizes |
| Teacher components (8) | All files under `features/teacher/` | Padding, grids, modals |
| Director components (8) | All files under `features/director/` | Padding, grids, modals |
| Parent + auth (3) | `parent/`, `auth/` | Padding, basic responsive fixes |
| Shared components (1) | `classroom-ranking.component.html` | Grid breakpoints |

### What does NOT change

- Colors, gradients, animations, fonts — untouched
- All layouts at `lg:` (≥1024px) — pixel-identical to current
- TypeScript logic in all `.ts` files — HTML/class changes only
- Public pages (home, pricing, features, FAQ, how-it-works) — already responsive
- Theme service, auth service, guards, interceptors — out of scope
- `tailwind.config.js` — no new breakpoints needed (default sm/md/lg sufficient)

### Implementation order

1. **4 role navbars** — hamburger overlay (unblocks everything else)
2. **Student dashboard** — character panel responsive layout
3. **Student components** (10 files)
4. **Teacher components** (8 files)
5. **Director components** (8 files)
6. **Parent + auth components** (3 files)

### Risk

- Role navbars use a custom CSS class `legendary-nav`. The hamburger logic is additive — no existing classes are removed or renamed.
- Only `.html` files change; Angular component TypeScript adds only `menuOpen` boolean and toggle method where the hamburger is introduced.

---

## Success Criteria

- All pages render without horizontal scroll on a 375px viewport (iPhone SE)
- All navigation links are reachable on a 768px viewport (tablet)
- No visual regression on a 1280px viewport (desktop)
- No TypeScript or Angular build errors
