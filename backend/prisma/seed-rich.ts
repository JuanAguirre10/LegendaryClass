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
    // XP a mitad de nivel para que level = floor(sqrt(xp/100))+1 se cumpla
    // y la barra de progreso no arranque al 100%
    ['student1@legendaryclass.com',  'Carlos Soto',      CharacterType.mago,      CharacterBonusType.knowledge,  24, 57590, 380, 12],
    ['student2@legendaryclass.com',  'Diego Torres',     CharacterType.guerrero,  CharacterBonusType.strength,    4,  1250, 260, 7],
    ['student3@legendaryclass.com',  'Alejandro Ruiz',   CharacterType.ninja,     CharacterBonusType.agility,     6,  3050, 510, 20],
    ['student4@legendaryclass.com',  'Mateo Herrera',    CharacterType.arquero,   CharacterBonusType.precision,   3,   650, 180, 4],
    ['student5@legendaryclass.com',  'Fernando Cruz',    CharacterType.lanzador,  CharacterBonusType.creativity,  7,  4250, 620, 15],
    ['student6@legendaryclass.com',  'Andrés López',     CharacterType.mago,      CharacterBonusType.knowledge,   2,   250,  90, 3],
    ['student7@legendaryclass.com',  'Ricardo Vega',     CharacterType.guerrero,  CharacterBonusType.strength,    8,  5650, 750, 30],
    ['student8@legendaryclass.com',  'Sebastián Flores', CharacterType.ninja,     CharacterBonusType.agility,     3,   650, 150, 5],
    ['student9@legendaryclass.com',  'Eduardo Reyes',    CharacterType.arquero,   CharacterBonusType.precision,   4,  1250, 210, 9],
    ['student10@legendaryclass.com', 'Santiago Díaz',    CharacterType.lanzador,  CharacterBonusType.creativity,  2,   250,  80, 2],
    ['student11@legendaryclass.com', 'Javier Ramos',     CharacterType.mago,      CharacterBonusType.knowledge,   9,  7250, 900, 45],
    ['student12@legendaryclass.com', 'Nicolás Vargas',   CharacterType.guerrero,  CharacterBonusType.strength,    1,    50,  50, 1],
    ['student13@legendaryclass.com', 'Pablo Navarro',    CharacterType.lanzador,  CharacterBonusType.creativity,  5,  2050, 340, 11],
    ['student14@legendaryclass.com', 'Lucas Mendoza',    CharacterType.ninja,     CharacterBonusType.agility,     3,   650, 130, 3],
    ['student15@legendaryclass.com', 'Tomás Iglesias',   CharacterType.arquero,   CharacterBonusType.precision,   6,  3050, 480, 18],
  ] as const;

  const students: Record<string, { id: string; name: string }> = {};
  for (const [email, name, char, bonus, level, xp, pts, streak] of studentDefs) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { name, level, experiencePoints: xp, points: pts, loginStreak: streak },
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
  // Cada estudiante en 1-2 aulas; puntos por aula distintos para rankings diferentes
  // [studentEmail, classroomCode, totalPoints, level]
  const enrollments: [string, string, number, number][] = [
    // level = floor(totalPoints / 100) + 1 (misma fórmula que updateStudentPoints)
    // DEMO01 — Matemáticas 3ro A  →  top: Ricardo > Fernando > Tomás
    ['student7@legendaryclass.com',  'DEMO01',  850, 9],
    ['student5@legendaryclass.com',  'DEMO01',  720, 8],
    ['student15@legendaryclass.com', 'DEMO01',  650, 7],
    ['student11@legendaryclass.com', 'DEMO01',  580, 6],
    ['student3@legendaryclass.com',  'DEMO01',  420, 5],
    ['student1@legendaryclass.com',  'DEMO01',  310, 4],
    ['student2@legendaryclass.com',  'DEMO01',  180, 2],

    // DEMO02 — Ciencias 2do B  →  top: Eduardo > Carlos > Tomás
    ['student9@legendaryclass.com',  'DEMO02',  780, 8],
    ['student1@legendaryclass.com',  'DEMO02',  640, 7],
    ['student15@legendaryclass.com', 'DEMO02',  520, 6],
    ['student4@legendaryclass.com',  'DEMO02',  390, 4],
    ['student6@legendaryclass.com',  'DEMO02',  280, 3],
    ['student12@legendaryclass.com', 'DEMO02',  160, 2],

    // DEMO03 — Historia 1ro C
    ['student2@legendaryclass.com',  'DEMO03',  540, 6],
    ['student4@legendaryclass.com',  'DEMO03',  460, 5],
    ['student7@legendaryclass.com',  'DEMO03',  390, 4],
    ['student8@legendaryclass.com',  'DEMO03',  300, 4],
    ['student12@legendaryclass.com', 'DEMO03',  220, 3],
    ['student13@legendaryclass.com', 'DEMO03',  180, 2],

    // DEMO04 — Lengua y Lit. 4to A
    ['student5@legendaryclass.com',  'DEMO04',  670, 7],
    ['student6@legendaryclass.com',  'DEMO04',  550, 6],
    ['student9@legendaryclass.com',  'DEMO04',  430, 5],
    ['student10@legendaryclass.com', 'DEMO04',  310, 4],
    ['student13@legendaryclass.com', 'DEMO04',  240, 3],
    ['student14@legendaryclass.com', 'DEMO04',  150, 2],

    // DEMO05 — Física 5to B
    ['student3@legendaryclass.com',  'DEMO05',  730, 8],
    ['student8@legendaryclass.com',  'DEMO05',  600, 7],
    ['student10@legendaryclass.com', 'DEMO05',  480, 5],
    ['student11@legendaryclass.com', 'DEMO05',  370, 4],
    ['student14@legendaryclass.com', 'DEMO05',  250, 3],
  ];

  for (const [email, code, totalPoints, level] of enrollments) {
    const studentId = students[email].id;
    const { id: classroomId } = classrooms[code];
    await prisma.classroomStudent.upsert({
      where: { classroomId_studentId: { classroomId, studentId } },
      update: {},
      create: { classroomId, studentId },
    });
    await prisma.studentPoint.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: { totalPoints, level },
      create: { studentId, classroomId, totalPoints, level },
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
  // Eliminar recompensas antiguas (seeds previos con IDs obsoletos)
  const obsoleteRewardIds = [
    'seed-reward-1',
    ...['DEMO01','DEMO02','DEMO03','DEMO04','DEMO05'].flatMap(code =>
      ['rwd-1','rwd-2','rwd-3','rwd-4','rwd-5','rwd-6'].map(r => `${r}-${code.toLowerCase()}`)
    ),
  ];
  await prisma.studentReward.deleteMany({ where: { rewardId: { in: obsoleteRewardIds } } });
  await prisma.reward.deleteMany({ where: { id: { in: obsoleteRewardIds } } });

  // Recompensas únicas por aula — cada aula tiene su propio catálogo
  type RDef = { id: string; name: string; desc: string; icon: string; cost: number; xpBonus: number; rarity: 'common'|'rare'|'epic'|'legendary' };
  const rewardsByCode: Record<string, RDef[]> = {
    DEMO01: [
      { id:'r01-a', name:'Juego libre',              icon:'🎮', desc:'Media hora de actividad libre al final de clase.',                   cost:80,  xpBonus:0,   rarity:'common' },
      { id:'r01-b', name:'Saltar una tarea',         icon:'📋', desc:'Queda exento de entregar una tarea de tu elección.',                 cost:150, xpBonus:0,   rarity:'rare' },
      { id:'r01-c', name:'+1 punto en examen',       icon:'📝', desc:'Suma un punto extra en el próximo examen.',                         cost:220, xpBonus:0,   rarity:'epic' },
      { id:'r01-d', name:'Líder del día',            icon:'👑', desc:'Serás el monitor de la clase durante una jornada completa.',        cost:100, xpBonus:10,  rarity:'common' },
      { id:'r01-e', name:'Elegir actividad grupal',  icon:'🎲', desc:'Tú decides cuál será la próxima dinámica en equipo.',               cost:130, xpBonus:0,   rarity:'rare' },
      { id:'r01-f', name:'Salir 5 min antes',        icon:'🚪', desc:'Permiso para salir cinco minutos antes del recreo.',                cost:60,  xpBonus:0,   rarity:'common' },
      { id:'r01-g', name:'Sentarse con un amigo',    icon:'🪑', desc:'Cambia tu lugar y siéntate junto a quien elijas por un día.',       cost:70,  xpBonus:0,   rarity:'common' },
      { id:'r01-h', name:'DJ de la clase',           icon:'🎵', desc:'Pone la música durante las actividades del día.',                   cost:90,  xpBonus:5,   rarity:'common' },
      { id:'r01-i', name:'Sin tarea el viernes',     icon:'🎉', desc:'Bono especial: sin tarea para el fin de semana.',                   cost:200, xpBonus:0,   rarity:'rare' },
      { id:'r01-j', name:'Cofre Legendario',         icon:'🏆', desc:'Recompensa sorpresa del profesor — solo para los más épicos.',      cost:500, xpBonus:100, rarity:'legendary' },
    ],
    DEMO02: [
      { id:'r02-a', name:'Tiempo libre en lab',      icon:'🔬', desc:'15 minutos para explorar el laboratorio libremente.',               cost:90,  xpBonus:0,   rarity:'common' },
      { id:'r02-b', name:'Exento de práctica',       icon:'🧪', desc:'Te saltas la práctica de laboratorio de tu elección.',              cost:160, xpBonus:0,   rarity:'rare' },
      { id:'r02-c', name:'Científico del mes',       icon:'🥼', desc:'Tu foto y nombre aparecen en el "muro de la ciencia" del aula.',    cost:110, xpBonus:15,  rarity:'common' },
      { id:'r02-d', name:'Elegir experimento',       icon:'⚗️',  desc:'Propón y dirige el próximo experimento grupal.',                   cost:180, xpBonus:0,   rarity:'rare' },
      { id:'r02-e', name:'+2 pts práctica',          icon:'📊', desc:'Dos puntos extra en la calificación de la próxima práctica.',       cost:250, xpBonus:0,   rarity:'epic' },
      { id:'r02-f', name:'Ver documental',           icon:'🎬', desc:'La clase ve un documental de ciencias a tu elección.',              cost:100, xpBonus:5,   rarity:'common' },
      { id:'r02-g', name:'Pase de investigación',    icon:'📚', desc:'Acceso a materiales extra del laboratorio para investigar.',        cost:75,  xpBonus:10,  rarity:'common' },
      { id:'r02-h', name:'Sin informe esta semana',  icon:'📝', desc:'Exento de entregar el informe de laboratorio semanal.',             cost:140, xpBonus:0,   rarity:'rare' },
      { id:'r02-i', name:'Bata personalizada',       icon:'✨', desc:'Usa tu bata con tu apodo de científico durante un mes.',           cost:80,  xpBonus:5,   rarity:'common' },
      { id:'r02-j', name:'Premio Nobel del Aula',    icon:'🏅', desc:'Reconocimiento especial y mención en el boletín escolar.',         cost:450, xpBonus:80,  rarity:'legendary' },
    ],
    DEMO03: [
      { id:'r03-a', name:'Cuéntame un chiste',       icon:'😄', desc:'El profesor te escucha contar el chiste del día a la clase.',       cost:50,  xpBonus:0,   rarity:'common' },
      { id:'r03-b', name:'Leer en voz alta',         icon:'📖', desc:'Eres el narrador oficial en la próxima lectura grupal.',           cost:70,  xpBonus:5,   rarity:'common' },
      { id:'r03-c', name:'Saltar un ejercicio oral', icon:'🤫', desc:'No participas en la próxima actividad oral obligatoria.',          cost:130, xpBonus:0,   rarity:'rare' },
      { id:'r03-d', name:'Redacción libre',          icon:'✍️', desc:'Escoge el tema para la próxima redacción del grupo.',              cost:120, xpBonus:0,   rarity:'rare' },
      { id:'r03-e', name:'+1.5 pts en ensayo',       icon:'📜', desc:'Puntos extra en la calificación de tu próximo ensayo.',           cost:230, xpBonus:0,   rarity:'epic' },
      { id:'r03-f', name:'Autor del mes',            icon:'🖊️', desc:'Tu obra se exhibe en el tablero literario del aula.',             cost:100, xpBonus:10,  rarity:'common' },
      { id:'r03-g', name:'Libro a tu elección',      icon:'📕', desc:'El profesor trae un libro especial que tú pidas para la clase.',   cost:90,  xpBonus:5,   rarity:'common' },
      { id:'r03-h', name:'Día sin dictado',          icon:'🙅', desc:'La clase se libra del dictado gracias a ti.',                      cost:110, xpBonus:0,   rarity:'rare' },
      { id:'r03-i', name:'Poema dedicado',           icon:'💌', desc:'El profesor lee en clase un poema que tú elijas.',                 cost:60,  xpBonus:0,   rarity:'common' },
      { id:'r03-j', name:'Premio Cervantes del Aula',icon:'🏆', desc:'Reconocimiento especial por excelencia literaria.',               cost:400, xpBonus:75,  rarity:'legendary' },
    ],
    DEMO04: [
      { id:'r04-a', name:'Capitán del equipo',       icon:'⚽', desc:'Eres el capitán en la próxima clase de educación física.',        cost:80,  xpBonus:5,   rarity:'common' },
      { id:'r04-b', name:'Elegir el deporte',        icon:'🏀', desc:'Decides qué deporte practica la clase la próxima sesión.',        cost:100, xpBonus:0,   rarity:'common' },
      { id:'r04-c', name:'Árbitro por un día',       icon:'🦺', desc:'Diriges y arbitras el partido de la clase.',                      cost:90,  xpBonus:5,   rarity:'common' },
      { id:'r04-d', name:'Saltar ejercicio físico',  icon:'😮‍💨',desc:'Exento de la parte de calentamiento o ejercicio del día.',          cost:140, xpBonus:0,   rarity:'rare' },
      { id:'r04-e', name:'Medalla de Oro',           icon:'🥇', desc:'+2 puntos extra en la próxima evaluación física.',                cost:220, xpBonus:0,   rarity:'epic' },
      { id:'r04-f', name:'Música en el gym',         icon:'🎧', desc:'Pones la playlist durante la clase de educación física.',         cost:70,  xpBonus:0,   rarity:'common' },
      { id:'r04-g', name:'Pase de descanso',         icon:'🛋️', desc:'Un día sin actividad física — puedes descansar o apoyar.',       cost:120, xpBonus:0,   rarity:'rare' },
      { id:'r04-h', name:'Trofeo del Campeón',       icon:'🏆', desc:'Reconocimiento especial y fotografía en el tablero deportivo.',   cost:380, xpBonus:60,  rarity:'legendary' },
    ],
    DEMO05: [
      { id:'r05-a', name:'Usar calculadora',         icon:'🧮', desc:'Permiso para usar calculadora en la próxima prueba.',              cost:100, xpBonus:0,   rarity:'common' },
      { id:'r05-b', name:'Hoja de ayuda',            icon:'📄', desc:'Una hoja de apuntes permitida en el examen.',                     cost:180, xpBonus:0,   rarity:'rare' },
      { id:'r05-c', name:'Corregir un error',        icon:'✏️', desc:'El profesor corrige un error en tu última prueba a tu favor.',    cost:160, xpBonus:0,   rarity:'rare' },
      { id:'r05-d', name:'Resolver en la pizarra',   icon:'🖊️', desc:'Eres el primero en salir a resolver el problema del día.',       cost:60,  xpBonus:10,  rarity:'common' },
      { id:'r05-e', name:'+2 pts en prueba',         icon:'🎯', desc:'Dos puntos extra en la próxima prueba de matemáticas.',           cost:250, xpBonus:0,   rarity:'epic' },
      { id:'r05-f', name:'Problema a tu ritmo',      icon:'⏳', desc:'5 minutos extra para terminar la próxima evaluación.',            cost:130, xpBonus:0,   rarity:'rare' },
      { id:'r05-g', name:'Elegir compañero de examen',icon:'👥',desc:'Puedes hacer la próxima tarea o ejercicio en pareja.',            cost:110, xpBonus:0,   rarity:'common' },
      { id:'r05-h', name:'Matemático del Mes',       icon:'🔢', desc:'Tu nombre en el cuadro de honor del aula de matemáticas.',        cost:90,  xpBonus:15,  rarity:'common' },
      { id:'r05-i', name:'Saltar deberes',           icon:'🎉', desc:'Exento de los deberes de matemáticas de esta semana.',            cost:170, xpBonus:0,   rarity:'rare' },
      { id:'r05-j', name:'Medalla Fields del Aula',  icon:'🏅', desc:'Reconocimiento supremo por dominio matemático del trimestre.',    cost:480, xpBonus:90,  rarity:'legendary' },
    ],
  };

  const rewardIds: Record<string, Record<string, string>> = {};
  for (const [code, { id: classroomId, teacherId }] of Object.entries(classrooms)) {
    rewardIds[code] = {};
    const defs = rewardsByCode[code] ?? [];
    for (const r of defs) {
      const rid = `${r.id}`;
      const reward = await prisma.reward.upsert({
        where: { id: rid },
        update: { name: r.name, description: r.desc, costPoints: r.cost, icon: r.icon, xpBonus: r.xpBonus, rarity: r.rarity },
        create: {
          id: rid, name: r.name, description: r.desc, icon: r.icon, costPoints: r.cost,
          type: 'special_ability', rewardType: 'ability', xpBonus: r.xpBonus,
          rarity: r.rarity, classroomId, createdById: teacherId,
        },
      }).catch(() => prisma.reward.findUnique({ where: { id: rid } }));
      if (reward) rewardIds[code][r.id] = reward.id;
    }
  }

  // Redenciones de recompensas
  const redemptions = [
    { email: 'student1@legendaryclass.com',  code: 'DEMO01', rKey: 'r01-a', status: RewardStatus.delivered },
    { email: 'student3@legendaryclass.com',  code: 'DEMO01', rKey: 'r01-b', status: RewardStatus.approved  },
    { email: 'student5@legendaryclass.com',  code: 'DEMO01', rKey: 'r01-d', status: RewardStatus.pending   },
    { email: 'student7@legendaryclass.com',  code: 'DEMO01', rKey: 'r01-c', status: RewardStatus.pending   },
    { email: 'student11@legendaryclass.com', code: 'DEMO01', rKey: 'r01-j', status: RewardStatus.pending   },
    { email: 'student2@legendaryclass.com',  code: 'DEMO03', rKey: 'r03-b', status: RewardStatus.delivered },
    { email: 'student4@legendaryclass.com',  code: 'DEMO03', rKey: 'r03-c', status: RewardStatus.pending   },
    { email: 'student9@legendaryclass.com',  code: 'DEMO02', rKey: 'r02-d', status: RewardStatus.approved  },
    { email: 'student6@legendaryclass.com',  code: 'DEMO02', rKey: 'r02-a', status: RewardStatus.delivered },
    { email: 'student8@legendaryclass.com',  code: 'DEMO01', rKey: 'r01-h', status: RewardStatus.pending   },
    { email: 'student10@legendaryclass.com', code: 'DEMO01', rKey: 'r01-i', status: RewardStatus.pending   },
    { email: 'student15@legendaryclass.com', code: 'DEMO01', rKey: 'r01-f', status: RewardStatus.delivered },
  ];

  const allRewardDefsFlat = Object.values(rewardsByCode).flat();
  for (const { email, code, rKey, status } of redemptions) {
    const studentId = students[email]?.id;
    if (!studentId) continue;
    const { id: classroomId, teacherId } = classrooms[code];
    const rewardId = rewardIds[code]?.[rKey];
    if (!rewardId) continue;
    await prisma.studentReward.create({
      data: {
        studentId, rewardId, classroomId,
        pointsSpent: allRewardDefsFlat.find(r => r.id === rKey)!.cost,
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
    // DEMO01 — examen y ejercicio (con preguntas interactivas)
    { id: 'qst-01-e', code: 'DEMO01', title: 'Examen: fracciones y decimales', xp: 300, type: 'exam', reqSub: true, maxAttempts: 2, passingScore: 70,
      desc: 'Examen nivel intermedio-avanzado sobre fracciones equivalentes, operaciones con fracciones mixtas, conversión decimal y porcentajes. Necesitas 70% para aprobar.',
      questions: [
        { id:1,  type:'multiple_choice', text:'Simplifica 36/48 a su mínima expresión.', options:['3/4','4/5','2/3','6/8'], correctAnswer:'3/4', points:8 },
        { id:2,  type:'multiple_choice', text:'¿Cuánto es 2½ + 1¾?', options:['3¼','4¼','3¾','4½'], correctAnswer:'4¼', points:8 },
        { id:3,  type:'true_false',      text:'La fracción 7/14 es equivalente a 0.5.', correctAnswer:'true', points:8 },
        { id:4,  type:'multiple_choice', text:'¿Cuánto es 3/5 de 80?', options:['24','48','40','64'], correctAnswer:'48', points:8 },
        { id:5,  type:'multiple_choice', text:'¿Qué fracción equivale al 35%?', options:['35/10','7/20','35/100','7/10'], correctAnswer:'7/20', points:8 },
        { id:6,  type:'true_false',      text:'0.125 es igual a 1/8.', correctAnswer:'true', points:8 },
        { id:7,  type:'multiple_choice', text:'Ordena de menor a mayor: 2/3, 3/4, 5/8.', options:['2/3<5/8<3/4','5/8<2/3<3/4','3/4<2/3<5/8','5/8<3/4<2/3'], correctAnswer:'5/8<2/3<3/4', points:10 },
        { id:8,  type:'multiple_choice', text:'¿Cuánto es 5/6 − 1/4 (simplificada)?', options:['4/2','7/12','1/3','11/12'], correctAnswer:'7/12', points:10 },
        { id:9,  type:'true_false',      text:'Al multiplicar 2/3 × 3/4 el resultado es 1/2.', correctAnswer:'true', points:10 },
        { id:10, type:'multiple_choice', text:'Si un recipiente tiene 2/3 L y se añaden 3/8 L, ¿cuánto hay en total?', options:['5/11 L','1 1/24 L','5/6 L','1 L'], correctAnswer:'1 1/24 L', points:12 },
        { id:11, type:'multiple_choice', text:'¿Cuánto es 1¼ × 2⅖?', options:['3','2½','3⅕','2⅘'], correctAnswer:'3', points:10 },
        { id:12, type:'true_false',      text:'Dividir entre 1/2 es lo mismo que multiplicar por 2.', correctAnswer:'true', points:10 },
      ] },
    { id: 'qst-01-f', code: 'DEMO01', title: 'Práctica: álgebra básica', xp: 150, type: 'exercise', reqSub: true, maxAttempts: 3, passingScore: 50,
      desc: 'Ejercicios de introducción al álgebra: variables, expresiones algebraicas, ecuaciones lineales y sustitución de valores.',
      questions: [
        { id:1,  type:'multiple_choice', text:'Si x = 4, ¿cuánto vale 3x − 5?', options:['7','17','12','2'], correctAnswer:'7', points:10 },
        { id:2,  type:'true_false',      text:'En la expresión 5a, la letra "a" es la variable.', correctAnswer:'true', points:5 },
        { id:3,  type:'multiple_choice', text:'Simplifica: 4m + 3m − 2m', options:['9m','5m','7m','4m'], correctAnswer:'5m', points:10 },
        { id:4,  type:'multiple_choice', text:'Resuelve: 2x + 3 = 11. ¿Cuánto es x?', options:['3','4','5','7'], correctAnswer:'4', points:10 },
        { id:5,  type:'multiple_choice', text:'¿Cuánto vale y² − 2y cuando y = 5?', options:['15','20','35','10'], correctAnswer:'15', points:10 },
        { id:6,  type:'true_false',      text:'3(x + 2) = 3x + 6 para cualquier valor de x.', correctAnswer:'true', points:5 },
        { id:7,  type:'multiple_choice', text:'Si a = 2 y b = 3, ¿cuánto es a² + b²?', options:['10','13','25','6'], correctAnswer:'13', points:10 },
        { id:8,  type:'multiple_choice', text:'Resuelve: 5n − 4 = 3n + 8', options:['n=2','n=6','n=4','n=8'], correctAnswer:'n=6', points:10 },
        { id:9,  type:'open',            text:'Escribe y resuelve una ecuación de primer grado cuya solución sea x = 3.', points:15 },
        { id:10, type:'multiple_choice', text:'¿Cuál expresión equivale a "el triple de un número menos cuatro"?', options:['3n+4','n−12','3n−4','3(n−4)'], correctAnswer:'3n−4', points:15 },
      ] },
    // DEMO02
    { id: 'qst-02-a', code: 'DEMO02', title: 'Experimento de laboratorio',     xp: 200, type: 'project',  reqSub: true,  maxAttempts: 2 },
    { id: 'qst-02-b', code: 'DEMO02', title: 'Reporte de observación',         xp: 150, type: 'writing',  reqSub: true,  maxAttempts: 1 },
    // DEMO02 — examen y ejercicio (con preguntas interactivas)
    { id: 'qst-02-c', code: 'DEMO02', title: 'Examen: materia y energía', xp: 300, type: 'exam', reqSub: true, maxAttempts: 2, passingScore: 70,
      desc: 'Examen avanzado sobre propiedades de la materia, cambios físicos y químicos, ley de conservación de la masa y tipos de energía. Necesitas 70% para aprobar.',
      questions: [
        { id:1,  type:'multiple_choice', text:'¿Cuál propiedad NO cambia al pasar de líquido a gaseoso?', options:['Volumen','Forma','Masa','Densidad'], correctAnswer:'Masa', points:8 },
        { id:2,  type:'multiple_choice', text:'La oxidación del hierro es un cambio:', options:['Físico reversible','Físico irreversible','Químico reversible','Químico irreversible'], correctAnswer:'Químico irreversible', points:8 },
        { id:3,  type:'true_false',      text:'Según la ley de conservación de la masa, la masa total antes y después de una reacción química es la misma.', correctAnswer:'true', points:8 },
        { id:4,  type:'multiple_choice', text:'Un resorte comprimido tiene principalmente energía:', options:['Cinética','Potencial elástica','Térmica','Química'], correctAnswer:'Potencial elástica', points:8 },
        { id:5,  type:'multiple_choice', text:'¿Cuál de estos cambios es FÍSICO?', options:['Fermentación del azúcar','Digestión de alimentos','Fusión del hierro','Combustión del gas'], correctAnswer:'Fusión del hierro', points:8 },
        { id:6,  type:'true_false',      text:'La sublimación es el paso directo de sólido a gaseoso sin pasar por líquido.', correctAnswer:'true', points:8 },
        { id:7,  type:'multiple_choice', text:'La densidad se calcula como:', options:['masa × volumen','masa / volumen','volumen / masa','masa + volumen'], correctAnswer:'masa / volumen', points:8 },
        { id:8,  type:'multiple_choice', text:'Si se duplica la velocidad de un objeto, su energía cinética:', options:['Se duplica','Se triplica','Se cuadruplica','Se reduce a la mitad'], correctAnswer:'Se cuadruplica', points:10 },
        { id:9,  type:'true_false',      text:'En una reacción endotérmica el sistema ABSORBE energía del entorno.', correctAnswer:'true', points:8 },
        { id:10, type:'multiple_choice', text:'¿En cuál proceso se forman nuevas sustancias?', options:['Ebullición','Disolución','Trituración','Combustión'], correctAnswer:'Combustión', points:8 },
        { id:11, type:'multiple_choice', text:'Un objeto de 2 kg a 10 m (g=10 m/s²) tiene energía potencial de:', options:['20 J','100 J','200 J','2000 J'], correctAnswer:'200 J', points:10 },
        { id:12, type:'true_false',      text:'El calor fluye del cuerpo de menor temperatura al de mayor temperatura.', correctAnswer:'false', points:10 },
      ] },
    { id: 'qst-02-d', code: 'DEMO02', title: 'Práctica: clasificación de seres vivos', xp: 150, type: 'exercise', reqSub: true, maxAttempts: 3, passingScore: 50,
      desc: 'Ejercicios sobre los cinco reinos, clasificación taxonómica, características de los grupos y nomenclatura binomial.',
      questions: [
        { id:1,  type:'multiple_choice', text:'¿Cuántos reinos reconoce la clasificación de Whittaker?', options:['3','4','5','6'], correctAnswer:'5', points:8 },
        { id:2,  type:'multiple_choice', text:'¿A qué reino pertenecen los hongos?', options:['Plantae','Animalia','Fungi','Protista'], correctAnswer:'Fungi', points:8 },
        { id:3,  type:'true_false',      text:'Las bacterias son procariotas y pertenecen al reino Monera.', correctAnswer:'true', points:8 },
        { id:4,  type:'multiple_choice', text:'En la nomenclatura binomial, el segundo término indica:', options:['El reino','El género','La especie','La familia'], correctAnswer:'La especie', points:8 },
        { id:5,  type:'multiple_choice', text:'Orden correcto de más amplio a más específico:', options:['Especie→Género→Familia→Orden','Reino→Filo→Clase→Orden→Familia→Género→Especie','Clase→Orden→Reino→Filo','Familia→Clase→Filo→Reino'], correctAnswer:'Reino→Filo→Clase→Orden→Familia→Género→Especie', points:10 },
        { id:6,  type:'true_false',      text:'Los virus se clasifican dentro del reino Monera.', correctAnswer:'false', points:8 },
        { id:7,  type:'multiple_choice', text:'Canis lupus familiaris y Canis lupus pertenecen al mismo:', options:['Reino','Orden','Género','Especie'], correctAnswer:'Género', points:10 },
        { id:8,  type:'multiple_choice', text:'Característica exclusiva del reino Animalia:', options:['Tienen células','Son eucariotas','Son heterótrofos sin pared celular','Realizan fotosíntesis'], correctAnswer:'Son heterótrofos sin pared celular', points:10 },
        { id:9,  type:'open',            text:'Explica la diferencia entre eucariota y procariota, y da un ejemplo de cada uno.', points:15 },
        { id:10, type:'true_false',      text:'Las algas multicelulares pertenecen al reino Protista.', correctAnswer:'true', points:15 },
      ] },
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
      update: {
        title: q.title,
        description: (q as any).desc ?? null,
        // Prisma rejects plain null for Json fields — omit instead of clearing
        questions: (q as any).questions ?? undefined,
        passingScore: (q as any).passingScore ?? 60,
        xpReward: q.xp,
        requiresSubmission: q.reqSub,
        maxAttempts: q.maxAttempts,
      },
      create: {
        id: q.id, title: q.title, description: (q as any).desc ?? null, xpReward: q.xp, type: q.type,
        classroomId, teacherId,
        requiresSubmission: q.reqSub, maxAttempts: q.maxAttempts,
        questions: (q as any).questions ?? undefined,
        passingScore: (q as any).passingScore ?? 60,
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
    // DEMO01 — examen y práctica para Tomás y otros
    ['qst-01-e', 'student1@legendaryclass.com'],
    ['qst-01-e', 'student3@legendaryclass.com'],
    ['qst-01-e', 'student5@legendaryclass.com'],
    ['qst-01-e', 'student15@legendaryclass.com'],
    ['qst-01-f', 'student1@legendaryclass.com'],
    ['qst-01-f', 'student2@legendaryclass.com'],
    ['qst-01-f', 'student15@legendaryclass.com'],
    // DEMO02
    ['qst-02-a', 'student4@legendaryclass.com'],
    ['qst-02-a', 'student6@legendaryclass.com'],
    ['qst-02-a', 'student9@legendaryclass.com'],
    ['qst-02-a', 'student15@legendaryclass.com'],
    ['qst-02-b', 'student4@legendaryclass.com'],
    ['qst-02-b', 'student9@legendaryclass.com'],
    // DEMO02 — examen y práctica para Tomás y otros
    ['qst-02-c', 'student4@legendaryclass.com'],
    ['qst-02-c', 'student6@legendaryclass.com'],
    ['qst-02-c', 'student9@legendaryclass.com'],
    ['qst-02-c', 'student15@legendaryclass.com'],
    ['qst-02-d', 'student4@legendaryclass.com'],
    ['qst-02-d', 'student9@legendaryclass.com'],
    ['qst-02-d', 'student15@legendaryclass.com'],
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
