import React from 'react';
import { DeletedPost, PublishedPost } from '../types';

interface DeletedPostsModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  deletedPosts: DeletedPost[];
  publishedPosts: PublishedPost[];
  selectedDeletedPostIds: Set<string>;
  onToggleSelection: (postId: string, index: number, shiftKey: boolean) => void;
  onToggleSelectAll: () => void;
  onPermanentlyDeleteSelected: () => void;
  onPermanentlyDelete: (postId: string) => void;
  onRestore: (postId: string) => void;
  onViewDetails: (post: DeletedPost) => void;
}

// Helper function to get deleted posts that are not published
const getActualDeletedPosts = (deletedPosts: DeletedPost[], publishedPosts: PublishedPost[]) => {
  return deletedPosts.filter(deletedPost =>
    !publishedPosts.some(publishedPost =>
      publishedPost.originalPostId === deletedPost.originalPostId
    )
  );
};

export const DeletedPostsModal: React.FC<DeletedPostsModalProps> = ({
  show,
  onClose,
  darkMode,
  deletedPosts,
  publishedPosts,
  selectedDeletedPostIds,
  onToggleSelection,
  onToggleSelectAll,
  onPermanentlyDeleteSelected,
  onPermanentlyDelete,
  onRestore,
  onViewDetails
}) => {
  if (!show) return null;

  const actualDeletedPosts = getActualDeletedPosts(deletedPosts, publishedPosts);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-300">
          <h2 className="text-xl font-semibold">🗑️ Deleted Posts ({actualDeletedPosts.length})</h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
          >
            ✕ Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {actualDeletedPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🗑️</div>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No deleted posts yet. Posts will appear here when you manually delete them.
              </p>
            </div>
          ) : (
            <>
              {/* Bulk selection controls */}
              {actualDeletedPosts.length > 0 && (
                <div className={`flex items-center justify-between mb-3 p-2 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDeletedPostIds.size === actualDeletedPosts.length && actualDeletedPosts.length > 0}
                        onChange={onToggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Select All ({selectedDeletedPostIds.size}/{actualDeletedPosts.length})
                      </span>
                    </label>
                  </div>
                  {selectedDeletedPostIds.size > 0 && (
                    <button
                      onClick={onPermanentlyDeleteSelected}
                      className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    >
                      🗑️ Delete Forever ({selectedDeletedPostIds.size})
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4">
              {actualDeletedPosts.map((post, index) => (
                <div key={post.id} className={`p-4 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDeletedPostIds.has(post.id)}
                      onChange={() => {
                        // State change handled in onClick
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(post.id, index, e.shiftKey);
                      }}
                      className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{post.title}</h3>
                        <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600" : "bg-red-100 text-red-800"}`}>
                        Deleted
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-600" : "bg-gray-200 text-gray-600"}`}>
                        {new Date(post.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <div>
                      {post.images && post.images.length > 0 && (
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          📷 {post.images.length} image(s) attached
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewDetails(post)}
                        className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-500 hover:bg-gray-600 text-white"}`}
                      >
                        👁️ View Details
                      </button>
                      <button
                        onClick={() => onRestore(post.id)}
                        className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                      >
                        ↩️ Restore
                      </button>
                      <button
                        onClick={() => onPermanentlyDelete(post.id)}
                        className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                      >
                        🗑️ Delete Forever
                      </button>
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
