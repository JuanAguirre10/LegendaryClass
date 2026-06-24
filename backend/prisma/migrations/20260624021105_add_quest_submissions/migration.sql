-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'quest_submission';
ALTER TYPE "NotificationType" ADD VALUE 'quest_approved';
ALTER TYPE "NotificationType" ADD VALUE 'quest_rejected';

-- AlterTable
ALTER TABLE "quests" ADD COLUMN "requiresSubmission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1;

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "quest_submissions" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "attemptNumber" INTEGER NOT NULL,
    "teacherNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "quest_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quest_submissions_questId_studentId_attemptNumber_key" ON "quest_submissions"("questId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "quest_submissions_questId_idx" ON "quest_submissions"("questId");

-- CreateIndex
CREATE INDEX "quest_submissions_studentId_idx" ON "quest_submissions"("studentId");

-- AddForeignKey
ALTER TABLE "quest_submissions" ADD CONSTRAINT "quest_submissions_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_submissions" ADD CONSTRAINT "quest_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
