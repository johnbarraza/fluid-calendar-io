-- CreateTable for FitbitAccount
CREATE TABLE "FitbitAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fitbitUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitbitAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable for FitbitActivity
CREATE TABLE "FitbitActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "distance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,
    "floors" INTEGER,
    "elevation" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitbitActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable for FitbitSleep
CREATE TABLE "FitbitSleep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "efficiency" INTEGER,
    "minutesAsleep" INTEGER NOT NULL,
    "minutesAwake" INTEGER NOT NULL,
    "timeInBed" INTEGER NOT NULL,
    "deepSleep" INTEGER,
    "lightSleep" INTEGER,
    "remSleep" INTEGER,
    "awakeSleep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitbitSleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable for FitbitHeartRate
CREATE TABLE "FitbitHeartRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "restingHeartRate" INTEGER,
    "averageHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "minHeartRate" INTEGER,
    "zones" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitbitHeartRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FitbitAccount_userId_key" ON "FitbitAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitAccount_fitbitUserId_key" ON "FitbitAccount"("fitbitUserId");

-- CreateIndex
CREATE INDEX "FitbitAccount_userId_idx" ON "FitbitAccount"("userId");

-- CreateIndex
CREATE INDEX "FitbitActivity_userId_idx" ON "FitbitActivity"("userId");

-- CreateIndex
CREATE INDEX "FitbitActivity_date_idx" ON "FitbitActivity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitActivity_userId_date_key" ON "FitbitActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "FitbitSleep_userId_idx" ON "FitbitSleep"("userId");

-- CreateIndex
CREATE INDEX "FitbitSleep_date_idx" ON "FitbitSleep"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitSleep_userId_date_key" ON "FitbitSleep"("userId", "date");

-- CreateIndex
CREATE INDEX "FitbitHeartRate_userId_idx" ON "FitbitHeartRate"("userId");

-- CreateIndex
CREATE INDEX "FitbitHeartRate_date_idx" ON "FitbitHeartRate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitHeartRate_userId_date_key" ON "FitbitHeartRate"("userId", "date");

-- AddForeignKey
ALTER TABLE "FitbitAccount" ADD CONSTRAINT "FitbitAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitbitActivity" ADD CONSTRAINT "FitbitActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitbitSleep" ADD CONSTRAINT "FitbitSleep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitbitHeartRate" ADD CONSTRAINT "FitbitHeartRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
