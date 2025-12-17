import { describe, it, expect } from '@jest/globals';
import { getPlatformLimits, IMAGE_LIMITS, EMOJI_CATEGORIES, COMMON_TIMEZONES } from './index';

describe('Constants', () => {
  describe('getPlatformLimits', () => {
    it('should return correct limits for regular Twitter', () => {
      const limits = getPlatformLimits(false);

      expect(limits.twitter).toBe(280);
      expect(limits.linkedin).toBe(3000);
      expect(limits.mastodon).toBe(500);
      expect(limits.bluesky).toBe(300);
    });

    it('should return correct limits for X Premium', () => {
      const limits = getPlatformLimits(true);

      expect(limits.twitter).toBe(25000);
      expect(limits.linkedin).toBe(3000);
      expect(limits.mastodon).toBe(500);
      expect(limits.bluesky).toBe(300);
    });

    it('should return different Twitter limits based on premium status', () => {
      const regularLimits = getPlatformLimits(false);
      const premiumLimits = getPlatformLimits(true);

      expect(premiumLimits.twitter).toBeGreaterThan(regularLimits.twitter);
      expect(premiumLimits.twitter).toBe(regularLimits.twitter * 89.28571428571429); // 25000/280
    });

    it('should return consistent limits for non-Twitter platforms', () => {
      const regularLimits = getPlatformLimits(false);
      const premiumLimits = getPlatformLimits(true);

      expect(premiumLimits.linkedin).toBe(regularLimits.linkedin);
      expect(premiumLimits.mastodon).toBe(regularLimits.mastodon);
      expect(premiumLimits.bluesky).toBe(regularLimits.bluesky);
    });

    it('should have LinkedIn as the highest character limit', () => {
      const limits = getPlatformLimits(false);
      const allLimits = Object.values(limits);

      expect(Math.max(...allLimits)).toBe(limits.linkedin);
    });

    it('should have Twitter as the lowest for regular users', () => {
      const limits = getPlatformLimits(false);
      const allLimits = Object.values(limits);

      expect(Math.min(...allLimits)).toBe(limits.twitter);
    });

    it('should have Bluesky as the lowest for X Premium users', () => {
      const limits = getPlatformLimits(true);
      const values = [limits.linkedin, limits.twitter, limits.mastodon, limits.bluesky];

      expect(Math.min(...values)).toBe(limits.bluesky);
    });
  });

  describe('IMAGE_LIMITS', () => {
    it('should have image limits for all platforms', () => {
      expect(IMAGE_LIMITS.linkedin).toBeDefined();
      expect(IMAGE_LIMITS.twitter).toBeDefined();
      expect(IMAGE_LIMITS.mastodon).toBeDefined();
      expect(IMAGE_LIMITS.bluesky).toBeDefined();
    });

    it('should have correct LinkedIn image limits', () => {
      expect(IMAGE_LIMITS.linkedin.maxImages).toBe(9);
      expect(IMAGE_LIMITS.linkedin.maxFileSize).toBe(5 * 1024 * 1024); // 5MB
    });

    it('should have correct Twitter image limits', () => {
      expect(IMAGE_LIMITS.twitter.maxImages).toBe(4);
      expect(IMAGE_LIMITS.twitter.maxFileSize).toBe(5 * 1024 * 1024); // 5MB
    });

    it('should have correct Mastodon image limits', () => {
      expect(IMAGE_LIMITS.mastodon.maxImages).toBe(4);
      expect(IMAGE_LIMITS.mastodon.maxFileSize).toBe(8 * 1024 * 1024); // 8MB
    });

    it('should have correct Bluesky image limits', () => {
      expect(IMAGE_LIMITS.bluesky.maxImages).toBe(4);
      expect(IMAGE_LIMITS.bluesky.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have LinkedIn with highest max images', () => {
      const maxImages = [
        IMAGE_LIMITS.linkedin.maxImages,
        IMAGE_LIMITS.twitter.maxImages,
        IMAGE_LIMITS.mastodon.maxImages,
        IMAGE_LIMITS.bluesky.maxImages
      ];

      expect(Math.max(...maxImages)).toBe(IMAGE_LIMITS.linkedin.maxImages);
    });

    it('should have Bluesky with largest max file size', () => {
      const maxFileSizes = [
        IMAGE_LIMITS.linkedin.maxFileSize,
        IMAGE_LIMITS.twitter.maxFileSize,
        IMAGE_LIMITS.mastodon.maxFileSize,
        IMAGE_LIMITS.bluesky.maxFileSize
      ];

      expect(Math.max(...maxFileSizes)).toBe(IMAGE_LIMITS.bluesky.maxFileSize);
    });

    it('should have all maxImages as positive numbers', () => {
      expect(IMAGE_LIMITS.linkedin.maxImages).toBeGreaterThan(0);
      expect(IMAGE_LIMITS.twitter.maxImages).toBeGreaterThan(0);
      expect(IMAGE_LIMITS.mastodon.maxImages).toBeGreaterThan(0);
      expect(IMAGE_LIMITS.bluesky.maxImages).toBeGreaterThan(0);
    });

    it('should have all maxFileSize in MB range', () => {
      const oneMB = 1024 * 1024;

      expect(IMAGE_LIMITS.linkedin.maxFileSize).toBeGreaterThanOrEqual(oneMB);
      expect(IMAGE_LIMITS.twitter.maxFileSize).toBeGreaterThanOrEqual(oneMB);
      expect(IMAGE_LIMITS.mastodon.maxFileSize).toBeGreaterThanOrEqual(oneMB);
      expect(IMAGE_LIMITS.bluesky.maxFileSize).toBeGreaterThanOrEqual(oneMB);
    });
  });

  describe('EMOJI_CATEGORIES', () => {
    it('should have all expected emoji categories', () => {
      expect(EMOJI_CATEGORIES['Smileys & People']).toBeDefined();
      expect(EMOJI_CATEGORIES['Animals & Nature']).toBeDefined();
      expect(EMOJI_CATEGORIES['Food & Drink']).toBeDefined();
      expect(EMOJI_CATEGORIES['Activities']).toBeDefined();
      expect(EMOJI_CATEGORIES['Travel & Places']).toBeDefined();
      expect(EMOJI_CATEGORIES['Objects']).toBeDefined();
      expect(EMOJI_CATEGORIES['Symbols']).toBeDefined();
    });

    it('should have emojis in each category', () => {
      Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
        expect(emojis.length).toBeGreaterThan(0);
      });
    });

    it('should have Smileys & People category with common emojis', () => {
      const smileys = EMOJI_CATEGORIES['Smileys & People'];

      expect(smileys).toContain('😀');
      expect(smileys).toContain('😊');
      expect(smileys).toContain('😍');
      expect(smileys).toContain('😂');
    });

    it('should have Animals & Nature category with common emojis', () => {
      const animals = EMOJI_CATEGORIES['Animals & Nature'];

      expect(animals).toContain('🐶');
      expect(animals).toContain('🐱');
      expect(animals).toContain('🐭');
    });

    it('should have Food & Drink category with common emojis', () => {
      const food = EMOJI_CATEGORIES['Food & Drink'];

      expect(food).toContain('🍕');
      expect(food).toContain('🍔');
      expect(food).toContain('🍎');
    });

    it('should have all categories as arrays', () => {
      Object.values(EMOJI_CATEGORIES).forEach(category => {
        expect(Array.isArray(category)).toBe(true);
      });
    });

    it('should have mostly unique emojis within each category', () => {
      Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
        const uniqueEmojis = new Set(emojis);
        // Allow some duplicates due to emoji variants, but should be mostly unique
        const uniquenessRatio = uniqueEmojis.size / emojis.length;
        expect(uniquenessRatio).toBeGreaterThan(0.85); // At least 85% unique
      });
    });

    it('should have 7 emoji categories', () => {
      expect(Object.keys(EMOJI_CATEGORIES).length).toBe(7);
    });
  });

  describe('COMMON_TIMEZONES', () => {
    it('should have timezone entries', () => {
      expect(COMMON_TIMEZONES.length).toBeGreaterThan(0);
    });

    it('should have all timezones with value and label properties', () => {
      COMMON_TIMEZONES.forEach(tz => {
        expect(tz).toHaveProperty('value');
        expect(tz).toHaveProperty('label');
        expect(typeof tz.value).toBe('string');
        expect(typeof tz.label).toBe('string');
      });
    });

    it('should include major US timezones', () => {
      const values = COMMON_TIMEZONES.map(tz => tz.value);

      expect(values).toContain('America/New_York');
      expect(values).toContain('America/Chicago');
      expect(values).toContain('America/Denver');
      expect(values).toContain('America/Los_Angeles');
    });

    it('should include major European timezones', () => {
      const values = COMMON_TIMEZONES.map(tz => tz.value);

      expect(values).toContain('Europe/London');
      expect(values).toContain('Europe/Paris');
      expect(values).toContain('Europe/Berlin');
    });

    it('should include major Asian timezones', () => {
      const values = COMMON_TIMEZONES.map(tz => tz.value);

      expect(values).toContain('Asia/Tokyo');
      expect(values).toContain('Asia/Shanghai');
      expect(values).toContain('Asia/Singapore');
    });

    it('should have valid IANA timezone format', () => {
      COMMON_TIMEZONES.forEach(tz => {
        // IANA timezone format: Continent/City or Pacific/Island
        // City names can have underscores (e.g., New_York, Los_Angeles)
        expect(tz.value).toMatch(/^[A-Z][a-z]+\/[A-Z][A-Za-z_]+$/);
      });
    });

    it('should have unique timezone values', () => {
      const values = COMMON_TIMEZONES.map(tz => tz.value);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have descriptive labels', () => {
      COMMON_TIMEZONES.forEach(tz => {
        expect(tz.label.length).toBeGreaterThan(2);
      });
    });

    it('should include Pacific/Honolulu for Hawaii', () => {
      const hawaii = COMMON_TIMEZONES.find(tz => tz.value === 'Pacific/Honolulu');

      expect(hawaii).toBeDefined();
      expect(hawaii?.label).toContain('Hawaii');
    });

    it('should include Australia timezones', () => {
      const australianTimezones = COMMON_TIMEZONES.filter(tz =>
        tz.value.startsWith('Australia/')
      );

      expect(australianTimezones.length).toBeGreaterThan(0);
    });

    it('should have at least 30 timezones for global coverage', () => {
      expect(COMMON_TIMEZONES.length).toBeGreaterThanOrEqual(30);
    });
  });
});
