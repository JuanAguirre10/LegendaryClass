-- AlterTable: remove unused experiencePoints column from student_points
ALTER TABLE "student_points" DROP COLUMN IF EXISTS "experiencePoints";
