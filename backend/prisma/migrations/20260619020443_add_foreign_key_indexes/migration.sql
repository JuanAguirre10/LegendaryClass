-- CreateIndex
CREATE INDEX "behaviors_classroomId_idx" ON "behaviors"("classroomId");

-- CreateIndex
CREATE INDEX "behaviors_createdById_idx" ON "behaviors"("createdById");

-- CreateIndex
CREATE INDEX "classrooms_teacherId_idx" ON "classrooms"("teacherId");

-- CreateIndex
CREATE INDEX "experience_logs_userId_idx" ON "experience_logs"("userId");

-- CreateIndex
CREATE INDEX "experience_logs_classroomId_idx" ON "experience_logs"("classroomId");

-- CreateIndex
CREATE INDEX "quests_classroomId_idx" ON "quests"("classroomId");

-- CreateIndex
CREATE INDEX "quests_teacherId_idx" ON "quests"("teacherId");

-- CreateIndex
CREATE INDEX "rewards_classroomId_idx" ON "rewards"("classroomId");

-- CreateIndex
CREATE INDEX "rewards_createdById_idx" ON "rewards"("createdById");

-- CreateIndex
CREATE INDEX "student_behaviors_studentId_idx" ON "student_behaviors"("studentId");

-- CreateIndex
CREATE INDEX "student_behaviors_behaviorId_idx" ON "student_behaviors"("behaviorId");

-- CreateIndex
CREATE INDEX "student_behaviors_classroomId_idx" ON "student_behaviors"("classroomId");

-- CreateIndex
CREATE INDEX "student_behaviors_awardedById_idx" ON "student_behaviors"("awardedById");

-- CreateIndex
CREATE INDEX "student_rewards_studentId_idx" ON "student_rewards"("studentId");

-- CreateIndex
CREATE INDEX "student_rewards_rewardId_idx" ON "student_rewards"("rewardId");

-- CreateIndex
CREATE INDEX "student_rewards_approvedById_idx" ON "student_rewards"("approvedById");
