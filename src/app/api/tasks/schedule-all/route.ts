import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SchedulingService } from "@/services/scheduling/SchedulingService";
import { AutoScheduleSettings } from "@prisma/client";
import { TaskStatus } from "@/types/task";

export async function POST(request: Request) {
  try {
    const { settings } = (await request.json()) as {
      settings: AutoScheduleSettings;
    };
    //reset all scheduled tasks
    await prisma.task.updateMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: false,
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      },
    });

    // Get all tasks marked for auto-scheduling that are not locked
    const tasksToSchedule = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: false,
        status: {
          not: TaskStatus.COMPLETED,
        },
      },
      include: {
        project: true,
        tags: true,
      },
    });

    // Get locked tasks (we'll keep their schedules)
    const lockedTasks = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: true,
        status: {
          not: TaskStatus.COMPLETED,
        },
      },
      include: {
        project: true,
        tags: true,
      },
    });

    // Initialize scheduling service with settings
    const schedulingService = new SchedulingService(settings);

    // Clear existing schedules for non-locked tasks only
    await prisma.task.updateMany({
      where: {
        id: {
          in: tasksToSchedule.map((task) => task.id),
        },
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      },
    });

    // Schedule all non-locked tasks with full task objects
    const updatedTasks = await schedulingService.scheduleMultipleTasks([
      ...tasksToSchedule,
      ...lockedTasks,
    ]);

    // Fetch the tasks again with their relations to return
    const tasksWithRelations = await prisma.task.findMany({
      where: {
        id: {
          in: updatedTasks.map((task) => task.id),
        },
      },
      include: {
        tags: true,
        project: true,
      },
    });

    return NextResponse.json(tasksWithRelations);
  } catch (error) {
    console.error("Error scheduling tasks:", error);
    return NextResponse.json(
      { error: "Failed to schedule tasks" },
      { status: 500 }
    );
  }
}
