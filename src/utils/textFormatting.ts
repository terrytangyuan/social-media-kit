// Text formatting utilities for social media posts

// Unicode character mappings
const boldMap: { [key: string]: string } = {
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
  'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
  'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
  'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
  'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
  '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
};

const italicMap: { [key: string]: string } = {
  'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
  'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
  'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
  'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
  'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
  'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡'
};

/**
 * Convert text with **bold** and _italic_ formatting to Unicode characters
 */
export const formatText = (input: string): string => {
  let result = input;
  
  // Convert **text** to Unicode bold
  result = result.replace(/\*\*(.*?)\*\*/g, (match, text) => {
    return text.split('').map((char: string) => boldMap[char] || char).join('');
  });
  
  // Convert _text_ to Unicode italic, but not when part of @ mentions
  // First, temporarily replace @ mentions to protect them (including those with underscores)
  const mentionPlaceholders: string[] = [];
  result = result.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const placeholder = `MENTIONPLACEHOLDER${mentionPlaceholders.length}PLACEHOLDER`;
    mentionPlaceholders.push(match);
    return placeholder;
  });
  
  // Now convert _text_ to italic without worrying about @ mentions
  result = result.replace(/(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/g, (match, text) => {
    return text.split('').map((char: string) => italicMap[char] || char).join('');
  });
  
  // Restore the @ mentions
  mentionPlaceholders.forEach((mention, index) => {
    result = result.replace(`MENTIONPLACEHOLDER${index}PLACEHOLDER`, mention);
  });
  
  return result;
};

/**
 * Count characters in text (excluding formatting)
 */
export const countCharacters = (text: string): number => {
  // Remove formatting markers before counting
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Temporarily replace @ mentions to protect them (including those with underscores)
  const mentionPlaceholders: string[] = [];
  cleanText = cleanText.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const placeholder = `MENTIONPLACEHOLDER${mentionPlaceholders.length}PLACEHOLDER`;
    mentionPlaceholders.push(match);
    return placeholder;
  });
  
  // Remove italic formatting
  cleanText = cleanText.replace(/(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/g, '$1');
  
  // Restore the @ mentions
  mentionPlaceholders.forEach((mention, index) => {
    cleanText = cleanText.replace(`MENTIONPLACEHOLDER${index}PLACEHOLDER`, mention);
  });
  
  return cleanText.length;
};

/**
 * Count words in text (excluding formatting)
 */
export const countWords = (text: string): number => {
  // Remove formatting markers before counting
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Temporarily replace @ mentions to protect them (including those with underscores)
  const mentionPlaceholders: string[] = [];
  cleanText = cleanText.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const placeholder = `MENTIONPLACEHOLDER${mentionPlaceholders.length}PLACEHOLDER`;
    mentionPlaceholders.push(match);
    return placeholder;
  });
  
  // Remove italic formatting
  cleanText = cleanText.replace(/(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/g, '$1');
  
  // Restore the @ mentions
  mentionPlaceholders.forEach((mention, index) => {
    cleanText = cleanText.replace(`MENTIONPLACEHOLDER${index}PLACEHOLDER`, mention);
  });
  
  return cleanText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Check if text contains formatting
 */
export const hasFormatting = (text: string): boolean => {
  if (/\*\*(.*?)\*\*/.test(text)) return true;
  
  // Check for italic formatting, excluding @ mentions
  let testText = text;
  testText = testText.replace(/@[a-zA-Z0-9_.-]+/g, ''); // Remove @ mentions (including those with underscores)
  return /(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/.test(testText);
};

/**
 * Remove all formatting from text
 */
export const removeFormatting = (text: string): string => {
  let result = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Temporarily replace @ mentions to protect them (including those with underscores)
  const mentionPlaceholders: string[] = [];
  result = result.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const placeholder = `MENTIONPLACEHOLDER${mentionPlaceholders.length}PLACEHOLDER`;
    mentionPlaceholders.push(match);
    return placeholder;
  });
  
  // Remove italic formatting
  result = result.replace(/(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/g, '$1');
  
  // Restore the @ mentions
  mentionPlaceholders.forEach((mention, index) => {
    result = result.replace(`MENTIONPLACEHOLDER${index}PLACEHOLDER`, mention);
  });
  
  return result;
};

/**
 * Split text into chunks for platforms with character limits
 */
export const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  const words = text.split(' ');

  for (const word of words) {
    if ((currentChunk + ' ' + word).length <= maxLength) {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        // Word is longer than maxLength, split it
        chunks.push(word.substring(0, maxLength));
        currentChunk = word.substring(maxLength);
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}; 