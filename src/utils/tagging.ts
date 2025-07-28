// Unified tagging system for social media platforms

export type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
  createdAt: string;
};

export type TaggingSystem = {
  personMappings: PersonMapping[];
  addPersonMapping: (person: Omit<PersonMapping, 'id' | 'createdAt'>) => PersonMapping;
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

  const addPersonMapping = (person: Omit<PersonMapping, 'id' | 'createdAt'>): PersonMapping => {
    const newPerson: PersonMapping = {
      ...person,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    personMappings.push(newPerson);
    return newPerson;
  };

  const updatePersonMapping = (id: string, updates: Partial<PersonMapping>): boolean => {
    const index = personMappings.findIndex(person => person.id === id);
    if (index === -1) return false;
    
    personMappings[index] = { ...personMappings[index], ...updates };
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