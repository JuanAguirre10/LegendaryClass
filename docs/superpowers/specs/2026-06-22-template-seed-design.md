# Template Seed & KaTeX — Diseño

- **Fecha:** 2026-06-22
- **Estado:** Aprobado
- **Alcance:** 56 plantillas de actividades reales con contenido LaTeX para los 7 cursos del catálogo + integración de KaTeX en el frontend.

---

## Objetivo

Poblar el banco de plantillas con contenido didáctico real (nivel secundaria, 12–15 años) para los 7 cursos seeded: Aritmética, Álgebra, Geometría, Razonamiento Matemático, Trigonometría, Química y Física. Todas las fórmulas se escriben en LaTeX. El frontend incorpora KaTeX para renderizarlas.

---

## Decisiones globales de seed

| Campo | Valor |
|---|---|
| `authorId` | `director.id` |
| `approvedById` | `director.id` |
| `approvedAt` | `new Date()` |
| `status` | `TemplateStatus.approved` |
| XP tarea | 30 |
| XP ejercicio | 40 |
| XP formulario | 20 |
| XP examen | 80 |
| IDs | `tmpl_<curso>_hw_<n>` / `_ex_<n>` / `_fm_<n>` / `_exam_<n>` |
| Estrategia | `prisma.upsert` por ID estable — idempotente |

Los IDs de curso usan el mismo patrón del seed actual:
`course_aritmética`, `course_álgebra`, `course_geometría`, `course_razonamiento_matemático`, `course_trigonometría`, `course_química`, `course_física`.

---

## Integración KaTeX

### Instalación
```bash
cd frontend
npm install katex
npm install --save-dev @types/katex
```

### Componente `MathComponent`

**Ruta:** `frontend/src/app/shared/math/math.component.ts`

```typescript
import { Component, Input, OnChanges, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import katex from 'katex';

@Component({
  selector: 'app-math',
  standalone: true,
  imports: [CommonModule],
  template: `<span [innerHTML]="rendered"></span>`,
})
export class MathComponent implements OnChanges {
  @Input() expr = '';
  @Input() display = false;
  rendered = '';

  ngOnChanges(): void {
    try {
      this.rendered = katex.renderToString(this.expr, {
        throwOnError: false,
        displayMode: this.display,
        output: 'html',
      });
    } catch {
      this.rendered = this.expr;
    }
  }
}
```

### Pipe `MathPipe` (para renderizar texto mixto con `$...$` y `$$...$$`)

**Ruta:** `frontend/src/app/shared/math/math.pipe.ts`

```typescript
import { Pipe, PipeTransform } from '@angular/core';
import katex from 'katex';

@Pipe({ name: 'math', standalone: true, pure: true })
export class MathPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    // Replace $$...$$ (display) then $...$ (inline)
    let result = value.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: true, output: 'html' })
    );
    result = result.replace(/\$([^$]+?)\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: false, output: 'html' })
    );
    return result;
  }
}
```

Usar en templates: `<p [innerHTML]="texto | math"></p>`

### Dónde importar
- `teacher-templates.component.ts` — cards del banco
- `director-templates.component.ts` — preview en bandeja
- `classroom-detail.component.ts` — tab Actividades

---

## Plantillas por curso

### Convenciones de contenido
- `problems[]` en ExerciseTemplate: 5 problemas con `question` (LaTeX), `hint?`, `answer?`
- `questions[]` en FormTemplate: 5–6 preguntas `{ text, type: "text"|"choice", options?, required }`
- `questions[]` en ExamTemplate: 10 preguntas `{ text, type, options?, points }` · totalPoints = suma de points · passingScore = 60

---

### ARITMÉTICA

#### tmpl_arit_hw_1 — Tarea: Operaciones con fracciones (easy, 30 XP)
```
description: "Practica las cuatro operaciones básicas con fracciones propias e impropias."
instructions: |
  Resuelve cada operación. Muestra el procedimiento y simplifica tu resultado.

  **1.** $$\frac{2}{3}+\frac{1}{4}$$

  **2.** $$\frac{5}{6}-\frac{1}{3}$$

  **3.** $$\frac{3}{8}\times\frac{4}{9}$$

  **4.** $$\frac{7}{10}\div\frac{2}{5}$$

  **5.** $$\frac{1}{2}+\frac{3}{4}-\frac{1}{6}$$

  Recuerda: para sumar o restar fracciones debes encontrar el mínimo común denominador (m.c.d.).
defaultDueDays: 5
```

#### tmpl_arit_hw_2 — Tarea: Porcentajes y descuentos (medium, 30 XP)
```
description: "Aplica la fórmula del porcentaje en situaciones de la vida cotidiana."
instructions: |
  Usa la fórmula: $$\text{Porcentaje}=\frac{\text{parte}}{\text{total}}\times 100$$

  **1.** ¿Cuánto es el $15\%$ de $80$?

  **2.** Un artículo cuesta $\$250$ con $20\%$ de descuento. Precio final:
  $$P_f = P_o\times\left(1-\frac{d}{100}\right)$$

  **3.** Si el $30\%$ de un número es $45$, ¿cuál es el número?

  **4.** Una tienda aplica $15\%$ de IVA a un televisor de $\$1\,200$. ¿Cuánto paga el cliente?

  **5.** ¿Qué porcentaje representa $35$ de $140$?
defaultDueDays: 7
```

#### tmpl_arit_ex_1 — Ejercicio: Regla de tres simple (easy, 40 XP)
```json
problems: [
  {
    "question": "Si $3$ kg de manzanas cuestan $\\$12$, ¿cuánto cuestan $7$ kg?\n$$\\frac{3}{12}=\\frac{7}{x}$$",
    "hint": "Usa la relación directa: $x=\\frac{7\\times 12}{3}$",
    "answer": "$x=\\$28$"
  },
  {
    "question": "Un automóvil recorre $240$ km en $4$ horas. ¿Cuántos km recorre en $7$ horas a la misma velocidad?\n$$\\frac{240}{4}=\\frac{x}{7}$$",
    "hint": "Relación directa: velocidad constante",
    "answer": "$x=420$ km"
  },
  {
    "question": "Si $8$ obreros terminan una obra en $15$ días, ¿cuántos días tardan $12$ obreros?\n$$8\\times 15=12\\times x$$",
    "hint": "Relación inversa: más obreros, menos días",
    "answer": "$x=10$ días"
  },
  {
    "question": "Un grifo llena un tanque en $6$ horas. ¿En cuánto tiempo lo llenan $4$ grifos iguales?\n$$1\\times 6=4\\times x$$",
    "hint": "Relación inversa",
    "answer": "$x=1.5$ horas"
  },
  {
    "question": "Si $\\frac{2}{5}$ de una tela mide $3.6$ m, ¿cuánto mide la tela completa?\n$$\\frac{2}{5}=\\frac{3.6}{x}$$",
    "answer": "$x=9$ m"
  }
]
```

#### tmpl_arit_ex_2 — Ejercicio: Jerarquía de operaciones (medium, 40 XP)
```json
problems: [
  {
    "question": "Resuelve respetando la jerarquía:\n$$4+3^2\\div(6-3)\\times 2$$",
    "hint": "Primero paréntesis, luego potencias, luego ×÷, finalmente ±",
    "answer": "$4+9\\div 3\\times 2=4+6=10$"
  },
  {
    "question": "$$\\left[2^3-(4+1)\\right]\\times 3+8\\div 4$$",
    "answer": "$[8-5]\\times 3+2=9+2=11$"
  },
  {
    "question": "$$5\\times 2^2-3\\times(7-4)+6\\div 2$$",
    "answer": "$20-9+3=14$"
  },
  {
    "question": "$$\\frac{3^2+4^2}{5}-\\frac{2\\times 3}{6}$$",
    "hint": "$3^2+4^2=9+16=25$",
    "answer": "$\\frac{25}{5}-1=5-1=4$"
  },
  {
    "question": "$$\\sqrt{9}+2^4\\div(3^2-5)-1$$",
    "answer": "$3+16\\div 4-1=3+4-1=6$"
  }
]
```

#### tmpl_arit_fm_1 — Formulario: Diagnóstico de operaciones (easy, 20 XP)
```json
questions: [
  { "text": "¿Cuál es el resultado de $\\frac{1}{2}+\\frac{1}{3}$?", "type": "choice", "options": ["$\\frac{2}{5}$","$\\frac{5}{6}$","$\\frac{1}{6}$","$\\frac{2}{6}$"], "required": true },
  { "text": "El $25\\%$ de $200$ es:", "type": "choice", "options": ["$25$","$75$","$50$","$100$"], "required": true },
  { "text": "$3^3 + 2^2 =$", "type": "choice", "options": ["$25$","$29$","$31$","$13$"], "required": true },
  { "text": "¿Cuánto es $\\frac{3}{4}$ de $40$?", "type": "choice", "options": ["$20$","$30$","$35$","$15$"], "required": true },
  { "text": "Explica con tus propias palabras qué es el mínimo común denominador y para qué se usa.", "type": "text", "required": true }
]
```

#### tmpl_arit_fm_2 — Formulario: Autoevaluación de fracciones (medium, 20 XP)
```json
questions: [
  { "text": "¿Qué operaciones con fracciones te resultan más difíciles? ¿Por qué?", "type": "text", "required": true },
  { "text": "¿Cuál es el resultado de $\\frac{2}{3}\\div\\frac{4}{9}$?", "type": "choice", "options": ["$\\frac{8}{27}$","$\\frac{3}{2}$","$\\frac{6}{4}$","$\\frac{1}{2}$"], "required": true },
  { "text": "Escribe un ejemplo de la vida cotidiana donde uses fracciones.", "type": "text", "required": true },
  { "text": "¿Puedes calcular el $35\\%$ de $\\$120$ usando fracciones? Muestra el procedimiento.", "type": "text", "required": false },
  { "text": "Califica tu comprensión del tema de fracciones del 1 al 5.", "type": "choice", "options": ["1 - Muy difícil","2 - Difícil","3 - Regular","4 - Fácil","5 - Muy fácil"], "required": true }
]
```

