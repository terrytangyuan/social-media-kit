// Utility functions for date and time formatting

/**
 * Get current date and time as ISO string in local timezone
 * Format: YYYY-MM-DDTHH:mm (compatible with datetime-local input)
 */
export const getCurrentDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Format a datetime string for a specific timezone
 * @param datetime - ISO datetime string
 * @param tz - IANA timezone identifier (e.g., "America/New_York")
 * @returns Formatted datetime string with timezone, or original string if formatting fails
 */
export const formatTimezoneTime = (datetime: string, tz: string) => {
  if (!datetime) return "";
  try {
    const date = new Date(datetime);
    return date.toLocaleString("en-US", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    });
  } catch {
    return datetime;
  }
};
