import { z } from "zod";
import {
  ListEventsSchema,
  CreateEventSchema,
  UpdateEventSchema,
  DeleteEventSchema,
  FindFreeSlotsSchema,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  findFreeSlots,
} from "./mcp/tools/calendar-tools";
import {
  GetActivitySchema,
  GetSleepSchema,
  GetHeartRateSchema,
  GetRecentActivitySchema,
  getActivity,
  getSleep,
  getHeartRate,
  getRecentActivity,
} from "./mcp/tools/fitbit-tools";
import {
  GetTasksSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CompleteTaskSchema,
  DeleteTaskSchema,
  getTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from "./mcp/tools/task-tools";
import { logger } from "./logger";

const LOG_SOURCE = "MCPServer";

export interface McpContext {
  userId: string;
}

/**
 * MCP Tools parameter types using Zod schema inference
 */
type ListEventsParams = z.infer<typeof ListEventsSchema>;
type CreateEventParams = z.infer<typeof CreateEventSchema>;
type UpdateEventParams = z.infer<typeof UpdateEventSchema>;
type DeleteEventParams = z.infer<typeof DeleteEventSchema>;
type FindFreeSlotsParams = z.infer<typeof FindFreeSlotsSchema>;
type GetActivityParams = z.infer<typeof GetActivitySchema>;
type GetSleepParams = z.infer<typeof GetSleepSchema>;
type GetHeartRateParams = z.infer<typeof GetHeartRateSchema>;
type GetRecentActivityParams = z.infer<typeof GetRecentActivitySchema>;
type GetTasksParams = z.infer<typeof GetTasksSchema>;
type CreateTaskParams = z.infer<typeof CreateTaskSchema>;
type UpdateTaskParams = z.infer<typeof UpdateTaskSchema>;
type CompleteTaskParams = z.infer<typeof CompleteTaskSchema>;
type DeleteTaskParams = z.infer<typeof DeleteTaskSchema>;

export const mcpTools = {
  list_events: {
    description: "List events from Google Calendar with optional filters",
    parameters: ListEventsSchema,
    execute: async (params: ListEventsParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await listEvents(userId, params);

        logger.info(
          `MCP list_events completed: ${result.events.length} events`,
          { userId, accountId: params.accountId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP list_events failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  create_event: {
    description: "Create a new event in Google Calendar",
    parameters: CreateEventSchema,
    execute: async (params: CreateEventParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await createEvent(userId, params);

        logger.info(
          `MCP create_event completed: ${result.id}`,
          { userId, accountId: params.accountId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP create_event failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  update_event: {
    description: "Update an existing calendar event",
    parameters: UpdateEventSchema,
    execute: async (params: UpdateEventParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await updateEvent(userId, params);

        logger.info(
          `MCP update_event completed: ${result.id}`,
          { userId, eventId: params.eventId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP update_event failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  delete_event: {
    description: "Delete a calendar event",
    parameters: DeleteEventSchema,
    execute: async (params: DeleteEventParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await deleteEvent(userId, params);

        logger.info(
          `MCP delete_event completed: ${result.eventId}`,
          { userId, eventId: params.eventId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP delete_event failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  find_free_slots: {
    description: "Find available time slots in calendar(s)",
    parameters: FindFreeSlotsSchema,
    execute: async (params: FindFreeSlotsParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await findFreeSlots(userId, params);

        logger.info(
          `MCP find_free_slots completed: ${result.freeSlots.length} slots found`,
          { userId, accountId: params.accountId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP find_free_slots failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  get_fitbit_activity: {
    description: "Get Fitbit activity data for a specific date (steps, calories, distance, active minutes)",
    parameters: GetActivitySchema,
    execute: async (params: GetActivityParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await getActivity(userId, params);

        logger.info(
          `MCP get_fitbit_activity completed`,
          { userId, date: params.date },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP get_fitbit_activity failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  get_fitbit_sleep: {
    description: "Get Fitbit sleep data for a date range (sleep sessions with efficiency, stages)",
    parameters: GetSleepSchema,
    execute: async (params: GetSleepParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await getSleep(userId, params);

        logger.info(
          `MCP get_fitbit_sleep completed: ${result.count || 0} sessions`,
          { userId, startDate: params.startDate, endDate: params.endDate },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP get_fitbit_sleep failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  get_fitbit_heart_rate: {
    description: "Get Fitbit heart rate data for a specific date (resting HR, zones)",
    parameters: GetHeartRateSchema,
    execute: async (params: GetHeartRateParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await getHeartRate(userId, params);

        logger.info(
          `MCP get_fitbit_heart_rate completed`,
          { userId, date: params.date },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP get_fitbit_heart_rate failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  get_recent_fitbit_activity: {
    description: "Get recent Fitbit activity summary (last 7 days by default) with aggregated statistics",
    parameters: GetRecentActivitySchema,
    execute: async (params: GetRecentActivityParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await getRecentActivity(userId, params);

        logger.info(
          `MCP get_recent_fitbit_activity completed: ${result.summary?.daysWithData || 0} days`,
          { userId, days: params.days || 7 },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP get_recent_fitbit_activity failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  get_tasks: {
    description: "Get tasks with optional filters (status, priority, due date, project)",
    parameters: GetTasksSchema,
    execute: async (params: GetTasksParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await getTasks(userId, params);

        logger.info(
          `MCP get_tasks completed: ${result.count} tasks`,
          {
            userId,
            status: params.status || null,
            priority: params.priority || null,
            limit: params.limit || null,
          },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP get_tasks failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  create_task: {
    description: "Create a new task",
    parameters: CreateTaskSchema,
    execute: async (params: CreateTaskParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await createTask(userId, params);

        logger.info(
          `MCP create_task completed: ${result.task?.id || "error"}`,
          { userId, title: params.title },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP create_task failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  update_task: {
    description: "Update an existing task",
    parameters: UpdateTaskSchema,
    execute: async (params: UpdateTaskParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await updateTask(userId, params);

        logger.info(
          `MCP update_task completed: ${params.taskId}`,
          { userId, taskId: params.taskId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP update_task failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  complete_task: {
    description: "Mark a task as completed",
    parameters: CompleteTaskSchema,
    execute: async (params: CompleteTaskParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await completeTask(userId, params);

        logger.info(
          `MCP complete_task completed: ${params.taskId}`,
          { userId, taskId: params.taskId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP complete_task failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },

  delete_task: {
    description: "Delete a task",
    parameters: DeleteTaskSchema,
    execute: async (params: DeleteTaskParams, context: McpContext) => {
      try {
        const { userId } = context;
        const result = await deleteTask(userId, params);

        logger.info(
          `MCP delete_task completed: ${params.taskId}`,
          { userId, taskId: params.taskId },
          LOG_SOURCE
        );

        return result;
      } catch (error) {
        logger.error(
          "MCP delete_task failed",
          { error: error instanceof Error ? error.message : "Unknown" },
          LOG_SOURCE
        );
        throw error;
      }
    },
  },
};
