/**
 * seed-rich.ts — datos de prueba abundantes para LegendaryClass
 * Crea múltiples profesores, aulas, 15 estudiantes, 3 padres y relaciones cruzadas.
 * Es idempotente: usa upsert donde es posible y skipDuplicates en createMany.
 *
 * Ejecutar: npx ts-node --project tsconfig.json prisma/seed-rich.ts
 */

import {
  PrismaClient,
  Role,
  CharacterType,
  CharacterBonusType,
  RewardStatus,
  NotificationType,
  SubmissionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 10);

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3_600_000);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 seed-rich: iniciando...');

  const pw = await hash('password123');

  // ── Director ────────────────────────────────────────────────────────────
  const director = await prisma.user.upsert({
    where: { email: 'director@legendaryclass.com' },
    update: {},
    create: {
      name: 'Director Admin',
      email: 'director@legendaryclass.com',
      password: pw,
      role: Role.director,
      isActive: true,
    },
  });

  // ── Profesores ──────────────────────────────────────────────────────────
  const [t1, t2, t3] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'teacher@legendaryclass.com' },
      update: {},
      create: { name: 'Profesor Demo', email: 'teacher@legendaryclass.com', password: pw, role: Role.teacher, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'teacher2@legendaryclass.com' },
      update: {},
      create: { name: 'Profa. Ana García', email: 'teacher2@legendaryclass.com', password: pw, role: Role.teacher, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'teacher3@legendaryclass.com' },
      update: {},
      create: { name: 'Prof. Carlos Ruiz', email: 'teacher3@legendaryclass.com', password: pw, role: Role.teacher, isActive: true },
    }),
  ]);

  // ── Padres ──────────────────────────────────────────────────────────────
  const [p1, p2, p3] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'parent@legendaryclass.com' },
      update: {},
      create: { name: 'Padre Demo', email: 'parent@legendaryclass.com', password: pw, role: Role.parent, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'parent2@legendaryclass.com' },
      update: {},
      create: { name: 'Mamá García', email: 'parent2@legendaryclass.com', password: pw, role: Role.parent, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'parent3@legendaryclass.com' },
      update: {},
      create: { name: 'Papá Torres', email: 'parent3@legendaryclass.com', password: pw, role: Role.parent, isActive: true },
    }),
  ]);

  // ── Estudiantes ──────────────────────────────────────────────────────────
  // 15 estudiantes con distintos personajes, niveles y puntos
  const studentDefs = [
    // [email, name, char, bonus, level, xp, points, streak]
    ['student1@legendaryclass.com',  'Luna Martínez',    CharacterType.mago,      CharacterBonusType.knowledge,  5,  2500, 380, 12],
    ['student2@legendaryclass.com',  'Diego Torres',     CharacterType.guerrero,  CharacterBonusType.strength,   4,  1600, 260, 7],
    ['student3@legendaryclass.com',  'Sofía Ramírez',    CharacterType.ninja,     CharacterBonusType.agility,    6,  3600, 510, 20],
    ['student4@legendaryclass.com',  'Mateo Herrera',    CharacterType.arquero,   CharacterBonusType.precision,  3,   900, 180, 4],
    ['student5@legendaryclass.com',  'Valentina Cruz',   CharacterType.lanzador,  CharacterBonusType.creativity, 7,  4900, 620, 15],
    ['student6@legendaryclass.com',  'Andrés López',     CharacterType.mago,      CharacterBonusType.knowledge,  2,   400,  90, 3],
    ['student7@legendaryclass.com',  'Isabella Moreno',  CharacterType.guerrero,  CharacterBonusType.strength,   8,  6400, 750, 30],
    ['student8@legendaryclass.com',  'Sebastián Flores', CharacterType.ninja,     CharacterBonusType.agility,    3,   900, 150, 5],
    ['student9@legendaryclass.com',  'Camila Reyes',     CharacterType.arquero,   CharacterBonusType.precision,  4,  1600, 210, 9],
    ['student10@legendaryclass.com', 'Santiago Díaz',    CharacterType.lanzador,  CharacterBonusType.creativity, 2,   400,  80, 2],
    ['student11@legendaryclass.com', 'Mariana Jiménez',  CharacterType.mago,      CharacterBonusType.knowledge,  9,  8100, 900, 45],
    ['student12@legendaryclass.com', 'Nicolás Vargas',   CharacterType.guerrero,  CharacterBonusType.strength,   1,   100,  50, 1],
    ['student13@legendaryclass.com', 'Emma Castillo',    CharacterType.lanzador,  CharacterBonusType.creativity, 5,  2500, 340, 11],
    ['student14@legendaryclass.com', 'Lucas Mendoza',    CharacterType.ninja,     CharacterBonusType.agility,    3,   900, 130, 3],
    ['student15@legendaryclass.com', 'Gabriela Soto',    CharacterType.arquero,   CharacterBonusType.precision,  6,  3600, 480, 18],
  ] as const;

  const students: Record<string, { id: string; name: string }> = {};
  for (const [email, name, char, bonus, level, xp, pts, streak] of studentDefs) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { level, experiencePoints: xp, points: pts, loginStreak: streak },
      create: {
        name, email, password: pw, role: Role.student,
        characterType: char, characterBonusType: bonus,
        firstCharacterSelection: true,
        level, experiencePoints: xp, points: pts, loginStreak: streak,
        isActive: true,
      },
    });
    students[email] = { id: u.id, name };
  }

  const allStudents = Object.values(students);

  // ── Aulas ────────────────────────────────────────────────────────────────
  const classroomDefs = [
    { code: 'DEMO01', name: 'Matemáticas 3ro A',  subject: 'Matemáticas', grade: '3ro Secundaria', teacher: t1, slug: 'mate-3a' },
    { code: 'DEMO02', name: 'Ciencias 2do B',      subject: 'Ciencias',    grade: '2do Secundaria', teacher: t1, slug: 'cien-2b' },
    { code: 'DEMO03', name: 'Historia 1ro C',      subject: 'Historia',    grade: '1ro Secundaria', teacher: t2, slug: 'hist-1c' },
    { code: 'DEMO04', name: 'Lengua y Lit. 4to A', subject: 'Lengua',      grade: '4to Secundaria', teacher: t2, slug: 'leng-4a' },
    { code: 'DEMO05', name: 'Física 5to B',         subject: 'Física',      grade: '5to Secundaria', teacher: t3, slug: 'fis-5b'  },
  ];

  const classrooms: Record<string, { id: string; teacherId: string }> = {};
  for (const c of classroomDefs) {
    const cls = await prisma.classroom.upsert({
      where: { classCode: c.code },
      update: {},
      create: {
        name: c.name, description: `Aula de ${c.subject}`, subject: c.subject,
        gradeLevel: c.grade, schoolYear: '2025-2026', classCode: c.code,
        slug: c.slug, teacherId: c.teacher.id, isActive: true,
      },
    });
    classrooms[c.code] = { id: cls.id, teacherId: c.teacher.id };
  }

  // ── Matrículas — distribuir 15 estudiantes en 5 aulas ───────────────────
  // Cada estudiante en 1-2 aulas para crear relaciones cruzadas
  const enrollments: [string, string][] = [
    // [studentEmail, classroomCode]
    ['student1@legendaryclass.com',  'DEMO01'],
    ['student1@legendaryclass.com',  'DEMO02'],
    ['student2@legendaryclass.com',  'DEMO01'],
    ['student2@legendaryclass.com',  'DEMO03'],
    ['student3@legendaryclass.com',  'DEMO01'],
    ['student3@legendaryclass.com',  'DEMO05'],
    ['student4@legendaryclass.com',  'DEMO02'],
    ['student4@legendaryclass.com',  'DEMO03'],
    ['student5@legendaryclass.com',  'DEMO01'],
    ['student5@legendaryclass.com',  'DEMO04'],
    ['student6@legendaryclass.com',  'DEMO02'],
    ['student6@legendaryclass.com',  'DEMO04'],
    ['student7@legendaryclass.com',  'DEMO01'],
    ['student7@legendaryclass.com',  'DEMO03'],
    ['student8@legendaryclass.com',  'DEMO03'],
    ['student8@legendaryclass.com',  'DEMO05'],
    ['student9@legendaryclass.com',  'DEMO02'],
    ['student9@legendaryclass.com',  'DEMO04'],
    ['student10@legendaryclass.com', 'DEMO04'],
    ['student10@legendaryclass.com', 'DEMO05'],
    ['student11@legendaryclass.com', 'DEMO01'],
    ['student11@legendaryclass.com', 'DEMO05'],
    ['student12@legendaryclass.com', 'DEMO02'],
    ['student12@legendaryclass.com', 'DEMO03'],
    ['student13@legendaryclass.com', 'DEMO03'],
    ['student13@legendaryclass.com', 'DEMO04'],
    ['student14@legendaryclass.com', 'DEMO04'],
    ['student14@legendaryclass.com', 'DEMO05'],
    ['student15@legendaryclass.com', 'DEMO01'],
    ['student15@legendaryclass.com', 'DEMO02'],
  ];

  for (const [email, code] of enrollments) {
    const studentId = students[email].id;
    const { id: classroomId } = classrooms[code];
    await prisma.classroomStudent.upsert({
      where: { classroomId_studentId: { classroomId, studentId } },
      update: {},
      create: { classroomId, studentId },
    });
    // Points in classroom — vary by student level
    const lvl = studentDefs.find(s => s[0] === email)![4];
    await prisma.studentPoint.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: {},
      create: { studentId, classroomId, totalPoints: lvl * 80, level: Math.max(1, lvl - 1) },
    });
  }

  // ── Relaciones Padre–Hijo ────────────────────────────────────────────────
  // p1 → student1, student2
  // p2 → student3, student5, student7
  // p3 → student4, student8
  const parentLinks: [typeof p1, string][] = [
    [p1, 'student1@legendaryclass.com'],
    [p1, 'student2@legendaryclass.com'],
    [p2, 'student3@legendaryclass.com'],
    [p2, 'student5@legendaryclass.com'],
    [p2, 'student7@legendaryclass.com'],
    [p3, 'student4@legendaryclass.com'],
    [p3, 'student8@legendaryclass.com'],
  ];
  for (const [parent, email] of parentLinks) {
    const childId = students[email].id;
    await prisma.parentChild.upsert({
      where: { parentId_childId: { parentId: parent.id, childId } },
      update: {},
      create: { parentId: parent.id, childId },
    });
  }

  // ── Comportamientos por aula ─────────────────────────────────────────────
  const behaviorTemplates = [
    { id: 'beh-p1', name: 'Participación activa',     type: 'positive' as const, category: 'participation' as const, points: 10,  color: '#10B981' },
    { id: 'beh-p2', name: 'Tarea completa',            type: 'positive' as const, category: 'homework'      as const, points: 15,  color: '#6366F1' },
    { id: 'beh-p3', name: 'Excelente proyecto',        type: 'positive' as const, category: 'creativity'    as const, points: 25,  color: '#F59E0B' },
    { id: 'beh-p4', name: 'Ayudó a un compañero',     type: 'positive' as const, category: 'teamwork'      as const, points: 20,  color: '#06B6D4' },
    { id: 'beh-p5', name: 'Esfuerzo destacado',       type: 'positive' as const, category: 'effort'        as const, points: 12,  color: '#8B5CF6' },
    { id: 'beh-n1', name: 'Falta de respeto',          type: 'negative' as const, category: 'behavior'      as const, points: -10, color: '#EF4444' },
    { id: 'beh-n2', name: 'Tarea incompleta',          type: 'negative' as const, category: 'homework'      as const, points: -5,  color: '#F97316' },
    { id: 'beh-n3', name: 'Distracción en clase',      type: 'negative' as const, category: 'behavior'      as const, points: -8,  color: '#DC2626' },
  ];

  // Create behaviors for each classroom
  const behaviorIds: Record<string, Record<string, string>> = {};
  for (const [code, { id: classroomId, teacherId }] of Object.entries(classrooms)) {
    behaviorIds[code] = {};
    for (const bt of behaviorTemplates) {
      const bid = `${bt.id}-${code.toLowerCase()}`;
      const b = await prisma.behavior.upsert({
        where: { id: bid },
        update: {},
        create: { id: bid, name: bt.name, type: bt.type, category: bt.category, points: bt.points, color: bt.color, classroomId, createdById: teacherId },
      }).catch(() => prisma.behavior.findUnique({ where: { id: bid } }));
      if (b) behaviorIds[code][bt.id] = b.id;
    }
  }

  // ── Aplicar comportamientos a estudiantes ─────────────────────────────────
  // Generar un historial realista de los últimos 30 días
  const behaviorLogs: Array<{
    studentId: string; behaviorId: string; classroomId: string;
    pointsAwarded: number; awardedById: string; date: Date; notes?: string;
  }> = [];

  const positiveBehs = ['beh-p1','beh-p2','beh-p3','beh-p4','beh-p5'];
  const negativeBehs = ['beh-n1','beh-n2','beh-n3'];
  const posPoints    = [10,15,25,20,12];
  const negPoints    = [-10,-5,-8];

  for (const [email, code] of enrollments) {
    const studentId = students[email].id;
    const { id: classroomId, teacherId: awardedById } = classrooms[code];
    const biMap = behaviorIds[code];
    // 8–14 positive behaviors over 30 days
    const posCount = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < posCount; i++) {
      const idx = Math.floor(Math.random() * positiveBehs.length);
      const bKey = positiveBehs[idx];
      if (!biMap[bKey]) continue;
      behaviorLogs.push({
        studentId, behaviorId: biMap[bKey], classroomId,
        pointsAwarded: posPoints[idx],
        awardedById,
        date: daysAgo(Math.floor(Math.random() * 30)),
        notes: i % 3 === 0 ? '¡Buen trabajo hoy!' : undefined,
      });
    }
    // 1–3 negative behaviors
    const negCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < negCount; i++) {
      const idx = Math.floor(Math.random() * negativeBehs.length);
      const bKey = negativeBehs[idx];
      if (!biMap[bKey]) continue;
      behaviorLogs.push({
        studentId, behaviorId: biMap[bKey], classroomId,
        pointsAwarded: negPoints[idx],
        awardedById,
        date: daysAgo(Math.floor(Math.random() * 30)),
      });
    }
  }

  await prisma.studentBehavior.createMany({ data: behaviorLogs, skipDuplicates: true });
  console.log(`  ✔ ${behaviorLogs.length} registros de comportamiento`);

  // ── XP logs ──────────────────────────────────────────────────────────────
  const xpLogs: Array<{ userId: string; points: number; action: string; description: string; createdAt: Date; classroomId?: string }> = [];
  for (const { id: userId } of allStudents) {
    for (let i = 0; i < 20; i++) {
      xpLogs.push({
        userId, points: 10 + Math.floor(Math.random() * 50),
        action: ['homework','participation','quest','achievement'][Math.floor(Math.random() * 4)],
        description: 'Actividad de clase',
        createdAt: daysAgo(Math.floor(Math.random() * 30)),
      });
    }
  }
  await prisma.experienceLog.createMany({ data: xpLogs, skipDuplicates: false });
  console.log(`  ✔ ${xpLogs.length} registros de XP`);

  // ── Recompensas ───────────────────────────────────────────────────────────
  const rewardDefs = [
    { id: 'rwd-1', name: 'Juego libre',             desc: 'Media hora de juego libre',           cost: 80,  rarity: 'common'    as const },
    { id: 'rwd-2', name: 'Saltar una tarea',        desc: 'Exento de una tarea a elección',      cost: 150, rarity: 'rare'      as const },
    { id: 'rwd-3', name: 'Punto extra en examen',   desc: '+1 punto en el próximo examen',       cost: 200, rarity: 'epic'      as const },
    { id: 'rwd-4', name: 'Líder del día',           desc: 'Ser monitor de la clase por un día',  cost: 100, rarity: 'common'   as const },
    { id: 'rwd-5', name: 'Elegir actividad grupal', desc: 'Escoge la próxima actividad en equipo', cost: 120, rarity: 'rare'    as const },
    { id: 'rwd-6', name: 'Recompensa legendaria',   desc: 'Sorpresa especial del profesor',      cost: 500, rarity: 'legendary' as const },
  ];

  const rewardIds: Record<string, Record<string, string>> = {};
  for (const [code, { id: classroomId, teacherId }] of Object.entries(classrooms)) {
    rewardIds[code] = {};
    for (const r of rewardDefs) {
      const rid = `${r.id}-${code.toLowerCase()}`;
      const reward = await prisma.reward.upsert({
        where: { id: rid },
        update: {},
        create: {
          id: rid, name: r.name, description: r.desc, costPoints: r.cost,
          type: 'special_ability', rewardType: 'ability', xpBonus: 20,
          rarity: r.rarity, classroomId, createdById: teacherId,
        },
      }).catch(() => prisma.reward.findUnique({ where: { id: rid } }));
      if (reward) rewardIds[code][r.id] = reward.id;
    }
  }

  // Algunas redenciones de recompensas
  const redemptions = [
    { email: 'student1@legendaryclass.com', code: 'DEMO01', rKey: 'rwd-1', status: RewardStatus.delivered },
    { email: 'student3@legendaryclass.com', code: 'DEMO01', rKey: 'rwd-2', status: RewardStatus.approved  },
    { email: 'student5@legendaryclass.com', code: 'DEMO01', rKey: 'rwd-4', status: RewardStatus.pending   },
    { email: 'student7@legendaryclass.com', code: 'DEMO01', rKey: 'rwd-3', status: RewardStatus.pending   },
    { email: 'student11@legendaryclass.com',code: 'DEMO01', rKey: 'rwd-6', status: RewardStatus.pending   },
    { email: 'student2@legendaryclass.com', code: 'DEMO03', rKey: 'rwd-1', status: RewardStatus.delivered },
    { email: 'student4@legendaryclass.com', code: 'DEMO03', rKey: 'rwd-2', status: RewardStatus.pending   },
    { email: 'student9@legendaryclass.com', code: 'DEMO02', rKey: 'rwd-5', status: RewardStatus.approved  },
  ];

  for (const { email, code, rKey, status } of redemptions) {
    const studentId = students[email].id;
    const { id: classroomId, teacherId } = classrooms[code];
    const rewardId = rewardIds[code]?.[rKey];
    if (!rewardId) continue;
    await prisma.studentReward.create({
      data: {
        studentId, rewardId, classroomId,
        pointsSpent: rewardDefs.find(r => r.id === rKey)!.cost,
        status,
        approvedById: status !== RewardStatus.pending ? teacherId : undefined,
        approvedAt:   status !== RewardStatus.pending ? new Date() : undefined,
      },
    }).catch(() => {});
  }
  console.log(`  ✔ ${redemptions.length} redenciones de recompensas`);

  // ── Misiones ──────────────────────────────────────────────────────────────
  // Misiones normales y con evidencia para el aula DEMO01
  const questDefs = [
    // DEMO01
    { id: 'qst-01-a', code: 'DEMO01', title: 'Completa 3 tareas seguidas',     xp: 150, type: 'homework',      reqSub: false, maxAttempts: 1 },
    { id: 'qst-01-b', code: 'DEMO01', title: 'Participa 5 veces esta semana',  xp: 100, type: 'participation', reqSub: false, maxAttempts: 1 },
    { id: 'qst-01-c', code: 'DEMO01', title: 'Proyecto de fracciones',         xp: 200, type: 'project',       reqSub: true,  maxAttempts: 2 },
    { id: 'qst-01-d', code: 'DEMO01', title: 'Ensayo de patrones numéricos',   xp: 175, type: 'writing',       reqSub: true,  maxAttempts: 3 },
    // DEMO02
    { id: 'qst-02-a', code: 'DEMO02', title: 'Experimento de laboratorio',     xp: 200, type: 'project',       reqSub: true,  maxAttempts: 2 },
    { id: 'qst-02-b', code: 'DEMO02', title: 'Reporte de observación',         xp: 150, type: 'writing',       reqSub: true,  maxAttempts: 1 },
    // DEMO03
    { id: 'qst-03-a', code: 'DEMO03', title: 'Línea del tiempo histórica',     xp: 175, type: 'project',       reqSub: true,  maxAttempts: 2 },
    { id: 'qst-03-b', code: 'DEMO03', title: 'Lectura y análisis de texto',    xp: 100, type: 'reading',       reqSub: false, maxAttempts: 1 },
    // DEMO05
    { id: 'qst-05-a', code: 'DEMO05', title: 'Resolución de problemas de movimiento', xp: 200, type: 'homework', reqSub: false, maxAttempts: 1 },
    { id: 'qst-05-b', code: 'DEMO05', title: 'Video explicativo de un fenómeno',      xp: 250, type: 'project',  reqSub: true,  maxAttempts: 2 },
  ];

  const questIds: Record<string, string> = {};
  for (const q of questDefs) {
    const { id: classroomId, teacherId } = classrooms[q.code];
    const quest = await prisma.quest.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id, title: q.title, xpReward: q.xp, type: q.type,
        classroomId, teacherId,
        requiresSubmission: q.reqSub, maxAttempts: q.maxAttempts,
      },
    });
    questIds[q.id] = quest.id;
  }

  // Asignar misiones a estudiantes matriculados en esas aulas
  const questAssignments: [string, string][] = [
    // [questId, studentEmail]
    ['qst-01-a', 'student1@legendaryclass.com'],
    ['qst-01-a', 'student2@legendaryclass.com'],
    ['qst-01-a', 'student3@legendaryclass.com'],
    ['qst-01-a', 'student5@legendaryclass.com'],
    ['qst-01-a', 'student7@legendaryclass.com'],
    ['qst-01-a', 'student11@legendaryclass.com'],
    ['qst-01-a', 'student15@legendaryclass.com'],
    ['qst-01-b', 'student1@legendaryclass.com'],
    ['qst-01-b', 'student3@legendaryclass.com'],
    ['qst-01-b', 'student7@legendaryclass.com'],
    ['qst-01-c', 'student1@legendaryclass.com'],
    ['qst-01-c', 'student2@legendaryclass.com'],
    ['qst-01-c', 'student3@legendaryclass.com'],
    ['qst-01-c', 'student5@legendaryclass.com'],
    ['qst-01-c', 'student11@legendaryclass.com'],
    ['qst-01-d', 'student7@legendaryclass.com'],
    ['qst-01-d', 'student15@legendaryclass.com'],
    ['qst-02-a', 'student4@legendaryclass.com'],
    ['qst-02-a', 'student6@legendaryclass.com'],
    ['qst-02-a', 'student9@legendaryclass.com'],
    ['qst-02-a', 'student15@legendaryclass.com'],
    ['qst-02-b', 'student4@legendaryclass.com'],
    ['qst-02-b', 'student9@legendaryclass.com'],
    ['qst-03-a', 'student2@legendaryclass.com'],
    ['qst-03-a', 'student4@legendaryclass.com'],
    ['qst-03-a', 'student7@legendaryclass.com'],
    ['qst-03-a', 'student8@legendaryclass.com'],
    ['qst-03-a', 'student12@legendaryclass.com'],
    ['qst-03-a', 'student13@legendaryclass.com'],
    ['qst-03-b', 'student2@legendaryclass.com'],
    ['qst-03-b', 'student8@legendaryclass.com'],
    ['qst-05-a', 'student3@legendaryclass.com'],
    ['qst-05-a', 'student8@legendaryclass.com'],
    ['qst-05-a', 'student10@legendaryclass.com'],
    ['qst-05-a', 'student11@legendaryclass.com'],
    ['qst-05-a', 'student14@legendaryclass.com'],
    ['qst-05-b', 'student3@legendaryclass.com'],
    ['qst-05-b', 'student11@legendaryclass.com'],
    ['qst-05-b', 'student14@legendaryclass.com'],
  ];

  // Quests completadas (las no-submission)
  const completedQuests = new Set([
    'qst-01-a:student1@legendaryclass.com',
    'qst-01-a:student3@legendaryclass.com',
    'qst-01-a:student7@legendaryclass.com',
    'qst-01-a:student11@legendaryclass.com',
    'qst-01-b:student1@legendaryclass.com',
    'qst-01-b:student3@legendaryclass.com',
    'qst-03-b:student2@legendaryclass.com',
    'qst-05-a:student3@legendaryclass.com',
    'qst-05-a:student11@legendaryclass.com',
  ]);

  for (const [qId, email] of questAssignments) {
    const questId = questIds[qId];
    const studentId = students[email].id;
    const completed = completedQuests.has(`${qId}:${email}`);
    await prisma.questStudent.upsert({
      where: { questId_studentId: { questId, studentId } },
      update: {},
      create: { questId, studentId, isCompleted: completed, completedAt: completed ? daysAgo(Math.floor(Math.random() * 10)) : null },
    });
  }
  console.log(`  ✔ ${questAssignments.length} asignaciones de misiones`);

  // ── Quest Submissions ─────────────────────────────────────────────────────
  // Distintos estados: pending, approved, rejected
  const submissionDefs = [
    // Proyecto de fracciones (qst-01-c) — varios estados
    { id: 'sub-01', qId: 'qst-01-c', email: 'student1@legendaryclass.com',  file: 'fracciones_luna.pdf',      status: SubmissionStatus.approved,  attempt: 1, notes: '¡Excelente trabajo, muy bien presentado!' },
    { id: 'sub-02', qId: 'qst-01-c', email: 'student2@legendaryclass.com',  file: 'fracciones_diego.png',     status: SubmissionStatus.rejected,  attempt: 1, notes: 'Faltan los procedimientos. Por favor añade los pasos intermedios.' },
    { id: 'sub-03', qId: 'qst-01-c', email: 'student2@legendaryclass.com',  file: 'fracciones_diego_v2.pdf',  status: SubmissionStatus.pending,   attempt: 2, notes: null },
    { id: 'sub-04', qId: 'qst-01-c', email: 'student3@legendaryclass.com',  file: 'fracciones_sofia.pdf',     status: SubmissionStatus.pending,   attempt: 1, notes: null },
    { id: 'sub-05', qId: 'qst-01-c', email: 'student5@legendaryclass.com',  file: 'fracciones_valentina.jpg', status: SubmissionStatus.approved,  attempt: 1, notes: 'Perfecto. Subiste al nivel de la misión.' },
    // Ensayo (qst-01-d)
    { id: 'sub-06', qId: 'qst-01-d', email: 'student7@legendaryclass.com',  file: 'ensayo_isa.pdf',           status: SubmissionStatus.approved,  attempt: 1, notes: 'Muy bien redactado.' },
    { id: 'sub-07', qId: 'qst-01-d', email: 'student15@legendaryclass.com', file: 'ensayo_gabi.pdf',          status: SubmissionStatus.pending,   attempt: 1, notes: null },
    // Experimento lab (qst-02-a)
    { id: 'sub-08', qId: 'qst-02-a', email: 'student4@legendaryclass.com',  file: 'lab_mateo.pdf',            status: SubmissionStatus.pending,   attempt: 1, notes: null },
    { id: 'sub-09', qId: 'qst-02-a', email: 'student9@legendaryclass.com',  file: 'lab_camila.jpg',           status: SubmissionStatus.rejected,  attempt: 1, notes: 'Necesitas incluir la hipótesis del experimento.' },
    { id: 'sub-10', qId: 'qst-02-a', email: 'student9@legendaryclass.com',  file: 'lab_camila_v2.pdf',        status: SubmissionStatus.pending,   attempt: 2, notes: null },
    // Línea del tiempo (qst-03-a)
    { id: 'sub-11', qId: 'qst-03-a', email: 'student2@legendaryclass.com',  file: 'timeline_diego.png',       status: SubmissionStatus.approved,  attempt: 1, notes: 'Línea del tiempo muy completa.' },
    { id: 'sub-12', qId: 'qst-03-a', email: 'student4@legendaryclass.com',  file: 'timeline_mateo.pdf',       status: SubmissionStatus.pending,   attempt: 1, notes: null },
    { id: 'sub-13', qId: 'qst-03-a', email: 'student13@legendaryclass.com', file: 'timeline_emma.pdf',        status: SubmissionStatus.rejected,  attempt: 1, notes: 'Le falta la etapa contemporánea.' },
    // Video físico (qst-05-b)
    { id: 'sub-14', qId: 'qst-05-b', email: 'student3@legendaryclass.com',  file: 'video_sofia.pdf',          status: SubmissionStatus.pending,   attempt: 1, notes: null },
    { id: 'sub-15', qId: 'qst-05-b', email: 'student11@legendaryclass.com', file: 'video_mariana.pdf',        status: SubmissionStatus.approved,  attempt: 1, notes: '¡Explicación clara y bien estructurada!' },
  ];

  for (const s of submissionDefs) {
    const questId = questIds[s.qId];
    const studentId = students[s.email].id;
    await prisma.questSubmission.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, questId, studentId,
        fileUrl: `/uploads/submissions/${s.id}-${s.file}`,
        fileName: s.file,
        status: s.status,
        attemptNumber: s.attempt,
        teacherNotes: s.notes,
        submittedAt: daysAgo(Math.floor(Math.random() * 7)),
        reviewedAt: s.status !== SubmissionStatus.pending ? daysAgo(Math.floor(Math.random() * 4)) : null,
      },
    });
    // Si aprobada, marcar QuestStudent como completada
    if (s.status === SubmissionStatus.approved) {
      await prisma.questStudent.updateMany({
        where: { questId, studentId, isCompleted: false },
        data: { isCompleted: true, completedAt: new Date() },
      });
    }
  }
  console.log(`  ✔ ${submissionDefs.length} entregas de misiones`);

  // ── Notificaciones ────────────────────────────────────────────────────────
  const notifDefs: Array<{ userId: string; type: NotificationType; title: string; message: string; link?: string }> = [];

  // Para estudiante 1 (luna)
  const s1id = students['student1@legendaryclass.com'].id;
  const s2id = students['student2@legendaryclass.com'].id;
  const s3id = students['student3@legendaryclass.com'].id;
  const s7id = students['student7@legendaryclass.com'].id;
  const s11id = students['student11@legendaryclass.com'].id;

  notifDefs.push(
    { userId: s1id,  type: NotificationType.level_up,       title: '🎉 ¡Subiste de nivel!',     message: 'Ahora eres nivel 5. ¡Sigue adelante, Mago!' },
    { userId: s1id,  type: NotificationType.achievement,     title: '🏆 Logro desbloqueado',     message: 'Conseguiste "Primer Centenar". +20 XP', link: '/student/profile' },
    { userId: s1id,  type: NotificationType.quest_approved,  title: '✅ Entrega aprobada',       message: 'Tu proyecto de fracciones fue aprobado. +200 XP', link: '/student/quests' },
    { userId: s2id,  type: NotificationType.quest_rejected,  title: '❌ Entrega rechazada',      message: 'Tu proyecto de fracciones necesita los procedimientos.', link: '/student/quests' },
    { userId: s2id,  type: NotificationType.quest_approved,  title: '✅ Misión completada',      message: 'Tu línea del tiempo fue aprobada. +175 XP', link: '/student/quests' },
    { userId: s3id,  type: NotificationType.level_up,        title: '🎉 ¡Subiste de nivel!',     message: 'Ahora eres nivel 6. ¡Ninja imparable!' },
    { userId: s3id,  type: NotificationType.quest_submission, title: '📎 Nueva entrega recibida', message: 'Sofía entregó su proyecto de fracciones', link: '/teacher/quest-submissions' },
    { userId: s7id,  type: NotificationType.achievement,     title: '🏆 Logro épico',            message: 'Conseguiste "Guerrero del Conocimiento". +100 XP', link: '/student/profile' },
    { userId: s7id,  type: NotificationType.quest_approved,  title: '✅ Ensayo aprobado',        message: 'Muy bien redactado. +175 XP', link: '/student/quests' },
    { userId: s11id, type: NotificationType.level_up,        title: '🎉 ¡Nivel 9!',              message: 'Eres nivel 9 — casi Legendario, Mago!' },
    { userId: s11id, type: NotificationType.quest_approved,  title: '✅ Video aprobado',         message: '¡Explicación perfecta! +250 XP', link: '/student/quests' },
    { userId: t1.id, type: NotificationType.quest_submission, title: '📎 4 entregas pendientes', message: 'Tienes 4 proyectos por revisar en Matemáticas 3ro A', link: '/teacher/quest-submissions' },
    { userId: t2.id, type: NotificationType.quest_submission, title: '📎 Nueva entrega',         message: 'Diego entregó su línea del tiempo', link: '/teacher/quest-submissions' },
  );

  for (const n of notifDefs) {
    await prisma.notification.create({ data: { ...n, isRead: Math.random() > 0.5 } }).catch(() => {});
  }
  console.log(`  ✔ ${notifDefs.length} notificaciones`);

  // ── Logros para estudiantes destacados ───────────────────────────────────
  const achievementDefs = [
    { userId: s1id,  key: 'first_quest',    name: 'Primera Misión',     icon: '⚔️',  xp: 10,  rarity: 'common'   as const },
    { userId: s1id,  key: 'first_hundred',  name: 'Primer Centenar',    icon: '💯',  xp: 20,  rarity: 'common'   as const },
    { userId: s3id,  key: 'streak_7',       name: 'Semana Perfecta',    icon: '🔥',  xp: 30,  rarity: 'rare'     as const },
    { userId: s3id,  key: 'five_hundred',   name: 'Club de los 500',    icon: '🔥',  xp: 50,  rarity: 'rare'     as const },
    { userId: s7id,  key: 'first_quest',    name: 'Primera Misión',     icon: '⚔️',  xp: 10,  rarity: 'common'   as const },
    { userId: s7id,  key: 'thousand_club',  name: 'Maestro de Puntos',  icon: '🎖️',  xp: 100, rarity: 'rare'     as const },
    { userId: s11id, key: 'first_hundred',  name: 'Primer Centenar',    icon: '💯',  xp: 20,  rarity: 'common'   as const },
    { userId: s11id, key: 'thousand_club',  name: 'Maestro de Puntos',  icon: '🎖️',  xp: 100, rarity: 'rare'     as const },
    { userId: s11id, key: 'streak_30',      name: 'Mes Legendario',     icon: '🌟',  xp: 200, rarity: 'epic'     as const },
  ];

  for (const a of achievementDefs) {
    await prisma.achievement.upsert({
      where: { userId_key: { userId: a.userId, key: a.key } },
      update: {},
      create: {
        userId: a.userId, key: a.key, name: a.name, icon: a.icon,
        xpReward: a.xp, rarity: a.rarity, earnedAt: daysAgo(Math.floor(Math.random() * 20)),
      } as any,
    }).catch(() => {});
  }
  console.log(`  ✔ ${achievementDefs.length} logros desbloqueados`);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log('\n✅ seed-rich completo!');
  console.log('   👨‍🏫 Profesores:    teacher2@legendaryclass.com / teacher3@legendaryclass.com');
  console.log('   👨‍👧 Padres:        parent2@legendaryclass.com / parent3@legendaryclass.com');
  console.log('   🧑‍🎓 Estudiantes:   student3...student15@legendaryclass.com');
  console.log('   🏫 Aulas:         DEMO01–DEMO05 (5 aulas)');
  console.log('   Todas las cuentas usan password: password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
