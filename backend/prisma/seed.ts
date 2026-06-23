import { PrismaClient, Role, CharacterType, CharacterBonusType, Difficulty, TemplateStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // Director
  const director = await prisma.user.upsert({
    where: { email: 'director@legendaryclass.com' },
    update: {},
    create: {
      name: 'Director Admin',
      email: 'director@legendaryclass.com',
      password: await hash('password123'),
      role: Role.director,
      isActive: true,
    },
  });

  // Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@legendaryclass.com' },
    update: {},
    create: {
      name: 'Profesor Demo',
      email: 'teacher@legendaryclass.com',
      password: await hash('password123'),
      role: Role.teacher,
      isActive: true,
    },
  });

  // Students
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@legendaryclass.com' },
    update: {},
    create: {
      name: 'Estudiante Uno',
      email: 'student1@legendaryclass.com',
      password: await hash('password123'),
      role: Role.student,
      characterType: CharacterType.mago,
      characterBonusType: CharacterBonusType.knowledge,
      firstCharacterSelection: true,
      level: 3,
      experiencePoints: 900,
      points: 250,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@legendaryclass.com' },
    update: {},
    create: {
      name: 'Estudiante Dos',
      email: 'student2@legendaryclass.com',
      password: await hash('password123'),
      role: Role.student,
      characterType: CharacterType.guerrero,
      characterBonusType: CharacterBonusType.strength,
      firstCharacterSelection: true,
      level: 2,
      experiencePoints: 400,
      points: 150,
    },
  });

  // Parent
  const parent = await prisma.user.upsert({
    where: { email: 'parent@legendaryclass.com' },
    update: {},
    create: {
      name: 'Padre Demo',
      email: 'parent@legendaryclass.com',
      password: await hash('password123'),
      role: Role.parent,
      isActive: true,
    },
  });

  // Classroom
  const classroom = await prisma.classroom.upsert({
    where: { classCode: 'DEMO01' },
    update: {},
    create: {
      name: 'Matemáticas 3ro A',
      description: 'Aula demo de matemáticas',
      subject: 'Matemáticas',
      gradeLevel: '3ro Secundaria',
      schoolYear: '2025-2026',
      classCode: 'DEMO01',
      slug: 'matematicas-3ro-a',
      teacherId: teacher.id,
      isActive: true,
    },
  });

  // Enroll students
  for (const studentId of [student1.id, student2.id]) {
    await prisma.classroomStudent.upsert({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId } },
      update: {},
      create: { classroomId: classroom.id, studentId },
    });

    await prisma.studentPoint.upsert({
      where: { studentId_classroomId: { studentId, classroomId: classroom.id } },
      update: {},
      create: { studentId, classroomId: classroom.id, totalPoints: 100, level: 2 },
    });
  }

  // Behaviors
  const behaviors = [
    { name: 'Participación activa', type: 'positive' as const, category: 'participation' as const, points: 10, color: '#10B981' },
    { name: 'Tarea completa',       type: 'positive' as const, category: 'homework'      as const, points: 15, color: '#6366F1' },
    { name: 'Excelente proyecto',   type: 'positive' as const, category: 'creativity'    as const, points: 20, color: '#F59E0B' },
    { name: 'Falta de respeto',     type: 'negative' as const, category: 'behavior'      as const, points: -10, color: '#EF4444' },
    { name: 'Tarea incompleta',     type: 'negative' as const, category: 'homework'      as const, points: -5,  color: '#F97316' },
  ];

  for (const b of behaviors) {
    await prisma.behavior.upsert({
      where: { id: `seed-behavior-${b.name.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seed-behavior-${b.name.replace(/\s/g, '-').toLowerCase()}`,
        ...b,
        classroomId: classroom.id,
        createdById: teacher.id,
      },
    }).catch(() => {
      // Already exists with different id — skip
    });
  }

  // Reward
  await prisma.reward.upsert({
    where: { id: 'seed-reward-1' },
    update: {},
    create: {
      id: 'seed-reward-1',
      name: 'Sesión de juego libre',
      description: 'Media hora de actividad libre en clase',
      costPoints: 100,
      type: 'special_ability',
      rewardType: 'ability',
      xpBonus: 50,
      rarity: 'common',
      classroomId: classroom.id,
      createdById: teacher.id,
    },
  }).catch(() => {});

  // Quest
  await prisma.quest.upsert({
    where: { id: 'seed-quest-1' },
    update: {},
    create: {
      id: 'seed-quest-1',
      title: 'Completa 3 tareas seguidas',
      description: 'Entrega tus próximas 3 tareas a tiempo para ganar XP extra',
      xpReward: 150,
      type: 'homework',
      classroomId: classroom.id,
      teacherId: teacher.id,
    },
  }).catch(() => {});

  // Student nuevo sin personaje (para probar selección)
  await prisma.user.upsert({
    where: { email: 'nuevo@legendaryclass.com' },
    update: {},
    create: {
      name: 'Estudiante Nuevo',
      email: 'nuevo@legendaryclass.com',
      password: await hash('password123'),
      role: Role.student,
      firstCharacterSelection: false,
      isActive: true,
    },
  });

  // Link parent to student1
  await prisma.parentChild.upsert({
    where: { parentId_childId: { parentId: parent.id, childId: student1.id } },
    update: {},
    create: { parentId: parent.id, childId: student1.id },
  });

  // Courses
  const coursesData = [
    { name: 'Aritmética',              category: 'mathematics', icon: '🔢', color: '#3B82F6' },
    { name: 'Álgebra',                 category: 'mathematics', icon: '📐', color: '#8B5CF6' },
    { name: 'Geometría',               category: 'mathematics', icon: '📏', color: '#10B981' },
    { name: 'Razonamiento Matemático', category: 'mathematics', icon: '🧮', color: '#F59E0B' },
    { name: 'Trigonometría',           category: 'mathematics', icon: '📊', color: '#EF4444' },
    { name: 'Química',                 category: 'sciences',    icon: '⚗️',  color: '#06B6D4' },
    { name: 'Física',                  category: 'sciences',    icon: '⚡',  color: '#F97316' },
  ];
  for (const c of coursesData) {
    await prisma.course.upsert({
      where: { id: `course_${c.name.toLowerCase().replace(/\s+/g, '_')}` },
      update: {},
      create: { id: `course_${c.name.toLowerCase().replace(/\s+/g, '_')}`, ...c } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Templates
  // ──────────────────────────────────────────────────────────────────────

  const tmplBase = {
    status: TemplateStatus.approved,
    authorId: director.id,
    approvedById: director.id,
    approvedAt: new Date(),
  };

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

  // ── Álgebra ──────────────────────────────────────────────────────────
  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_alg_hw_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_hw_1',
      courseId: 'course_álgebra',
      title: 'Ecuaciones lineales',
      description: 'Resolución de ecuaciones de primer grado con una incógnita.',
      difficulty: Difficulty.easy,
      xpReward: 30,
      defaultDueDays: 5,
      instructions:
        'Resuelve cada ecuación para encontrar el valor de $x$. Verifica tu respuesta sustituyendo.\n\n' +
        '**1.** $$3x+7=22$$\n\n' +
        '**2.** $$5x-3=2x+9$$\n\n' +
        '**3.** $$\\frac{x}{4}+2=5$$\n\n' +
        '**4.** $$2(x-3)=4x-10$$\n\n' +
        '**5.** $$\\frac{2x+1}{3}=\\frac{x-2}{2}$$\n\n' +
        'Recuerda: lo que haces de un lado del signo $=$ debes hacerlo del otro.',
    },
  });

  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_alg_hw_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_hw_2',
      courseId: 'course_álgebra',
      title: 'Sistemas de ecuaciones 2×2',
      description: 'Resolución de sistemas de dos ecuaciones con dos incógnitas.',
      difficulty: Difficulty.medium,
      xpReward: 30,
      defaultDueDays: 7,
      instructions:
        'Resuelve los sistemas por el método indicado.\n\n' +
        '**1.** Sustitución:\n' +
        '$$\\begin{cases}y=2x-1\\\\3x+y=14\\end{cases}$$\n\n' +
        '**2.** Eliminación:\n' +
        '$$\\begin{cases}2x+3y=12\\\\4x-3y=6\\end{cases}$$\n\n' +
        '**3.** El método que prefieras:\n' +
        '$$\\begin{cases}5x-2y=3\\\\x+4y=11\\end{cases}$$\n\n' +
        '**4.** Problema: La suma de dos números es $28$ y su diferencia es $6$. Plantea y resuelve el sistema.\n' +
        '$$\\begin{cases}a+b=28\\\\a-b=6\\end{cases}$$\n\n' +
        '**5.** Verifica la solución del sistema 1 sustituyendo en ambas ecuaciones.',
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_alg_ex_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_ex_1',
      courseId: 'course_álgebra',
      title: 'Factorización de polinomios',
      description: 'Factorización por distintos métodos algebraicos.',
      difficulty: Difficulty.medium,
      xpReward: 40,
      problems: [
        {
          question: 'Factoriza por factor común:\n$$6x^3-9x^2+3x$$',
          hint: 'El m.c.d. de los coeficientes es $3$ y la menor potencia es $x$',
          answer: '$$3x(2x^2-3x+1)$$',
        },
        {
          question: 'Factoriza diferencia de cuadrados:\n$$x^2-16$$',
          hint: '$$a^2-b^2=(a+b)(a-b)$$',
          answer: '$$(x+4)(x-4)$$',
        },
        {
          question: 'Factoriza trinomio cuadrado perfecto:\n$$x^2+6x+9$$',
          hint: '$$a^2+2ab+b^2=(a+b)^2$$',
          answer: '$$(x+3)^2$$',
        },
        {
          question: 'Factoriza el trinomio:\n$$x^2-5x+6$$',
          hint: 'Busca dos números cuya suma sea $-5$ y producto $6$',
          answer: '$$(x-2)(x-3)$$',
        },
        {
          question: 'Factoriza completamente:\n$$2x^2-8$$',
          hint: 'Primero extrae el factor común, luego aplica diferencia de cuadrados',
          answer: '$$2(x+2)(x-2)$$',
        },
      ],
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_alg_ex_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_ex_2',
      courseId: 'course_álgebra',
      title: 'Simplificación de expresiones algebraicas',
      description: 'Combina y simplifica expresiones algebraicas.',
      difficulty: Difficulty.easy,
      xpReward: 40,
      problems: [
        {
          question: 'Simplifica:\n$$\\frac{6x^2-12x}{3x}$$',
          hint: 'Factoriza el numerador',
          answer: '$$2x-4$$',
        },
        {
          question: 'Combina términos semejantes:\n$$3x^2+2x-5x^2+4x-7$$',
          answer: '$$-2x^2+6x-7$$',
        },
        {
          question: 'Expande y simplifica:\n$$(x+3)^2-(x-1)^2$$',
          hint: '$(a+b)^2=a^2+2ab+b^2$',
          answer: '$$8x+8$$',
        },
        {
          question: 'Simplifica la fracción algebraica:\n$$\\frac{x^2-9}{x+3}$$',
          hint: 'Factoriza el numerador como diferencia de cuadrados',
          answer: '$$x-3$$',
        },
        {
          question: 'Si $P(x)=2x^2-3x+1$, calcula $P(2)-P(-1)$.',
          answer: '$P(2)=3$, $P(-1)=6$, resultado: $-3$',
        },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_alg_fm_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_fm_1',
      courseId: 'course_álgebra',
      title: 'Diagnóstico algebraico',
      description: 'Evaluación diagnóstica sobre conceptos algebraicos básicos.',
      difficulty: Difficulty.easy,
      xpReward: 20,
      questions: [
        { text: '¿Cuál es el valor de $x$ en $2x+6=14$?', type: 'choice', options: ['$x=3$','$x=4$','$x=10$','$x=2$'], required: true },
        { text: '¿Cuál es el resultado de $(x+2)(x-2)$?', type: 'choice', options: ['$x^2+4$','$x^2-4$','$x^2-2x+4$','$x^2+2x-4$'], required: true },
        { text: 'Si $3x-7=2$, entonces $x=$', type: 'choice', options: ['$1$','$2$','$3$','$4$'], required: true },
        { text: '¿Qué es una ecuación lineal? Da un ejemplo.', type: 'text', required: true },
        { text: '¿Cuál de estos es un trinomio cuadrado perfecto?', type: 'choice', options: ['$x^2+4x+4$','$x^2+2x+3$','$x^2-x+1$','$x^2+5x+4$'], required: true },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_alg_fm_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_fm_2',
      courseId: 'course_álgebra',
      title: 'Reflexión sobre errores en álgebra',
      description: 'Reflexión sobre errores comunes al resolver ecuaciones y sistemas.',
      difficulty: Difficulty.medium,
      xpReward: 20,
      questions: [
        { text: '¿Cuál es el error en esta resolución?\n$$2(x+3)=2x+3$$', type: 'text', required: true },
        { text: 'Al resolver $\\frac{x}{2}=4$, ¿qué operación aplicas a ambos lados?', type: 'choice', options: ['Dividir por 2','Multiplicar por 2','Sumar 2','Restar 2'], required: true },
        { text: 'Describe con tus palabras en qué situación usarías un sistema de ecuaciones.', type: 'text', required: true },
        { text: '¿Qué método prefieres para resolver sistemas? ¿Por qué?', type: 'text', required: false },
        { text: '¿Cuál es la solución del sistema $x+y=5$, $x-y=1$?', type: 'choice', options: ['$x=3,y=2$','$x=2,y=3$','$x=4,y=1$','$x=1,y=4$'], required: true },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_alg_exam_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_exam_1',
      courseId: 'course_álgebra',
      title: 'Examen de ecuaciones lineales',
      description: 'Examen sobre resolución de ecuaciones de primer grado.',
      difficulty: Difficulty.medium,
      xpReward: 80,
      durationMinutes: 45,
      passingScore: 60,
      totalPoints: 25,
      questions: [
        { text: '$5x-3=17$', type: 'choice', options: ['$x=4$','$x=3$','$x=5$','$x=2$'], points: 2 },
        { text: '$3(x+2)=21$', type: 'choice', options: ['$x=5$','$x=9$','$x=7$','$x=4$'], points: 2 },
        { text: 'Resuelve y verifica: $\\frac{x-1}{2}+\\frac{x+3}{3}=4$', type: 'text', points: 3 },
        { text: '$2x+5=x-3$', type: 'choice', options: ['$x=-8$','$x=8$','$x=-2$','$x=2$'], points: 2 },
        { text: 'Plantea y resuelve: El doble de un número más $5$ es igual a $23$. ¿Cuál es el número?', type: 'text', points: 3 },
        { text: '$4x-7=2x+9$', type: 'choice', options: ['$x=6$','$x=8$','$x=7$','$x=5$'], points: 3 },
        { text: 'Resuelve: $3(2x-1)-2(x+4)=7$', type: 'text', points: 3 },
        { text: 'La solución de $\\frac{x}{3}=\\frac{x-2}{5}$ es:', type: 'choice', options: ['$x=-3$','$x=3$','$x=6$','$x=-6$'], points: 3 },
        { text: '¿Cuántas soluciones tiene $2x+4=2(x+3)$? Explica.', type: 'text', points: 2 },
        { text: 'Comprueba si $x=2$ es solución de $3x^2-2x-8=0$.', type: 'text', points: 2 },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_alg_exam_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_alg_exam_2',
      courseId: 'course_álgebra',
      title: 'Examen de sistemas de ecuaciones',
      description: 'Examen sobre resolución de sistemas de ecuaciones 2×2.',
      difficulty: Difficulty.hard,
      xpReward: 80,
      durationMinutes: 50,
      passingScore: 60,
      totalPoints: 25,
      questions: [
        { text: 'Resuelve por sustitución: $\\begin{cases}y=3x-1\\\\2x+y=9\\end{cases}$', type: 'text', points: 3 },
        { text: 'Resuelve por eliminación: $\\begin{cases}3x+2y=16\\\\x-2y=0\\end{cases}$', type: 'text', points: 3 },
        { text: '¿Cuántas soluciones tiene un sistema inconsistente?', type: 'choice', options: ['Ninguna','Una','Infinitas','Dos'], points: 2 },
        { text: 'Problema: Dos números suman $45$ y su diferencia es $11$. Plantea el sistema y resuelve. $\\begin{cases}a+b=45\\\\a-b=11\\end{cases}$', type: 'text', points: 4 },
        { text: 'La solución de $\\begin{cases}x+y=6\\\\x-y=2\\end{cases}$ es:', type: 'choice', options: ['$(4,2)$','$(3,3)$','$(5,1)$','$(2,4)$'], points: 2 },
        { text: '¿Cuántos bolígrafos de $\\$3$ y cuadernos de $\\$5$ puedo comprar con $\\$23$ si compro $7$ artículos en total?', type: 'text', points: 3 },
        { text: 'Si $\\begin{cases}2x+y=7\\\\4x+2y=k\\end{cases}$ tiene infinitas soluciones, $k$ vale:', type: 'choice', options: ['$7$','$14$','$3.5$','$21$'], points: 2 },
        { text: 'Verifica si $(2,-1)$ es solución del sistema $\\begin{cases}x+2y=0\\\\3x-y=7\\end{cases}$', type: 'text', points: 3 },
        { text: 'Resuelve: $\\begin{cases}\\frac{x}{2}+y=5\\\\x-\\frac{y}{3}=4\\end{cases}$', type: 'text', points: 3 },
      ],
    },
  });

  // ── Geometría ────────────────────────────────────────────────────────
  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_geo_hw_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_hw_1',
      courseId: 'course_geometría',
      title: 'Áreas y perímetros de figuras planas',
      description: 'Calcula áreas y perímetros de las figuras planas fundamentales.',
      difficulty: Difficulty.easy,
      xpReward: 30,
      defaultDueDays: 5,
      instructions:
        'Calcula el área y perímetro de cada figura usando las fórmulas correspondientes.\n\n' +
        '**Cuadrado** (lado $= 6$ cm):\n' +
        '$$A = l^2 \\qquad P = 4l$$\n\n' +
        '**Rectángulo** ($b=8$ cm, $h=5$ cm):\n' +
        '$$A = b\\cdot h \\qquad P = 2(b+h)$$\n\n' +
        '**Triángulo** (base $= 10$ cm, altura $= 6$ cm, lados $= 8, 8, 10$ cm):\n' +
        '$$A = \\frac{b\\cdot h}{2} \\qquad P = a+b+c$$\n\n' +
        '**Círculo** (radio $= 7$ cm):\n' +
        '$$A = \\pi r^2 \\qquad C = 2\\pi r$$\n\n' +
        '**Trapecio** ($B=12$ cm, $b=8$ cm, $h=5$ cm):\n' +
        '$$A = \\frac{(B+b)\\cdot h}{2}$$',
    },
  });

  await prisma.homeworkTemplate.upsert({
    where: { id: 'tmpl_geo_hw_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_hw_2',
      courseId: 'course_geometría',
      title: 'Teorema de Pitágoras',
      description: 'Aplica el Teorema de Pitágoras en triángulos rectángulos.',
      difficulty: Difficulty.medium,
      xpReward: 30,
      defaultDueDays: 7,
      instructions:
        'Aplica el Teorema de Pitágoras: $$c^2=a^2+b^2$$\n\n' +
        '**1.** Calcula la hipotenusa si los catetos miden $3$ cm y $4$ cm.\n\n' +
        '**2.** Un cateto mide $12$ cm y la hipotenusa $13$ cm. ¿Cuánto mide el otro cateto?\n\n' +
        '**3.** ¿Es un triángulo rectángulo el de lados $5, 12, 13$?\n' +
        'Verifica: $$5^2+12^2\\stackrel{?}{=}13^2$$\n\n' +
        '**4.** Una escalera de $5$ m apoyada en una pared llega a $4$ m de altura. ¿A qué distancia de la pared está la base?\n\n' +
        '**5.** Calcula la diagonal de un cuadrado de $6$ cm de lado.\n' +
        '$$d = l\\sqrt{2}$$',
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_geo_ex_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_ex_1',
      courseId: 'course_geometría',
      title: 'Propiedades de triángulos',
      description: 'Explora clasificación y propiedades de los triángulos.',
      difficulty: Difficulty.easy,
      xpReward: 40,
      problems: [
        {
          question: 'Un triángulo tiene ángulos de $60°$ y $75°$. ¿Cuánto mide el tercer ángulo?\n$$\\alpha+\\beta+\\gamma=180°$$',
          answer: '$\\gamma=45°$',
        },
        {
          question: 'Clasifica el triángulo con ángulos $90°$, $45°$, $45°$ según sus ángulos y sus lados.',
          answer: 'Rectángulo e isósceles',
        },
        {
          question: 'Un triángulo isósceles tiene un ángulo base de $55°$. ¿Cuánto mide el ángulo del vértice?',
          hint: 'Los dos ángulos base son iguales',
          answer: '$180°-55°-55°=70°$',
        },
        {
          question: 'En un triángulo equilátero de lado $8$ cm, calcula el área usando:\n$$A=\\frac{l^2\\sqrt{3}}{4}$$',
          answer: '$A=16\\sqrt{3}\\approx 27.7\\text{ cm}^2$',
        },
        {
          question: '¿Puede existir un triángulo con lados $2, 3$ y $6$ cm? Justifica usando la desigualdad triangular.\n$$a+b>c$$',
          answer: '$2+3=5<6$: No puede existir',
        },
      ],
    },
  });

  await prisma.exerciseTemplate.upsert({
    where: { id: 'tmpl_geo_ex_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_ex_2',
      courseId: 'course_geometría',
      title: 'Volúmenes de sólidos',
      description: 'Calcula volúmenes de sólidos geométricos fundamentales.',
      difficulty: Difficulty.medium,
      xpReward: 40,
      problems: [
        {
          question: 'Calcula el volumen de un cubo de arista $5$ cm:\n$$V=a^3$$',
          answer: '$V=125\\text{ cm}^3$',
        },
        {
          question: 'Volumen de un cilindro de radio $4$ cm y altura $10$ cm:\n$$V=\\pi r^2 h$$',
          hint: 'Usa $\\pi\\approx 3.14$',
          answer: '$V\\approx 502.4\\text{ cm}^3$',
        },
        {
          question: 'Volumen de una pirámide de base cuadrada ($l=6$ cm) y altura $9$ cm:\n$$V=\\frac{A_b\\cdot h}{3}$$',
          answer: '$V=\\frac{36\\times 9}{3}=108\\text{ cm}^3$',
        },
        {
          question: 'Una esfera tiene radio $3$ cm. Calcula su volumen:\n$$V=\\frac{4}{3}\\pi r^3$$',
          answer: '$V=\\frac{4}{3}\\pi\\times 27=36\\pi\\approx 113.1\\text{ cm}^3$',
        },
        {
          question: 'Un cono tiene radio $5$ cm y altura $12$ cm:\n$$V=\\frac{1}{3}\\pi r^2 h$$',
          answer: '$V=\\frac{1}{3}\\pi\\times 25\\times 12=100\\pi\\approx 314.2\\text{ cm}^3$',
        },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_geo_fm_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_fm_1',
      courseId: 'course_geometría',
      title: 'Diagnóstico de geometría plana',
      description: 'Evaluación diagnóstica sobre geometría plana.',
      difficulty: Difficulty.easy,
      xpReward: 20,
      questions: [
        { text: '¿Cuál es el área de un triángulo con base $10$ cm y altura $6$ cm?', type: 'choice', options: ['$30\\text{ cm}^2$','$60\\text{ cm}^2$','$16\\text{ cm}^2$','$15\\text{ cm}^2$'], required: true },
        { text: '¿Cuántos grados suman los ángulos interiores de un triángulo?', type: 'choice', options: ['$90°$','$180°$','$270°$','$360°$'], required: true },
        { text: '¿Cuál es la fórmula del perímetro de un cuadrado de lado $l$?', type: 'choice', options: ['$l^2$','$4l$','$2l$','$l^3$'], required: true },
        { text: 'Explica con tus palabras qué es el Teorema de Pitágoras y cuándo se aplica.', type: 'text', required: true },
        { text: 'Un rectángulo mide $9\\times 4$ cm. ¿Cuál es su diagonal? $$d=\\sqrt{a^2+b^2}$$', type: 'text', required: true },
      ],
    },
  });

  await prisma.formTemplate.upsert({
    where: { id: 'tmpl_geo_fm_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_fm_2',
      courseId: 'course_geometría',
      title: 'Reporte de construcción geométrica',
      description: 'Reporte reflexivo sobre una construcción geométrica realizada.',
      difficulty: Difficulty.medium,
      xpReward: 20,
      questions: [
        { text: '¿Qué figura geométrica construiste? Descríbela (tipo, dimensiones).', type: 'text', required: true },
        { text: '¿Qué instrumentos utilizaste?', type: 'choice', options: ['Regla y compás','Transportador y regla','Solo regla','Programa de computadora'], required: true },
        { text: 'Escribe la fórmula del área de la figura que construiste y calcula su valor.', type: 'text', required: true },
        { text: '¿Qué dificultades encontraste durante la construcción?', type: 'text', required: false },
        { text: '¿Cómo verificaste que tu construcción es correcta?', type: 'text', required: true },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_geo_exam_1' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_exam_1',
      courseId: 'course_geometría',
      title: 'Examen de geometría plana',
      description: 'Examen integral sobre figuras planas, perímetros y áreas.',
      difficulty: Difficulty.medium,
      xpReward: 80,
      durationMinutes: 45,
      passingScore: 60,
      totalPoints: 25,
      questions: [
        { text: 'Área de círculo radio $5$ cm:', type: 'choice', options: ['$25\\pi$','$10\\pi$','$50\\pi$','$5\\pi$'], points: 2 },
        { text: 'Perímetro y área de rectángulo $12\\times 7$ cm. $P=2(12+7)$, $A=12\\times 7$', type: 'text', points: 3 },
        { text: 'Triángulo de lados $5, 5, 8$ cm es:', type: 'choice', options: ['Escaleno','Isósceles','Equilátero','Rectángulo'], points: 2 },
        { text: 'Hipotenusa de triángulo rectángulo con catetos $6$ y $8$ cm. $c=\\sqrt{6^2+8^2}$', type: 'text', points: 3 },
        { text: 'Ángulos de un polígono regular de $6$ lados (hexágono):', type: 'choice', options: ['$60°$','$120°$','$90°$','$108°$'], points: 2 },
        { text: 'Área de trapecio $B=14$ cm, $b=10$ cm, $h=6$ cm. $A=\\frac{(14+10)\\times 6}{2}$', type: 'text', points: 3 },
        { text: '¿Cuál es el área de un rombo con diagonales $d_1=8$ cm y $d_2=6$ cm? $A=\\frac{d_1\\cdot d_2}{2}$', type: 'choice', options: ['$24$','$48$','$12$','$28$'], points: 3 },
        { text: 'Un jardín circular tiene radio $10$ m. Calcula: a) su área $A=\\pi r^2$ b) la longitud de su borde $C=2\\pi r$. Usa $\\pi=3.14$.', type: 'text', points: 4 },
        { text: 'Área de triángulo equilátero lado $6$: $\\frac{36\\sqrt{3}}{4}=9\\sqrt{3}$', type: 'choice', options: ['$9\\sqrt{3}$','$18\\sqrt{3}$','$6\\sqrt{3}$','$12\\sqrt{3}$'], points: 3 },
      ],
    },
  });

  await prisma.examTemplate.upsert({
    where: { id: 'tmpl_geo_exam_2' },
    update: {},
    create: {
      ...tmplBase,
      id: 'tmpl_geo_exam_2',
      courseId: 'course_geometría',
      title: 'Examen de geometría del espacio',
      description: 'Examen sobre volúmenes y áreas de sólidos geométricos.',
      difficulty: Difficulty.hard,
      xpReward: 80,
      durationMinutes: 50,
      passingScore: 60,
      totalPoints: 25,
      questions: [
        { text: 'Volumen de caja $5\\times 4\\times 3$ cm. $V=5\\times 4\\times 3$', type: 'text', points: 3 },
        { text: '$V$ cilindro $r=3$, $h=7$: $\\pi r^2 h$', type: 'choice', options: ['$63\\pi$','$21\\pi$','$9\\pi$','$42\\pi$'], points: 2 },
        { text: 'Área total de cubo arista $4$ cm. $A_T=6a^2$', type: 'text', points: 3 },
        { text: '$V$ pirámide $B=36$ cm², $h=8$ cm: $V=\\frac{Bh}{3}$', type: 'choice', options: ['$288$','$96$','$144$','$48$'], points: 2 },
        { text: 'Esfera $r=6$ cm: a) $V=\\frac{4}{3}\\pi r^3$  b) $A=4\\pi r^2$', type: 'text', points: 4 },
        { text: 'Un cono tiene $r=4$ y $h=3$. Su generatriz $l=\\sqrt{r^2+h^2}=$', type: 'choice', options: ['$5$','$7$','$4$','$3$'], points: 3 },
        { text: 'Un acuario rectangular mide $80\\times 40\\times 50$ cm. ¿Cuántos litros caben? ($1$ L $= 1000$ cm³)', type: 'text', points: 4 },
        { text: 'Volumen de cono $r=6$, $h=9$: $\\frac{1}{3}\\pi(36)(9)$', type: 'choice', options: ['$108\\pi$','$324\\pi$','$54\\pi$','$36\\pi$'], points: 4 },
      ],
    },
  });

  console.log('✅ Seed completado');
  console.log('');
  console.log('Cuentas de prueba:');
  console.log('  Director : director@legendaryclass.com / password123');
  console.log('  Teacher  : teacher@legendaryclass.com  / password123');
  console.log('  Student1 : student1@legendaryclass.com / password123');
  console.log('  Student2 : student2@legendaryclass.com / password123');
  console.log('  Parent   : parent@legendaryclass.com   / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
