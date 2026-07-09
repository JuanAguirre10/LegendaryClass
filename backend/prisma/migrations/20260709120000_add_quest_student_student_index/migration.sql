-- CreateIndex: xp-inbox and claim queries filter quest_students by studentId,
-- but the only existing index leads with questId
CREATE INDEX "quest_students_studentId_idx" ON "quest_students"("studentId");
