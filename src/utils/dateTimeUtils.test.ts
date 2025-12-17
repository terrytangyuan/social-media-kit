import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getCurrentDateTimeString, formatTimezoneTime } from './dateTimeUtils';

describe('Date Time Utils', () => {
  describe('getCurrentDateTimeString', () => {
    it('should return datetime string in correct format', () => {
      const result = getCurrentDateTimeString();
      // Format should be YYYY-MM-DDTHH:mm
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should return current time', () => {
      const before = new Date();
      const result = getCurrentDateTimeString();
      const after = new Date();

      // Parse the result to verify it's between before and after
      const [datePart, timePart] = result.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      const resultDate = new Date(year, month - 1, day, hours, minutes);

      expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 60000); // Within 1 minute before
      expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 60000); // Within 1 minute after
    });

    it('should pad single-digit months with zero', () => {
      const mockDate = new Date(2024, 0, 15, 9, 5); // January 15, 2024, 09:05
      const originalDate = global.Date;

      global.Date = class extends originalDate {
        constructor() {
          super();
          return mockDate;
        }
      } as any;

      const result = getCurrentDateTimeString();
      expect(result).toBe('2024-01-15T09:05');

      global.Date = originalDate;
    });

    it('should pad single-digit days with zero', () => {
      const mockDate = new Date(2024, 11, 5, 14, 30); // December 5, 2024, 14:30
      const originalDate = global.Date;

      global.Date = class extends originalDate {
        constructor() {
          super();
          return mockDate;
        }
      } as any;

      const result = getCurrentDateTimeString();
      expect(result).toBe('2024-12-05T14:30');

      global.Date = originalDate;
    });

    it('should handle midnight correctly', () => {
      const mockDate = new Date(2024, 5, 15, 0, 0); // June 15, 2024, 00:00
      const originalDate = global.Date;

      global.Date = class extends originalDate {
        constructor() {
          super();
          return mockDate;
        }
      } as any;

      const result = getCurrentDateTimeString();
      expect(result).toBe('2024-06-15T00:00');

      global.Date = originalDate;
    });
  });

  describe('formatTimezoneTime', () => {
    it('should format datetime for specific timezone', () => {
      const datetime = '2024-01-15T14:30:00';
      const result = formatTimezoneTime(datetime, 'America/New_York');

      // Should include timezone name
      expect(result).toContain('EST');
      // Should include date components
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should handle different timezones correctly', () => {
      const datetime = '2024-06-15T12:00:00Z';

      const nyResult = formatTimezoneTime(datetime, 'America/New_York');
      const laResult = formatTimezoneTime(datetime, 'America/Los_Angeles');
      const londonResult = formatTimezoneTime(datetime, 'Europe/London');

      // All should be valid formatted strings
      expect(nyResult).toBeTruthy();
      expect(laResult).toBeTruthy();
      expect(londonResult).toBeTruthy();

      // Should be different due to timezone differences
      expect(nyResult).not.toBe(laResult);
    });

    it('should return empty string for empty input', () => {
      const result = formatTimezoneTime('', 'America/New_York');
      expect(result).toBe('');
    });

    it('should handle invalid datetime gracefully', () => {
      const invalidDate = 'not-a-date';
      const result = formatTimezoneTime(invalidDate, 'America/New_York');

      // new Date('not-a-date') creates Invalid Date, which toLocaleString returns as "Invalid Date"
      expect(result).toBe('Invalid Date');
    });

    it('should handle invalid timezone gracefully', () => {
      const datetime = '2024-01-15T14:30:00';
      const result = formatTimezoneTime(datetime, 'Invalid/Timezone');

      // Should either format with UTC or return original
      expect(result).toBeTruthy();
    });

    it('should include weekday in formatted output', () => {
      const datetime = '2024-01-15T14:30:00'; // This is a Monday
      const result = formatTimezoneTime(datetime, 'UTC');

      expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });

    it('should include time in formatted output', () => {
      const datetime = '2024-01-15T14:30:00';
      const result = formatTimezoneTime(datetime, 'America/New_York');

      // Should contain time pattern (e.g., "2:30 PM" or "14:30")
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle ISO datetime with timezone offset', () => {
      const datetime = '2024-01-15T14:30:00-05:00';
      const result = formatTimezoneTime(datetime, 'America/New_York');

      expect(result).toBeTruthy();
      expect(result).toContain('2024');
    });

    it('should handle UTC datetime', () => {
      const datetime = '2024-01-15T14:30:00Z';
      const result = formatTimezoneTime(datetime, 'UTC');

      expect(result).toBeTruthy();
      expect(result).toContain('UTC');
    });
  });
});
