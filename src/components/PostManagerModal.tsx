interface Post {
  id: string;
  title: string;
  content: string;
  scheduleTime: string;
  timezone: string;
  createdAt: string;
  isScheduled?: boolean;
  images?: {
    file: File;
    dataUrl: string;
    name: string;
  }[];
  platformImageSelections?: {
    [key: string]: number[];
  };
  autoPost?: {
    enabled: boolean;
    platforms: ('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[];
  };
}

interface PostManagerModalProps {
  show: boolean;
  darkMode: boolean;
  posts: Post[];
  currentPostId: string | null;
  selectedPostIds: Set<string>;
  publishedPostsCount: number;
  deletedPostsCount: number;
  autoSyncEnabled: boolean;
  scheduledPostsStatus: {
    [postId: string]: 'pending' | 'executing' | 'completed' | 'failed';
  };
  onCreateNewPost: () => void;
  onSwitchToPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onUpdatePostTitle: (postId: string, title: string) => void;
  onTogglePostSelection: (postId: string, index: number, shiftKey: boolean) => void;
  onToggleSelectAll: () => void;
  onDeleteSelectedPosts: () => void;
  onLoadPostsFromDisk: () => void;
  onSavePostsToDisk: () => void;
  onToggleAutoSync: () => void;
  onShowPublishedPosts: () => void;
  onShowDeletedPosts: () => void;
  formatTimezoneTime: (datetime: string, tz: string) => string;
}

export function PostManagerModal({
  show,
  darkMode,
  posts,
  currentPostId,
  selectedPostIds,
  publishedPostsCount,
  deletedPostsCount,
  autoSyncEnabled,
  scheduledPostsStatus,
  onCreateNewPost,
  onSwitchToPost,
  onDeletePost,
  onUpdatePostTitle,
  onTogglePostSelection,
  onToggleSelectAll,
  onDeleteSelectedPosts,
  onLoadPostsFromDisk,
  onSavePostsToDisk,
  onToggleAutoSync,
  onShowPublishedPosts,
  onShowDeletedPosts,
  formatTimezoneTime,
}: PostManagerModalProps) {
  if (!show) return null;

  return (
    <div className={`mb-6 p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">📝 Manage Posts</h2>
          <button
            onClick={onToggleAutoSync}
            className={`text-sm px-3 py-1 rounded-lg ${
              autoSyncEnabled
                ? darkMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
                : darkMode
                  ? "bg-gray-600 hover:bg-gray-500 text-white"
                  : "bg-gray-400 hover:bg-gray-500 text-white"
            }`}
            title={autoSyncEnabled ? "Auto-sync enabled - posts automatically saved" : "Auto-sync disabled - manual save required"}
          >
            {autoSyncEnabled ? "🔄 Auto-Sync ON" : "⏸️ Auto-Sync OFF"}
          </button>
        </div>

        {/* Action buttons organized in logical groups */}
        <div className="flex flex-wrap gap-3 justify-end">
          {/* File operations */}
          <div className="flex gap-2">
            <button
              onClick={onLoadPostsFromDisk}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
              title="Load posts from file"
            >
              📁 Load
            </button>
            <button
              onClick={onSavePostsToDisk}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
              title="Save posts to file"
            >
              💾 Save
            </button>
          </div>

          {/* Post management */}
          <div className="flex gap-2">
            <button
              onClick={onCreateNewPost}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
            >
              ➕ New Post
            </button>
            <button
              onClick={onShowPublishedPosts}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
              title="View published posts"
            >
              ✅ Published ({publishedPostsCount})
            </button>
            <button
              onClick={onShowDeletedPosts}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
              title="View deleted posts"
            >
              🗑️ Deleted ({deletedPostsCount})
            </button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          No posts yet. Click "New Post" to create your first post.
        </p>
      ) : (
        <>
          {/* Bulk selection controls */}
          {posts.length > 0 && (
            <div className={`flex items-center justify-between mb-3 p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPostIds.size === posts.length && posts.length > 0}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Select All ({selectedPostIds.size}/{posts.length})
                  </span>
                </label>
              </div>
              {selectedPostIds.size > 0 && (
                <button
                  onClick={onDeleteSelectedPosts}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                  🗑️ Delete Selected ({selectedPostIds.size})
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`p-3 border rounded-lg transition-colors ${
                currentPostId === post.id
                  ? (darkMode ? "bg-blue-800 border-blue-600" : "bg-blue-100 border-blue-400")
                  : (darkMode ? "bg-gray-800 border-gray-600 hover:bg-gray-750" : "bg-white border-gray-200 hover:bg-gray-50")
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedPostIds.has(post.id)}
                    onChange={() => {
                      // State change handled in onClick
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePostSelection(post.id, index, e.shiftKey);
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => onSwitchToPost(post.id)}>
                  <input
                    type="text"
                    value={post.title}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdatePostTitle(post.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`font-medium text-sm bg-transparent border-none outline-none w-full hover:bg-opacity-50 hover:bg-gray-300 rounded px-1 -mx-1 transition-colors ${darkMode ? "text-white hover:bg-gray-600" : "text-gray-800 hover:bg-gray-100"}`}
                    placeholder="📝 Click to edit title..."
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {post.content ? `${post.content.substring(0, 60)}${post.content.length > 60 ? '...' : ''}` : 'No content'}
                  </p>
                  {post.scheduleTime && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      📅 {formatTimezoneTime(post.scheduleTime, post.timezone)}
                    </p>
                      {post.autoPost?.enabled && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          scheduledPostsStatus[post.id] === 'pending'
                            ? (darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                            : scheduledPostsStatus[post.id] === 'executing'
                            ? (darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800')
                            : scheduledPostsStatus[post.id] === 'completed'
                            ? (darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800')
                            : scheduledPostsStatus[post.id] === 'failed'
                            ? (darkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800')
                            : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                        }`}>
                          {scheduledPostsStatus[post.id] === 'pending' && '⏳ Scheduled'}
                          {scheduledPostsStatus[post.id] === 'executing' && '🚀 Posting'}
                          {scheduledPostsStatus[post.id] === 'completed' && '✅ Posted'}
                          {scheduledPostsStatus[post.id] === 'failed' && '❌ Failed'}
                          {!scheduledPostsStatus[post.id] && '🤖 Auto-post'}
                        </span>
                      )}
                    </div>
                  )}
                  {post.images && post.images.length > 0 && (
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      📷 {post.images.length} image{post.images.length > 1 ? 's' : ''}
                    </p>
                  )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {currentPostId === post.id && (
                    <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                      ✏️ Active
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${post.title}"?`)) {
                        onDeletePost(post.id);
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
