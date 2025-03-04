"use client";

import { HiMenu } from "react-icons/hi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { FeedManager } from "@/components/calendar/FeedManager";
import { addDays, newDate, subDays, formatDate } from "@/lib/date-utils";
import { useViewStore, useCalendarUIStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";
import { cn } from "@/lib/utils";
import { SponsorshipBanner } from "@/components/ui/sponsorship-banner";

export function Calendar() {
  const { date: currentDate, setDate, view, setView } = useViewStore();
  const { isSidebarOpen, setSidebarOpen, isHydrated } = useCalendarUIStore();
  const { scheduleAllTasks } = useTaskStore();

  const handlePrevWeek = () => {
    if (view === "month") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setDate(newDate);
    } else {
      setDate(subDays(currentDate, 7));
    }
  };

  const handleNextWeek = () => {
    if (view === "month") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setDate(newDate);
    } else {
      setDate(addDays(currentDate, 7));
    }
  };

  const handleAutoSchedule = async () => {
    if (confirm("Auto-schedule all tasks marked for auto-scheduling?")) {
      await scheduleAllTasks();
    }
  };

  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full w-80 bg-white border-r border-gray-200 flex-none",
          "transform transition-transform duration-300 ease-in-out",
          !isHydrated && "duration-0 opacity-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ marginLeft: isSidebarOpen ? 0 : "-20rem" }}
      >
        <div className="flex flex-col h-full">
          {/* Feed Manager */}
          <div className="flex-1 overflow-y-auto">
            <FeedManager />
          </div>

          {/* Sponsorship Banner */}
          <SponsorshipBanner />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center px-4 flex-none">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <HiMenu className="w-5 h-5" />
          </button>

          <div className="ml-4 flex items-center gap-4">
            <button
              onClick={() => setDate(newDate())}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Today
            </button>

            <button
              onClick={handleAutoSchedule}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Auto Schedule
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                data-testid="calendar-prev-week"
              >
                <IoChevronBack className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                data-testid="calendar-next-week"
              >
                <IoChevronForward className="w-5 h-5" />
              </button>
            </div>

            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
          </div>

          {/* View Switching Buttons - Moved to the right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "week"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "month"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              Month
            </button>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          {view === "week" ? (
            <WeekView currentDate={currentDate} onDateClick={setDate} />
          ) : (
            <MonthView currentDate={currentDate} onDateClick={setDate} />
          )}
        </div>
      </main>
    </div>
  );
}
