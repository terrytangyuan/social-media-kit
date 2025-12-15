import React from 'react';

interface ImageFile {
  file: File;
  dataUrl: string;
  name: string;
}

interface PlatformImageSelections {
  [key: string]: number[];
}

interface ImageLimits {
  maxImages: number;
  maxFileSize: number;
}

interface ImageSelectorModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  pendingPlatform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky' | null;
  platformImageSelections: PlatformImageSelections;
  attachedImages: ImageFile[];
  IMAGE_LIMITS: {
    linkedin: ImageLimits;
    twitter: ImageLimits;
    mastodon: ImageLimits;
    bluesky: ImageLimits;
  };
  updatePlatformSelection: (platform: string, selectedIndices: number[]) => void;
  onSwitchPlatform: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => void;
  showNotification: (message: string) => void;
}

const ImageSelectorModal: React.FC<ImageSelectorModalProps> = ({
  show,
  onClose,
  darkMode,
  pendingPlatform,
  platformImageSelections,
  attachedImages,
  IMAGE_LIMITS,
  updatePlatformSelection,
  onSwitchPlatform,
  showNotification,
}) => {
  if (!show || !pendingPlatform) return null;

  const getPlatformDisplayName = (platform: string) => {
    switch (platform) {
      case 'linkedin': return 'LinkedIn';
      case 'twitter': return 'Twitter/X';
      case 'mastodon': return 'Mastodon';
      case 'bluesky': return 'Bluesky';
      default: return platform;
    }
  };

  const currentSelection = platformImageSelections[pendingPlatform] || [];
  const maxImages = IMAGE_LIMITS[pendingPlatform as keyof typeof IMAGE_LIMITS].maxImages;

  const handleSwitchPlatform = () => {
    onSwitchPlatform(pendingPlatform);
    onClose();
    const selectedCount = currentSelection.length;
    showNotification(`✅ Switched to ${pendingPlatform} with ${selectedCount} selected images`);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Select Images for {getPlatformDisplayName(pendingPlatform)}
            </h2>
            <button
              onClick={onClose}
              className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mb-3`}>
              Select up to {maxImages} images to post to {pendingPlatform}:
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {attachedImages.map((image, index) => {
                const isSelected = currentSelection.includes(index);

                return (
                  <div
                    key={index}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 shadow-lg scale-[0.98]"
                        : darkMode
                          ? "border-gray-600 hover:border-gray-500"
                          : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => {
                      const newSelection = isSelected
                        ? currentSelection.filter(i => i !== index)
                        : currentSelection.length < maxImages
                          ? [...currentSelection, index].sort((a, b) => a - b)
                          : currentSelection;

                      updatePlatformSelection(pendingPlatform, newSelection);
                    }}
                  >
                    <img
                      src={image.dataUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />

                    {/* Selection indicator */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-black bg-opacity-50 text-white"
                    }`}>
                      {isSelected ? '✓' : index + 1}
                    </div>

                    {/* Selection overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                        <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                          Selected
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-3`}>
                {currentSelection.length}/{maxImages} images selected
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-black"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwitchPlatform}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Switch Platform
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectorModal;
