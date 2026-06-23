# Template Seed & KaTeX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed 56 real LaTeX-formatted activity templates for 7 courses and render mathematical formulas in the Angular frontend using KaTeX.

**Architecture:** Two independent tracks. Frontend: install `katex`, create a standalone `MathPipe` (transforms text with `$...$`/`$$...$$` blocks into KaTeX-rendered `SafeHtml`) and a `MathComponent`, then wire the pipe into the three existing template/activity views. Backend: extend `seed.ts` with 56 `upsert` calls — 8 templates per course (2 per activity type), all `status: approved`, `authorId/approvedById: director.id`.

**Tech Stack:** Angular 18 standalone components, KaTeX 0.16.x, NestJS/Prisma seed script, PostgreSQL

## Global Constraints

- All LaTeX backslashes MUST be doubled as `\\` in TypeScript string literals — `\frac` → `"\\frac"`, `\sin` → `"\\sin"`, etc.
- Template IDs scheme: `tmpl_<abbrev>_hw_<n>` / `_ex_<n>` / `_fm_<n>` / `_exam_<n>` where abbrevs are: `arit`, `alg`, `geo`, `rm`, `trig`, `quim`, `fis`
- All seeded templates: `status: TemplateStatus.approved`, `authorId: director.id`, `approvedById: director.id`, `approvedAt: new Date()`
- XP rewards: HomeworkTemplate = 30, ExerciseTemplate = 40, FormTemplate = 20, ExamTemplate = 80
- `MathPipe` name attribute: `'math'`; selector for `MathComponent`: `'app-math'`
- KaTeX CSS import: add `@import 'katex/dist/katex.min.css';` at top of `frontend/src/styles.css`
- `MathPipe` must use `DomSanitizer.bypassSecurityTrustHtml()` — KaTeX output is safe
- No Co-Authored-By lines in commits — attribute solely to JuanAguirre10
- `seed.ts` must add `Difficulty, TemplateStatus` to its `@prisma/client` import
- `problems` and `questions` JSON fields are passed as plain JS arrays — Prisma serializes them

---

## File Map

| File | Action |
|---|---|
| `frontend/src/app/shared/math/math.pipe.ts` | Create |
| `frontend/src/app/shared/math/math.component.ts` | Create |
| `frontend/src/app/shared/math/math.pipe.spec.ts` | Create |
| `frontend/src/styles.css` | Modify — prepend KaTeX CSS import |
| `frontend/src/app/features/teacher/templates/teacher-templates.component.html` | Modify — apply `| math` pipe to title/description |
| `frontend/src/app/features/teacher/templates/teacher-templates.component.ts` | Modify — add `MathPipe` to imports |
| `frontend/src/app/features/director/templates/director-templates.component.html` | Modify — apply `| math` pipe to title/description |
| `frontend/src/app/features/director/templates/director-templates.component.ts` | Modify — add `MathPipe` to imports |
| `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts` | Modify — add `MathPipe` to imports; apply `| math` to activity title |
| `backend/prisma/seed.ts` | Modify — add 56 template upserts after course block |

---

### Task 1: KaTeX Frontend Integration

**Files:**
- Create: `frontend/src/app/shared/math/math.pipe.ts`
- Create: `frontend/src/app/shared/math/math.component.ts`
- Create: `frontend/src/app/shared/math/math.pipe.spec.ts`
- Modify: `frontend/src/styles.css` (prepend KaTeX CSS)
- Modify: `frontend/src/app/features/teacher/templates/teacher-templates.component.ts` + `.html`
- Modify: `frontend/src/app/features/director/templates/director-templates.component.ts` + `.html`
- Modify: `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`

**Interfaces:**
- Produces: `MathPipe` (exported from `math.pipe.ts`) — callable as `value | math` in Angular templates, returns `SafeHtml`; `MathComponent` (exported from `math.component.ts`) — `<app-math [expr]="..." [display]="true|false">`

- [ ] **Step 1: Install KaTeX**

From `frontend/`:

```bash
npm install katex
npm install --save-dev @types/katex
```