#### tmpl_arit_exam_1 — Examen: Fracciones y operaciones básicas (medium, 80 XP)
```
durationMinutes: 40 · passingScore: 60 · totalPoints: 20
questions:
  1. choice 2pts: $$\frac{3}{5}+\frac{2}{3}=?$$ → opts: $$\frac{5}{8}$$, $$\frac{19}{15}$$, $$\frac{5}{15}$$, $$1$$
  2. choice 2pts: $$\frac{7}{8}-\frac{3}{4}=?$$ → opts: $$\frac{1}{8}$$, $$\frac{4}{4}$$, $$\frac{1}{4}$$, $$\frac{4}{32}$$
  3. choice 2pts: $$\frac{5}{6}\times\frac{3}{10}=?$$ → opts: $$\frac{15}{16}$$, $$\frac{1}{4}$$, $$\frac{8}{16}$$, $$\frac{1}{2}$$  [correct: $$\frac{1}{4}$$]
  4. choice 2pts: $$\frac{4}{9}\div\frac{2}{3}=?$$ → opts: $$\frac{8}{27}$$, $$\frac{2}{3}$$, $$\frac{6}{12}$$, $$\frac{2}{9}$$  [correct: $$\frac{2}{3}$$]
  5. text 2pts: Simplifica: $$\frac{18}{24}$$
  6. choice 2pts: Jerarquía: $$2+3^2\times 4\div 6 - 1$$ = ? → opts: 7, 5, 9, 11  [correct: 7]
  7. text 2pts: $$\frac{1}{3}+\frac{1}{4}+\frac{1}{6}=$$ (muestra procedimiento)
  8. choice 2pts: $$\left(\frac{2}{3}\right)^2=?$$ → opts: $$\frac{2}{3}$$, $$\frac{4}{6}$$, $$\frac{4}{9}$$, $$\frac{2}{9}$$
  9. text 2pts: Ordena de menor a mayor: $$\frac{5}{8},\;\frac{2}{3},\;\frac{3}{4},\;\frac{7}{12}$$
  10. text 2pts: Si gastas $$\frac{2}{5}$$ de tu mesada el lunes y $$\frac{1}{4}$$ el martes, ¿qué fracción te queda?
```

#### tmpl_arit_exam_2 — Examen: Porcentajes y proporciones (hard, 80 XP)
```
durationMinutes: 45 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: ¿Cuánto es el $20\%$ de $\$350$? → opts: $\$70$, $\$60$, $\$80$, $\$35$
  2. choice 2pts: Un precio de $\$500$ baja $15\%$. Nuevo precio: → opts: $\$400$, $\$425$, $\$450$, $\$475$ [correct: $\$425$]
  3. text 3pts: Si $3$ es el $12\%$ de un número, ¿cuál es ese número? Muestra procedimiento.
  4. choice 2pts: Regla de tres directa: $5$ kg cuestan $\$30$. ¿Cuánto cuestan $8$ kg? → opts: $\$40$, $\$48$, $\$56$, $\$45$ [correct: $\$48$]
  5. choice 2pts: Regla de tres inversa: $6$ personas pintan una casa en $4$ días. ¿Cuántos días tardan $8$ personas? → opts: $3$, $2.5$, $4$, $5$ [correct: $3$]
  6. text 3pts: Una tienda ofrece $25\%$ de descuento. Si el descuento es $\$75$, ¿cuál era el precio original?
  7. choice 3pts: $$\frac{a}{b}=\frac{c}{d}$$ es una proporción. Si $a=4, b=6, c=10$, ¿cuánto es $d$? → opts: $12$, $15$, $8$, $16$ [correct: $15$]
  8. text 3pts: Un artículo aumentó de $\$80$ a $\$100$. ¿Qué porcentaje de aumento representa? $$\%\text{aumento}=\frac{P_f-P_o}{P_o}\times 100$$
  9. choice 3pts: Si el $40\%$ de los estudiantes de un grupo de $35$ aprobaron, ¿cuántos aprobaron? → opts: $12$, $14$, $16$, $21$ [correct: $14$]
  10. text 2pts: Explica la diferencia entre porcentaje y proporción con un ejemplo.
```

---

### ÁLGEBRA

#### tmpl_alg_hw_1 — Tarea: Ecuaciones lineales (easy, 30 XP)
```
description: "Resolución de ecuaciones de primer grado con una incógnita."
instructions: |
  Resuelve cada ecuación para encontrar el valor de $x$. Verifica tu respuesta sustituyendo.

  **1.** $$3x+7=22$$

  **2.** $$5x-3=2x+9$$

  **3.** $$\frac{x}{4}+2=5$$

  **4.** $$2(x-3)=4x-10$$

  **5.** $$\frac{2x+1}{3}=\frac{x-2}{2}$$

  Recuerda: lo que haces de un lado del signo $=$ debes hacerlo del otro.
defaultDueDays: 5
```

#### tmpl_alg_hw_2 — Tarea: Sistemas de ecuaciones 2×2 (medium, 30 XP)
```
description: "Resolución de sistemas de dos ecuaciones con dos incógnitas."
instructions: |
  Resuelve los sistemas por el método indicado.

  **1.** Sustitución:
  $$\begin{cases}y=2x-1\\3x+y=14\end{cases}$$

  **2.** Eliminación:
  $$\begin{cases}2x+3y=12\\4x-3y=6\end{cases}$$

  **3.** El método que prefieras:
  $$\begin{cases}5x-2y=3\\x+4y=11\end{cases}$$

  **4.** Problema: La suma de dos números es $28$ y su diferencia es $6$. Plantea y resuelve el sistema.
  $$\begin{cases}a+b=28\\a-b=6\end{cases}$$

  **5.** Verifica la solución del sistema 1 sustituyendo en ambas ecuaciones.
defaultDueDays: 7
```

#### tmpl_alg_ex_1 — Ejercicio: Factorización de polinomios (medium, 40 XP)
```json
problems: [
  {
    "question": "Factoriza por factor común:\n$$6x^3-9x^2+3x$$",
    "hint": "El m.c.d. de los coeficientes es $3$ y la menor potencia es $x$",
    "answer": "$$3x(2x^2-3x+1)$$"
  },
  {
    "question": "Factoriza diferencia de cuadrados:\n$$x^2-16$$",
    "hint": "$$a^2-b^2=(a+b)(a-b)$$",
    "answer": "$$(x+4)(x-4)$$"
  },
  {
    "question": "Factoriza trinomio cuadrado perfecto:\n$$x^2+6x+9$$",
    "hint": "$$a^2+2ab+b^2=(a+b)^2$$",
    "answer": "$$(x+3)^2$$"
  },
  {
    "question": "Factoriza el trinomio:\n$$x^2-5x+6$$",
    "hint": "Busca dos números cuya suma sea $-5$ y producto $6$",
    "answer": "$$(x-2)(x-3)$$"
  },
  {
    "question": "Factoriza completamente:\n$$2x^2-8$$",
    "hint": "Primero extrae el factor común, luego aplica diferencia de cuadrados",
    "answer": "$$2(x+2)(x-2)$$"
  }
]
```

#### tmpl_alg_ex_2 — Ejercicio: Simplificación de expresiones algebraicas (easy, 40 XP)
```json
problems: [
  {
    "question": "Simplifica:\n$$\\frac{6x^2-12x}{3x}$$",
    "hint": "Factoriza el numerador",
    "answer": "$$2x-4$$"
  },
  {
    "question": "Combina términos semejantes:\n$$3x^2+2x-5x^2+4x-7$$",
    "answer": "$$-2x^2+6x-7$$"
  },
  {
    "question": "Expande y simplifica:\n$$(x+3)^2-(x-1)^2$$",
    "hint": "$(a+b)^2=a^2+2ab+b^2$",
    "answer": "$$8x+8$$"
  },
  {
    "question": "Simplifica la fracción algebraica:\n$$\\frac{x^2-9}{x+3}$$",
    "hint": "Factoriza el numerador como diferencia de cuadrados",
    "answer": "$$x-3$$"
  },
  {
    "question": "Si $P(x)=2x^2-3x+1$, calcula $P(2)-P(-1)$.",
    "answer": "$P(2)=3$, $P(-1)=6$, resultado: $-3$"
  }
]
```

#### tmpl_alg_fm_1 — Formulario: Diagnóstico algebraico (easy, 20 XP)
```json
questions: [
  { "text": "¿Cuál es el valor de $x$ en $2x+6=14$?", "type": "choice", "options": ["$x=3$","$x=4$","$x=10$","$x=2$"], "required": true },
  { "text": "¿Cuál es el resultado de $(x+2)(x-2)$?", "type": "choice", "options": ["$x^2+4$","$x^2-4$","$x^2-2x+4$","$x^2+2x-4$"], "required": true },
  { "text": "Si $3x-7=2$, entonces $x=$", "type": "choice", "options": ["$1$","$2$","$3$","$4$"], "required": true },
  { "text": "¿Qué es una ecuación lineal? Da un ejemplo.", "type": "text", "required": true },
  { "text": "¿Cuál de estos es un trinomio cuadrado perfecto?", "type": "choice", "options": ["$x^2+4x+4$","$x^2+2x+3$","$x^2-x+1$","$x^2+5x+4$"], "required": true }
]
```

#### tmpl_alg_fm_2 — Formulario: Reflexión sobre errores en álgebra (medium, 20 XP)
```json
questions: [
  { "text": "¿Cuál es el error en esta resolución?\n$$2(x+3)=2x+3$$", "type": "text", "required": true },
  { "text": "Al resolver $\\frac{x}{2}=4$, ¿qué operación aplicas a ambos lados?", "type": "choice", "options": ["Dividir por 2","Multiplicar por 2","Sumar 2","Restar 2"], "required": true },
  { "text": "Describe con tus palabras en qué situación usarías un sistema de ecuaciones.", "type": "text", "required": true },
  { "text": "¿Qué método prefieres para resolver sistemas? ¿Por qué?", "type": "text", "required": false },
  { "text": "¿Cuál es la solución del sistema $x+y=5$, $x-y=1$?", "type": "choice", "options": ["$x=3,y=2$","$x=2,y=3$","$x=4,y=1$","$x=1,y=4$"], "required": true }
]
```

