import React from 'react';
import { IMAGE_LIMITS } from '../constants';

type ImageFile = {
  file: File;
  dataUrl: string;
  name: string;
};

type Platform = 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';

interface PlatformImageSelections {
  [key: string]: number[];
}

interface ImageUploadSectionProps {
  darkMode: boolean;
  selectedPlatform: Platform;
  attachedImages: ImageFile[];
  platformImageSelections: PlatformImageSelections;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onRemoveAllImages: () => void;
  onSelectImagesForPlatform: (platform: Platform) => void;
  getSelectedImagesForPlatform: (platform: Platform) => ImageFile[];
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  darkMode,
  selectedPlatform,
  attachedImages,
  platformImageSelections,
  onImageUpload,
  onRemoveImage,
  onRemoveAllImages,
  onSelectImagesForPlatform,
  getSelectedImagesForPlatform,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          📷 Attach Images (optional)
        </label>
        {attachedImages.length > 0 && (
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"}`}>
              {getSelectedImagesForPlatform(selectedPlatform).length}/{IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages} selected
            </span>
            <button
              onClick={onRemoveAllImages}
              className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
            >
              🗑️ Remove All
            </button>
          </div>
        )}
      </div>

      {/* Upload area - always visible now */}
      <div className="relative mb-3">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onImageUpload}
          className="hidden"
          id="image-upload"
          disabled={attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages}
        />
        <label
          htmlFor="image-upload"
          className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-colors ${
            attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages
              ? darkMode
                ? "border-gray-700 bg-gray-800 cursor-not-allowed"
                : "border-gray-200 bg-gray-100 cursor-not-allowed"
              : darkMode
                ? "border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600 cursor-pointer"
                : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer"
          }`}
        >
          <div className="text-center">
            <div className="text-xl mb-1">📷</div>
            <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              {attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages
                ? `${selectedPlatform} limit reached`
                : `Click to add images (max ${IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages})`
              }
            </div>
          </div>
        </label>
      </div>

      {/* Image previews with enhanced modification controls */}
      {attachedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              💡 Images will be attached to the first post. Click images to preview, ✕ to remove, or drag to reorder.
            </div>
            {attachedImages.length > 1 && (
              <button
                onClick={() => onSelectImagesForPlatform(selectedPlatform)}
                className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
              >
                🎯 Select Images
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachedImages.map((image, index) => {
              const selectedImages = getSelectedImagesForPlatform(selectedPlatform);
              const isSelected = selectedImages.some(selected => selected.name === image.name && selected.file.size === image.file.size);

              return (
                <div
                  key={index}
                  draggable={attachedImages.length > 1}
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, index)}
                  className={`relative group p-3 border rounded-xl transition-all hover:shadow-md ${
                    attachedImages.length > 1 ? 'cursor-move' : ''
                  } ${
                    isSelected
                      ? darkMode
                        ? "border-blue-500 bg-blue-900/20 hover:bg-blue-900/30"
                        : "border-blue-500 bg-blue-50 hover:bg-blue-100"
                      : darkMode
                        ? "border-gray-600 bg-gray-700 hover:bg-gray-650"
                        : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                  title={attachedImages.length > 1 ? "Drag to reorder images" : ""}
                >
                  <div className="flex items-start space-x-3">
                    {/* Enhanced image preview with click to expand */}
                    <div className="relative">
                      <img
                        src={image.dataUrl}
                        alt={`Attached image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                        onClick={() => {
                          // Create modal to show full image
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 cursor-pointer';
                          modal.innerHTML = `
                            <img src="${image.dataUrl}" alt="${image.name}" class="max-w-[90%] max-h-[90%] object-contain rounded-lg" />
                          `;
                          modal.addEventListener('click', () => modal.remove());
                          document.body.appendChild(modal);
                        }}
                      />
                      {/* Image order indicator */}
                      <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                        {index + 1}
                      </div>

                      {/* Drag handle indicator for multiple images */}
                      {attachedImages.length > 1 && (
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-70 group-hover:opacity-100 ${darkMode ? "bg-gray-600 text-gray-300" : "bg-gray-400 text-gray-700"}`}>
                          ⋮⋮
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${darkMode ? "text-white" : "text-gray-800"}`}>
                        {image.name}
                      </div>
                      <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {(image.file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                      <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {image.file.type}
                      </div>
                      {index === 0 && (
                        <div className={`text-xs mt-1 font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                          ✅ Will be posted first
                        </div>
                      )}
                      {isSelected && (
                        <div className={`text-xs mt-1 font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}>
                          📌 Selected for {selectedPlatform}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced remove button */}
                  <button
                    onClick={() => onRemoveImage(index)}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full text-sm flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    title={`Remove ${image.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Reorder hint for multiple images */}
          {attachedImages.length > 1 && (
            <div className={`text-xs ${darkMode ? "text-yellow-400" : "text-yellow-600"} bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg`}>
              🔄 Drag and drop to reorder images. The first image (#1) appears in your post.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