Expected: `package.json` gains `"katex": "^0.16.x"`.

- [ ] **Step 2: Add KaTeX CSS to styles.css**

Open `frontend/src/styles.css` and prepend this line at the very top:

```css
@import 'katex/dist/katex.min.css';
```

File should now start:
```css
@import 'katex/dist/katex.min.css';
@import url('https://fonts.googleapis.com/css2?family=Cinzel...');
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Create `MathPipe`**

Create `frontend/src/app/shared/math/math.pipe.ts`:

```typescript
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

@Pipe({ name: 'math', standalone: true, pure: true })
export class MathPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    let result = value.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: true, output: 'html' })
    );
    result = result.replace(/\$([^$\n]+?)\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: false, output: 'html' })
    );
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
```

- [ ] **Step 4: Create `MathComponent`**

Create `frontend/src/app/shared/math/math.component.ts`:

```typescript
import { Component, Input, OnChanges, ElementRef, ViewChild } from '@angular/core';
import katex from 'katex';

@Component({
  selector: 'app-math',
  standalone: true,
  template: `<span #container></span>`,
})
export class MathComponent implements OnChanges {
  @Input() expr = '';
  @Input() display = false;
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLSpanElement>;

  ngOnChanges(): void {
    try {
      this.container.nativeElement.innerHTML = katex.renderToString(this.expr, {
        throwOnError: false,
        displayMode: this.display,
        output: 'html',
      });
    } catch {
      this.container.nativeElement.textContent = this.expr;
    }
  }
}
```

- [ ] **Step 5: Write unit tests for `MathPipe`**

Create `frontend/src/app/shared/math/math.pipe.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MathPipe } from './math.pipe';

describe('MathPipe', () => {
  let pipe: MathPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [] });
    const sanitizer = TestBed.inject(DomSanitizer);
    pipe = new MathPipe(sanitizer);
  });

  it('returns empty string for null input', () => {
    expect(pipe.transform(null) as string).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(pipe.transform('') as string).toBe('');
  });

  it('renders inline math $x^2$ as katex HTML', () => {
    const result = pipe.transform('Calcula $x^2$') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toContain('katex');
    expect(html).toContain('x');
  });

  it('renders display math $$a+b$$ with displayMode', () => {
    const result = pipe.transform('$$a+b=c$$') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toContain('katex-display');
  });

  it('passes through plain text without LaTeX unchanged', () => {
    const result = pipe.transform('Texto sin fórmulas') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toBe('Texto sin fórmulas');
  });
});
```

- [ ] **Step 6: Run tests**

From `frontend/`:

```bash
npm test -- --include="**/math.pipe.spec.ts" --watch=false
```

Expected: `5 specs, 0 failures`. If test runner needs karma config, run `npm test` and look for the math.pipe.spec results.

- [ ] **Step 7: Wire `MathPipe` into `teacher-templates.component`**

**`teacher-templates.component.ts`** — add `MathPipe` to imports array:

```typescript
// existing imports stay; add MathPipe:
import { MathPipe } from '../../../shared/math/math.pipe';

// In @Component decorator:
imports: [CommonModule, FormsModule, MathPipe],
```

**`teacher-templates.component.html`** — replace text interpolation with `[innerHTML]` bindings for title and description:

Change line 9 (`{{ tmpl.title }}`):
```html
<!-- before -->
<p class="font-semibold text-gray-900 mt-1">{{ tmpl.title }}</p>

<!-- after -->
<p class="font-semibold text-gray-900 mt-1" [innerHTML]="tmpl.title | math"></p>
```

Change lines 10–12 (the `@if (tmpl.description)` block):
```html
<!-- before -->
@if (tmpl.description) {
  <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ tmpl.description }}</p>
}

<!-- after -->
@if (tmpl.description) {
  <p class="text-sm text-gray-500 mt-1 line-clamp-2" [innerHTML]="tmpl.description | math"></p>
}
```

- [ ] **Step 8: Wire `MathPipe` into `director-templates.component`**

**`director-templates.component.ts`** — add `MathPipe` to imports array:

```typescript
import { MathPipe } from '../../../shared/math/math.pipe';