#### tmpl_alg_exam_1 — Examen: Ecuaciones lineales (medium, 80 XP)
```
durationMinutes: 45 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: $5x-3=17$ → opts: $x=4$, $x=3$, $x=5$, $x=2$ [correct: $x=4$]
  2. choice 2pts: $3(x+2)=21$ → opts: $x=5$, $x=9$, $x=7$, $x=4$ [correct: $x=5$]
  3. text 3pts: Resuelve y verifica: $\frac{x-1}{2}+\frac{x+3}{3}=4$
  4. choice 2pts: $2x+5=x-3$ → opts: $x=-8$, $x=8$, $x=-2$, $x=2$ [correct: $x=-8$]
  5. text 3pts: Plantea y resuelve: El doble de un número más $5$ es igual a $23$. ¿Cuál es el número?
  6. choice 3pts: $4x-7=2x+9$ → opts: $x=6$, $x=8$, $x=7$, $x=5$ [correct: $x=8$]
  7. text 3pts: Resuelve: $3(2x-1)-2(x+4)=7$
  8. choice 3pts: La solución de $\frac{x}{3}=\frac{x-2}{5}$ es: → opts: $x=-3$, $x=3$, $x=6$, $x=-6$ [correct: $x=-3$; verifica: $\frac{-3}{3}=-1=\frac{-5}{5}=-1$ ✓]
  9. text 2pts: ¿Cuántas soluciones tiene $2x+4=2(x+3)$? Explica.
  10. text 2pts: Comprueba si $x=2$ es solución de $3x^2-2x-8=0$.
```

#### tmpl_alg_exam_2 — Examen: Sistemas de ecuaciones (hard, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. text 3pts: Resuelve por sustitución: $\begin{cases}y=3x-1\\2x+y=9\end{cases}$
  2. text 3pts: Resuelve por eliminación: $\begin{cases}3x+2y=16\\x-2y=0\end{cases}$
  3. choice 2pts: ¿Cuántas soluciones tiene un sistema inconsistente? → opts: Ninguna, Una, Infinitas, Dos [correct: Ninguna]
  4. text 4pts: Problema: Dos números suman $45$ y su diferencia es $11$. Plantea el sistema y resuelve. $\begin{cases}a+b=45\\a-b=11\end{cases}$
  5. choice 2pts: La solución de $\begin{cases}x+y=6\\x-y=2\end{cases}$ es: → opts: $(4,2)$, $(3,3)$, $(5,1)$, $(2,4)$ [correct: $(4,2)$]
  6. text 3pts: ¿Cuántos bolígrafos de $\$3$ y cuadernos de $\$5$ puedo comprar con $\$23$ si compro $7$ artículos en total?
  7. choice 2pts: Si $\begin{cases}2x+y=7\\4x+2y=k\end{cases}$ tiene infinitas soluciones, $k$ vale: → opts: $7$, $14$, $3.5$, $21$ [correct: $14$]
  8. text 3pts: Verifica si $(2,-1)$ es solución del sistema $\begin{cases}x+2y=0\\3x-y=7\end{cases}$
  9. text 3pts: Resuelve: $\begin{cases}\frac{x}{2}+y=5\\x-\frac{y}{3}=4\end{cases}$
```

---

### GEOMETRÍA

#### tmpl_geo_hw_1 — Tarea: Áreas y perímetros de figuras planas (easy, 30 XP)
```
instructions: |
  Calcula el área y perímetro de cada figura usando las fórmulas correspondientes.

  **Cuadrado** (lado $= 6$ cm):
  $$A = l^2 \qquad P = 4l$$

  **Rectángulo** ($b=8$ cm, $h=5$ cm):
  $$A = b\cdot h \qquad P = 2(b+h)$$

  **Triángulo** (base $= 10$ cm, altura $= 6$ cm, lados $= 8, 8, 10$ cm):
  $$A = \frac{b\cdot h}{2} \qquad P = a+b+c$$

  **Círculo** (radio $= 7$ cm):
  $$A = \pi r^2 \qquad C = 2\pi r$$

  **Trapecio** ($B=12$ cm, $b=8$ cm, $h=5$ cm):
  $$A = \frac{(B+b)\cdot h}{2}$$
defaultDueDays: 5
```

#### tmpl_geo_hw_2 — Tarea: Teorema de Pitágoras (medium, 30 XP)
```
instructions: |
  Aplica el Teorema de Pitágoras: $$c^2=a^2+b^2$$

  **1.** Calcula la hipotenusa si los catetos miden $3$ cm y $4$ cm.

  **2.** Un cateto mide $12$ cm y la hipotenusa $13$ cm. ¿Cuánto mide el otro cateto?

  **3.** ¿Es un triángulo rectángulo el de lados $5, 12, 13$?
  Verifica: $$5^2+12^2\stackrel{?}{=}13^2$$

  **4.** Una escalera de $5$ m apoyada en una pared llega a $4$ m de altura. ¿A qué distancia de la pared está la base?

  **5.** Calcula la diagonal de un cuadrado de $6$ cm de lado.
  $$d = l\sqrt{2}$$
defaultDueDays: 7
```

#### tmpl_geo_ex_1 — Ejercicio: Propiedades de triángulos (easy, 40 XP)
```json
problems: [
  {
    "question": "Un triángulo tiene ángulos de $60°$ y $75°$. ¿Cuánto mide el tercer ángulo?\n$$\\alpha+\\beta+\\gamma=180°$$",
    "answer": "$\\gamma=45°$"
  },
  {
    "question": "Clasifica el triángulo con ángulos $90°$, $45°$, $45°$ según sus ángulos y sus lados.",
    "answer": "Rectángulo e isósceles"
  },
  {
    "question": "Un triángulo isósceles tiene un ángulo base de $55°$. ¿Cuánto mide el ángulo del vértice?",
    "hint": "Los dos ángulos base son iguales",
    "answer": "$180°-55°-55°=70°$"
  },
  {
    "question": "En un triángulo equilátero de lado $8$ cm, calcula el área usando:\n$$A=\\frac{l^2\\sqrt{3}}{4}$$",
    "answer": "$A=16\\sqrt{3}\\approx 27.7\\text{ cm}^2$"
  },
  {
    "question": "¿Puede existir un triángulo con lados $2, 3$ y $6$ cm? Justifica usando la desigualdad triangular.\n$$a+b>c$$",
    "answer": "$2+3=5<6$: No puede existir"
  }
]
```

#### tmpl_geo_ex_2 — Ejercicio: Volúmenes de sólidos (medium, 40 XP)
```json
problems: [
  {
    "question": "Calcula el volumen de un cubo de arista $5$ cm:\n$$V=a^3$$",
    "answer": "$V=125\\text{ cm}^3$"
  },
  {
    "question": "Volumen de un cilindro de radio $4$ cm y altura $10$ cm:\n$$V=\\pi r^2 h$$",
    "hint": "Usa $\\pi\\approx 3.14$",
    "answer": "$V\\approx 502.4\\text{ cm}^3$"
  },
  {
    "question": "Volumen de una pirámide de base cuadrada ($l=6$ cm) y altura $9$ cm:\n$$V=\\frac{A_b\\cdot h}{3}$$",
    "answer": "$V=\\frac{36\\times 9}{3}=108\\text{ cm}^3$"
  },
  {
    "question": "Una esfera tiene radio $3$ cm. Calcula su volumen:\n$$V=\\frac{4}{3}\\pi r^3$$",
    "answer": "$V=\\frac{4}{3}\\pi\\times 27=36\\pi\\approx 113.1\\text{ cm}^3$"
  },
  {
    "question": "Un cono tiene radio $5$ cm y altura $12$ cm:\n$$V=\\frac{1}{3}\\pi r^2 h$$",
    "answer": "$V=\\frac{1}{3}\\pi\\times 25\\times 12=100\\pi\\approx 314.2\\text{ cm}^3$"
  }
]
```

#### tmpl_geo_fm_1 — Formulario: Diagnóstico de geometría plana (easy, 20 XP)
```json
questions: [
  { "text": "¿Cuál es el área de un triángulo con base $10$ cm y altura $6$ cm?", "type": "choice", "options": ["$30\\text{ cm}^2$","$60\\text{ cm}^2$","$16\\text{ cm}^2$","$15\\text{ cm}^2$"], "required": true },
  { "text": "¿Cuántos grados suman los ángulos interiores de un triángulo?", "type": "choice", "options": ["$90°$","$180°$","$270°$","$360°$"], "required": true },
  { "text": "¿Cuál es la fórmula del perímetro de un cuadrado de lado $l$?", "type": "choice", "options": ["$l^2$","$4l$","$2l$","$l^3$"], "required": true },
  { "text": "Explica con tus palabras qué es el Teorema de Pitágoras y cuándo se aplica.", "type": "text", "required": true },
  { "text": "Un rectángulo mide $9\\times 4$ cm. ¿Cuál es su diagonal? $$d=\\sqrt{a^2+b^2}$$", "type": "text", "required": true }
]
```

#### tmpl_geo_fm_2 — Formulario: Reporte de construcción geométrica (medium, 20 XP)
```json
questions: [
  { "text": "¿Qué figura geométrica construiste? Descríbela (tipo, dimensiones).", "type": "text", "required": true },
  { "text": "¿Qué instrumentos utilizaste?", "type": "choice", "options": ["Regla y compás","Transportador y regla","Solo regla","Programa de computadora"], "required": true },
  { "text": "Escribe la fórmula del área de la figura que construiste y calcula su valor.", "type": "text", "required": true },
  { "text": "¿Qué dificultades encontraste durante la construcción?", "type": "text", "required": false },
  { "text": "¿Cómo verificaste que tu construcción es correcta?", "type": "text", "required": true }
]
```

#### tmpl_geo_exam_1 — Examen: Geometría plana (medium, 80 XP)
```
durationMinutes: 45 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: Área de círculo radio $5$ cm: → $25\pi$, $10\pi$, $50\pi$, $5\pi$ [correct: $25\pi$]
  2. text 3pts: Perímetro y área de rectángulo $12\times 7$ cm. $P=2(12+7)$, $A=12\times 7$
  3. choice 2pts: Triángulo de lados $5,5,8$ cm es: → Escaleno, Isósceles, Equilátero, Rectángulo [correct: Isósceles]
  4. text 3pts: Hipotenusa de triángulo rectángulo con catetos $6$ y $8$ cm. $c=\sqrt{6^2+8^2}$
  5. choice 2pts: Ángulos de un polígono regular de $6$ lados (hexágono): → $60°$, $120°$, $90°$, $108°$ [correct: $120°$]
  6. text 3pts: Área de trapecio $B=14$ cm, $b=10$ cm, $h=6$ cm. $A=\frac{(14+10)\times 6}{2}$
  7. choice 3pts: ¿Cuál es el área de un rombo con diagonales $d_1=8$ cm y $d_2=6$ cm? $A=\frac{d_1\cdot d_2}{2}$ → $24$, $48$, $12$, $28$ [correct: $24$]
  8. text 4pts: Un jardín circular tiene radio $10$ m. Calcula: a) su área $A=\pi r^2$ b) la longitud de su borde $C=2\pi r$. Usa $\pi=3.14$.
  9. choice 3pts: Área de triángulo equilátero lado $6$: $\frac{36\sqrt{3}}{4}=9\sqrt{3}$ → $9\sqrt{3}$, $18\sqrt{3}$, $6\sqrt{3}$, $12\sqrt{3}$
