-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('mathematics', 'sciences', 'language', 'social', 'arts', 'other');

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN     "courseId" TEXT;

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "category" "CourseCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
