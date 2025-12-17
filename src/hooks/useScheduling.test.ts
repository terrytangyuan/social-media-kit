import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useScheduling } from './useScheduling';

describe('useScheduling Hook', () => {
  // Save original localStorage
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    // Mock Intl.DateTimeFormat
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'America/New_York' })
    } as any);
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });

    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with current datetime for scheduleTime', () => {
      const { result } = renderHook(() => useScheduling());

      // Should be in format YYYY-MM-DDTHH:mm
      expect(result.current.scheduleTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should initialize autoPostEnabled as false', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.autoPostEnabled).toBe(false);
    });

    it('should initialize autoPostPlatforms as empty array', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.autoPostPlatforms).toEqual([]);
    });

    it('should initialize scheduledPostsStatus as empty object', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.scheduledPostsStatus).toEqual({});
    });

    it('should initialize executedPosts as empty Set', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.executedPosts).toBeInstanceOf(Set);
      expect(result.current.executedPosts.size).toBe(0);
    });

    it('should initialize showScheduleModal as false', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.showScheduleModal).toBe(false);
    });

    it('should initialize modalTimezone from localStorage if available', () => {
      const mockGetItem = global.localStorage.getItem as jest.MockedFunction<typeof localStorage.getItem>;
      mockGetItem.mockReturnValue('Europe/London');

      const { result } = renderHook(() => useScheduling());

      expect(result.current.modalTimezone).toBe('Europe/London');
    });

    it('should initialize modalTimezone from Intl if localStorage is empty', () => {
      const mockGetItem = global.localStorage.getItem as jest.MockedFunction<typeof localStorage.getItem>;
      mockGetItem.mockReturnValue(null);

      const { result } = renderHook(() => useScheduling());

      expect(result.current.modalTimezone).toBe('America/New_York');
    });

    it('should initialize modalScheduleTime as empty string', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.modalScheduleTime).toBe('');
    });

    it('should initialize modalAutoPostEnabled as false', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.modalAutoPostEnabled).toBe(false);
    });

    it('should initialize modalNotificationEnabled as false', () => {
      const { result } = renderHook(() => useScheduling());

      expect(result.current.modalNotificationEnabled).toBe(false);
    });
  });

  describe('State Setters', () => {
    it('should update scheduleTime', () => {
      const { result } = renderHook(() => useScheduling());
      const newTime = '2024-12-25T15:30';

      act(() => {
        result.current.setScheduleTime(newTime);
      });

      expect(result.current.scheduleTime).toBe(newTime);
    });

    it('should update autoPostEnabled', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setAutoPostEnabled(true);
      });

      expect(result.current.autoPostEnabled).toBe(true);
    });

    it('should update autoPostPlatforms', () => {
      const { result } = renderHook(() => useScheduling());
      const platforms = ['linkedin', 'twitter'] as const;

      act(() => {
        result.current.setAutoPostPlatforms([...platforms]);
      });

      expect(result.current.autoPostPlatforms).toEqual(platforms);
    });

    it('should update showScheduleModal', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setShowScheduleModal(true);
      });

      expect(result.current.showScheduleModal).toBe(true);
    });

    it('should update modalScheduleTime', () => {
      const { result } = renderHook(() => useScheduling());
      const newTime = '2024-12-25T15:30';

      act(() => {
        result.current.setModalScheduleTime(newTime);
      });

      expect(result.current.modalScheduleTime).toBe(newTime);
    });

    it('should update modalTimezone', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setModalTimezone('Asia/Tokyo');
      });

      expect(result.current.modalTimezone).toBe('Asia/Tokyo');
    });

    it('should update modalAutoPostEnabled', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setModalAutoPostEnabled(true);
      });

      expect(result.current.modalAutoPostEnabled).toBe(true);
    });

    it('should update modalAutoPostPlatforms', () => {
      const { result } = renderHook(() => useScheduling());
      const platforms = ['mastodon', 'bluesky'] as const;

      act(() => {
        result.current.setModalAutoPostPlatforms([...platforms]);
      });

      expect(result.current.modalAutoPostPlatforms).toEqual(platforms);
    });

    it('should update modalNotificationEnabled', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setModalNotificationEnabled(true);
      });

      expect(result.current.modalNotificationEnabled).toBe(true);
    });
  });

  describe('openScheduleModal', () => {
    it('should copy current values to modal state', () => {
      const { result } = renderHook(() => useScheduling());

      // Set some current values
      act(() => {
        result.current.setScheduleTime('2024-12-25T15:30');
        result.current.setAutoPostEnabled(true);
        result.current.setAutoPostPlatforms(['linkedin', 'twitter']);
      });

      // Open modal
      act(() => {
        result.current.openScheduleModal();
      });

      expect(result.current.modalScheduleTime).toBe('2024-12-25T15:30');
      expect(result.current.modalAutoPostEnabled).toBe(true);
      expect(result.current.modalAutoPostPlatforms).toEqual(['linkedin', 'twitter']);
      expect(result.current.showScheduleModal).toBe(true);
    });

    it('should reset modalNotificationEnabled to false', () => {
      const { result } = renderHook(() => useScheduling());

      // Set notification enabled
      act(() => {
        result.current.setModalNotificationEnabled(true);
      });

      // Open modal
      act(() => {
        result.current.openScheduleModal();
      });

      expect(result.current.modalNotificationEnabled).toBe(false);
    });

    it('should set showScheduleModal to true', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.openScheduleModal();
      });

      expect(result.current.showScheduleModal).toBe(true);
    });
  });

  describe('handleScheduleConfirm', () => {
    it('should copy modal values to current state', () => {
      const { result } = renderHook(() => useScheduling());

      // Set modal values
      act(() => {
        result.current.setModalScheduleTime('2024-12-25T15:30');
        result.current.setModalAutoPostEnabled(true);
        result.current.setModalAutoPostPlatforms(['linkedin', 'twitter']);
      });

      // Confirm
      act(() => {
        result.current.handleScheduleConfirm();
      });

      expect(result.current.scheduleTime).toBe('2024-12-25T15:30');
      expect(result.current.autoPostEnabled).toBe(true);
      expect(result.current.autoPostPlatforms).toEqual(['linkedin', 'twitter']);
    });

    it('should close the modal', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setShowScheduleModal(true);
      });

      act(() => {
        result.current.handleScheduleConfirm();
      });

      expect(result.current.showScheduleModal).toBe(false);
    });

    it('should return schedule configuration', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setModalScheduleTime('2024-12-25T15:30');
        result.current.setModalTimezone('Asia/Tokyo');
        result.current.setModalAutoPostEnabled(true);
        result.current.setModalAutoPostPlatforms(['linkedin', 'twitter']);
        result.current.setModalNotificationEnabled(true);
      });

      let returnValue: any;
      act(() => {
        returnValue = result.current.handleScheduleConfirm();
      });

      expect(returnValue).toEqual({
        scheduleTime: '2024-12-25T15:30',
        timezone: 'Asia/Tokyo',
        autoPostEnabled: true,
        autoPostPlatforms: ['linkedin', 'twitter'],
        notificationEnabled: true
      });
    });
  });

  describe('Post Execution Tracking', () => {
    describe('markPostAsExecuted', () => {
      it('should add post to executedPosts set', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(true);
      });

      it('should set post status to completed', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
        });

        expect(result.current.scheduledPostsStatus['post-1']).toBe('completed');
      });

      it('should handle multiple posts', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
          result.current.markPostAsExecuted('post-2');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(true);
        expect(result.current.executedPosts.has('post-2')).toBe(true);
        expect(result.current.scheduledPostsStatus['post-1']).toBe('completed');
        expect(result.current.scheduledPostsStatus['post-2']).toBe('completed');
      });
    });

    describe('markPostAsExecuting', () => {
      it('should set post status to executing', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuting('post-1');
        });

        expect(result.current.scheduledPostsStatus['post-1']).toBe('executing');
      });

      it('should not add post to executedPosts', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuting('post-1');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(false);
      });
    });

    describe('markPostAsFailed', () => {
      it('should set post status to failed', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsFailed('post-1');
        });

        expect(result.current.scheduledPostsStatus['post-1']).toBe('failed');
      });

      it('should not add post to executedPosts', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsFailed('post-1');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(false);
      });
    });

    describe('resetPostExecution', () => {
      it('should remove post from executedPosts', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
        });

        act(() => {
          result.current.resetPostExecution('post-1');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(false);
      });

      it('should remove post status', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
        });

        act(() => {
          result.current.resetPostExecution('post-1');
        });

        expect(result.current.scheduledPostsStatus['post-1']).toBeUndefined();
      });

      it('should not affect other posts', () => {
        const { result } = renderHook(() => useScheduling());

        act(() => {
          result.current.markPostAsExecuted('post-1');
          result.current.markPostAsExecuted('post-2');
        });

        act(() => {
          result.current.resetPostExecution('post-1');
        });

        expect(result.current.executedPosts.has('post-1')).toBe(false);
        expect(result.current.executedPosts.has('post-2')).toBe(true);
        expect(result.current.scheduledPostsStatus['post-2']).toBe('completed');
      });
    });
  });

  describe('Status Transitions', () => {
    it('should transition post from pending to executing to completed', () => {
      const { result } = renderHook(() => useScheduling());

      // Mark as executing
      act(() => {
        result.current.markPostAsExecuting('post-1');
      });
      expect(result.current.scheduledPostsStatus['post-1']).toBe('executing');

      // Mark as completed
      act(() => {
        result.current.markPostAsExecuted('post-1');
      });
      expect(result.current.scheduledPostsStatus['post-1']).toBe('completed');
      expect(result.current.executedPosts.has('post-1')).toBe(true);
    });

    it('should allow retry after failed status', () => {
      const { result } = renderHook(() => useScheduling());

      // Mark as failed
      act(() => {
        result.current.markPostAsFailed('post-1');
      });
      expect(result.current.scheduledPostsStatus['post-1']).toBe('failed');

      // Reset for retry
      act(() => {
        result.current.resetPostExecution('post-1');
      });
      expect(result.current.scheduledPostsStatus['post-1']).toBeUndefined();

      // Retry execution
      act(() => {
        result.current.markPostAsExecuting('post-1');
      });
      expect(result.current.scheduledPostsStatus['post-1']).toBe('executing');
    });
  });

  describe('Edge Cases', () => {
    it('should handle resetting non-existent post', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.resetPostExecution('non-existent');
      });

      expect(result.current.executedPosts.has('non-existent')).toBe(false);
    });

    it('should handle marking same post as executed multiple times', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.markPostAsExecuted('post-1');
        result.current.markPostAsExecuted('post-1');
      });

      expect(result.current.executedPosts.size).toBe(1);
      expect(result.current.scheduledPostsStatus['post-1']).toBe('completed');
    });

    it('should handle empty platform arrays', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setAutoPostPlatforms([]);
      });

      expect(result.current.autoPostPlatforms).toEqual([]);
    });

    it('should handle all platforms selected', () => {
      const { result } = renderHook(() => useScheduling());

      act(() => {
        result.current.setAutoPostPlatforms(['linkedin', 'twitter', 'mastodon', 'bluesky']);
      });

      expect(result.current.autoPostPlatforms).toHaveLength(4);
    });
  });
});