```

#### tmpl_geo_exam_2 — Examen: Geometría del espacio (hard, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. text 3pts: Volumen de caja $5\times 4\times 3$ cm. $V=5\times 4\times 3$
  2. choice 2pts: $V$ cilindro $r=3$, $h=7$: $\pi r^2 h$ → $63\pi$, $21\pi$, $9\pi$, $42\pi$ [correct: $63\pi$]
  3. text 3pts: Área total de cubo arista $4$ cm. $A_T=6a^2$
  4. choice 2pts: $V$ pirámide $B=36$ cm², $h=8$ cm: $V=\frac{Bh}{3}$ → $288$, $96$, $144$, $48$ [correct: $96$]
  5. text 4pts: Esfera $r=6$ cm: a) $V=\frac{4}{3}\pi r^3$  b) $A=4\pi r^2$
  6. choice 3pts: Un cono tiene $r=4$ y $h=3$. Su generatriz $l=\sqrt{r^2+h^2}=$ → $5$, $7$, $4$, $3$ [correct: $5$]
  7. text 4pts: Un acuario rectangular mide $80\times 40\times 50$ cm. ¿Cuántos litros caben? ($1$ L $= 1000$ cm³)
  8. choice 4pts: Volumen de cono $r=6$, $h=9$: $\frac{1}{3}\pi(36)(9)$ → $108\pi$, $324\pi$, $54\pi$, $36\pi$ [correct: $108\pi$]
```

---

### RAZONAMIENTO MATEMÁTICO

#### tmpl_rm_hw_1 — Tarea: Series y patrones numéricos (easy, 30 XP)
```
instructions: |
  Encuentra el término siguiente y la regla de cada sucesión.

  **1.** Aritmética: $$5,\;8,\;11,\;14,\;\ldots$$
  Diferencia común $d=?$; término siguiente $=?$

  **2.** Geométrica: $$3,\;6,\;12,\;24,\;\ldots$$
  Razón $r=?$; término siguiente $=?$

  **3.** $$1,\;4,\;9,\;16,\;25,\;\ldots$$
  ¿Qué relación tienen estos números? ¿Cuál es el siguiente?

  **4.** $$2,\;3,\;5,\;8,\;13,\;\ldots$$
  ¿Reconoces el patrón? Escribe los dos siguientes.

  **5.** Usa la fórmula $a_n=a_1+(n-1)d$ para encontrar el término $10$ de la serie: $4,\;7,\;10,\;13,\;\ldots$
defaultDueDays: 5
```

#### tmpl_rm_hw_2 — Tarea: Problemas de lógica (medium, 30 XP)
```
instructions: |
  Resuelve cada problema de lógica mostrando tu razonamiento.

  **1.** Si todos los $A$ son $B$ y todos los $B$ son $C$, ¿todos los $A$ son $C$? Justifica.

  **2.** En una carrera, Ana llegó antes que Beatriz y Beatriz antes que Carmen. ¿Quién llegó última?

  **3.** Completa la tabla de verdad para $p \land q$ (conjunción):

  | $p$ | $q$ | $p\land q$ |
  |-----|-----|------------|
  | V   | V   | ?          |
  | V   | F   | ?          |
  | F   | V   | ?          |
  | F   | F   | ?          |

  **4.** Si $x$ es par, entonces $x^2$ es par. ¿Es verdad? Da un ejemplo y una justificación.

  **5.** Tres amigos tienen diferente edad. Luis es mayor que Mario, Mario es mayor que Pedro. Ordénalos de mayor a menor.
defaultDueDays: 7
```

#### tmpl_rm_ex_1 — Ejercicio: Sucesiones aritméticas y geométricas (medium, 40 XP)
```json
problems: [
  {
    "question": "Encuentra el término $n=15$ de la sucesión aritmética $2, 5, 8, 11,\\ldots$\n$$a_n=a_1+(n-1)d$$",
    "hint": "$d=3$, $a_1=2$",
    "answer": "$a_{15}=2+14\\times 3=44$"
  },
  {
    "question": "Calcula la suma de los primeros $10$ términos de la sucesión $1, 3, 5, 7,\\ldots$\n$$S_n=\\frac{n(a_1+a_n)}{2}$$",
    "answer": "$a_{10}=19$, $S_{10}=\\frac{10(1+19)}{2}=100$"
  },
  {
    "question": "En una sucesión geométrica: $a_1=2$, $r=3$. Calcula $a_5$.\n$$a_n=a_1\\cdot r^{n-1}$$",
    "answer": "$a_5=2\\cdot 3^4=2\\cdot 81=162$"
  },
  {
    "question": "Encuentra los tres términos medios entre $4$ y $64$ en una sucesión geométrica.",
    "hint": "$r=\\sqrt[4]{\\frac{64}{4}}=\\sqrt[4]{16}=2$",
    "answer": "$4, 8, 16, 32, 64$"
  },
  {
    "question": "Una sucesión aritmética tiene $a_3=11$ y $a_7=23$. Encuentra $a_1$ y $d$.",
    "hint": "$a_7-a_3=4d$",
    "answer": "$d=3$, $a_1=5$"
  }
]
```

#### tmpl_rm_ex_2 — Ejercicio: Conteo y combinatoria básica (hard, 40 XP)
```json
problems: [
  {
    "question": "¿De cuántas formas puedes ordenar las letras A, B, C?\n$$P_n=n!$$",
    "answer": "$3!=6$ formas"
  },
  {
    "question": "Un menú tiene 3 entradas y 4 platos fuertes. ¿Cuántas combinaciones posibles hay?\n(Principio de multiplicación)",
    "answer": "$3\\times 4=12$ combinaciones"
  },
  {
    "question": "De un grupo de 6 estudiantes se escogen 2 para un proyecto. ¿Cuántas parejas posibles?\n$$C(n,r)=\\frac{n!}{r!(n-r)!}$$",
    "hint": "$C(6,2)=\\frac{6!}{2!\\cdot 4!}$",
    "answer": "$C(6,2)=15$ parejas"
  },
  {
    "question": "¿Cuántas contraseñas de 4 dígitos distintos se pueden formar con $\\{1,2,3,4,5\\}$?\n$$P(n,r)=\\frac{n!}{(n-r)!}$$",
    "answer": "$P(5,4)=\\frac{5!}{1!}=120$"
  },
  {
    "question": "En una clase de 10 alumnos se sortea un primero, segundo y tercer lugar. ¿Cuántos resultados posibles?\n$$P(10,3)=\\frac{10!}{7!}$$",
    "answer": "$10\\times 9\\times 8=720$"
  }
]
```

#### tmpl_rm_fm_1 — Formulario: Test de aptitud matemática (easy, 20 XP)
```json
questions: [
  { "text": "¿Cuál es el siguiente número en: $2, 4, 8, 16, \\ldots$?", "type": "choice", "options": ["$20$","$24$","$32$","$18$"], "required": true },
  { "text": "Si $a_1=5$ y $d=4$, ¿cuál es $a_6$ en una sucesión aritmética?", "type": "choice", "options": ["$21$","$25$","$29$","$24$"], "required": true },
  { "text": "¿Cuántos números del 1 al 100 son múltiplos de 5?", "type": "choice", "options": ["$15$","$20$","$25$","$10$"], "required": true },
  { "text": "¿Qué estrategia usas cuando no entiendes un problema matemático?", "type": "text", "required": true },
  { "text": "$C(5,2)=$", "type": "choice", "options": ["$10$","$20$","$5$","$15$"], "required": true }
]
```

#### tmpl_rm_fm_2 — Formulario: Análisis de estrategias (medium, 20 XP)
```json
questions: [
  { "text": "Describe los pasos que sigues para resolver un problema matemático complejo.", "type": "text", "required": true },
  { "text": "¿Cuál de estas estrategias usas con más frecuencia?", "type": "choice", "options": ["Hacer un dibujo o diagrama","Buscar un patrón","Resolver un caso más simple","Trabajar hacia atrás"], "required": true },
  { "text": "Da un ejemplo de un problema donde identificaste un patrón para resolverlo.", "type": "text", "required": true },
  { "text": "¿En qué área del razonamiento matemático sientes que debes mejorar?", "type": "text", "required": false },
  { "text": "¿Qué tan útil es el razonamiento lógico fuera del aula? Da un ejemplo.", "type": "text", "required": true }
]
```

