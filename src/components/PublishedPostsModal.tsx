import { PublishedPost } from "../types";

interface PublishedPostsModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  publishedPosts: PublishedPost[];
  onViewDetails: (post: PublishedPost) => void;
}

export function PublishedPostsModal({
  show,
  onClose,
  darkMode,
  publishedPosts,
  onViewDetails,
}: PublishedPostsModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-300">
          <h2 className="text-xl font-semibold">✅ Published Posts ({publishedPosts.length})</h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
          >
            ✕ Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {publishedPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No published posts yet. Posts will appear here after you publish them to social platforms.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedPosts.map((post) => (
                <div key={post.id} className={`p-4 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-green-600" : "bg-green-100 text-green-800"}`}>
                      Published {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                  </p>
                  <div className="mb-3">
                    <p className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Published to {post.platformResults.length} platform(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.platformResults.map((result, index) => (
                        <div key={index} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          result.success
                            ? darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
                            : darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                        }`}>
                          {result.success ? "✅" : "❌"}
                          {result.platform}
                          {result.postUrl && (
                            <button
                              onClick={() => window.open(result.postUrl, '_blank')}
                              className="ml-1 text-blue-500 hover:text-blue-600"
                              title="View post"
                            >
                              🔗
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div>
                      {post.images && post.images.length > 0 && (
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          📷 {post.images.length} image(s) attached
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onViewDetails(post)}
                      className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                    >
                      👁️ View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
