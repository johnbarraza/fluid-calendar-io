# Drizzle ORM Quick Reference Guide

## Common Patterns

### Imports
```typescript
import { db, tableName } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc } from "drizzle-orm";
```

### Find Operations

**Find by ID:**
```typescript
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, userId)
});
```

**Find with multiple conditions:**
```typescript
const tasks = await db.query.tasks.findMany({
  where: (tasks, { and, eq }) =>
    and(
      eq(tasks.userId, userId),
      eq(tasks.status, "todo")
    )
});
```

**Find with relations:**
```typescript
const task = await db.query.tasks.findFirst({
  where: (tasks, { eq }) => eq(tasks.id, taskId),
  with: {
    project: true,
    tags: true
  }
});
```

**Find with select specific columns:**
```typescript
const events = await db.query.calendarEvents.findMany({
  where: (events, { eq }) => eq(events.feedId, feedId),
  with: {
    feed: {
      columns: {
        name: true,
        color: true
      }
    }
  }
});
```

### Insert Operations

**Basic insert:**
```typescript
const [newTask] = await db.insert(tasks).values({
  id: crypto.randomUUID(),
  title: "My Task",
  userId,
  status: "todo"
}).returning();
```

**Insert multiple:**
```typescript
const newTags = await db.insert(tags).values([
  { id: crypto.randomUUID(), name: "work", userId },
  { id: crypto.randomUUID(), name: "personal", userId }
]).returning();
```

### Update Operations

**Basic update:**
```typescript
const [updated] = await db.update(tasks)
  .set({ status: "done" })
  .where(eq(tasks.id, taskId))
  .returning();
```

**Update multiple fields:**
```typescript
await db.update(users)
  .set({
    name: "New Name",
    email: "new@email.com",
    updatedAt: new Date()
  })
  .where(eq(users.id, userId));
```

**Conditional update:**
```typescript
const updated = await db.update(tasks)
  .set({ priority: "high" })
  .where(
    and(
      eq(tasks.userId, userId),
      eq(tasks.status, "todo")
    )
  )
  .returning();
```

### Delete Operations

**Basic delete:**
```typescript
await db.delete(tasks).where(eq(tasks.id, taskId));
```

**Conditional delete:**
```typescript
await db.delete(tasks).where(
  and(
    eq(tasks.userId, userId),
    eq(tasks.status, "cancelled")
  )
);
```

### Upsert Pattern (Find-then-Insert/Update)

```typescript
// 1. Try to find existing
let settings = await db.query.userSettings.findFirst({
  where: (userSettings, { eq }) => eq(userSettings.userId, userId)
});

// 2. Update if exists, insert if not
if (settings) {
  [settings] = await db.update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, userId))
    .returning();
} else {
  [settings] = await db.insert(userSettings)
    .values({
      id: crypto.randomUUID(),
      userId,
      ...defaults,
      ...updates
    })
    .returning();
}
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // Use tx instead of db for transactional operations
  const [task] = await tx.insert(tasks).values({
    id: crypto.randomUUID(),
    title: "Task 1",
    userId
  }).returning();

  await tx.insert(taskTags).values({
    taskId: task.id,
    tagId: tagId
  });
});
```

### Where Clause Operators

```typescript
import { eq, and, or, inArray, like, gte, lte, isNull, isNotNull, gt, lt, desc, asc } from "drizzle-orm";

// Equal
where: (tasks, { eq }) => eq(tasks.status, "todo")

// AND
where: (tasks, { and, eq }) => and(
  eq(tasks.userId, userId),
  eq(tasks.status, "todo")
)

// OR
where: (tasks, { or, eq }) => or(
  eq(tasks.priority, "high"),
  eq(tasks.priority, "urgent")
)

// IN array
where: (tasks, { inArray }) => inArray(tasks.status, ["todo", "in_progress"])

// LIKE
where: (tasks, { like }) => like(tasks.title, "%search%")

// Greater than / Less than
where: (tasks, { gte, lte }) => and(
  gte(tasks.dueDate, startDate),
  lte(tasks.dueDate, endDate)
)

// IS NULL / IS NOT NULL
where: (tasks, { isNull }) => isNull(tasks.completedAt)
where: (tasks, { isNotNull }) => isNotNull(tasks.dueDate)
```