#### tmpl_rm_exam_1 — Examen: Razonamiento numérico (medium, 80 XP)
```
durationMinutes: 40 · passingScore: 60 · totalPoints: 20
questions:
  1. choice 2pts: Siguiente en $3,7,11,15,\ldots$: → $17$, $18$, $19$, $20$ [correct: $19$]
  2. text 2pts: Término 8 de $a_1=2$, $d=5$. $a_8=2+7\times 5$
  3. choice 2pts: $a_1=81$, $r=\frac{1}{3}$: ¿cuál es $a_4$? → $27$, $9$, $3$, $1$ [correct: $3$]
  4. text 3pts: Suma de los primeros $12$ impares: $S_{12}=12^2=144$
  5. choice 2pts: Siguiente: $1, 1, 2, 3, 5, 8, \ldots$: → $11$, $12$, $13$, $15$ [correct: $13$]
  6. text 3pts: Halla $x$: $2, x, 8, 11, 14$. ¿Aritmética? $d=3$, $x=5$
  7. choice 2pts: $5!=$: → $60$, $120$, $24$, $240$ [correct: $120$]
  8. text 2pts: ¿Cuántos múltiplos de $3$ hay entre $1$ y $50$? (incluye los extremos si aplica)
  9. choice 2pts: $C(4,2)=$ → $6$, $8$, $12$, $4$ [correct: $6$]
```

#### tmpl_rm_exam_2 — Examen: Lógica y patrones (hard, 80 XP)
```
durationMinutes: 40 · passingScore: 60 · totalPoints: 20
questions:
  1. text 3pts: Completa la tabla de verdad para $p\lor q$ (4 filas)
  2. choice 2pts: Si todos los estudiantes estudian y Ana es estudiante, entonces: → Ana estudia, Ana no estudia, Depende, No se puede saber [correct: Ana estudia]
  3. text 3pts: Siguiente término en la serie de figuras: $\triangle,\square,\triangle\triangle,\square\square,\triangle\triangle\triangle,\ldots$ Describe el patrón.
  4. choice 2pts: Negación de "Todos los números pares son divisibles por 4": → Ningún par es divisible por 4, Algún par no es divisible por 4, Todos son divisibles, Solo el 2 [correct: Algún par no es divisible por 4]
  5. text 4pts: Problema: 4 amigos se saludan de mano cada uno con los demás. ¿Cuántos apretones de manos hay? $C(4,2)$
  6. choice 2pts: Si $p\Rightarrow q$ es verdadero y $p$ es verdadero, entonces: → $q$ es verdadero, $q$ es falso, No se sabe, $p$ es falso [correct: $q$ es verdadero]
  7. text 4pts: ¿Cuántos números de 3 cifras distintas se forman con $\{1,2,3,4\}$? $P(4,3)$
```

---

### TRIGONOMETRÍA

#### tmpl_trig_hw_1 — Tarea: Razones trigonométricas (easy, 30 XP)
```
instructions: |
  En un triángulo rectángulo, las razones trigonométricas son:
  $$\sin\theta=\frac{\text{cateto opuesto}}{\text{hipotenusa}} \qquad \cos\theta=\frac{\text{cateto adyacente}}{\text{hipotenusa}} \qquad \tan\theta=\frac{\text{cateto opuesto}}{\text{cateto adyacente}}$$

  **1.** En un triángulo con catetos $3$ y $4$ e hipotenusa $5$, calcula $\sin\theta$, $\cos\theta$ y $\tan\theta$ para el ángulo opuesto al cateto de $3$.

  **2.** Si $\sin 30°=\frac{1}{2}$, ¿cuánto mide la hipotenusa de un triángulo con cateto opuesto de $7$ cm?

  **3.** Calcula el ángulo $\theta$ si $\tan\theta=1$ (sin calculadora).

  **4.** Un poste de $10$ m proyecta una sombra de $10$ m. ¿Cuál es el ángulo de elevación del sol?
  $$\tan\theta=\frac{10}{10}$$

  **5.** Completa la tabla:
  | $\theta$ | $\sin\theta$ | $\cos\theta$ | $\tan\theta$ |
  |----------|-------------|-------------|-------------|
  | $0°$     | $0$         | $1$         | $0$         |
  | $30°$    | $\frac{1}{2}$ | $\frac{\sqrt{3}}{2}$ | $\frac{1}{\sqrt{3}}$ |
  | $45°$    | ?           | ?           | ?           |
  | $60°$    | ?           | ?           | ?           |
  | $90°$    | $1$         | $0$         | —           |
defaultDueDays: 5
```

#### tmpl_trig_hw_2 — Tarea: Identidades trigonométricas fundamentales (medium, 30 XP)
```
instructions: |
  Usando las identidades fundamentales:
  $$\sin^2\theta+\cos^2\theta=1 \qquad \tan\theta=\frac{\sin\theta}{\cos\theta} \qquad 1+\tan^2\theta=\sec^2\theta$$

  **1.** Si $\sin\theta=\frac{3}{5}$, calcula $\cos\theta$ y $\tan\theta$.

  **2.** Demuestra que $\frac{\sin^2\theta}{\cos^2\theta}+1=\sec^2\theta$.

  **3.** Simplifica: $\sin^2\theta+\cos^2\theta+\tan^2\theta$.

  **4.** Si $\cos\theta=\frac{\sqrt{2}}{2}$, ¿cuánto vale $\theta$?

  **5.** Verifica la identidad para $\theta=30°$:
  $$\sin^2 30°+\cos^2 30°=\left(\frac{1}{2}\right)^2+\left(\frac{\sqrt{3}}{2}\right)^2$$
defaultDueDays: 7
```

#### tmpl_trig_ex_1 — Ejercicio: Resolución de triángulos rectángulos (medium, 40 XP)
```json
problems: [
  {
    "question": "Un triángulo rectángulo tiene $\\theta=37°$ e hipotenusa $10$ cm. Calcula los catetos.\n$$a=10\\sin 37° \\qquad b=10\\cos 37°$$\n(usa $\\sin 37°\\approx 0.6$, $\\cos 37°\\approx 0.8$)",
    "answer": "$a=6$ cm, $b=8$ cm"
  },
  {
    "question": "Un árbol proyecta una sombra de $15$ m. El ángulo de elevación del sol es $60°$. ¿Cuánto mide el árbol?\n$$h=15\\cdot\\tan 60°=15\\sqrt{3}$$",
    "answer": "$h=15\\sqrt{3}\\approx 26$ m"
  },
  {
    "question": "Desde un punto a nivel del suelo, el ángulo de elevación de la cima de un edificio de $50$ m de altura es $45°$. ¿A qué distancia está el punto del edificio?\n$$\\tan 45°=\\frac{50}{d}$$",
    "answer": "$d=50$ m"
  },
  {
    "question": "En un triángulo rectángulo: cateto opuesto $=12$, cateto adyacente $=5$. Calcula $\\sin\\theta$, $\\cos\\theta$, $\\tan\\theta$.",
    "hint": "Primero calcula la hipotenusa con Pitágoras",
    "answer": "Hip$=13$; $\\sin\\theta=\\frac{12}{13}$, $\\cos\\theta=\\frac{5}{13}$, $\\tan\\theta=\\frac{12}{5}$"
  },
  {
    "question": "Una rampa sube $3$ m por cada $4$ m horizontales. ¿Cuál es el ángulo de inclinación?\n$$\\tan\\theta=\\frac{3}{4}$$",
    "answer": "$\\theta=\\arctan(0.75)\\approx 36.87°$"
  }
]
```

#### tmpl_trig_ex_2 — Ejercicio: Ley de senos y cosenos (hard, 40 XP)
```json
problems: [
  {
    "question": "En el triángulo $ABC$: $A=45°$, $B=60°$, $a=8$ cm. Calcula $b$.\n$$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}$$",
    "hint": "$C=180°-45°-60°=75°$",
    "answer": "$b=\\frac{8\\sin 60°}{\\sin 45°}=\\frac{8\\cdot\\frac{\\sqrt{3}}{2}}{\\frac{\\sqrt{2}}{2}}=4\\sqrt{6}\\approx 9.8$ cm"
  },
  {
    "question": "Dos lados de un triángulo miden $b=7$ y $c=9$ con ángulo $A=60°$ entre ellos. Calcula $a$.\n$$a^2=b^2+c^2-2bc\\cos A$$",
    "answer": "$a^2=49+81-2(7)(9)(0.5)=130-63=67$, $a=\\sqrt{67}\\approx 8.2$ cm"
  },
  {
    "question": "Un triángulo tiene lados $a=5$, $b=7$, $c=8$. Calcula el ángulo $C$.\n$$\\cos C=\\frac{a^2+b^2-c^2}{2ab}$$",
    "answer": "$\\cos C=\\frac{25+49-64}{70}=\\frac{10}{70}=\\frac{1}{7}$, $C\\approx 81.8°$"
  },
  {
    "question": "Un barco observa dos faros: $A$ a $3$ km y $B$ a $4$ km. El ángulo entre las visuales es $60°$. ¿A qué distancia están los faros entre sí?\n$$c^2=a^2+b^2-2ab\\cos C$$",
    "answer": "$c^2=9+16-12=13$, $c=\\sqrt{13}\\approx 3.6$ km"
  },
  {
    "question": "Calcula el área del triángulo con $b=10$, $c=12$ y ángulo $A=30°$.\n$$\\text{Área}=\\frac{1}{2}bc\\sin A$$",
    "answer": "$A=\\frac{1}{2}(10)(12)\\sin 30°=\\frac{1}{2}(120)(0.5)=30\\text{ cm}^2$"
  }
]
```

