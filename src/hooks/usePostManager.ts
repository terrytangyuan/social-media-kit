import { useState, useEffect } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { getCurrentDateTimeString } from '../utils/dateTime';

export type Post = {
  id: string;
  title: string;
  content: string;
  scheduleTime: string;
  timezone: string;
  createdAt: string;
};

export const usePostManager = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [scheduleTime, setScheduleTime] = useState(() => getCurrentDateTimeString());
  const [timezone, setTimezone] = useState(() => {
    const saved = getItem(STORAGE_KEYS.TIMEZONE, "");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  // Load saved posts on mount
  useEffect(() => {
    const savedPosts = getItem(STORAGE_KEYS.SOCIAL_MEDIA_POSTS, []);
    const savedDraft = getItem(STORAGE_KEYS.SOCIAL_MEDIA_DRAFT, "");
    const savedSchedule = getItem(STORAGE_KEYS.SCHEDULE_TIME, getCurrentDateTimeString());
    const savedTimezone = getItem(STORAGE_KEYS.TIMEZONE, "");

    setPosts(savedPosts);
    
    // If no current post and we have saved posts, use the first one
    if (savedPosts.length > 0 && !savedDraft) {
      const firstPost = savedPosts[0];
      setCurrentPostId(firstPost.id);
      setText(firstPost.content);
      setScheduleTime(firstPost.scheduleTime);
      setTimezone(firstPost.timezone);
    } else if (savedDraft) {
      setText(savedDraft);
    }

    if (savedSchedule) {
      setScheduleTime(savedSchedule);
    }

    if (savedTimezone) {
      setTimezone(savedTimezone);
    }
  }, []);

  // Save posts to localStorage when they change
  useEffect(() => {
    setItem(STORAGE_KEYS.SOCIAL_MEDIA_POSTS, posts);
  }, [posts]);

  // Save current text as draft
  useEffect(() => {
    setItem(STORAGE_KEYS.SOCIAL_MEDIA_DRAFT, text);
  }, [text]);

  // Save schedule time
  useEffect(() => {
    setItem(STORAGE_KEYS.SCHEDULE_TIME, scheduleTime);
  }, [scheduleTime]);

  // Save timezone
  useEffect(() => {
    setItem(STORAGE_KEYS.TIMEZONE, timezone);
  }, [timezone]);

  const createNewPost = () => {
    const now = new Date().toISOString();
    const newPost: Post = {
      id: `post_${Date.now()}`,
      title: `Post ${posts.length + 1}`,
      content: '',
      scheduleTime: getCurrentDateTimeString(),
      timezone: timezone,
      createdAt: now
    };
    
    setPosts(prev => [newPost, ...prev]);
    setCurrentPostId(newPost.id);
    setText('');
    setScheduleTime(newPost.scheduleTime);
  };

  const saveCurrentPost = () => {
    if (!currentPostId) return;
    
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { ...post, content: text, scheduleTime, timezone }
        : post
    ));
  };

  const switchToPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setCurrentPostId(postId);
      setText(post.content);
      setScheduleTime(post.scheduleTime);
      setTimezone(post.timezone);
    }
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
    
    // If we deleted the current post, switch to another one or create new
    if (currentPostId === postId) {
      const remainingPosts = posts.filter(post => post.id !== postId);
      if (remainingPosts.length > 0) {
        switchToPost(remainingPosts[0].id);
      } else {
        createNewPost();
      }
    }
  };

  const updatePostTitle = (postId: string, title: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, title } : post
    ));
  };

  const savePostsToDisk = () => {
    const dataStr = JSON.stringify(posts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `social-media-posts-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadPostsFromDisk = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const loadedPosts = JSON.parse(content);
            
            // Validate the loaded data structure
            if (Array.isArray(loadedPosts) && loadedPosts.every(post => 
              post.id && post.title && typeof post.content === 'string'
            )) {
              setPosts(loadedPosts);
              if (loadedPosts.length > 0) {
                switchToPost(loadedPosts[0].id);
              }
              alert(`✅ Successfully loaded ${loadedPosts.length} posts!`);
            } else {
              alert('❌ Invalid file format. Please select a valid posts JSON file.');
            }
          } catch (error) {
            console.error('Error parsing file:', error);
            alert('❌ Error parsing file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  const currentPost = posts.find(p => p.id === currentPostId);

  return {
    posts,
    currentPost,
    currentPostId,
    text,
    setText,
    scheduleTime,
    setScheduleTime,
    timezone,
    setTimezone,
    createNewPost,
    saveCurrentPost,
    switchToPost,
    deletePost,
    updatePostTitle,
    savePostsToDisk,
    loadPostsFromDisk
  };
}; 