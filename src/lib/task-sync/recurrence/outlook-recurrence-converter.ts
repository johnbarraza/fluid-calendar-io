import { RecurrenceConverter } from "./recurrence-converter";
import { OutlookRecurrence } from "./recurrence-types";

/**
 * OutlookRecurrenceConverter
 *
 * Converts between Outlook's recurrence format and RRule format
 */
export class OutlookRecurrenceConverter extends RecurrenceConverter {
  /**
   * Convert from RRule format to Outlook recurrence format
   *
   * @param rrule The recurrence rule in RRule format
   * @returns Outlook recurrence format
   */
  convertFromRRule(rrule: string): OutlookRecurrence {
    // Parse the RRule string into components
    const parts = this.parseRRule(rrule);

    // Extract frequency and interval
    const freq = parts.FREQ as string;
    const interval = parseInt(parts.INTERVAL as string, 10) || 1;

    // Initialize pattern with basic properties
    const pattern: OutlookRecurrence["pattern"] = {
      type: this.mapFrequencyToOutlook(freq),
      interval,
    };

    // Handle day of week (for weekly or monthly patterns)
    if (parts.BYDAY) {
      // Handle both array and string formats
      const byDays = Array.isArray(parts.BYDAY)
        ? parts.BYDAY
        : [parts.BYDAY as string];

      // Check if this is a relative monthly pattern (e.g., 1MO = first Monday)
      if (freq === "MONTHLY" && byDays.some((day) => /^[0-9-]/.test(day))) {
        // This is a relative monthly rule (like "1st Monday")
        pattern.type = "relativemonthly";

        // Extract the position (1, 2, 3, 4, -1) and day
        const relativeDay = byDays[0] as string;
        const position = relativeDay.match(/^(-?\d+)([A-Z]+)$/);

        if (position) {
          const pos = parseInt(position[1], 10);
          const day = position[2];

          // Set the index (first, second, third, fourth, last)
          pattern.index = this.getWeekdayPosition(pos);

          // Set the day of week
          pattern.daysOfWeek = [this.getOutlookDayOfWeek(day)];
        }
      } else {
        // Regular weekly or monthly pattern
        pattern.daysOfWeek = byDays.map((day) => {
          // Remove any position prefix if present
          const cleanDay = day.replace(/^-?\d+/, "");
          return this.getOutlookDayOfWeek(cleanDay);
        });
      }
    }

    // Handle day of month for monthly patterns
    if (parts.BYMONTHDAY) {
      pattern.dayOfMonth = parseInt(
        Array.isArray(parts.BYMONTHDAY)
          ? parts.BYMONTHDAY[0]
          : (parts.BYMONTHDAY as string),
        10
      );
    }

    // Handle month for yearly patterns
    if (parts.BYMONTH) {
      pattern.month = parseInt(
        Array.isArray(parts.BYMONTH)
          ? parts.BYMONTH[0]
          : (parts.BYMONTH as string),
        10
      );
    }

    // Initialize range
    const range: OutlookRecurrence["range"] = {
      type: "noEnd",
      startDate: this.formatOutlookDate(parts.DTSTART as string),
    };

    // Set end condition
    if (parts.COUNT) {
      range.type = "numbered";
      range.numberOfOccurrences = parseInt(parts.COUNT as string, 10);
    } else if (parts.UNTIL) {
      range.type = "endDate";
      range.endDate = this.formatOutlookDate(parts.UNTIL as string);
    }

    return { pattern, range };
  }

