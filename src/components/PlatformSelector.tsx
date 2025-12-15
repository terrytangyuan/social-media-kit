import React from 'react';

interface PlatformAuth {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userInfo: any;
  handle?: string;
  appPassword?: string;
  instanceUrl?: string;
}

interface AuthState {
  linkedin: PlatformAuth;
  twitter: PlatformAuth;
  mastodon: PlatformAuth;
  bluesky: PlatformAuth;
}

interface PlatformSelectorProps {
  selectedPlatform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';
  auth: AuthState;
  darkMode: boolean;
  isXPremium: boolean;
  attachedImages: any[];
  hasExplicitSelection: { [key: string]: boolean };
  onSelectPlatform: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => void;
  onLogin: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => void;
  onLogout: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => void;
  onShowLogoutModal: () => void;
  onXPremiumChange: (enabled: boolean) => void;
  onSelectImagesForPlatform: (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => void;
  getAuthenticatedPlatforms: () => string[];
  IMAGE_LIMITS: {
    linkedin: { maxImages: number; maxFileSize: number };
    twitter: { maxImages: number; maxFileSize: number };
    mastodon: { maxImages: number; maxFileSize: number };
    bluesky: { maxImages: number; maxFileSize: number };
  };
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  auth,
  darkMode,
  isXPremium,
  attachedImages,
  hasExplicitSelection,
  onSelectPlatform,
  onLogin,
  onLogout,
  onShowLogoutModal,
  onXPremiumChange,
  onSelectImagesForPlatform,
  getAuthenticatedPlatforms,
  IMAGE_LIMITS,
}) => {
  const platforms = [
    { key: 'linkedin' as const, label: 'LinkedIn', icon: '💼' },
    { key: 'twitter' as const, label: 'X/Twitter', icon: '🐦' },
    { key: 'mastodon' as const, label: 'Mastodon', icon: '🐘' },
    { key: 'bluesky' as const, label: 'Bluesky', icon: '🦋' }
  ];

  const handlePlatformClick = (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => {
    const newLimit = IMAGE_LIMITS[platform].maxImages;

    // Check if current images exceed new platform limit AND user hasn't made explicit selection
    if (attachedImages.length > newLimit && !hasExplicitSelection[platform]) {
      // Open image selector modal only for first-time selection
      onSelectImagesForPlatform(platform);
    } else {
      // Switch directly if under limit OR user has already made selection
      onSelectPlatform(platform);
    }
  };

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
    <div className="mb-4">
      <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        Platform
      </label>

      {/* Platform Buttons */}
      <div className="flex gap-2 mb-3">
        {platforms.map((platform) => (
          <button
            key={platform.key}
            onClick={() => handlePlatformClick(platform.key)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedPlatform === platform.key
                ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                : (darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
            }`}
          >
            {platform.icon} {platform.label}
            {auth[platform.key].isAuthenticated && (
              <span className="ml-1 text-green-400">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* X Premium Toggle - only show for Twitter */}
      {selectedPlatform === 'twitter' && (
        <div className={`mb-3 p-3 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                X Premium Account
              </span>
              <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Enable for 25,000 character limit instead of 280
              </p>
            </div>
            <input
              type="checkbox"
              checked={isXPremium}
              onChange={(e) => onXPremiumChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </label>
        </div>
      )}

      {/* Authentication Status */}
      <div className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        {auth[selectedPlatform].isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-green-500">✅ Connected to {getPlatformName(selectedPlatform)}</span>
              {selectedPlatform === 'twitter' && (
                <div className={`text-xs p-2 rounded ${darkMode ? "bg-blue-900/30 text-blue-200" : "bg-blue-50 text-blue-700"}`}>
                  📷 <strong>Image uploads:</strong> Requires OAuth 1.0a credentials in .env file (see Settings for details)
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onLogout(selectedPlatform)}
                className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
              >
                Logout
              </button>
              {getAuthenticatedPlatforms().length > 1 && (
                <button
                  onClick={onShowLogoutModal}
                  className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                  title="Logout from multiple platforms"
                >
                  🔓
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>Not connected to {getPlatformName(selectedPlatform)}</span>
            <button
              onClick={() => onLogin(selectedPlatform)}
              className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformSelector;
