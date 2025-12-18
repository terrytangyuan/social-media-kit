import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { TagAutocompleteProps, TagSuggestion } from "../types";

export const TagAutocomplete = ({ suggestions, onSelect, onClose, position, darkMode, filter }: TagAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on the current filter
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.name.toLowerCase().includes(filter.toLowerCase()) ||
    suggestion.displayName.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Adjust position to prevent overflow outside the viewport
  useLayoutEffect(() => {
    if (listRef.current) {
      const autocompleteRect = listRef.current.getBoundingClientRect();
      const parentElement = listRef.current.parentElement;

      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        const newPosition = { ...position };

        // Get autocomplete dimensions
        const autocompleteWidth = autocompleteRect.width || 256;
        const autocompleteHeight = autocompleteRect.height || 192; // max-h-48 = 12rem = 192px

        // Check if autocomplete would overflow to the right of the viewport
        const absoluteLeft = parentRect.left + position.left;
        if (absoluteLeft + autocompleteWidth > window.innerWidth - 20) {
          // Position to the left of the cursor instead
          newPosition.left = Math.max(0, position.left - autocompleteWidth);
        }

        // Also check if it would overflow the parent container to the right
        if (newPosition.left + autocompleteWidth > parentRect.width) {
          newPosition.left = Math.max(0, parentRect.width - autocompleteWidth - 20);
        }

        // Ensure it doesn't go off the left edge
        if (newPosition.left < 0) {
          newPosition.left = 20; // Add some padding from the left edge
        }

        // Check if autocomplete would overflow at the bottom of the viewport
        const absoluteTop = parentRect.top + position.top;
        if (absoluteTop + autocompleteHeight > window.innerHeight - 20) {
          // Position above the cursor instead
          newPosition.top = Math.max(20, position.top - autocompleteHeight - 20);
        }

        // Ensure it doesn't go off the top edge
        if (newPosition.top < 0) {
          newPosition.top = 20;
        }

        setAdjustedPosition(newPosition);
      }
    }
  }, [position]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredSuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredSuggestions[selectedIndex]) {
            onSelect(filteredSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredSuggestions, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute z-50 max-w-xs w-64 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
        darkMode
          ? "bg-gray-800 border-gray-600 text-white"
          : "bg-white border-gray-300 text-gray-800"
      }`}
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
      }}
      ref={listRef}
    >
      {filteredSuggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${
            index === selectedIndex
              ? darkMode
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-900"
              : darkMode
                ? "hover:bg-gray-700 border-gray-600"
                : "hover:bg-gray-50 border-gray-200"
          }`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="font-medium">{suggestion.displayName}</div>
          <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            @{suggestion.name}
            {suggestion.twitter && ` • Twitter: @${suggestion.twitter}`}
            {suggestion.bluesky && ` • Bluesky: @${suggestion.bluesky}`}
          </div>
        </div>
      ))}
    </div>
  );
};
