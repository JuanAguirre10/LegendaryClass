-- AddColumn xpClaimed to quest_students
ALTER TABLE "quest_students" ADD COLUMN "xpClaimed" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn xpClaimed + xpAmount to student_behaviors
ALTER TABLE "student_behaviors" ADD COLUMN "xpClaimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "student_behaviors" ADD COLUMN "xpAmount" INTEGER NOT NULL DEFAULT 0;

-- AddColumn xpClaimed to achievements
ALTER TABLE "achievements" ADD COLUMN "xpClaimed" BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing completed quests as already claimed (XP was already awarded)
UPDATE "quest_students" SET "xpClaimed" = true WHERE "isCompleted" = true;

-- Mark all existing positive behaviors as already claimed
UPDATE "student_behaviors" SET "xpClaimed" = true WHERE "pointsAwarded" > 0;

-- Mark all existing completed achievements as already claimed
UPDATE "achievements" SET "xpClaimed" = true WHERE "isCompleted" = true;

-- AddColumn online-form fields to quests
ALTER TABLE "quests" ADD COLUMN "questions" JSONB;
ALTER TABLE "quests" ADD COLUMN "passingScore" INTEGER NOT NULL DEFAULT 60;

-- AddColumn answers/score to quest_submissions; file fields become optional
-- (online submissions have no file)
ALTER TABLE "quest_submissions" ADD COLUMN "answers" JSONB;
ALTER TABLE "quest_submissions" ADD COLUMN "score" INTEGER;
ALTER TABLE "quest_submissions" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "quest_submissions" ALTER COLUMN "fileName" DROP NOT NULL;
