import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { countWords, countCharacters, countCharactersForBluesky, toUnicodeStyle } from "./utils/textFormatting";
import { chunkText, getPlatformTextLength, Platform } from "./utils/chunking";
import { processUnifiedTags, formatForPlatform as formatForPlatformUtil } from "./utils/tagging";
import { serializePostsForStorage, deserializePostsFromStorage } from "./utils/postSerialization";
import { getCurrentDateTimeString, formatTimezoneTime } from "./utils/dateTimeUtils";
import { extractPostInfo, isAuthenticationError, capitalizePlatform, getPlatformDisplayName } from "./utils/platformHelpers";
import { generatePKCE } from "./utils/oauthHelpers";
import { getPostDelay } from "./utils/postingHelpers";
import { TagAutocomplete } from "./components/TagAutocomplete";
import { TagManagerModal } from "./components/TagManagerModal";
import { PublishedPostsModal } from "./components/PublishedPostsModal";
import { PublishedPostDetailsModal } from "./components/PublishedPostDetailsModal";
import { DeletedPostsModal } from "./components/DeletedPostsModal";
import { DeletedPostDetailsModal } from "./components/DeletedPostDetailsModal";
import AuthModal from "./components/AuthModal";
import SettingsModal from "./components/SettingsModal";
import { ScheduleModal } from "./components/ScheduleModal";
import { EmojiPicker } from "./components/EmojiPicker";
import { PostManagerModal } from "./components/PostManagerModal";
import { TextEditor } from "./components/TextEditor";
import PlatformSelector from "./components/PlatformSelector";
import { ImageUploadSection } from "./components/ImageUploadSection";
import { ChunkPreview } from "./components/ChunkPreview";
import { Notification as ToastNotification } from "./components/Notification";
import LogoutModal from "./components/LogoutModal";
import ImageSelectorModal from "./components/ImageSelectorModal";
import { getPlatformLimits, IMAGE_LIMITS, EMOJI_CATEGORIES, COMMON_TIMEZONES } from "./constants";
import { useAuth } from "./hooks/useAuth";
import { useTextEditor } from "./hooks/useTextEditor";
import { useNotifications } from "./hooks/useNotifications";
import { useImageManager } from "./hooks/useImageManager";
import { usePostManager } from "./hooks/usePostManager";
import { useScheduling } from "./hooks/useScheduling";
import { useTagging } from "./hooks/useTagging";
import { usePublishedPosts } from "./hooks/usePublishedPosts";
import {
  TagSuggestion,
  OAuthConfig,
  DEFAULT_OAUTH_CONFIG,
  AuthState,
  PlatformAuth,
  PersonMapping,
  TaggingState,
  PlatformPostResult,
  PublishedPost,
  DeletedPost
} from "./types";
import * as PlatformPosting from './services/platformPosting';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [showPostManager, setShowPostManager] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter' | 'mastodon' | 'bluesky'>('linkedin');
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem("timezone");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  // Authentication hook
  const {
    auth,
    setAuth,
    showAuthModal,
    setShowAuthModal,
    authPlatform,
    setAuthPlatform,
    blueskyCredentials,
    setBlueskyCredentials,
    oauthConfig,
    oauthConfigLoaded,
    logout,
    getAuthenticatedPlatforms,
    updateOAuthConfig,
    clearOAuthLocalStorage,
    isTokenExpired
  } = useAuth();

  // Text editor hook
  const {
    text,
    setText,
    textareaRef,
    undoHistory,
    redoHistory,
    handleKeyDown,
    performUndo,
    performRedo,
    formatText,
    insertAtCursor,
    isUndoRedoAction
  } = useTextEditor("");

  // Notifications hook
  const {
    notification,
    notificationStatus,
    notificationScheduled,
    setNotificationScheduled,
    requestNotificationPermission,
    showNotification,
    scheduleNotification,
    clearNotification
  } = useNotifications();

  // Image manager hook
  const {
    attachedImages,
    platformImageSelections,
    hasExplicitSelection,
    showImageSelector,
    pendingPlatform,
    handleImageUpload,
    removeAttachedImage,
    updatePlatformSelection,
    selectImagesForPlatform,
    getSelectedImagesForPlatform,
    reorderImages,
    clearAllImages,
    setAttachedImages,
    setPlatformImageSelections
  } = useImageManager();

  // Post manager hook
  const {
    posts,
    setPosts,
    currentPostId,
    setCurrentPostId,
    selectedPostIds,
    setSelectedPostIds,
    lastClickedIndexRef,
    createNewPost: createNewPostFromHook,
    saveCurrentPost: saveCurrentPostFromHook,
    switchToPost: switchToPostFromHook,
    deletePost: deletePostFromHook,
    togglePostSelection,
    selectAllPosts,
    deselectAllPosts,
    deleteSelectedPosts: deleteSelectedPostsFromHook,
    updatePostTitle,
    exportPosts: exportPostsFromHook,
    importPosts: importPostsFromHook
  } = usePostManager();

  // Scheduling hook
  const {
    scheduleTime,
    setScheduleTime,
    autoPostEnabled,
    setAutoPostEnabled,
    autoPostPlatforms,
    setAutoPostPlatforms,
    scheduledPostsStatus,
    setScheduledPostsStatus,
    executedPosts,
    setExecutedPosts,
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
    openScheduleModal,
    handleScheduleConfirm: handleScheduleConfirmFromHook,
    resetPostExecution,
    markPostAsExecuted,
    markPostAsExecuting,
    markPostAsFailed
  } = useScheduling();

  // Tagging hook
  const {
    taggingState,
    setTaggingState,
    showTagManager,
    setShowTagManager,
    showTagAutocomplete,
    setShowTagAutocomplete,
    tagAutocompletePosition,
    setTagAutocompletePosition,
    tagAutocompleteFilter,
    setTagAutocompleteFilter,
    tagAutocompleteStartPos,
    setTagAutocompleteStartPos,
    newPersonMapping,
    setNewPersonMapping,
    editingPersonId,
    setEditingPersonId,
    editPersonMapping,
    setEditPersonMapping,
    addPersonMapping: addPersonMappingFromHook,
    updatePersonMapping: updatePersonMappingFromHook,
    deletePersonMapping,
    startEditingPerson: startEditingPersonFromHook,
    cancelEditingPerson
  } = useTagging();

  // Published posts hook
  const {
    publishedPosts,
    setPublishedPosts,
    showPublishedPosts,
    setShowPublishedPosts,
    selectedPublishedPost,
    setSelectedPublishedPost,
    deletedPosts,
    setDeletedPosts,
    showDeletedPosts,
    setShowDeletedPosts,
    selectedDeletedPost,
    setSelectedDeletedPost,
    selectedDeletedPostIds,
    setSelectedDeletedPostIds,
    lastClickedDeletedIndexRef,
    addPublishedPost: addPublishedPostFromHook,
    moveToDeleted,
    permanentlyDeletePost,
    restorePost,
    toggleDeletedPostSelection,
    selectAllDeletedPosts,
    deselectAllDeletedPosts,
    permanentlyDeleteSelectedPosts
  } = usePublishedPosts();

  const [isPosting, setIsPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<string>('');

  // Rate limiting for API calls
  const [lastApiCall, setLastApiCall] = useState<{[platform: string]: number}>({});

  // Multi-platform logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedLogoutPlatforms, setSelectedLogoutPlatforms] = useState<string[]>([]);
  
  // Auto-sync is always enabled
  const [showOAuthSettings, setShowOAuthSettings] = useState(false);

  // X Premium setting
  const [isXPremium, setIsXPremium] = useState(false);

  // Dynamic platform limits based on X Premium setting
  const PLATFORM_LIMITS = getPlatformLimits(isXPremium);

  // Helper function to get platform-specific character count
  const getPlatformCharacterCount = (text: string): number => {
    // Bluesky counts graphemes in formatted text (with Unicode bold/italic)
    if (selectedPlatform === 'bluesky') {
      return countCharactersForBluesky(text);
    }
    // Other platforms count without formatting markers
    return countCharacters(text);
  };

  // Helper function to attempt automatic token refresh
  const attemptTokenRefresh = async (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): Promise<boolean> => {
    const authData = auth[platform];
    return PlatformPosting.attemptTokenRefresh(
      platform,
      authData,
      (newAuth) => setAuth(prev => ({ ...prev, [platform]: { ...prev[platform], ...newAuth } })),
      showNotification
    );
  };

  // Helper function to ensure valid authentication before API calls
  const ensureValidAuth = async (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): Promise<boolean> => {
    const authData = auth[platform];
    return PlatformPosting.ensureValidAuth(
      platform,
      authData,
      (newAuth) => setAuth(prev => ({ ...prev, [platform]: { ...prev[platform], ...newAuth } })),
      showNotification
    );
  };

  // Notification functions are now provided by useNotifications hook

  useEffect(() => {
    const saved = localStorage.getItem("socialMediaDraft");
    const dark = localStorage.getItem("darkMode");
    const schedule = localStorage.getItem("scheduleTime");
    const savedTimezone = localStorage.getItem("timezone");
    const savedPosts = localStorage.getItem("socialMediaPosts");
    const savedPublishedPosts = localStorage.getItem("socialMediaPublishedPosts");
    const savedDeletedPosts = localStorage.getItem("socialMediaDeletedPosts");
    const savedAuth = localStorage.getItem("platformAuth");
    const savedOAuthConfig = localStorage.getItem("oauthConfig");
    const savedTagging = localStorage.getItem("unifiedTagging");
    const savedXPremium = localStorage.getItem("xPremium");
    
    // Check for preserved data from OAuth flow
    const preservedDraft = localStorage.getItem('socialMediaDraft_beforeOAuth');
    const preservedPostId = localStorage.getItem('currentPostId_beforeOAuth');
    
    if (savedXPremium) {
      setIsXPremium(JSON.parse(savedXPremium));
    }
    
    // Load published posts
    if (savedPublishedPosts) {
      try {
        const parsedPublishedPosts = JSON.parse(savedPublishedPosts);
        setPublishedPosts(parsedPublishedPosts);
      } catch (error) {
        console.error('Error loading published posts:', error);
      }
    }
    
    // Load deleted posts
    if (savedDeletedPosts) {
      try {
        const parsedDeletedPosts = JSON.parse(savedDeletedPosts);
        setDeletedPosts(parsedDeletedPosts);
      } catch (error) {
        console.error('Error loading deleted posts:', error);
      }
    }
    
    if (savedPosts) {
      const parsedPosts = JSON.parse(savedPosts);
      setPosts(parsedPosts);
      // If no current post and we have saved posts, use the first one
      // But don't override if we have a preserved post ID from OAuth
      if (parsedPosts.length > 0 && !saved && !preservedPostId) {
        const firstPost = parsedPosts[0];
        setCurrentPostId(firstPost.id);
        setText(firstPost.content);
        setScheduleTime(firstPost.scheduleTime);
        setTimezone(firstPost.timezone);
      }
    } else {
      // If no saved posts in localStorage, try to load from auto-sync
      loadAutoSyncedPosts();
    }
    
    // Auth loading is now handled by useAuth hook
    
    // Load saved tagging state
    if (savedTagging) {
      try {
        const parsedTagging = JSON.parse(savedTagging);
        setTaggingState(parsedTagging);
      } catch (error) {
        console.error('Error parsing saved tagging state:', error);
      }
    }

    // OAuth configuration loading is now handled by useAuth hook
    
    // Restore preserved data from OAuth flow first
    if (preservedDraft) {
      console.log('🔄 Found preserved draft from OAuth, restoring...');
      setText(preservedDraft);
      localStorage.removeItem('socialMediaDraft_beforeOAuth'); // Clean up
    } else if (saved) {
      setText(saved);
    }
    
    if (preservedPostId) {
      console.log('🔄 Found preserved post ID from OAuth, restoring...');
      setCurrentPostId(preservedPostId);
      localStorage.removeItem('currentPostId_beforeOAuth'); // Clean up
    }
    
    if (dark === "true") setDarkMode(true);
    if (schedule) setScheduleTime(schedule);
    if (savedTimezone) setTimezone(savedTimezone);
  }, []);

  useEffect(() => {
    localStorage.setItem("socialMediaDraft", text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("scheduleTime", scheduleTime);
  }, [scheduleTime]);

  useEffect(() => {
    localStorage.setItem("timezone", timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem("socialMediaPosts", JSON.stringify(posts));

    // Auto-sync posts when they change (always enabled)
    if (posts.length > 0) {
      // Debounce auto-sync to avoid excessive saves
      const timeoutId = setTimeout(() => {
        autoSyncPosts();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("socialMediaPublishedPosts", JSON.stringify(publishedPosts));
  }, [publishedPosts]);

  useEffect(() => {
    localStorage.setItem("socialMediaDeletedPosts", JSON.stringify(deletedPosts));
  }, [deletedPosts]);

  // Auth persistence is now handled by useAuth hook
  useEffect(() => {
    // Remove unauthenticated platforms from auto-posting selection
    const authenticatedPlatforms = (['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).filter(
      platform => auth[platform].isAuthenticated
    );

    setAutoPostPlatforms(prev => {
      const removedPlatforms = prev.filter(platform => !authenticatedPlatforms.includes(platform));
      const validPlatforms = prev.filter(platform => authenticatedPlatforms.includes(platform));

      // Notify user if platforms were removed
      if (removedPlatforms.length > 0) {
        console.warn(`🔓 Removed unauthenticated platforms from auto-posting: ${removedPlatforms.join(', ')}`);

        // Show notification if user has notification permission
        if (Notification.permission === "granted") {
          new Notification(`🔓 Authentication Lost`, {
            body: `Removed ${removedPlatforms.join(', ')} from auto-posting due to expired authentication. Please log in again.`,
            icon: "/favicon.ico",
            tag: `auth-expired`,
            requireInteraction: false
          });
        }
      }

      return validPlatforms;
    });
  }, [auth]);

  // OAuth config persistence is now handled by useAuth hook

  // Add tagging state persistence
  useEffect(() => {
    localStorage.setItem("unifiedTagging", JSON.stringify(taggingState));
  }, [taggingState]);

  // X Premium setting persistence
  useEffect(() => {
    localStorage.setItem("xPremium", JSON.stringify(isXPremium));
  }, [isXPremium]);

  useEffect(() => {
    // Notification status checking is now handled by useNotifications hook

    // Handle OAuth callback
    const handleOAuthCallback = async () => {
      console.log('🔄 OAuth callback triggered');
      
      // Debug: Log current state
      console.log('🐛 Debug - Current oauthConfig:', oauthConfig);
      console.log('🐛 Debug - oauthConfigLoaded:', oauthConfigLoaded);
      console.log('🐛 Debug - localStorage oauthConfig:', localStorage.getItem('oauthConfig'));
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      console.log('📝 URL params:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });
      
      if (error) {
        alert(`❌ OAuth Error: ${error}\n${urlParams.get('error_description') || 'Authentication failed'}`);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (code && state) {
        console.log('🔧 Using current OAuth config state:', oauthConfig);
        console.log('🔑 Current LinkedIn clientId:', oauthConfig.linkedin.clientId);
        // Determine platform from URL path or state
        let platform: 'linkedin' | 'twitter' | 'mastodon' | null = null;
        if (window.location.pathname.includes('/auth/linkedin')) {
          platform = 'linkedin';
        } else if (window.location.pathname.includes('/auth/twitter')) {
          platform = 'twitter';
        } else if (window.location.pathname.includes('/auth/mastodon')) {
          platform = 'mastodon';
        } else {
          // Fallback: check stored state
          const linkedinState = localStorage.getItem('oauth_state_linkedin');
          const twitterState = localStorage.getItem('oauth_state_twitter');
          const mastodonState = localStorage.getItem('oauth_state_mastodon');
          if (state === linkedinState) platform = 'linkedin';
          else if (state === twitterState) platform = 'twitter';
          else if (state === mastodonState) platform = 'mastodon';
        }
        
        if (platform) {
          console.log('🎯 Detected platform:', platform);
          const storedState = localStorage.getItem(`oauth_state_${platform}`);
          console.log('🔑 State validation:', { received: state, stored: storedState, match: state === storedState });
          
          if (state === storedState) {
            try {
              console.log('✅ Starting OAuth completion for', platform);
              
              // Re-fetch OAuth config from server to ensure we have the latest configuration
              console.log('🔄 Re-fetching OAuth config from server for completion...');
              let completionConfig = oauthConfig;
              
              try {
                const response = await fetch('/api/oauth/config');
                if (response.ok) {
                  const serverConfig = await response.json();
                  console.log('✅ Fresh server OAuth config loaded for completion:', serverConfig);
                  completionConfig = serverConfig;
                } else {
                  console.warn('⚠️ Failed to re-fetch server config, using current state');
                }
              } catch (error) {
                console.error('Error re-fetching server config:', error);
                console.log('🔄 Using current oauthConfig state as fallback');
              }
              
              console.log('🔧 Using OAuth config for completion:', completionConfig);
              console.log('🔧 Platform config:', completionConfig[platform]);
              console.log('🔑 clientId for completion:', completionConfig[platform]?.clientId);
              
              // Call completion function with fresh config
              await completeOAuthFlow(platform, code, completionConfig);
              
              // Restore draft and post context after successful OAuth
              const oauthPreservedDraft = localStorage.getItem('socialMediaDraft_beforeOAuth');
              const oauthPreservedPostId = localStorage.getItem('currentPostId_beforeOAuth');
              
              if (oauthPreservedDraft && !text.trim()) {
                console.log('🔄 Restoring preserved draft after OAuth completion');
                setText(oauthPreservedDraft);
                localStorage.removeItem('socialMediaDraft_beforeOAuth'); // Clean up
              }
              
              if (oauthPreservedPostId && !currentPostId) {
                console.log('🔄 Restoring preserved post ID after OAuth completion');
                setCurrentPostId(oauthPreservedPostId);
                localStorage.removeItem('currentPostId_beforeOAuth'); // Clean up
              }
            } catch (error) {
              console.error('OAuth completion error:', error);
              alert(`❌ Failed to complete ${platform} authentication: ${error}`);
              
              // Restore draft and post context even if OAuth failed
              const oauthErrorPreservedDraft = localStorage.getItem('socialMediaDraft_beforeOAuth');
              const oauthErrorPreservedPostId = localStorage.getItem('currentPostId_beforeOAuth');
              
              if (oauthErrorPreservedDraft && !text.trim()) {
                console.log('🔄 Restoring preserved draft after OAuth error');
                setText(oauthErrorPreservedDraft);
                localStorage.removeItem('socialMediaDraft_beforeOAuth'); // Clean up
              }
              
              if (oauthErrorPreservedPostId && !currentPostId) {
                console.log('🔄 Restoring preserved post ID after OAuth error');
                setCurrentPostId(oauthErrorPreservedPostId);
                localStorage.removeItem('currentPostId_beforeOAuth'); // Clean up
              }
            }
          } else {
            alert('❌ OAuth Error: Invalid state parameter. Possible security issue.');
          }
          
          // Clean up
          localStorage.removeItem(`oauth_state_${platform}`);
          // Clean up Twitter code verifier if this was a Twitter OAuth flow
          if (platform === 'twitter') {
            localStorage.removeItem('twitter_code_verifier');
          }
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    handleOAuthCallback();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          performUndo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          performRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoHistory, redoHistory, text]);

  // Cleanup is now handled by useTextEditor hook

  const getMarkdownPreview = () => {
    const html = marked(text, { breaks: true });
    return DOMPurify.sanitize(html as string);
  };

  const applyMarkdown = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    // Check if the selected text is already wrapped with the formatting
    const isAlreadyWrapped = selected.startsWith(wrapper) && selected.endsWith(wrapper) && selected.length > wrapper.length * 2;
    
    // Check if the text around the selection has the formatting
    const expandedBefore = text.substring(Math.max(0, start - wrapper.length), start);
    const expandedAfter = text.substring(end, Math.min(text.length, end + wrapper.length));
    const isWrappedByContext = expandedBefore === wrapper && expandedAfter === wrapper;
    
    let newText: string;
    let newStart: number;
    let newEnd: number;

    if (isAlreadyWrapped) {
      // Remove formatting from selected text
      const unwrapped = selected.substring(wrapper.length, selected.length - wrapper.length);
      newText = before + unwrapped + after;
      newStart = start;
      newEnd = start + unwrapped.length;
    } else if (isWrappedByContext) {
      // Remove formatting from around the selection
      const beforeWithoutWrapper = text.substring(0, start - wrapper.length);
      const afterWithoutWrapper = text.substring(end + wrapper.length);
      newText = beforeWithoutWrapper + selected + afterWithoutWrapper;
      newStart = start - wrapper.length;
      newEnd = end - wrapper.length;
    } else {
      // Add formatting
      const wrapped = `${wrapper}${selected}${wrapper}`;
      newText = before + wrapped + after;
      newStart = start + wrapper.length;
      newEnd = end + wrapper.length;
    }

    setText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setText(before + emoji + after);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }, 0);
  };



  // Wrapper functions for hook functions that bridge between old signatures and new hook signatures
  const saveCurrentPost = (markAsScheduled = false, unschedule = false) => {
    return saveCurrentPostFromHook(
      currentPostId,
      text,
      scheduleTime,
      timezone,
      attachedImages,
      platformImageSelections,
      autoPostEnabled,
      autoPostPlatforms,
      markAsScheduled,
      unschedule
    );
  };

  const createNewPost = () => {
    const newPostId = createNewPostFromHook(
      text,
      scheduleTime,
      timezone,
      attachedImages,
      platformImageSelections,
      autoPostEnabled,
      autoPostPlatforms
    );
    // Reset local state
    setText("");
    setScheduleTime(getCurrentDateTimeString());
    return newPostId;
  };

  const switchToPost = (postId: string) => {
    const post = switchToPostFromHook(
      postId,
      currentPostId,
      () => saveCurrentPost()
    );
    if (post) {
      // Update local state with the switched post
      setText(post.content);
      setScheduleTime(post.scheduleTime);
      setTimezone(post.timezone);
      setAttachedImages(post.images || []);
      setPlatformImageSelections(post.platformImageSelections || {});
      setAutoPostEnabled(post.autoPost?.enabled || false);
      setAutoPostPlatforms(post.autoPost?.platforms || []);
    }
  };

  const deletePost = (postId: string) => {
    const deletedPost = deletePostFromHook(postId);
    // If current post was deleted, switch to another post or reset
    if (currentPostId === postId) {
      const remainingPost = posts.find(p => p.id !== postId);
      if (remainingPost) {
        switchToPost(remainingPost.id);
      } else {
        setCurrentPostId(null);
        setText("");
        setScheduleTime(getCurrentDateTimeString());
      }
    }
    return deletedPost;
  };

  const deleteSelectedPosts = () => {
    const deletedPosts = deleteSelectedPostsFromHook();
    // If current post was deleted, switch to another post or reset
    if (currentPostId && selectedPostIds.has(currentPostId)) {
      const remainingPost = posts.find(p => !selectedPostIds.has(p.id));
      if (remainingPost) {
        switchToPost(remainingPost.id);
      } else {
        setCurrentPostId(null);
        setText("");
        setScheduleTime(getCurrentDateTimeString());
      }
    }
    return deletedPosts;
  };

  const exportPosts = () => {
    return exportPostsFromHook(currentPostId, () => saveCurrentPost());
  };

  const importPosts = (onSuccess: (count: number) => void, onError: (error: string) => void) => {
    return importPostsFromHook(onSuccess, onError);
  };

  const addPersonMapping = () => {
    return addPersonMappingFromHook();
  };

  const updatePersonMapping = (id: string, updates: any) => {
    // This is a wrapper that maintains compatibility with old code
    // The hook uses editingPersonId and editPersonMapping state
    setEditingPersonId(id);
    setEditPersonMapping(updates);
    const result = updatePersonMappingFromHook();
    if (result) {
      setEditingPersonId(null);
      setEditPersonMapping({
        name: '',
        displayName: '',
        twitter: '',
        mastodon: '',
        bluesky: ''
      });
    }
    return result;
  };

  // Wrapper for addPublishedPost to match old signature
  const addPublishedPost = (post: any, platformResults: any[]) => {
    const publishedPost = {
      id: `published_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: post.title,
      content: post.content,
      originalPostId: post.id,
      publishedAt: new Date().toISOString(),
      timezone: post.timezone,
      platformResults,
      images: post.images,
      platformImageSelections: post.platformImageSelections,
    };
    return addPublishedPostFromHook(publishedPost);
  };

  // Wrapper for startEditingPerson to match old signature (takes id instead of full object)
  const startEditingPerson = (id: string) => {
    const person = taggingState.personMappings.find(p => p.id === id);
    if (person) {
      startEditingPersonFromHook(person);
    }
  };

  // Helper function to unschedule a post
  const unschedulePost = () => {
    saveCurrentPost(false, true);
  };

  const toggleSelectAll = () => {
    if (selectedPostIds.size === posts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(posts.map(p => p.id)));
    }
    // Reset last clicked index when using select all
    lastClickedIndexRef.current = null;
  };

  const savePostsToDisk = () => {
    // Auto-save current post before exporting
    if (currentPostId) {
      saveCurrentPost();
    }

    // Convert posts with File objects to serializable format
    const serializablePosts = serializePostsForStorage(posts);

    const dataToSave = {
      posts: serializablePosts,
      exportedAt: new Date().toISOString(),
      appVersion: "0.2.1"
    };

    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `social-media-posts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const loadPostsFromDisk = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate the data structure
          if (!data.posts || !Array.isArray(data.posts)) {
            alert('❌ Invalid file format. Please select a valid posts backup file.');
            return;
          }
          
          // Validate each post has required fields
          const validPosts = data.posts.filter((post: any) =>
            post.id && post.title !== undefined && post.content !== undefined
          );

          if (validPosts.length === 0) {
            alert('❌ No valid posts found in the file.');
            return;
          }

          // Convert image data back to File objects
          const postsWithFiles = deserializePostsFromStorage(validPosts);
          
          // Load the posts
          setPosts(postsWithFiles);
          
          // If there are posts, switch to the first one
          if (postsWithFiles.length > 0) {
            const firstPost = postsWithFiles[0];
            setCurrentPostId(firstPost.id);
            setText(firstPost.content);
            setScheduleTime(firstPost.scheduleTime || getCurrentDateTimeString());
            setTimezone(firstPost.timezone || timezone);
            
            // Restore images and platform selections for the first post
            setAttachedImages(firstPost.images || []);
            setPlatformImageSelections(firstPost.platformImageSelections || {});
            
            // Restore auto-posting settings
            setAutoPostEnabled(firstPost.autoPost?.enabled || false);
            setAutoPostPlatforms(firstPost.autoPost?.platforms || []);
          }
          
          alert(`✅ Successfully loaded ${postsWithFiles.length} posts!`);
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('❌ Error reading file. Please make sure it\'s a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    
    fileInput.click();
  };

  // Auto-sync functions (always enabled)
  const autoSyncPosts = () => {
    try {
      // Auto-save current post before syncing
      if (currentPostId) {
        saveCurrentPost();
      }

      // Convert posts with File objects to serializable format
      const serializablePosts = serializePostsForStorage(posts);

      const dataToSync = {
        posts: serializablePosts,
        lastSyncAt: new Date().toISOString(),
        appVersion: "0.2.1"
      };

      localStorage.setItem('autoSyncData', JSON.stringify(dataToSync));
      console.log('📁 Auto-synced posts to local storage');
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
    }
  };

  const loadAutoSyncedPosts = () => {
    try {
      const syncedData = localStorage.getItem('autoSyncData');
      if (!syncedData) return;
      
      const data = JSON.parse(syncedData);
      
      // Validate the data structure
      if (!data.posts || !Array.isArray(data.posts)) {
        console.warn('⚠️ Invalid auto-sync data format');
        return;
      }
      
      // Validate each post has required fields
      const validPosts = data.posts.filter((post: any) =>
        post.id && post.title !== undefined && post.content !== undefined
      );

      if (validPosts.length === 0) {
        console.warn('⚠️ No valid posts found in auto-sync data');
        return;
      }

      // Convert image data back to File objects
      const postsWithFiles = deserializePostsFromStorage(validPosts);
      
      // Load the posts
      setPosts(postsWithFiles);
      
      // If there are posts, switch to the first one
      if (postsWithFiles.length > 0) {
        const firstPost = postsWithFiles[0];
        setCurrentPostId(firstPost.id);
        setText(firstPost.content);
        setScheduleTime(firstPost.scheduleTime || getCurrentDateTimeString());
        setTimezone(firstPost.timezone || timezone);
        // Restore images and platform selections
        setAttachedImages(firstPost.images || []);
        setPlatformImageSelections(firstPost.platformImageSelections || {});
        
        // Restore auto-posting settings
        setAutoPostEnabled(firstPost.autoPost?.enabled || false);
        setAutoPostPlatforms(firstPost.autoPost?.platforms || []);
      }
      
      console.log(`📁 Auto-loaded ${postsWithFiles.length} posts from local storage`);
    } catch (error) {
      console.error('❌ Auto-load failed:', error);
    }
  };



  // OAuth completion function
  const completeOAuthFlow = async (platform: 'linkedin' | 'twitter' | 'mastodon', code: string, explicitConfig?: OAuthConfig) => {
    const config = explicitConfig ? explicitConfig[platform] : oauthConfig[platform];
    
    console.log('OAuth Config for', platform, ':', config);
    console.log('Client ID:', config.clientId);
    console.log('Redirect URI:', config.redirectUri);
    console.log('🔍 explicitConfig passed:', explicitConfig);
    console.log('🔍 oauthConfig state:', oauthConfig);
    
    // Check if client ID is configured
    if (!config.clientId) {
      const platformName = platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'Twitter' : platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
      alert(`❌ ${platform.toUpperCase()} CLIENT ID NOT CONFIGURED\n\nPlease:\n1. Open ⚙️ Settings\n2. Enter your ${platformName} Client ID\n3. Save settings\n4. Try authentication again`);
      return;
    }
    
    try {
      console.log('🔄 Starting token exchange for', platform);
      console.log('📤 Token exchange request:', {
        platform,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        codeLength: code.length
      });
      
      // Prepare request body
      const requestBody: any = {
        platform,
        code,
        clientId: config.clientId,
        redirectUri: config.redirectUri
      };
      
      // Add instance URL for Mastodon
      if (platform === 'mastodon') {
        requestBody.instanceUrl = (config as any).instanceUrl;
        console.log('✅ Added instance URL for Mastodon token exchange:', requestBody.instanceUrl);
      }
      
      // Add PKCE code verifier for Twitter
      if (platform === 'twitter') {
        const codeVerifier = localStorage.getItem('twitter_code_verifier');
        if (!codeVerifier) {
          throw new Error('Twitter code verifier not found. Please restart the authentication process.');
        }
        requestBody.codeVerifier = codeVerifier;
        console.log('✅ Added PKCE code verifier for Twitter token exchange:', {
          codeVerifier: codeVerifier.substring(0, 10) + '...',
          length: codeVerifier.length
        });
      }
      
      // Exchange authorization code for access token
      const tokenResponse = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed with status:', tokenResponse.status);
        console.error('Error response:', errorData);
        throw new Error(`OAuth token exchange failed (${tokenResponse.status}): ${errorData}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log('📥 Token response received:', tokenData);
      
      // User profile is now included in the token response from the server
      let userInfo = tokenData.userProfile;
      console.log('👤 User profile data:', userInfo);
      
      // Validate that we have some user info (even minimal)
      if (!userInfo) {
        console.warn('⚠️ No user profile data received from server');
        userInfo = { authenticated: true, note: 'Profile data not available but posting should work' };
      }
      
      console.log('✅ Authentication successful with userInfo:', userInfo);
      
      // Update authentication state
      setAuth(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform], // Preserve existing platform-specific fields
          isAuthenticated: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
          userInfo: userInfo,
          // Store platform-specific data
          ...(platform === 'mastodon' && { instanceUrl: tokenData.instanceUrl })
        }
      }));
      
      showNotification(`✅ Successfully authenticated with ${getPlatformDisplayName(platform)}!`);
      
      // Clean up platform-specific OAuth data
      if (platform === 'twitter') {
        localStorage.removeItem('twitter_code_verifier');
        console.log('🧹 Cleaned up Twitter code verifier');
      }
      
      console.log('🎉 OAuth completion successful for', platform);
      
      // Ensure localStorage is updated immediately
      setTimeout(() => {
        const currentAuth = JSON.parse(localStorage.getItem('platformAuth') || '{}');
        console.log('🔍 Auth state in localStorage after OAuth:', currentAuth);
      }, 100);
      
    } catch (error) {
      console.error('OAuth completion error:', error);
      
      // For development - show manual instructions
      if (error instanceof Error && error.message.includes('OAuth token exchange failed')) {
        alert(`⚠️ ${platform.toUpperCase()} AUTHENTICATION INCOMPLETE\n\nThis app needs a backend service to complete OAuth. For development:\n\n1. The authorization was successful\n2. You need to manually exchange the code for a token\n3. Or implement a backend OAuth handler\n\nSee SETUP.md for details.`);
      } else {
        throw error;
      }
    }
  };

  // Authentication functions
  const initiateOAuth = async (platform: 'linkedin' | 'twitter' | 'mastodon') => {
    console.log('🚀 Initiating OAuth for', platform);
    console.log('🔧 OAuth config at initiation:', oauthConfig);
    
    const config = oauthConfig[platform];
    console.log('📋 Platform config:', config);
    console.log('🔑 Client ID check:', { clientId: config.clientId, isEmpty: !config.clientId || config.clientId === '' });
    
    // Check if client ID is properly configured
    if (!config.clientId || config.clientId === '') {
      console.log('❌ Client ID validation failed');
      const platformName = platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'Twitter' : platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
      alert(`❌ ${platform.toUpperCase()} CLIENT ID NOT CONFIGURED!\n\nPlease configure your OAuth settings:\n1. Click the ⚙️ Settings button\n2. Enter your ${platformName} Client ID\n3. Save the settings\n\nSee SETUP.md for detailed instructions.`);
      return;
    }
    
    console.log('✅ Client ID validation passed, proceeding with OAuth');
    
    // Preserve current draft and post context before OAuth redirect
    if (text.trim()) {
      localStorage.setItem('socialMediaDraft_beforeOAuth', text);
      console.log('💾 Draft preserved before OAuth redirect');
    }
    if (currentPostId) {
      localStorage.setItem('currentPostId_beforeOAuth', currentPostId);
      console.log('💾 Current post ID preserved before OAuth redirect');
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem(`oauth_state_${platform}`, state);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state: state
    });
    
    // Twitter requires PKCE (Proof Key for Code Exchange)
    if (platform === 'twitter') {
      try {
        const { codeVerifier, codeChallenge } = await generatePKCE();
        localStorage.setItem('twitter_code_verifier', codeVerifier);
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', 'S256');
        console.log('✅ PKCE parameters generated for Twitter');
      } catch (error) {
        console.error('❌ Failed to generate PKCE parameters:', error);
        alert('Failed to prepare Twitter authentication. Please try again.');
        return;
      }
    }
    
    // Determine the auth URL based on platform
    let authUrl: string;
    if (platform === 'mastodon') {
      // For Mastodon, construct auth URL using instance URL
      authUrl = `${(config as any).instanceUrl}/oauth/authorize`;
    } else {
      // For LinkedIn and Twitter, use the configured authUrl
      authUrl = (config as any).authUrl;
    }
    
    window.location.href = `${authUrl}?${params.toString()}`;
  };

  const authenticateBluesky = async (handle: string, appPassword: string) => {
    try {
      setIsPosting(true);
      setPostingStatus('Authenticating with Bluesky...');
      
      const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: handle,
          password: appPassword
        })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      
      setAuth(prev => ({
        ...prev,
        bluesky: {
          ...prev.bluesky,
          isAuthenticated: true,
          accessToken: data.accessJwt,
          refreshToken: data.refreshJwt,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          userInfo: data,
          handle: handle,
          appPassword: appPassword
        }
      }));
      
      setShowAuthModal(false);
      setPostingStatus('');
      showNotification('✅ Successfully authenticated with Bluesky!');
      
      // Note: Bluesky auth doesn't involve redirects, so draft should be preserved automatically
      console.log('✅ Bluesky authentication completed - draft preserved');
    } catch (error) {
      console.error('Bluesky auth error:', error);
      showNotification('❌ Failed to authenticate with Bluesky. Please check your credentials.');
      setPostingStatus('');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle multi-platform logout
  const handleMultiPlatformLogout = () => {
    if (selectedLogoutPlatforms.length === 0) {
      showNotification('❌ Please select at least one platform to log out from');
      return;
    }

    const platformNames = selectedLogoutPlatforms.map(platform => {
      switch (platform) {
        case 'linkedin': return 'LinkedIn';
        case 'twitter': return 'X/Twitter';
        case 'mastodon': return 'Mastodon';
        case 'bluesky': return 'Bluesky';
        default: return platform;
      }
    });

    if (confirm(`Are you sure you want to log out from: ${platformNames.join(', ')}?`)) {
      const successfulLogouts: string[] = [];
      const failedLogouts: string[] = [];

      selectedLogoutPlatforms.forEach(platform => {
        try {
          // Perform logout operations without showing individual alerts
          setAuth(prev => ({
            ...prev,
            [platform]: {
              ...prev[platform],
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null,
              expiresAt: null,
              userInfo: null,
              ...(platform === 'bluesky' && { handle: '', appPassword: '' }),
              ...(platform === 'mastodon' && { handle: '', instanceUrl: 'https://mastodon.social' })
            }
          }));
          
          localStorage.removeItem(`oauth_state_${platform}`);
          // Clean up Twitter code verifier on logout
          if (platform === 'twitter') {
            localStorage.removeItem('twitter_code_verifier');
          }
          
          const platformName = getPlatformDisplayName(platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky');
          successfulLogouts.push(platformName);
        } catch (error) {
          console.error(`Failed to logout from ${platform}:`, error);
          const platformName = getPlatformDisplayName(platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky');
          failedLogouts.push(platformName);
        }
      });
      
      setSelectedLogoutPlatforms([]);
      setShowLogoutModal(false);
      
      // Show consolidated notification
      if (failedLogouts.length === 0) {
        showNotification(`✅ Successfully logged out from ${successfulLogouts.join(', ')}`);
      } else if (successfulLogouts.length === 0) {
        showNotification(`❌ Failed to log out from ${failedLogouts.join(', ')}`);
      } else {
        showNotification(`⚠️ Partial success: ✅ Logged out from ${successfulLogouts.join(', ')} ❌ Failed: ${failedLogouts.join(', ')}`);
      }
    }
  };

  // Toggle platform selection for logout
  const toggleLogoutPlatform = (platform: string) => {
    setSelectedLogoutPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Posting functions
  const postToLinkedIn = async (content: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    const isValid = await ensureValidAuth('linkedin');
    if (!isValid) {
      throw new Error('Not authenticated with LinkedIn');
    }
    return PlatformPosting.postToLinkedIn(content, imageFiles, auth.linkedin.accessToken);
  };

  const postToTwitter = async (content: string, replyToTweetId?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    const isValid = await ensureValidAuth('twitter');
    if (!isValid) {
      throw new Error('Not authenticated with Twitter');
    }
    return PlatformPosting.postToTwitter(content, replyToTweetId, imageFiles, auth.twitter.accessToken, showNotification);
  };

  // Helper function to create facets for BlueSky mentions
  const createBlueskyFacets = async (text: string, accessToken: string) => {
    return PlatformPosting.createBlueskyFacets(text, accessToken);
  };

  const postToBluesky = async (content: string, replyToUri?: string, replyToCid?: string, rootUri?: string, rootCid?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    const isValid = await ensureValidAuth('bluesky');
    if (!isValid) {
      throw new Error('Not authenticated with Bluesky');
    }
    return PlatformPosting.postToBluesky(content, replyToUri, replyToCid, rootUri, rootCid, imageFiles, auth.bluesky.accessToken, auth.bluesky.userInfo.did);
  };

  const postToMastodon = async (content: string, replyToStatusId?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    const isValid = await ensureValidAuth('mastodon');
    if (!isValid) {
      throw new Error('Not authenticated with Mastodon');
    }
    return PlatformPosting.postToMastodon(content, replyToStatusId, imageFiles, auth.mastodon.accessToken, auth.mastodon.instanceUrl);
  };

  // Published and deleted posts management functions
  const addDeletedPost = (post: {
    id: string;
    title: string;
    content: string;
    scheduleTime: string;
    timezone: string;
    createdAt: string;
    images?: any[];
    platformImageSelections?: { [key: string]: number[] };
  }, deleteReason: 'user_deleted' = 'user_deleted') => {
    const deletedPost: DeletedPost = {
      id: `deleted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: post.title,
      content: post.content,
      originalPostId: post.id,
      deletedAt: new Date().toISOString(),
      timezone: post.timezone,
      createdAt: post.createdAt,
      scheduleTime: post.scheduleTime,
      images: post.images,
      platformImageSelections: post.platformImageSelections,
      deleteReason,
    };
    
    setDeletedPosts(prev => [deletedPost, ...prev]);
  };

  const restoreDeletedPost = (deletedPostId: string) => {
    const deletedPost = deletedPosts.find(p => p.id === deletedPostId);
    if (!deletedPost) return;
    
    // Create a new post from the deleted post
    const restoredPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: deletedPost.title,
      content: deletedPost.content,
      scheduleTime: deletedPost.scheduleTime || scheduleTime,
      timezone: deletedPost.timezone,
      createdAt: new Date().toISOString(),
      images: deletedPost.images,
      platformImageSelections: deletedPost.platformImageSelections,
    };
    
    setPosts(prev => [restoredPost, ...prev]);
    setCurrentPostId(restoredPost.id);
    setText(restoredPost.content);
    setScheduleTime(restoredPost.scheduleTime);
    setTimezone(restoredPost.timezone);
    
    // Restore auto-posting settings if available
    setAutoPostEnabled(false); // Reset to default since deleted posts don't have autoPost data
    setAutoPostPlatforms([]);
    
    // Remove from deleted posts
    setDeletedPosts(prev => prev.filter(p => p.id !== deletedPostId));
    
    // Close the deleted posts modal
    setShowDeletedPosts(false);
  };

  const toggleSelectAllDeletedPosts = () => {
    const actualDeletedPosts = getActualDeletedPosts();
    if (selectedDeletedPostIds.size === actualDeletedPosts.length) {
      setSelectedDeletedPostIds(new Set());
    } else {
      setSelectedDeletedPostIds(new Set(actualDeletedPosts.map(p => p.id)));
    }
    // Reset last clicked index when using select all
    lastClickedDeletedIndexRef.current = null;
  };

  // Helper function to get deleted posts that are not published
  const getActualDeletedPosts = () => {
    return deletedPosts.filter(deletedPost => 
      !publishedPosts.some(publishedPost => 
        publishedPost.originalPostId === deletedPost.originalPostId
      )
    );
  };

  const handleAutoPost = async () => {
    const authData = auth[selectedPlatform];
    if (!authData.isAuthenticated) {
      setAuthPlatform(selectedPlatform);
      setShowAuthModal(true);
      return;
    }
    
    try {
      setIsPosting(true);
      setPostingStatus(`Posting to ${selectedPlatform}...`);
      
      // Format text first, then chunk to ensure accurate character counts
      const formattedText = formatForPlatform(text, selectedPlatform);
      const chunks = chunkText(formattedText, selectedPlatform, PLATFORM_LIMITS);
      const formattedChunks = chunks;
      
      const results = [];
      
      let previousPostId: string | undefined;
      let previousPostUri: string | undefined;
      let previousPostCid: string | undefined;
      // Track root post for Bluesky threading
      let rootPostUri: string | undefined;
      let rootPostCid: string | undefined;
      
      for (let i = 0; i < formattedChunks.length; i++) {
        const chunk = formattedChunks[i];
        setPostingStatus(`Posting part ${i + 1} of ${formattedChunks.length} to ${selectedPlatform}...`);
        
        let result;
        // Get platform-specific selected images for first post
        const platformImages = i === 0 ? getSelectedImagesForPlatform(selectedPlatform) : [];
        
        switch (selectedPlatform) {
          case 'linkedin':
            result = await postToLinkedIn(chunk, platformImages);
            break;
          case 'twitter':
            result = await postToTwitter(chunk, previousPostId, platformImages);
            // Extract tweet ID for next reply
            if (result?.data?.data?.id) {
              previousPostId = result.data.data.id;
            }
            break;
          case 'bluesky':
            result = await postToBluesky(chunk, previousPostUri, previousPostCid, rootPostUri, rootPostCid, platformImages);
            // Extract URI and CID for next reply
            if (result?.uri && result?.cid) {
              // Set root on first post
              if (i === 0) {
                rootPostUri = result.uri;
                rootPostCid = result.cid;
              }
              previousPostUri = result.uri;
              previousPostCid = result.cid;
            }
            break;
          case 'mastodon':
            result = await postToMastodon(chunk, previousPostId, platformImages);
            // Extract status ID for next reply
            if (result?.data?.id) {
              previousPostId = result.data.id;
            }
            break;
          default:
            throw new Error(`Unsupported platform: ${selectedPlatform}`);
        }
        
        results.push(result);
        
        // Add delay between posts for multi-part content (increased for Twitter rate limiting)
        if (i < formattedChunks.length - 1) {
          const delay = getPostDelay(selectedPlatform, 'chunk');
          setPostingStatus(`Waiting ${delay/1000} seconds before posting next part...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      setPostingStatus('');
      
      // Add to published posts
      const currentPost = posts.find(p => p.id === currentPostId);
      if (currentPost) {
        // Extract post information for tracking
        const { postId, postUrl } = extractPostInfo(selectedPlatform, results[0], auth.bluesky.handle);

        const platformResult: PlatformPostResult = {
          platform: selectedPlatform,
          success: true,
          postId: postId || 'unknown',
          publishedAt: new Date().toISOString(),
          postUrl: postUrl || undefined
        };
        

        addPublishedPost(currentPost, [platformResult]);
        
        // Remove from drafts and handle switching if this was the active post
        setPosts(prev => prev.filter(p => p.id !== currentPostId));
        if (currentPostId === currentPost.id) {
          const remainingPosts = posts.filter(p => p.id !== currentPostId);
          if (remainingPosts.length > 0) {
            switchToPost(remainingPosts[0].id);
          } else {
            setCurrentPostId('');
        setText('');
        setAttachedImages([]);
        setPlatformImageSelections({});
          }
        }
      }
      
      alert(`✅ Successfully posted to ${selectedPlatform}! Post moved to Published section.`);
      
      // Clear the text and images after successful posting (only if no current post)
      if (!currentPost) {
        setText('');
        setAttachedImages([]);
        setPlatformImageSelections({});
      }
      
    } catch (error) {
      console.error('Posting error:', error);

      // Handle authentication errors by automatically logging out
      if (isAuthenticationError(error)) {
        logout(selectedPlatform);
        showNotification(`❌ ${capitalizePlatform(selectedPlatform)} authentication expired. You have been logged out. Please login again to continue posting.`);
      } else {
        showNotification(`❌ Failed to post to ${selectedPlatform}: ${error}`);
      }
      setPostingStatus('');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostToAll = async () => {
    const connectedPlatforms = (['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).filter(
      platform => auth[platform].isAuthenticated
    );
    
    if (connectedPlatforms.length === 0) {
      alert('❌ No platforms are connected. Please connect to at least one platform first.');
      return;
    }

    const confirmMessage = `📤 Post to all connected platforms (${connectedPlatforms.map(p => getPlatformDisplayName(p)).join(', ')})?\n\nThis will post your content to ${connectedPlatforms.length} platform${connectedPlatforms.length > 1 ? 's' : ''}.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsPosting(true);
      const results: Array<{ platform: string; success: boolean; error?: string; postId?: string; postUrl?: string }> = [];
      
      for (const platform of connectedPlatforms) {
        try {
          setPostingStatus(`Posting to ${getPlatformDisplayName(platform)}...`);
          
          // Format text first, then chunk to ensure accurate character counts
          const formattedText = formatForPlatform(text, platform);
          const chunks = chunkText(formattedText, platform, PLATFORM_LIMITS);
          const formattedChunks = chunks;
          
          let previousPostId: string | undefined;
          let previousPostUri: string | undefined;
          let previousPostCid: string | undefined;
          // Track root post for Bluesky threading
          let rootPostUri: string | undefined;
          let rootPostCid: string | undefined;
          // Track first result for post information
          let firstResult: any = null;
          
          for (let i = 0; i < formattedChunks.length; i++) {
            const chunk = formattedChunks[i];
            setPostingStatus(`Posting part ${i + 1} of ${formattedChunks.length} to ${getPlatformDisplayName(platform)}...`);
            
            let result;
            // Get platform-specific selected images for first post
            const platformImages = i === 0 ? getSelectedImagesForPlatform(platform) : [];
            
            switch (platform) {
              case 'linkedin':
                result = await postToLinkedIn(chunk, platformImages);
                break;
              case 'twitter':
                result = await postToTwitter(chunk, previousPostId, platformImages);
                // Extract tweet ID for next reply
                if (result?.data?.data?.id) {
                  previousPostId = result.data.data.id;
                }
                break;
              case 'bluesky':
                result = await postToBluesky(chunk, previousPostUri, previousPostCid, rootPostUri, rootPostCid, platformImages);
                // Extract URI and CID for next reply
                if (result?.uri && result?.cid) {
                  // Set root on first post
                  if (i === 0) {
                    rootPostUri = result.uri;
                    rootPostCid = result.cid;
                  }
                  previousPostUri = result.uri;
                  previousPostCid = result.cid;
                }
                break;
              case 'mastodon':
                result = await postToMastodon(chunk, previousPostId, platformImages);
                // Extract status ID for next reply
                if (result?.data?.id) {
                  previousPostId = result.data.id;
                }
                break;
            }
            
            // Store first result for tracking
            if (i === 0) {
              firstResult = result;
            }
            
            // Add delay between posts for multi-part content (increased for Twitter)
            if (i < formattedChunks.length - 1) {
              const delay = getPostDelay(platform, 'chunk');
              setPostingStatus(`Waiting ${delay/1000} seconds before posting next part to ${getPlatformDisplayName(platform)}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          // Extract post information for tracking
          const { postId, postUrl } = extractPostInfo(platform, firstResult, auth.bluesky.handle);
          
          results.push({
            platform: platform,
            success: true,
            postId,
            postUrl
          });
          
          // Add delay between platforms (longer if Twitter was just used)
          if (connectedPlatforms.indexOf(platform) < connectedPlatforms.length - 1) {
            const delay = getPostDelay(platform, 'platform');
            setPostingStatus(`Waiting ${delay/1000} seconds before posting to next platform...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);

          // Handle authentication errors by automatically logging out
          if (isAuthenticationError(error)) {
            logout(platform);
          }

          results.push({
            platform: platform,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      setPostingStatus('');
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
        
      
      if (successful.length > 0) {
        // Track the published post for any successful platforms
        const currentPost = posts.find(p => p.id === currentPostId);
        if (currentPost) {
          const platformResults: PlatformPostResult[] = [
            ...successful.map(r => ({
            platform: r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
            success: true,
            postId: r.postId || '',
            postUrl: r.postUrl || '',
            publishedAt: new Date().toISOString(),
            })),
            ...failed.map(r => ({
              platform: r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
              success: false,
              error: r.error || 'Unknown error',
              publishedAt: new Date().toISOString(),
            }))
          ];
          
          
          addPublishedPost(currentPost, platformResults);
          
          // Remove the post from the active posts list
          setPosts(prev => prev.filter(p => p.id !== currentPostId));
          
          // Create a new post or switch to another one
          if (posts.length > 1) {
            const remainingPosts = posts.filter(p => p.id !== currentPostId);
            const nextPost = remainingPosts[0];
            setCurrentPostId(nextPost.id);
            setText(nextPost.content);
            setScheduleTime(nextPost.scheduleTime);
            setTimezone(nextPost.timezone);
          } else {
            // Create a new empty post
            const newPostId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newPost = {
              id: newPostId,
              title: "Untitled Post",
              content: "",
              scheduleTime: scheduleTime,
              timezone: timezone,
              createdAt: new Date().toISOString(),
            };
            setPosts([newPost]);
            setCurrentPostId(newPostId);
            setText('');
          }
        }
        
        // Clear images after successful posting
        setAttachedImages([]);
        setPlatformImageSelections({});
        
        // Show appropriate success message
        if (successful.length === results.length) {
          alert(`✅ Successfully posted to all platforms!\n\n📤 Posted to: ${successful.map(r => getPlatformDisplayName(r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky')).join(', ')}`);
        } else {
        const successMsg = `✅ Successful: ${successful.map(r => getPlatformDisplayName(r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky')).join(', ')}`;
        const failMsg = `❌ Failed: ${failed.map(r => `${getPlatformDisplayName(r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky')} (${r.error})`).join(', ')}`;
        alert(`⚠️ Partial success:\n\n${successMsg}\n\n${failMsg}`);
        }
      } else {
        const failMsg = failed.map(r => `${getPlatformDisplayName(r.platform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky')}: ${r.error}`).join('\n');
        alert(`❌ Failed to post to all platforms:\n\n${failMsg}`);
      }
      
    } catch (error) {
      console.error('Post to all error:', error);
      alert(`❌ Failed to post to all platforms: ${error}`);
      setPostingStatus('');
    } finally {
      setIsPosting(false);
    }
  };


  const formatForPlatform = (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): string => {
    // First process unified tags, then apply Unicode styling
    return formatForPlatformUtil(text, platform, taggingState.personMappings, toUnicodeStyle);
  };

  // Helper to close image selector modal (since hook doesn't expose a close function)
  const closeImageSelector = () => {
    // We need to update platform selection with empty selection to close the modal
    // Actually, let's just use updatePlatformSelection with the current selection
    // which will close the modal
    if (pendingPlatform) {
      const currentSelection = platformImageSelections[pendingPlatform] || [];
      updatePlatformSelection(pendingPlatform, currentSelection);
    }
  };

  // Image handling functions - thin wrappers around useImageManager hook
  const handleImageUploadEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    handleImageUpload(fileArray); // Call the hook's function

    // Auto-save after uploading images
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);

    // Reset the input
    event.target.value = '';
  };

  const removeAttachedImageWithSave = (index: number) => {
    removeAttachedImage(index); // Call the hook's function

    // Auto-save after removing image
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);
  };

  const removeAllAttachedImages = () => {
    clearAllImages(); // Call the hook's function

    // Auto-save after removing all images
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);
  };

  // Drag and drop reordering for images
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex !== dropIndex) {
      reorderImages(dragIndex, dropIndex); // Call the hook's function

      // Auto-save after reordering images
      setTimeout(() => {
        if (currentPostId) {
          saveCurrentPost();
        }
      }, 100);
    }
  };

  const handleCopyStyled = async () => {
    try {
      // Format text first, then chunk to ensure accurate character counts
      const formattedText = formatForPlatform(text, selectedPlatform);
      const chunks = chunkText(formattedText, selectedPlatform, PLATFORM_LIMITS);
      const formattedChunks = chunks;
      
      const finalText = formattedChunks.join('\n\n---\n\n');
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalText);
        const platform = capitalizePlatform(selectedPlatform);
        const message = chunks.length > 1
          ? `✅ ${platform} thread (${chunks.length} parts) copied to clipboard!`
          : `✅ ${platform} post copied to clipboard!`;
        showNotification(message);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = finalText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          const platform = capitalizePlatform(selectedPlatform);
          const message = chunks.length > 1
            ? `✅ ${platform} thread (${chunks.length} parts) copied to clipboard!`
            : `✅ ${platform} post copied to clipboard!`;
          showNotification(message);
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      showNotification("❌ Failed to copy text. Please manually copy the text from the preview below.");
    }
  };

  // Handle automatic posting for scheduled posts
  const handleAutoPostForScheduledPost = async (post: typeof posts[0]) => {
    if (!post.autoPost?.enabled || !post.autoPost.platforms.length) return;
    
    // Update status to executing
    setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'executing' }));
    console.log(`🤖 Starting auto-post execution for "${post.title}"`);
    
    // Double-check authentication status at execution time
    const authenticatedPlatforms = post.autoPost.platforms.filter(platform => {
      const isAuth = auth[platform].isAuthenticated;
      if (!isAuth) {
        console.warn(`⚠️ Platform ${platform} is no longer authenticated, skipping`);
      }
      return isAuth;
    });
    
    if (authenticatedPlatforms.length === 0) {
      setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'failed' }));
      
      // Update the post to remove unauthenticated platforms
      const unauthenticatedPlatforms = post.autoPost.platforms.filter(platform => !auth[platform].isAuthenticated);
      
      const notification = new Notification(`❌ Auto-post failed: ${post.title}`, {
        body: `Authentication expired for: ${unauthenticatedPlatforms.join(', ')}. Please log in again.`,
        icon: "/favicon.ico",
        tag: `auto-post-error-${post.id}`,
        requireInteraction: true
      });
      console.error(`❌ Auto-post failed for "${post.title}": Authentication expired for platforms:`, unauthenticatedPlatforms);
      return;
    }
    
    try {
      // Switch to the post temporarily to get the formatted content
      const originalPostId = currentPostId;
      const originalText = text;
      
      // Temporarily switch to the scheduled post
      setCurrentPostId(post.id);
      setText(post.content);
      
      const platformResults: PlatformPostResult[] = [];
      
      for (const platform of authenticatedPlatforms) {
        try {
          // Rate limiting check - prevent rapid successive calls
          const now = Date.now();
          const lastCall = lastApiCall[platform] || 0;
          const minInterval = platform === 'twitter' ? 10000 : 5000; // 10s for Twitter, 5s for others
          
          if (now - lastCall < minInterval) {
            const waitTime = minInterval - (now - lastCall);
            console.log(`⏳ Rate limiting: waiting ${waitTime}ms before posting to ${platform}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          setLastApiCall(prev => ({ ...prev, [platform]: Date.now() }));
          console.log(`🤖 Auto-posting to ${platform}...`);
          
          // Get formatted chunks for this platform
          const formattedText = formatForPlatform(post.content, platform);
          const chunks = chunkText(formattedText, platform, PLATFORM_LIMITS);
          const formattedChunks = chunks;
          
          let previousPostId: string | null = null;
          let previousPostUri: string | null = null;
          let previousPostCid: string | null = null;
          let rootPostUri: string | null = null;
          let rootPostCid: string | null = null;
          
          let firstResult: any = null;
          
          for (let i = 0; i < formattedChunks.length; i++) {
            const chunk = formattedChunks[i];
            
            let result;
            // Get platform-specific selected images for first post only
            const platformImages = i === 0 ? (post.platformImageSelections?.[platform] || []).map(index => post.images?.[index]).filter(Boolean) || [] : [];
            
            switch (platform) {
              case 'linkedin':
                result = await postToLinkedIn(chunk, platformImages);
                break;
              case 'twitter':
                result = await postToTwitter(chunk, previousPostId, platformImages);
                if (result?.data?.data?.id) {
                  previousPostId = result.data.data.id;
                }
                break;
              case 'bluesky':
                result = await postToBluesky(chunk, previousPostUri, previousPostCid, rootPostUri, rootPostCid, platformImages);
                if (result?.uri && result?.cid) {
                  if (i === 0) {
                    rootPostUri = result.uri;
                    rootPostCid = result.cid;
                  }
                  previousPostUri = result.uri;
                  previousPostCid = result.cid;
                }
                break;
              case 'mastodon':
                result = await postToMastodon(chunk, previousPostId, platformImages);
                if (result?.data?.id) {
                  previousPostId = result.data.id;
                }
                break;
            }
            
            if (i === 0) {
              firstResult = result;
            }
            
            // Add delay between posts for multi-part content
            if (i < formattedChunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, platform === 'twitter' ? 2000 : 1000));
            }
          }
          
          // Extract post information for tracking
          const { postId, postUrl } = extractPostInfo(platform, firstResult, auth.bluesky.handle);

          platformResults.push({
            platform,
            success: true,
            postId: postId || 'unknown',
            postUrl: postUrl || undefined,
            publishedAt: new Date().toISOString()
          });
          
          console.log(`✅ Auto-posted to ${platform} successfully`);
          
        } catch (error) {
          console.error(`❌ Auto-post to ${platform} failed:`, error);

          // Handle authentication errors by automatically logging out
          if (isAuthenticationError(error)) {
            console.warn(`🔓 Authentication failed for ${platform}, logging out automatically`);
            logout(platform);
          }

          platformResults.push({
            platform,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            publishedAt: new Date().toISOString()
          });
        }
      }
      
      // Add to published posts
      
      addPublishedPost(post, platformResults);
      
      // Update status based on results
      const successfulPlatforms = platformResults.filter(r => r.success).map(r => r.platform);
      const failedPlatforms = platformResults.filter(r => !r.success).map(r => r.platform);
      
      if (successfulPlatforms.length > 0) {
        setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'completed' }));
        console.log(`✅ Auto-post completed for "${post.title}": ${successfulPlatforms.join(', ')}`);
        
        // Remove the post from the main posts array since it's now published
        setPosts(prev => prev.filter(p => p.id !== post.id));
        
        // If this was the current post, switch to another post or create a new one
        if (currentPostId === post.id) {
          const remainingPosts = posts.filter(p => p.id !== post.id);
          if (remainingPosts.length > 0) {
            const nextPost = remainingPosts[0];
            setCurrentPostId(nextPost.id);
            setText(nextPost.content);
            setScheduleTime(nextPost.scheduleTime);
            setTimezone(nextPost.timezone);
            setAttachedImages(nextPost.images || []);
            setPlatformImageSelections(nextPost.platformImageSelections || {});
            setAutoPostEnabled(nextPost.autoPost?.enabled || false);
            setAutoPostPlatforms(nextPost.autoPost?.platforms || []);
          } else {
            // Create a new empty post
            createNewPost();
          }
        }
      } else {
        setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'failed' }));
        console.error(`❌ Auto-post failed for "${post.title}": All platforms failed`);
      }
      
      // Restore original post context only if we didn't switch posts
      if (currentPostId !== post.id) {
        setCurrentPostId(originalPostId);
        setText(originalText);
      }
      
      const notificationTitle = `🤖 Auto-post completed: ${post.title}`;
      let notificationBody = '';
      
      if (successfulPlatforms.length > 0) {
        notificationBody += `✅ Posted to: ${successfulPlatforms.join(', ')}\n📝 Moved to Published Posts`;
      }
      if (failedPlatforms.length > 0) {
        notificationBody += `\n❌ Failed: ${failedPlatforms.join(', ')}`;
      }
      
      const notification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: "/favicon.ico",
        tag: `auto-post-result-${post.id}`,
        requireInteraction: true
      });
      
    } catch (error) {
      console.error('❌ Auto-post error:', error);
      setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'failed' }));
      const notification = new Notification(`❌ Auto-post failed: ${post.title}`, {
        body: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        icon: "/favicon.ico",
        tag: `auto-post-error-${post.id}`,
        requireInteraction: true
      });
    }
  };

  // Function to clear all executed posts (useful for debugging)
  const clearAllExecutedPosts = () => {
    setExecutedPosts(new Set());
    setScheduledPostsStatus({});
    console.log(`🧹 Cleared all execution tracking`);
  };

  // Schedule modal functions
  const handleScheduleConfirm = () => {
    // Validate authentication for selected platforms
    if (modalAutoPostEnabled && modalAutoPostPlatforms.length > 0) {
      const unauthenticatedPlatforms = modalAutoPostPlatforms.filter(
        platform => !auth[platform].isAuthenticated
      );
      
      if (unauthenticatedPlatforms.length > 0) {
        // Show error notification
        if (Notification.permission === "granted") {
          new Notification(`🚫 Authentication Required`, {
            body: `Cannot schedule auto-posting: ${unauthenticatedPlatforms.join(', ')} ${unauthenticatedPlatforms.length === 1 ? 'is' : 'are'} not authenticated. Please log in first.`,
            icon: "/favicon.ico",
            tag: `auth-error-${currentPostId}`,
            requireInteraction: true
          });
        }
        
        // Log the error
        console.error(`🚫 Scheduling failed: Unauthenticated platforms detected: ${unauthenticatedPlatforms.join(', ')}`);
        
        // Don't close modal, let user fix the issue
        return;
      }
    }
    
    // Apply the modal settings to the current post
    setScheduleTime(modalScheduleTime);
    setTimezone(modalTimezone);
    setAutoPostEnabled(modalAutoPostEnabled);
    setAutoPostPlatforms([...modalAutoPostPlatforms]);
    
    // Save the current post with new schedule settings and mark as scheduled
    saveCurrentPost(true);
    
    // Close modal
    setShowScheduleModal(false);
    
    // Show confirmation
    const scheduledFor = formatTimezoneTime(modalScheduleTime, modalTimezone);
    const platforms = modalAutoPostEnabled && modalAutoPostPlatforms.length > 0 
      ? ` to ${modalAutoPostPlatforms.join(', ')}` 
      : '';
    
    if (modalNotificationEnabled && Notification.permission === "granted") {
      new Notification(`📅 Post Scheduled`, {
        body: `"${posts.find(p => p.id === currentPostId)?.title || 'Current post'}" scheduled for ${scheduledFor}${platforms}`,
        icon: "/favicon.ico",
        tag: `schedule-confirm-${currentPostId}`,
        requireInteraction: false
      });
    }
  };

  const cancelScheduleModal = () => {
    setShowScheduleModal(false);
  };

  useEffect(() => {
    // Set up notifications for all scheduled posts
    const timeouts: number[] = [];
    
    const setupNotifications = async () => {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        return;
      }

      // Request permission if not granted
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }
        // Note: notificationStatus is managed by useNotifications hook
      }

      const now = new Date();
      
      posts.forEach((post) => {
        // Only process posts that are explicitly scheduled or have auto-posting enabled
        if (!post.scheduleTime || (!post.isScheduled && !post.autoPost?.enabled)) return;
        
        // Skip if already executed or currently executing
        if (executedPosts.has(post.id) || scheduledPostsStatus[post.id] === 'executing' || scheduledPostsStatus[post.id] === 'completed') {
          return;
        }
        
        const target = new Date(post.scheduleTime);
        const delay = target.getTime() - now.getTime();
        
        // Handle past scheduled times
        if (delay <= 0) {
          const minutesLate = Math.abs(Math.round(delay / (1000 * 60)));
          
          // If it's within the last 5 minutes and auto-posting is enabled, execute immediately
          if (minutesLate <= 5 && post.autoPost?.enabled && post.autoPost.platforms.length > 0) {
            console.log(`🚀 Executing overdue auto-post for "${post.title}" immediately`);
            setExecutedPosts(prev => new Set([...prev, post.id])); // Mark as executed immediately
            handleAutoPostForScheduledPost(post).catch(error => {
              console.error(`❌ Failed to execute overdue post "${post.title}":`, error);
            });
          } else if (minutesLate <= 60 && !executedPosts.has(`notification-${post.id}`) && !executedPosts.has(`missed-${post.id}`)) {
            // Only show missed post notifications if the post was created more than 2 minutes ago
            // This prevents notifications when creating new posts or loading the app
            const postCreatedAt = new Date(post.createdAt);
            const timeSinceCreated = now.getTime() - postCreatedAt.getTime();
            const minutesSinceCreated = timeSinceCreated / (1000 * 60);
            
            if (minutesSinceCreated > 2) {
              // Show a notification for recently missed posts (only once)
              setExecutedPosts(prev => new Set([...prev, `notification-${post.id}`, `missed-${post.id}`])); // Prevent duplicate notifications with multiple keys
              console.log(`📢 Showing missed post notification for "${post.title}" (${minutesLate} minutes late)`);
              if (Notification.permission === "granted") {
                new Notification(`⚠️ Missed Scheduled Post: ${post.title}`, {
                  body: `This post was scheduled ${minutesLate} minutes ago. ${post.autoPost?.enabled ? 'Auto-posting was enabled but may have failed.' : 'Click to post manually.'}`,
                  icon: "/favicon.ico",
                  tag: `missed-post-${post.id}`,
                  requireInteraction: true
                });
              }
            }
          }
          return;
        }
        
        // Mark as pending
        setScheduledPostsStatus(prev => ({ ...prev, [post.id]: 'pending' }));
        
        const timeout = setTimeout(async () => {
          try {
            // Mark as executed to prevent re-execution
            setExecutedPosts(prev => new Set([...prev, post.id]));
            
            // Check if auto-posting is enabled for this post
            if (post.autoPost?.enabled && post.autoPost.platforms.length > 0) {
              console.log(`🤖 Auto-posting "${post.title}" to platforms:`, post.autoPost.platforms);
              await handleAutoPostForScheduledPost(post);
            } else {
              // Create notification for manual posting
              const notification = new Notification(`⏰ Post Reminder: ${post.title}`, {
                body: `Time to post "${post.title}"!\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`,
              icon: "/favicon.ico",
                tag: `post-reminder-${post.id}`,
              requireInteraction: true,
              silent: false
            });

            // Also show browser alert as fallback
              alert(`⏰ REMINDER: Time to post "${post.title}"!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}\n\nClick on "📝 Posts" to switch to this post.`);

            // Auto-close notification after 15 seconds
            setTimeout(() => notification.close(), 15000);
            }
            
            console.log(`✅ Scheduled action triggered for "${post.title}"`);
          } catch (error) {
            console.error("❌ Scheduled action error:", error);
            alert(`⏰ REMINDER: Time to post "${post.title}"!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`);
          }
        }, delay);
        
        timeouts.push(timeout as unknown as number);
      });
    };

    setupNotifications();
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [posts, executedPosts]); // Include executedPosts to ensure proper tracking

  // Add unified tagging functions
  const saveEditedPerson = () => {
    if (editingPersonId) {
      updatePersonMapping(editingPersonId, editPersonMapping);
      setEditingPersonId(null);
      setEditPersonMapping({
        name: '',
        displayName: '',
        twitter: '',
        mastodon: '',
        bluesky: ''
      });
      alert('✅ Person mapping updated successfully!');
    }
  };

  const insertUnifiedTag = (personName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const tag = `@{${personName}}`;
    
    setText(before + tag + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }, 0);
  };

  // Text change handler with tag autocomplete
  const handleTextChange = (newText: string) => {
    setText(newText); // This is the hook's setText which handles undo/redo internally

    // Check for tag autocomplete trigger
    const textarea = textareaRef.current;
    if (textarea) {
      // Use a small timeout to ensure the cursor position is updated
      setTimeout(() => {
        if (textarea.selectionStart !== undefined) {
          checkForTagAutocomplete(newText, textarea.selectionStart);
        }
      }, 0);
    }
  };

  // Check if we should show tag autocomplete
  const checkForTagAutocomplete = (text: string, cursorPos: number) => {
    // Look backwards from cursor position to find @ symbol
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      const char = text[i];
      if (char === '@') {
        // Check if this @ is the start of a unified tag @{...}
        if (i + 1 < text.length && text[i + 1] === '{') {
          // This is already a unified tag, don't show autocomplete
          setShowTagAutocomplete(false);
          return;
        }
        atPos = i;
        break;
      } else if (char === ' ' || char === '\n' || char === '\t') {
        // Hit whitespace before finding @, no autocomplete
        break;
      }
    }

    if (atPos !== -1) {
      // Found @ symbol, extract the filter text
      const filter = text.substring(atPos + 1, cursorPos);
      
      // Only show if we have person mappings and the filter doesn't contain spaces/newlines
      if (taggingState.personMappings.length > 0 && !/[\s\n\t]/.test(filter)) {
        setTagAutocompleteFilter(filter);
        setTagAutocompleteStartPos(atPos);
        
        // Calculate position for the dropdown
        const textarea = textareaRef.current;
        if (textarea) {
          // Create a temporary element to measure text dimensions more accurately
          const measureElement = document.createElement('div');
          measureElement.style.position = 'absolute';
          measureElement.style.visibility = 'hidden';
          measureElement.style.whiteSpace = 'pre';
          measureElement.style.font = window.getComputedStyle(textarea).font;
          measureElement.style.padding = '0';
          measureElement.style.margin = '0';
          measureElement.style.border = 'none';
          
          // Calculate text width only up to the @ symbol position
          const textBeforeAt = text.substring(0, atPos);
          const linesBeforeAt = textBeforeAt.split('\n');
          const currentLineTextBeforeAt = linesBeforeAt[linesBeforeAt.length - 1];
          
          measureElement.textContent = currentLineTextBeforeAt;
          document.body.appendChild(measureElement);
          
          const textWidth = measureElement.offsetWidth;
          const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
          
          document.body.removeChild(measureElement);
          
          // Calculate position relative to textarea (not viewport)
          const paddingLeft = parseFloat(window.getComputedStyle(textarea).paddingLeft) || 16;
          const paddingTop = parseFloat(window.getComputedStyle(textarea).paddingTop) || 16;
          
          // Position relative to the textarea element, not the viewport
          const top = paddingTop + (linesBeforeAt.length - 1) * lineHeight + lineHeight;
          const left = paddingLeft + textWidth;
          
          setTagAutocompletePosition({ top, left });
          setShowTagAutocomplete(true);
        }
      } else {
        setShowTagAutocomplete(false);
      }
    } else {
      setShowTagAutocomplete(false);
    }
  };

  // Handle tag selection from autocomplete
  const handleTagAutocompleteSelect = (suggestion: TagSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    // Replace the partial text with the unified tag
    const before = text.substring(0, tagAutocompleteStartPos);
    const after = text.substring(textarea.selectionStart);
    const tag = `@{${suggestion.name}}`;
    
    const newText = before + tag + after;
    setText(newText);
    
    // Hide autocomplete
    setShowTagAutocomplete(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = tagAutocompleteStartPos + tag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }, 0);
  };

  // Close tag autocomplete
  const closeTagAutocomplete = () => {
    setShowTagAutocomplete(false);
  };

  // Undo/Redo functions are now handled by useTextEditor hook

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"} min-h-screen p-6`}>
      <div className={`max-w-4xl mx-auto p-6 rounded-2xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Social Media Kit</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPostManager(!showPostManager)}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              📝 Posts ({posts.length})
            </button>

            <button
              onClick={() => window.open('https://github.com/terrytangyuan/social-media-kit', '_blank')}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
              title="Star this project on GitHub!"
            >
              ⭐ GitHub
            </button>
            <button
              onClick={() => setShowOAuthSettings(true)}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          show={showOAuthSettings}
          onClose={() => setShowOAuthSettings(false)}
          darkMode={darkMode}
          oauthConfig={oauthConfig}
          onUpdateOAuthConfig={updateOAuthConfig}
          onClearCache={clearOAuthLocalStorage}
        />

        <PostManagerModal
          show={showPostManager}
          darkMode={darkMode}
          posts={posts}
          currentPostId={currentPostId}
          selectedPostIds={selectedPostIds}
          publishedPostsCount={publishedPosts.length}
          deletedPostsCount={getActualDeletedPosts().length}
          scheduledPostsStatus={scheduledPostsStatus}
          onCreateNewPost={createNewPost}
          onSwitchToPost={switchToPost}
          onDeletePost={deletePost}
          onUpdatePostTitle={updatePostTitle}
          onTogglePostSelection={togglePostSelection}
          onToggleSelectAll={toggleSelectAll}
          onDeleteSelectedPosts={deleteSelectedPosts}
          onLoadPostsFromDisk={loadPostsFromDisk}
          onSavePostsToDisk={savePostsToDisk}
          onShowPublishedPosts={() => setShowPublishedPosts(true)}
          onShowDeletedPosts={() => setShowDeletedPosts(true)}
          formatTimezoneTime={formatTimezoneTime}
        />

        {/* Published Posts Modal */}
        <PublishedPostsModal
          show={showPublishedPosts}
          onClose={() => setShowPublishedPosts(false)}
          darkMode={darkMode}
          publishedPosts={publishedPosts}
          onViewDetails={(post) => setSelectedPublishedPost(post)}
        />

        {/* Deleted Posts Modal */}
        <DeletedPostsModal
          show={showDeletedPosts}
          onClose={() => setShowDeletedPosts(false)}
          darkMode={darkMode}
          deletedPosts={deletedPosts}
          publishedPosts={publishedPosts}
          selectedDeletedPostIds={selectedDeletedPostIds}
          onToggleSelection={toggleDeletedPostSelection}
          onToggleSelectAll={toggleSelectAllDeletedPosts}
          onPermanentlyDeleteSelected={permanentlyDeleteSelectedPosts}
          onPermanentlyDelete={permanentlyDeletePost}
          onRestore={restoreDeletedPost}
          onViewDetails={setSelectedDeletedPost}
        />

        {/* Published Post Details Modal */}
        <PublishedPostDetailsModal
          post={selectedPublishedPost}
          onClose={() => setSelectedPublishedPost(null)}
          darkMode={darkMode}
          onDeletePublished={moveToDeleted}
        />

        {/* Deleted Post Details Modal */}
        <DeletedPostDetailsModal
          post={selectedDeletedPost}
          onClose={() => setSelectedDeletedPost(null)}
          darkMode={darkMode}
          onRestore={(postId) => {
            restoreDeletedPost(postId);
            setSelectedDeletedPost(null);
          }}
          onPermanentlyDelete={(postId) => {
            permanentlyDeletePost(postId);
            setSelectedDeletedPost(null);
          }}
        />

        {/* Show editor when there's a post to edit */}
        {posts.length === 0 ? (
          // Show welcome message when no posts exist at all
          <div className={`text-center py-12 ${darkMode ? "bg-gray-700" : "bg-gray-50"} rounded-xl border-2 border-dashed ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">✨</div>
              <h2 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Welcome to Social Media Kit!
              </h2>
              <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Create your first post to get started with cross-platform social media management.
              </p>
              <button
                onClick={createNewPost}
                className={`${darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto`}
              >
                ✏️ Create Your First Post
              </button>
              <div className={`mt-6 text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                <p>💡 You can also click "📝 Posts" in the header to manage existing posts</p>
              </div>
            </div>
          </div>
        ) : currentPostId ? (
          <>
            <div className="flex gap-2 mb-2">
              <button onClick={() => applyMarkdown("**")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Bold</button>
              <button onClick={() => applyMarkdown("_")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Italic</button>
          <div className="relative emoji-picker-container">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-xl text-sm"
            >
              😊 Emojis
            </button>
            <EmojiPicker
              show={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={insertEmoji}
              darkMode={darkMode}
            />
          </div>
                        <button
                onClick={() => setShowTagManager(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-xl text-sm"
              >
                🏷️ Tags
              </button>
            </div>

        <TextEditor
          text={text}
          darkMode={darkMode}
          selectedPlatform={selectedPlatform}
          textareaRef={textareaRef}
          platformLimits={PLATFORM_LIMITS}
          showTagAutocomplete={showTagAutocomplete}
          tagAutocompletePosition={tagAutocompletePosition}
          tagAutocompleteFilter={tagAutocompleteFilter}
          personMappings={taggingState.personMappings}
          onChange={handleTextChange}
          onTagAutocompleteSelect={handleTagAutocompleteSelect}
          onCloseTagAutocomplete={closeTagAutocomplete}
          onKeyDown={(e) => {
            // Handle special keys when autocomplete is open
            if (showTagAutocomplete && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape')) {
              // Let the TagAutocomplete component handle these keys
              return;
            }
          }}
          onBlur={() => {
            // Close autocomplete when textarea loses focus (with a small delay to allow clicking on suggestions)
            setTimeout(() => {
              setShowTagAutocomplete(false);
            }, 150);
          }}
        />

        <ImageUploadSection
          darkMode={darkMode}
          selectedPlatform={selectedPlatform}
          attachedImages={attachedImages}
          platformImageSelections={platformImageSelections}
          onImageUpload={handleImageUploadEvent}
          onRemoveImage={removeAttachedImage}
          onRemoveAllImages={removeAllAttachedImages}
          onSelectImagesForPlatform={selectImagesForPlatform}
          getSelectedImagesForPlatform={getSelectedImagesForPlatform}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />

        <PlatformSelector
          selectedPlatform={selectedPlatform}
          auth={auth}
          darkMode={darkMode}
          isXPremium={isXPremium}
          attachedImages={attachedImages}
          hasExplicitSelection={hasExplicitSelection}
          onSelectPlatform={setSelectedPlatform}
          onLogin={(platform) => {
            setAuthPlatform(platform);
            setShowAuthModal(true);
          }}
          onLogout={logout}
          onShowLogoutModal={() => setShowLogoutModal(true)}
          onXPremiumChange={setIsXPremium}
          onSelectImagesForPlatform={selectImagesForPlatform}
          getAuthenticatedPlatforms={getAuthenticatedPlatforms}
          IMAGE_LIMITS={IMAGE_LIMITS}
        />

        <div className={`flex justify-between items-center mb-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <span>{countWords(text)} words</span>
          <div className="flex gap-4">
            <span>{getPlatformCharacterCount(text)} characters</span>
            <span className={`${getPlatformCharacterCount(text) > PLATFORM_LIMITS[selectedPlatform] ? 'text-red-500' : 'text-green-500'}`}>
              Limit: {PLATFORM_LIMITS[selectedPlatform]}{selectedPlatform === 'twitter' && isXPremium ? ' (X Premium)' : ''}
            </span>
          </div>
        </div>

        <div className="mb-4">
          
          {scheduleTime && new Date(scheduleTime) > new Date() && (
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              📅 Scheduled for: {formatTimezoneTime(scheduleTime, timezone)}
                  </p>
                  {autoPostEnabled && autoPostPlatforms.length > 0 && (
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      🤖 Auto-posting to: {autoPostPlatforms.join(', ')}
            </p>
          )}
                  {(!autoPostEnabled || autoPostPlatforms.length === 0) && (
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      🔔 Reminder only (no auto-posting)
                    </p>
              )}
            </div>
            <button
                  onClick={openScheduleModal}
                  className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Edit
            </button>
          </div>
            </div>
          )}
        </div>

        {/* Posting Status */}
        {postingStatus && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>{postingStatus}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {auth[selectedPlatform].isAuthenticated ? (
            <button 
              onClick={handleAutoPost}
              disabled={isPosting}
              className={`${isPosting ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-xl flex items-center gap-2`}
            >
                              {isPosting ? '⏳' : '📤'} {isPosting ? 'Posting...' : `Post to ${getPlatformDisplayName(selectedPlatform)}`}
            </button>
          ) : (
            <button onClick={handleCopyStyled} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl">
              📋 Copy for {getPlatformDisplayName(selectedPlatform)}
            </button>
          )}
          
          {/* Post to All and Schedule Post buttons */}
          <div className="flex gap-3 justify-end">
            {(() => {
              const connectedPlatforms = (['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).filter(
                platform => auth[platform].isAuthenticated
              );
              
              if (connectedPlatforms.length > 1) {
                return (
                  <button 
                    onClick={handlePostToAll}
                    disabled={isPosting}
                    className={`${isPosting ? 'bg-gray-500' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-xl flex items-center gap-2`}
                  >
                    {isPosting ? '⏳' : '🚀'} {isPosting ? 'Posting...' : `Post to All (${connectedPlatforms.length})`}
                  </button>
                );
              }
              return null;
            })()}
            
            <button
              onClick={openScheduleModal}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              📅 Schedule Post
            </button>
          </div>

        </div>
          </>
        ) : (
          // Show post selection prompt when posts exist but none is selected
          <div className={`text-center py-12 ${darkMode ? "bg-gray-700" : "bg-gray-50"} rounded-xl border-2 border-dashed ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📝</div>
              <h2 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Select a Post to Edit
              </h2>
              <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                You have {posts.length} post{posts.length !== 1 ? 's' : ''} saved. Choose one to edit or create a new one.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowPostManager(true)}
                  className={`${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2`}
                >
                  📋 Select Post
                </button>
                <button
                  onClick={createNewPost}
                  className={`${darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2`}
                >
                  ➕ New Post
                </button>
              </div>
            </div>
          </div>
        )}

        {currentPostId && text.trim() && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">
              {getPlatformDisplayName(selectedPlatform)} Preview
            </h2>
            {selectedPlatform === 'linkedin' && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${darkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}>
                💡 <strong>LinkedIn Tagging Tip:</strong> After pasting, type @ in LinkedIn and select the person from the dropdown to create a proper tag. The @names in this preview help you remember who to tag.
              </div>
            )}
            <ChunkPreview
              text={text}
              darkMode={darkMode}
              selectedPlatform={selectedPlatform}
              platformLimits={PLATFORM_LIMITS}
              formatForPlatform={formatForPlatform}
              getSelectedImagesForPlatform={getSelectedImagesForPlatform}
              showNotification={showNotification}
            />
          </div>
        )}

        {/* Authentication Modal */}
        <AuthModal
          show={showAuthModal}
          platform={authPlatform}
          onClose={() => setShowAuthModal(false)}
          darkMode={darkMode}
          oauthConfig={oauthConfig}
          blueskyCredentials={blueskyCredentials}
          onBlueskyCredentialsChange={setBlueskyCredentials}
          onBlueskyLogin={async () => await authenticateBluesky(blueskyCredentials.handle, blueskyCredentials.appPassword)}
          onMastodonLogin={async () => {}}
          onGenerateOAuthUrl={initiateOAuth}
          isPosting={isPosting}
        />

        {/* Tag Manager Modal */}
        <TagManagerModal
          show={showTagManager}
          onClose={() => setShowTagManager(false)}
          darkMode={darkMode}
          personMappings={taggingState.personMappings}
          newPersonMapping={newPersonMapping}
          editingPersonId={editingPersonId}
          editPersonMapping={editPersonMapping}
          onNewPersonChange={setNewPersonMapping}
          onEditPersonChange={setEditPersonMapping}
          onAdd={addPersonMapping}
          onUpdate={() => {
            if (editingPersonId) {
              updatePersonMapping(editingPersonId, editPersonMapping);
              setEditingPersonId(null);
              setEditPersonMapping({
                name: '',
                displayName: '',
                twitter: '',
                mastodon: '',
                bluesky: ''
              });
              return true;
            }
            return false;
          }}
          onDelete={deletePersonMapping}
          onStartEdit={(person) => startEditingPerson(person.id)}
          onCancelEdit={cancelEditingPerson}
          onInsertTag={insertUnifiedTag}
          taggingState={taggingState}
          onTaggingStateChange={setTaggingState}
        />
        
        {/* Footer */}
        <div className={`mt-8 pt-6 border-t text-center ${darkMode ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-600"}`}>
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-2">
              <span className="text-sm">Made with ❤️ for the community</span>
            </div>
            <div className="flex justify-center items-center gap-4">
              <a 
                href="https://github.com/terrytangyuan/social-media-kit" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
              >
                ⭐ Star on GitHub
              </a>
              <a 
                href="https://github.com/terrytangyuan/social-media-kit/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
              >
                🐛 Report Issues
              </a>
            </div>
            <p className="text-xs">
              Find this tool helpful? Give it a star to support the project! 🌟
            </p>
          </div>
        </div>
      </div>
      
      {/* Copy Notification */}
      <ToastNotification
        visible={notification.visible}
        message={notification.message}
        darkMode={darkMode}
      />

      {/* Image Selection Modal */}
      <ImageSelectorModal
        show={showImageSelector}
        onClose={closeImageSelector}
        darkMode={darkMode}
        pendingPlatform={pendingPlatform}
        platformImageSelections={platformImageSelections}
        attachedImages={attachedImages}
        IMAGE_LIMITS={IMAGE_LIMITS}
        updatePlatformSelection={updatePlatformSelection}
        onSwitchPlatform={setSelectedPlatform}
        showNotification={showNotification}
      />

      {/* Multi-Platform Logout Modal */}
      <LogoutModal
        show={showLogoutModal}
        onClose={() => {
          setShowLogoutModal(false);
          setSelectedLogoutPlatforms([]);
        }}
        darkMode={darkMode}
        selectedLogoutPlatforms={selectedLogoutPlatforms}
        authenticatedPlatforms={getAuthenticatedPlatforms()}
        onTogglePlatform={toggleLogoutPlatform}
        onToggleSelectAll={() => {
          const allPlatforms = getAuthenticatedPlatforms();
          if (selectedLogoutPlatforms.length === allPlatforms.length) {
            setSelectedLogoutPlatforms([]);
          } else {
            setSelectedLogoutPlatforms(allPlatforms);
          }
        }}
        onConfirmLogout={handleMultiPlatformLogout}
      />

      {/* Schedule Post Modal */}
      <ScheduleModal
        show={showScheduleModal}
        darkMode={darkMode}
        modalScheduleTime={modalScheduleTime}
        modalTimezone={modalTimezone}
        modalAutoPostEnabled={modalAutoPostEnabled}
        modalAutoPostPlatforms={modalAutoPostPlatforms}
        modalNotificationEnabled={modalNotificationEnabled}
        auth={auth}
        commonTimezones={COMMON_TIMEZONES as any}
        onScheduleTimeChange={setModalScheduleTime}
        onTimezoneChange={setModalTimezone}
        onAutoPostEnabledChange={setModalAutoPostEnabled}
        onAutoPostPlatformsChange={setModalAutoPostPlatforms}
        onNotificationEnabledChange={setModalNotificationEnabled}
        onConfirm={handleScheduleConfirm}
        onCancel={cancelScheduleModal}
        formatTimezoneTime={formatTimezoneTime}
      />
    </div>
  );
}

export default App;
