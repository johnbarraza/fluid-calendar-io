/**
 * Drizzle ORM Schema
 * Migration from Prisma to Drizzle for better Windows compatibility
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  json,
  uuid,
  real,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN"]);
export const taskStatusEnum = pgEnum("TaskStatus", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);
export const taskPriorityEnum = pgEnum("TaskPriority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const eventStatusEnum = pgEnum("EventStatus", [
  "confirmed",
  "tentative",
  "cancelled",
]);

// ============================================================================
// AUTHENTICATION & USER MODELS
// ============================================================================

export const users = pgTable("User", {
  id: text("id").primaryKey().notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: userRoleEnum("role").default("USER").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("Account", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const sessions = pgTable("Session", {
  id: text("id").primaryKey().notNull(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("VerificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ============================================================================
// CALENDAR MODELS
// ============================================================================

export const calendarFeeds = pgTable("CalendarFeed", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  accountId: text("accountId").references(() => connectedAccounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  url: text("url"),
  type: text("type").notNull(), // 'LOCAL', 'GOOGLE', 'OUTLOOK', 'CALDAV'
  color: text("color"),
  enabled: boolean("enabled").default(true).notNull(),
  lastSync: timestamp("lastSync", { mode: "date" }),
  syncToken: text("syncToken"),
  error: text("error"),
  channelId: text("channelId"),
  resourceId: text("resourceId"),
  channelExpiration: timestamp("channelExpiration", { mode: "date" }),
  caldavPath: text("caldavPath"),
  ctag: text("ctag"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const events = pgTable("Event", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  calendarFeedId: text("calendarFeedId").references(() => calendarFeeds.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("startTime", { mode: "date" }).notNull(),
  endTime: timestamp("endTime", { mode: "date" }).notNull(),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  status: eventStatusEnum("status").default("confirmed"),
  color: text("color"),
  externalId: text("externalId"),
  externalCalendarId: text("externalCalendarId"),
  iCalUID: text("iCalUID"),
  recurrenceRule: text("recurrenceRule"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// TASK MODELS
// ============================================================================

export const projects = pgTable("Project", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  status: text("status").default("active").notNull(),
  externalId: text("externalId"),
  externalSource: text("externalSource"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const tasks = pgTable("Task", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull(),
  priority: text("priority"),

  // Time Management
  dueDate: timestamp("dueDate", { mode: "date" }),
  startDate: timestamp("startDate", { mode: "date" }),
  duration: integer("duration"),
  energyLevel: text("energyLevel"),
  preferredTime: text("preferredTime"),

  // Auto-scheduling
  isAutoScheduled: boolean("isAutoScheduled").default(false).notNull(),
  scheduleLocked: boolean("scheduleLocked").default(false).notNull(),
  scheduledStart: timestamp("scheduledStart", { mode: "date" }),
  scheduledEnd: timestamp("scheduledEnd", { mode: "date" }),
  scheduleScore: integer("scheduleScore"),
  lastScheduled: timestamp("lastScheduled", { mode: "date" }),
  postponedUntil: timestamp("postponedUntil", { mode: "date" }),

  // Recurrence
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurrenceRule: text("recurrenceRule"),
  lastCompletedDate: timestamp("lastCompletedDate", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),

  // External sync
  externalTaskId: text("externalTaskId"),
  source: text("source"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  externalListId: text("externalListId"),
  externalCreatedAt: timestamp("externalCreatedAt", { mode: "date" }),
  externalUpdatedAt: timestamp("externalUpdatedAt", { mode: "date" }),
  syncStatus: text("syncStatus"),
  syncError: text("syncError"),
  syncHash: text("syncHash"),
  skipSync: boolean("skipSync").default(false).notNull(),

  // ADHD features
  emoji: text("emoji"),
  estimatedPomodoros: integer("estimatedPomodoros"),
  actualPomodoros: integer("actualPomodoros").default(0).notNull(),
  isBreakTask: boolean("isBreakTask").default(false).notNull(),

  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const tags = pgTable("Tag", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6B7280"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const taskTags = pgTable("TaskTag", {
  taskId: text("taskId")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: text("tagId")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ============================================================================
// CONNECTED ACCOUNTS (Google, Fitbit, etc.)
// ============================================================================

export const connectedAccounts = pgTable("ConnectedAccount", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'GOOGLE', 'OUTLOOK', 'CALDAV'
  email: text("email").notNull(),
  providerAccountId: text("providerAccountId"),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  scope: text("scope"),
  tokenType: text("tokenType"),
  caldavUrl: text("caldavUrl"),
  caldavUsername: text("caldavUsername"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const fitbitAccounts = pgTable("FitbitAccount", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fitbitUserId: text("fitbitUserId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// FITBIT DATA MODELS
// ============================================================================

export const fitbitActivities = pgTable("FitbitActivity", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  steps: integer("steps").default(0),
  distance: integer("distance").default(0), // in meters
  floors: integer("floors").default(0),
  calories: integer("calories").default(0),
  activeMinutes: integer("activeMinutes").default(0),
  sedentaryMinutes: integer("sedentaryMinutes").default(0),
  lightlyActiveMinutes: integer("lightlyActiveMinutes").default(0),
  fairlyActiveMinutes: integer("fairlyActiveMinutes").default(0),
  veryActiveMinutes: integer("veryActiveMinutes").default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const fitbitSleep = pgTable("FitbitSleep", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  startTime: timestamp("startTime", { mode: "date" }).notNull(),
  endTime: timestamp("endTime", { mode: "date" }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  minutesAsleep: integer("minutesAsleep").notNull(),
  minutesAwake: integer("minutesAwake").notNull(),
  efficiency: integer("efficiency"), // percentage
  timeInBed: integer("timeInBed"), // in minutes
  sleepStages: json("sleepStages"), // deep, light, rem, wake
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const fitbitHeartRate = pgTable("FitbitHeartRate", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  restingHeartRate: integer("restingHeartRate"),
  heartRateZones: json("heartRateZones"), // out of range, fat burn, cardio, peak
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const fitbitHRV = pgTable("FitbitHRV", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  dailyRmssd: real("dailyRmssd"), // Daily heart rate variability (Root Mean Square of Successive Differences)
  deepRmssd: real("deepRmssd"), // HRV during deep sleep
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// FITBIT GAMIFICATION - QUESTS, ACHIEVEMENTS, STATS
// ============================================================================

// Quest types: STEPS, SLEEP, HEART_RATE, CALORIES, ACTIVE_MINUTES
export const fitbitQuestTypeEnum = pgEnum("FitbitQuestType", [
  "STEPS",
  "SLEEP_HOURS",
  "HEART_RATE",
  "CALORIES",
  "ACTIVE_MINUTES",
]);

export const fitbitUserQuests = pgTable("FitbitUserQuest", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  questType: fitbitQuestTypeEnum("questType").notNull(),
  targetValue: integer("targetValue").notNull(),
  currentValue: integer("currentValue").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  xpEarned: integer("xpEarned").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// Achievement types
export const fitbitAchievementTypeEnum = pgEnum("FitbitAchievementType", [
  "STREAK_3",      // 3 day streak
  "STREAK_7",      // 7 day streak
  "STREAK_30",     // 30 day streak
  "STREAK_100",    // 100 day streak
  "WEEKLY_STEPS",  // 100k steps in a week
  "WEEKLY_SLEEP",  // 8h avg sleep for a week
  "PERFECT_DAY",   // All quests completed in a day
  "PERFECT_WEEK",  // All quests completed for 7 days
]);

export const fitbitUserAchievements = pgTable("FitbitUserAchievement", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  achievementType: fitbitAchievementTypeEnum("achievementType").notNull(),
  unlockedAt: timestamp("unlockedAt", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const fitbitUserStats = pgTable("FitbitUserStats", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  totalXp: integer("totalXp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentStreak: integer("currentStreak").default(0).notNull(),
  longestStreak: integer("longestStreak").default(0).notNull(),
  lastActiveDate: timestamp("lastActiveDate", { mode: "date" }),
  totalQuestsCompleted: integer("totalQuestsCompleted").default(0).notNull(),
  totalAchievements: integer("totalAchievements").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// CALENDAR EVENTS (Extended from basic events model)
// ============================================================================

export const calendarEvents = pgTable("CalendarEvent", {
  id: text("id").primaryKey().notNull(),
  feedId: text("feedId")
    .notNull()
    .references(() => calendarFeeds.id, { onDelete: "cascade" }),
  externalEventId: text("externalEventId"),
  title: text("title").notNull(),
  description: text("description"),
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  location: text("location"),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurrenceRule: text("recurrenceRule"),
  allDay: boolean("allDay").default(false).notNull(),
  status: text("status"),
  sequence: integer("sequence"),
  created: timestamp("created", { mode: "date" }),
  lastModified: timestamp("lastModified", { mode: "date" }),
  organizer: json("organizer"),
  attendees: json("attendees"),
  isMaster: boolean("isMaster").default(false).notNull(),
  masterEventId: text("masterEventId"),
  recurringEventId: text("recurringEventId"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// SETTINGS MODELS
// ============================================================================

export const autoScheduleSettings = pgTable("AutoScheduleSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  workDays: text("workDays").default("[]").notNull(),
  workHourStart: integer("workHourStart").notNull(),
  workHourEnd: integer("workHourEnd").notNull(),
  selectedCalendars: text("selectedCalendars").default("[]").notNull(),
  bufferMinutes: integer("bufferMinutes").default(15).notNull(),
  highEnergyStart: integer("highEnergyStart"),
  highEnergyEnd: integer("highEnergyEnd"),
  mediumEnergyStart: integer("mediumEnergyStart"),
  mediumEnergyEnd: integer("mediumEnergyEnd"),
  lowEnergyStart: integer("lowEnergyStart"),
  lowEnergyEnd: integer("lowEnergyEnd"),
  groupByProject: boolean("groupByProject").default(false).notNull(),
  enforceBreaks: boolean("enforceBreaks").default(true).notNull(),
  minBreakDuration: integer("minBreakDuration").default(10).notNull(),
  maxConsecutiveHours: integer("maxConsecutiveHours").default(3).notNull(),
  enableSuggestions: boolean("enableSuggestions").default(true).notNull(),
  autoApplySuggestions: boolean("autoApplySuggestions").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const userSettings = pgTable("UserSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").default("system").notNull(),
  defaultView: text("defaultView").default("week").notNull(),
  timeZone: text("timeZone").notNull(),
  weekStartDay: text("weekStartDay").default("sunday").notNull(),
  timeFormat: text("timeFormat").default("12h").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const calendarSettings = pgTable("CalendarSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultCalendarId: text("defaultCalendarId"),
  workingHoursEnabled: boolean("workingHoursEnabled").default(true).notNull(),
  workingHoursStart: text("workingHoursStart").default("09:00").notNull(),
  workingHoursEnd: text("workingHoursEnd").default("17:00").notNull(),
  workingHoursDays: text("workingHoursDays").default("[1,2,3,4,5]").notNull(),
  defaultDuration: integer("defaultDuration").default(60).notNull(),
  defaultColor: text("defaultColor").default("#3b82f6").notNull(),
  defaultReminder: integer("defaultReminder").default(30).notNull(),
  refreshInterval: integer("refreshInterval").default(5).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const notificationSettings = pgTable("NotificationSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  dailyEmailEnabled: boolean("dailyEmailEnabled").default(true).notNull(),
  eventInvites: boolean("eventInvites").default(true).notNull(),
  eventUpdates: boolean("eventUpdates").default(true).notNull(),
  eventCancellations: boolean("eventCancellations").default(true).notNull(),
  eventReminders: boolean("eventReminders").default(true).notNull(),
  defaultReminderTiming: text("defaultReminderTiming").default("[30]").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const integrationSettings = pgTable("IntegrationSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  googleCalendarEnabled: boolean("googleCalendarEnabled").default(true).notNull(),
  googleCalendarAutoSync: boolean("googleCalendarAutoSync").default(true).notNull(),
  googleCalendarInterval: integer("googleCalendarInterval").default(5).notNull(),
  outlookCalendarEnabled: boolean("outlookCalendarEnabled").default(true).notNull(),
  outlookCalendarAutoSync: boolean("outlookCalendarAutoSync").default(true).notNull(),
  outlookCalendarInterval: integer("outlookCalendarInterval").default(5).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const dataSettings = pgTable("DataSettings", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  autoBackup: boolean("autoBackup").default(true).notNull(),
  backupInterval: integer("backupInterval").default(7).notNull(),
  retainDataFor: integer("retainDataFor").default(365).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const systemSettings = pgTable("SystemSettings", {
  id: text("id").primaryKey().notNull(),
  googleClientId: text("googleClientId"),
  googleClientSecret: text("googleClientSecret"),
  outlookClientId: text("outlookClientId"),
  outlookClientSecret: text("outlookClientSecret"),
  outlookTenantId: text("outlookTenantId"),
  logLevel: text("logLevel").default("none").notNull(),
  logRetention: json("logRetention"),
  logDestination: text("logDestination").default("db").notNull(),
  publicSignup: boolean("publicSignup").default(false).notNull(),
  disableHomepage: boolean("disableHomepage").default(false).notNull(),
  resendApiKey: text("resendApiKey"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

export const logs = pgTable("Log", {
  id: text("id").primaryKey().notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  source: text("source"),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
});

// ============================================================================
// TASK SYNC & PROVIDERS
// ============================================================================

export const taskProviders = pgTable("TaskProvider", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  syncEnabled: boolean("syncEnabled").default(true).notNull(),
  syncInterval: text("syncInterval").default("hourly").notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  accountId: text("accountId"),
  defaultProjectId: text("defaultProjectId"),
  settings: json("settings"),
  error: text("error"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const taskListMappings = pgTable("TaskListMapping", {
  id: text("id").primaryKey().notNull(),
  providerId: text("providerId")
    .notNull()
    .references(() => taskProviders.id, { onDelete: "cascade" }),
  projectId: text("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  externalListId: text("externalListId").notNull(),
  externalListName: text("externalListName").notNull(),
  direction: text("direction").default("incoming").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  syncEnabled: boolean("syncEnabled").default(true).notNull(),
  isAutoScheduled: boolean("isAutoScheduled").default(true).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  syncStatus: text("syncStatus"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const taskChanges = pgTable("TaskChange", {
  id: text("id").primaryKey().notNull(),
  taskId: text("taskId").references(() => tasks.id, { onDelete: "set null" }),
  providerId: text("providerId").references(() => taskProviders.id, { onDelete: "set null" }),
  mappingId: text("mappingId").references(() => taskListMappings.id, { onDelete: "set null" }),
  changeType: text("changeType").notNull(),
  changeData: json("changeData"),
  synced: boolean("synced").default(false).notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// ADHD FEATURES
// ============================================================================

export const habits = pgTable("Habit", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  category: text("category"),
  frequency: text("frequency").default("daily").notNull(),
  targetDaysPerWeek: integer("targetDaysPerWeek").default(7),
  customSchedule: text("customSchedule"),
  currentStreak: integer("currentStreak").default(0).notNull(),
  longestStreak: integer("longestStreak").default(0).notNull(),
  totalCompletions: integer("totalCompletions").default(0).notNull(),
  reminderEnabled: boolean("reminderEnabled").default(false).notNull(),
  reminderTime: text("reminderTime"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const habitLogs = pgTable("HabitLog", {
  id: text("id").primaryKey().notNull(),
  habitId: text("habitId")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  completedAt: timestamp("completedAt", { mode: "date" }).defaultNow().notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  note: text("note"),
  mood: text("mood"),
});

export const moodEntries = pgTable("MoodEntry", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  mood: text("mood").notNull(),
  energyLevel: text("energyLevel").notNull(),
  focus: integer("focus"),
  anxiety: integer("anxiety"),
  note: text("note"),
  tags: text("tags"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const pomodoroSessions = pgTable("PomodoroSession", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text("taskId").references(() => tasks.id, { onDelete: "set null" }),
  startedAt: timestamp("startedAt", { mode: "date" }).defaultNow().notNull(),
  endedAt: timestamp("endedAt", { mode: "date" }),
  workDuration: integer("workDuration").default(25).notNull(),
  breakDuration: integer("breakDuration").default(5).notNull(),
  type: text("type").notNull(),
  completed: boolean("completed").default(false).notNull(),
  interrupted: boolean("interrupted").default(false).notNull(),
  interruptReason: text("interruptReason"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const routines = pgTable("Routine", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  category: text("category"),
  startTime: text("startTime").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const routineTasks = pgTable("RoutineTask", {
  id: text("id").primaryKey().notNull(),
  routineId: text("routineId")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
  autoContinue: boolean("autoContinue").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const routineCompletions = pgTable("RoutineCompletion", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  routineId: text("routineId")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  startedAt: timestamp("startedAt", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  status: text("status").default("in_progress").notNull(),
  completedTasks: integer("completedTasks").default(0).notNull(),
  totalTasks: integer("totalTasks").notNull(),
  totalDuration: integer("totalDuration").notNull(),
  actualDuration: integer("actualDuration"),
  currentTaskIndex: integer("currentTaskIndex").default(0).notNull(),
  currentTaskStatus: text("currentTaskStatus"),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const scheduleSuggestions = pgTable("ScheduleSuggestion", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text("taskId")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  suggestionType: text("suggestionType").notNull(),
  reason: text("reason").notNull(),
  confidence: integer("confidence").notNull(),
  currentStart: timestamp("currentStart", { mode: "date" }),
  currentEnd: timestamp("currentEnd", { mode: "date" }),
  suggestedStart: timestamp("suggestedStart", { mode: "date" }),
  suggestedEnd: timestamp("suggestedEnd", { mode: "date" }),
  status: text("status").default("pending").notNull(),
  respondedAt: timestamp("respondedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
});

export const journalEntries = pgTable("JournalEntry", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  content: text("content").notNull(),
  gratitude: text("gratitude"),
  wins: text("wins"),
  challenges: text("challenges"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// AUTH & PASSWORD RESET
// ============================================================================

export const passwordResets = pgTable("PasswordReset", {
  id: text("id").primaryKey().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  usedAt: timestamp("usedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================================
// JOB TRACKING
// ============================================================================

export const jobStatusEnum = pgEnum("JobStatus", [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "FAILED",
  "DELAYED",
  "PAUSED",
]);

export const jobRecords = pgTable("JobRecord", {
  id: text("id").primaryKey().notNull(),
  queueName: text("queueName").notNull(),
  jobId: text("jobId").notNull(),
  name: text("name").notNull(),
  data: json("data").notNull(),
  status: jobStatusEnum("status").default("PENDING").notNull(),
  result: json("result"),
  error: text("error"),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(3).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  startedAt: timestamp("startedAt", { mode: "date" }),
  finishedAt: timestamp("finishedAt", { mode: "date" }),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  calendarFeeds: many(calendarFeeds),
  events: many(events),
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  connectedAccounts: many(connectedAccounts),
  fitbitAccount: many(fitbitAccounts),
  fitbitActivities: many(fitbitActivities),
  fitbitSleep: many(fitbitSleep),
  fitbitHeartRate: many(fitbitHeartRate),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const calendarFeedsRelations = relations(
  calendarFeeds,
  ({ one, many }) => ({
    user: one(users, {
      fields: [calendarFeeds.userId],
      references: [users.id],
    }),
    account: one(connectedAccounts, {
      fields: [calendarFeeds.accountId],
      references: [connectedAccounts.id],
    }),
    events: many(events),
    calendarEvents: many(calendarEvents),
  })
);

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  feed: one(calendarFeeds, {
    fields: [calendarEvents.feedId],
    references: [calendarFeeds.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  calendarFeed: one(calendarFeeds, {
    fields: [events.calendarFeedId],
    references: [calendarFeeds.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  tags: many(taskTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  tasks: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));

export const fitbitAccountsRelations = relations(fitbitAccounts, ({ one }) => ({
  user: one(users, {
    fields: [fitbitAccounts.userId],
    references: [users.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));
export const taskProvidersRelations = relations(taskProviders, ({ one, many }) => ({
  user: one(users, {
    fields: [taskProviders.userId],
    references: [users.id],
  }),
  account: one(connectedAccounts, {
    fields: [taskProviders.accountId],
    references: [connectedAccounts.id],
  }),
  mappings: many(taskListMappings),
}));

export const taskListMappingsRelations = relations(taskListMappings, ({ one }) => ({
  provider: one(taskProviders, {
    fields: [taskListMappings.providerId],
    references: [taskProviders.id],
  }),
  project: one(projects, {
    fields: [taskListMappings.projectId],
    references: [projects.id],
  }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id],
  }),
  logs: many(habitLogs),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, {
    fields: [habitLogs.habitId],
    references: [habits.id],
  }),
}));

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one }) => ({
  user: one(users, {
    fields: [pomodoroSessions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [pomodoroSessions.taskId],
    references: [tasks.id],
  }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, {
    fields: [routines.userId],
    references: [users.id],
  }),
  tasks: many(routineTasks),
  completions: many(routineCompletions),
}));

export const routineTasksRelations = relations(routineTasks, ({ one }) => ({
  routine: one(routines, {
    fields: [routineTasks.routineId],
    references: [routines.id],
  }),
}));

export const routineCompletionsRelations = relations(routineCompletions, ({ one }) => ({
  user: one(users, {
    fields: [routineCompletions.userId],
    references: [users.id],
  }),
  routine: one(routines, {
    fields: [routineCompletions.routineId],
    references: [routines.id],
  }),
}));

export const scheduleSuggestionsRelations = relations(scheduleSuggestions, ({ one }) => ({
  user: one(users, {
    fields: [scheduleSuggestions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [scheduleSuggestions.taskId],
    references: [tasks.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
}));

export const jobRecordsRelations = relations(jobRecords, ({ one }) => ({
  user: one(users, {
    fields: [jobRecords.userId],
    references: [users.id],
  }),
}));


