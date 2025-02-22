import { PrismaClient, Task, AutoScheduleSettings } from "@prisma/client";
import { TimeSlotManagerImpl, TimeSlotManager } from "./TimeSlotManager";
import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { useSettingsStore } from "@/store/settings";
import { addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const DEFAULT_TASK_DURATION = 30; // Default duration in minutes
const BATCH_SIZE = 8; // Process 8 tasks at a time

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface TaskScore {
  taskId: string;
  score: number;
}

export class SchedulingService {
  private prisma: PrismaClient;
  private calendarService: CalendarServiceImpl;
  private settings: AutoScheduleSettings | null;
  private metrics: PerformanceMetrics[] = [];

  constructor(settings?: AutoScheduleSettings) {
    this.prisma = new PrismaClient();
    this.calendarService = new CalendarServiceImpl(this.prisma);
    this.settings = settings || null;
  }

  private startMetric(
    operation: string,
    metadata?: Record<string, any>
  ): number {
    const startTime = performance.now();
    this.metrics.push({ operation, startTime, metadata });
    return startTime;
  }

  private endMetric(operation: string, startTime: number) {
    const endTime = performance.now();
    const metricIndex = this.metrics.findIndex(
      (m) => m.operation === operation && m.startTime === startTime
    );
    if (metricIndex !== -1) {
      this.metrics[metricIndex].endTime = endTime;
      this.metrics[metricIndex].duration = endTime - startTime;
    }
  }

  private logMetrics() {
    const totalDuration =
      this.metrics[this.metrics.length - 1].endTime! -
      this.metrics[0].startTime;

    logger.log("Scheduling Performance Metrics", {
      totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
      operations: this.metrics.map((m) => ({
        operation: m.operation,
        duration: m.duration
          ? `${(m.duration / 1000).toFixed(2)}s`
          : "incomplete",
        percentage: m.duration
          ? `${((m.duration / totalDuration) * 100).toFixed(1)}%`
          : "n/a",
        metadata: m.metadata,
      })),
    });

    // Reset metrics for next run
    this.metrics = [];
  }

  private getTimeSlotManager(): TimeSlotManagerImpl {
    const startTime = this.startMetric("getTimeSlotManager");

    let settings: AutoScheduleSettings;

    if (this.settings) {
      settings = this.settings;
    } else {
      // Fallback to store settings if none provided (for backward compatibility)
      const storeSettings = useSettingsStore.getState().autoSchedule;
      settings = {
        ...storeSettings,
        id: "store",
        userId: "store",
        createdAt: newDate(),
        updatedAt: newDate(),
      };
    }

    // logger.log("[DEBUG] Creating TimeSlotManager with settings", {
    //   workHours: {
    //     start: settings.workHourStart,
    //     end: settings.workHourEnd,
    //   },
    //   workDays: settings.workDays,
    //   selectedCalendars: settings.selectedCalendars,
    //   bufferMinutes: settings.bufferMinutes,
    //   timeZone: useSettingsStore.getState().user.timeZone,
    // });

    const manager = new TimeSlotManagerImpl(
      settings,
      this.calendarService,
      this.prisma
    );

    this.endMetric("getTimeSlotManager", startTime);
    return manager;
  }

  async scheduleMultipleTasks(tasks: Task[]): Promise<Task[]> {
    const overallStart = this.startMetric("scheduleMultipleTasks", {
      totalTasks: tasks.length,
    });

    // logger.log("[DEBUG] Starting to schedule multiple tasks", {
    //   tasks: tasks.map((t) => ({
    //     id: t.id,
    //     title: t.title,
    //     duration: t.duration || DEFAULT_TASK_DURATION,
    //     dueDate: t.dueDate,
    //   })),
    // });

    // Clear existing schedules for non-locked tasks
    const tasksToSchedule = tasks.filter((t) => !t.scheduleLocked);
    // logger.log(
    //   `[DEBUG] ${tasksToSchedule.length} tasks to schedule (excluding locked tasks)`
    // );

    // logger.log("[DEBUG] Cleared existing schedules for non-locked tasks");

    // Get initial scores for all tasks
    const timeSlotManager = this.getTimeSlotManager();
    const now = newDate();

    const scoringStart = this.startMetric("calculateInitialScores", {
      tasksToScore: tasksToSchedule.length,
    });

    const initialScores = new Map<string, number>();

    //TODO: move to utils
    // Use the same windows as scheduling
    const windows = [
      { days: 7, label: "1 week" },
      // { days: 14, label: "2 weeks" },
      // { days: 30, label: "1 month" },
    ];

    // Process tasks in parallel batches
    const batchSize = 8;
    for (let i = 0; i < tasksToSchedule.length; i += batchSize) {
      const batch = tasksToSchedule.slice(i, i + batchSize);
      const batchPromises = batch.map(async (task) => {
        const taskStart = this.startMetric("calculateTaskScore", {
          taskId: task.id,
          title: task.title,
        });

        let bestScore = 0;
        for (const window of windows) {
          const slots = await timeSlotManager.findAvailableSlots(
            task,
            now,
            addDays(now, window.days)
          );
          if (slots.length > 0) {
            bestScore = Math.max(bestScore, slots[0].score);
            break; // Found a slot, no need to look further
          }
        }

        this.endMetric("calculateTaskScore", taskStart);
        return { taskId: task.id, score: bestScore };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        initialScores.set(result.taskId, result.score);
      });
    }

    this.endMetric("calculateInitialScores", scoringStart);

    // Sort tasks by their best possible score
    const sortStart = this.startMetric("sortTasks");
    const sortedTasks = [...tasksToSchedule].sort((a, b) => {
      const aScore = initialScores.get(a.id) || 0;
      const bScore = initialScores.get(b.id) || 0;
      return bScore - aScore; // Higher scores first
    });

    // logger.log("[DEBUG] Sorted tasks by score", {
    //   tasks: sortedTasks.map((t) => ({
    //     id: t.id,
    //     title: t.title,
    //     priority: t.priority,
    //     score: initialScores.get(t.id),
    //     window:
    //       windows.find((w) => w.days <= (initialScores.get(t.id) || 0) * 7)
    //         ?.label || "none",
    //   })),
    // });

    const schedulingStart = this.startMetric("scheduleTasks", {
      tasksToSchedule: sortedTasks.length,
    });

    const updatedTasks: Task[] = [];

    // Schedule each task
    for (const task of sortedTasks) {
      const taskStart = this.startMetric("scheduleIndividualTask", {
        taskId: task.id,
        title: task.title,
      });

      const taskWithDuration = {
        ...task,
        duration: task.duration || DEFAULT_TASK_DURATION,
      };

      // logger.log("[DEBUG] Attempting to schedule task", {
      //   id: taskWithDuration.id,
      //   title: taskWithDuration.title,
      //   duration: taskWithDuration.duration,
      // });

      const scheduledTask = await this.scheduleTask(
        taskWithDuration,
        timeSlotManager
      );
      if (scheduledTask) {
        // logger.log("[DEBUG] Successfully scheduled task", {
        //   id: scheduledTask.id,
        //   title: scheduledTask.title,
        //   start: scheduledTask.scheduledStart,
        //   end: scheduledTask.scheduledEnd,
        //   duration: scheduledTask.duration,
        // });
        updatedTasks.push(scheduledTask);
      } else {
        // logger.log("[DEBUG] Failed to schedule task", {
        //   id: task.id,
        //   title: task.title,
        //   duration: taskWithDuration.duration,
        // });
      }

      this.endMetric("scheduleIndividualTask", taskStart);
    }

    this.endMetric("scheduleTasks", schedulingStart);

    // Get all tasks (including locked ones) to return
    const finalFetchStart = this.startMetric("fetchFinalTasks");
    const allTasks = await this.prisma.task.findMany({
      where: {
        id: {
          in: tasks.map((t) => t.id),
        },
      },
    });
    this.endMetric("fetchFinalTasks", finalFetchStart);

    this.endMetric("scheduleMultipleTasks", overallStart);
    this.logMetrics();

    // logger.log("[DEBUG] Scheduling complete. Results", {
    //   totalTasks: tasks.length,
    //   scheduledTasks: updatedTasks.length,
    //   failedTasks: tasksToSchedule.length - updatedTasks.length,
    //   lockedTasks: tasks.length - tasksToSchedule.length,
    // });

    return allTasks;
  }

  private async scheduleTask(
    task: Task,
    timeSlotManager: TimeSlotManager
  ): Promise<Task | null> {
    const taskStart = this.startMetric("scheduleTask", {
      taskId: task.id,
      title: task.title,
    });

    const now = newDate();
    const windows = [
      { days: 7, label: "1 week" },
      // { days: 14, label: "2 weeks" },
      // { days: 30, label: "1 month" },
    ];

    for (const window of windows) {
      const windowStart = this.startMetric("tryWindow", {
        window: window.label,
        taskId: task.id,
      });

      const endDate = addDays(now, window.days);
      const availableSlots = await timeSlotManager.findAvailableSlots(
        task,
        now,
        endDate
      );

      if (availableSlots.length > 0) {
        // logger.log(
        //   `[DEBUG] Found ${availableSlots.length} available slots in ${window.label} window`
        // );
        const bestSlot = availableSlots[0]; // Already sorted by score

        // logger.log("[DEBUG] Selected best slot", {
        //   start: bestSlot.start,
        //   end: bestSlot.end,
        //   duration: task.duration || DEFAULT_TASK_DURATION,
        // });

        const updateStart = this.startMetric("updateTask", {
          taskId: task.id,
          slotStart: bestSlot.start,
          slotEnd: bestSlot.end,
        });

        // Update the task with the selected slot
        const updatedTask = await this.prisma.task.update({
          where: { id: task.id },
          data: {
            scheduledStart: bestSlot.start,
            scheduledEnd: bestSlot.end,
            isAutoScheduled: true,
            duration: task.duration || DEFAULT_TASK_DURATION,
            scheduleScore: bestSlot.score,
          },
        });

        this.endMetric("updateTask", updateStart);
        this.endMetric("tryWindow", windowStart);
        this.endMetric("scheduleTask", taskStart);
        return updatedTask;
      } else {
        logger.log(`No available slots found in ${window.label} window`);
      }

      this.endMetric("tryWindow", windowStart);
    }

    // logger.log("[DEBUG] Failed to find any available slots for task", {
    //   id: task.id,
    //   title: task.title,
    //   duration: task.duration || DEFAULT_TASK_DURATION,
    // });

    this.endMetric("scheduleTask", taskStart);
    return null;
  }
}
