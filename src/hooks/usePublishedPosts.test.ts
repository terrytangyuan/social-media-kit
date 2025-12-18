import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { usePublishedPosts } from './usePublishedPosts';
import type { PublishedPost } from '../types';

describe('usePublishedPosts Hook', () => {
  // Helper to create mock published post
  const createMockPublishedPost = (id: string, title: string): PublishedPost => ({
    id,
    title,
    content: `Content for ${title}`,
    originalPostId: `original-${id}`,
    publishedAt: new Date().toISOString(),
    timezone: 'America/New_York',
    platformResults: [{
      platform: 'linkedin',
      success: true,
      postId: 'li-123',
      postUrl: 'https://linkedin.com/post/123',
      publishedAt: new Date().toISOString()
    }]
  });

  describe('Initial State', () => {
    it('should initialize with empty publishedPosts array', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.publishedPosts).toEqual([]);
    });

    it('should initialize with empty deletedPosts array', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.deletedPosts).toEqual([]);
    });

    it('should initialize showPublishedPosts as false', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.showPublishedPosts).toBe(false);
    });

    it('should initialize showDeletedPosts as false', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.showDeletedPosts).toBe(false);
    });

    it('should initialize selectedPublishedPost as null', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.selectedPublishedPost).toBeNull();
    });

    it('should initialize selectedDeletedPost as null', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.selectedDeletedPost).toBeNull();
    });

    it('should initialize selectedDeletedPostIds as empty Set', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.selectedDeletedPostIds).toBeInstanceOf(Set);
      expect(result.current.selectedDeletedPostIds.size).toBe(0);
    });

    it('should initialize lastClickedDeletedIndexRef as null', () => {
      const { result } = renderHook(() => usePublishedPosts());

      expect(result.current.lastClickedDeletedIndexRef.current).toBeNull();
    });
  });

  describe('addPublishedPost', () => {
    it('should add post to beginning of array', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
      });

      expect(result.current.publishedPosts).toHaveLength(1);
      expect(result.current.publishedPosts[0]).toEqual(post);
    });

    it('should add multiple posts in order', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'First'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Second'));
      });

      expect(result.current.publishedPosts).toHaveLength(2);
      expect(result.current.publishedPosts[0].title).toBe('Second'); // Most recent first
      expect(result.current.publishedPosts[1].title).toBe('First');
    });
  });

  describe('moveToDeleted', () => {
    it('should move post from published to deleted', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
      });

      act(() => {
        result.current.moveToDeleted('1');
      });

      expect(result.current.publishedPosts).toHaveLength(0);
      expect(result.current.deletedPosts).toHaveLength(1);
      expect(result.current.deletedPosts[0].id).toBe('1');
    });

    it('should set deletedAt timestamp', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
      });

      act(() => {
        result.current.moveToDeleted('1');
      });

      expect(result.current.deletedPosts[0].deletedAt).toBeTruthy();
      expect(new Date(result.current.deletedPosts[0].deletedAt).getTime()).toBeGreaterThan(0);
    });

    it('should preserve post data when moving to deleted', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
      });

      act(() => {
        result.current.moveToDeleted('1');
      });

      const deletedPost = result.current.deletedPosts[0];
      expect(deletedPost.title).toBe(post.title);
      expect(deletedPost.content).toBe(post.content);
      expect(deletedPost.originalPostId).toBe(post.originalPostId);
      expect(deletedPost.createdAt).toBe(post.publishedAt);
    });

    it('should not error when moving non-existent post', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.moveToDeleted('non-existent');
      });

      expect(result.current.deletedPosts).toHaveLength(0);
    });
  });

  describe('permanentlyDeletePost', () => {
    it('should permanently delete post from deleted posts', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      act(() => {
        result.current.permanentlyDeletePost('1');
      });

      expect(result.current.deletedPosts).toHaveLength(0);
    });

    it('should clear selection when deleting selected post', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 0);
      });

      expect(result.current.selectedDeletedPostIds.has('1')).toBe(true);

      act(() => {
        result.current.permanentlyDeletePost('1');
      });

      expect(result.current.selectedDeletedPostIds.has('1')).toBe(false);
    });

    it('should not affect other deleted posts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
      });

      act(() => {
        result.current.permanentlyDeletePost('1');
      });

      expect(result.current.deletedPosts).toHaveLength(1);
      expect(result.current.deletedPosts[0].id).toBe('2');
    });
  });

  describe('restorePost', () => {
    it('should restore post and remove from deleted', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      let restoredPost: any;
      act(() => {
        restoredPost = result.current.restorePost('1');
      });

      expect(result.current.deletedPosts).toHaveLength(0);
      expect(restoredPost).toBeTruthy();
      expect(restoredPost.id).toBe('1');
    });

    it('should return null when restoring non-existent post', () => {
      const { result } = renderHook(() => usePublishedPosts());

      let restoredPost: any;
      act(() => {
        restoredPost = result.current.restorePost('non-existent');
      });

      expect(restoredPost).toBeNull();
    });

    it('should return post data for re-adding to posts list', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      let restoredPost: any;
      act(() => {
        restoredPost = result.current.restorePost('1');
      });

      expect(restoredPost.title).toBe('Test Post');
      expect(restoredPost.content).toBe('Content for Test Post');
    });
  });

  describe('toggleDeletedPostSelection', () => {
    it('should select post when not selected', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 0);
      });

      expect(result.current.selectedDeletedPostIds.has('1')).toBe(true);
    });

    it('should deselect post when already selected', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 0);
        result.current.toggleDeletedPostSelection('1', 0);
      });

      expect(result.current.selectedDeletedPostIds.has('1')).toBe(false);
    });

    it('should update lastClickedDeletedIndexRef', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 3);
      });

      expect(result.current.lastClickedDeletedIndexRef.current).toBe(3);
    });

    it('should select range when shift-clicking', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.addPublishedPost(createMockPublishedPost('3', 'Post 3'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
        result.current.moveToDeleted('3');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('3', 0, false); // Click first
        result.current.toggleDeletedPostSelection('1', 2, true);  // Shift-click third
      });

      // Should select all posts in range [0, 2]
      expect(result.current.selectedDeletedPostIds.size).toBe(3);
      expect(result.current.selectedDeletedPostIds.has('1')).toBe(true);
      expect(result.current.selectedDeletedPostIds.has('2')).toBe(true);
      expect(result.current.selectedDeletedPostIds.has('3')).toBe(true);
    });

    it('should select range in reverse order', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.addPublishedPost(createMockPublishedPost('3', 'Post 3'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
        result.current.moveToDeleted('3');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 2, false); // Click third
        result.current.toggleDeletedPostSelection('3', 0, true);  // Shift-click first
      });

      expect(result.current.selectedDeletedPostIds.size).toBe(3);
    });
  });

  describe('selectAllDeletedPosts', () => {
    it('should select all deleted posts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.addPublishedPost(createMockPublishedPost('3', 'Post 3'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
        result.current.moveToDeleted('3');
      });

      act(() => {
        result.current.selectAllDeletedPosts();
      });

      expect(result.current.selectedDeletedPostIds.size).toBe(3);
      expect(result.current.selectedDeletedPostIds.has('1')).toBe(true);
      expect(result.current.selectedDeletedPostIds.has('2')).toBe(true);
      expect(result.current.selectedDeletedPostIds.has('3')).toBe(true);
    });

    it('should reset lastClickedDeletedIndexRef', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.moveToDeleted('1');
        result.current.toggleDeletedPostSelection('1', 0);
      });

      act(() => {
        result.current.selectAllDeletedPosts();
      });

      expect(result.current.lastClickedDeletedIndexRef.current).toBeNull();
    });
  });

  describe('deselectAllDeletedPosts', () => {
    it('should deselect all deleted posts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
        result.current.selectAllDeletedPosts();
      });

      act(() => {
        result.current.deselectAllDeletedPosts();
      });

      expect(result.current.selectedDeletedPostIds.size).toBe(0);
    });

    it('should reset lastClickedDeletedIndexRef', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.moveToDeleted('1');
        result.current.toggleDeletedPostSelection('1', 0);
      });

      act(() => {
        result.current.deselectAllDeletedPosts();
      });

      expect(result.current.lastClickedDeletedIndexRef.current).toBeNull();
    });
  });

  describe('permanentlyDeleteSelectedPosts', () => {
    it('should delete all selected posts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.addPublishedPost(createMockPublishedPost('2', 'Post 2'));
        result.current.addPublishedPost(createMockPublishedPost('3', 'Post 3'));
        result.current.moveToDeleted('1');
        result.current.moveToDeleted('2');
        result.current.moveToDeleted('3');
      });

      act(() => {
        result.current.toggleDeletedPostSelection('1', 0);
        result.current.toggleDeletedPostSelection('2', 1);
      });

      let deletedCount: number = 0;
      act(() => {
        deletedCount = result.current.permanentlyDeleteSelectedPosts();
      });

      expect(deletedCount).toBe(2);
      expect(result.current.deletedPosts).toHaveLength(1);
      expect(result.current.deletedPosts[0].id).toBe('3');
    });

    it('should return 0 when no posts selected', () => {
      const { result } = renderHook(() => usePublishedPosts());

      let deletedCount: number = 0;
      act(() => {
        deletedCount = result.current.permanentlyDeleteSelectedPosts();
      });

      expect(deletedCount).toBe(0);
    });

    it('should clear selection after deletion', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.moveToDeleted('1');
        result.current.toggleDeletedPostSelection('1', 0);
      });

      act(() => {
        result.current.permanentlyDeleteSelectedPosts();
      });

      expect(result.current.selectedDeletedPostIds.size).toBe(0);
    });

    it('should reset lastClickedDeletedIndexRef', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.addPublishedPost(createMockPublishedPost('1', 'Post 1'));
        result.current.moveToDeleted('1');
        result.current.toggleDeletedPostSelection('1', 0);
      });

      act(() => {
        result.current.permanentlyDeleteSelectedPosts();
      });

      expect(result.current.lastClickedDeletedIndexRef.current).toBeNull();
    });
  });

  describe('State Setters', () => {
    it('should update showPublishedPosts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.setShowPublishedPosts(true);
      });

      expect(result.current.showPublishedPosts).toBe(true);
    });

    it('should update showDeletedPosts', () => {
      const { result } = renderHook(() => usePublishedPosts());

      act(() => {
        result.current.setShowDeletedPosts(true);
      });

      expect(result.current.showDeletedPosts).toBe(true);
    });

    it('should update selectedPublishedPost', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.setSelectedPublishedPost(post);
      });

      expect(result.current.selectedPublishedPost).toEqual(post);
    });

    it('should update selectedDeletedPost', () => {
      const { result } = renderHook(() => usePublishedPosts());
      const post = createMockPublishedPost('1', 'Test Post');

      act(() => {
        result.current.addPublishedPost(post);
        result.current.moveToDeleted('1');
      });

      const deletedPost = result.current.deletedPosts[0];

      act(() => {
        result.current.setSelectedDeletedPost(deletedPost);
      });

      expect(result.current.selectedDeletedPost).toEqual(deletedPost);
    });
  });
});