### Ordering and Limiting

```typescript
import { desc, asc } from "drizzle-orm";

// Order by (in query builder style)
const tasks = await db.select()
  .from(tasks)
  .where(eq(tasks.userId, userId))
  .orderBy(desc(tasks.createdAt))
  .limit(10);

// With query API (need to use select style for orderBy)
const tasks = await db.query.tasks.findMany({
  where: (tasks, { eq }) => eq(tasks.userId, userId),
  orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
  limit: 10
});
```

### Counting

```typescript
import { sql } from "drizzle-orm";

const [result] = await db.select({ count: sql<number>`count(*)` })
  .from(tasks)
  .where(eq(tasks.userId, userId));

const count = result.count;
```

### Join Many-to-Many

```typescript
// For task tags
const task = await db.query.tasks.findFirst({
  where: (tasks, { eq }) => eq(tasks.id, taskId),
  with: {
    tags: {
      with: {
        tag: true
      }
    }
  }
});

// Accessing: task.tags.map(tt => tt.tag)
```

### Raw SQL (when needed)

```typescript
import { sql } from "drizzle-orm";

const result = await db.execute(sql`
  SELECT * FROM tasks
  WHERE user_id = ${userId}
  AND status = ${status}
`);
```

## Table Names Reference

| Prisma Model | Drizzle Table |
|--------------|---------------|
| User | users |
| Account | accounts |
| Session | sessions |
| VerificationToken | verificationTokens |
| PasswordReset | passwordResets |
| CalendarFeed | calendarFeeds |
| CalendarEvent | calendarEvents |
| Event | events |
| Task | tasks |
| Project | projects |
| Tag | tags |
| TaskTag | taskTags |
| ConnectedAccount | connectedAccounts |
| FitbitAccount | fitbitAccounts |
| FitbitActivity | fitbitActivities |
| FitbitSleep | fitbitSleep |
| FitbitHeartRate | fitbitHeartRate |
| AutoScheduleSettings | autoScheduleSettings |
| UserSettings | userSettings |
| CalendarSettings | calendarSettings |
| NotificationSettings | notificationSettings |
| IntegrationSettings | integrationSettings |
| DataSettings | dataSettings |
| SystemSettings | systemSettings |
| Log | logs |
| JobRecord | jobRecords |
| TaskProvider | taskProviders |
| TaskListMapping | taskListMappings |
| TaskChange | taskChanges |
| Habit | habits |
| HabitLog | habitLogs |
| MoodEntry | moodEntries |
| PomodoroSession | pomodoroSessions |
| Routine | routines |
| RoutineTask | routineTasks |
| RoutineCompletion | routineCompletions |
| ScheduleSuggestion | scheduleSuggestions |
| JournalEntry | journalEntries |

## Common Gotchas

1. **Always use crypto.randomUUID() for IDs:**
   ```typescript
   // ❌ Bad
   await db.insert(tasks).values({ title: "Task" });

   // ✅ Good
   await db.insert(tasks).values({
     id: crypto.randomUUID(),
     title: "Task"
   });
   ```

2. **Destructure returning() results:**
   ```typescript
   // ❌ Bad
   const task = await db.insert(tasks).values(...).returning();

   // ✅ Good
   const [task] = await db.insert(tasks).values(...).returning();
   ```

3. **Use query API for relations, select API for complex queries:**
   ```typescript
   // ✅ Good for relations
   const task = await db.query.tasks.findFirst({
     with: { project: true }
   });

   // ✅ Good for complex queries with joins, orderBy, limit
   const tasks = await db.select()
     .from(tasks)
     .leftJoin(projects, eq(tasks.projectId, projects.id))
     .orderBy(desc(tasks.createdAt))
     .limit(10);
   ```

4. **Transactions use tx, not db:**
   ```typescript
   await db.transaction(async (tx) => {
     // ❌ Bad
     await db.insert(tasks).values(...);

     // ✅ Good
     await tx.insert(tasks).values(...);
   });
   ```

## Tips

- Use the `db.query` API for most read operations with relations
- Use `db.insert/update/delete` for write operations
- Use `db.select().from()` for complex queries with joins, groupBy, etc.
- Always import operators from `drizzle-orm`
- Check the Drizzle docs for advanced features: https://orm.drizzle.team/docs/overview
