import { useEffect, useRef } from 'react';
import { EMOJI_CATEGORIES } from '../constants';

interface EmojiPickerProps {
  show: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  darkMode: boolean;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  show,
  onClose,
  onEmojiSelect,
  darkMode
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (show && pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      ref={pickerRef}
      className={`absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto border rounded-xl shadow-lg z-10 ${
        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
      }`}
    >
      <div className="p-3">
        <div className="flex justify-between items-center mb-3">
          <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Select Emoji
          </span>
          <button
            onClick={onClose}
            className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ✕
          </button>
        </div>
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category} className="mb-4">
            <h4 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {category}
            </h4>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => onEmojiSelect(emoji)}
                  className={`w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