  /**
   * Convert from Outlook recurrence format to RRule format
   *
   * @param recurrence Outlook recurrence format
   * @returns RRule format string
   */
  convertToRRule(recurrence: OutlookRecurrence): string {
    // Convert Outlook's relativemonthly to standard monthly with BYDAY
    let freq = recurrence.pattern.type.toUpperCase();
    if (freq === "RELATIVEMONTHLY") {
      freq = "MONTHLY";
    }

    // Initialize RRule parts
    const parts: Record<string, string | string[] | number> = {
      FREQ: freq,
      INTERVAL: recurrence.pattern.interval,
    };

    // Add BYDAY for weekly recurrence or relativemonthly
    if (
      recurrence.pattern.daysOfWeek &&
      recurrence.pattern.daysOfWeek.length > 0
    ) {
      // For relativemonthly, we need to add the week index (e.g., -1 for last, 1 for first)
      if (
        recurrence.pattern.type === "relativemonthly" &&
        recurrence.pattern.index
      ) {
        const weekIndex = this.getWeekdayPositionNumber(
          recurrence.pattern.index
        );

        const days = recurrence.pattern.daysOfWeek.map(
          (day) => `${weekIndex}${this.getRRuleDay(day)}`
        );
        parts.BYDAY = days;
      } else {
        // Regular weekly recurrence
        parts.BYDAY = recurrence.pattern.daysOfWeek.map((day) =>
          this.getRRuleDay(day)
        );
      }
    }

    // Add BYMONTHDAY for monthly recurrence
    if (recurrence.pattern.dayOfMonth) {
      parts.BYMONTHDAY = recurrence.pattern.dayOfMonth;
    }

    // Add BYMONTH for yearly recurrence
    if (recurrence.pattern.month) {
      parts.BYMONTH = recurrence.pattern.month;
    }

    // Add COUNT or UNTIL for end date
    if (
      recurrence.range.type === "numbered" &&
      recurrence.range.numberOfOccurrences
    ) {
      parts.COUNT = recurrence.range.numberOfOccurrences;
    } else if (
      recurrence.range.type === "endDate" &&
      recurrence.range.endDate
    ) {
      // Convert the date to YYYYMMDD format without hyphens
      const untilDate = recurrence.range.endDate.replace(/-/g, "");
      parts.UNTIL = `${untilDate}T235959Z`;
    }

    // Add DTSTART
    if (recurrence.range.startDate) {
      const dtstart = recurrence.range.startDate.replace(/-/g, "");
      parts.DTSTART = `${dtstart}T000000Z`;
    }

    // Build and return the RRule string
    return this.buildRRule(parts);
  }

  /**
   * Convert RRule frequency to Outlook recurrence type
   */
  private mapFrequencyToOutlook(freq: string): string {
    switch (freq) {
      case "DAILY":
        return "daily";
      case "WEEKLY":
        return "weekly";
      case "MONTHLY":
        return "monthly";
      case "YEARLY":
        return "yearly";
      default:
        return "daily";
    }
  }

  /**
   * Get Outlook day of week from RRule day code
   */
  private getOutlookDayOfWeek(rruleDay: string): string {
    const dayMap: Record<string, string> = {
      SU: "sunday",
      MO: "monday",
      TU: "tuesday",
      WE: "wednesday",
      TH: "thursday",
      FR: "friday",
      SA: "saturday",
    };

    return dayMap[rruleDay] || "monday";
  }

  /**
   * Get RRule day code from Outlook day of week
   */
  private getRRuleDay(outlookDay: string): string {
    const dayMap: Record<string, string> = {
      sunday: "SU",
      monday: "MO",
      tuesday: "TU",
      wednesday: "WE",
      thursday: "TH",
      friday: "FR",
      saturday: "SA",
    };

    return dayMap[outlookDay.toLowerCase()] || "MO";
  }

  /**
   * Get Outlook weekday position text from number
   */
  private getWeekdayPosition(position: number): string {
    if (position === -1) return "last";
    if (position === 1) return "first";
    if (position === 2) return "second";
    if (position === 3) return "third";
    if (position === 4) return "fourth";
    return "first";
  }

  /**
   * Get weekday position number from Outlook text
   */
  private getWeekdayPositionNumber(position: string): number {
    const posMap: Record<string, number> = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      last: -1,
    };

    return posMap[position.toLowerCase()] || 1;
  }

  /**
   * Format date for Outlook (YYYYMMDD -> YYYY-MM-DD)
   */
  private formatOutlookDate(dateStr: string): string {
    // Handle date+time format by extracting just the date part
    if (dateStr.includes("T")) {
      dateStr = dateStr.split("T")[0];
    }

    // If already formatted with hyphens, return as is
    if (dateStr.includes("-")) {
      return dateStr;
    }

    // Format YYYYMMDD -> YYYY-MM-DD
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(
        4,
        6
      )}-${dateStr.substring(6, 8)}`;
    }

    return dateStr;
  }
}
