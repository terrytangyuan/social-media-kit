import React from 'react';
import { OAuthConfig } from '../types';

interface AuthModalProps {
  show: boolean;
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky' | null;
  onClose: () => void;
  darkMode: boolean;
  oauthConfig: OAuthConfig;
  blueskyCredentials: { handle: string; appPassword: string };
  onBlueskyCredentialsChange: (creds: { handle: string; appPassword: string }) => void;
  onBlueskyLogin: () => Promise<void>;
  onMastodonLogin: () => Promise<void>;
  onGenerateOAuthUrl: (platform: 'linkedin' | 'twitter') => void;
  isPosting?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({
  show,
  platform,
  onClose,
  darkMode,
  blueskyCredentials,
  onBlueskyCredentialsChange,
  onBlueskyLogin,
  onGenerateOAuthUrl,
  isPosting = false
}) => {
  if (!show || !platform) {
    return null;
  }

  const platformNames: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'X/Twitter',
    mastodon: 'Mastodon',
    bluesky: 'Bluesky'
  };

  const platformName = platformNames[platform];

  const handleBlueskyConnect = async () => {
    await onBlueskyLogin();
  };

  const handleOAuthConnect = () => {
    if (platform === 'linkedin' || platform === 'twitter') {
      onGenerateOAuthUrl(platform);
    } else if (platform === 'mastodon') {
      // Mastodon uses the same OAuth flow but might need different handling
      // For now, we'll treat it similarly to LinkedIn/Twitter
      onGenerateOAuthUrl(platform as 'linkedin' | 'twitter');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-md w-full mx-4 p-6 rounded-xl shadow-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Connect to {platformName}
          </h2>
          <button
            onClick={onClose}
            className={`text-gray-500 hover:text-gray-700 ${darkMode ? "hover:text-gray-300" : ""}`}
          >
            ✕
          </button>
        </div>

        {platform === 'bluesky' ? (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Handle (e.g., username.bsky.social)
              </label>
              <input
                type="text"
                value={blueskyCredentials.handle}
                onChange={(e) => onBlueskyCredentialsChange({ ...blueskyCredentials, handle: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                placeholder="your-handle.bsky.social"
                disabled={isPosting}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                App Password
              </label>
              <input
                type="password"
                value={blueskyCredentials.appPassword}
                onChange={(e) => onBlueskyCredentialsChange({ ...blueskyCredentials, appPassword: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                disabled={isPosting}
              />
            </div>
            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              <p>You can generate an app password in your Bluesky settings under "App Passwords".</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBlueskyConnect}
                disabled={isPosting || !blueskyCredentials.handle || !blueskyCredentials.appPassword}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  isPosting || !blueskyCredentials.handle || !blueskyCredentials.appPassword
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPosting ? 'Authenticating...' : 'Connect'}
              </button>
              <button
                onClick={onClose}
                disabled={isPosting}
                className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              You will be redirected to {platformName} to authorize this application.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleOAuthConnect}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Connect to {platformName}
              </button>
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
