import { useState, useEffect, useCallback } from 'react';

interface Notification {
  visible: boolean;
  message: string;
}

export const useNotifications = () => {
  const [notification, setNotification] = useState<Notification>({
    visible: false,
    message: ''
  });
  const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported' | 'default'>('unknown');
  const [notificationScheduled, setNotificationScheduled] = useState(false);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationStatus('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationStatus(permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        setNotificationStatus('denied');
        return false;
      }
    }

    setNotificationStatus('denied');
    return false;
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification({
      visible: true,
      message
    });

    // Automatically hide notification after 5 seconds
    const timer = setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const scheduleNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (notificationStatus === 'granted') {
      new Notification(title, options);
    }
  }, [notificationStatus]);

  const clearNotification = useCallback(() => {
    setNotification({
      visible: false,
      message: ''
    });
  }, []);

  useEffect(() => {
    const checkNotificationSupport = async () => {
      if (!('Notification' in window)) {
        setNotificationStatus('unsupported');
        return;
      }

      setNotificationStatus(Notification.permission);
    };

    checkNotificationSupport();
  }, []);

  return {
    notification,
    notificationStatus,
    notificationScheduled,
    setNotificationScheduled,
    requestNotificationPermission,
    showNotification,
    scheduleNotification,
    clearNotification
  };
};