// In @Component decorator:
imports: [CommonModule, FormsModule, MathPipe],
```

**`director-templates.component.html`** — change lines 26 and 31:

```html
<!-- line 26: before -->
<p class="font-semibold text-gray-900">{{ tmpl.title }}</p>

<!-- line 26: after -->
<p class="font-semibold text-gray-900" [innerHTML]="tmpl.title | math"></p>

<!-- line 31: before -->
<p class="text-sm text-gray-600 mt-1">{{ tmpl.description }}</p>

<!-- line 31: after -->
<p class="text-sm text-gray-600 mt-1" [innerHTML]="tmpl.description | math"></p>
```

- [ ] **Step 9: Wire `MathPipe` into `classroom-detail.component`**

**`classroom-detail.component.ts`** — the component uses an inline template. Two changes:

1. Add `MathPipe` to the imports array (line ~14):
```typescript
import { MathPipe } from '../../../shared/math/math.pipe';

// In @Component decorator:
imports: [CommonModule, RouterLink, FormsModule, ClassroomRankingComponent, AvatarUploadComponent, MathPipe],
```

2. In the inline template, find the activity title display (around line ~337):
```typescript
// before:
<p class="font-medium text-gray-900 mt-0.5">{{ act.overrides?.title ?? '(sin título)' }}</p>

// after:
<p class="font-medium text-gray-900 mt-0.5" [innerHTML]="(act.overrides?.title ?? '(sin título)') | math"></p>
```

- [ ] **Step 10: Build check**

From `frontend/`:

```bash
npm run build:prod 2>&1 | tail -20
```

Expected: `Build at:` line with no TypeScript errors. Fix any import path issues if they appear.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/shared/math/ frontend/src/styles.css \
        frontend/src/app/features/teacher/templates/ \
        frontend/src/app/features/director/templates/ \
        frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts \
        frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add KaTeX MathPipe and MathComponent for LaTeX rendering"
```

---

### Task 2: Seed Templates — Aritmética, Álgebra, Geometría

**Files:**
- Modify: `backend/prisma/seed.ts`

**Interfaces:**
- Consumes: `director.id` (already in scope from existing seed), course IDs `course_aritmética`, `course_álgebra`, `course_geometría`
- Produces: 24 approved templates in the database (8 per course)

**Context:** The spec file `docs/superpowers/specs/2026-06-22-template-seed-design.md` contains the complete LaTeX content for every template. Read it before implementing. The pattern shown below for Aritmética is canonical — apply the identical structure for Álgebra and Geometría using their respective spec sections.

- [ ] **Step 1: Update imports in seed.ts**

In `backend/prisma/seed.ts`, change line 1:

```typescript
// before:
import { PrismaClient, Role, CharacterType, CharacterBonusType } from '@prisma/client';

// after:
import { PrismaClient, Role, CharacterType, CharacterBonusType, Difficulty, TemplateStatus } from '@prisma/client';
```

- [ ] **Step 2: Add the template seed block in `seed.ts`**

After the courses block (after the closing `}` of the courses `for` loop, around line 211), add:

```typescript
  // ──────────────────────────────────────────────────────────────────────
  // Templates
  // ──────────────────────────────────────────────────────────────────────

  const tmplBase = {
    status: TemplateStatus.approved,
    authorId: director.id,
    approvedById: director.id,
    approvedAt: new Date(),
  };
```

This base object is spread into every template upsert to avoid repetition.

- [ ] **Step 3: Add Aritmética templates (8 upserts)**

