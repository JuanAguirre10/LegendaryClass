import { PrismaClient, Role, CharacterType, CharacterBonusType } from '@prisma/client';
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
