/**
 * Type definitions for Drizzle ORM models
 * These types are inferred from the schema and replace Prisma types
 */

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

// ============================================================================
// AUTHENTICATION & USER TYPES
// ============================================================================

export type User = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;

export type Account = InferSelectModel<typeof schema.accounts>;
export type AccountInsert = InferInsertModel<typeof schema.accounts>;

export type Session = InferSelectModel<typeof schema.sessions>;
export type SessionInsert = InferInsertModel<typeof schema.sessions>;

export type VerificationToken = InferSelectModel<typeof schema.verificationTokens>;
export type VerificationTokenInsert = InferInsertModel<typeof schema.verificationTokens>;

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export type CalendarFeed = InferSelectModel<typeof schema.calendarFeeds>;
export type CalendarFeedInsert = InferInsertModel<typeof schema.calendarFeeds>;

export type Event = InferSelectModel<typeof schema.events>;
export type EventInsert = InferInsertModel<typeof schema.events>;

export type CalendarEvent = InferSelectModel<typeof schema.calendarEvents>;
export type CalendarEventInsert = InferInsertModel<typeof schema.calendarEvents>;

// ============================================================================
// TASK TYPES
// ============================================================================

export type Project = InferSelectModel<typeof schema.projects>;
export type ProjectInsert = InferInsertModel<typeof schema.projects>;

export type Task = InferSelectModel<typeof schema.tasks>;
export type TaskInsert = InferInsertModel<typeof schema.tasks>;

export type Tag = InferSelectModel<typeof schema.tags>;
export type TagInsert = InferInsertModel<typeof schema.tags>;

export type TaskTag = InferSelectModel<typeof schema.taskTags>;
export type TaskTagInsert = InferInsertModel<typeof schema.taskTags>;

// ============================================================================
// CONNECTED ACCOUNTS TYPES
// ============================================================================

export type ConnectedAccount = InferSelectModel<typeof schema.connectedAccounts>;
export type ConnectedAccountInsert = InferInsertModel<typeof schema.connectedAccounts>;

export type FitbitAccount = InferSelectModel<typeof schema.fitbitAccounts>;
export type FitbitAccountInsert = InferInsertModel<typeof schema.fitbitAccounts>;

// ============================================================================
// FITBIT DATA TYPES
// ============================================================================

export type FitbitActivity = InferSelectModel<typeof schema.fitbitActivities>;
export type FitbitActivityInsert = InferInsertModel<typeof schema.fitbitActivities>;

export type FitbitSleep = InferSelectModel<typeof schema.fitbitSleep>;
export type FitbitSleepInsert = InferInsertModel<typeof schema.fitbitSleep>;

export type FitbitHeartRate = InferSelectModel<typeof schema.fitbitHeartRate>;
export type FitbitHeartRateInsert = InferInsertModel<typeof schema.fitbitHeartRate>;

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export type AutoScheduleSettings = InferSelectModel<typeof schema.autoScheduleSettings>;
export type AutoScheduleSettingsInsert = InferInsertModel<typeof schema.autoScheduleSettings>;

export type UserSettings = InferSelectModel<typeof schema.userSettings>;
export type UserSettingsInsert = InferInsertModel<typeof schema.userSettings>;

export type CalendarSettings = InferSelectModel<typeof schema.calendarSettings>;
export type CalendarSettingsInsert = InferInsertModel<typeof schema.calendarSettings>;

export type NotificationSettings = InferSelectModel<typeof schema.notificationSettings>;
export type NotificationSettingsInsert = InferInsertModel<typeof schema.notificationSettings>;

export type IntegrationSettings = InferSelectModel<typeof schema.integrationSettings>;
export type IntegrationSettingsInsert = InferInsertModel<typeof schema.integrationSettings>;

export type DataSettings = InferSelectModel<typeof schema.dataSettings>;
export type DataSettingsInsert = InferInsertModel<typeof schema.dataSettings>;

export type SystemSettings = InferSelectModel<typeof schema.systemSettings>;
export type SystemSettingsInsert = InferInsertModel<typeof schema.systemSettings>;

// ============================================================================
// LOGGING & MONITORING TYPES
// ============================================================================

export type Log = InferSelectModel<typeof schema.logs>;
export type LogInsert = InferInsertModel<typeof schema.logs>;

// ============================================================================
// TASK SYNC & PROVIDERS TYPES
// ============================================================================

export type TaskProvider = InferSelectModel<typeof schema.taskProviders>;
export type TaskProviderInsert = InferInsertModel<typeof schema.taskProviders>;

export type TaskListMapping = InferSelectModel<typeof schema.taskListMappings>;
export type TaskListMappingInsert = InferInsertModel<typeof schema.taskListMappings>;

export type TaskChange = InferSelectModel<typeof schema.taskChanges>;
export type TaskChangeInsert = InferInsertModel<typeof schema.taskChanges>;

// ============================================================================
// ADHD FEATURES TYPES
// ============================================================================

export type Habit = InferSelectModel<typeof schema.habits>;
export type HabitInsert = InferInsertModel<typeof schema.habits>;

export type HabitLog = InferSelectModel<typeof schema.habitLogs>;
export type HabitLogInsert = InferInsertModel<typeof schema.habitLogs>;

export type MoodEntry = InferSelectModel<typeof schema.moodEntries>;
export type MoodEntryInsert = InferInsertModel<typeof schema.moodEntries>;

export type PomodoroSession = InferSelectModel<typeof schema.pomodoroSessions>;
export type PomodoroSessionInsert = InferInsertModel<typeof schema.pomodoroSessions>;

export type Routine = InferSelectModel<typeof schema.routines>;
export type RoutineInsert = InferInsertModel<typeof schema.routines>;

export type RoutineTask = InferSelectModel<typeof schema.routineTasks>;
export type RoutineTaskInsert = InferInsertModel<typeof schema.routineTasks>;

export type RoutineCompletion = InferSelectModel<typeof schema.routineCompletions>;
export type RoutineCompletionInsert = InferInsertModel<typeof schema.routineCompletions>;

export type ScheduleSuggestion = InferSelectModel<typeof schema.scheduleSuggestions>;
export type ScheduleSuggestionInsert = InferInsertModel<typeof schema.scheduleSuggestions>;

export type JournalEntry = InferSelectModel<typeof schema.journalEntries>;
export type JournalEntryInsert = InferInsertModel<typeof schema.journalEntries>;

// ============================================================================
// AUTH & PASSWORD RESET TYPES
// ============================================================================

export type PasswordReset = InferSelectModel<typeof schema.passwordResets>;
export type PasswordResetInsert = InferInsertModel<typeof schema.passwordResets>;

// ============================================================================
// JOB TRACKING TYPES
// ============================================================================

export type JobRecord = InferSelectModel<typeof schema.jobRecords>;
export type JobRecordInsert = InferInsertModel<typeof schema.jobRecords>;

// ============================================================================
// RELATION TYPES (for queries with relations)
// ============================================================================

// Habit with logs relation
export type HabitWithLogs = Habit & {
  logs: HabitLog[];
};

// Routine with tasks relation
export type RoutineWithTasks = Routine & {
  tasks: RoutineTask[];
};

// Task with project relation
export type TaskWithProject = Task & {
  project: Project | null;
};

// Task with tags relation
export type TaskWithTags = Task & {
  tags: TaskTag[];
};

// CalendarEvent with feed relation
export type CalendarEventWithFeed = CalendarEvent & {
  feed: CalendarFeed;
};

