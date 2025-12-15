import React from 'react';
import { PlatformAuth } from '../types';

type Platform = 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';

export interface ScheduleModalProps {
  show: boolean;
  darkMode: boolean;
  modalScheduleTime: string;
  modalTimezone: string;
  modalAutoPostEnabled: boolean;
  modalAutoPostPlatforms: Platform[];
  modalNotificationEnabled: boolean;
  auth: PlatformAuth;
  commonTimezones: Array<{ value: string; label: string }>;
  onScheduleTimeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onAutoPostEnabledChange: (enabled: boolean) => void;
  onAutoPostPlatformsChange: (platforms: Platform[]) => void;
  onNotificationEnabledChange: (enabled: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  formatTimezoneTime: (datetime: string, tz: string) => string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  show,
  darkMode,
  modalScheduleTime,
  modalTimezone,
  modalAutoPostEnabled,
  modalAutoPostPlatforms,
  modalNotificationEnabled,
  auth,
  commonTimezones,
  onScheduleTimeChange,
  onTimezoneChange,
  onAutoPostEnabledChange,
  onAutoPostPlatformsChange,
  onNotificationEnabledChange,
  onConfirm,
  onCancel,
  formatTimezoneTime,
}) => {
  if (!show) return null;

  const platforms: Platform[] = ['linkedin', 'twitter', 'mastodon', 'bluesky'];

  const handleAutoPostToggle = (checked: boolean) => {
    onAutoPostEnabledChange(checked);
    if (!checked) {
      onAutoPostPlatformsChange([]);
    }
  };

  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    if (checked) {
      onAutoPostPlatformsChange([...modalAutoPostPlatforms, platform]);
    } else {
      onAutoPostPlatformsChange(modalAutoPostPlatforms.filter(p => p !== platform));
    }
  };

  const handleSelectAllPlatforms = () => {
    const authenticatedPlatforms = platforms.filter(
      platform => auth[platform].isAuthenticated
    );
    onAutoPostPlatformsChange(authenticatedPlatforms);
  };

  const handleSelectNoPlatforms = () => {
    onAutoPostPlatformsChange([]);
  };

  const hasUnauthenticatedSelectedPlatforms = modalAutoPostEnabled &&
    modalAutoPostPlatforms.some(platform => !auth[platform].isAuthenticated);

  const isConfirmDisabled = !modalScheduleTime || hasUnauthenticatedSelectedPlatforms;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className={`max-w-md w-full rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📅 Schedule Post</h3>
            <button
              onClick={onCancel}
              className={`text-gray-400 hover:text-gray-600 ${darkMode ? 'hover:text-gray-300' : ''}`}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Date and Time */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                When to post
              </label>
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={modalScheduleTime}
                  onChange={(e) => onScheduleTimeChange(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                />
                <select
                  value={modalTimezone}
                  onChange={(e) => onTimezoneChange(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                >
                  <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                    🔍 Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </option>
                  {commonTimezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              {modalScheduleTime && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  📅 Will be scheduled for: {formatTimezoneTime(modalScheduleTime, modalTimezone)}
                </p>
              )}
            </div>

            {/* Auto-posting */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="modal-auto-post"
                  checked={modalAutoPostEnabled}
                  onChange={(e) => handleAutoPostToggle(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="modal-auto-post" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🤖 Auto-post to platforms
                </label>
              </div>

              {modalAutoPostEnabled && (
                <div className="space-y-2">
                  <div className="flex gap-1 mb-2">
                    <button
                      onClick={handleSelectAllPlatforms}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-green-700 hover:bg-green-600 text-green-200' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={handleSelectNoPlatforms}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-red-700 hover:bg-red-600 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                    >
                      None
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map((platform) => {
                      const isAuthenticated = auth[platform].isAuthenticated;
                      const isSelected = modalAutoPostPlatforms.includes(platform);

                      return (
                        <label
                          key={platform}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-xs ${
                            isAuthenticated
                              ? (isSelected
                                  ? (darkMode ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-300')
                                  : (darkMode ? 'bg-gray-600 hover:bg-gray-500 border border-gray-500' : 'bg-gray-100 hover:bg-gray-200 border border-gray-300')
                                )
                              : (isSelected
                                  ? (darkMode ? 'bg-red-900 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300')
                                  : (darkMode ? 'bg-gray-700 text-gray-500 border border-gray-600' : 'bg-gray-50 text-gray-400 border border-gray-200')
                                )
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handlePlatformToggle(platform, e.target.checked)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </div>
                            <div className="opacity-75">
                              {!isAuthenticated && isSelected && '⚠️ Not authenticated'}
                              {!isAuthenticated && !isSelected && 'Login required'}
                              {isAuthenticated && 'Ready'}
                            </div>
                          </div>
                          {isAuthenticated && <span className="text-green-500">✅</span>}
                          {!isAuthenticated && isSelected && <span className="text-red-500">⚠️</span>}
                          {!isAuthenticated && !isSelected && <span className="text-gray-400">🔒</span>}
                        </label>
                      );
                    })}
                  </div>

                  {/* Warning for unauthenticated platforms */}
                  {hasUnauthenticatedSelectedPlatforms && (
                    <div className={`text-xs p-2 rounded border ${darkMode ? 'bg-red-900 text-red-200 border-red-700' : 'bg-red-50 text-red-800 border-red-300'}`}>
                      ⚠️ <strong>Authentication Required:</strong> {modalAutoPostPlatforms.filter(platform => !auth[platform].isAuthenticated).join(', ')} {modalAutoPostPlatforms.filter(platform => !auth[platform].isAuthenticated).length === 1 ? 'is' : 'are'} not authenticated. Please log in to these platforms before scheduling.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-notifications"
                  checked={modalNotificationEnabled}
                  onChange={(e) => onNotificationEnabledChange(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="modal-notifications" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🔔 Send browser notification when scheduled
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isConfirmDisabled
                  ? (darkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white')
                  : (darkMode
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed')
              }`}
            >
              📅 Schedule Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
