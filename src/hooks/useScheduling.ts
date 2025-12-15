import { useState, useCallback } from 'react';

export const useScheduling = () => {
  const [scheduleTime, setScheduleTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [autoPostPlatforms, setAutoPostPlatforms] = useState<('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[]>([]);

  const [scheduledPostsStatus, setScheduledPostsStatus] = useState<{[postId: string]: 'pending' | 'executing' | 'completed' | 'failed'}>({});
  const [executedPosts, setExecutedPosts] = useState<Set<string>>(new Set());

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalScheduleTime, setModalScheduleTime] = useState('');
  const [modalTimezone, setModalTimezone] = useState(() => {
    const saved = localStorage.getItem("timezone");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [modalAutoPostEnabled, setModalAutoPostEnabled] = useState(false);
  const [modalAutoPostPlatforms, setModalAutoPostPlatforms] = useState<('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[]>([]);
  const [modalNotificationEnabled, setModalNotificationEnabled] = useState(false);

  const openScheduleModal = useCallback(() => {
    setModalScheduleTime(scheduleTime);
    setModalTimezone(modalTimezone);
    setModalAutoPostEnabled(autoPostEnabled);
    setModalAutoPostPlatforms(autoPostPlatforms);
    setModalNotificationEnabled(false);
    setShowScheduleModal(true);
  }, [scheduleTime, modalTimezone, autoPostEnabled, autoPostPlatforms]);

  const handleScheduleConfirm = useCallback(() => {
    setScheduleTime(modalScheduleTime);
    setAutoPostEnabled(modalAutoPostEnabled);
    setAutoPostPlatforms(modalAutoPostPlatforms);
    setShowScheduleModal(false);

    return {
      scheduleTime: modalScheduleTime,
      timezone: modalTimezone,
      autoPostEnabled: modalAutoPostEnabled,
      autoPostPlatforms: modalAutoPostPlatforms,
      notificationEnabled: modalNotificationEnabled
    };
  }, [modalScheduleTime, modalTimezone, modalAutoPostEnabled, modalAutoPostPlatforms, modalNotificationEnabled]);

  const resetPostExecution = useCallback((postId: string) => {
    setExecutedPosts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
    setScheduledPostsStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[postId];
      return newStatus;
    });
  }, []);

  const markPostAsExecuted = useCallback((postId: string) => {
    setExecutedPosts(prev => new Set(prev).add(postId));
    setScheduledPostsStatus(prev => ({
      ...prev,
      [postId]: 'completed'
    }));
  }, []);

  const markPostAsExecuting = useCallback((postId: string) => {
    setScheduledPostsStatus(prev => ({
      ...prev,
      [postId]: 'executing'
    }));
  }, []);

  const markPostAsFailed = useCallback((postId: string) => {
    setScheduledPostsStatus(prev => ({
      ...prev,
      [postId]: 'failed'
    }));
  }, []);

  return {
    // Schedule time state
    scheduleTime,
    setScheduleTime,

    // Auto-post state
    autoPostEnabled,
    setAutoPostEnabled,
    autoPostPlatforms,
    setAutoPostPlatforms,

    // Execution tracking
    scheduledPostsStatus,
    setScheduledPostsStatus,
    executedPosts,
    setExecutedPosts,

    // Modal state
    showScheduleModal,
    setShowScheduleModal,
    modalScheduleTime,
    setModalScheduleTime,
    modalTimezone,
    setModalTimezone,
    modalAutoPostEnabled,
    setModalAutoPostEnabled,
    modalAutoPostPlatforms,
    setModalAutoPostPlatforms,
    modalNotificationEnabled,
    setModalNotificationEnabled,

    // Functions
    openScheduleModal,
    handleScheduleConfirm,
    resetPostExecution,
    markPostAsExecuted,
    markPostAsExecuting,
    markPostAsFailed
  };
};
