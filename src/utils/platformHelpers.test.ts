import { describe, it, expect } from '@jest/globals';
import { extractPostInfo, isAuthenticationError, capitalizePlatform, getPlatformDisplayName } from './platformHelpers';

describe('Platform Helpers', () => {
  describe('extractPostInfo', () => {
    describe('Twitter', () => {
      it('should extract Twitter post ID and URL', () => {
        const result = {
          data: {
            data: {
              id: '1234567890'
            }
          }
        };

        const { postId, postUrl } = extractPostInfo('twitter', result);

        expect(postId).toBe('1234567890');
        expect(postUrl).toBe('https://twitter.com/i/status/1234567890');
      });

      it('should return empty strings for invalid Twitter response', () => {
        const result = {};
        const { postId, postUrl } = extractPostInfo('twitter', result);

        expect(postId).toBe('');
        expect(postUrl).toBe('');
      });
    });

    describe('LinkedIn', () => {
      it('should extract LinkedIn post ID', () => {
        const result = {
          data: {
            id: 'urn:li:share:1234567890'
          }
        };

        const { postId, postUrl } = extractPostInfo('linkedin', result);

        expect(postId).toBe('urn:li:share:1234567890');
        expect(postUrl).toBe(''); // LinkedIn URLs are not constructed
      });

      it('should return empty strings for invalid LinkedIn response', () => {
        const result = {};
        const { postId, postUrl } = extractPostInfo('linkedin', result);

        expect(postId).toBe('');
        expect(postUrl).toBe('');
      });
    });

    describe('Bluesky', () => {
      it('should extract Bluesky post ID and construct URL', () => {
        const result = {
          uri: 'at://did:plc:abc123/app.bsky.feed.post/xyz789'
        };

        const { postId, postUrl } = extractPostInfo('bluesky', result, 'user.bsky.social');

        expect(postId).toBe('at://did:plc:abc123/app.bsky.feed.post/xyz789');
        expect(postUrl).toBe('https://bsky.app/profile/user.bsky.social/post/xyz789');
      });

      it('should handle Bluesky without handle', () => {
        const result = {
          uri: 'at://did:plc:abc123/app.bsky.feed.post/xyz789'
        };

        const { postId, postUrl } = extractPostInfo('bluesky', result);

        expect(postId).toBe('at://did:plc:abc123/app.bsky.feed.post/xyz789');
        expect(postUrl).toBe('');
      });

      it('should return empty strings for invalid Bluesky response', () => {
        const result = {};
        const { postId, postUrl } = extractPostInfo('bluesky', result, 'user.bsky.social');

        expect(postId).toBe('');
        expect(postUrl).toBe('');
      });
    });

    describe('Mastodon', () => {
      it('should extract Mastodon post ID and URL', () => {
        const result = {
          data: {
            id: '123456',
            url: 'https://mastodon.social/@user/123456'
          }
        };

        const { postId, postUrl } = extractPostInfo('mastodon', result);

        expect(postId).toBe('123456');
        expect(postUrl).toBe('https://mastodon.social/@user/123456');
      });

      it('should handle Mastodon response without URL', () => {
        const result = {
          data: {
            id: '123456'
          }
        };

        const { postId, postUrl } = extractPostInfo('mastodon', result);

        expect(postId).toBe('123456');
        expect(postUrl).toBe('');
      });

      it('should return empty strings for invalid Mastodon response', () => {
        const result = {};
        const { postId, postUrl } = extractPostInfo('mastodon', result);

        expect(postId).toBe('');
        expect(postUrl).toBe('');
      });
    });
  });

  describe('isAuthenticationError', () => {
    it('should detect "Authentication failed" error', () => {
      const error = new Error('Authentication failed');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect "401" error', () => {
      const error = new Error('Error 401: Unauthorized access');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect "Unauthorized" error', () => {
      const error = new Error('Unauthorized request');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect session expiry error', () => {
      const error = new Error('Your session may have expired');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect reconnect message', () => {
      const error = new Error('Please reconnect your account');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect invalid token error', () => {
      const error = new Error('Invalid access token provided');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should handle string errors', () => {
      expect(isAuthenticationError('Authentication failed')).toBe(true);
      expect(isAuthenticationError('401')).toBe(true);
    });

    it('should handle unknown error types', () => {
      const error = { message: 'Authentication failed' };
      // String({message: '...'}) returns "[object Object]", which won't match auth patterns
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for non-auth errors', () => {
      const error = new Error('Network error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Something went wrong');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should handle null error', () => {
      expect(isAuthenticationError(null)).toBe(false);
    });

    it('should handle undefined error', () => {
      expect(isAuthenticationError(undefined)).toBe(false);
    });
  });

  describe('capitalizePlatform', () => {
    it('should capitalize lowercase platform name', () => {
      expect(capitalizePlatform('linkedin')).toBe('Linkedin');
      expect(capitalizePlatform('twitter')).toBe('Twitter');
      expect(capitalizePlatform('mastodon')).toBe('Mastodon');
      expect(capitalizePlatform('bluesky')).toBe('Bluesky');
    });

    it('should handle already capitalized names', () => {
      expect(capitalizePlatform('LinkedIn')).toBe('LinkedIn');
      expect(capitalizePlatform('Twitter')).toBe('Twitter');
    });

    it('should handle single character', () => {
      expect(capitalizePlatform('x')).toBe('X');
    });

    it('should handle empty string', () => {
      expect(capitalizePlatform('')).toBe('');
    });

    it('should handle uppercase string', () => {
      expect(capitalizePlatform('LINKEDIN')).toBe('LINKEDIN');
    });
  });

  describe('getPlatformDisplayName', () => {
    it('should return correct display name for LinkedIn', () => {
      expect(getPlatformDisplayName('linkedin')).toBe('LinkedIn');
    });

    it('should return correct display name for Twitter', () => {
      expect(getPlatformDisplayName('twitter')).toBe('X/Twitter');
    });

    it('should return correct display name for Mastodon', () => {
      expect(getPlatformDisplayName('mastodon')).toBe('Mastodon');
    });

    it('should return correct display name for Bluesky', () => {
      expect(getPlatformDisplayName('bluesky')).toBe('Bluesky');
    });

    it('should fallback to capitalized name for unknown platform', () => {
      const unknownPlatform = 'unknown' as any;
      expect(getPlatformDisplayName(unknownPlatform)).toBe('Unknown');
    });
  });
});
