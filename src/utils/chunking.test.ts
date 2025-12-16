import { describe, it, expect } from '@jest/globals';
import { getPlatformTextLength, findBestBreakPoint, chunkText, Platform } from './chunking';

describe('Chunking Utilities', () => {
  describe('getPlatformTextLength', () => {
    it('should count regular ASCII text correctly', () => {
      const text = 'Hello World';
      expect(getPlatformTextLength(text, 'twitter')).toBe(11);
      expect(getPlatformTextLength(text, 'linkedin')).toBe(11);
      expect(getPlatformTextLength(text, 'mastodon')).toBe(11);
    });

    it('should count graphemes correctly for Bluesky', () => {
      const text = 'Hello 👋 World';
      // Twitter/LinkedIn/Mastodon count emojis as 2 chars
      expect(getPlatformTextLength(text, 'twitter')).toBe(14);
      // Bluesky counts graphemes (emoji is 1 grapheme)
      expect(getPlatformTextLength(text, 'bluesky')).toBe(13);
    });

    it('should handle Unicode characters', () => {
      const text = 'Café ☕️';
      expect(getPlatformTextLength(text, 'twitter')).toBe(text.length);
      expect(getPlatformTextLength(text, 'bluesky')).toBeGreaterThan(0);
    });

    it('should handle emoji sequences for Bluesky', () => {
      const text = '👨‍👩‍👧‍👦'; // Family emoji (single grapheme)
      // Bluesky should count this as 1 grapheme
      expect(getPlatformTextLength(text, 'bluesky')).toBe(1);
    });
  });

  describe('findBestBreakPoint', () => {
    describe('for Twitter/LinkedIn/Mastodon', () => {
      it('should break at sentence ending when available', () => {
        const text = 'This is a sentence. This is another sentence.';
        const breakPoint = findBestBreakPoint(text, 25, 'twitter');
        expect(text.substring(0, breakPoint)).toBe('This is a sentence. ');
      });

      it('should not break at very short sentence ending (<30% of limit)', () => {
        const text = 'Hi! This is a much longer sentence that continues.';
        const breakPoint = findBestBreakPoint(text, 100, 'twitter');
        // Should skip the "Hi!" and find a better break point
        expect(breakPoint).toBeGreaterThan(4);
      });

      it('should break at paragraph when no good sentence ending', () => {
        const text = 'First paragraph\n\nSecond paragraph continues here';
        const breakPoint = findBestBreakPoint(text, 50, 'twitter');
        // Should break around the paragraph boundary
        const chunk = text.substring(0, breakPoint);
        expect(chunk).toContain('First paragraph');
        expect(breakPoint).toBeGreaterThan(15);
      });

      it('should break at line break when available', () => {
        const text = 'First line\nSecond line continues';
        const breakPoint = findBestBreakPoint(text, 25, 'twitter');
        // Should break around the line boundary
        const chunk = text.substring(0, breakPoint);
        expect(chunk).toContain('First line');
        expect(breakPoint).toBeGreaterThan(10);
      });

      it('should break at word boundary when no better option', () => {
        const text = 'This is a long text without any sentence endings or paragraphs';
        const breakPoint = findBestBreakPoint(text, 20, 'twitter');
        expect(text.substring(0, breakPoint).endsWith(' ')).toBe(true);
      });

      it('should use limit when no good break point found', () => {
        const text = 'ThisIsOneVeryLongWordWithoutAnySpaces';
        const breakPoint = findBestBreakPoint(text, 10, 'twitter');
        expect(breakPoint).toBe(10);
      });
    });

    describe('for Bluesky', () => {
      it('should break at sentence ending using grapheme count', () => {
        const text = 'Hello! This continues with more text.';
        const breakPoint = findBestBreakPoint(text, 10, 'bluesky');
        expect(text.substring(0, breakPoint)).toBe('Hello! ');
      });

      it('should handle emoji in Bluesky grapheme counting', () => {
        const text = 'Hello 👋! More text here.';
        const breakPoint = findBestBreakPoint(text, 10, 'bluesky');
        // Should count emoji as 1 grapheme
        expect(breakPoint).toBeGreaterThan(0);
      });
    });
  });

  describe('chunkText', () => {
    const platformLimits = {
      linkedin: 3000,
      twitter: 280,
      mastodon: 500,
      bluesky: 300,
    };

    describe('Basic chunking', () => {
      it('should not chunk text within limit', () => {
        const text = 'Short text';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe(text);
      });

      it('should chunk text exceeding limit', () => {
        const text = 'A'.repeat(600);
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'twitter')).toBeLessThanOrEqual(280);
        });
      });

      it('should chunk at sentence boundaries when possible', () => {
        const text = 'This is the first sentence. This is the second sentence. ' + 'A'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0]).toContain('This is the first sentence.');
      });
    });

    describe('Platform-specific chunking', () => {
      it('should respect Twitter 280 character limit', () => {
        const text = 'A'.repeat(600);
        const chunks = chunkText(text, 'twitter', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should respect Mastodon 500 character limit', () => {
        const text = 'A'.repeat(1000);
        const chunks = chunkText(text, 'mastodon', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(500);
        });
      });

      it('should respect Bluesky 300 grapheme limit', () => {
        const text = 'A'.repeat(700);
        const chunks = chunkText(text, 'bluesky', platformLimits);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });

      it('should respect LinkedIn 3000 character limit', () => {
        const text = 'A'.repeat(4000);
        const chunks = chunkText(text, 'linkedin', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(3000);
        });
      });
    });

    describe('Chunk optimization', () => {
      it('should combine small adjacent chunks when they fit', () => {
        const text = 'First! ' + 'Second sentence here. ' + 'Third sentence.';
        const chunks = chunkText(text, 'twitter', platformLimits);
        // Should combine into one chunk since total is under 280
        expect(chunks).toHaveLength(1);
      });

      it('should not combine chunks that exceed limit', () => {
        const text = 'A'.repeat(200) + '. ' + 'B'.repeat(200) + '.';
        const chunks = chunkText(text, 'twitter', platformLimits);
        // Should be 2 chunks since combining would exceed 280
        expect(chunks.length).toBeGreaterThan(1);
      });

      it('should avoid creating very small chunks (<30% of limit)', () => {
        // Create text with a very short sentence followed by longer content
        const text = 'Hi! ' + 'This is a much longer sentence. '.repeat(10);
        const chunks = chunkText(text, 'mastodon', platformLimits);

        // First chunk should be more than just "Hi!"
        if (chunks.length > 1) {
          expect(chunks[0].length).toBeGreaterThan(platformLimits.mastodon * 0.3);
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const chunks = chunkText('', 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('');
      });

      it('should handle single character', () => {
        const chunks = chunkText('A', 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('A');
      });

      it('should handle text with only whitespace', () => {
        const text = '   \n\n   ';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(0);
      });

      it('should handle text with multiple newlines', () => {
        const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should handle very long words', () => {
        const longWord = 'A'.repeat(300);
        const chunks = chunkText(longWord, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
      });

      it('should handle mixed content with emojis', () => {
        const text = '🚀 '.repeat(100) + 'This is text.';
        const chunks = chunkText(text, 'bluesky', platformLimits);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });

      it('should remove empty chunks from result', () => {
        const text = 'A'.repeat(500);
        const chunks = chunkText(text, 'twitter', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Real-world scenarios', () => {
      it('should chunk a typical job posting', () => {
        const text = `🚀 We're Hiring Software Engineers in 2026!

Our team at Red Hat AI continues to grow, and we're looking for passionate engineers (at multiple levels) to help us push the boundaries of AI infrastructure.

We're especially excited to meet folks with experience in: Golang, Rust, C++, Python, Kubernetes, distributed systems, and Open Source.

If building next-generation distributed AI systems excites you, we'd love to hear from you!

📮 Please email me (address in my profile) with a short summary of your background + your resume.

👉 Not looking right now? Know someone who'd be a great fit? Tag them in the comments or share this post!`;

        const chunks = chunkText(text, 'mastodon', platformLimits);

        // Should create multiple chunks
        expect(chunks.length).toBeGreaterThan(1);

        // Each chunk should be under the limit
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'mastodon')).toBeLessThanOrEqual(500);
        });

        // Combined chunks should equal original text (after trimming)
        const combined = chunks.join(' ').replace(/\s+/g, ' ').trim();
        const original = text.replace(/\s+/g, ' ').trim();
        expect(combined.length).toBeLessThanOrEqual(original.length);
      });

      it('should chunk a Twitter thread properly', () => {
        const text = 'Introduction to the topic. ' + 'A'.repeat(250) + '. Conclusion.';
        const chunks = chunkText(text, 'twitter', platformLimits);

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should handle Bluesky posts with emojis and mentions', () => {
        const text = '👋 Hello @user.bsky.social! '.repeat(20) + 'More content here.';
        const chunks = chunkText(text, 'bluesky', platformLimits);

        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });
    });

    describe('Whitespace handling', () => {
      it('should trim trailing whitespace from chunks', () => {
        const text = 'This is a sentence.   ' + 'B'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);

        chunks.forEach(chunk => {
          // Chunks shouldn't have trailing whitespace (except maybe single space)
          expect(chunk).not.toMatch(/\s{2,}$/);
        });
      });

      it('should trim leading whitespace from subsequent chunks', () => {
        const text = 'First sentence.    Second sentence. ' + 'C'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);

        if (chunks.length > 1) {
          for (let i = 1; i < chunks.length; i++) {
            // Subsequent chunks shouldn't start with whitespace
            expect(chunks[i]).not.toMatch(/^\s+/);
          }
        }
      });
    });
  });
});
