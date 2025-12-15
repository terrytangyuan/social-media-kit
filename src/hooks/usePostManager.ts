import { useState, useCallback, useRef } from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  scheduleTime: string;
  timezone: string;
  createdAt: string;
  isScheduled?: boolean;
  images?: {
    file: File;
    dataUrl: string;
    name: string;
  }[];
  platformImageSelections?: {
    [key: string]: number[];
  };
  autoPost?: {
    enabled: boolean;
    platforms: ('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[];
  };
}

interface DeletedPost {
  id: string;
  title: string;
  content: string;
  deletedAt: string;
  originalCreatedAt: string;
}

export const usePostManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  const getCurrentDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const createNewPost = useCallback((
    content: string,
    scheduleTime: string,
    timezone: string,
    images: any[],
    platformImageSelections: any,
    autoPostEnabled: boolean,
    autoPostPlatforms: any[]
  ) => {
    const currentTime = getCurrentDateTimeString();
    const newPost: Post = {
      id: Date.now().toString(),
      title: `Post ${posts.length + 1}`,
      content,
      scheduleTime,
      timezone,
      createdAt: currentTime,
      isScheduled: false,
      images,
      platformImageSelections,
      autoPost: {
        enabled: autoPostEnabled,
        platforms: autoPostPlatforms
      }
    };

    setPosts(prev => [...prev, newPost]);
    setCurrentPostId(newPost.id);

    return newPost.id;
  }, [posts.length]);

  const saveCurrentPost = useCallback((
    postId: string | null,
    content: string,
    scheduleTime: string,
    timezone: string,
    images: any[],
    platformImageSelections: any,
    autoPostEnabled: boolean,
    autoPostPlatforms: any[],
    markAsScheduled = false,
    unschedule = false
  ) => {
    if (!postId) {
      return null;
    }

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          content,
          scheduleTime,
          timezone,
          images,
          platformImageSelections,
          isScheduled: unschedule ? false : (markAsScheduled || post.isScheduled),
          autoPost: {
            enabled: autoPostEnabled,
            platforms: autoPostPlatforms
          }
        };
      }
      return post;
    }));

    return postId;
  }, []);

  const switchToPost = useCallback((
    postId: string,
    currentPostId: string | null,
    saveCallback: () => void
  ) => {
    // Save current changes first
    if (currentPostId) {
      saveCallback();
    }

    const post = posts.find(p => p.id === postId);
    if (post) {
      setCurrentPostId(postId);
      return post;
    }
    return null;
  }, [posts]);

  const deletePost = useCallback((postId: string) => {
    const postToDelete = posts.find(p => p.id === postId);

    setPosts(prev => prev.filter(p => p.id !== postId));

    // Clear selection if deleted
    setSelectedPostIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });

    return postToDelete;
  }, [posts]);

  const togglePostSelection = useCallback((postId: string, index: number, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      // Shift-click: select range
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);

      setSelectedPostIds(prev => {
        const newSet = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (posts[i]) {
            newSet.add(posts[i].id);
          }
        }
        return newSet;
      });
    } else {
      // Normal click: toggle single item
      setSelectedPostIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
      lastClickedIndexRef.current = index;
    }
  }, [posts]);

  const selectAllPosts = useCallback(() => {
    setSelectedPostIds(new Set(posts.map(p => p.id)));
    lastClickedIndexRef.current = null;
  }, [posts]);

  const deselectAllPosts = useCallback(() => {
    setSelectedPostIds(new Set());
    lastClickedIndexRef.current = null;
  }, []);

  const deleteSelectedPosts = useCallback(() => {
    if (selectedPostIds.size === 0) return [];

    const deletedPosts = posts.filter(p => selectedPostIds.has(p.id));

    setPosts(prev => prev.filter(p => !selectedPostIds.has(p.id)));
    setSelectedPostIds(new Set());
    lastClickedIndexRef.current = null;

    return deletedPosts;
  }, [posts, selectedPostIds]);

  const updatePostTitle = useCallback((postId: string, title: string) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, title } : post
    ));
  }, []);

  const exportPosts = useCallback((currentPostId: string | null, saveCallback: () => void) => {
    // Auto-save current post before exporting
    if (currentPostId) {
      saveCallback();
    }

    const dataStr = JSON.stringify(posts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `social-media-posts-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [posts]);

  const importPosts = useCallback((onSuccess: (count: number) => void, onError: (error: string) => void) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedPosts = JSON.parse(e.target?.result as string);

          if (!Array.isArray(importedPosts)) {
            throw new Error('Invalid file format');
          }

          setPosts(prev => [...prev, ...importedPosts]);
          onSuccess(importedPosts.length);
        } catch (error) {
          onError('Failed to import posts. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }, []);

  return {
    // State
    posts,
    setPosts,
    currentPostId,
    setCurrentPostId,
    selectedPostIds,
    setSelectedPostIds,
    lastClickedIndexRef,

    // Functions
    createNewPost,
    saveCurrentPost,
    switchToPost,
    deletePost,
    togglePostSelection,
    selectAllPosts,
    deselectAllPosts,
    deleteSelectedPosts,
    updatePostTitle,
    exportPosts,
    importPosts
  };
};
