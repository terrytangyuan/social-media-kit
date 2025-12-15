import React from 'react';
import { chunkText, getPlatformTextLength, Platform } from '../utils/chunking';

interface ImageData {
  file: File;
  dataUrl: string;
  name: string;
}

interface ChunkPreviewProps {
  text: string;
  darkMode: boolean;
  selectedPlatform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';
  platformLimits: { [key in Platform]: number };
  formatForPlatform: (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => string;
  getSelectedImagesForPlatform: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => ImageData[];
  showNotification: (message: string) => void;
}

export const ChunkPreview: React.FC<ChunkPreviewProps> = ({
  text,
  darkMode,
  selectedPlatform,
  platformLimits,
  formatForPlatform,
  getSelectedImagesForPlatform,
  showNotification,
}) => {
  // Format text first, then chunk to ensure accurate character counts
  const formattedText = formatForPlatform(text, selectedPlatform);
  const chunks = chunkText(formattedText, selectedPlatform, platformLimits);
  const formattedChunks = chunks;

  const handleCopyChunk = async (chunk: string, index: number) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(chunk);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = chunk;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showNotification(`✅ Part ${index + 1} copied to clipboard!`);
    } catch (err) {
      console.error('Copy failed:', err);
      showNotification('❌ Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning about chunking */}
      {chunks.length > 1 && (
        <div className={`text-sm p-2 rounded-lg ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
          {selectedPlatform === 'linkedin' ? (
            <>📱 This post will be split into {chunks.length} parts due to character limit ({platformLimits[selectedPlatform]} chars)</>
          ) : (
            <>🧵 This post will create a thread with {chunks.length} parts due to character limit ({platformLimits[selectedPlatform]} chars)</>
          )}
        </div>
      )}

      {/* Individual chunk displays */}
      {formattedChunks.map((chunk, index) => (
        <div key={index} className={`p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"}`}>
          <div className="flex justify-between items-start mb-2">
            {chunks.length > 1 && (
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Part {index + 1} of {chunks.length} • {getPlatformTextLength(chunk, selectedPlatform)} characters
              </div>
            )}
            {(selectedPlatform === 'twitter' || selectedPlatform === 'bluesky' || selectedPlatform === 'mastodon') && chunks.length > 1 && (
              <button
                onClick={() => handleCopyChunk(chunk, index)}
                className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
              >
                📋 Copy
              </button>
            )}
          </div>
          <div className="whitespace-pre-wrap">{chunk}</div>

          {/* Show attached images only on first chunk */}
          {index === 0 && getSelectedImagesForPlatform(selectedPlatform).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  📷 Selected Images ({getSelectedImagesForPlatform(selectedPlatform).length}):
                </span>
              </div>
              <div className={`grid gap-3 ${
                getSelectedImagesForPlatform(selectedPlatform).length === 1 ? 'grid-cols-1' :
                getSelectedImagesForPlatform(selectedPlatform).length === 2 ? 'grid-cols-2' :
                getSelectedImagesForPlatform(selectedPlatform).length === 3 ? 'grid-cols-3' :
                'grid-cols-2'
              }`}>
                {getSelectedImagesForPlatform(selectedPlatform).map((image, imgIndex) => (
                  <div key={imgIndex} className="relative">
                    <img
                      src={image.dataUrl}
                      alt={`Attached image ${imgIndex + 1}`}
                      className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                    {/* Image number overlay */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                      {imgIndex + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
