/**
 * RecurrenceConverter
 *
 * Base class for converting between provider-specific recurrence formats
 * and the RRule format used by our application.
 */
export class RecurrenceConverter {
  /**
   * Convert from RRule format to provider-specific format
   *
   * @param rrule The recurrence rule in RRule format
   * @returns Provider-specific recurrence format
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  convertFromRRule(rrule: string): unknown {
    throw new Error(
      "convertFromRRule must be implemented by provider-specific converters"
    );
  }

  /**
   * Convert from provider-specific format to RRule format
   *
   * @param recurrence Provider-specific recurrence format
   * @returns RRule format string
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  convertToRRule(recurrence: unknown): string {
    throw new Error(
      "convertToRRule must be implemented by provider-specific converters"
    );
  }

  /**
   * Parse a RRule string into its components
   *
   * @param rrule RRule string (RRULE:FREQ=...)
   * @returns Object with parsed components
   */
  parseRRule(rrule: string): Record<string, string | string[]> {
    // Remove 'RRULE:' prefix if present
    const ruleText = rrule.startsWith("RRULE:") ? rrule.substring(6) : rrule;

    // Split the rule into parts separated by semicolons
    const parts = ruleText.split(";");

    // Initialize result object
    const result: Record<string, string | string[]> = {};

    // Parse each part (e.g., "FREQ=DAILY")
    for (const part of parts) {
      const [key, value] = part.split("=");

      // Handle arrays (like BYDAY=MO,TU,WE)
      if (value && value.includes(",")) {
        result[key] = value.split(",");
      } else {
        result[key] = value || "";
      }
    }

    return result;
  }

  /**
   * Build a RRule string from components
   *
   * @param parts Object with RRule components
   * @returns Formatted RRule string
   */
  buildRRule(parts: Record<string, string | string[] | number>): string {
    const ruleComponents: string[] = [];

    // Convert each part to string format
    for (const [key, value] of Object.entries(parts)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          ruleComponents.push(`${key}=${value.join(",")}`);
        } else {
          ruleComponents.push(`${key}=${value}`);
        }
      }
    }

    // Format as RRule
    return `RRULE:${ruleComponents.join(";")}`;
  }
}
