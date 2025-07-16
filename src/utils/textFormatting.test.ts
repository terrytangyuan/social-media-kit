import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the text formatting functions from App.tsx
// These will need to be extracted to a separate utility file
const formatText = (input: string): string => {
  // Convert **text** to Unicode bold
  let result = input.replace(/\*\*(.*?)\*\*/g, (match, text) => {
    const boldMap: { [key: string]: string } = {
      'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
      'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
      'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
      'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
      'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
      'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
      '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map((char: string) => boldMap[char] || char).join('');
  });

  // Convert _text_ to Unicode italic
  result = result.replace(/_(.*?)_/g, (match, text) => {
    const italicMap: { [key: string]: string } = {
      'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
      'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
      'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
      'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
      'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
      'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡'
    };
    return text.split('').map((char: string) => italicMap[char] || char).join('');
  });

  return result;
};

const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const getCharacterCount = (text: string): number => {
  return text.length;
};

describe('Text Formatting Utilities', () => {
  describe('formatText', () => {
    it('should convert **text** to Unicode bold', () => {
      const input = '**hello world**';
      const expected = '𝗵𝗲𝗹𝗹𝗼 𝘄𝗼𝗿𝗹𝗱';
      expect(formatText(input)).toBe(expected);
    });

    it('should convert _text_ to Unicode italic', () => {
      const input = '_hello world_';
      const expected = '𝘩𝘦𝘭𝘭𝘰 𝘸𝘰𝘳𝘭𝘥';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle mixed bold and italic formatting', () => {
      const input = '**bold** and _italic_ text';
      const expected = '𝗯𝗼𝗹𝗱 and 𝘪𝘵𝘢𝘭𝘪𝘤 text';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle multiple bold sections', () => {
      const input = '**first** normal **second**';
      const expected = '𝗳𝗶𝗿𝘀𝘁 normal 𝘀𝗲𝗰𝗼𝗻𝗱';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle multiple italic sections', () => {
      const input = '_first_ normal _second_';
      const expected = '𝘧𝘪𝘳𝘴𝘵 normal 𝘴𝘦𝘤𝘰𝘯𝘥';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle numbers in bold formatting', () => {
      const input = '**123 ABC**';
      const expected = '𝟭𝟮𝟯 𝗔𝗕𝗖';
      expect(formatText(input)).toBe(expected);
    });

    it('should preserve characters not in the mapping', () => {
      const input = '**hello! @#$**';
      const expected = '𝗵𝗲𝗹𝗹𝗼! @#$';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle nested formatting gracefully', () => {
      const input = '**bold _italic_ text**';
      // The function processes both bold and italic formatting
      const expected = '𝗯𝗼𝗹𝗱 𝗶𝘁𝗮𝗹𝗶𝗰 𝘁𝗲𝘅𝘁';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle empty bold formatting', () => {
      const input = '****';
      const expected = '';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle empty italic formatting', () => {
      const input = '__';
      const expected = '';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle unmatched formatting markers', () => {
      const input = '**unmatched and _also unmatched';
      const expected = '**unmatched and _also unmatched';
      expect(formatText(input)).toBe(expected);
    });

    it('should handle single character formatting', () => {
      const input = '**a** and _b_';
      const expected = '𝗮 and 𝘣';
      expect(formatText(input)).toBe(expected);
    });
  });

  describe('getWordCount', () => {
    it('should count words correctly', () => {
      expect(getWordCount('hello world')).toBe(2);
      expect(getWordCount('one two three four')).toBe(4);
    });

    it('should handle single word', () => {
      expect(getWordCount('hello')).toBe(1);
    });

    it('should handle empty string', () => {
      expect(getWordCount('')).toBe(0);
    });

    it('should handle whitespace only', () => {
      expect(getWordCount('   ')).toBe(0);
    });

    it('should handle multiple spaces between words', () => {
      expect(getWordCount('hello    world   test')).toBe(3);
    });

    it('should handle newlines and tabs', () => {
      expect(getWordCount('hello\nworld\ttest')).toBe(3);
    });
  });

  describe('getCharacterCount', () => {
    it('should count characters correctly', () => {
      expect(getCharacterCount('hello')).toBe(5);
      expect(getCharacterCount('hello world')).toBe(11);
    });

    it('should handle empty string', () => {
      expect(getCharacterCount('')).toBe(0);
    });

    it('should count spaces and special characters', () => {
      expect(getCharacterCount('hello! @#$')).toBe(10);
    });

    it('should count Unicode characters correctly', () => {
      expect(getCharacterCount('𝗵𝗲𝗹𝗹𝗼')).toBe(10); // Bold Unicode chars count as 2 each
    });

    it('should count newlines and tabs', () => {
      expect(getCharacterCount('hello\nworld\t')).toBe(12);
    });
  });
}); 