Immediately after `tmplBase`, add the following. The exact LaTeX strings come from the `### ARITMÉTICA` section of the spec — every `\\` in the TypeScript literal represents one `\` in the rendered LaTeX:

```typescript
  // ── Aritmética ──────────────────────────────────────────────────────
  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_arit_hw_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_hw_1',
      courseId: 'course_aritmética',
      title: 'Operaciones con fracciones',
      description: 'Practica las cuatro operaciones básicas con fracciones propias e impropias.',
      difficulty: Difficulty.easy,
      xpReward: 30,
      defaultDueDays: 5,
      instructions:
        'Resuelve cada operación. Muestra el procedimiento y simplifica tu resultado.\n\n' +
        '**1.** $$\\frac{2}{3}+\\frac{1}{4}$$\n\n' +
        '**2.** $$\\frac{5}{6}-\\frac{1}{3}$$\n\n' +
        '**3.** $$\\frac{3}{8}\\times\\frac{4}{9}$$\n\n' +
        '**4.** $$\\frac{7}{10}\\div\\frac{2}{5}$$\n\n' +
        '**5.** $$\\frac{1}{2}+\\frac{3}{4}-\\frac{1}{6}$$\n\n' +
        'Recuerda: para sumar o restar fracciones debes encontrar el mínimo común denominador (m.c.d.).',
    },
  });

  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_arit_hw_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_hw_2',
      courseId: 'course_aritmética',
      title: 'Porcentajes y descuentos',
      description: 'Aplica la fórmula del porcentaje en situaciones de la vida cotidiana.',
      difficulty: Difficulty.medium,
      xpReward: 30,
      defaultDueDays: 7,
      instructions:
        'Usa la fórmula: $$\\text{Porcentaje}=\\frac{\\text{parte}}{\\text{total}}\\times 100$$\n\n' +
        '**1.** ¿Cuánto es el $15\\%$ de $80$?\n\n' +
        '**2.** Un artículo cuesta $\\$250$ con $20\\%$ de descuento. Precio final:\n' +
        '$$P_f = P_o\\times\\left(1-\\frac{d}{100}\\right)$$\n\n' +
        '**3.** Si el $30\\%$ de un número es $45$, ¿cuál es el número?\n\n' +
        '**4.** Una tienda aplica $15\\%$ de IVA a un televisor de $\\$1\\,200$. ¿Cuánto paga el cliente?\n\n' +
        '**5.** ¿Qué porcentaje representa $35$ de $140$?',
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_arit_ex_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_ex_1',
      courseId: 'course_aritmética',
      title: 'Regla de tres simple',
      description: 'Problemas de proporcionalidad directa e inversa.',
      difficulty: Difficulty.easy,
      xpReward: 40,
      problems: [
        {
          question: 'Si $3$ kg de manzanas cuestan $\\$12$, ¿cuánto cuestan $7$ kg?\n$$\\frac{3}{12}=\\frac{7}{x}$$',
          hint: 'Usa la relación directa: $x=\\frac{7\\times 12}{3}$',
          answer: '$x=\\$28$',
        },
        {
          question: 'Un automóvil recorre $240$ km en $4$ horas. ¿Cuántos km recorre en $7$ horas?\n$$\\frac{240}{4}=\\frac{x}{7}$$',
          hint: 'Relación directa: velocidad constante',
          answer: '$x=420$ km',
        },
        {
          question: 'Si $8$ obreros terminan una obra en $15$ días, ¿cuántos días tardan $12$ obreros?\n$$8\\times 15=12\\times x$$',
          hint: 'Relación inversa: más obreros, menos días',
          answer: '$x=10$ días',
        },
        {
          question: 'Un grifo llena un tanque en $6$ horas. ¿En cuánto tiempo lo llenan $4$ grifos iguales?\n$$1\\times 6=4\\times x$$',
          hint: 'Relación inversa',
          answer: '$x=1.5$ horas',
        },
        {
          question: 'Si $\\frac{2}{5}$ de una tela mide $3.6$ m, ¿cuánto mide la tela completa?\n$$\\frac{2}{5}=\\frac{3.6}{x}$$',
          answer: '$x=9$ m',
        },
      ],
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_arit_ex_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_ex_2',
      courseId: 'course_aritmética',
      title: 'Jerarquía de operaciones',
      description: 'Resuelve expresiones respetando el orden de las operaciones.',
      difficulty: Difficulty.medium,
      xpReward: 40,
      problems: [
        {
          question: 'Resuelve respetando la jerarquía:\n$$4+3^2\\div(6-3)\\times 2$$',
          hint: 'Primero paréntesis, luego potencias, luego ×÷, finalmente ±',
          answer: '$4+9\\div 3\\times 2=4+6=10$',
        },
        {
          question: '$$\\left[2^3-(4+1)\\right]\\times 3+8\\div 4$$',
          answer: '$[8-5]\\times 3+2=9+2=11$',
        },
        {
          question: '$$5\\times 2^2-3\\times(7-4)+6\\div 2$$',
          answer: '$20-9+3=14$',
        },
        {
          question: '$$\\frac{3^2+4^2}{5}-\\frac{2\\times 3}{6}$$',
          hint: '$3^2+4^2=9+16=25$',
          answer: '$\\frac{25}{5}-1=5-1=4$',
        },
        {
          question: '$$\\sqrt{9}+2^4\\div(3^2-5)-1$$',
          answer: '$3+16\\div 4-1=3+4-1=6$',
        },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_arit_fm_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_fm_1',
      courseId: 'course_aritmética',
      title: 'Diagnóstico de operaciones',
      description: 'Evaluación diagnóstica sobre operaciones básicas.',
      difficulty: Difficulty.easy,
      xpReward: 20,
      questions: [
        { text: '¿Cuál es el resultado de $\\frac{1}{2}+\\frac{1}{3}$?', type: 'choice', options: ['$\\frac{2}{5}$','$\\frac{5}{6}$','$\\frac{1}{6}$','$\\frac{2}{6}$'], required: true },
        { text: 'El $25\\%$ de $200$ es:', type: 'choice', options: ['$25$','$75$','$50$','$100$'], required: true },
        { text: '$3^3 + 2^2 =$', type: 'choice', options: ['$25$','$29$','$31$','$13$'], required: true },
        { text: '¿Cuánto es $\\frac{3}{4}$ de $40$?', type: 'choice', options: ['$20$','$30$','$35$','$15$'], required: true },
        { text: 'Explica con tus propias palabras qué es el mínimo común denominador y para qué se usa.', type: 'text', required: true },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_arit_fm_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_fm_2',
      courseId: 'course_aritmética',
      title: 'Autoevaluación de fracciones',
      description: 'Reflexión sobre el aprendizaje de fracciones.',
      difficulty: Difficulty.medium,
      xpReward: 20,
      questions: [
        { text: '¿Qué operaciones con fracciones te resultan más difíciles? ¿Por qué?', type: 'text', required: true },
        { text: '¿Cuál es el resultado de $\\frac{2}{3}\\div\\frac{4}{9}$?', type: 'choice', options: ['$\\frac{8}{27}$','$\\frac{3}{2}$','$\\frac{6}{4}$','$\\frac{1}{2}$'], required: true },
        { text: 'Escribe un ejemplo de la vida cotidiana donde uses fracciones.', type: 'text', required: true },
        { text: '¿Puedes calcular el $35\\%$ de $\\$120$ usando fracciones? Muestra el procedimiento.', type: 'text', required: false },
        { text: 'Califica tu comprensión del tema de fracciones del 1 al 5.', type: 'choice', options: ['1 - Muy difícil','2 - Difícil','3 - Regular','4 - Fácil','5 - Muy fácil'], required: true },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_arit_exam_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_exam_1',
      courseId: 'course_aritmética',
      title: 'Examen de fracciones y operaciones básicas',
      description: 'Examen integral sobre fracciones, jerarquía de operaciones y potencias.',
      difficulty: Difficulty.medium,
      xpReward: 80,
      durationMinutes: 40,
      passingScore: 60,
      totalPoints: 20,
      questions: [
        { text: '$$\\frac{3}{5}+\\frac{2}{3}=?$$', type: 'choice', options: ['$$\\frac{5}{8}$$','$$\\frac{19}{15}$$','$$\\frac{5}{15}$$','$$1$$'], points: 2 },
        { text: '$$\\frac{7}{8}-\\frac{3}{4}=?$$', type: 'choice', options: ['$$\\frac{1}{8}$$','$$\\frac{4}{4}$$','$$\\frac{1}{4}$$','$$\\frac{4}{32}$$'], points: 2 },
        { text: '$$\\frac{5}{6}\\times\\frac{3}{10}=?$$', type: 'choice', options: ['$$\\frac{15}{16}$$','$$\\frac{1}{4}$$','$$\\frac{8}{16}$$','$$\\frac{1}{2}$$'], points: 2 },
        { text: '$$\\frac{4}{9}\\div\\frac{2}{3}=?$$', type: 'choice', options: ['$$\\frac{8}{27}$$','$$\\frac{2}{3}$$','$$\\frac{6}{12}$$','$$\\frac{2}{9}$$'], points: 2 },
        { text: 'Simplifica: $$\\frac{18}{24}$$', type: 'text', points: 2 },
        { text: 'Jerarquía: $$2+3^2\\times 4\\div 6-1=?$$', type: 'choice', options: ['$7$','$5$','$9$','$11$'], points: 2 },
        { text: '$$\\frac{1}{3}+\\frac{1}{4}+\\frac{1}{6}=$$ (muestra procedimiento)', type: 'text', points: 2 },
        { text: '$$\\left(\\frac{2}{3}\\right)^2=?$$', type: 'choice', options: ['$$\\frac{2}{3}$$','$$\\frac{4}{6}$$','$$\\frac{4}{9}$$','$$\\frac{2}{9}$$'], points: 2 },
        { text: 'Ordena de menor a mayor: $$\\frac{5}{8},\\;\\frac{2}{3},\\;\\frac{3}{4},\\;\\frac{7}{12}$$', type: 'text', points: 2 },
        { text: 'Si gastas $\\frac{2}{5}$ de tu mesada el lunes y $\\frac{1}{4}$ el martes, ¿qué fracción te queda?', type: 'text', points: 2 },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_arit_exam_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_arit_exam_2',
      courseId: 'course_aritmética',
      title: 'Examen de porcentajes y proporciones',
      description: 'Examen sobre porcentajes, descuentos y regla de tres.',
      difficulty: Difficulty.hard,
      xpReward: 80,
      durationMinutes: 45,
      passingScore: 60,
      totalPoints: 25,
      questions: [
        { text: '¿Cuánto es el $20\\%$ de $\\$350$?', type: 'choice', options: ['$\\$70$','$\\$60$','$\\$80$','$\\$35$'], points: 2 },
        { text: 'Un precio de $\\$500$ baja $15\\%$. Nuevo precio:', type: 'choice', options: ['$\\$400$','$\\$425$','$\\$450$','$\\$475$'], points: 2 },
        { text: 'Si $3$ es el $12\\%$ de un número, ¿cuál es ese número? Muestra procedimiento.', type: 'text', points: 3 },
        { text: 'Regla de tres directa: $5$ kg cuestan $\\$30$. ¿Cuánto cuestan $8$ kg?', type: 'choice', options: ['$\\$40$','$\\$48$','$\\$56$','$\\$45$'], points: 2 },
        { text: 'Regla de tres inversa: $6$ personas pintan una casa en $4$ días. ¿Cuántos días tardan $8$ personas?', type: 'choice', options: ['$3$','$2.5$','$4$','$5$'], points: 2 },
        { text: 'Una tienda ofrece $25\\%$ de descuento. Si el descuento es $\\$75$, ¿cuál era el precio original?', type: 'text', points: 3 },
        { text: '$$\\frac{a}{b}=\\frac{c}{d}$$ es una proporción. Si $a=4, b=6, c=10$, ¿cuánto es $d$?', type: 'choice', options: ['$12$','$15$','$8$','$16$'], points: 3 },
        { text: 'Un artículo aumentó de $\\$80$ a $\\$100$. $$\\%\\text{aumento}=\\frac{P_f-P_o}{P_o}\\times 100$$', type: 'text', points: 3 },
        { text: 'Si el $40\\%$ de un grupo de $35$ estudiantes aprobaron, ¿cuántos aprobaron?', type: 'choice', options: ['$12$','$14$','$16$','$21$'], points: 3 },
        { text: 'Explica la diferencia entre porcentaje y proporción con un ejemplo.', type: 'text', points: 2 },
      ],
    },
  });
```

- [ ] **Step 4: Add Álgebra templates (8 upserts)**

Read the `### ÁLGEBRA` section of the spec file `docs/superpowers/specs/2026-06-22-template-seed-design.md` and implement the 8 Álgebra templates following the identical pattern shown above.

IDs: `tmpl_alg_hw_1`, `tmpl_alg_hw_2`, `tmpl_alg_ex_1`, `tmpl_alg_ex_2`, `tmpl_alg_fm_1`, `tmpl_alg_fm_2`, `tmpl_alg_exam_1`, `tmpl_alg_exam_2`
`courseId`: `'course_álgebra'`

Difficulty: hw_1=easy, hw_2=medium, ex_1=medium, ex_2=easy, fm_1=easy, fm_2=medium, exam_1=medium, exam_2=hard

ExamTemplate `tmpl_alg_exam_1`: `durationMinutes: 45`, `totalPoints: 25`
ExamTemplate `tmpl_alg_exam_2`: `durationMinutes: 50`, `totalPoints: 25`

- [ ] **Step 5: Add Geometría templates (8 upserts)**

Read the `### GEOMETRÍA` section of the spec and implement the 8 Geometría templates.

IDs: `tmpl_geo_hw_1`, `tmpl_geo_hw_2`, `tmpl_geo_ex_1`, `tmpl_geo_ex_2`, `tmpl_geo_fm_1`, `tmpl_geo_fm_2`, `tmpl_geo_exam_1`, `tmpl_geo_exam_2`
`courseId`: `'course_geometría'`

Difficulty: hw_1=easy, hw_2=medium, ex_1=easy, ex_2=medium, fm_1=easy, fm_2=medium, exam_1=medium, exam_2=hard

ExamTemplate `tmpl_geo_exam_1`: `durationMinutes: 45`, `totalPoints: 25`
ExamTemplate `tmpl_geo_exam_2`: `durationMinutes: 50`, `totalPoints: 25`

- [ ] **Step 6: Run the seed**

From `backend/`:

```bash
npm run db:seed
```

Expected output ending with `✅ Seed completado`.

- [ ] **Step 7: Verify template count**

From `backend/`:

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(async () => {
  const hw = await p.homeworkTemplate.count();
  const ex = await p.exerciseTemplate.count();
  const fm = await p.formTemplate.count();
  const exam = await p.examTemplate.count();
  console.log({ hw, ex, fm, exam, total: hw+ex+fm+exam });
  await p.\$disconnect();
});
"
```

Expected: `{ hw: 6, ex: 6, fm: 6, exam: 6, total: 24 }` (3 courses × 2 per type × 4 types).

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add 24 approved templates for Aritmética, Álgebra, Geometría"
```

---

### Task 3: Seed Templates — Razonamiento Matemático, Trigonometría, Química, Física

**Files:**
- Modify: `backend/prisma/seed.ts`

**Interfaces:**
- Consumes: `director.id`, `tmplBase` constant (already defined from Task 2), course IDs `course_razonamiento_matemático`, `course_trigonometría`, `course_química`, `course_física`
- Produces: 32 additional approved templates (total reaches 56)

**Context:** Read spec sections `### RAZONAMIENTO MATEMÁTICO`, `### TRIGONOMETRÍA`, `### QUÍMICA`, `### FÍSICA` in `docs/superpowers/specs/2026-06-22-template-seed-design.md`. Follow the exact same `upsert` pattern from Task 2 for all 32 templates.

- [ ] **Step 1: Add Razonamiento Matemático templates (8 upserts)**

IDs: `tmpl_rm_hw_1`, `tmpl_rm_hw_2`, `tmpl_rm_ex_1`, `tmpl_rm_ex_2`, `tmpl_rm_fm_1`, `tmpl_rm_fm_2`, `tmpl_rm_exam_1`, `tmpl_rm_exam_2`
`courseId`: `'course_razonamiento_matemático'`

Difficulty: hw_1=easy, hw_2=medium, ex_1=medium, ex_2=hard, fm_1=easy, fm_2=medium, exam_1=medium, exam_2=hard

ExamTemplates: `durationMinutes: 40`, `totalPoints: 20` for both.

Full content (LaTeX strings, problems arrays, questions arrays) from the `### RAZONAMIENTO MATEMÁTICO` section of the spec.

- [ ] **Step 2: Add Trigonometría templates (8 upserts)**

IDs: `tmpl_trig_hw_1`, `tmpl_trig_hw_2`, `tmpl_trig_ex_1`, `tmpl_trig_ex_2`, `tmpl_trig_fm_1`, `tmpl_trig_fm_2`, `tmpl_trig_exam_1`, `tmpl_trig_exam_2`
`courseId`: `'course_trigonometría'`

Difficulty: hw_1=easy, hw_2=medium, ex_1=medium, ex_2=hard, fm_1=easy, fm_2=medium, exam_1=medium, exam_2=hard

ExamTemplates: `durationMinutes: 50`, `totalPoints: 25` for both.

Full content from `### TRIGONOMETRÍA` section of the spec.

- [ ] **Step 3: Add Química templates (8 upserts)**

IDs: `tmpl_quim_hw_1`, `tmpl_quim_hw_2`, `tmpl_quim_ex_1`, `tmpl_quim_ex_2`, `tmpl_quim_fm_1`, `tmpl_quim_fm_2`, `tmpl_quim_exam_1`, `tmpl_quim_exam_2`
`courseId`: `'course_química'`

Difficulty: hw_1=medium, hw_2=easy, ex_1=medium, ex_2=hard, fm_1=medium, fm_2=easy, exam_1=medium, exam_2=hard

ExamTemplate `tmpl_quim_exam_1`: `durationMinutes: 45`, `totalPoints: 25`
ExamTemplate `tmpl_quim_exam_2`: `durationMinutes: 50`, `totalPoints: 25`

Full content from `### QUÍMICA` section of the spec.

- [ ] **Step 4: Add Física templates (8 upserts)**

IDs: `tmpl_fis_hw_1`, `tmpl_fis_hw_2`, `tmpl_fis_ex_1`, `tmpl_fis_ex_2`, `tmpl_fis_fm_1`, `tmpl_fis_fm_2`, `tmpl_fis_exam_1`, `tmpl_fis_exam_2`
`courseId`: `'course_física'`

Difficulty: hw_1=medium, hw_2=easy, ex_1=medium, ex_2=hard, fm_1=medium, fm_2=easy, exam_1=medium, exam_2=hard

ExamTemplates: `durationMinutes: 50`, `totalPoints: 25` for both.

Full content from `### FÍSICA` section of the spec.

- [ ] **Step 5: Run the seed**

From `backend/`:

```bash
npm run db:seed
```

Expected: `✅ Seed completado` with no errors.

- [ ] **Step 6: Verify total template count = 56**

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(async () => {
  const hw = await p.homeworkTemplate.count();
  const ex = await p.exerciseTemplate.count();
  const fm = await p.formTemplate.count();
  const exam = await p.examTemplate.count();
  console.log({ hw, ex, fm, exam, total: hw+ex+fm+exam });
  await p.\$disconnect();
});
"
```

Expected: `{ hw: 14, ex: 14, fm: 14, exam: 14, total: 56 }`.

- [ ] **Step 7: Spot-check one template content**

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(async () => {
  const t = await p.exerciseTemplate.findUnique({ where: { id: 'tmpl_trig_ex_1' } });
  const problems = t?.problems as any[];
  console.log('Title:', t?.title);
  console.log('Problems count:', problems?.length);
  console.log('First question snippet:', String(problems?.[0]?.question).slice(0, 60));
  await p.\$disconnect();
});
"
```

Expected:
```
Title: Resolución de triángulos rectángulos
Problems count: 5
First question snippet: Un triángulo rectángulo tiene $\theta=37°$ e hipotenusa $
```

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add 32 approved templates for RM, Trigonometría, Química, Física"
```