#### tmpl_trig_fm_1 — Formulario: Diagnóstico de trigonometría (easy, 20 XP)
```json
questions: [
  { "text": "$\\sin 30°=$", "type": "choice", "options": ["$\\frac{1}{2}$","$\\frac{\\sqrt{3}}{2}$","$1$","$\\frac{\\sqrt{2}}{2}$"], "required": true },
  { "text": "$\\cos 60°=$", "type": "choice", "options": ["$\\frac{\\sqrt{3}}{2}$","$\\frac{1}{2}$","$\\frac{\\sqrt{2}}{2}$","$1$"], "required": true },
  { "text": "¿Cuál identidad es correcta?", "type": "choice", "options": ["$\\sin^2\\theta+\\cos^2\\theta=1$","$\\sin^2\\theta-\\cos^2\\theta=1$","$\\sin\\theta\\cdot\\cos\\theta=1$","$\\sin^2\\theta=1+\\cos^2\\theta$"], "required": true },
  { "text": "Explica qué es el ángulo de elevación y da un ejemplo real.", "type": "text", "required": true },
  { "text": "$\\tan 45°=$", "type": "choice", "options": ["$0$","$\\frac{\\sqrt{2}}{2}$","$\\sqrt{3}$","$1$"], "required": true }
]
```

#### tmpl_trig_fm_2 — Formulario: Reporte de aplicación trigonométrica (medium, 20 XP)
```json
questions: [
  { "text": "Describe un problema real que hayas resuelto o puedas resolver con trigonometría.", "type": "text", "required": true },
  { "text": "¿Qué ley utilizaste o utilizarías? ¿Por qué?", "type": "choice", "options": ["Razones trigonométricas básicas","Ley de senos","Ley de cosenos","No sé cuál usar"], "required": true },
  { "text": "Escribe el planteamiento matemático de tu problema con las fórmulas adecuadas.", "type": "text", "required": true },
  { "text": "¿Qué herramientas usaste para calcular? (tabla, calculadora, valores exactos)", "type": "text", "required": false },
  { "text": "¿Qué aspecto de la trigonometría te parece más útil en la vida real?", "type": "text", "required": true }
]
```

#### tmpl_trig_exam_1 — Examen: Razones trigonométricas (medium, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: $\cos 0°=$ → $0$, $1$, $\frac{1}{2}$, $\frac{\sqrt{2}}{2}$ [correct: $1$]
  2. text 3pts: Triángulo rectángulo: cateto op.$=8$, hip.$=17$. Calcula $\sin,\cos,\tan$.
  3. choice 2pts: $\tan 60°=$ → $\sqrt{3}$, $\frac{1}{\sqrt{3}}$, $1$, $\frac{\sqrt{2}}{2}$ [correct: $\sqrt{3}$]
  4. text 3pts: Ángulo de elevación $30°$, dist. horizontal $50$ m. Altura del edificio: $h=50\tan 30°$
  5. choice 3pts: Si $\sin\theta=\frac{4}{5}$, entonces $\cos\theta=$ → $\frac{3}{5}$, $\frac{4}{3}$, $\frac{5}{4}$, $\frac{3}{4}$ [correct: $\frac{3}{5}$]
  6. text 3pts: Verifica: $\sin^2 45°+\cos^2 45°=1$
  7. choice 3pts: $\sin(90°-\theta)=$ → $\cos\theta$, $\sin\theta$, $\tan\theta$, $-\cos\theta$ [correct: $\cos\theta$]
  8. text 4pts: Una cometa a $100$ m de cuerda forma $60°$ con el suelo. ¿A qué altura vuela? $h=100\sin 60°$
  9. choice 2pts: $\frac{\sin\theta}{\cos\theta}=$ → $\sec\theta$, $\tan\theta$, $\csc\theta$, $\cot\theta$ [correct: $\tan\theta$]
```

#### tmpl_trig_exam_2 — Examen: Identidades y leyes (hard, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. text 4pts: Si $\tan\theta=\frac{5}{12}$, calcula $\sin\theta$ y $\cos\theta$. (Construye el triángulo auxiliar)
  2. choice 2pts: $1+\tan^2\theta=$ → $\sec^2\theta$, $\csc^2\theta$, $\cos^2\theta$, $2$ [correct: $\sec^2\theta$]
  3. text 4pts: Ley de cosenos: $a=6, b=8, C=90°$. Calcula $c$. (Verifica que coincide con Pitágoras)
  4. choice 3pts: Ley de senos: $A=30°$, $a=5$. ¿Cuánto mide $b$ si $B=60°$? → $5\sqrt{3}$, $10$, $\frac{5}{\sqrt{3}}$, $5$ [correct: $5\sqrt{3}$]
  5. text 3pts: Demuestra que $\frac{1-\cos^2\theta}{\sin\theta}=\sin\theta$
  6. choice 3pts: Área de triángulo: $b=6, c=10, A=45°$. $\text{Área}=\frac{1}{2}bc\sin A=$ → $15\sqrt{2}$, $30$, $\frac{15\sqrt{2}}{2}$, $30\sqrt{2}$ [correct: $15\sqrt{2}$]
  7. text 4pts: Triángulo: lados $7, 10, 11$. Calcula el ángulo mayor con la ley de cosenos.
  8. choice 2pts: En triángulo obtusángulo, ¿qué ley es siempre aplicable? → Solo Pitágoras, Ley de senos, Ley de cosenos, Ninguna [correct: Ley de cosenos]
```

---

### QUÍMICA

#### tmpl_quim_hw_1 — Tarea: Balanceo de ecuaciones químicas (medium, 30 XP)
```
instructions: |
  Balancea las siguientes ecuaciones usando el método de tanteo.
  Recuerda: el número de átomos de cada elemento debe ser igual en reactivos y productos.

  **1.** $$\text{H}_2 + \text{O}_2 \rightarrow \text{H}_2\text{O}$$

  **2.** $$\text{Fe} + \text{O}_2 \rightarrow \text{Fe}_2\text{O}_3$$

  **3.** $$\text{CH}_4 + \text{O}_2 \rightarrow \text{CO}_2 + \text{H}_2\text{O}$$

  **4.** $$\text{Al} + \text{HCl} \rightarrow \text{AlCl}_3 + \text{H}_2$$

  **5.** $$\text{C}_3\text{H}_8 + \text{O}_2 \rightarrow \text{CO}_2 + \text{H}_2\text{O}$$

  Verifica contando los átomos de cada elemento en reactivos y productos.
defaultDueDays: 7
```

#### tmpl_quim_hw_2 — Tarea: Tabla periódica — grupos y períodos (easy, 30 XP)
```
instructions: |
  Responde usando la tabla periódica.

  **1.** El sodio ($\text{Na}$) tiene número atómico $Z=11$.
  Escribe su configuración electrónica: $$1s^2\;2s^2\;2p^6\;3s^1$$
  ¿A qué grupo y período pertenece?

  **2.** ¿Cuántos electrones de valencia tiene el cloro ($\text{Cl}$, $Z=17$)?

  **3.** Ordena por electronegatividad creciente: $\text{Na}$, $\text{F}$, $\text{O}$, $\text{Cl}$.
  (Recuerda: aumenta hacia arriba y a la derecha en la tabla)

  **4.** ¿Por qué los gases nobles ($\text{He}$, $\text{Ne}$, $\text{Ar}$) no forman compuestos generalmente?
  Pista: su configuración de valencia es $ns^2np^6$.

  **5.** Escribe la fórmula del compuesto iónico entre $\text{Na}^+$ y $\text{Cl}^-$,
  y entre $\text{Ca}^{2+}$ y $\text{Cl}^-$.
defaultDueDays: 5
```

#### tmpl_quim_ex_1 — Ejercicio: Mol y masa molar (medium, 40 XP)
```json
problems: [
  {
    "question": "Calcula la masa molar del $\\text{H}_2\\text{O}$.\n$$M=2(1)+16=18\\text{ g/mol}$$\n¿Cuántos gramos hay en $3$ mol de agua?",
    "answer": "$m=n\\times M=3\\times 18=54\\text{ g}$"
  },
  {
    "question": "¿Cuántos moles hay en $44$ g de $\\text{CO}_2$?\n$$n=\\frac{m}{M} \\qquad M(\\text{CO}_2)=12+2(16)=44\\text{ g/mol}$$",
    "answer": "$n=\\frac{44}{44}=1\\text{ mol}$"
  },
  {
    "question": "¿Cuántas moléculas hay en $2$ mol de $\\text{O}_2$?\n$$N=n\\times N_A \\qquad N_A=6.022\\times 10^{23}$$",
    "answer": "$N=2\\times 6.022\\times 10^{23}=1.204\\times 10^{24}$ moléculas"
  },
  {
    "question": "La masa molar del $\\text{NaCl}$ es $58.5$ g/mol. ¿Cuántos moles hay en $29.25$ g?",
    "answer": "$n=\\frac{29.25}{58.5}=0.5\\text{ mol}$"
  },
  {
    "question": "Calcula la masa de $0.5$ mol de glucosa $\\text{C}_6\\text{H}_{12}\\text{O}_6$.\n$$M=6(12)+12(1)+6(16)$$",
    "answer": "$M=72+12+96=180\\text{ g/mol}$; $m=0.5\\times 180=90\\text{ g}$"
  }
]
```

#### tmpl_quim_ex_2 — Ejercicio: Concentración de soluciones (hard, 40 XP)
```json
problems: [
  {
    "question": "Calcula la molaridad de una solución que contiene $58.5$ g de $\\text{NaCl}$ en $500$ mL de solución.\n$$M=\\frac{n}{V(L)} \\qquad M(\\text{NaCl})=58.5\\text{ g/mol}$$",
    "answer": "$n=1$ mol; $M=\\frac{1}{0.5}=2\\text{ mol/L}$"
  },
  {
    "question": "¿Qué porcentaje en masa (% m/m) tiene una solución de $20$ g de azúcar en $80$ g de agua?\n$$\\%m/m=\\frac{m_{\\text{soluto}}}{m_{\\text{solución}}}\\times 100$$",
    "answer": "$\\%=\\frac{20}{100}\\times 100=20\\%$"
  },
  {
    "question": "¿Cuántos gramos de $\\text{NaOH}$ (M$=40$ g/mol) se necesitan para preparar $250$ mL de solución $0.1$ M?\n$$m=n\\times M \\qquad n=M\\times V$$",
    "answer": "$n=0.1\\times 0.25=0.025$ mol; $m=0.025\\times 40=1$ g"
  },
  {
    "question": "Concentración en ppm: si $2$ mg de contaminante están en $1$ kg de agua, ¿cuántos ppm son?\n$$\\text{ppm}=\\frac{m_{\\text{soluto}}(\\text{mg})}{m_{\\text{solución}}(\\text{kg})}$$",
    "answer": "$\\text{ppm}=\\frac{2}{1}=2$ ppm"
  },
  {
    "question": "Dilución: $V_1=50$ mL de solución $2$ M. Se diluye hasta $200$ mL. ¿Cuál es la nueva concentración?\n$$C_1V_1=C_2V_2$$",
    "answer": "$C_2=\\frac{2\\times 50}{200}=0.5$ M"
  }
]
```

