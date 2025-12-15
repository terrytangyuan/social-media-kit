import React from 'react';

interface NotificationProps {
  visible: boolean;
  message: string;
  darkMode: boolean;
}

export const Notification: React.FC<NotificationProps> = ({ visible, message, darkMode }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fadeIn">
      <div className={`px-4 py-2 rounded-lg shadow-lg border ${
        message.includes('❌')
          ? darkMode
            ? 'bg-red-800 text-red-200 border-red-600'
            : 'bg-red-100 text-red-800 border-red-300'
          : darkMode
            ? 'bg-green-800 text-green-200 border-green-600'
            : 'bg-green-100 text-green-800 border-green-300'
      }`}>
        {message}
      </div>
    </div>
  );
};
