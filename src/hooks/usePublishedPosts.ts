import { useState, useCallback, useRef } from 'react';
import { PublishedPost, DeletedPost } from '../types';

export const usePublishedPosts = () => {
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);

  // Keep a ref to the current deletedPosts for synchronous access
  const deletedPostsRef = useRef<DeletedPost[]>([]);
  deletedPostsRef.current = deletedPosts;

  const [showPublishedPosts, setShowPublishedPosts] = useState(false);
  const [showDeletedPosts, setShowDeletedPosts] = useState(false);

  const [selectedPublishedPost, setSelectedPublishedPost] = useState<PublishedPost | null>(null);
  const [selectedDeletedPost, setSelectedDeletedPost] = useState<DeletedPost | null>(null);

  // Bulk selection for deleted posts
  const [selectedDeletedPostIds, setSelectedDeletedPostIds] = useState<Set<string>>(new Set());
  const lastClickedDeletedIndexRef = useRef<number | null>(null);

  const addPublishedPost = useCallback((post: PublishedPost) => {
    setPublishedPosts(prev => [post, ...prev]);
  }, []);

  const moveToDeleted = useCallback((postId: string) => {
    setPublishedPosts(prev => {
      const post = prev.find(p => p.id === postId);
      if (!post) return prev;

      const deletedPost: DeletedPost = {
        id: post.id,
        title: post.title,
        content: post.content,
        originalPostId: post.originalPostId,
        deletedAt: new Date().toISOString(),
        timezone: post.timezone,
        createdAt: post.publishedAt, // Use publishedAt as createdAt
        images: post.images,
        platformImageSelections: post.platformImageSelections
      };

      setDeletedPosts(prevDeleted => [deletedPost, ...prevDeleted]);
      return prev.filter(p => p.id !== postId);
    });
  }, []);

  const permanentlyDeletePost = useCallback((postId: string) => {
    setDeletedPosts(prev => prev.filter(p => p.id !== postId));

    // Clear selection if deleted
    setSelectedDeletedPostIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
  }, []);

  const restorePost = useCallback((postId: string) => {
    // Use ref to access current state synchronously
    const post = deletedPostsRef.current.find(p => p.id === postId);
    if (!post) return null;

    // Update state to remove the post
    setDeletedPosts(prev => prev.filter(p => p.id !== postId));

    // Return the post data so it can be restored in the main posts list
    return post;
  }, []);

  const toggleDeletedPostSelection = useCallback((postId: string, index: number, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedDeletedIndexRef.current !== null) {
      // Shift-click: select range
      const start = Math.min(lastClickedDeletedIndexRef.current, index);
      const end = Math.max(lastClickedDeletedIndexRef.current, index);

      setDeletedPosts(prevDeleted => {
        setSelectedDeletedPostIds(prev => {
          const newSet = new Set(prev);
          for (let i = start; i <= end; i++) {
            if (prevDeleted[i]) {
              newSet.add(prevDeleted[i].id);
            }
          }
          return newSet;
        });
        return prevDeleted;
      });
    } else {
      // Normal click: toggle single item
      setSelectedDeletedPostIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
      lastClickedDeletedIndexRef.current = index;
    }
  }, []);

  const selectAllDeletedPosts = useCallback(() => {
    setDeletedPosts(prevDeleted => {
      setSelectedDeletedPostIds(new Set(prevDeleted.map(p => p.id)));
      return prevDeleted;
    });
    lastClickedDeletedIndexRef.current = null;
  }, []);

  const deselectAllDeletedPosts = useCallback(() => {
    setSelectedDeletedPostIds(new Set());
    lastClickedDeletedIndexRef.current = null;
  }, []);

  const permanentlyDeleteSelectedPosts = useCallback(() => {
    if (selectedDeletedPostIds.size === 0) return 0;

    const count = selectedDeletedPostIds.size;
    setDeletedPosts(prev => prev.filter(p => !selectedDeletedPostIds.has(p.id)));
    setSelectedDeletedPostIds(new Set());
    lastClickedDeletedIndexRef.current = null;

    return count;
  }, [selectedDeletedPostIds]);

  return {
    // Published posts state
    publishedPosts,
    setPublishedPosts,
    showPublishedPosts,
    setShowPublishedPosts,
    selectedPublishedPost,
    setSelectedPublishedPost,

    // Deleted posts state
    deletedPosts,
    setDeletedPosts,
    showDeletedPosts,
    setShowDeletedPosts,
    selectedDeletedPost,
    setSelectedDeletedPost,
    selectedDeletedPostIds,
    setSelectedDeletedPostIds,
    lastClickedDeletedIndexRef,

    // Functions
    addPublishedPost,
    moveToDeleted,
    permanentlyDeletePost,
    restorePost,
    toggleDeletedPostSelection,
    selectAllDeletedPosts,
    deselectAllDeletedPosts,
    permanentlyDeleteSelectedPosts
  };
};
