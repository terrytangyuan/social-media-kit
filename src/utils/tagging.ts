// Unified tagging system for social media platforms
import { PersonMapping } from '../types';

export type TaggingSystem = {
  personMappings: PersonMapping[];
  addPersonMapping: (person: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>) => PersonMapping;
  updatePersonMapping: (id: string, updates: Partial<PersonMapping>) => boolean;
  deletePersonMapping: (id: string) => boolean;
  getPersonMapping: (id: string) => PersonMapping | undefined;
  convertUnifiedTags: (text: string, platform: 'linkedin' | 'twitter' | 'bluesky') => string;
  validateTagFormat: (tag: string) => boolean;
  extractUnifiedTags: (text: string) => string[];
};

/**
 * Generate a unique ID for person mappings
 */
const generateId = (): string => {
  return `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Process unified tags like @{Person Name} and convert them to platform-specific formats
 * This is a standalone utility function that can be used with any person mappings array
 */
export const processUnifiedTags = (
  text: string,
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  personMappings: PersonMapping[]
): string => {
  let processedText = text;

  // Process unified tags like @{Person Name}
  const tagPattern = /@\{([^}]+)\}/g;
  processedText = processedText.replace(tagPattern, (match, personName) => {
    const person = personMappings.find(p =>
      p.name.toLowerCase() === personName.toLowerCase() ||
      p.displayName.toLowerCase() === personName.toLowerCase()
    );

    if (person) {
      switch (platform) {
        case 'linkedin':
          // For LinkedIn, always use display name since manual tagging is required
          return `@${person.displayName}`;
        case 'twitter':
          // Remove @ prefix if present, then add it back
          return person.twitter ? `@${person.twitter.replace(/^@/, '')}` : person.displayName;
        case 'mastodon':
          // Remove @ prefix if present, then add it back
          return person.mastodon ? `@${person.mastodon.replace(/^@/, '')}` : person.displayName;
        case 'bluesky':
          // Remove @ prefix if present, then add it back
          return person.bluesky ? `@${person.bluesky.replace(/^@/, '')}` : person.displayName;
        default:
          return `@${person.displayName}`;
      }
    }

    // If no mapping found, handle based on platform
    if (platform === 'bluesky' || platform === 'twitter' || platform === 'mastodon') {
      // For BlueSky, Twitter, and Mastodon, return without @ since unmapped names can't be resolved to handles/DIDs
      return personName;
    }
    // For other platforms (LinkedIn), keep the @ symbol
    return `@${personName}`;
  });

  return processedText;
};

/**
 * Format text for a specific platform by processing unified tags and applying Unicode styling
 * Requires the toUnicodeStyle function from textFormatting utilities
 */
export const formatForPlatform = (
  text: string,
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  personMappings: PersonMapping[],
  applyUnicodeStyle: (text: string) => string
): string => {
  // First process unified tags, then apply Unicode styling
  const processedText = processUnifiedTags(text, platform, personMappings);
  return applyUnicodeStyle(processedText);
};

/**
 * Create a new tagging system instance with person mapping management
 * This factory function is used by tests and can be used to create isolated tagging systems
 */
export const createTaggingSystem = (): TaggingSystem => {
  const personMappings: PersonMapping[] = [];

  return {
    personMappings,

    addPersonMapping(person: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>): PersonMapping {
      const now = new Date().toISOString();
      const newPerson: PersonMapping = {
        ...person,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      };
      personMappings.push(newPerson);
      return newPerson;
    },

    updatePersonMapping(id: string, updates: Partial<PersonMapping>): boolean {
      const index = personMappings.findIndex(p => p.id === id);
      if (index === -1) return false;

      personMappings[index] = {
        ...personMappings[index],
        ...updates,
        id: personMappings[index].id, // Preserve ID
        createdAt: personMappings[index].createdAt, // Preserve creation date
        updatedAt: new Date().toISOString()
      };
      return true;
    },

    deletePersonMapping(id: string): boolean {
      const index = personMappings.findIndex(p => p.id === id);
      if (index === -1) return false;
      personMappings.splice(index, 1);
      return true;
    },

    getPersonMapping(id: string): PersonMapping | undefined {
      return personMappings.find(p => p.id === id);
    },

    convertUnifiedTags(text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string {
      return processUnifiedTags(text, platform, personMappings);
    },

    validateTagFormat(tag: string): boolean {
      // Validate @{Name} format (trim whitespace first)
      return /^@\{[^}]+\}$/.test(tag.trim());
    },

    extractUnifiedTags(text: string): string[] {
      const tagPattern = /@\{([^}]+)\}/g;
      const tags: string[] = [];
      let match;
      while ((match = tagPattern.exec(text)) !== null) {
        tags.push(match[0]); // Full tag including @{}
      }
      return tags;
    }
  };
}; 