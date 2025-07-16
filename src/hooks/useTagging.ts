import { useState, useEffect } from 'react';
import { TaggingState, PersonMapping } from '../types';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';

const initialTaggingState: TaggingState = {
  personMappings: []
};

export const useTagging = () => {
  const [taggingState, setTaggingState] = useState<TaggingState>(initialTaggingState);
  const [newPersonMapping, setNewPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    bluesky: ''
  });
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonMapping, setEditPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    bluesky: ''
  });

  // Load saved tagging state on mount
  useEffect(() => {
    const savedTagging = getItem(STORAGE_KEYS.UNIFIED_TAGGING, initialTaggingState);
    setTaggingState(savedTagging);
  }, []);

  // Save tagging state changes
  useEffect(() => {
    setItem(STORAGE_KEYS.UNIFIED_TAGGING, taggingState);
  }, [taggingState]);

  const addPersonMapping = () => {
    if (!newPersonMapping.name || !newPersonMapping.displayName) {
      alert('Please fill in both Name and Display Name fields');
      return;
    }

    const now = new Date().toISOString();
    const personMapping: PersonMapping = {
      id: `person_${Date.now()}`,
      ...newPersonMapping,
      createdAt: now,
      updatedAt: now
    };

    setTaggingState(prev => ({
      ...prev,
      personMappings: [...prev.personMappings, personMapping]
    }));

    // Reset form
    setNewPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      bluesky: ''
    });
  };

  const updatePersonMapping = (id: string, updates: Partial<PersonMapping>) => {
    setTaggingState(prev => ({
      ...prev,
      personMappings: prev.personMappings.map(person =>
        person.id === id
          ? { ...person, ...updates, updatedAt: new Date().toISOString() }
          : person
      )
    }));
  };

  const deletePersonMapping = (id: string) => {
    setTaggingState(prev => ({
      ...prev,
      personMappings: prev.personMappings.filter(person => person.id !== id)
    }));
  };

  const startEditingPerson = (id: string) => {
    const person = taggingState.personMappings.find(p => p.id === id);
    if (person) {
      setEditingPersonId(id);
      setEditPersonMapping({
        name: person.name,
        displayName: person.displayName,
        twitter: person.twitter || '',
        bluesky: person.bluesky || ''
      });
    }
  };

  const saveEditedPerson = () => {
    if (!editingPersonId) return;
    
    updatePersonMapping(editingPersonId, editPersonMapping);
    setEditingPersonId(null);
    setEditPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      bluesky: ''
    });
  };

  const cancelEditingPerson = () => {
    setEditingPersonId(null);
    setEditPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      bluesky: ''
    });
  };

  const insertUnifiedTag = (personName: string, textareaRef: React.RefObject<HTMLTextAreaElement>, setText: (text: string) => void, text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `[@${personName}]`;
    
    const newText = text.substring(0, start) + tag + text.substring(end);
    setText(newText);
    
    // Set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + tag.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return {
    taggingState,
    personMappings: taggingState.personMappings,
    newPersonMapping,
    setNewPersonMapping,
    editingPersonId,
    editPersonMapping,
    setEditPersonMapping,
    addPersonMapping,
    updatePersonMapping,
    deletePersonMapping,
    startEditingPerson,
    saveEditedPerson,
    cancelEditingPerson,
    insertUnifiedTag
  };
}; 