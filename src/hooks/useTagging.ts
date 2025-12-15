import { useState, useCallback } from 'react';
import { PersonMapping, TaggingState } from '../types';

export const useTagging = () => {
  const [taggingState, setTaggingState] = useState<TaggingState>({
    personMappings: []
  });
  const [showTagManager, setShowTagManager] = useState(false);

  // Tag autocomplete state
  const [showTagAutocomplete, setShowTagAutocomplete] = useState(false);
  const [tagAutocompletePosition, setTagAutocompletePosition] = useState({ top: 0, left: 0 });
  const [tagAutocompleteFilter, setTagAutocompleteFilter] = useState('');
  const [tagAutocompleteStartPos, setTagAutocompleteStartPos] = useState(0);

  // Person mapping editing state
  const [newPersonMapping, setNewPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    mastodon: '',
    bluesky: ''
  });
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonMapping, setEditPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    mastodon: '',
    bluesky: ''
  });

  const addPersonMapping = useCallback(() => {
    if (!newPersonMapping.name.trim()) {
      return false;
    }

    const newMapping: PersonMapping = {
      id: Date.now().toString(),
      ...newPersonMapping,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTaggingState(prev => ({
      ...prev,
      personMappings: [...prev.personMappings, newMapping]
    }));

    // Reset form
    setNewPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      mastodon: '',
      bluesky: ''
    });

    return true;
  }, [newPersonMapping]);

  const updatePersonMapping = useCallback(() => {
    if (!editingPersonId || !editPersonMapping.name.trim()) {
      return false;
    }

    setTaggingState(prev => ({
      ...prev,
      personMappings: prev.personMappings.map(mapping =>
        mapping.id === editingPersonId
          ? {
              ...mapping,
              ...editPersonMapping,
              updatedAt: new Date().toISOString()
            }
          : mapping
      )
    }));

    // Reset editing state
    setEditingPersonId(null);
    setEditPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      mastodon: '',
      bluesky: ''
    });

    return true;
  }, [editingPersonId, editPersonMapping]);

  const deletePersonMapping = useCallback((id: string) => {
    setTaggingState(prev => ({
      ...prev,
      personMappings: prev.personMappings.filter(mapping => mapping.id !== id)
    }));
  }, []);

  const startEditingPerson = useCallback((mapping: PersonMapping) => {
    setEditingPersonId(mapping.id);
    setEditPersonMapping({
      name: mapping.name,
      displayName: mapping.displayName,
      twitter: mapping.twitter || '',
      mastodon: mapping.mastodon || '',
      bluesky: mapping.bluesky || ''
    });
  }, []);

  const cancelEditingPerson = useCallback(() => {
    setEditingPersonId(null);
    setEditPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      mastodon: '',
      bluesky: ''
    });
  }, []);

  return {
    // Tagging state
    taggingState,
    setTaggingState,
    showTagManager,
    setShowTagManager,

    // Autocomplete state
    showTagAutocomplete,
    setShowTagAutocomplete,
    tagAutocompletePosition,
    setTagAutocompletePosition,
    tagAutocompleteFilter,
    setTagAutocompleteFilter,
    tagAutocompleteStartPos,
    setTagAutocompleteStartPos,

    // Person mapping forms
    newPersonMapping,
    setNewPersonMapping,
    editingPersonId,
    setEditingPersonId,
    editPersonMapping,
    setEditPersonMapping,

    // Functions
    addPersonMapping,
    updatePersonMapping,
    deletePersonMapping,
    startEditingPerson,
    cancelEditingPerson
  };
};
