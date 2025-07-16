import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the unified tagging types and functions
type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
  createdAt: string;
  updatedAt: string;
};

type Platform = 'linkedin' | 'twitter' | 'bluesky';

// Mock utility functions for tagging
const convertUnifiedTags = (text: string, platform: Platform, personMappings: PersonMapping[]): string => {
  // Find all @{PersonName} patterns
  return text.replace(/@\{([^}]+)\}/g, (match, personName) => {
    const person = personMappings.find(p => 
      p.name.toLowerCase() === personName.toLowerCase() ||
      p.displayName.toLowerCase() === personName.toLowerCase()
    );
    
    if (!person) {
      return match; // Keep original if person not found
    }
    
    switch (platform) {
      case 'linkedin':
        return `@${person.displayName}`;
      case 'twitter':
        return person.twitter ? `@${person.twitter}` : match;
      case 'bluesky':
        return person.bluesky ? `@${person.bluesky}` : match;
      default:
        return match;
    }
  });
};

const extractMentions = (text: string): string[] => {
  const mentions: string[] = [];
  const regex = /@\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

const validatePersonMapping = (person: Partial<PersonMapping>): string[] => {
  const errors: string[] = [];
  
  if (!person.name || person.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!person.displayName || person.displayName.trim().length === 0) {
    errors.push('Display name is required');
  }
  
  if (person.twitter && !person.twitter.match(/^[a-zA-Z0-9_]+$/)) {
    errors.push('Twitter handle must contain only letters, numbers, and underscores');
  }
  
  if (person.bluesky && !person.bluesky.includes('.')) {
    errors.push('Bluesky handle must be a valid domain format');
  }
  
  return errors;
};

const createPersonMapping = (
  name: string,
  displayName: string,
  twitter?: string,
  bluesky?: string
): PersonMapping => {
  const now = new Date().toISOString();
  return {
    id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    displayName: displayName.trim(),
    twitter: twitter?.trim(),
    bluesky: bluesky?.trim(),
    createdAt: now,
    updatedAt: now,
  };
};

describe('Unified Tagging System', () => {
  let mockPersonMappings: PersonMapping[];

  beforeEach(() => {
    mockPersonMappings = [
      {
        id: 'person_1',
        name: 'john',
        displayName: 'John Doe',
        twitter: 'johndoe',
        bluesky: 'john.doe.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'person_2',
        name: 'jane',
        displayName: 'Jane Smith',
        twitter: 'janesmith',
        bluesky: 'jane.smith.bsky.social',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'person_3',
        name: 'bob',
        displayName: 'Bob Wilson',
        twitter: undefined, // No Twitter handle
        bluesky: 'bob.wilson.xyz',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
  });

  describe('convertUnifiedTags', () => {
    it('should convert unified tags to LinkedIn format', () => {
      const text = 'Hello @{john} and @{jane}!';
      const result = convertUnifiedTags(text, 'linkedin', mockPersonMappings);
      expect(result).toBe('Hello @John Doe and @Jane Smith!');
    });

    it('should convert unified tags to Twitter format', () => {
      const text = 'Hello @{john} and @{jane}!';
      const result = convertUnifiedTags(text, 'twitter', mockPersonMappings);
      expect(result).toBe('Hello @johndoe and @janesmith!');
    });

    it('should convert unified tags to Bluesky format', () => {
      const text = 'Hello @{john} and @{jane}!';
      const result = convertUnifiedTags(text, 'bluesky', mockPersonMappings);
      expect(result).toBe('Hello @john.doe.com and @jane.smith.bsky.social!');
    });

    it('should handle case-insensitive person name matching', () => {
      const text = 'Hello @{JOHN} and @{Jane}!';
      const result = convertUnifiedTags(text, 'linkedin', mockPersonMappings);
      expect(result).toBe('Hello @John Doe and @Jane Smith!');
    });

    it('should match by display name as well as name', () => {
      const text = 'Hello @{John Doe}!';
      const result = convertUnifiedTags(text, 'twitter', mockPersonMappings);
      expect(result).toBe('Hello @johndoe!');
    });

    it('should keep original tag if person not found', () => {
      const text = 'Hello @{unknown}!';
      const result = convertUnifiedTags(text, 'linkedin', mockPersonMappings);
      expect(result).toBe('Hello @{unknown}!');
    });

    it('should handle missing platform handles gracefully', () => {
      const text = 'Hello @{bob}!'; // Bob has no Twitter handle
      const result = convertUnifiedTags(text, 'twitter', mockPersonMappings);
      expect(result).toBe('Hello @{bob}!'); // Should keep original
    });

    it('should handle multiple occurrences of the same person', () => {
      const text = '@{john} mentioned @{john} again';
      const result = convertUnifiedTags(text, 'twitter', mockPersonMappings);
      expect(result).toBe('@johndoe mentioned @johndoe again');
    });

    it('should handle tags within larger text blocks', () => {
      const text = `
        Great meeting today with @{john} and @{jane}.
        Looking forward to collaborating with @{bob} next week.
      `;
      const result = convertUnifiedTags(text, 'linkedin', mockPersonMappings);
      expect(result).toContain('@John Doe');
      expect(result).toContain('@Jane Smith');
      expect(result).toContain('@Bob Wilson');
    });
  });

  describe('extractMentions', () => {
    it('should extract all mention names from text', () => {
      const text = 'Hello @{john} and @{jane}!';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['john', 'jane']);
    });

    it('should handle no mentions', () => {
      const text = 'Hello world!';
      const mentions = extractMentions(text);
      expect(mentions).toEqual([]);
    });

    it('should handle duplicate mentions', () => {
      const text = '@{john} said @{john} would help';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['john', 'john']);
    });

    it('should handle mentions with spaces in names', () => {
      const text = 'Hello @{John Doe} and @{Jane Smith}!';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['John Doe', 'Jane Smith']);
    });

    it('should handle malformed tags gracefully', () => {
      const text = 'Hello @{john and @jane}!';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['john and @jane']);
    });
  });

  describe('validatePersonMapping', () => {
    it('should pass validation for valid person mapping', () => {
      const person = {
        name: 'john',
        displayName: 'John Doe',
        twitter: 'johndoe',
        bluesky: 'john.doe.com',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toEqual([]);
    });

    it('should require name', () => {
      const person = {
        displayName: 'John Doe',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toContain('Name is required');
    });

    it('should require display name', () => {
      const person = {
        name: 'john',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toContain('Display name is required');
    });

    it('should validate Twitter handle format', () => {
      const person = {
        name: 'john',
        displayName: 'John Doe',
        twitter: 'john@doe!',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toContain('Twitter handle must contain only letters, numbers, and underscores');
    });

    it('should validate Bluesky handle format', () => {
      const person = {
        name: 'john',
        displayName: 'John Doe',
        bluesky: 'johndoe',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toContain('Bluesky handle must be a valid domain format');
    });

    it('should allow optional Twitter and Bluesky handles', () => {
      const person = {
        name: 'john',
        displayName: 'John Doe',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toEqual([]);
    });

    it('should handle empty string fields', () => {
      const person = {
        name: '',
        displayName: '',
        twitter: '',
        bluesky: '',
      };
      const errors = validatePersonMapping(person);
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Display name is required');
    });
  });

  describe('createPersonMapping', () => {
    it('should create person mapping with required fields', () => {
      const person = createPersonMapping('john', 'John Doe');
      
      expect(person.name).toBe('john');
      expect(person.displayName).toBe('John Doe');
      expect(person.id).toMatch(/^person_/);
      expect(person.createdAt).toBeDefined();
      expect(person.updatedAt).toBeDefined();
      expect(person.createdAt).toBe(person.updatedAt);
    });

    it('should create person mapping with optional handles', () => {
      const person = createPersonMapping('john', 'John Doe', 'johndoe', 'john.doe.com');
      
      expect(person.twitter).toBe('johndoe');
      expect(person.bluesky).toBe('john.doe.com');
    });

    it('should trim whitespace from inputs', () => {
      const person = createPersonMapping('  john  ', '  John Doe  ', '  johndoe  ', '  john.doe.com  ');
      
      expect(person.name).toBe('john');
      expect(person.displayName).toBe('John Doe');
      expect(person.twitter).toBe('johndoe');
      expect(person.bluesky).toBe('john.doe.com');
    });

    it('should generate unique IDs', () => {
      const person1 = createPersonMapping('john1', 'John One');
      const person2 = createPersonMapping('john2', 'John Two');
      
      expect(person1.id).not.toBe(person2.id);
    });
  });
}); 