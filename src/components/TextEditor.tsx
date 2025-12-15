import React from 'react';
import { countWords, countCharactersForBluesky } from '../utils/textFormatting';
import { TagAutocomplete } from './TagAutocomplete';
import { TagSuggestion } from '../types';

interface TextEditorProps {
  text: string;
  darkMode: boolean;
  selectedPlatform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  platformLimits: { [key: string]: number };
  showTagAutocomplete: boolean;
  tagAutocompletePosition: { top: number; left: number };
  tagAutocompleteFilter: string;
  personMappings: TagSuggestion[];
  onChange: (newText: string) => void;
  onTagAutocompleteSelect: (suggestion: TagSuggestion) => void;
  onCloseTagAutocomplete: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  darkMode,
  selectedPlatform,
  textareaRef,
  platformLimits,
  showTagAutocomplete,
  tagAutocompletePosition,
  tagAutocompleteFilter,
  personMappings,
  onChange,
  onTagAutocompleteSelect,
  onCloseTagAutocomplete,
  onKeyDown,
  onBlur,
}) => {
  // Helper function to get platform-specific character count
  const getPlatformCharacterCount = (text: string): number => {
    // Bluesky counts graphemes in formatted text (with Unicode bold/italic)
    if (selectedPlatform === 'bluesky') {
      return countCharactersForBluesky(text);
    }
    // Other platforms count without formatting markers
    return text.length;
  };

  const characterCount = getPlatformCharacterCount(text);
  const wordCount = countWords(text);
  const limit = platformLimits[selectedPlatform];

  return (
    <div>
      {/* Textarea */}
      <div className="relative mb-4">
        <textarea
          ref={textareaRef}
          className={`w-full min-h-40 p-4 border rounded-xl resize-y focus:outline-none focus:ring-2 ${
            darkMode
              ? "bg-gray-700 text-white border-gray-600 focus:ring-blue-500 dark-textarea"
              : "bg-white text-gray-800 border-gray-300 focus:ring-blue-400 light-textarea"
          }`}
          placeholder="Write your post here..."
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        {/* Resize handle indicator */}
        <div className={`absolute bottom-1 right-1 w-3 h-3 pointer-events-none opacity-30 ${
          darkMode ? "text-gray-400" : "text-gray-500"
        }`}>
          <svg viewBox="0 0 12 12" className="w-full h-full">
            <circle cx="2" cy="10" r="0.5" fill="currentColor"/>
            <circle cx="6" cy="10" r="0.5" fill="currentColor"/>
            <circle cx="10" cy="10" r="0.5" fill="currentColor"/>
            <circle cx="6" cy="6" r="0.5" fill="currentColor"/>
            <circle cx="10" cy="6" r="0.5" fill="currentColor"/>
            <circle cx="10" cy="2" r="0.5" fill="currentColor"/>
          </svg>
        </div>

        {/* Tag Autocomplete */}
        {showTagAutocomplete && (
          <TagAutocomplete
            suggestions={personMappings}
            onSelect={onTagAutocompleteSelect}
            onClose={onCloseTagAutocomplete}
            position={tagAutocompletePosition}
            darkMode={darkMode}
            filter={tagAutocompleteFilter}
          />
        )}
      </div>

      {/* Character and Word Counter */}
      <div className={`mb-4 px-3 py-2 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
        <div className="flex justify-between items-center text-sm">
          <div className="flex gap-4">
            <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              📝 Words: <span className="font-medium">{wordCount}</span>
            </span>
            <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              🔤 Characters: <span className="font-medium">{characterCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              characterCount > limit
                ? darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                : characterCount > limit * 0.9
                ? darkMode ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-800"
                : darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
            }`}>
              {selectedPlatform === 'linkedin' && '💼'}
              {selectedPlatform === 'twitter' && '🐦'}
              {selectedPlatform === 'mastodon' && '🐘'}
              {selectedPlatform === 'bluesky' && '🦋'}
              {' '}
              {characterCount}/{limit}
              {characterCount > limit && (
                <span className="ml-1">⚠️</span>
              )}
            </span>
            {characterCount > limit && (
              <span className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>
                Will be chunked into {Math.ceil(characterCount / limit)} parts
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
