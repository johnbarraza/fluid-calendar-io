-- CreateTable
CREATE TABLE "RoutineCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "totalTasks" INTEGER NOT NULL,
    "totalDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "currentTaskIndex" INTEGER NOT NULL DEFAULT 0,
    "currentTaskStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineCompletion_userId_idx" ON "RoutineCompletion"("userId");

-- CreateIndex
CREATE INDEX "RoutineCompletion_routineId_idx" ON "RoutineCompletion"("routineId");

-- CreateIndex
CREATE INDEX "RoutineCompletion_startedAt_idx" ON "RoutineCompletion"("startedAt");

-- CreateIndex
CREATE INDEX "RoutineCompletion_status_idx" ON "RoutineCompletion"("status");

-- AddForeignKey
ALTER TABLE "RoutineCompletion" ADD CONSTRAINT "RoutineCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineCompletion" ADD CONSTRAINT "RoutineCompletion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
