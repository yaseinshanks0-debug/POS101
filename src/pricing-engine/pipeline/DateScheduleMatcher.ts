/**
 * Pure Deterministic Schedule Matcher.
 * Uses explicit evaluation timestamp from context rather than system clock.
 */
export class DateScheduleMatcher {
  /**
   * Checks if an entity's date range and schedule is active at context timestamp.
   */
  public static isScheduleActive(
    contextTimestamp: string,
    validFrom?: string,
    validTo?: string,
    allowedDaysOfWeek?: number[],
    allowedTimeRange?: { startTime: string; endTime: string }
  ): { isActive: boolean; reason?: string } {
    const targetDate = new Date(contextTimestamp);
    if (isNaN(targetDate.getTime())) {
      return { isActive: false, reason: 'Invalid context timestamp' };
    }

    // 1. Date Range Validation (ISO 8601)
    if (validFrom) {
      const fromDate = new Date(validFrom);
      if (targetDate.getTime() < fromDate.getTime()) {
        return { isActive: false, reason: `Promotion not started yet (Starts: ${validFrom})` };
      }
    }

    if (validTo) {
      const toDate = new Date(validTo);
      if (targetDate.getTime() > toDate.getTime()) {
        return { isActive: false, reason: `Promotion has expired (Expired: ${validTo})` };
      }
    }

    // 2. Day of Week Validation (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    if (allowedDaysOfWeek && allowedDaysOfWeek.length > 0) {
      const currentDay = targetDate.getUTCDay();
      if (!allowedDaysOfWeek.includes(currentDay)) {
        return { isActive: false, reason: `Not valid on current day of week (${currentDay})` };
      }
    }

    // 3. Time of Day Validation ("HH:MM" 24-hour UTC or ISO local)
    if (allowedTimeRange && allowedTimeRange.startTime && allowedTimeRange.endTime) {
      const hours = targetDate.getUTCHours();
      const minutes = targetDate.getUTCMinutes();
      const currentMinutes = hours * 60 + minutes;

      const [startH, startM] = allowedTimeRange.startTime.split(':').map(Number);
      const [endH, endM] = allowedTimeRange.endTime.split(':').map(Number);

      const startTotal = startH * 60 + (startM || 0);
      const endTotal = endH * 60 + (endM || 0);

      if (currentMinutes < startTotal || currentMinutes > endTotal) {
        return {
          isActive: false,
          reason: `Outside scheduled hours (${allowedTimeRange.startTime} - ${allowedTimeRange.endTime})`
        };
      }
    }

    return { isActive: true };
  }
}
