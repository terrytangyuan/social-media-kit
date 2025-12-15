import React from 'react';
import { OAuthConfig } from '../types';

export type SettingsModalProps = {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  oauthConfig: OAuthConfig;
  onUpdateOAuthConfig: (platform: 'linkedin' | 'twitter' | 'mastodon', clientId: string) => void;
  onClearCache: () => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  darkMode,
  oauthConfig,
  onUpdateOAuthConfig,
  onClearCache,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">OAuth Settings</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* LinkedIn Section */}
            <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
              <h3 className="font-semibold mb-3">LinkedIn</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                  <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
                  <ol className="text-xs space-y-1">
                    <li>1. Go to <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">LinkedIn Developer Portal</a></li>
                    <li>2. Create a new app or select existing one</li>
                    <li>3. In Auth tab, add redirect URI: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                    <li>4. Enable scope: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>w_member_social</code></li>
                    <li>5. Copy the Client ID and add it to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file as <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>LINKEDIN_CLIENT_ID</code></li>
                    <li>6. Restart the server to load the new configuration</li>
                  </ol>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={oauthConfig.linkedin.clientId}
                    onChange={(e) => onUpdateOAuthConfig('linkedin', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                    placeholder="86abc123def456789"
                    disabled={true}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {oauthConfig.linkedin.clientId ? 'LinkedIn Client ID configured via .env file' : 'Client ID required - add LINKEDIN_CLIENT_ID to .env file'}
                  </p>
                </div>
              </div>
            </div>

            {/* Twitter Section */}
            <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
              <h3 className="font-semibold mb-3">X/Twitter</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                  <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
                  <ol className="text-xs space-y-1">
                    <li>1. Go to <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Twitter Developer Portal</a></li>
                    <li>2. Create a new app or select existing one</li>
                    <li>3. In App Settings, add callback URL: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                    <li>4. Enable scopes: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>tweet.read tweet.write users.read</code></li>
                    <li>5. Copy credentials from "Keys and tokens" tab to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file:</li>
                  </ol>
                  <div className={`mt-2 p-2 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                    <div className="font-medium mb-1">For text tweets (OAuth 2.0):</div>
                    <div className="font-mono">TWITTER_CLIENT_ID=your_client_id</div>
                    <div className="font-mono">TWITTER_CLIENT_SECRET=your_client_secret</div>
                    <div className="font-medium mb-1 mt-2">For image uploads (OAuth 1.0a):</div>
                    <div className="font-mono">TWITTER_API_KEY=your_api_key</div>
                    <div className="font-mono">TWITTER_API_SECRET=your_api_secret</div>
                    <div className="font-mono">TWITTER_ACCESS_TOKEN=your_access_token</div>
                    <div className="font-mono">TWITTER_ACCESS_TOKEN_SECRET=your_token_secret</div>
                  </div>
                  <ol className="text-xs space-y-1 mt-2" start={6}>
                    <li>6. Restart the server to load the new configuration</li>
                  </ol>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={oauthConfig.twitter.clientId}
                    onChange={(e) => onUpdateOAuthConfig('twitter', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                    placeholder="TwItTeRcLiEnTiD123456789"
                    disabled={true}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {oauthConfig.twitter.clientId ? 'Twitter Client ID configured via .env file' : 'Client ID required - add TWITTER_CLIENT_ID to .env file'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mastodon Section */}
            <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
              <h3 className="font-semibold mb-3">Mastodon</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                  <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
                  <ol className="text-xs space-y-1">
                    <li>1. Choose your Mastodon instance (e.g., mastodon.social, mastodon.online)</li>
                    <li>2. Create a new application in your instance's Developer settings</li>
                    <li>3. Set redirect URI: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                    <li>4. Enable scopes: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>read write</code></li>
                    <li>5. Copy the Client ID and add it to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file as <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>MASTODON_CLIENT_ID</code></li>
                    <li>6. Set the instance URL below and restart the server</li>
                  </ol>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={oauthConfig.mastodon.clientId}
                    onChange={(e) => onUpdateOAuthConfig('mastodon', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                    placeholder="MastodonClientId123456"
                    disabled={true}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {oauthConfig.mastodon.clientId ? 'Mastodon Client ID configured via .env file' : 'Client ID required - add MASTODON_CLIENT_ID to .env file'}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Instance URL
                  </label>
                  <input
                    type="text"
                    value={oauthConfig.mastodon.instanceUrl}
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-500" : "bg-gray-100 border-gray-300 text-gray-600"} cursor-not-allowed`}
                    placeholder="https://mastodon.social"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Instance URL is configured in server settings (default: https://mastodon.social)
                  </p>
                </div>
              </div>
            </div>

            {/* Bluesky Section */}
            <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
              <h3 className="font-semibold mb-3">Bluesky</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                  <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
                  <ol className="text-xs space-y-1">
                    <li>1. Log into your Bluesky account</li>
                    <li>2. Go to Settings → Privacy and Security → App Passwords</li>
                    <li>3. Click "Add App Password" and name it (e.g., "Social Media Kit")</li>
                    <li>4. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)</li>
                    <li>5. When logging in, use your handle and the app password</li>
                  </ol>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={oauthConfig.bluesky.server}
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-500" : "bg-gray-100 border-gray-300 text-gray-600"} cursor-not-allowed`}
                    placeholder="https://bsky.social"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Server URL is configured in server settings (default: https://bsky.social)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps and Actions */}
          <div className="mt-4 space-y-3">
            <div className={`p-3 rounded-md ${darkMode ? "bg-green-900 text-green-100" : "bg-green-50 text-green-800"}`}>
              <h4 className="font-medium text-sm mb-2">Next Steps:</h4>
              <ol className="text-xs space-y-1">
                <li>1. Configure your Client IDs above</li>
                <li>2. Close this settings panel</li>
                <li>3. Select a platform and click "Login"</li>
                <li>4. Complete the OAuth flow</li>
                <li>5. Start posting with the "Post to [Platform]" button!</li>
              </ol>
            </div>
            <div className="flex justify-between items-center">
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Client IDs are configured via .env file
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClearCache}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                >
                  Clear Cache
                </button>
                <button
                  onClick={onClearCache}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
