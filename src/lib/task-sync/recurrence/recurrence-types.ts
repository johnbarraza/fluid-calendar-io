/**
 * Common interfaces for recurrence pattern formats
 */

/**
 * Interface for Outlook recurrence pattern
 */
export interface OutlookRecurrencePattern {
  type: string;
  interval: number;
  month?: number;
  dayOfMonth?: number;
  daysOfWeek?: string[];
  firstDayOfWeek?: string;
  index?: string;
}

/**
 * Interface for Outlook recurrence range
 */
export interface OutlookRecurrenceRange {
  type: string;
  startDate: string;
  endDate?: string;
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
}

/**
 * Interface for Outlook recurrence
 */
export interface OutlookRecurrence {
  pattern: OutlookRecurrencePattern;
  range: OutlookRecurrenceRange;
}

/**
 * Generic interface for mapping from OutlookTask
 */
export interface OutlookTaskRecurrence {
  pattern: {
    type: string;
    interval: number;
    month?: number;
    dayOfMonth?: number;
    daysOfWeek?: string[];
    firstDayOfWeek?: string;
    index?: string;
  };
  range: {
    type: string;
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
  };
}
