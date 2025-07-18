import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTaggingSystem, PersonMapping, TaggingSystem } from './tagging';

describe('Unified Tagging System', () => {
  let taggingSystem: TaggingSystem;

  beforeEach(() => {
    taggingSystem = createTaggingSystem();
  });

  describe('PersonMapping Management', () => {
    it('should add a new person mapping', () => {
      const person = taggingSystem.addPersonMapping({
        name: 'John Doe',
        displayName: 'John Doe',
        twitter: 'johndoe',
        bluesky: 'johndoe.bsky.social'
      });

      expect(person).toMatchObject({
        name: 'John Doe',
        displayName: 'John Doe',
        twitter: 'johndoe',
        bluesky: 'johndoe.bsky.social'
      });
      expect(person.id).toBeDefined();
      expect(person.createdAt).toBeDefined();
    });

    it('should update an existing person mapping', () => {
      const person = taggingSystem.addPersonMapping({
        name: 'Jane Smith',
        displayName: 'Jane Smith'
      });

      const updated = taggingSystem.updatePersonMapping(person.id, {
        twitter: 'janesmith',
        bluesky: 'jane.bsky.social'
      });

      expect(updated).toBe(true);
      const retrievedPerson = taggingSystem.getPersonMapping(person.id);
      expect(retrievedPerson?.twitter).toBe('janesmith');
      expect(retrievedPerson?.bluesky).toBe('jane.bsky.social');
    });

    it('should delete a person mapping', () => {
      const person = taggingSystem.addPersonMapping({
        name: 'Test User',
        displayName: 'Test User'
      });

      const deleted = taggingSystem.deletePersonMapping(person.id);
      expect(deleted).toBe(true);

      const retrievedPerson = taggingSystem.getPersonMapping(person.id);
      expect(retrievedPerson).toBeUndefined();
    });

    it('should return false when updating non-existent person', () => {
      const updated = taggingSystem.updatePersonMapping('non-existent-id', {
        name: 'Updated Name'
      });
      expect(updated).toBe(false);
    });

    it('should return false when deleting non-existent person', () => {
      const deleted = taggingSystem.deletePersonMapping('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should retrieve person mappings list', () => {
      taggingSystem.addPersonMapping({
        name: 'Person 1',
        displayName: 'Person 1'
      });

      taggingSystem.addPersonMapping({
        name: 'Person 2',
        displayName: 'Person 2'
      });

      const mappings = taggingSystem.personMappings;
      expect(mappings).toHaveLength(2);
      expect(mappings[0].name).toBe('Person 1');
      expect(mappings[1].name).toBe('Person 2');
    });
  });

  describe('Tag Format Validation', () => {
    it('should validate correct unified tag format', () => {
      expect(taggingSystem.validateTagFormat('@{John Doe}')).toBe(true);
      expect(taggingSystem.validateTagFormat('@{Jane Smith}')).toBe(true);
      expect(taggingSystem.validateTagFormat('@{Multi Word Name}')).toBe(true);
    });

    it('should reject invalid tag formats', () => {
      expect(taggingSystem.validateTagFormat('@John Doe')).toBe(false);
      expect(taggingSystem.validateTagFormat('{John Doe}')).toBe(false);
      expect(taggingSystem.validateTagFormat('@{}')).toBe(false);
      expect(taggingSystem.validateTagFormat('@{John Doe')).toBe(false);
      expect(taggingSystem.validateTagFormat('John Doe}')).toBe(false);
    });

    it('should handle whitespace in validation', () => {
      expect(taggingSystem.validateTagFormat(' @{John Doe} ')).toBe(true);
      expect(taggingSystem.validateTagFormat('@{ John Doe }')).toBe(true);
    });
  });

  describe('Tag Extraction', () => {
    it('should extract unified tags from text', () => {
      const text = 'Hello @{John Doe} and @{Jane Smith}!';
      const tags = taggingSystem.extractUnifiedTags(text);
      expect(tags).toEqual(['@{John Doe}', '@{Jane Smith}']);
    });

    it('should extract single tag', () => {
      const text = 'Hello @{John Doe}!';
      const tags = taggingSystem.extractUnifiedTags(text);
      expect(tags).toEqual(['@{John Doe}']);
    });

    it('should return empty array when no tags found', () => {
      const text = 'Hello world!';
      const tags = taggingSystem.extractUnifiedTags(text);
      expect(tags).toEqual([]);
    });

    it('should handle multiple occurrences of same tag', () => {
      const text = 'Hello @{John Doe} and thanks @{John Doe}!';
      const tags = taggingSystem.extractUnifiedTags(text);
      expect(tags).toEqual(['@{John Doe}', '@{John Doe}']);
    });

    it('should handle tags with special characters in names', () => {
      const text = 'Hello @{Dr. Smith-Jones} and @{Mary O\'Connor}!';
      const tags = taggingSystem.extractUnifiedTags(text);
      expect(tags).toEqual(['@{Dr. Smith-Jones}', '@{Mary O\'Connor}']);
    });
  });

  describe('Platform-Specific Tag Conversion', () => {
    beforeEach(() => {
      taggingSystem.addPersonMapping({
        name: 'John Doe',
        displayName: 'John Doe',
        twitter: 'johndoe',
        bluesky: 'johndoe.bsky.social'
      });

      taggingSystem.addPersonMapping({
        name: 'Jane Smith',
        displayName: 'Jane Smith',
        twitter: 'janesmith123'
      });
    });

    describe('LinkedIn conversion', () => {
      it('should convert to display names for LinkedIn', () => {
        const text = 'Hello @{John Doe} and @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'linkedin');
        expect(converted).toBe('Hello @John Doe and @Jane Smith!');
      });

      it('should handle unmapped persons with display name fallback', () => {
        const text = 'Hello @{Unknown Person}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'linkedin');
        expect(converted).toBe('Hello @Unknown Person!');
      });
    });

    describe('Twitter conversion', () => {
      it('should convert to Twitter handles', () => {
        const text = 'Hello @{John Doe} and @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @johndoe and @janesmith123!');
      });

      it('should fallback to display name when no Twitter handle', () => {
        taggingSystem.addPersonMapping({
          name: 'No Twitter',
          displayName: 'No Twitter User'
        });

        const text = 'Hello @{No Twitter}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello No Twitter User!');
      });

      it('should remove @ prefix from Twitter handles', () => {
        taggingSystem.addPersonMapping({
          name: 'Test User',
          displayName: 'Test User',
          twitter: '@testuser' // Handle with @ prefix
        });

        const text = 'Hello @{Test User}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @testuser!');
      });
    });

    describe('Bluesky conversion', () => {
      it('should convert to Bluesky handles', () => {
        const text = 'Hello @{John Doe}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'bluesky');
        expect(converted).toBe('Hello @johndoe.bsky.social!');
      });

      it('should fallback to display name when no Bluesky handle', () => {
        const text = 'Hello @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'bluesky');
        expect(converted).toBe('Hello Jane Smith!');
      });

      it('should remove @ prefix from Bluesky handles', () => {
        taggingSystem.addPersonMapping({
          name: 'Test User',
          displayName: 'Test User',
          bluesky: '@test.bsky.social' // Handle with @ prefix
        });

        const text = 'Hello @{Test User}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'bluesky');
        expect(converted).toBe('Hello @test.bsky.social!');
      });

      it('should handle mentions followed by punctuation correctly', () => {
        const testCases = [
          { input: '@{John Doe}.', expected: '@johndoe.bsky.social.' },
          { input: '@{John Doe}!', expected: '@johndoe.bsky.social!' },
          { input: '@{John Doe}?', expected: '@johndoe.bsky.social?' },
          { input: '@{John Doe},', expected: '@johndoe.bsky.social,' },
          { input: '@{John Doe};', expected: '@johndoe.bsky.social;' },
          { input: '@{John Doe}:', expected: '@johndoe.bsky.social:' },
        ];

        testCases.forEach(({ input, expected }) => {
          const converted = taggingSystem.convertUnifiedTags(input, 'bluesky');
          expect(converted).toBe(expected);
        });
      });

      it('should handle display name fallbacks with punctuation', () => {
        const testCases = [
          { input: '@{Jane Smith}.', expected: 'Jane Smith.' },
          { input: '@{Jane Smith}!', expected: 'Jane Smith!' },
          { input: '@{Jane Smith}?', expected: 'Jane Smith?' },
        ];

        testCases.forEach(({ input, expected }) => {
          const converted = taggingSystem.convertUnifiedTags(input, 'bluesky');
          expect(converted).toBe(expected);
        });
      });
    });

    describe('Case-insensitive matching', () => {
      it('should match person names case-insensitively', () => {
        const text = 'Hello @{john doe} and @{JANE SMITH}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @johndoe and @janesmith123!');
      });

      it('should match display names case-insensitively', () => {
        taggingSystem.addPersonMapping({
          name: 'test-user',
          displayName: 'Test User',
          twitter: 'testuser'
        });

        const text = 'Hello @{test user} and @{TEST USER}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @testuser and @testuser!');
      });
    });

    describe('Complex scenarios', () => {
      it('should handle mixed mapped and unmapped persons', () => {
        const text = 'Hello @{John Doe}, @{Unknown Person}, and @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @johndoe, Unknown Person, and @janesmith123!');
      });

      it('should handle mixed mapped and unmapped persons for BlueSky (no @ for unmapped)', () => {
        const text = 'Hello @{John Doe}, @{Unknown Person}, and @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'bluesky');
        expect(converted).toBe('Hello @johndoe.bsky.social, Unknown Person, and Jane Smith!');
      });

      it('should handle mixed mapped and unmapped persons for Twitter (no @ for unmapped)', () => {
        const text = 'Hello @{John Doe}, @{Unknown Person}, and @{Jane Smith}!';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('Hello @johndoe, Unknown Person, and @janesmith123!');
      });

      it('should preserve text formatting around tags', () => {
        const text = 'Thanks to @{John Doe} for the **great** _work_!';
        const converted = taggingSystem.convertUnifiedTags(text, 'linkedin');
        expect(converted).toBe('Thanks to @John Doe for the **great** _work_!');
      });

      it('should handle tags at beginning and end of text', () => {
        const text = '@{John Doe} says hello to @{Jane Smith}';
        const converted = taggingSystem.convertUnifiedTags(text, 'twitter');
        expect(converted).toBe('@johndoe says hello to @janesmith123');
      });
    });
  });
}); 