#### tmpl_quim_fm_1 — Formulario: Reporte de práctica de laboratorio (medium, 20 XP)
```json
questions: [
  { "text": "¿Cuál fue el objetivo de la práctica?", "type": "text", "required": true },
  { "text": "¿Qué tipo de reacción química observaste?", "type": "choice", "options": ["Síntesis: $A+B\\rightarrow AB$","Descomposición: $AB\\rightarrow A+B$","Sustitución simple","Doble sustitución"], "required": true },
  { "text": "Escribe la ecuación química balanceada de la reacción observada.", "type": "text", "required": true },
  { "text": "¿Qué medidas de seguridad siguieron durante la práctica?", "type": "text", "required": true },
  { "text": "¿Coincidieron los resultados con lo esperado teóricamente? Explica las diferencias.", "type": "text", "required": true }
]
```

#### tmpl_quim_fm_2 — Formulario: Diagnóstico de química general (easy, 20 XP)
```json
questions: [
  { "text": "¿Cuántos protones tiene el carbono ($\\text{C}$, $Z=6$)?", "type": "choice", "options": ["$4$","$6$","$8$","$12$"], "required": true },
  { "text": "¿Cuál es la fórmula del agua?", "type": "choice", "options": ["$\\text{HO}$","$\\text{H}_2\\text{O}$","$\\text{H}_2\\text{O}_2$","$\\text{OH}_2$"], "required": true },
  { "text": "La masa molar del $\\text{O}_2$ (en g/mol) es:", "type": "choice", "options": ["$16$","$32$","$8$","$64$"], "required": true },
  { "text": "Explica con tus palabras qué es un enlace iónico y da un ejemplo.", "type": "text", "required": true },
  { "text": "¿Cuántos electrones de valencia tiene el oxígeno ($Z=8$)?", "type": "choice", "options": ["$2$","$4$","$6$","$8$"], "required": true }
]
```

#### tmpl_quim_exam_1 — Examen: Nomenclatura y formulación (medium, 80 XP)
```
durationMinutes: 45 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: Fórmula del cloruro de sodio: → $\text{NaCl}$, $\text{NaCl}_2$, $\text{Na}_2\text{Cl}$, $\text{Na}_2\text{Cl}_2$ [correct: $\text{NaCl}$]
  2. text 3pts: Nombra: $\text{H}_2\text{SO}_4$, $\text{HCl}$, $\text{HNO}_3$
  3. choice 2pts: Número de oxidación del $\text{Mn}$ en $\text{KMnO}_4$ ($K=+1$, $O=-2$): → $+7$, $+5$, $+3$, $+1$ [correct: $+7$]
  4. text 3pts: Escribe y balancea: síntesis del agua a partir de $\text{H}_2$ y $\text{O}_2$
  5. choice 2pts: El compuesto $\text{CO}_2$ se llama: → Monóxido de carbono, Dióxido de carbono, Óxido de carbono, Carbono dióxido [correct: Dióxido de carbono]
  6. text 3pts: Fórmula de: óxido de calcio, hidróxido de potasio, ácido clorhídrico
  7. choice 3pts: Enlace entre metales y no metales: → Covalente, Iónico, Metálico, Hidrógeno [correct: Iónico]
  8. text 3pts: ¿Cuántos átomos de cada elemento hay en $2\text{ mol}$ de $\text{H}_2\text{SO}_4$?
  9. choice 4pts: La sal formada por $\text{Ca}^{2+}$ y $\text{PO}_4^{3-}$ es: → $\text{Ca}_3(\text{PO}_4)_2$, $\text{CaPO}_4$, $\text{Ca}_2(\text{PO}_4)_3$, $\text{Ca}(\text{PO}_4)_2$ [correct: $\text{Ca}_3(\text{PO}_4)_2$]
```

#### tmpl_quim_exam_2 — Examen: Estequiometría (hard, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. text 3pts: Balancea: $\text{Fe}+\text{O}_2\rightarrow\text{Fe}_2\text{O}_3$. ¿Cuántos moles de $\text{Fe}_2\text{O}_3$ se forman con $4$ mol de $\text{Fe}$?
  2. choice 2pts: M molar de $\text{CaCO}_3$ ($\text{Ca}=40, \text{C}=12, \text{O}=16$): → $84$, $100$, $116$, $92$ [correct: $100$]
  3. text 4pts: $\text{CH}_4+2\text{O}_2\rightarrow\text{CO}_2+2\text{H}_2\text{O}$. Con $64$ g de $\text{CH}_4$ ($M=16$), ¿cuántos gramos de $\text{CO}_2$ ($M=44$) se producen?
  4. choice 2pts: ¿Cuántos moles hay en $90$ g de $\text{H}_2\text{O}$ ($M=18$ g/mol)? → $2$, $5$, $3$, $4$ [correct: $5$]
  5. text 3pts: Rendimiento: reacción teórica produce $10$ g de producto, pero en práctica solo se obtienen $7.5$ g. $\%\text{rend}=\frac{7.5}{10}\times 100$
  6. choice 3pts: Reactivo limitante en $3\text{ mol }\text{H}_2 + 2\text{ mol }\text{O}_2\rightarrow 2\text{H}_2\text{O}$: → $\text{H}_2$, $\text{O}_2$, Ninguno, Ambos [correct: $\text{H}_2$ — se necesitan $4$ mol $\text{H}_2$ para $2$ mol $\text{O}_2$]
  7. text 4pts: ¿Cuántos gramos de $\text{NaCl}$ ($M=58.5$) se producen al reaccionar $2.3$ g de $\text{Na}$ ($M=23$) con exceso de $\text{Cl}_2$? $2\text{Na}+\text{Cl}_2\rightarrow 2\text{NaCl}$
  8. choice 4pts: Número de Avogadro: → $6.022\times 10^{23}$, $6.022\times 10^{22}$, $3.011\times 10^{23}$, $6.022\times 10^{24}$ [correct: $6.022\times 10^{23}$]
```

---

### FÍSICA

#### tmpl_fis_hw_1 — Tarea: Cinemática — MRU y MRUA (medium, 30 XP)
```
instructions: |
  Usa las ecuaciones cinemáticas para resolver cada problema.

  **MRU** (velocidad constante):
  $$x=x_0+v\cdot t$$

  **MRUA** (aceleración constante):
  $$v=v_0+at \qquad x=x_0+v_0t+\frac{1}{2}at^2 \qquad v^2=v_0^2+2a\Delta x$$

  **1.** Un auto viaja a $90\text{ km/h}$. ¿Qué distancia recorre en $2.5$ h? (MRU)

  **2.** Un objeto parte del reposo con $a=4\text{ m/s}^2$. ¿Cuál es su velocidad a los $5$ s?

  **3.** Un tren frena de $72\text{ km/h}$ hasta detenerse en $10$ s. ¿Cuál es la desaceleración?
  $$v=v_0+at \Rightarrow 0=20+a(10)$$

  **4.** Una pelota cae desde $h=45$ m (caída libre, $g=10\text{ m/s}^2$). ¿En cuánto tiempo llega al suelo?
  $$h=\frac{1}{2}gt^2$$

  **5.** Un ciclista acelera de $2\text{ m/s}$ a $10\text{ m/s}$ en $4$ s. ¿Cuánto recorrió?
defaultDueDays: 7
```

#### tmpl_fis_hw_2 — Tarea: Leyes de Newton (easy, 30 XP)
```
instructions: |
  **1ª Ley:** Un objeto en reposo permanece en reposo (o en movimiento rectilíneo uniforme) si la fuerza neta es cero: $\sum\vec{F}=0$.

  **2ª Ley:** $$\vec{F}=m\cdot\vec{a}$$

  **3ª Ley:** Acción y reacción son iguales y opuestas: $\vec{F}_{AB}=-\vec{F}_{BA}$.

  **1.** Una masa de $5$ kg acelera a $3\text{ m/s}^2$. ¿Qué fuerza se le aplica?

  **2.** Una fuerza de $20$ N actúa sobre un objeto y lo acelera a $4\text{ m/s}^2$. ¿Cuál es su masa?

  **3.** ¿Cuál es el peso de un objeto de $8$ kg? ($g=9.8\text{ m/s}^2$)
  $$W=m\cdot g$$

  **4.** Sobre un libro en reposo actúan su peso $W$ y la normal $N$. Aplica la 1ª ley:
  $$N-W=0 \Rightarrow N=W$$

  **5.** Identifica el par acción-reacción cuando empujas una pared.
