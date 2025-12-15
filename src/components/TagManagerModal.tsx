import React from 'react';
import { PersonMapping, TaggingState } from '../types';

export interface TagManagerModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  personMappings: PersonMapping[];
  newPersonMapping: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>;
  editingPersonId: string | null;
  editPersonMapping: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>;
  onNewPersonChange: (mapping: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditPersonChange: (mapping: Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAdd: () => boolean;
  onUpdate: () => boolean;
  onDelete: (id: string) => void;
  onStartEdit: (mapping: PersonMapping) => void;
  onCancelEdit: () => void;
  onInsertTag: (personName: string) => void;
  taggingState: TaggingState;
  onTaggingStateChange: (state: TaggingState) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  show,
  onClose,
  darkMode,
  personMappings,
  newPersonMapping,
  editingPersonId,
  editPersonMapping,
  onNewPersonChange,
  onEditPersonChange,
  onAdd,
  onUpdate,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onInsertTag,
  taggingState,
  onTaggingStateChange,
}) => {
  if (!show) return null;

  const handleSaveTaggingData = () => {
    const dataToSave = {
      taggingData: taggingState,
      exportedAt: new Date().toISOString(),
      appVersion: "0.2.1"
    };

    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tagging-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleLoadTaggingData = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Validate the data structure
          if (!data.taggingData || !data.taggingData.personMappings || !Array.isArray(data.taggingData.personMappings)) {
            alert('Invalid file format. Please select a valid tagging data backup file.');
            return;
          }

          // Validate each person mapping has required fields
          const validMappings = data.taggingData.personMappings.filter((mapping: any) =>
            mapping.id && mapping.name !== undefined && mapping.displayName !== undefined
          );

          if (validMappings.length === 0) {
            alert('No valid person mappings found in the file.');
            return;
          }

          // Load the tagging data
          onTaggingStateChange({
            personMappings: validMappings
          });

          alert(`Successfully loaded ${validMappings.length} person mappings!`);
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('Error reading file. Please make sure it\'s a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
  };

  const handleAddPerson = () => {
    const success = onAdd();
    if (success) {
      alert('Person mapping added successfully!');
    }
  };

  const handleUpdatePerson = () => {
    const success = onUpdate();
    if (success) {
      alert('Person mapping updated successfully!');
    }
  };

  const handleInsertAndClose = (personName: string) => {
    onInsertTag(personName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Unified Tagging Manager</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveTaggingData}
                className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                title="Save tagging data to file"
              >
                Save
              </button>
              <button
                onClick={handleLoadTaggingData}
                className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                title="Load tagging data from file"
              >
                Load
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg hover:bg-gray-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className={`mb-6 p-4 rounded-lg ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
            <h3 className="font-semibold mb-2">How to Use Unified Tagging</h3>
            <div className="text-sm space-y-1">
              <p>• In your posts, use <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-blue-200"}`}>@{"{Person Name}"}</code> to tag someone</p>
              <p>• Example: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-blue-200"}`}>@{"{Yuan Tang}"}</code> will automatically convert to:</p>
              <p className="ml-4">- LinkedIn: @Yuan Tang (manual tagging required)</p>
              <p className="ml-4">- X/Twitter: @TerryTangYuan</p>
              <p className="ml-4">- Bluesky: @terrytangyuan.xyz</p>
            </div>
          </div>

          {/* Add New Person */}
          <div className={`mb-6 p-4 rounded-lg border ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
            <h3 className="font-semibold mb-3">Add New Person</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (for tagging)</label>
                <input
                  type="text"
                  value={newPersonMapping.name}
                  onChange={(e) => onNewPersonChange({ ...newPersonMapping, name: e.target.value })}
                  placeholder="Yuan Tang"
                  className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={newPersonMapping.displayName}
                  onChange={(e) => onNewPersonChange({ ...newPersonMapping, displayName: e.target.value })}
                  placeholder="Yuan Tang"
                  className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                />
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Used for LinkedIn tagging (manual @ selection required after pasting)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">X/Twitter (optional)</label>
                <input
                  type="text"
                  value={newPersonMapping.twitter}
                  onChange={(e) => onNewPersonChange({ ...newPersonMapping, twitter: e.target.value })}
                  placeholder="TerryTangYuan"
                  className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mastodon (optional)</label>
                <input
                  type="text"
                  value={newPersonMapping.mastodon}
                  onChange={(e) => onNewPersonChange({ ...newPersonMapping, mastodon: e.target.value })}
                  placeholder="username@mastodon.social"
                  className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bluesky (optional)</label>
                <input
                  type="text"
                  value={newPersonMapping.bluesky}
                  onChange={(e) => onNewPersonChange({ ...newPersonMapping, bluesky: e.target.value })}
                  placeholder="terrytangyuan.xyz"
                  className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                />
              </div>
            </div>
            <button
              onClick={handleAddPerson}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Person
            </button>
          </div>

          {/* Existing People */}
          <div>
            <h3 className="font-semibold mb-3">Existing People ({personMappings.length})</h3>
            {personMappings.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No people added yet. Add your first person above!
              </p>
            ) : (
              <div className="space-y-4">
                {personMappings.map((person) => (
                  <div key={person.id} className={`p-4 rounded-lg border ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
                    {editingPersonId === person.id ? (
                      // Edit form
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Edit Person</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdatePerson}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={onCancelEdit}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Name (for tagging)</label>
                            <input
                              type="text"
                              value={editPersonMapping.name}
                              onChange={(e) => onEditPersonChange({ ...editPersonMapping, name: e.target.value })}
                              placeholder="Yuan Tang"
                              className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Display Name</label>
                            <input
                              type="text"
                              value={editPersonMapping.displayName}
                              onChange={(e) => onEditPersonChange({ ...editPersonMapping, displayName: e.target.value })}
                              placeholder="Yuan Tang"
                              className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                            <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Used for LinkedIn tagging (manual @ selection required after pasting)
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">X/Twitter (optional)</label>
                            <input
                              type="text"
                              value={editPersonMapping.twitter}
                              onChange={(e) => onEditPersonChange({ ...editPersonMapping, twitter: e.target.value })}
                              placeholder="TerryTangYuan"
                              className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Mastodon (optional)</label>
                            <input
                              type="text"
                              value={editPersonMapping.mastodon}
                              onChange={(e) => onEditPersonChange({ ...editPersonMapping, mastodon: e.target.value })}
                              placeholder="username@mastodon.social"
                              className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Bluesky (optional)</label>
                            <input
                              type="text"
                              value={editPersonMapping.bluesky}
                              onChange={(e) => onEditPersonChange({ ...editPersonMapping, bluesky: e.target.value })}
                              placeholder="terrytangyuan.xyz"
                              className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{person.displayName}</h4>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Tag with: <code className={`px-1 rounded ${darkMode ? "bg-gray-600" : "bg-gray-200"}`}>@{"{" + person.name + "}"}</code>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleInsertAndClose(person.name)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Insert
                            </button>
                            <button
                              onClick={() => onStartEdit(person)}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(person.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="font-medium">LinkedIn:</span>
                            <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                              @{person.displayName}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">X/Twitter:</span>
                            <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                              {person.twitter ? `@${person.twitter}` : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Mastodon:</span>
                            <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                              {person.mastodon ? `@${person.mastodon}` : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Bluesky:</span>
                            <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                              {person.bluesky ? `@${person.bluesky}` : 'Not set'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
