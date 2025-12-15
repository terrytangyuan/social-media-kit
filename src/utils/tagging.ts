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
 * Create a new tagging system instance
 */
export const createTaggingSystem = (): TaggingSystem => {
  const personMappings: PersonMapping[] = [];

  const addPersonMapping = (person: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>): PersonMapping => {
    const timestamp = new Date().toISOString();
    const newPerson: PersonMapping = {
      ...person,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    personMappings.push(newPerson);
    return newPerson;
  };

  const updatePersonMapping = (id: string, updates: Partial<PersonMapping>): boolean => {
    const index = personMappings.findIndex(person => person.id === id);
    if (index === -1) return false;

    personMappings[index] = { ...personMappings[index], ...updates, updatedAt: new Date().toISOString() };
    return true;
  };

  const deletePersonMapping = (id: string): boolean => {
    const index = personMappings.findIndex(person => person.id === id);
    if (index === -1) return false;
    
    personMappings.splice(index, 1);
    return true;
  };

  const getPersonMapping = (id: string): PersonMapping | undefined => {
    return personMappings.find(person => person.id === id);
  };

  const validateTagFormat = (tag: string): boolean => {
    // Check for @{Person Name} format
    return /^@\{.+\}$/.test(tag.trim());
  };

  const extractUnifiedTags = (text: string): string[] => {
    const tagRegex = /@\{([^}]+)\}/g;
    const matches = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      matches.push(match[0]); // Full match including @{}
    }
    
    return matches;
  };

  const convertUnifiedTags = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string => {
    return text.replace(/@\{([^}]+)\}/g, (match, personName) => {
      // Find person mapping by display name
      const person = personMappings.find(p => 
        p.displayName.toLowerCase() === personName.toLowerCase() ||
        p.name.toLowerCase() === personName.toLowerCase()
      );

      if (!person) {
        // If no mapping found, handle based on platform
        if (platform === 'bluesky' || platform === 'twitter') {
          // For BlueSky and Twitter, return without @ since unmapped names can't be resolved to handles/DIDs
          return personName;
        }
        // For other platforms (LinkedIn), keep the @ symbol
        return `@${personName}`;
      }

      switch (platform) {
        case 'linkedin':
          // LinkedIn uses display names
          return `@${person.displayName}`;
        
        case 'twitter':
          // Twitter uses handles (without @)
          // If no twitter handle specified, return display name without @ since it can't be resolved to handle
          return person.twitter ? `@${person.twitter.replace(/^@/, '')}` : person.displayName;
        
        case 'bluesky':
          // Bluesky uses handles (can include domain)
          // If no bluesky handle specified, return display name without @ since it can't be resolved to DID
          return person.bluesky ? `@${person.bluesky.replace(/^@/, '')}` : person.displayName;
        
        default:
          return `@${person.displayName}`;
      }
    });
  };

  return {
    get personMappings() { return [...personMappings]; },
    addPersonMapping,
    updatePersonMapping,
    deletePersonMapping,
    getPersonMapping,
    convertUnifiedTags,
    validateTagFormat,
    extractUnifiedTags,
  };
};

/**
 * Default tagging system instance
 */
export const defaultTaggingSystem = createTaggingSystem();

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
          return person.twitter ? `@${person.twitter}` : person.displayName;
        case 'mastodon':
          return person.mastodon ? `@${person.mastodon}` : person.displayName;
        case 'bluesky':
          return person.bluesky ? `@${person.bluesky}` : person.displayName;
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