/**
 * Safe localStorage operations with error handling
 */

export const setItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

export const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

// Specific storage keys
export const STORAGE_KEYS = {
  SOCIAL_MEDIA_DRAFT: 'socialMediaDraft',
  DARK_MODE: 'darkMode',
  SCHEDULE_TIME: 'scheduleTime',
  TIMEZONE: 'timezone',
  SOCIAL_MEDIA_POSTS: 'socialMediaPosts',
  PLATFORM_AUTH: 'platformAuth',
  OAUTH_CONFIG: 'oauthConfig',
  UNIFIED_TAGGING: 'unifiedTagging'
} as const; 