import { memo } from "react";
import { IoRepeat, IoCheckmarkCircle, IoTimeOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import type { EventContentArg } from "@fullcalendar/core";
import { Priority, TaskStatus } from "@/types/task";
import { isTaskOverdue } from "@/lib/task-utils";

interface CalendarEventContentProps {
  eventInfo: EventContentArg;
}

const priorityColors = {
  [Priority.HIGH]: "border-red-500",
  [Priority.MEDIUM]: "border-orange-500",
  [Priority.LOW]: "border-blue-500",
  [Priority.NONE]: "border-gray-500",
};

export const CalendarEventContent = memo(function CalendarEventContent({
  eventInfo,
}: CalendarEventContentProps) {
  const isTask = eventInfo.event.extendedProps.isTask;
  const isRecurring = eventInfo.event.extendedProps.isRecurring;
  const status = eventInfo.event.extendedProps.status;
  const priority = eventInfo.event.extendedProps.priority;
  const location = eventInfo.event.extendedProps.location;
  const dueDate = eventInfo.event.extendedProps?.extendedProps?.dueDate;
  const title = eventInfo.event.title;
  const endTime = eventInfo.event.end?.getTime() ?? 0;
  const startTime = eventInfo.event.start?.getTime() ?? 0;
  const duration = endTime - startTime;

  const isOverdue = isTask && isTaskOverdue({ dueDate, status });

  return (
    <div
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      className={cn(
        "flex flex-col justify-start p-1.5 gap-1 text-[11px] overflow-hidden h-full",
        isTask && "border-l-4",
        isTask && "text-gray-700",
        isTask && priority && priorityColors[priority as Priority],
        isTask &&
          !priority && {
            "border-green-500": status === TaskStatus.COMPLETED,
            "border-yellow-500": status === TaskStatus.IN_PROGRESS,
            "border-gray-500": status === TaskStatus.TODO,
          },
        isOverdue && "text-red-600 font-medium border-red-500",
        status === TaskStatus.COMPLETED && "text-gray-500 line-through"
      )}
    >
      <div className="flex items-center gap-1.5 w-full">
        {isTask ? (
          <IoCheckmarkCircle className="flex-shrink-0 h-3.5 w-3.5 text-current opacity-75" />
        ) : isRecurring ? (
          <IoRepeat className="flex-shrink-0 h-3.5 w-3.5 text-current opacity-75" />
        ) : (
          <IoTimeOutline className="flex-shrink-0 h-3.5 w-3.5 text-current opacity-75" />
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-medium leading-snug calendar-event-title",
              duration <= 1800000 ? "truncate" : "line-clamp-2 break-words"
            )}
          >
            {title}
          </div>
        </div>
      </div>
      {location && duration > 1800000 && (
        <div className="truncate opacity-80 text-[10px] leading-snug event-location pl-5">
          {location}
        </div>
      )}
    </div>
  );
});
