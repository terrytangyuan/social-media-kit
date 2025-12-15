import React from 'react';
import { DeletedPost } from '../types';

interface DeletedPostDetailsModalProps {
  post: DeletedPost | null;
  onClose: () => void;
  darkMode: boolean;
  onRestore: (postId: string) => void;
  onPermanentlyDelete: (postId: string) => void;
}

export const DeletedPostDetailsModal: React.FC<DeletedPostDetailsModalProps> = ({
  post,
  onClose,
  darkMode,
  onRestore,
  onPermanentlyDelete
}) => {
  if (!post) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-300">
          <h2 className="text-xl font-semibold">Deleted Post Details</h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
          >
            Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {/* Post Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{post.title}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Created At</p>
                  <p className="text-sm">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Deleted At</p>
                  <p className="text-sm">{new Date(post.deletedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Delete Reason</p>
                  <p className="text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"}`}>
                      User Deleted
                    </span>
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timezone</p>
                  <p className="text-sm">{post.timezone}</p>
                </div>
              </div>
              {post.scheduleTime && (
                <div className="mb-4">
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Scheduled Time</p>
                  <p className="text-sm">{new Date(post.scheduleTime).toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <h4 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Content</h4>
              <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                <p className="whitespace-pre-wrap text-sm">{post.content}</p>
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
              <button
                onClick={() => {
                  onRestore(post.id);
                  onClose();
                }}
                className={`px-4 py-2 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
              >
                Restore Post
              </button>
              <button
                onClick={() => {
                  onPermanentlyDelete(post.id);
                  onClose();
                }}
                className={`px-4 py-2 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
