import { describe, it, expect } from '@jest/globals';
import {
  formatText,
  countCharacters,
  countWords,
  hasFormatting,
  removeFormatting,
  splitTextIntoChunks
} from './textFormatting';

describe('Text Formatting Utilities', () => {
  describe('formatText', () => {
    it('should convert **bold** text to Unicode bold', () => {
      expect(formatText('**Hello World**')).toBe('𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱');
      expect(formatText('**Test**')).toBe('𝗧𝗲𝘀𝘁');
      expect(formatText('**123**')).toBe('𝟭𝟮𝟯');
    });

    it('should convert _italic_ text to Unicode italic', () => {
      expect(formatText('_Hello World_')).toBe('𝘏𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥');
      expect(formatText('_Test_')).toBe('𝘛𝘦𝘴𝘵');
    });

    it('should handle mixed bold and italic formatting', () => {
      expect(formatText('**Bold** and _italic_ text')).toBe('𝗕𝗼𝗹𝗱 and 𝘪𝘵𝘢𝘭𝘪𝘤 text');
    });

    it('should leave unformatted text unchanged', () => {
      expect(formatText('Plain text')).toBe('Plain text');
      expect(formatText('No formatting here!')).toBe('No formatting here!');
    });

    it('should handle multiple bold sections', () => {
      expect(formatText('**First** and **Second**')).toBe('𝗙𝗶𝗿𝘀𝘁 and 𝗦𝗲𝗰𝗼𝗻𝗱');
    });

    it('should handle multiple italic sections', () => {
      expect(formatText('_First_ and _Second_')).toBe('𝘍𝘪𝘳𝘴𝘵 and 𝘚𝘦𝘤𝘰𝘯𝘥');
    });

    it('should handle empty strings', () => {
      expect(formatText('')).toBe('');
    });

    it('should handle incomplete formatting markers', () => {
      expect(formatText('**incomplete')).toBe('**incomplete');
      expect(formatText('_incomplete')).toBe('_incomplete');
    });

    it('should not format underscores in @ mentions', () => {
      expect(formatText('@_llm_d_')).toBe('@_llm_d_');
      expect(formatText('@_user_name_')).toBe('@_user_name_');
      expect(formatText('Hello @_llm_d_ how are you?')).toBe('Hello @_llm_d_ how are you?');
    });

    it('should still format italic text with word boundaries', () => {
      expect(formatText('This is _italic_ text')).toBe('This is 𝘪𝘵𝘢𝘭𝘪𝘤 text');
      expect(formatText('_Start_ of sentence')).toBe('𝘚𝘵𝘢𝘳𝘵 of sentence');
      expect(formatText('End of _sentence_')).toBe('End of 𝘴𝘦𝘯𝘵𝘦𝘯𝘤𝘦');
    });

    it('should handle mixed @ mentions and italic formatting', () => {
      expect(formatText('Hello @_user_ and _italic_ text')).toBe('Hello @_user_ and 𝘪𝘵𝘢𝘭𝘪𝘤 text');
      expect(formatText('@_username_ says _hello_ world')).toBe('@_username_ says 𝘩𝘦𝘭𝘭𝘰 world');
    });

    it('should format italic text without requiring spaces around it', () => {
      expect(formatText('_sometext_')).toBe('𝘴𝘰𝘮𝘦𝘵𝘦𝘹𝘵');
      expect(formatText('text_italic_more')).toBe('text𝘪𝘵𝘢𝘭𝘪𝘤more');
      expect(formatText('(_italic_)')).toBe('(𝘪𝘵𝘢𝘭𝘪𝘤)');
      expect(formatText('word_italic_.punctuation')).toBe('word𝘪𝘵𝘢𝘭𝘪𝘤.punctuation');
    });
  });

  describe('countCharacters', () => {
    it('should count characters excluding formatting markers', () => {
      expect(countCharacters('**Hello**')).toBe(5);
      expect(countCharacters('_World_')).toBe(5);
      expect(countCharacters('**Bold** and _italic_')).toBe(15);
    });

    it('should count plain text correctly', () => {
      expect(countCharacters('Plain text')).toBe(10);
      expect(countCharacters('')).toBe(0);
    });

    it('should not count underscores in @ mentions as formatting', () => {
      expect(countCharacters('@_llm_d_')).toBe(8);
      expect(countCharacters('Hello @_user_ world')).toBe(19); // Fixed: underscores preserved
      expect(countCharacters('Text with _italic_ and @_user_')).toBe(28); // Fixed: 'italic' (6) + other text (22)
    });
  });

  describe('countWords', () => {
    it('should count words excluding formatting markers', () => {
      expect(countWords('**Hello** **World**')).toBe(2);
      expect(countWords('_Test_ string')).toBe(2);
      expect(countWords('**Bold** and _italic_ text')).toBe(4);
    });

    it('should count plain text words correctly', () => {
      expect(countWords('One two three')).toBe(3);
      expect(countWords('')).toBe(0);
      expect(countWords('Single')).toBe(1);
    });

    it('should handle extra whitespace', () => {
      expect(countWords('  One   two  ')).toBe(2);
    });
  });

  describe('hasFormatting', () => {
    it('should detect bold formatting', () => {
      expect(hasFormatting('**Bold text**')).toBe(true);
      expect(hasFormatting('Some **bold** here')).toBe(true);
    });

    it('should detect italic formatting', () => {
      expect(hasFormatting('_Italic text_')).toBe(true);
      expect(hasFormatting('Some _italic_ here')).toBe(true);
    });

    it('should detect mixed formatting', () => {
      expect(hasFormatting('**Bold** and _italic_')).toBe(true);
    });

    it('should return false for unformatted text', () => {
      expect(hasFormatting('Plain text')).toBe(false);
      expect(hasFormatting('No formatting here')).toBe(false);
      expect(hasFormatting('')).toBe(false);
    });

    it('should not treat @ mentions with underscores as formatting', () => {
      expect(hasFormatting('@_llm_d_')).toBe(false);
      expect(hasFormatting('Hello @_user_ world')).toBe(false);
      expect(hasFormatting('@_username_')).toBe(false);
    });

    it('should still detect proper italic formatting', () => {
      expect(hasFormatting('This is _italic_ text')).toBe(true);
      expect(hasFormatting('_Start_ of sentence')).toBe(true);
    });
  });

  describe('removeFormatting', () => {
    it('should remove bold formatting', () => {
      expect(removeFormatting('**Bold text**')).toBe('Bold text');
      expect(removeFormatting('Some **bold** here')).toBe('Some bold here');
    });

    it('should remove italic formatting', () => {
      expect(removeFormatting('_Italic text_')).toBe('Italic text');
      expect(removeFormatting('Some _italic_ here')).toBe('Some italic here');
    });

    it('should remove mixed formatting', () => {
      expect(removeFormatting('**Bold** and _italic_')).toBe('Bold and italic');
    });

    it('should leave unformatted text unchanged', () => {
      expect(removeFormatting('Plain text')).toBe('Plain text');
      expect(removeFormatting('')).toBe('');
    });

    it('should preserve @ mentions with underscores', () => {
      expect(removeFormatting('@_llm_d_')).toBe('@_llm_d_');
      expect(removeFormatting('Hello @_user_ world')).toBe('Hello @_user_ world');
      expect(removeFormatting('@_username_')).toBe('@_username_');
    });

    it('should remove proper italic formatting while preserving @ mentions', () => {
      expect(removeFormatting('Hello @_user_ and _italic_ text')).toBe('Hello @_user_ and italic text');
      expect(removeFormatting('_Start_ @_username_ end')).toBe('Start @_username_ end');
    });
  });

  describe('splitTextIntoChunks', () => {
    it('should not split text shorter than maxLength', () => {
      expect(splitTextIntoChunks('Short text', 100)).toEqual(['Short text']);
    });

    it('should split text at word boundaries', () => {
      const result = splitTextIntoChunks('This is a longer text that needs splitting', 20);
      expect(result).toEqual(['This is a longer', 'text that needs', 'splitting']);
    });

    it('should handle single word longer than maxLength', () => {
      const result = splitTextIntoChunks('Superlongwordthatneedssplitting', 10);
      expect(result).toEqual(['Superlongw', 'ordthatneedssplitting']);
    });

    it('should handle empty string', () => {
      expect(splitTextIntoChunks('', 10)).toEqual(['']);
    });

    it('should handle maxLength of 1', () => {
      const result = splitTextIntoChunks('Hi', 1);
      expect(result).toEqual(['H', 'i']);
    });
  });
});