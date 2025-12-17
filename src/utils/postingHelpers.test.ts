import { describe, it, expect } from '@jest/globals';
import { getPostDelay } from './postingHelpers';

describe('Posting Helpers', () => {
  describe('getPostDelay', () => {
    describe('chunk delays', () => {
      it('should return 5000ms for Twitter chunk delay', () => {
        expect(getPostDelay('twitter', 'chunk')).toBe(5000);
      });

      it('should return 2000ms for LinkedIn chunk delay', () => {
        expect(getPostDelay('linkedin', 'chunk')).toBe(2000);
      });

      it('should return 2000ms for Mastodon chunk delay', () => {
        expect(getPostDelay('mastodon', 'chunk')).toBe(2000);
      });

      it('should return 2000ms for Bluesky chunk delay', () => {
        expect(getPostDelay('bluesky', 'chunk')).toBe(2000);
      });

      it('should use chunk delay as default when delayType not specified', () => {
        expect(getPostDelay('twitter')).toBe(5000);
        expect(getPostDelay('linkedin')).toBe(2000);
        expect(getPostDelay('mastodon')).toBe(2000);
        expect(getPostDelay('bluesky')).toBe(2000);
      });
    });

    describe('platform delays', () => {
      it('should return 3000ms for Twitter platform delay', () => {
        expect(getPostDelay('twitter', 'platform')).toBe(3000);
      });

      it('should return 1000ms for LinkedIn platform delay', () => {
        expect(getPostDelay('linkedin', 'platform')).toBe(1000);
      });

      it('should return 1000ms for Mastodon platform delay', () => {
        expect(getPostDelay('mastodon', 'platform')).toBe(1000);
      });

      it('should return 1000ms for Bluesky platform delay', () => {
        expect(getPostDelay('bluesky', 'platform')).toBe(1000);
      });
    });

    describe('delay differences', () => {
      it('should have different delays for Twitter vs other platforms for chunks', () => {
        const twitterDelay = getPostDelay('twitter', 'chunk');
        const linkedinDelay = getPostDelay('linkedin', 'chunk');

        expect(twitterDelay).toBeGreaterThan(linkedinDelay);
      });

      it('should have different delays for Twitter vs other platforms', () => {
        const twitterDelay = getPostDelay('twitter', 'platform');
        const linkedinDelay = getPostDelay('linkedin', 'platform');

        expect(twitterDelay).toBeGreaterThan(linkedinDelay);
      });

      it('should have longer chunk delays than platform delays for Twitter', () => {
        const chunkDelay = getPostDelay('twitter', 'chunk');
        const platformDelay = getPostDelay('twitter', 'platform');

        expect(chunkDelay).toBeGreaterThan(platformDelay);
      });

      it('should have longer chunk delays than platform delays for other platforms', () => {
        const chunkDelay = getPostDelay('linkedin', 'chunk');
        const platformDelay = getPostDelay('linkedin', 'platform');

        expect(chunkDelay).toBeGreaterThan(platformDelay);
      });
    });
  });
});
