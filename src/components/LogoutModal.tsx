import React from 'react';

interface LogoutModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  selectedLogoutPlatforms: string[];
  authenticatedPlatforms: string[];
  onTogglePlatform: (platform: string) => void;
  onToggleSelectAll: () => void;
  onConfirmLogout: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  show,
  onClose,
  darkMode,
  selectedLogoutPlatforms,
  authenticatedPlatforms,
  onTogglePlatform,
  onToggleSelectAll,
  onConfirmLogout,
}) => {
  if (!show) return null;

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'linkedin': return 'LinkedIn';
      case 'twitter': return 'X/Twitter';
      case 'mastodon': return 'Mastodon';
      case 'bluesky': return 'Bluesky';
      default: return platform;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Logout from Platforms</h2>
            <button
              onClick={onClose}
              className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mb-3`}>
              Select platforms to logout from:
            </div>

            {authenticatedPlatforms.length > 1 && (
              <div className="mb-3">
                <button
                  onClick={onToggleSelectAll}
                  className={`text-sm px-3 py-1 rounded-md border transition-colors ${
                    selectedLogoutPlatforms.length === authenticatedPlatforms.length
                      ? darkMode
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                        : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                      : darkMode
                        ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {selectedLogoutPlatforms.length === authenticatedPlatforms.length ? '❌ Deselect All' : '✅ Select All'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {authenticatedPlatforms.map(platform => {
                const platformName = getPlatformName(platform);
                const isSelected = selectedLogoutPlatforms.includes(platform);

                return (
                  <div
                    key={platform}
                    onClick={() => onTogglePlatform(platform)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? darkMode
                          ? 'border-red-500 bg-red-900/20'
                          : 'border-red-500 bg-red-50'
                        : darkMode
                          ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-red-500 bg-red-500'
                            : darkMode
                              ? 'border-gray-500'
                              : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="font-medium">{platformName}</span>
                      </div>
                      <span className="text-green-500">✅ Connected</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {authenticatedPlatforms.length === 0 && (
              <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No authenticated platforms found.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                darkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirmLogout}
              disabled={selectedLogoutPlatforms.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg text-white ${
                selectedLogoutPlatforms.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Logout ({selectedLogoutPlatforms.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
