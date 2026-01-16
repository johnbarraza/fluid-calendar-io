CREATE TYPE "public"."EventStatus" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."FitbitAchievementType" AS ENUM('STREAK_3', 'STREAK_7', 'STREAK_30', 'STREAK_100', 'WEEKLY_STEPS', 'WEEKLY_SLEEP', 'PERFECT_DAY', 'PERFECT_WEEK');--> statement-breakpoint
CREATE TYPE "public"."FitbitQuestType" AS ENUM('STEPS', 'SLEEP_HOURS', 'HEART_RATE', 'CALORIES', 'ACTIVE_MINUTES');--> statement-breakpoint
CREATE TYPE "public"."JobStatus" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."TaskPriority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."TaskStatus" AS ENUM('todo', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AutoScheduleSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workDays" text DEFAULT '[]' NOT NULL,
	"workHourStart" integer NOT NULL,
	"workHourEnd" integer NOT NULL,
	"selectedCalendars" text DEFAULT '[]' NOT NULL,
	"bufferMinutes" integer DEFAULT 15 NOT NULL,
	"highEnergyStart" integer,
	"highEnergyEnd" integer,
	"mediumEnergyStart" integer,
	"mediumEnergyEnd" integer,
	"lowEnergyStart" integer,
	"lowEnergyEnd" integer,
	"groupByProject" boolean DEFAULT false NOT NULL,
	"enforceBreaks" boolean DEFAULT true NOT NULL,
	"minBreakDuration" integer DEFAULT 10 NOT NULL,
	"maxConsecutiveHours" integer DEFAULT 3 NOT NULL,
	"enableSuggestions" boolean DEFAULT true NOT NULL,
	"autoApplySuggestions" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AutoScheduleSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "CalendarEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"feedId" text NOT NULL,
	"externalEventId" text,
	"title" text NOT NULL,
	"description" text,
	"start" timestamp NOT NULL,
	"end" timestamp NOT NULL,
	"location" text,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"recurrenceRule" text,
	"allDay" boolean DEFAULT false NOT NULL,
	"status" text,
	"sequence" integer,
	"created" timestamp,
	"lastModified" timestamp,
	"organizer" json,
	"attendees" json,
	"isMaster" boolean DEFAULT false NOT NULL,
	"masterEventId" text,
	"recurringEventId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CalendarFeed" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"accountId" text,
	"name" text NOT NULL,
	"url" text,
	"type" text NOT NULL,
	"color" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastSync" timestamp,
	"syncToken" text,
	"error" text,
	"channelId" text,
	"resourceId" text,
	"channelExpiration" timestamp,
	"caldavPath" text,
	"ctag" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CalendarSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"defaultCalendarId" text,
	"workingHoursEnabled" boolean DEFAULT true NOT NULL,
	"workingHoursStart" text DEFAULT '09:00' NOT NULL,
	"workingHoursEnd" text DEFAULT '17:00' NOT NULL,
	"workingHoursDays" text DEFAULT '[1,2,3,4,5]' NOT NULL,
	"defaultDuration" integer DEFAULT 60 NOT NULL,
	"defaultColor" text DEFAULT '#3b82f6' NOT NULL,
	"defaultReminder" integer DEFAULT 30 NOT NULL,
	"refreshInterval" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "CalendarSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "ConnectedAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" text NOT NULL,
	"email" text NOT NULL,
	"providerAccountId" text,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"expiresAt" timestamp NOT NULL,
	"scope" text,
	"tokenType" text,
	"caldavUrl" text,
	"caldavUsername" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DataSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"autoBackup" boolean DEFAULT true NOT NULL,
	"backupInterval" integer DEFAULT 7 NOT NULL,
	"retainDataFor" integer DEFAULT 365 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DataSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "Event" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"calendarFeedId" text,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"isAllDay" boolean DEFAULT false NOT NULL,
	"status" "EventStatus" DEFAULT 'confirmed',
	"color" text,
	"externalId" text,
	"externalCalendarId" text,
	"iCalUID" text,
	"recurrenceRule" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"fitbitUserId" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"scope" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "FitbitAccount_userId_unique" UNIQUE("userId"),
	CONSTRAINT "FitbitAccount_fitbitUserId_unique" UNIQUE("fitbitUserId")
);
--> statement-breakpoint
CREATE TABLE "FitbitActivity" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp NOT NULL,
	"steps" integer DEFAULT 0,
	"distance" integer DEFAULT 0,
	"floors" integer DEFAULT 0,
	"calories" integer DEFAULT 0,
	"activeMinutes" integer DEFAULT 0,
	"sedentaryMinutes" integer DEFAULT 0,
	"lightlyActiveMinutes" integer DEFAULT 0,
	"fairlyActiveMinutes" integer DEFAULT 0,
	"veryActiveMinutes" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitHeartRate" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp NOT NULL,
	"restingHeartRate" integer,
	"heartRateZones" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitSleep" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"minutesAsleep" integer NOT NULL,
	"minutesAwake" integer NOT NULL,
	"efficiency" integer,
	"timeInBed" integer,
	"sleepStages" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitUserAchievement" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"achievementType" "FitbitAchievementType" NOT NULL,
	"unlockedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitUserQuest" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp NOT NULL,
	"questType" "FitbitQuestType" NOT NULL,
	"targetValue" integer NOT NULL,
	"currentValue" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp,
	"xpEarned" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FitbitUserStats" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"totalXp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"longestStreak" integer DEFAULT 0 NOT NULL,
	"lastActiveDate" timestamp,
	"totalQuestsCompleted" integer DEFAULT 0 NOT NULL,
	"totalAchievements" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "FitbitUserStats_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "HabitLog" (
	"id" text PRIMARY KEY NOT NULL,
	"habitId" text NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"date" timestamp NOT NULL,
	"note" text,
	"mood" text
);
--> statement-breakpoint
CREATE TABLE "Habit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"category" text,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"targetDaysPerWeek" integer DEFAULT 7,
	"customSchedule" text,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"longestStreak" integer DEFAULT 0 NOT NULL,
	"totalCompletions" integer DEFAULT 0 NOT NULL,
	"reminderEnabled" boolean DEFAULT false NOT NULL,
	"reminderTime" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "IntegrationSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"googleCalendarEnabled" boolean DEFAULT true NOT NULL,
	"googleCalendarAutoSync" boolean DEFAULT true NOT NULL,
	"googleCalendarInterval" integer DEFAULT 5 NOT NULL,
	"outlookCalendarEnabled" boolean DEFAULT true NOT NULL,
	"outlookCalendarAutoSync" boolean DEFAULT true NOT NULL,
	"outlookCalendarInterval" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "IntegrationSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "JobRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"queueName" text NOT NULL,
	"jobId" text NOT NULL,
	"name" text NOT NULL,
	"data" json NOT NULL,
	"status" "JobStatus" DEFAULT 'PENDING' NOT NULL,
	"result" json,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"startedAt" timestamp,
	"finishedAt" timestamp,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "JournalEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp NOT NULL,
	"content" text NOT NULL,
	"gratitude" text,
	"wins" text,
	"challenges" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Log" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"metadata" json,
	"source" text,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MoodEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"mood" text NOT NULL,
	"energyLevel" text NOT NULL,
	"focus" integer,
	"anxiety" integer,
	"note" text,
	"tags" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NotificationSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"dailyEmailEnabled" boolean DEFAULT true NOT NULL,
	"eventInvites" boolean DEFAULT true NOT NULL,
	"eventUpdates" boolean DEFAULT true NOT NULL,
	"eventCancellations" boolean DEFAULT true NOT NULL,
	"eventReminders" boolean DEFAULT true NOT NULL,
	"defaultReminderTiming" text DEFAULT '[30]' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "NotificationSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "PasswordReset" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "PasswordReset_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "PomodoroSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"taskId" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"workDuration" integer DEFAULT 25 NOT NULL,
	"breakDuration" integer DEFAULT 5 NOT NULL,
	"type" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"interrupted" boolean DEFAULT false NOT NULL,
	"interruptReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"status" text DEFAULT 'active' NOT NULL,
	"externalId" text,
	"externalSource" text,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RoutineCompletion" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"routineId" text NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"completedTasks" integer DEFAULT 0 NOT NULL,
	"totalTasks" integer NOT NULL,
	"totalDuration" integer NOT NULL,
	"actualDuration" integer,
	"currentTaskIndex" integer DEFAULT 0 NOT NULL,
	"currentTaskStatus" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RoutineTask" (
	"id" text PRIMARY KEY NOT NULL,
	"routineId" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"duration" integer NOT NULL,
	"order" integer NOT NULL,
	"autoContinue" boolean DEFAULT true NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Routine" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text,
	"startTime" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScheduleSuggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"taskId" text NOT NULL,
	"suggestionType" text NOT NULL,
	"reason" text NOT NULL,
	"confidence" integer NOT NULL,
	"currentStart" timestamp,
	"currentEnd" timestamp,
	"suggestedStart" timestamp,
	"suggestedEnd" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"respondedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "Session_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "SystemSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"googleClientId" text,
	"googleClientSecret" text,
	"outlookClientId" text,
	"outlookClientSecret" text,
	"outlookTenantId" text,
	"logLevel" text DEFAULT 'none' NOT NULL,
	"logRetention" json,
	"logDestination" text DEFAULT 'db' NOT NULL,
	"publicSignup" boolean DEFAULT false NOT NULL,
	"disableHomepage" boolean DEFAULT false NOT NULL,
	"resendApiKey" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tag" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskChange" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text,
	"providerId" text,
	"mappingId" text,
	"changeType" text NOT NULL,
	"changeData" json,
	"synced" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskListMapping" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"projectId" text NOT NULL,
	"externalListId" text NOT NULL,
	"externalListName" text NOT NULL,
	"direction" text DEFAULT 'incoming' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"syncEnabled" boolean DEFAULT true NOT NULL,
	"isAutoScheduled" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp,
	"syncStatus" text,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskProvider" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"syncEnabled" boolean DEFAULT true NOT NULL,
	"syncInterval" text DEFAULT 'hourly' NOT NULL,
	"lastSyncedAt" timestamp,
	"accessToken" text,
	"refreshToken" text,
	"expiresAt" timestamp,
	"accountId" text,
	"defaultProjectId" text,
	"settings" json,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskTag" (
	"taskId" text NOT NULL,
	"tagId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"projectId" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text,
	"dueDate" timestamp,
	"startDate" timestamp,
	"duration" integer,
	"energyLevel" text,
	"preferredTime" text,
	"isAutoScheduled" boolean DEFAULT false NOT NULL,
	"scheduleLocked" boolean DEFAULT false NOT NULL,
	"scheduledStart" timestamp,
	"scheduledEnd" timestamp,
	"scheduleScore" integer,
	"lastScheduled" timestamp,
	"postponedUntil" timestamp,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"recurrenceRule" text,
	"lastCompletedDate" timestamp,
	"completedAt" timestamp,
	"externalTaskId" text,
	"source" text,
	"lastSyncedAt" timestamp,
	"externalListId" text,
	"externalCreatedAt" timestamp,
	"externalUpdatedAt" timestamp,
	"syncStatus" text,
	"syncError" text,
	"syncHash" text,
	"skipSync" boolean DEFAULT false NOT NULL,
	"emoji" text,
	"estimatedPomodoros" integer,
	"actualPomodoros" integer DEFAULT 0 NOT NULL,
	"isBreakTask" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"defaultView" text DEFAULT 'week' NOT NULL,
	"timeZone" text NOT NULL,
	"weekStartDay" text DEFAULT 'sunday' NOT NULL,
	"timeFormat" text DEFAULT '12h' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AutoScheduleSettings" ADD CONSTRAINT "AutoScheduleSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_feedId_CalendarFeed_id_fk" FOREIGN KEY ("feedId") REFERENCES "public"."CalendarFeed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_accountId_ConnectedAccount_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."ConnectedAccount"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CalendarSettings" ADD CONSTRAINT "CalendarSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DataSettings" ADD CONSTRAINT "DataSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Event" ADD CONSTRAINT "Event_calendarFeedId_CalendarFeed_id_fk" FOREIGN KEY ("calendarFeedId") REFERENCES "public"."CalendarFeed"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitAccount" ADD CONSTRAINT "FitbitAccount_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitActivity" ADD CONSTRAINT "FitbitActivity_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitHeartRate" ADD CONSTRAINT "FitbitHeartRate_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitSleep" ADD CONSTRAINT "FitbitSleep_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitUserAchievement" ADD CONSTRAINT "FitbitUserAchievement_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitUserQuest" ADD CONSTRAINT "FitbitUserQuest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FitbitUserStats" ADD CONSTRAINT "FitbitUserStats_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_Habit_id_fk" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IntegrationSettings" ADD CONSTRAINT "IntegrationSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MoodEntry" ADD CONSTRAINT "MoodEntry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RoutineCompletion" ADD CONSTRAINT "RoutineCompletion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RoutineCompletion" ADD CONSTRAINT "RoutineCompletion_routineId_Routine_id_fk" FOREIGN KEY ("routineId") REFERENCES "public"."Routine"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RoutineTask" ADD CONSTRAINT "RoutineTask_routineId_Routine_id_fk" FOREIGN KEY ("routineId") REFERENCES "public"."Routine"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScheduleSuggestion" ADD CONSTRAINT "ScheduleSuggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScheduleSuggestion" ADD CONSTRAINT "ScheduleSuggestion_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_providerId_TaskProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."TaskProvider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_mappingId_TaskListMapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."TaskListMapping"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskListMapping" ADD CONSTRAINT "TaskListMapping_providerId_TaskProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."TaskProvider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskListMapping" ADD CONSTRAINT "TaskListMapping_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskProvider" ADD CONSTRAINT "TaskProvider_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_Tag_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;