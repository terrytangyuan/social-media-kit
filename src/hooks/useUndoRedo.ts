import { useState, useRef, useCallback } from 'react';

type UndoRedoState = {
  text: string;
  selection: { start: number; end: number };
};

export const useUndoRedo = (initialText: string = '') => {
  const [undoHistory, setUndoHistory] = useState<UndoRedoState[]>([]);
  const [redoHistory, setRedoHistory] = useState<UndoRedoState[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const undoTimeoutRef = useRef<number>();

  const saveUndoState = useCallback((text: string, textareaRef: React.RefObject<HTMLTextAreaElement>) => {
    if (isUndoRedoAction) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const state: UndoRedoState = {
      text,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    };

    setUndoHistory(prev => [...prev, state]);
    setRedoHistory([]); // Clear redo history when new action is performed

    // Limit history size to prevent memory issues
    setUndoHistory(prev => prev.slice(-50));
  }, [isUndoRedoAction]);

  const performUndo = useCallback((
    currentText: string, 
    setText: (text: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    if (undoHistory.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUndoRedoAction(true);

    // Save current state to redo history
    const currentState: UndoRedoState = {
      text: currentText,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    };
    setRedoHistory(prev => [...prev, currentState]);

    // Restore previous state
    const previousState = undoHistory[undoHistory.length - 1];
    setText(previousState.text);
    setUndoHistory(prev => prev.slice(0, -1));

    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(previousState.selection.start, previousState.selection.end);
      }
      setIsUndoRedoAction(false);
    }, 0);
  }, [undoHistory]);

  const performRedo = useCallback((
    setText: (text: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    if (redoHistory.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUndoRedoAction(true);

    // Get state to restore
    const stateToRestore = redoHistory[redoHistory.length - 1];
    setText(stateToRestore.text);
    setRedoHistory(prev => prev.slice(0, -1));

    // Save current state to undo history
    setUndoHistory(prev => [...prev, stateToRestore]);

    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(stateToRestore.selection.start, stateToRestore.selection.end);
      }
      setIsUndoRedoAction(false);
    }, 0);
  }, [redoHistory]);

  const handleKeyDown = useCallback((
    event: KeyboardEvent,
    currentText: string,
    setText: (text: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      performUndo(currentText, setText, textareaRef);
    } else if (
      ((event.ctrlKey || event.metaKey) && event.key === 'y') || 
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')
    ) {
      event.preventDefault();
      performRedo(setText, textareaRef);
    }
  }, [performUndo, performRedo]);

  const debouncedSaveUndoState = useCallback((
    text: string, 
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    // Clear existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Set new timeout
    undoTimeoutRef.current = window.setTimeout(() => {
      saveUndoState(text, textareaRef);
    }, 500); // Save state after 500ms of inactivity
  }, [saveUndoState]);

  return {
    undoHistory,
    redoHistory,
    isUndoRedoAction,
    saveUndoState: debouncedSaveUndoState,
    performUndo,
    performRedo,
    handleKeyDown,
    canUndo: undoHistory.length > 0,
    canRedo: redoHistory.length > 0
  };
}; 