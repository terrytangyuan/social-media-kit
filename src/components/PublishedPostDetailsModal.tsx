import React from 'react';
import { PublishedPost } from '../types';

interface PublishedPostDetailsModalProps {
  post: PublishedPost | null;
  onClose: () => void;
  darkMode: boolean;
  onDeletePublished: (postId: string) => void;
}

export const PublishedPostDetailsModal: React.FC<PublishedPostDetailsModalProps> = ({
  post,
  onClose,
  darkMode,
  onDeletePublished
}) => {
  if (!post) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-300">
          <h2 className="text-xl font-semibold">📄 Published Post Details</h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
          >
            ✕ Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {/* Post Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{post.title}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Published At</p>
                  <p className="text-sm">{new Date(post.publishedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timezone</p>
                  <p className="text-sm">{post.timezone}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <h4 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Content</h4>
              <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                <p className="whitespace-pre-wrap text-sm">{post.content}</p>
              </div>
            </div>

            {/* Platform Results */}
            <div>
              <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Platform Results</h4>
              <div className="space-y-3">
                {post.platformResults.map((result, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${result.success ? "text-green-500" : "text-red-500"}`}>
                          {result.success ? "✅" : "❌"}
                        </span>
                        <span className="font-medium">{result.platform}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.success
                          ? darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
                          : darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                      }`}>
                        {result.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Published:</span> {new Date(result.publishedAt).toLocaleString()}</p>
                      {result.postId && (
                        <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Post ID:</span> {result.postId}</p>
                      )}
                      {result.postUrl && (
                        <p>
                          <span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>URL:</span>
                          <button
                            onClick={() => window.open(result.postUrl, '_blank')}
                            className="ml-2 text-blue-500 hover:text-blue-600 underline"
                          >
                            {result.postUrl} 🔗
                          </button>
                        </p>
                      )}
                      {result.error && (
                        <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Error:</span> <span className="text-red-500">{result.error}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            {post.images && post.images.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Attached Images ({post.images.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {post.images.map((image, index) => (
                    <div key={index} className={`border rounded-lg overflow-hidden ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
                      <img src={image.dataUrl} alt={image.name} className="w-full h-32 object-cover" />
                      <p className={`p-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{image.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Image Selections */}
            {post.platformImageSelections && Object.keys(post.platformImageSelections).length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Platform-specific Image Selections</h4>
                <div className="space-y-2">
                  {Object.entries(post.platformImageSelections).map(([platform, indices]) => (
                    <div key={platform} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                      <span className="font-medium capitalize">{platform}:</span> Images {indices.map(i => i + 1).join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