defaultDueDays: 5
```

#### tmpl_fis_ex_1 — Ejercicio: Movimiento rectilíneo (medium, 40 XP)
```json
problems: [
  {
    "question": "Un auto parte del reposo y alcanza $30\\text{ m/s}$ en $6$ s.\na) Calcula la aceleración: $a=\\frac{\\Delta v}{\\Delta t}$\nb) Distancia recorrida: $x=\\frac{1}{2}at^2$",
    "answer": "$a=5\\text{ m/s}^2$; $x=90$ m"
  },
  {
    "question": "Un tren viaja a $108\\text{ km/h}$ y frena con $a=-3\\text{ m/s}^2$. ¿En qué distancia se detiene?\n$$v^2=v_0^2+2a\\Delta x \\Rightarrow 0=v_0^2+2a\\Delta x$$\n(Primero convierte km/h a m/s: $\\div 3.6$)",
    "hint": "$v_0=30\\text{ m/s}$",
    "answer": "$\\Delta x=\\frac{v_0^2}{2|a|}=\\frac{900}{6}=150$ m"
  },
  {
    "question": "Un objeto cae libremente desde $80$ m de altura ($g=10\\text{ m/s}^2$).\na) Tiempo de caída: $h=\\frac{1}{2}gt^2$\nb) Velocidad al llegar: $v=gt$",
    "answer": "$t=4$ s; $v=40\\text{ m/s}$"
  },
  {
    "question": "Dos autos A y B parten del mismo punto: A va a $60\\text{ km/h}$ y B sale $0.5$ h después a $90\\text{ km/h}$. ¿Cuándo alcanza B a A?\n$$60t=90(t-0.5)$$",
    "answer": "$t=1.5$ h después de que salió A"
  },
  {
    "question": "Un proyectil se lanza verticalmente hacia arriba con $v_0=20\\text{ m/s}$ ($g=10\\text{ m/s}^2$).\na) Altura máxima: $h_{\\max}=\\frac{v_0^2}{2g}$\nb) Tiempo hasta la cima: $t=\\frac{v_0}{g}$",
    "answer": "$h_{\\max}=20$ m; $t=2$ s"
  }
]
```

#### tmpl_fis_ex_2 — Ejercicio: Trabajo y energía (hard, 40 XP)
```json
problems: [
  {
    "question": "Calcula el trabajo realizado por una fuerza de $50$ N que desplaza un objeto $8$ m en la misma dirección.\n$$W=F\\cdot d\\cdot\\cos\\theta \\qquad (\\theta=0°)$$",
    "answer": "$W=50\\times 8\\times 1=400$ J"
  },
  {
    "question": "Un objeto de $2$ kg se mueve a $6\\text{ m/s}$. Calcula su energía cinética.\n$$E_k=\\frac{1}{2}mv^2$$",
    "answer": "$E_k=\\frac{1}{2}(2)(36)=36$ J"
  },
  {
    "question": "Una caja de $5$ kg está a $10$ m de altura. Calcula su energía potencial gravitatoria.\n$$E_p=mgh \\qquad g=9.8\\text{ m/s}^2$$",
    "answer": "$E_p=5\\times 9.8\\times 10=490$ J"
  },
  {
    "question": "Por conservación de energía, una pelota de $0.5$ kg cae desde $5$ m. ¿Cuál es su velocidad justo antes de tocar el suelo?\n$$mgh=\\frac{1}{2}mv^2 \\Rightarrow v=\\sqrt{2gh}$$",
    "answer": "$v=\\sqrt{2\\times 10\\times 5}=\\sqrt{100}=10\\text{ m/s}$"
  },
  {
    "question": "Una fuerza de $30$ N actúa formando $60°$ con el desplazamiento de $10$ m.\n$$W=F\\cdot d\\cdot\\cos 60°$$",
    "hint": "$\\cos 60°=0.5$",
    "answer": "$W=30\\times 10\\times 0.5=150$ J"
  }
]
```

#### tmpl_fis_fm_1 — Formulario: Reporte de experimento de física (medium, 20 XP)
```json
questions: [
  { "text": "¿Cuál fue el objetivo del experimento?", "type": "text", "required": true },
  { "text": "¿Qué magnitud física mediste principalmente?", "type": "choice", "options": ["Velocidad ($\\text{m/s}$)","Fuerza ($\\text{N}$)","Distancia ($\\text{m}$)","Tiempo ($\\text{s}$)"], "required": true },
  { "text": "Escribe la ecuación física que relaciona las variables medidas.", "type": "text", "required": true },
  { "text": "¿Cuáles fueron las principales fuentes de error en tu experimento?", "type": "text", "required": true },
  { "text": "¿Coincidieron tus resultados experimentales con la teoría? Calcula el porcentaje de error:\n$$\\%\\text{error}=\\frac{|\\text{experimental}-\\text{teórico}|}{\\text{teórico}}\\times 100$$", "type": "text", "required": true }
]
```

#### tmpl_fis_fm_2 — Formulario: Diagnóstico de conceptos físicos (easy, 20 XP)
```json
questions: [
  { "text": "La unidad del Sistema Internacional para la fuerza es:", "type": "choice", "options": ["Joule ($\\text{J}$)","Newton ($\\text{N}$)","Pascal ($\\text{Pa}$)","Watt ($\\text{W}$)"], "required": true },
  { "text": "$F=ma$. Si $m=3$ kg y $a=5\\text{ m/s}^2$, la fuerza es:", "type": "choice", "options": ["$1.67$ N","$8$ N","$15$ N","$2$ N"], "required": true },
  { "text": "La velocidad de un MRU es:", "type": "choice", "options": ["Variable","Constante","Siempre cero","Siempre creciente"], "required": true },
  { "text": "Explica con tus palabras la diferencia entre masa y peso.", "type": "text", "required": true },
  { "text": "$E_k=\\frac{1}{2}mv^2$. Si $m=4$ kg y $v=3\\text{ m/s}$, $E_k=$", "type": "choice", "options": ["$6$ J","$12$ J","$18$ J","$36$ J"], "required": true }
]
```

#### tmpl_fis_exam_1 — Examen: Cinemática (medium, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: Un auto a $72\text{ km/h}$ ($=20\text{ m/s}$) recorre en $10$ s: → $200$ m, $720$ m, $72$ m, $100$ m [correct: $200$ m]
  2. text 3pts: $v_0=0$, $a=3\text{ m/s}^2$, $t=6$ s. Calcula $v$ y $x$. $v=18\text{ m/s}$, $x=54$ m
  3. choice 2pts: Objeto en caída libre: $g=10\text{ m/s}^2$, $t=4$ s. Velocidad: → $20$, $40$, $80$, $160$ m/s [correct: $40$]
  4. text 3pts: Triángulo $v$-$t$: auto frena de $20\text{ m/s}$ a $0$ en $4$ s. Calcula $a$ y distancia (área triángulo)
  5. choice 2pts: En MRUA, la gráfica $v$ vs $t$ es: → Curva parabólica, Línea horizontal, Línea oblicua, Hipérbola [correct: Línea oblicua]
  6. text 4pts: Bola lanzada arriba con $v_0=15\text{ m/s}$ ($g=10$). Tiempo hasta la cima, altura máxima, tiempo total de vuelo.
  7. choice 3pts: $v^2=v_0^2+2ax$. Si $v_0=0$, $a=5$, $x=20$: $v=$ → $10$, $\sqrt{200}$, $14.1$, $100$ m/s [correct: $\sqrt{200}\approx 14.1$]
  8. text 3pts: Dos trenes en sentidos opuestos: $v_A=20\text{ m/s}$, $v_B=30\text{ m/s}$, separados $500$ m. ¿En cuánto tiempo se encuentran?
  9. choice 3pts: Velocidad media $=\frac{\Delta x}{\Delta t}$. Recorrido: $100$ m en $5$ s, luego $150$ m en $10$ s. $\bar{v}=$ → $25$, $16.7$, $20$, $15$ m/s [correct: $\frac{250}{15}\approx 16.7$]
```

#### tmpl_fis_exam_2 — Examen: Dinámica y energía (hard, 80 XP)
```
durationMinutes: 50 · passingScore: 60 · totalPoints: 25
questions:
  1. choice 2pts: $F=ma$. $m=4$ kg, $F=20$ N. $a=$ → $5$, $80$, $0.2$, $16$ m/s² [correct: $5$]
  2. text 3pts: Peso de $70$ kg en la Tierra ($g=9.8$) y en la Luna ($g=1.6$). $W=mg$
  3. choice 2pts: 3ª Ley de Newton: cuando empujas una pared, ella: → No te empuja, Te empuja con la misma fuerza pero en sentido opuesto, Te empuja con mayor fuerza, Te empuja en la misma dirección [correct: con la misma fuerza en sentido opuesto]
  4. text 4pts: Plano inclinado $30°$. Masa $5$ kg. Calcula: $W_{\parallel}=mg\sin 30°$ (componente paralela al plano) y $W_{\perp}=mg\cos 30°$
  5. choice 2pts: $E_k=\frac{1}{2}mv^2$. $m=2$ kg, $v=10\text{ m/s}$. $E_k=$ → $10$, $20$, $100$, $200$ J [correct: $100$]
  6. text 4pts: Una piedra de $1$ kg cae de $h=20$ m. Usando conservación de energía: $v$ al llegar al suelo, sin y con rozamiento del $10\%$.
  7. choice 3pts: Trabajo hecho por la normal sobre un objeto que se mueve horizontalmente: → Positivo, Negativo, Cero, Variable [correct: Cero ($\theta=90°$)]
  8. text 3pts: Potencia: motor mueve carga de $500$ N una distancia de $20$ m en $10$ s. $P=\frac{W}{t}=\frac{F\cdot d}{t}$
  9. choice 3pts: Energía mecánica total $=E_k+E_p$ se conserva cuando: → Hay rozamiento, No hay rozamiento, Siempre, Nunca [correct: No hay rozamiento]
```

---

## Implementación en seed.ts

El bloque de plantillas se añade al final de `seed.ts`, después del bloque de cursos, usando `director.id` como `authorId` y `approvedById`. Cada `upsert` usa `where: { id: '...' }` para ser idempotente.

Estructura de cada upsert:

```typescript
await prisma.homeworkTemplate.upsert({
  where: { id: 'tmpl_arit_hw_1' },
  update: {},
  create: {
    id: 'tmpl_arit_hw_1',
    courseId: 'course_aritmética',
    title: 'Operaciones con fracciones',
    description: 'Practica las cuatro operaciones básicas con fracciones propias e impropias.',
    difficulty: Difficulty.easy,
    xpReward: 30,
    status: TemplateStatus.approved,
    authorId: director.id,
    approvedById: director.id,
    approvedAt: new Date(),
    instructions: `Resuelve cada operación...`, // LaTeX completo
    defaultDueDays: 5,
  },
});
```

## Fuera de alcance

- Plantillas para otros cursos futuros (se añaden cuando se creen)
- Renderizado de LaTeX en PDF/exportación
- Editor visual de LaTeX en el formulario de propuesta del profesor
