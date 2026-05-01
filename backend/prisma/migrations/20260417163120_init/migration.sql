-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'teacher', 'director', 'parent', 'admin');

-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('mago', 'guerrero', 'ninja', 'arquero', 'lanzador');

-- CreateEnum
CREATE TYPE "CharacterBonusType" AS ENUM ('knowledge', 'strength', 'agility', 'precision', 'creativity');

-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('positive', 'negative');

-- CreateEnum
CREATE TYPE "BehaviorCategory" AS ENUM ('participation', 'homework', 'behavior', 'creativity', 'teamwork', 'punctuality', 'respect', 'effort');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('xp_boost', 'stat_boost', 'level_boost', 'character_upgrade', 'special_ability');

-- CreateEnum
CREATE TYPE "RewardEffectType" AS ENUM ('experience', 'stat', 'ability', 'cosmetic');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('pending', 'approved', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('active', 'completed', 'expired');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "characterType" "CharacterType",
    "characterBonusType" "CharacterBonusType",
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL DEFAULT 100,
    "achievementsCount" INTEGER NOT NULL DEFAULT 0,
    "questsCompleted" INTEGER NOT NULL DEFAULT 0,
    "positivePoints" INTEGER NOT NULL DEFAULT 0,
    "negativePoints" INTEGER NOT NULL DEFAULT 0,
    "rewardsEarned" INTEGER NOT NULL DEFAULT 0,
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "homeworkCompleted" INTEGER NOT NULL DEFAULT 0,
    "booksRead" INTEGER NOT NULL DEFAULT 0,
    "peersHelped" INTEGER NOT NULL DEFAULT 0,
    "creativeProjects" INTEGER NOT NULL DEFAULT 0,
    "studentsMentored" INTEGER NOT NULL DEFAULT 0,
    "weeklyPositive" INTEGER NOT NULL DEFAULT 0,
    "weeklyTasks" INTEGER NOT NULL DEFAULT 0,
    "weeklyXp" INTEGER NOT NULL DEFAULT 0,
    "firstCharacterSelection" BOOLEAN NOT NULL DEFAULT false,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "agility" INTEGER NOT NULL DEFAULT 10,
    "creativity" INTEGER NOT NULL DEFAULT 10,
    "leadership" INTEGER NOT NULL DEFAULT 10,
    "resilience" INTEGER NOT NULL DEFAULT 10,
    "gradeLevel" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "institutionId" TEXT,
    "preferences" JSONB,
    "lastLogin" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "gradeLevel" TEXT,
    "schoolYear" TEXT,
    "classCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_students" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroom_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_points" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "pointsSpent" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3),
    "achievements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "classroomId" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behaviors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "type" "BehaviorType" NOT NULL,
    "category" "BehaviorCategory" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "classroomId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_behaviors" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "behaviorId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "awardedById" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "type" "RewardType" NOT NULL,
    "rewardType" "RewardEffectType" NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER,
    "xpBonus" INTEGER NOT NULL DEFAULT 0,
    "statBonuses" JSONB,
    "levelRequirement" INTEGER,
    "characterSpecific" JSONB,
    "durationHours" INTEGER,
    "maxUsesPerStudent" INTEGER,
    "rarity" "Rarity" NOT NULL DEFAULT 'common',
    "effectDescription" TEXT,
    "requirements" JSONB,
    "classroomId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_rewards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'pending',
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "effectsApplied" JSONB,
    "expiresAt" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "rarity" "Rarity" NOT NULL DEFAULT 'common',
    "category" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "maxProgress" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "type" TEXT,
    "status" "QuestStatus" NOT NULL DEFAULT 'active',
    "classroomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "requirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_students" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quest_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_children" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_children_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_classCode_key" ON "classrooms"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_slug_key" ON "classrooms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_students_classroomId_studentId_key" ON "classroom_students"("classroomId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_points_studentId_classroomId_key" ON "student_points"("studentId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_userId_key_key" ON "achievements"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "quest_students_questId_studentId_key" ON "quest_students"("questId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_children_parentId_childId_key" ON "parent_children"("parentId", "childId");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_points" ADD CONSTRAINT "student_points_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_points" ADD CONSTRAINT "student_points_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_logs" ADD CONSTRAINT "experience_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_logs" ADD CONSTRAINT "experience_logs_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "student_behaviors_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "student_behaviors_behaviorId_fkey" FOREIGN KEY ("behaviorId") REFERENCES "behaviors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "student_behaviors_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "student_behaviors_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_rewards" ADD CONSTRAINT "student_rewards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_rewards" ADD CONSTRAINT "student_rewards_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_rewards" ADD CONSTRAINT "student_rewards_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_students" ADD CONSTRAINT "quest_students_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_students" ADD CONSTRAINT "quest_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_childId_fkey" FOREIGN KEY ("childId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
