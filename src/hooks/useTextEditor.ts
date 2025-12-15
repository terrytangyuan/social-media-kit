import { useState, useRef, useCallback, useEffect } from 'react';

export function useTextEditor(
  initialText = '',
  onTextChange?: (text: string) => void
) {
  const [text, setText] = useState<string>(initialText);
  const [undoHistory, setUndoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoTimeoutRef = useRef<number>();

  const saveTextState = useCallback(() => {
    if (textareaRef.current && !isUndoRedoAction) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      setUndoHistory(prev => [
        ...prev,
        { text, selection: { start: selectionStart, end: selectionEnd } }
      ]);
      // Clear redo history when a new action is performed
      setRedoHistory([]);
    }
  }, [text, isUndoRedoAction]);

  const handleTextChange = useCallback((newText: string) => {
    // Clear any existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Set a timeout to save text state
    undoTimeoutRef.current = window.setTimeout(() => {
      saveTextState();
    }, 500); // Debounce for 500ms

    setText(newText);
    onTextChange?.(newText);
  }, [saveTextState, onTextChange]);

  const performUndo = useCallback(() => {
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];

      // Add current state to redo history
      setRedoHistory(prev => [
        ...prev,
        { text, selection: textareaRef.current ?
          { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd } :
          { start: 0, end: 0 }
        }
      ]);

      // Set text to the previous state
      setText(lastState.text);

      // Remove the last state from undo history
      setUndoHistory(prev => prev.slice(0, -1));

      // Flag this as an undo/redo action
      setIsUndoRedoAction(true);

      // Restore selection if possible
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(lastState.selection.start, lastState.selection.end);
      }

      // Reset the undo/redo action flag after a short delay
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  }, [undoHistory, text]);

  const performRedo = useCallback(() => {
    if (redoHistory.length > 0) {
      const nextState = redoHistory[redoHistory.length - 1];

      // Add current state to undo history
      setUndoHistory(prev => [
        ...prev,
        { text, selection: textareaRef.current ?
          { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd } :
          { start: 0, end: 0 }
        }
      ]);

      // Set text to the next state
      setText(nextState.text);

      // Remove the last state from redo history
      setRedoHistory(prev => prev.slice(0, -1));

      // Flag this as an undo/redo action
      setIsUndoRedoAction(true);

      // Restore selection if possible
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(nextState.selection.start, nextState.selection.end);
      }

      // Reset the undo/redo action flag after a short delay
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  }, [redoHistory, text]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl/Cmd + Z for undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      performUndo();
    }

    // Handle Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
    if (
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
      ((event.ctrlKey || event.metaKey) && event.key === 'y')
    ) {
      event.preventDefault();
      performRedo();
    }
  }, [performUndo, performRedo]);

  // Optional: Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Bold and italic text formatting
  const formatText = useCallback((marker: string) => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const selectedText = text.substring(selectionStart, selectionEnd);

      // Check if text is already formatted
      const isAlreadyFormatted =
        (marker === '**' && selectedText.startsWith('𝗯𝗼𝗹𝗱') && selectedText.endsWith('𝗯𝗼𝗹𝗱')) ||
        (marker === '_' && selectedText.startsWith('𝘪𝘵𝘢𝘭𝘪𝘤') && selectedText.endsWith('𝘪𝘵𝘢𝘭𝘪𝘤'));

      let newText: string;
      if (isAlreadyFormatted) {
        // Remove formatting
        const unformattedText = marker === '**'
          ? selectedText.replace(/^𝗯𝗼𝗹𝗱|𝗯𝗼𝗹𝗱$/g, '')
          : selectedText.replace(/^𝘪𝘵𝘢𝘭𝘪𝘤|𝘪𝘵𝘢𝘭𝘪𝘤$/g, '');
        newText = text.slice(0, selectionStart) + unformattedText + text.slice(selectionEnd);
      } else {
        // Apply formatting
        const formattedText = marker === '**'
          ? `𝗯𝗼𝗹𝗱${selectedText}𝗯𝗼𝗹𝗱`
          : `𝘪𝘵𝘢𝘭𝘪𝘤${selectedText}𝘪𝘵𝘢𝘭𝘪𝘤`;
        newText = text.slice(0, selectionStart) + formattedText + text.slice(selectionEnd);
      }

      // Update text and save state
      handleTextChange(newText);

      // Restore selection
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newFormattedText = marker === '**'
          ? `𝗯𝗼𝗹𝗱${selectedText}𝗯𝗼𝗹𝗱`
          : `𝘪𝘵𝘢𝘭𝘪𝘤${selectedText}𝘪𝘵𝘢𝘭𝘪𝘤`;
        textareaRef.current.setSelectionRange(selectionStart, selectionStart + newFormattedText.length);
      }
    }
  }, [text, handleTextChange]);

  // Additional helpers for text editing
  const insertAtCursor = useCallback((textToInsert: string) => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const newText =
        text.slice(0, selectionStart) +
        textToInsert +
        text.slice(selectionEnd);

      handleTextChange(newText);

      // Move cursor after inserted text
      const newCursorPosition = selectionStart + textToInsert.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  }, [text, handleTextChange]);

  return {
    text,
    setText: handleTextChange,
    textareaRef,
    undoHistory,
    redoHistory,
    handleKeyDown,
    performUndo,
    performRedo,
    formatText,
    insertAtCursor,
    isUndoRedoAction
  };
}