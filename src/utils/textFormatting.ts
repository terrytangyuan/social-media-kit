import { PersonMapping } from '../types';

// Platform character limits
export const PLATFORM_LIMITS = {
  linkedin: 3000, // LinkedIn doesn't have strict limit, but 3000 is good practice
  twitter: 280,
  bluesky: 300
};

/**
 * Convert text to bold Unicode characters
 */
export const toBold = (input: string): string => {
  const boldMap: Record<string, string> = {
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
    k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
    u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
    K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
    U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭"
  };
  return input.split("").map(c => boldMap[c] || c).join("");
};

/**
 * Convert text to italic Unicode characters
 */
export const toItalic = (input: string): string => {
  const italicMap: Record<string, string> = {
    a: "𝘢", b: "𝘣", c: "𝘤", d: "𝘥", e: "𝘦", f: "𝘧", g: "𝘨", h: "𝘩", i: "𝘪", j: "𝘫",
    k: "𝘬", l: "𝘭", m: "𝘮", n: "𝘯", o: "𝘰", p: "𝘱", q: "𝘲", r: "𝘳", s: "𝘴", t: "𝘵",
    u: "𝘶", v: "𝘷", w: "𝘸", x: "𝘹", y: "𝘺", z: "𝘻",
    A: "𝘈", B: "𝘉", C: "𝘊", D: "𝘋", E: "𝘌", F: "𝘍", G: "𝘎", H: "𝘏", I: "𝘐", J: "𝘑",
    K: "𝘒", L: "𝘓", M: "𝘔", N: "𝘕", O: "𝘖", P: "𝘗", Q: "𝘘", R: "𝘙", S: "𝘚", T: "𝘛",
    U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡"
  };
  return input.split("").map(c => italicMap[c] || c).join("");
};

/**
 * Convert markdown-style formatting to Unicode styling
 */
export const toUnicodeStyle = (text: string): string => {
  let result = text;
  
  // Handle bold text first
  result = result.replace(/\*\*(.*?)\*\*/g, (_, m) => toBold(m));
  
  // Handle italic text - simpler pattern that works reliably
  result = result.replace(/_([^_]+?)_/g, (_, m) => toItalic(m));
  
  return result;
};

/**
 * Find the best break point within the character limit
 */
export const findBestBreakPoint = (text: string, limit: number): number => {
  // Look for sentence endings first (priority)
  const sentenceMarkers = ['. ', '? ', '! '];
  for (const marker of sentenceMarkers) {
    const pos = text.lastIndexOf(marker, limit - marker.length);
    if (pos > limit * 0.6) { // Only use if reasonably close to limit
      return pos + marker.length;
    }
  }
  
  // Look for paragraph breaks
  const paragraphBreak = text.lastIndexOf('\n\n', limit - 2);
  if (paragraphBreak > limit * 0.4) {
    return paragraphBreak + 2;
  }
  
  // Look for line breaks
  const lineBreak = text.lastIndexOf('\n', limit - 1);
  if (lineBreak > limit * 0.6) {
    return lineBreak + 1;
  }
  
  // Look for word boundaries (spaces)
  const spaceBreak = text.lastIndexOf(' ', limit - 1);
  if (spaceBreak > limit * 0.7) {
    return spaceBreak + 1;
  }
  
  // If no good break point found, use the limit (will be handled by caller)
  return limit;
};

/**
 * Split long text into chunks that fit platform limits
 */
export const chunkText = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string[] => {
  const limit = PLATFORM_LIMITS[platform];
  
  if (text.length <= limit) {
    return [text];
  }
  
  const chunks: string[] = [];
  let remainingText = text;
  
  while (remainingText.length > 0) {
    if (remainingText.length <= limit) {
      chunks.push(remainingText);
      break;
    }
    
    // Find the best break point within the limit
    let breakPoint = findBestBreakPoint(remainingText, limit);
    
    // Extract chunk and clean up
    let chunk = remainingText.substring(0, breakPoint).replace(/\s+$/, ''); // Remove trailing whitespace
    
    // Ensure chunk doesn't exceed limit after cleanup
    if (chunk.length > limit) {
      // If still too long, force break at a safe point
      chunk = remainingText.substring(0, limit).replace(/\s+$/, '');
      // Find last space before limit to avoid breaking words if possible
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > limit * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
    }
    
    chunks.push(chunk);
    
    // Remove processed text and clean up leading whitespace
    remainingText = remainingText.substring(chunk.length).replace(/^\s+/, '');
  }
  
  // Final safety check: ensure no chunk exceeds limit
  return chunks.map(chunk => {
    if (chunk.length > limit) {
      console.warn(`Chunk exceeds ${platform} limit (${chunk.length}/${limit}):`, chunk.substring(0, 50) + '...');
      // Force truncate if somehow still too long
      return chunk.substring(0, limit - 3) + '...';
    }
    return chunk;
  }).filter(chunk => chunk.length > 0);
};

/**
 * Process unified tags for platform-specific formatting
 */
export const processUnifiedTags = (
  text: string, 
  platform: 'linkedin' | 'twitter' | 'bluesky',
  personMappings: PersonMapping[]
): string => {
  let processedText = text;
  
  // Process unified tags like [@PersonName]
  personMappings.forEach(person => {
    const unifiedTag = `[@${person.name}]`;
    const regex = new RegExp(`\\[@${person.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi');
    
    let replacement = '';
    switch (platform) {
      case 'twitter':
        replacement = person.twitter ? `@${person.twitter}` : person.displayName;
        break;
      case 'bluesky':
        replacement = person.bluesky ? `@${person.bluesky}` : person.displayName;
        break;
      case 'linkedin':
      default:
        replacement = person.displayName;
        break;
    }
    
    processedText = processedText.replace(regex, replacement);
  });
  
  return processedText;
};

/**
 * Complete text formatting pipeline for a platform
 */
export const formatForPlatform = (
  text: string, 
  platform: 'linkedin' | 'twitter' | 'bluesky',
  personMappings: PersonMapping[] = []
): string => {
  // First process unified tags, then apply Unicode styling
  const processedText = processUnifiedTags(text, platform, personMappings);
  return toUnicodeStyle(processedText);
}; 