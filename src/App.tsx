import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { countWords, countCharacters, countCharactersForBluesky } from "./utils/textFormatting";

// Tag Autocomplete Component
type TagSuggestion = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
};

type TagAutocompleteProps = {
  suggestions: TagSuggestion[];
  onSelect: (suggestion: TagSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
  darkMode: boolean;
  filter: string;
};

const TagAutocomplete = ({ suggestions, onSelect, onClose, position, darkMode, filter }: TagAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on the current filter
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.name.toLowerCase().includes(filter.toLowerCase()) ||
    suggestion.displayName.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredSuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredSuggestions[selectedIndex]) {
            onSelect(filteredSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredSuggestions, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute z-50 max-w-xs w-64 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
        darkMode 
          ? "bg-gray-800 border-gray-600 text-white" 
          : "bg-white border-gray-300 text-gray-800"
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      ref={listRef}
    >
      {filteredSuggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${
            index === selectedIndex
              ? darkMode 
                ? "bg-blue-600 text-white" 
                : "bg-blue-100 text-blue-900"
              : darkMode
                ? "hover:bg-gray-700 border-gray-600"
                : "hover:bg-gray-50 border-gray-200"
          }`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="font-medium">{suggestion.displayName}</div>
          <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            @{suggestion.name}
            {suggestion.twitter && ` • Twitter: @${suggestion.twitter}`}
            {suggestion.bluesky && ` • Bluesky: @${suggestion.bluesky}`}
          </div>
        </div>
      ))}
    </div>
  );
};

// OAuth configuration type
type OAuthConfig = {
  linkedin: {
    clientId: string;
    redirectUri: string;
    scope: string;
    authUrl: string;
  };
  twitter: {
    clientId: string;
    redirectUri: string;
    scope: string;
    authUrl: string;
  };
  mastodon: {
    clientId: string;
    redirectUri: string;
    scope: string;
    instanceUrl: string;
  };
  bluesky: {
    server: string;
  };
};

// Default OAuth configuration (fallback if server config fails)
const DEFAULT_OAUTH_CONFIG: OAuthConfig = {
  linkedin: {
    clientId: '',
    redirectUri: window.location.origin,
          scope: 'w_member_social',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization'
  },
  twitter: {
    clientId: '',
    redirectUri: window.location.origin,
    scope: 'tweet.read tweet.write users.read',
    authUrl: 'https://twitter.com/i/oauth2/authorize'
  },
  mastodon: {
    clientId: '',
    redirectUri: window.location.origin,
    scope: 'read write',
    instanceUrl: 'https://mastodon.social'
  },
  bluesky: {
    server: 'https://bsky.social'
  }
};

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userInfo: any;
};

type PlatformAuth = {
  linkedin: AuthState & { handle?: string; appPassword?: string };
  twitter: AuthState & { handle?: string; appPassword?: string };
  mastodon: AuthState & { handle?: string; instanceUrl?: string };
  bluesky: AuthState & { handle?: string; appPassword?: string };
};

// Add unified tagging types
type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  mastodon?: string;
  bluesky?: string;
  createdAt: string;
  updatedAt: string;
};

type TaggingState = {
  personMappings: PersonMapping[];
};

type PlatformPostResult = {
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt: string;
};

type PublishedPost = {
  id: string;
  title: string;
  content: string;
  originalPostId: string; // Reference to the original post from posts array
  publishedAt: string;
  timezone: string;
  platformResults: PlatformPostResult[];
  images?: {
    file: File;
    dataUrl: string;
    name: string;
  }[];
  platformImageSelections?: {
    [key: string]: number[];
  };
};

type DeletedPost = {
  id: string;
  title: string;
  content: string;
  originalPostId: string;
  deletedAt: string;
  timezone: string;
  createdAt: string;
  scheduleTime?: string;
  images?: {
    file: File;
    dataUrl: string;
    name: string;
  }[];
  platformImageSelections?: {
    [key: string]: number[];
  };
  deleteReason?: 'user_deleted';
};

function App() {
  const [text, setText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem("timezone");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [posts, setPosts] = useState<Array<{
    id: string;
    title: string;
    content: string;
    scheduleTime: string;
    timezone: string;
    createdAt: string;
    isScheduled?: boolean; // Flag to indicate if post is actually scheduled
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
  }>>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [showPostManager, setShowPostManager] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter' | 'mastodon' | 'bluesky'>('linkedin');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPlatform, setAuthPlatform] = useState<'linkedin' | 'twitter' | 'mastodon' | 'bluesky' | null>(null);
  const [blueskyCredentials, setBlueskyCredentials] = useState({
    handle: '',
    appPassword: ''
  });
  const [isPosting, setIsPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<string>('');
  
  // Auto-posting state
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [autoPostPlatforms, setAutoPostPlatforms] = useState<('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[]>([]);
  
  // Scheduled posts tracking
  const [scheduledPostsStatus, setScheduledPostsStatus] = useState<{[postId: string]: 'pending' | 'executing' | 'completed' | 'failed'}>({});
  
  // Track executed posts to prevent re-execution
  const [executedPosts, setExecutedPosts] = useState<Set<string>>(new Set());
  
  // Rate limiting for API calls
  const [lastApiCall, setLastApiCall] = useState<{[platform: string]: number}>({});
  
  // Image upload state - updated to support multiple images with platform-specific selection
  const [attachedImages, setAttachedImages] = useState<{
    file: File;
    dataUrl: string;
    name: string;
  }[]>([]);
  
  // Platform-specific image selections
  const [platformImageSelections, setPlatformImageSelections] = useState<{
    [key: string]: number[]; // Array of indices of selected images for each platform
  }>({});
  
  // Track which platforms have user-made explicit selections
  const [hasExplicitSelection, setHasExplicitSelection] = useState<{
    [key: string]: boolean;
  }>({});
  
  // Image selection modal state
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  
  // Multi-platform logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Schedule post modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalScheduleTime, setModalScheduleTime] = useState('');
  const [modalTimezone, setModalTimezone] = useState(() => {
    const saved = localStorage.getItem("timezone");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [modalAutoPostEnabled, setModalAutoPostEnabled] = useState(false);
  const [modalAutoPostPlatforms, setModalAutoPostPlatforms] = useState<('linkedin' | 'twitter' | 'mastodon' | 'bluesky')[]>([]);
  const [modalNotificationEnabled, setModalNotificationEnabled] = useState(false);
  const [selectedLogoutPlatforms, setSelectedLogoutPlatforms] = useState<string[]>([]);
  
  // Auto-sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSyncEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Default to enabled
  });
  
  // OAuth configuration state
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>(DEFAULT_OAUTH_CONFIG);
  const [showOAuthSettings, setShowOAuthSettings] = useState(false);
  const [oauthConfigLoaded, setOauthConfigLoaded] = useState(false);
  
  // Authentication state
  const [auth, setAuth] = useState<PlatformAuth>({
    linkedin: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: null
    },
    twitter: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: null
    },
    mastodon: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: null,
      handle: '',
      instanceUrl: 'https://mastodon.social'
    },
    bluesky: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: null,
      handle: '',
      appPassword: ''
    }
  });

  // Published and deleted posts storage
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);
  const [showPublishedPosts, setShowPublishedPosts] = useState(false);
  const [showDeletedPosts, setShowDeletedPosts] = useState(false);
  const [selectedPublishedPost, setSelectedPublishedPost] = useState<PublishedPost | null>(null);
  const [selectedDeletedPost, setSelectedDeletedPost] = useState<DeletedPost | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoTimeoutRef = useRef<number>();

  // X Premium setting
  const [isXPremium, setIsXPremium] = useState(false);

  // Dynamic platform limits based on X Premium setting
  const PLATFORM_LIMITS = {
    linkedin: 3000, // LinkedIn doesn't have strict limit, but 3000 is good practice
    twitter: isXPremium ? 25000 : 280, // X Premium: 25,000 chars, Regular: 280 chars
    mastodon: 500, // Default Mastodon character limit (configurable per instance)
    bluesky: 300
  };

  // Platform image limits
  const IMAGE_LIMITS = {
    linkedin: { maxImages: 9, maxFileSize: 5 * 1024 * 1024 }, // 5MB per image
    twitter: { maxImages: 4, maxFileSize: 5 * 1024 * 1024 }, // 5MB per image  
    mastodon: { maxImages: 4, maxFileSize: 8 * 1024 * 1024 }, // 8MB per image
    bluesky: { maxImages: 4, maxFileSize: 10 * 1024 * 1024 } // 10MB per image
  } as const;

  // Add unified tagging state
  const [taggingState, setTaggingState] = useState<TaggingState>({
    personMappings: []
  });
  const [showTagManager, setShowTagManager] = useState(false);
  
  // Tag autocomplete state
  const [showTagAutocomplete, setShowTagAutocomplete] = useState(false);
  const [tagAutocompletePosition, setTagAutocompletePosition] = useState({ top: 0, left: 0 });
  const [tagAutocompleteFilter, setTagAutocompleteFilter] = useState('');
  const [tagAutocompleteStartPos, setTagAutocompleteStartPos] = useState(0);
  
  const [newPersonMapping, setNewPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    mastodon: '',
    bluesky: ''
  });
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonMapping, setEditPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    mastodon: '',
    bluesky: ''
  });

  // Undo/Redo state
  const [undoHistory, setUndoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  
  // Notification state for copy actions
  const [notification, setNotification] = useState<{
    message: string;
    visible: boolean;
  }>({ message: '', visible: false });

  // Helper function to check if token is expired
  const isTokenExpired = (authData: AuthState): boolean => {
    if (!authData.isAuthenticated || !authData.accessToken) return true;
    if (!authData.expiresAt) return false; // No expiration info, assume valid
    return Date.now() >= authData.expiresAt;
  };

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
    
    if (!authData.refreshToken) {
      console.log(`🔄 No refresh token available for ${platform}, cannot auto-refresh`);
      return false;
    }

    try {
      console.log(`🔄 Attempting to refresh ${platform} token...`);
      
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          refreshToken: authData.refreshToken,
        }),
      });

      if (!response.ok) {
        console.warn(`❌ Token refresh failed for ${platform}: ${response.status}`);
        return false;
      }

      const tokenData = await response.json();
      
      // Update auth state with new tokens
      setAuth(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || authData.refreshToken, // Keep old refresh token if new one not provided
          expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
        }
      }));

      console.log(`✅ Successfully refreshed ${platform} token`);
      showNotification(`🔄 ${platform.toUpperCase()} authentication refreshed automatically`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error refreshing ${platform} token:`, error);
      return false;
    }
  };

  // Helper function to ensure valid authentication before API calls
  const ensureValidAuth = async (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): Promise<boolean> => {
    const authData = auth[platform];
    
    // Check if not authenticated at all
    if (!authData.isAuthenticated || !authData.accessToken) {
      console.warn(`❌ Not authenticated with ${platform}`);
      return false;
    }
    
    // Check if token is not expired
    if (!isTokenExpired(authData)) {
      return true;
    }
    
    // Token is expired, try to refresh if we have a refresh token
    if (authData.refreshToken) {
      console.log(`🔄 Token expired for ${platform}, attempting refresh...`);
      const refreshed = await attemptTokenRefresh(platform);
      if (refreshed) {
        console.log(`✅ Successfully refreshed ${platform} token`);
        return true;
      }
      console.warn(`❌ Failed to refresh ${platform} token`);
    } else {
      console.warn(`❌ No refresh token available for ${platform}`);
    }
    
    // Authentication failed or refresh failed
    console.warn(`❌ Authentication not valid for ${platform}, user needs to re-login`);
    
    // Log out the platform since auth is invalid
    logout(platform);
    
    showNotification(`🔒 ${platform.toUpperCase()} authentication expired. Please log in again.`);
    return false;
  };

  // Helper function to show notifications
  const showNotification = (message: string) => {
    setNotification({ message, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 2000); // Hide after 2 seconds
  };

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
    
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        // Merge with default auth state to ensure all platforms are present
        setAuth(prev => ({
          linkedin: { ...prev.linkedin, ...(parsedAuth.linkedin || {}) },
          twitter: { ...prev.twitter, ...(parsedAuth.twitter || {}) },
          mastodon: { ...prev.mastodon, ...(parsedAuth.mastodon || {}) },
          bluesky: { ...prev.bluesky, ...(parsedAuth.bluesky || {}) }
        }));
      } catch (error) {
        console.error('Error parsing saved auth:', error);
      }
    }
    
    // Load saved tagging state
    if (savedTagging) {
      try {
        const parsedTagging = JSON.parse(savedTagging);
        setTaggingState(parsedTagging);
      } catch (error) {
        console.error('Error parsing saved tagging state:', error);
      }
    }
    
    // Load OAuth configuration from server first, then merge with localStorage
    const loadOAuthConfig = async () => {
      try {
        console.log('🔄 Loading OAuth config from server...');
        const response = await fetch('/api/oauth/config');
        if (response.ok) {
          const serverConfig = await response.json();
          console.log('✅ Server OAuth config loaded:', serverConfig);
          
          // If we have saved config in localStorage, merge it with server config
          if (savedOAuthConfig) {
            try {
              const localConfig = JSON.parse(savedOAuthConfig);
              console.log('📋 Merging with localStorage config:', localConfig);
              
              // Merge configs - server provides LinkedIn/Twitter/Mastodon settings, localStorage provides Bluesky and Mastodon instance
              const mergedConfig = {
                linkedin: {
                  ...DEFAULT_OAUTH_CONFIG.linkedin,
                  ...(serverConfig.linkedin || {})
                  // Client ID always comes from server
                },
                twitter: {
                  ...DEFAULT_OAUTH_CONFIG.twitter,
                  ...(serverConfig.twitter || {})
                  // Client ID always comes from server
                },
                mastodon: {
                  ...DEFAULT_OAUTH_CONFIG.mastodon,
                  ...(serverConfig.mastodon || {}),
                  ...(localConfig.mastodon || {})
                  // Instance URL can be overridden from localStorage
                },
                bluesky: {
                  ...DEFAULT_OAUTH_CONFIG.bluesky,
                  ...(serverConfig.bluesky || {}),
                  ...(localConfig.bluesky || {})
                }
              };
              
              console.log('✅ Final merged OAuth config:', mergedConfig);
              setOauthConfig(mergedConfig);
            } catch (error) {
              console.error('Error parsing saved OAuth config:', error);
              console.log('🔄 Using server config only');
              setOauthConfig(serverConfig);
            }
          } else {
            console.log('📋 No localStorage config, using server config');
            // Merge server config with defaults to ensure all platforms are present
            const safeServerConfig = {
              linkedin: { ...DEFAULT_OAUTH_CONFIG.linkedin, ...(serverConfig.linkedin || {}) },
              twitter: { ...DEFAULT_OAUTH_CONFIG.twitter, ...(serverConfig.twitter || {}) },
              mastodon: { ...DEFAULT_OAUTH_CONFIG.mastodon, ...(serverConfig.mastodon || {}) },
              bluesky: { ...DEFAULT_OAUTH_CONFIG.bluesky, ...(serverConfig.bluesky || {}) }
            };
            setOauthConfig(safeServerConfig);
          }
        } else {
          console.warn('⚠️ Failed to load OAuth config from server, using localStorage or defaults');
          if (savedOAuthConfig) {
            try {
              const parsedOAuthConfig = JSON.parse(savedOAuthConfig);
              setOauthConfig(parsedOAuthConfig);
            } catch (error) {
              console.error('Error parsing saved OAuth config:', error);
              setOauthConfig(DEFAULT_OAUTH_CONFIG);
            }
          } else {
            setOauthConfig(DEFAULT_OAUTH_CONFIG);
          }
        }
      } catch (error) {
        console.error('Error loading OAuth config from server:', error);
        console.log('🔄 Falling back to localStorage or defaults');
        if (savedOAuthConfig) {
          try {
            const parsedOAuthConfig = JSON.parse(savedOAuthConfig);
            // Merge with defaults to ensure all platforms are present
            const safeParsedConfig = {
              linkedin: { ...DEFAULT_OAUTH_CONFIG.linkedin, ...(parsedOAuthConfig.linkedin || {}) },
              twitter: { ...DEFAULT_OAUTH_CONFIG.twitter, ...(parsedOAuthConfig.twitter || {}) },
              mastodon: { ...DEFAULT_OAUTH_CONFIG.mastodon, ...(parsedOAuthConfig.mastodon || {}) },
              bluesky: { ...DEFAULT_OAUTH_CONFIG.bluesky, ...(parsedOAuthConfig.bluesky || {}) }
            };
            setOauthConfig(safeParsedConfig);
          } catch (error) {
            console.error('Error parsing saved OAuth config:', error);
            setOauthConfig(DEFAULT_OAUTH_CONFIG);
          }
        } else {
          setOauthConfig(DEFAULT_OAUTH_CONFIG);
        }
      } finally {
        setOauthConfigLoaded(true);
      }
    };
    
    loadOAuthConfig();
    
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
    
    // Auto-sync posts when they change
    if (posts.length > 0 && autoSyncEnabled) {
      // Debounce auto-sync to avoid excessive saves
      const timeoutId = setTimeout(() => {
        autoSyncPosts();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [posts, autoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem("socialMediaPublishedPosts", JSON.stringify(publishedPosts));
  }, [publishedPosts]);

  useEffect(() => {
    localStorage.setItem("socialMediaDeletedPosts", JSON.stringify(deletedPosts));
  }, [deletedPosts]);

  useEffect(() => {
    localStorage.setItem("platformAuth", JSON.stringify(auth));
    
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

  useEffect(() => {
    localStorage.setItem("oauthConfig", JSON.stringify(oauthConfig));
  }, [oauthConfig]);

  // Add tagging state persistence
  useEffect(() => {
    localStorage.setItem("unifiedTagging", JSON.stringify(taggingState));
  }, [taggingState]);

  // X Premium setting persistence
  useEffect(() => {
    localStorage.setItem("xPremium", JSON.stringify(isXPremium));
  }, [isXPremium]);

  useEffect(() => {
    // Only save to localStorage after the config has been loaded initially
    if (oauthConfigLoaded) {
      // Save only Bluesky configuration to localStorage
      // Client IDs are now managed server-side via .env file
      const configToSave = {
        bluesky: {
          ...oauthConfig.bluesky
        }
      };
      
      console.log('💾 Saving OAuth config to localStorage (Bluesky only):', configToSave);
      localStorage.setItem("oauthConfig", JSON.stringify(configToSave));
    } else {
      console.log('⏳ Skipping localStorage save - config not loaded yet');
    }
  }, [oauthConfig, oauthConfigLoaded]);

  useEffect(() => {
    // Check notification status on mount
    const checkNotificationStatus = () => {
      if (!("Notification" in window)) {
        setNotificationStatus('unsupported');
        return;
      }
      
      if (Notification.permission === 'granted') {
        setNotificationStatus('granted');
      } else if (Notification.permission === 'denied') {
        setNotificationStatus('denied');
      } else {
        setNotificationStatus('unknown');
      }
    };

    checkNotificationStatus();
    
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const getMarkdownPreview = () => {
    const html = marked(text, { breaks: true });
    return DOMPurify.sanitize(html as string);
  };

  const applyMarkdown = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save state before making changes
    saveUndoState();

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

    // Save state before making changes
    saveUndoState();

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

  const commonTimezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona Time (MST)" },
    { value: "America/Anchorage", label: "Alaska Time (AKST)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Europe/Rome", label: "Rome (CET/CEST)" },
    { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
    { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
    { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
    { value: "Europe/Moscow", label: "Moscow (MSK)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Seoul", label: "Seoul (KST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
    { value: "Australia/Perth", label: "Perth (AWST)" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
    { value: "America/Toronto", label: "Toronto (ET)" },
    { value: "America/Vancouver", label: "Vancouver (PT)" },
    { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
    { value: "America/Mexico_City", label: "Mexico City (CST)" },
    { value: "Africa/Cairo", label: "Cairo (EET)" },
    { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" }
  ];

  const getCurrentDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatTimezoneTime = (datetime: string, tz: string) => {
    if (!datetime) return "";
    try {
      const date = new Date(datetime);
      return date.toLocaleString("en-US", {
        timeZone: tz,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
      });
    } catch {
      return datetime;
    }
  };

  const createNewPost = () => {
    const currentTime = getCurrentDateTimeString();
    const newPost = {
      id: Date.now().toString(),
      title: `Post ${posts.length + 1}`,
      content: "",
      scheduleTime: currentTime,
      timezone: timezone,
      createdAt: new Date().toISOString()
    };
    setPosts(prev => [...prev, newPost]);
    setCurrentPostId(newPost.id);
    setText("");
    setScheduleTime(currentTime);
  };



  const saveCurrentPost = (markAsScheduled = false, unschedule = false) => {
    if (!currentPostId) {
      createNewPost();
      return;
    }
    
    // Filter out unauthenticated platforms before saving
    const validAutoPostPlatforms = autoPostPlatforms.filter(platform => auth[platform].isAuthenticated);
    
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { 
            ...post, 
            content: text, 
            scheduleTime, 
            timezone,
            isScheduled: unschedule ? undefined : (markAsScheduled || post.isScheduled), // Clear, set, or keep existing scheduled status
            images: attachedImages.length > 0 ? attachedImages : undefined,
            platformImageSelections: Object.keys(platformImageSelections).length > 0 ? platformImageSelections : undefined,
            autoPost: autoPostEnabled && validAutoPostPlatforms.length > 0 ? {
              enabled: autoPostEnabled,
              platforms: validAutoPostPlatforms
            } : undefined
          }
        : post
    ));
  };

  // Helper function to unschedule a post
  const unschedulePost = () => {
    saveCurrentPost(false, true);
  };

  const switchToPost = (postId: string) => {
    // Save current changes first
    if (currentPostId) {
      saveCurrentPost();
    }
    
    const post = posts.find(p => p.id === postId);
    if (post) {
      setCurrentPostId(postId);
      setText(post.content);
      setScheduleTime(post.scheduleTime);
      setTimezone(post.timezone);
      
      // Restore images and platform selections
      setAttachedImages(post.images || []);
      setPlatformImageSelections(post.platformImageSelections || {});
      setHasExplicitSelection({}); // Reset explicit selection tracking
      
      // Restore auto-posting settings
      setAutoPostEnabled(post.autoPost?.enabled || false);
      setAutoPostPlatforms(post.autoPost?.platforms || []);
    }
  };

  const deletePost = (postId: string) => {
    // Find the post to be deleted and track it
    const postToDelete = posts.find(p => p.id === postId);
    if (postToDelete) {
      addDeletedPost(postToDelete, 'user_deleted');
    }
    
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (currentPostId === postId) {
      const remainingPosts = posts.filter(p => p.id !== postId);
      if (remainingPosts.length > 0) {
        switchToPost(remainingPosts[0].id);
      } else {
        setCurrentPostId(null);
        setText("");
        setScheduleTime("");
      }
    }
  };

  const updatePostTitle = (postId: string, title: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, title } : post
    ));
  };

  const savePostsToDisk = () => {
    // Auto-save current post before exporting
    if (currentPostId) {
      saveCurrentPost();
    }
    
    // Convert posts with File objects to serializable format
    const serializablePosts = posts.map(post => ({
      ...post,
      images: post.images?.map(img => ({
        dataUrl: img.dataUrl,
        name: img.name,
        // Note: File object is not serializable, but dataUrl contains the image data
      }))
    }));
    
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
          const postsWithFiles = validPosts.map((post: any) => ({
            ...post,
            images: post.images?.map((img: any) => {
              // Convert dataUrl back to File object
              const dataUrl = img.dataUrl;
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const file = new File([u8arr], img.name, { type: mime });
              return {
                file,
                dataUrl: img.dataUrl,
                name: img.name
              };
            })
          }));
          
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
            setHasExplicitSelection({});
            
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

  // Auto-sync functions
  const autoSyncPosts = () => {
    if (!autoSyncEnabled) return;
    
    try {
      // Auto-save current post before syncing
      if (currentPostId) {
        saveCurrentPost();
      }
      
      // Convert posts with File objects to serializable format
      const serializablePosts = posts.map(post => ({
        ...post,
        images: post.images?.map(img => ({
          dataUrl: img.dataUrl,
          name: img.name,
        }))
      }));
      
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
    if (!autoSyncEnabled) return;
    
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
      const postsWithFiles = validPosts.map((post: any) => ({
        ...post,
        images: post.images?.map((img: any) => {
          // Convert dataUrl back to File object
          const dataUrl = img.dataUrl;
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const file = new File([u8arr], img.name, { type: mime });
          return {
            file,
            dataUrl: img.dataUrl,
            name: img.name
          };
        })
      }));
      
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
        setHasExplicitSelection({}); // Reset explicit selection tracking
        
        // Restore auto-posting settings
        setAutoPostEnabled(firstPost.autoPost?.enabled || false);
        setAutoPostPlatforms(firstPost.autoPost?.platforms || []);
      }
      
      console.log(`📁 Auto-loaded ${postsWithFiles.length} posts from local storage`);
    } catch (error) {
      console.error('❌ Auto-load failed:', error);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    localStorage.setItem('autoSyncEnabled', JSON.stringify(newValue));
    
    if (newValue) {
      // If enabling auto-sync, sync immediately
      autoSyncPosts();
      showNotification('✅ Auto-sync enabled and posts synced');
    } else {
      showNotification('❌ Auto-sync disabled');
    }
  };

  // OAuth configuration functions
  const updateOAuthConfig = (platform: 'linkedin' | 'twitter' | 'mastodon', clientId: string) => {
    // Note: Client IDs now come from the server (.env file)
    // This function is kept for backward compatibility but doesn't modify client IDs
    console.log('Note: Client IDs are now configured via .env file on the server');
    console.log('Attempted to update', platform, 'with clientId:', clientId);
    
    // Don't actually update the client ID since it comes from the server
    // This prevents manual overrides from the UI
  };

  const updateBlueskyConfig = (server: string) => {
    setOauthConfig(prev => ({
      ...prev,
      bluesky: {
        server
      }
    }));
  };

  const updateMastodonConfig = (instanceUrl: string) => {
    setOauthConfig(prev => ({
      ...prev,
      mastodon: {
        ...prev.mastodon,
        instanceUrl
      }
    }));
  };

  const clearOAuthLocalStorage = () => {
    if (confirm('⚠️ This will clear all OAuth settings from localStorage and reload the page. Continue?')) {
      localStorage.removeItem('oauthConfig');
      localStorage.removeItem('oauth_state_linkedin');
      localStorage.removeItem('oauth_state_twitter');
      localStorage.removeItem('platformAuth');
      console.log('🧹 Cleared OAuth localStorage');
      window.location.reload();
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
      alert(`❌ ${platform.toUpperCase()} CLIENT ID NOT CONFIGURED\n\nPlease:\n1. Open ⚙️ Settings\n2. Enter your ${platform === 'linkedin' ? 'LinkedIn' : 'Twitter'} Client ID\n3. Save settings\n4. Try authentication again`);
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
      
      showNotification(`✅ Successfully authenticated with ${platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'X/Twitter' : 'Mastodon'}!`);
      
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
  // Helper function to generate PKCE parameters for Twitter
  const generatePKCE = async () => {
    // Generate a proper base64url-safe code verifier
    const array = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifier = btoa(Array.from(array, byte => String.fromCharCode(byte)).join(''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Generate code challenge using SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    
    const codeChallenge = btoa(Array.from(new Uint8Array(hash), byte => String.fromCharCode(byte)).join(''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log('🔐 Generated PKCE parameters:', {
      codeVerifier: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge.substring(0, 10) + '...'
    });
    
    return { codeVerifier, codeChallenge };
  };

  const initiateOAuth = async (platform: 'linkedin' | 'twitter' | 'mastodon') => {
    console.log('🚀 Initiating OAuth for', platform);
    console.log('🔧 OAuth config at initiation:', oauthConfig);
    
    const config = oauthConfig[platform];
    console.log('📋 Platform config:', config);
    console.log('🔑 Client ID check:', { clientId: config.clientId, isEmpty: !config.clientId || config.clientId === '' });
    
    // Check if client ID is properly configured
    if (!config.clientId || config.clientId === '') {
      console.log('❌ Client ID validation failed');
      alert(`❌ ${platform.toUpperCase()} CLIENT ID NOT CONFIGURED!\n\nPlease configure your OAuth settings:\n1. Click the ⚙️ Settings button\n2. Enter your ${platform === 'linkedin' ? 'LinkedIn' : 'Twitter'} Client ID\n3. Save the settings\n\nSee SETUP.md for detailed instructions.`);
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

  const logout = (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky') => {
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
    
    const platformName = platform === 'linkedin' ? 'LinkedIn' : 
                        platform === 'twitter' ? 'X/Twitter' : 
                        platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
    showNotification(`✅ Logged out from ${platformName}`);
  };

  // Get list of authenticated platforms
  const getAuthenticatedPlatforms = () => {
    return (['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).filter(platform => 
      auth[platform].isAuthenticated
    );
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
          
          const platformName = platform === 'linkedin' ? 'LinkedIn' : 
                              platform === 'twitter' ? 'X/Twitter' : 
                              platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
          successfulLogouts.push(platformName);
        } catch (error) {
          console.error(`Failed to logout from ${platform}:`, error);
          const platformName = platform === 'linkedin' ? 'LinkedIn' : 
                              platform === 'twitter' ? 'X/Twitter' : 
                              platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
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
    // Ensure valid authentication (with automatic refresh if needed)
    const isValid = await ensureValidAuth('linkedin');
    if (!isValid) {
      throw new Error('Not authenticated with LinkedIn');
    }
    
    const authData = auth.linkedin;
    
    console.log('📤 Posting to LinkedIn...');
    
    // Use our server endpoint to post to LinkedIn (avoids CORS issues) - v2
    let response;
    if (imageFiles.length > 0) {
      // Use FormData for image upload
      const formData = new FormData();
      formData.append('content', content);
      formData.append('accessToken', authData.accessToken);
      
      // Add multiple images
      imageFiles.forEach((imageFile, index) => {
        formData.append(`image${index}`, imageFile.file);
      });
      formData.append('imageCount', imageFiles.length.toString());
      
      response = await fetch('/api/linkedin/post', {
        method: 'POST',
        body: formData
      });
    } else {
      // JSON request for text-only posts
      response = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          accessToken: authData.accessToken
        })
      });
    }
    
    if (!response.ok) {
      let errorMessage = `LinkedIn API error (${response.status})`;
      try {
        const errorData = await response.json();
        console.error('LinkedIn API error details:', errorData);
        
        if (response.status === 401) {
          errorMessage = `LinkedIn API error: Authentication failed. Please reconnect your LinkedIn account.`;
        } else {
          errorMessage = `LinkedIn API error (${response.status}): ${errorData.message || errorData.error || response.statusText}`;
        }
      } catch (parseError) {
        console.error('Failed to parse LinkedIn error response:', parseError);
        const errorText = await response.text();
        errorMessage = `LinkedIn API error (${response.status}): ${errorText || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };

  const postToTwitter = async (content: string, replyToTweetId?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    // Ensure valid authentication (with automatic refresh if needed)
    const isValid = await ensureValidAuth('twitter');
    if (!isValid) {
      throw new Error('Not authenticated with Twitter');
    }
    
    const authData = auth.twitter;
    
    // Note about hybrid authentication for images
    if (imageFiles.length > 0) {
      showNotification('📷 Uploading images to Twitter using OAuth 1.0a authentication...');
    }
    
    let response;
    if (imageFiles.length > 0) {
      // Use FormData for image upload
      const formData = new FormData();
      formData.append('content', content);
      formData.append('accessToken', authData.accessToken);
      
      // Add multiple images
      imageFiles.forEach((imageFile, index) => {
        formData.append(`image${index}`, imageFile.file);
      });
      formData.append('imageCount', imageFiles.length.toString());
      
      // Add reply field if this is a reply to another tweet
      if (replyToTweetId) {
        formData.append('replyToTweetId', replyToTweetId);
      }
      
      response = await fetch('/api/twitter/post', {
        method: 'POST',
        body: formData
      });
    } else {
      // JSON request for text-only posts
      const requestBody: any = {
        content,
        accessToken: authData.accessToken
      };
      
      // Add reply field if this is a reply to another tweet
      if (replyToTweetId) {
        requestBody.replyToTweetId = replyToTweetId;
      }
      
      response = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    }
    
    if (!response.ok) {
      let errorMessage = `Twitter API error (${response.status})`;
      try {
        const errorData = await response.json();
        console.error('Twitter API error details:', errorData);
        
        // Handle specific Twitter error cases
        if (response.status === 403) {
          if (errorData.detail?.includes('not permitted')) {
            errorMessage = `Twitter API error: You are not permitted to perform this action. This might be due to:\n• Rate limiting (posting too frequently)\n• API permission issues\n• Account restrictions\n\nTry waiting a few minutes before posting again.`;
          } else {
            errorMessage = `Twitter API error (403 Forbidden): ${errorData.detail || errorData.error || 'Permission denied'}`;
          }
        } else if (response.status === 429) {
          errorMessage = `Twitter API error: Rate limit exceeded. Please wait before posting again.`;
        } else if (response.status === 401) {
          errorMessage = `Twitter API error: Authentication failed. Please reconnect your Twitter account.`;
        } else {
          errorMessage = `Twitter API error (${response.status}): ${errorData.detail || errorData.error || errorData.message || response.statusText}`;
        }
      } catch (parseError) {
        console.error('Failed to parse Twitter error response:', parseError);
        const errorText = await response.text();
        errorMessage = `Twitter API error (${response.status}): ${errorText || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };

  // Helper function to create facets for BlueSky mentions
  const createBlueskyFacets = async (text: string, accessToken: string) => {
    const facets = [];
    
    // Convert string to UTF-8 bytes for accurate byte position calculation
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    
    // Find all mentions in the text with proper word boundaries
    // This regex matches both handles (john.bsky.social) and display names (John Doe)
    // For BlueSky handles: ensures they end with alphanumeric chars, not periods
    // For display names: allows spaces but must end with alphanumeric
    // Fixed: Uses word boundary - must be followed by non-word chars, whitespace, punctuation, or end
    const mentionRegex = /@([a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?)*|[A-Za-z][A-Za-z0-9\s]*[A-Za-z0-9])(?=\s|[.!?,:;]|\b|$)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const handle = match[1].trim(); // Extract handle/name without @
      const mentionText = match[0]; // Full @handle text
      
      // Only try to resolve if it looks like a valid BlueSky handle (contains a dot)
      // Skip display names (like "John Doe") since they can't be resolved to DIDs
      if (!handle.includes('.')) {
        console.log(`⏭️ Skipping display name: @${handle} (not a resolvable BlueSky handle)`);
        continue;
      }
      
      // Calculate byte positions correctly
      const beforeMention = text.substring(0, match.index);
      const beforeBytes = encoder.encode(beforeMention);
      const mentionBytes = encoder.encode(mentionText);
      
      const byteStart = beforeBytes.length;
      const byteEnd = byteStart + mentionBytes.length;
      
      try {
        // Resolve handle to DID using BlueSky API
        const response = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const did = data.did;
          
          // Create facet for this mention
          facets.push({
            index: {
              byteStart: byteStart,
              byteEnd: byteEnd
            },
            features: [{
              $type: 'app.bsky.richtext.facet#mention',
              did: did
            }]
          });
          
          console.log(`✅ Resolved @${handle} to DID: ${did}`);
        } else {
          console.warn(`⚠️ Could not resolve handle: @${handle}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error resolving handle @${handle}:`, error);
      }
    }

    // Find all URLs in the text and create link facets
    const urlRegex = /https?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?]/g;
    let urlMatch;
    
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      const url = urlMatch[0];
      
      // Calculate byte positions for the URL
      const beforeUrl = text.substring(0, urlMatch.index);
      const beforeBytes = encoder.encode(beforeUrl);
      const urlBytes = encoder.encode(url);
      
      const byteStart = beforeBytes.length;
      const byteEnd = byteStart + urlBytes.length;
      
      // Create facet for this link
      facets.push({
        index: {
          byteStart: byteStart,
          byteEnd: byteEnd
        },
        features: [{
          $type: 'app.bsky.richtext.facet#link',
          uri: url
        }]
      });
      
      console.log(`🔗 Added clickable link: ${url}`);
    }

    // Find all hashtags in the text and create tag facets
    // Hashtag regex: # followed by alphanumeric/underscore, prevents continuation with word chars, dash, or dot+word
    const hashtagRegex = /#([a-zA-Z0-9_]+)(?![a-zA-Z0-9_-]|\.[\w])/g;
    let hashtagMatch;
    
    while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
      const hashtag = hashtagMatch[1]; // Extract hashtag without #
      const hashtagText = hashtagMatch[0]; // Full #hashtag text
      
      // Calculate byte positions for the hashtag
      const beforeHashtag = text.substring(0, hashtagMatch.index);
      const beforeBytes = encoder.encode(beforeHashtag);
      const hashtagBytes = encoder.encode(hashtagText);
      
      const byteStart = beforeBytes.length;
      const byteEnd = byteStart + hashtagBytes.length;
      
      // Create facet for this hashtag
      facets.push({
        index: {
          byteStart: byteStart,
          byteEnd: byteEnd
        },
        features: [{
          $type: 'app.bsky.richtext.facet#tag',
          tag: hashtag
        }]
      });
      
      console.log(`🏷️ Added clickable hashtag: #${hashtag}`);
    }
    
    return facets;
  };

  const postToBluesky = async (content: string, replyToUri?: string, replyToCid?: string, rootUri?: string, rootCid?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    // Ensure valid authentication (with automatic refresh if needed)
    const isValid = await ensureValidAuth('bluesky');
    if (!isValid) {
      throw new Error('Not authenticated with Bluesky');
    }
    
    const authData = auth.bluesky;
    
    // Create facets for mentions to make them clickable
    const facets = await createBlueskyFacets(content, authData.accessToken);
    
    const record: any = {
      text: content,
      createdAt: new Date().toISOString()
    };
    
    // Add facets if any mentions were found
    if (facets.length > 0) {
      record.facets = facets;
    }

    // Handle multiple image uploads if provided
    if (imageFiles.length > 0) {
      try {
        const uploadedImages = [];
        
        // Upload each image to Bluesky
        for (const imageFile of imageFiles) {
          const uploadResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authData.accessToken}`,
              'Content-Type': imageFile.file.type,
            },
            body: imageFile.file
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedImages.push({
              alt: `Uploaded image: ${imageFile.name}`,
              image: uploadData.blob,
              aspectRatio: {
                width: 1920, // Default aspect ratio, could be improved
                height: 1080
              }
            });
          } else {
            console.warn(`Failed to upload image ${imageFile.name} to Bluesky:`, await uploadResponse.text());
          }
        }
        
        // Add the images to the record if any uploaded successfully
        if (uploadedImages.length > 0) {
          record.embed = {
            $type: 'app.bsky.embed.images',
            images: uploadedImages
          };
        }
      } catch (error) {
        console.warn('Error uploading images to Bluesky:', error);
      }
    }
    
    // Add reply field if this is a reply to another post
    if (replyToUri && replyToCid) {
      record.reply = {
        root: {
          uri: rootUri || replyToUri,   // Use root if available, otherwise parent
          cid: rootCid || replyToCid    // Use root if available, otherwise parent
        },
        parent: {
          uri: replyToUri,              // Always points to immediate parent
          cid: replyToCid               // Always points to immediate parent
        }
      };
    }
    
    const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repo: authData.userInfo.did,
        collection: 'app.bsky.feed.post',
        record: record
      })
    });
    
    if (!response.ok) {
      let errorMessage = `Bluesky API error (${response.status})`;
      try {
        const errorData = await response.json();
        console.error('Bluesky API error details:', errorData);
        
        // Handle specific Bluesky error cases
        if (response.status === 401) {
          errorMessage = `Bluesky API error: Authentication failed. Your session may have expired. Please reconnect your Bluesky account.`;
        } else if (response.status === 403) {
          errorMessage = `Bluesky API error: Permission denied. This might be due to:\n• Account restrictions\n• Invalid app password\n• Server policy violations`;
        } else if (response.status === 429) {
          errorMessage = `Bluesky API error: Rate limit exceeded. Please wait before posting again.`;
        } else if (response.status === 400) {
          const details = errorData.message || errorData.error || 'Invalid request';
          errorMessage = `Bluesky API error: ${details}`;
        } else {
          errorMessage = `Bluesky API error (${response.status}): ${errorData.message || errorData.error || response.statusText}`;
        }
      } catch (parseError) {
        console.error('Failed to parse Bluesky error response:', parseError);
        const errorText = await response.text();
        errorMessage = `Bluesky API error (${response.status}): ${errorText || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };

  const postToMastodon = async (content: string, replyToStatusId?: string, imageFiles: { file: File; dataUrl: string; name: string; }[] = []) => {
    // Ensure valid authentication (with automatic refresh if needed)
    const isValid = await ensureValidAuth('mastodon');
    if (!isValid) {
      throw new Error('Not authenticated with Mastodon');
    }
    
    const authData = auth.mastodon;
    
    let response;
    if (imageFiles.length > 0) {
      // Use FormData for image upload
      const formData = new FormData();
      formData.append('content', content);
      formData.append('accessToken', authData.accessToken);
      formData.append('instanceUrl', authData.instanceUrl);
      
      // Add multiple images
      imageFiles.forEach((imageFile, index) => {
        formData.append(`image${index}`, imageFile.file);
      });
      formData.append('imageCount', imageFiles.length.toString());
      
      // Add reply field if this is a reply to another status
      if (replyToStatusId) {
        formData.append('replyToStatusId', replyToStatusId);
      }
      
      response = await fetch('/api/mastodon/post', {
        method: 'POST',
        body: formData
      });
    } else {
      // JSON request for text-only posts
      const requestBody: any = {
        content,
        accessToken: authData.accessToken,
        instanceUrl: authData.instanceUrl
      };
      
      // Add reply field if this is a reply to another status
      if (replyToStatusId) {
        requestBody.replyToStatusId = replyToStatusId;
      }
      
      response = await fetch('/api/mastodon/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    }
    
    if (!response.ok) {
      let errorMessage = `Mastodon API error (${response.status})`;
      try {
        const errorData = await response.json();
        console.error('Mastodon API error details:', errorData);
        
        // Handle specific Mastodon error cases
        if (response.status === 401) {
          errorMessage = `Mastodon API error: Authentication failed. Your session may have expired. Please reconnect your Mastodon account.`;
        } else if (response.status === 403) {
          errorMessage = `Mastodon API error: Permission denied. This might be due to:\n• Account restrictions\n• Invalid access token\n• Server policy violations`;
        } else if (response.status === 429) {
          errorMessage = `Mastodon API error: Rate limit exceeded. Please wait before posting again.`;
        } else if (response.status === 400) {
          errorMessage = `Mastodon API error: Invalid request. Please check your content.`;
        } else {
          errorMessage = `Mastodon API error (${response.status}): ${errorData.details || errorData.error || response.statusText}`;
        }
      } catch (parseError) {
        console.error('Failed to parse Mastodon error response:', parseError);
        const errorText = await response.text();
        errorMessage = `Mastodon API error (${response.status}): ${errorText || response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  };

  // Published and deleted posts management functions
  const addPublishedPost = (post: {
    id: string;
    title: string;
    content: string;
    scheduleTime: string;
    timezone: string;
    createdAt: string;
    images?: any[];
    platformImageSelections?: { [key: string]: number[] };
  }, platformResults: PlatformPostResult[]) => {
    const publishedPost: PublishedPost = {
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
    
    setPublishedPosts(prev => [publishedPost, ...prev]);
  };

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

  const permanentlyDeletePost = (deletedPostId: string) => {
    if (confirm('Are you sure you want to permanently delete this post? This action cannot be undone.')) {
      setDeletedPosts(prev => prev.filter(p => p.id !== deletedPostId));
    }
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
      const chunks = chunkText(formattedText, selectedPlatform);
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
          const delay = selectedPlatform === 'twitter' ? 5000 : 2000; // 5 seconds for Twitter, 2 for others
          setPostingStatus(`Waiting ${delay/1000} seconds before posting next part...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      setPostingStatus('');
      
      // Add to published posts
      const currentPost = posts.find(p => p.id === currentPostId);
      if (currentPost) {
        // Extract post information for tracking
        let postId = '';
        let postUrl = '';
        
        if (selectedPlatform === 'twitter' && results[0]?.data?.data?.id) {
          postId = results[0].data.data.id;
          postUrl = `https://twitter.com/i/status/${postId}`;
        } else if (selectedPlatform === 'linkedin' && results[0]?.data?.id) {
          postId = results[0].data.id;
          // LinkedIn post URLs are more complex, so we'll just track the ID
        } else if (selectedPlatform === 'bluesky' && results[0]?.uri) {
          postId = results[0].uri;
          // Extract rkey from URI and construct Bluesky URL
          const uriParts = results[0].uri.split('/');
          const rkey = uriParts[uriParts.length - 1];
          const blueskyHandle = auth.bluesky.handle;
          if (blueskyHandle && rkey) {
            postUrl = `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`;
          }
        } else if (selectedPlatform === 'mastodon' && results[0]?.data?.id) {
          postId = results[0].data.id;
          postUrl = results[0].data.url || '';
        }

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
        setHasExplicitSelection({});
          }
        }
      }
      
      alert(`✅ Successfully posted to ${selectedPlatform}! Post moved to Published section.`);
      
      // Clear the text and images after successful posting (only if no current post)
      if (!currentPost) {
        setText('');
        setAttachedImages([]);
        setPlatformImageSelections({});
        setHasExplicitSelection({});
      }
      
    } catch (error) {
      console.error('Posting error:', error);
      
      // Handle authentication errors by automatically logging out
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.includes('Authentication failed') || 
                         errorMessage.includes('401') || 
                         errorMessage.includes('Unauthorized') ||
                         errorMessage.includes('session may have expired') ||
                         errorMessage.includes('reconnect your') ||
                         errorMessage.includes('Invalid access token');
      
      if (isAuthError) {
        logout(selectedPlatform);
        showNotification(`❌ ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} authentication expired. You have been logged out. Please login again to continue posting.`);
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
    
    const platformNames = {
      linkedin: 'LinkedIn',
      twitter: 'X/Twitter',
      mastodon: 'Mastodon',
      bluesky: 'Bluesky'
    };
    
    const confirmMessage = `📤 Post to all connected platforms (${connectedPlatforms.map(p => platformNames[p]).join(', ')})?\n\nThis will post your content to ${connectedPlatforms.length} platform${connectedPlatforms.length > 1 ? 's' : ''}.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsPosting(true);
      const results: Array<{ platform: string; success: boolean; error?: string; postId?: string; postUrl?: string }> = [];
      
      for (const platform of connectedPlatforms) {
        try {
          setPostingStatus(`Posting to ${platformNames[platform]}...`);
          
          // Format text first, then chunk to ensure accurate character counts
          const formattedText = formatForPlatform(text, platform);
          const chunks = chunkText(formattedText, platform);
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
            setPostingStatus(`Posting part ${i + 1} of ${formattedChunks.length} to ${platformNames[platform]}...`);
            
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
              const delay = platform === 'twitter' ? 5000 : 2000; // 5 seconds for Twitter, 2 for others
              setPostingStatus(`Waiting ${delay/1000} seconds before posting next part to ${platformNames[platform]}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          // Extract post information for tracking
          let postId = '';
          let postUrl = '';
          
          if (platform === 'twitter' && firstResult?.data?.data?.id) {
            postId = firstResult.data.data.id;
            postUrl = `https://twitter.com/i/status/${postId}`;
          } else if (platform === 'linkedin' && firstResult?.data?.id) {
            postId = firstResult.data.id;
            // LinkedIn post URLs are more complex, so we'll just track the ID
          } else if (platform === 'bluesky' && firstResult?.uri) {
            postId = firstResult.uri;
            // Extract rkey from URI and construct Bluesky URL
            const uriParts = firstResult.uri.split('/');
            const rkey = uriParts[uriParts.length - 1];
            const blueskyHandle = auth.bluesky.handle;
            if (blueskyHandle && rkey) {
              postUrl = `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`;
            }
          } else if (platform === 'mastodon' && firstResult?.data?.id) {
            postId = firstResult.data.id;
            postUrl = firstResult.data.url || '';
          }
          
          results.push({ 
            platform: platformNames[platform], 
            success: true, 
            postId, 
            postUrl 
          });
          
          // Add delay between platforms (longer if Twitter was just used)
          if (connectedPlatforms.indexOf(platform) < connectedPlatforms.length - 1) {
            const delay = platform === 'twitter' ? 3000 : 1000; // 3 seconds after Twitter, 1 second after others
            setPostingStatus(`Waiting ${delay/1000} seconds before posting to next platform...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);
          
          // Handle authentication errors by automatically logging out
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isAuthError = errorMessage.includes('Authentication failed') || 
                             errorMessage.includes('401') || 
                             errorMessage.includes('Unauthorized') ||
                             errorMessage.includes('session may have expired') ||
                             errorMessage.includes('reconnect your') ||
                             errorMessage.includes('Invalid access token');
          
          if (isAuthError) {
            logout(platform);
          }
          
          results.push({ 
            platform: platformNames[platform], 
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
            platform: connectedPlatforms.find(p => platformNames[p] === r.platform)!,
            success: true,
            postId: r.postId || '',
            postUrl: r.postUrl || '',
            publishedAt: new Date().toISOString(),
            })),
            ...failed.map(r => ({
              platform: connectedPlatforms.find(p => platformNames[p] === r.platform)!,
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
        setHasExplicitSelection({});
        
        // Show appropriate success message
        if (successful.length === results.length) {
          alert(`✅ Successfully posted to all platforms!\n\n📤 Posted to: ${successful.map(r => r.platform).join(', ')}`);
        } else {
        const successMsg = `✅ Successful: ${successful.map(r => r.platform).join(', ')}`;
        const failMsg = `❌ Failed: ${failed.map(r => `${r.platform} (${r.error})`).join(', ')}`;
        alert(`⚠️ Partial success:\n\n${successMsg}\n\n${failMsg}`);
        }
      } else {
        const failMsg = failed.map(r => `${r.platform}: ${r.error}`).join('\n');
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

  const emojiCategories = {
    "Smileys & People": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
    "Animals & Nature": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️"],
    "Food & Drink": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯"],
    "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "��", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄", "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹‍♀️", "🤹", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"],
    "Travel & Places": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚀", "🛰️", "🚉", "🚊", "🚝", "🚞", "🚋", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "🚁", "🚟", "🚠", "🚡", "🛺", "🚖", "🚘", "🚍", "🚔", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🛣️", "🗾", "🎑", "🏞️", "🌅", "🌄", "🌠", "🎇", "🎆", "🌇", "🌆", "🏙️", "🌃", "🌌", "🌉", "🌁"],
    "Objects": ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧴", "🧷", "🧸", "🧵", "🧶", "🪡", "🪢", "🧮", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🔑", "🗝️", "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🪃", "🔧", "🔩", "⚙️", "🗜️", "⚖️", "🦯", "🔗", "⛓️", "🪝", "🧰", "🧲", "🪜"],
    "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"]
  };

  // Helper to get platform-aware text length (graphemes for Bluesky, UTF-16 for others)
  const getPlatformTextLength = (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): number => {
    if (platform === 'bluesky') {
      // Use grapheme-splitter for Bluesky (matches what Bluesky sees)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const GraphemeSplitter = require('grapheme-splitter');
        const splitter = new GraphemeSplitter();
        return splitter.countGraphemes(text);
      } catch {
        return Array.from(text).length;
      }
    }
    // For other platforms, use UTF-16 length
    return text.length;
  };

  const chunkText = (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): string[] => {
    const limit = PLATFORM_LIMITS[platform];

    if (getPlatformTextLength(text, platform) <= limit) {
      return [text];
    }

    const chunks: string[] = [];
    let remainingText = text;

    while (getPlatformTextLength(remainingText, platform) > 0) {
      if (getPlatformTextLength(remainingText, platform) <= limit) {
        chunks.push(remainingText);
        break;
      }

      // Find the best break point within the limit
      const breakPoint = findBestBreakPoint(remainingText, limit);

      // Extract chunk and clean up
      let chunk = remainingText.substring(0, breakPoint).replace(/\s+$/, ''); // Remove trailing whitespace

      // Ensure chunk doesn't exceed limit after cleanup
      if (getPlatformTextLength(chunk, platform) > limit) {
        // If still too long, force break at a safe point
        chunk = remainingText.substring(0, limit).replace(/\s+$/, '');
        // Find last space before limit to avoid breaking words if possible
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > limit * 0.8) {
          chunk = chunk.substring(0, lastSpace);
        }
      }

      chunks.push(chunk);

      // Remove processed text and clean up leading whitespace
      remainingText = remainingText.substring(chunk.length).replace(/^\s+/, '');
    }

    // Final safety check: ensure no chunk exceeds limit
    return chunks.map(chunk => {
      const chunkLength = getPlatformTextLength(chunk, platform);
      if (chunkLength > limit) {
        console.warn(`Chunk exceeds ${platform} limit (${chunkLength}/${limit}):`, chunk.substring(0, 50) + '...');
        // For Bluesky, we need to truncate by graphemes, not by string index
        // For now, just truncate by string index and let it be slightly over
        return chunk.substring(0, limit - 3) + '...';
      }
      return chunk;
    }).filter(chunk => getPlatformTextLength(chunk, platform) > 0);
  };

  // Helper function to find the best break point within the character limit
  const findBestBreakPoint = (text: string, limit: number): number => {
    // Look for sentence endings first (priority)
    const sentenceMarkers = ['. ', '? ', '! '];
    for (const marker of sentenceMarkers) {
      const pos = text.lastIndexOf(marker, limit - marker.length);
      if (pos > limit * 0.6) { // Only use if reasonably close to limit
        return pos + marker.length;
      }
    }
    
    // Look for paragraph breaks
    const paragraphBreak = text.lastIndexOf('\n\n', limit - 2);
    if (paragraphBreak > limit * 0.4) {
      return paragraphBreak + 2;
    }
    
    // Look for line breaks
    const lineBreak = text.lastIndexOf('\n', limit - 1);
    if (lineBreak > limit * 0.6) {
      return lineBreak + 1;
    }
    
    // Look for word boundaries (spaces)
    const spaceBreak = text.lastIndexOf(' ', limit - 1);
    if (spaceBreak > limit * 0.7) {
      return spaceBreak + 1;
    }
    
    // If no good break point found, use the limit (will be handled by caller)
    return limit;
  };

  const formatForPlatform = (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): string => {
    // First process unified tags, then apply Unicode styling
    const processedText = processUnifiedTags(text, platform);
    return toUnicodeStyle(processedText);
  };

  const toUnicodeStyle = (text: string): string => {
    let result = text;
    
    // Handle bold text first
    result = result.replace(/\*\*(.*?)\*\*/g, (_, m) => toBold(m));
    
    // Handle italic text - avoid formatting underscores in @ mentions
    // First, temporarily replace @ mentions to protect them (including those with underscores)
    const mentionPlaceholders: string[] = [];
    result = result.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
      const placeholder = `MENTIONPLACEHOLDER${mentionPlaceholders.length}PLACEHOLDER`;
      mentionPlaceholders.push(match);
      return placeholder;
    });
    
    // Now convert _text_ to italic without worrying about @ mentions
    result = result.replace(/(?<!\\)_([^_\s][^_]*[^_\s]|[^_\s])_/g, (match, text) => {
      return toItalic(text);
    });
    
    // Restore the @ mentions
    mentionPlaceholders.forEach((mention, index) => {
      result = result.replace(`MENTIONPLACEHOLDER${index}PLACEHOLDER`, mention);
    });
    
    return result;
  };

  const toBold = (input: string) => {
    const boldMap = {
      a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
      k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
      u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
      A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
      K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
      U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
      0: "𝟬", 1: "𝟭", 2: "𝟮", 3: "𝟯", 4: "𝟰", 5: "𝟱", 6: "𝟲", 7: "𝟳", 8: "𝟴", 9: "𝟵",
      // Greek letters (commonly used symbols)
      α: "𝛂", β: "𝛃", γ: "𝛄", δ: "𝛅", ε: "𝛆", ζ: "𝛇", η: "𝛈", θ: "𝛉", ι: "𝛊", κ: "𝛋",
      λ: "𝛌", μ: "𝛍", ν: "𝛎", ξ: "𝛏", ο: "𝛐", π: "𝛑", ρ: "𝛒", σ: "𝛔", τ: "𝛕", υ: "𝛖",
      φ: "𝛗", χ: "𝛘", ψ: "𝛙", ω: "𝛚",
      Α: "𝚨", Β: "𝚩", Γ: "𝚪", Δ: "𝚫", Ε: "𝚬", Ζ: "𝚭", Η: "𝚮", Θ: "𝚯", Ι: "𝚰", Κ: "𝚱",
      Λ: "𝚲", Μ: "𝚳", Ν: "𝚴", Ξ: "𝚵", Ο: "𝚶", Π: "𝚷", Ρ: "𝚸", Σ: "𝚺", Τ: "𝚻", Υ: "𝚼",
      Φ: "𝚽", Χ: "𝚾", Ψ: "𝚿", Ω: "𝛀"
    };
    return input.split("").map(c => boldMap[c] || c).join("");
  };

  const toItalic = (input: string) => {
    const italicMap = {
      a: "𝘢", b: "𝘣", c: "𝘤", d: "𝘥", e: "𝘦", f: "𝘧", g: "𝘨", h: "𝘩", i: "𝘪", j: "𝘫",
      k: "𝘬", l: "𝘭", m: "𝘮", n: "𝘯", o: "𝘰", p: "𝘱", q: "𝘲", r: "𝘳", s: "𝘴", t: "𝘵",
      u: "𝘶", v: "𝘷", w: "𝘸", x: "𝘹", y: "𝘺", z: "𝘻",
      A: "𝘈", B: "𝘉", C: "𝘊", D: "𝘋", E: "𝘌", F: "𝘍", G: "𝘎", H: "𝘏", I: "𝘐", J: "𝘑",
      K: "𝘒", L: "𝘓", M: "𝘔", N: "𝘕", O: "𝘖", P: "𝘗", Q: "𝘘", R: "𝘙", S: "𝘚", T: "𝘛",
      U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡",
      0: "𝟢", 1: "𝟣", 2: "𝟤", 3: "𝟥", 4: "𝟦", 5: "𝟧", 6: "𝟨", 7: "𝟩", 8: "𝟪", 9: "𝟫",
      // Greek letters (commonly used symbols)
      α: "𝛼", β: "𝛽", γ: "𝛾", δ: "𝛿", ε: "𝜀", ζ: "𝜁", η: "𝜂", θ: "𝜃", ι: "𝜄", κ: "𝜅",
      λ: "𝜆", μ: "𝜇", ν: "𝜈", ξ: "𝜉", ο: "𝜊", π: "𝜋", ρ: "𝜌", σ: "𝜎", τ: "𝜏", υ: "𝜐",
      φ: "𝜑", χ: "𝜒", ψ: "𝜓", ω: "𝜔",
      Α: "𝛢", Β: "𝛣", Γ: "𝛤", Δ: "𝛥", Ε: "𝛦", Ζ: "𝛧", Η: "𝛨", Θ: "𝛩", Ι: "𝛪", Κ: "𝛫",
      Λ: "𝛬", Μ: "𝛭", Ν: "𝛮", Ξ: "𝛯", Ο: "𝛰", Π: "𝛱", Ρ: "𝛲", Σ: "𝛴", Τ: "𝛵", Υ: "𝛶",
      Φ: "𝛷", Χ: "𝛸", Ψ: "𝛹", Ω: "𝛺"
    };
    return input.split("").map(c => italicMap[c] || c).join("");
  };

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array for better handling
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Get platform limits
    const platformLimit = IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS];
    
    // Check if adding these files would exceed the platform limit
    if (attachedImages.length + fileArray.length > platformLimit.maxImages) {
      showNotification(`❌ ${selectedPlatform} supports max ${platformLimit.maxImages} images. You currently have ${attachedImages.length} image(s).`);
      return;
    }

    const newImages: { file: File; dataUrl: string; name: string; }[] = [];
    let processedCount = 0;

    fileArray.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification(`❌ ${file.name} is not a valid image file`);
        processedCount++;
        return;
      }

      // Validate file size based on platform
      if (file.size > platformLimit.maxFileSize) {
        const maxSizeMB = (platformLimit.maxFileSize / (1024 * 1024)).toFixed(1);
        showNotification(`❌ ${file.name} exceeds ${selectedPlatform} size limit of ${maxSizeMB}MB`);
        processedCount++;
        return;
      }

      // Create data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        newImages.push({
          file,
          dataUrl,
          name: file.name
        });
        
        processedCount++;
        
        // Once all files are processed, update state
        if (processedCount === fileArray.length) {
          setAttachedImages(prev => [...prev, ...newImages]);
          const successCount = newImages.length;
          
          // Auto-save after uploading images
          setTimeout(() => {
            if (currentPostId) {
              saveCurrentPost();
            }
          }, 100);
          if (successCount > 0) {
            showNotification(`✅ ${successCount} image(s) attached successfully`);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
    
    // Auto-save after removing image
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);
    
    // Update all platform selections to remove the deleted image and adjust indices
    const updatedSelections = { ...platformImageSelections };
    Object.keys(updatedSelections).forEach(platform => {
      const selection = updatedSelections[platform];
      const newSelection = selection
        .filter(i => i !== index) // Remove the deleted image
        .map(i => i > index ? i - 1 : i); // Adjust indices
      updatedSelections[platform] = newSelection;
    });
    setPlatformImageSelections(updatedSelections);
    
    showNotification('🗑️ Image removed');
  };

  const removeAllAttachedImages = () => {
    setAttachedImages([]);
    setPlatformImageSelections({});
    setHasExplicitSelection({});
    
    // Auto-save after removing all images
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);
    showNotification('🗑️ All images removed');
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
      const newImages = [...attachedImages];
      const draggedImage = newImages[dragIndex];
      newImages.splice(dragIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      setAttachedImages(newImages);
      
      // Auto-save after reordering images
      setTimeout(() => {
        if (currentPostId) {
          saveCurrentPost();
        }
      }, 100);
      
      // Update all platform selections to reflect the reordering
      const updatedSelections = { ...platformImageSelections };
      Object.keys(updatedSelections).forEach(platform => {
        const selection = updatedSelections[platform];
        const newSelection = selection.map(index => {
          if (index === dragIndex) return dropIndex;
          if (index > dragIndex && index <= dropIndex) return index - 1;
          if (index < dragIndex && index >= dropIndex) return index + 1;
          return index;
        }).sort((a, b) => a - b);
        updatedSelections[platform] = newSelection;
      });
      setPlatformImageSelections(updatedSelections);
      
      showNotification(`📷 Moved image to position ${dropIndex + 1}`);
    }
  };

  // Helper functions for platform-specific image management
  const getSelectedImagesForPlatform = (platform: string) => {
    const selectedIndices = platformImageSelections[platform] || [];
    const maxImages = IMAGE_LIMITS[platform as keyof typeof IMAGE_LIMITS].maxImages;
    
    // If no specific selection exists and no explicit selection was made, use first N images up to platform limit
    if (selectedIndices.length === 0 && !hasExplicitSelection[platform]) {
      const autoSelection = attachedImages.slice(0, Math.min(attachedImages.length, maxImages));
      
      // Auto-set the selection but don't mark as explicit
      if (autoSelection.length > 0) {
        const autoIndices = autoSelection.map((_, index) => index);
        updatePlatformSelection(platform, autoIndices, false);
      }
      
      return autoSelection;
    }
    
    // Return selected images (could be empty if user explicitly selected none)
    return selectedIndices.map(index => attachedImages[index]).filter(Boolean);
  };

  const updatePlatformSelection = (platform: string, selectedIndices: number[], isExplicit: boolean = true) => {
    setPlatformImageSelections(prev => ({
      ...prev,
      [platform]: selectedIndices
    }));
    
    // Mark as explicit selection if user-initiated
    if (isExplicit) {
      setHasExplicitSelection(prev => ({
        ...prev,
        [platform]: true
      }));
    }
    
    // Auto-save after updating platform selection
    setTimeout(() => {
      if (currentPostId) {
        saveCurrentPost();
      }
    }, 100);
  };

  const handleCopyStyled = async () => {
    try {
      // Format text first, then chunk to ensure accurate character counts
      const formattedText = formatForPlatform(text, selectedPlatform);
      const chunks = chunkText(formattedText, selectedPlatform);
      const formattedChunks = chunks;
      
      const finalText = formattedChunks.join('\n\n---\n\n');
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalText);
        const platform = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);
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
          const platform = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);
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
          const chunks = chunkText(formattedText, platform);
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
          let postId = '';
          let postUrl = '';
          
          if (platform === 'twitter' && firstResult?.data?.data?.id) {
            postId = firstResult.data.data.id;
            postUrl = `https://twitter.com/i/status/${postId}`;
          } else if (platform === 'linkedin' && firstResult?.data?.id) {
            postId = firstResult.data.id;
            // LinkedIn post URLs are more complex, so we'll just track the ID
          } else if (platform === 'bluesky' && firstResult?.uri) {
            postId = firstResult.uri;
            // Extract rkey from URI and construct Bluesky URL
            const uriParts = firstResult.uri.split('/');
            const rkey = uriParts[uriParts.length - 1];
            const blueskyHandle = auth.bluesky.handle;
            if (blueskyHandle && rkey) {
              postUrl = `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`;
            }
          } else if (platform === 'mastodon' && firstResult?.data?.id) {
            postId = firstResult.data.id;
            postUrl = firstResult.data.url || '';
          }

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
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isAuthError = errorMessage.includes('Authentication failed') || 
                             errorMessage.includes('401') || 
                             errorMessage.includes('Unauthorized') ||
                             errorMessage.includes('session may have expired') ||
                             errorMessage.includes('reconnect your') ||
                             errorMessage.includes('Invalid access token');
          
          if (isAuthError) {
            console.warn(`🔓 Authentication failed for ${platform}, logging out automatically`);
            logout(platform);
          }
          
          platformResults.push({
            platform,
            success: false,
            error: errorMessage,
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

  // Function to reset execution tracking for a specific post
  const resetPostExecution = (postId: string) => {
    setExecutedPosts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      newSet.delete(`notification-${postId}`);
      return newSet;
    });
    setScheduledPostsStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[postId];
      return newStatus;
    });
    console.log(`🔄 Reset execution tracking for post "${postId}"`);
  };

  // Function to clear all executed posts (useful for debugging)
  const clearAllExecutedPosts = () => {
    setExecutedPosts(new Set());
    setScheduledPostsStatus({});
    console.log(`🧹 Cleared all execution tracking`);
  };

  // Schedule modal functions
  const openScheduleModal = () => {
    // Initialize modal with current post settings or defaults
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15); // Default to 15 minutes from now
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    setModalScheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    setModalTimezone(timezone);
    setModalAutoPostEnabled(autoPostEnabled);
    setModalAutoPostPlatforms([...autoPostPlatforms]);
    setModalNotificationEnabled(false);
    setShowScheduleModal(true);
  };

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
        if (permission === "granted") {
          setNotificationStatus('granted');
        } else {
          setNotificationStatus('denied');
          return;
        }
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
  const addPersonMapping = () => {
    if (!newPersonMapping.name.trim() || !newPersonMapping.displayName.trim()) {
      alert('❌ Please enter both name and display name');
      return;
    }

    const now = new Date().toISOString();
    const personMapping: PersonMapping = {
      id: Date.now().toString(),
      ...newPersonMapping,
      createdAt: now,
      updatedAt: now
    };

    setTaggingState(prev => ({
      ...prev,
      personMappings: [...prev.personMappings, personMapping]
    }));

    // Reset form
    setNewPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      mastodon: '',
      bluesky: ''
    });

    alert('✅ Person mapping added successfully!');
  };

  const updatePersonMapping = (id: string, updates: Partial<PersonMapping>) => {
    setTaggingState(prev => ({
      ...prev,
      personMappings: prev.personMappings.map(person =>
        person.id === id
          ? { ...person, ...updates, updatedAt: new Date().toISOString() }
          : person
      )
    }));
  };

  const deletePersonMapping = (id: string) => {
    const person = taggingState.personMappings.find(p => p.id === id);
    if (person && confirm(`Delete mapping for "${person.displayName}"?`)) {
      setTaggingState(prev => ({
        ...prev,
        personMappings: prev.personMappings.filter(p => p.id !== id)
      }));
    }
  };

  const startEditingPerson = (id: string) => {
    const person = taggingState.personMappings.find(p => p.id === id);
    if (person) {
      setEditingPersonId(id);
      setEditPersonMapping({
        name: person.name,
        displayName: person.displayName,
        twitter: person.twitter || '',
        mastodon: person.mastodon || '',
        bluesky: person.bluesky || ''
      });
    }
  };

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

  const cancelEditingPerson = () => {
    setEditingPersonId(null);
    setEditPersonMapping({
      name: '',
      displayName: '',
      twitter: '',
      mastodon: '',
      bluesky: ''
    });
  };

  const processUnifiedTags = (text: string, platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): string => {
    let processedText = text;

    // Process unified tags like @{Person Name}
    const tagPattern = /@\{([^}]+)\}/g;
    processedText = processedText.replace(tagPattern, (match, personName) => {
      const person = taggingState.personMappings.find(p => 
        p.name.toLowerCase() === personName.toLowerCase() || 
        p.displayName.toLowerCase() === personName.toLowerCase()
      );

      if (person) {
        switch (platform) {
          case 'linkedin':
            // For LinkedIn, always use display name since manual tagging is required
            return `@${person.displayName}`;
          case 'twitter':
            return person.twitter ? `@${person.twitter}` : person.displayName;
          case 'mastodon':
            return person.mastodon ? `@${person.mastodon}` : person.displayName;
          case 'bluesky':
            return person.bluesky ? `@${person.bluesky}` : person.displayName;
          default:
            return `@${person.displayName}`;
        }
      }

      // If no mapping found, handle based on platform
      if (platform === 'bluesky' || platform === 'twitter' || platform === 'mastodon') {
        // For BlueSky, Twitter, and Mastodon, return without @ since unmapped names can't be resolved to handles/DIDs
        return personName;
      }
      // For other platforms (LinkedIn), keep the @ symbol
      return `@${personName}`;
    });

    return processedText;
  };

  const insertUnifiedTag = (personName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save state before making changes
    saveUndoState();

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

  // Debounced text change handler
  const handleTextChange = (newText: string) => {
    setText(newText);
    
    // Clear existing timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    // Set new timeout to save undo state after user stops typing
    undoTimeoutRef.current = window.setTimeout(() => {
      if (!isUndoRedoAction) {
        saveUndoState();
      }
    }, 500); // Save state after 500ms of no typing

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

    // Save state before making changes
    saveUndoState();

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

  // Undo/Redo functions
  const saveUndoState = () => {
    if (isUndoRedoAction) return; // Don't save state during undo/redo operations
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentState = {
      text: text,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    };

    setUndoHistory(prev => [...prev, currentState].slice(-50)); // Keep last 50 states
    setRedoHistory([]); // Clear redo history when new action is performed
  };

  const performUndo = () => {
    if (undoHistory.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUndoRedoAction(true);

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    // Save current state to redo history
    const currentState = {
      text: text,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    };
    setRedoHistory(prev => [...prev, currentState]);

    // Restore previous state
    const previousState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    
    setText(previousState.text);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(previousState.selection.start, previousState.selection.end);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
      setIsUndoRedoAction(false);
    }, 0);
  };

  const performRedo = () => {
    if (redoHistory.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUndoRedoAction(true);

    // Save scroll position to prevent jumping
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    // Save current state to undo history
    const currentState = {
      text: text,
      selection: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    };
    setUndoHistory(prev => [...prev, currentState]);

    // Restore next state
    const nextState = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    
    setText(nextState.text);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextState.selection.start, nextState.selection.end);
      // Restore scroll position to prevent jumping
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
      setIsUndoRedoAction(false);
    }, 0);
  };

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
        {showOAuthSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">⚙️ OAuth Settings</h2>
                  <button
                    onClick={() => setShowOAuthSettings(false)}
                    className={`p-2 rounded-lg hover:bg-gray-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <h3 className="font-semibold mb-3">💼 LinkedIn</h3>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                        <h4 className="font-medium text-sm mb-2">📋 Setup Instructions:</h4>
                        <ol className="text-xs space-y-1">
                          <li>1. Go to <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">LinkedIn Developer Portal</a></li>
                          <li>2. Create a new app or select existing one</li>
                          <li>3. In Auth tab, add redirect URI: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                          <li>4. Enable scope: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>w_member_social</code></li>
                          <li>5. Copy the Client ID and add it to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file as <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>LINKEDIN_CLIENT_ID</code></li>
                          <li>6. Restart the server to load the new configuration</li>
                        </ol>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={oauthConfig.linkedin.clientId}
                          onChange={(e) => updateOAuthConfig('linkedin', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                          placeholder="86abc123def456789"
                          disabled={true}
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {oauthConfig.linkedin.clientId ? '✅ LinkedIn Client ID configured via .env file' : '⚠️ Client ID required - add LINKEDIN_CLIENT_ID to .env file'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <h3 className="font-semibold mb-3">🐦 X/Twitter</h3>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                        <h4 className="font-medium text-sm mb-2">📋 Setup Instructions:</h4>
                        <ol className="text-xs space-y-1">
                          <li>1. Go to <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Twitter Developer Portal</a></li>
                          <li>2. Create a new app or select existing one</li>
                          <li>3. In App Settings, add callback URL: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                          <li>4. Enable scopes: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>tweet.read tweet.write users.read</code></li>
                          <li>5. Copy credentials from "Keys and tokens" tab to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file:</li>
                        </ol>
                        <div className={`mt-2 p-2 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                          <div className="font-medium mb-1">For text tweets (OAuth 2.0):</div>
                          <div className="font-mono">TWITTER_CLIENT_ID=your_client_id</div>
                          <div className="font-mono">TWITTER_CLIENT_SECRET=your_client_secret</div>
                          <div className="font-medium mb-1 mt-2">For image uploads (OAuth 1.0a):</div>
                          <div className="font-mono">TWITTER_API_KEY=your_api_key</div>
                          <div className="font-mono">TWITTER_API_SECRET=your_api_secret</div>
                          <div className="font-mono">TWITTER_ACCESS_TOKEN=your_access_token</div>
                          <div className="font-mono">TWITTER_ACCESS_TOKEN_SECRET=your_token_secret</div>
                        </div>
                        <ol className="text-xs space-y-1 mt-2" start={6}>
                          <li>6. Restart the server to load the new configuration</li>
                        </ol>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={oauthConfig.twitter.clientId}
                          onChange={(e) => updateOAuthConfig('twitter', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                          placeholder="TwItTeRcLiEnTiD123456789"
                          disabled={true}
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {oauthConfig.twitter.clientId ? '✅ Twitter Client ID configured via .env file' : '⚠️ Client ID required - add TWITTER_CLIENT_ID to .env file'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <h3 className="font-semibold mb-3">🐘 Mastodon</h3>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                        <h4 className="font-medium text-sm mb-2">📋 Setup Instructions:</h4>
                        <ol className="text-xs space-y-1">
                          <li>1. Choose your Mastodon instance (e.g., mastodon.social, mastodon.online)</li>
                          <li>2. Create a new application in your instance's Developer settings</li>
                          <li>3. Set redirect URI: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:3000</code></li>
                          <li>4. Enable scopes: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>read write</code></li>
                          <li>5. Copy the Client ID and add it to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file as <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>MASTODON_CLIENT_ID</code></li>
                          <li>6. Set the instance URL below and restart the server</li>
                        </ol>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={oauthConfig.mastodon.clientId}
                          onChange={(e) => updateOAuthConfig('mastodon', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                          placeholder="MastodonClientId123456"
                          disabled={true}
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {oauthConfig.mastodon.clientId ? '✅ Mastodon Client ID configured via .env file' : '⚠️ Client ID required - add MASTODON_CLIENT_ID to .env file'}
                        </p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Instance URL
                        </label>
                        <input
                          type="text"
                          value={oauthConfig.mastodon.instanceUrl}
                          onChange={(e) => updateMastodonConfig(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                          placeholder="https://mastodon.social"
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          🌍 Your Mastodon instance URL (e.g., https://mastodon.social)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}>
                    <h3 className="font-semibold mb-3">🦋 Bluesky</h3>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-md ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                        <h4 className="font-medium text-sm mb-2">📋 Setup Instructions:</h4>
                        <ol className="text-xs space-y-1">
                          <li>1. Log into your Bluesky account</li>
                          <li>2. Go to Settings → Privacy and Security → App Passwords</li>
                          <li>3. Click "Add App Password" and name it (e.g., "Social Media Kit")</li>
                          <li>4. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)</li>
                          <li>5. When logging in, use your handle and the app password</li>
                        </ol>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Server URL
                        </label>
                        <input
                          type="text"
                          value={oauthConfig.bluesky.server}
                          onChange={(e) => updateBlueskyConfig(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                          placeholder="https://bsky.social"
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          💡 Usually https://bsky.social unless using a custom server
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className={`p-3 rounded-md ${darkMode ? "bg-green-900 text-green-100" : "bg-green-50 text-green-800"}`}>
                    <h4 className="font-medium text-sm mb-2">🚀 Next Steps:</h4>
                    <ol className="text-xs space-y-1">
                      <li>1. Configure your Client IDs above</li>
                      <li>2. Close this settings panel</li>
                      <li>3. Select a platform and click "Login"</li>
                      <li>4. Complete the OAuth flow</li>
                      <li>5. Start posting with the "Post to [Platform]" button!</li>
                    </ol>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      💡 Client IDs are configured via .env file
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={clearOAuthLocalStorage}
                        className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                      >
                        🧹 Clear Cache
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Reset all OAuth settings to default?')) {
                            setOauthConfig(DEFAULT_OAUTH_CONFIG);
                          }
                        }}
                        className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                      >
                        🔄 Reset to Default
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPostManager && (
          <div className={`mb-6 p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">📝 Manage Posts</h2>
                <button
                  onClick={toggleAutoSync}
                  className={`text-sm px-3 py-1 rounded-lg ${
                    autoSyncEnabled
                      ? darkMode 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-green-500 hover:bg-green-600 text-white"
                      : darkMode 
                        ? "bg-gray-600 hover:bg-gray-500 text-white" 
                        : "bg-gray-400 hover:bg-gray-500 text-white"
                  }`}
                  title={autoSyncEnabled ? "Auto-sync enabled - posts automatically saved" : "Auto-sync disabled - manual save required"}
                >
                  {autoSyncEnabled ? "🔄 Auto-Sync ON" : "⏸️ Auto-Sync OFF"}
                </button>
              </div>
              
              {/* Action buttons organized in logical groups */}
              <div className="flex flex-wrap gap-3 justify-end">
                {/* File operations */}
                <div className="flex gap-2">
                  <button
                    onClick={loadPostsFromDisk}
                    className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                    title="Load posts from file"
                  >
                    📁 Load
                  </button>
                  <button
                    onClick={savePostsToDisk}
                    className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                    title="Save posts to file"
                  >
                    💾 Save
                  </button>
                </div>
                
                {/* Post management */}
                <div className="flex gap-2">
                  <button
                    onClick={createNewPost}
                    className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                  >
                    ➕ New Post
                  </button>
                  <button
                    onClick={() => setShowPublishedPosts(true)}
                    className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
                    title="View published posts"
                  >
                    ✅ Published ({publishedPosts.length})
                  </button>
                  <button
                    onClick={() => setShowDeletedPosts(true)}
                    className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    title="View deleted posts"
                  >
                    🗑️ Deleted ({getActualDeletedPosts().length})
                  </button>
                </div>
              </div>
            </div>
            
            {posts.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No posts yet. Click "New Post" to create your first post.
              </p>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      currentPostId === post.id 
                        ? (darkMode ? "bg-blue-800 border-blue-600" : "bg-blue-100 border-blue-400")
                        : (darkMode ? "bg-gray-800 border-gray-600 hover:bg-gray-750" : "bg-white border-gray-200 hover:bg-gray-50")
                    }`}
                    onClick={() => switchToPost(post.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={post.title}
                          onChange={(e) => {
                            e.stopPropagation();
                            updatePostTitle(post.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-medium text-sm bg-transparent border-none outline-none w-full hover:bg-opacity-50 hover:bg-gray-300 rounded px-1 -mx-1 transition-colors ${darkMode ? "text-white hover:bg-gray-600" : "text-gray-800 hover:bg-gray-100"}`}
                          placeholder="📝 Click to edit title..."
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {post.content ? `${post.content.substring(0, 60)}${post.content.length > 60 ? '...' : ''}` : 'No content'}
                        </p>
                        {post.scheduleTime && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            📅 {formatTimezoneTime(post.scheduleTime, post.timezone)}
                          </p>
                            {post.autoPost?.enabled && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                scheduledPostsStatus[post.id] === 'pending' 
                                  ? (darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                                  : scheduledPostsStatus[post.id] === 'executing'
                                  ? (darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800')
                                  : scheduledPostsStatus[post.id] === 'completed'
                                  ? (darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800')
                                  : scheduledPostsStatus[post.id] === 'failed'
                                  ? (darkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800')
                                  : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                              }`}>
                                {scheduledPostsStatus[post.id] === 'pending' && '⏳ Scheduled'}
                                {scheduledPostsStatus[post.id] === 'executing' && '🚀 Posting'}
                                {scheduledPostsStatus[post.id] === 'completed' && '✅ Posted'}
                                {scheduledPostsStatus[post.id] === 'failed' && '❌ Failed'}
                                {!scheduledPostsStatus[post.id] && '🤖 Auto-post'}
                              </span>
                            )}
                          </div>
                        )}
                        {post.images && post.images.length > 0 && (
                          <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            📷 {post.images.length} image{post.images.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {currentPostId === post.id && (
                          <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                            ✏️ Active
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${post.title}"?`)) {
                              deletePost(post.id);
                            }
                          }}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            

          </div>
        )}

        {/* Published Posts Modal */}
        {showPublishedPosts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h2 className="text-xl font-semibold">✅ Published Posts ({publishedPosts.length})</h2>
                <button
                  onClick={() => setShowPublishedPosts(false)}
                  className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {publishedPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📭</div>
                    <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      No published posts yet. Posts will appear here after you publish them to social platforms.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publishedPosts.map((post) => (
                      <div key={post.id} className={`p-4 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{post.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-green-600" : "bg-green-100 text-green-800"}`}>
                            Published {new Date(post.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                          {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                        </p>
                        <div className="mb-3">
                          <p className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Published to {post.platformResults.length} platform(s):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {post.platformResults.map((result, index) => (
                              <div key={index} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                result.success 
                                  ? darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
                                  : darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                              }`}>
                                {result.success ? "✅" : "❌"}
                                {result.platform}
                                {result.postUrl && (
                                  <button
                                    onClick={() => window.open(result.postUrl, '_blank')}
                                    className="ml-1 text-blue-500 hover:text-blue-600"
                                    title="View post"
                                  >
                                    🔗
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            {post.images && post.images.length > 0 && (
                              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                📷 {post.images.length} image(s) attached
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedPublishedPost(post)}
                            className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                          >
                            👁️ View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deleted Posts Modal */}
        {showDeletedPosts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h2 className="text-xl font-semibold">🗑️ Deleted Posts ({getActualDeletedPosts().length})</h2>
                <button
                  onClick={() => setShowDeletedPosts(false)}
                  className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {getActualDeletedPosts().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🗑️</div>
                    <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      No deleted posts yet. Posts will appear here when you manually delete them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getActualDeletedPosts().map((post) => (
                      <div key={post.id} className={`p-4 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{post.title}</h3>
                          <div className="flex gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600" : "bg-red-100 text-red-800"}`}>
                              Deleted
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-600" : "bg-gray-200 text-gray-600"}`}>
                              {new Date(post.deletedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                          {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                        </p>
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            {post.images && post.images.length > 0 && (
                              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                📷 {post.images.length} image(s) attached
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedDeletedPost(post)}
                              className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-500 hover:bg-gray-600 text-white"}`}
                            >
                              👁️ View Details
                            </button>
                            <button
                              onClick={() => restoreDeletedPost(post.id)}
                              className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                            >
                              ↩️ Restore
                            </button>
                            <button
                              onClick={() => permanentlyDeletePost(post.id)}
                              className={`text-xs px-3 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                            >
                              🗑️ Delete Forever
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Published Post Details Modal */}
        {selectedPublishedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h2 className="text-xl font-semibold">📄 Published Post Details</h2>
                <button
                  onClick={() => setSelectedPublishedPost(null)}
                  className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Post Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">{selectedPublishedPost.title}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Published At</p>
                        <p className="text-sm">{new Date(selectedPublishedPost.publishedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timezone</p>
                        <p className="text-sm">{selectedPublishedPost.timezone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Content</h4>
                    <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                      <p className="whitespace-pre-wrap text-sm">{selectedPublishedPost.content}</p>
                    </div>
                  </div>

                  {/* Platform Results */}
                  <div>
                    <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Platform Results</h4>
                    <div className="space-y-3">
                      {selectedPublishedPost.platformResults.map((result, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg ${result.success ? "text-green-500" : "text-red-500"}`}>
                                {result.success ? "✅" : "❌"}
                              </span>
                              <span className="font-medium">{result.platform}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              result.success 
                                ? darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
                                : darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                            }`}>
                              {result.success ? "Success" : "Failed"}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Published:</span> {new Date(result.publishedAt).toLocaleString()}</p>
                            {result.postId && (
                              <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Post ID:</span> {result.postId}</p>
                            )}
                            {result.postUrl && (
                              <p>
                                <span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>URL:</span> 
                                <button
                                  onClick={() => window.open(result.postUrl, '_blank')}
                                  className="ml-2 text-blue-500 hover:text-blue-600 underline"
                                >
                                  {result.postUrl} 🔗
                                </button>
                              </p>
                            )}
                            {result.error && (
                              <p><span className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Error:</span> <span className="text-red-500">{result.error}</span></p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  {selectedPublishedPost.images && selectedPublishedPost.images.length > 0 && (
                    <div>
                      <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Attached Images ({selectedPublishedPost.images.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedPublishedPost.images.map((image, index) => (
                          <div key={index} className={`border rounded-lg overflow-hidden ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
                            <img src={image.dataUrl} alt={image.name} className="w-full h-32 object-cover" />
                            <p className={`p-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{image.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform Image Selections */}
                  {selectedPublishedPost.platformImageSelections && Object.keys(selectedPublishedPost.platformImageSelections).length > 0 && (
                    <div>
                      <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Platform-specific Image Selections</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedPublishedPost.platformImageSelections).map(([platform, indices]) => (
                          <div key={platform} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <span className="font-medium capitalize">{platform}:</span> Images {indices.map(i => i + 1).join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deleted Post Details Modal */}
        {selectedDeletedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h2 className="text-xl font-semibold">📄 Deleted Post Details</h2>
                <button
                  onClick={() => setSelectedDeletedPost(null)}
                  className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Post Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">{selectedDeletedPost.title}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Created At</p>
                        <p className="text-sm">{new Date(selectedDeletedPost.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Deleted At</p>
                        <p className="text-sm">{new Date(selectedDeletedPost.deletedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Delete Reason</p>
                        <p className="text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"}`}>
                            User Deleted
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timezone</p>
                        <p className="text-sm">{selectedDeletedPost.timezone}</p>
                      </div>
                    </div>
                    {selectedDeletedPost.scheduleTime && (
                      <div className="mb-4">
                        <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Scheduled Time</p>
                        <p className="text-sm">{new Date(selectedDeletedPost.scheduleTime).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Content</h4>
                    <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
                      <p className="whitespace-pre-wrap text-sm">{selectedDeletedPost.content}</p>
                    </div>
                  </div>

                  {/* Images */}
                  {selectedDeletedPost.images && selectedDeletedPost.images.length > 0 && (
                    <div>
                      <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Attached Images ({selectedDeletedPost.images.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedDeletedPost.images.map((image, index) => (
                          <div key={index} className={`border rounded-lg overflow-hidden ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
                            <img src={image.dataUrl} alt={image.name} className="w-full h-32 object-cover" />
                            <p className={`p-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{image.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform Image Selections */}
                  {selectedDeletedPost.platformImageSelections && Object.keys(selectedDeletedPost.platformImageSelections).length > 0 && (
                    <div>
                      <h4 className={`font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Platform-specific Image Selections</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedDeletedPost.platformImageSelections).map(([platform, indices]) => (
                          <div key={platform} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <span className="font-medium capitalize">{platform}:</span> Images {indices.map(i => i + 1).join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
                    <button
                      onClick={() => {
                        restoreDeletedPost(selectedDeletedPost.id);
                        setSelectedDeletedPost(null);
                      }}
                      className={`px-4 py-2 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                    >
                      ↩️ Restore Post
                    </button>
                    <button
                      onClick={() => {
                        permanentlyDeletePost(selectedDeletedPost.id);
                        setSelectedDeletedPost(null);
                      }}
                      className={`px-4 py-2 rounded-lg ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                    >
                      🗑️ Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
            {showEmojiPicker && (
              <div className={`absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto border rounded-xl shadow-lg z-10 ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Select Emoji</span>
                    <button 
                      onClick={() => setShowEmojiPicker(false)}
                      className={`text-sm ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      ✕
                    </button>
                  </div>
                  {Object.entries(emojiCategories).map(([category, emojis]) => (
                    <div key={category} className="mb-4">
                      <h4 className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => insertEmoji(emoji)}
                            className={`w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
                        <button 
                onClick={() => setShowTagManager(true)} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-xl text-sm"
              >
                🏷️ Tags
              </button>
              {!autoSyncEnabled && (
                <button
                  onClick={() => {
                    if (!text.trim()) {
                      alert('❌ Please write some content before saving');
                      return;
                    }
                    
                    if (!currentPostId) {
                      // Create new post if no current post
                      const currentTime = getCurrentDateTimeString();
                      const newPost = {
                        id: Date.now().toString(),
                        title: `Post ${posts.length + 1}`,
                        content: text,
                        scheduleTime: scheduleTime || currentTime,
                        timezone: timezone,
                        createdAt: new Date().toISOString()
                      };
                      setPosts(prev => [...prev, newPost]);
                      setCurrentPostId(newPost.id);
                      showNotification(`✅ Post saved as "${newPost.title}"`);
                    } else {
                      // Update existing post
                      saveCurrentPost();
                      const currentPost = posts.find(p => p.id === currentPostId);
                      showNotification(`✅ Post "${currentPost?.title || 'Untitled'}" updated`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm"
                >
                  💾 Save Current
                </button>
              )}

            </div>

        <div className="relative mb-4">
          <textarea
            ref={textareaRef}
            className={`w-full min-h-40 p-4 border rounded-xl resize-y focus:outline-none focus:ring-2 ${
              darkMode 
                ? "bg-gray-700 text-white border-gray-600 focus:ring-blue-500 dark-textarea" 
                : "bg-white text-gray-800 border-gray-300 focus:ring-blue-400 light-textarea"
            }`}
            placeholder="Write your post here..."
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
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
          {/* Resize handle indicator */}
          <div className={`absolute bottom-1 right-1 w-3 h-3 pointer-events-none opacity-30 ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}>
            <svg viewBox="0 0 12 12" className="w-full h-full">
              <circle cx="2" cy="10" r="0.5" fill="currentColor"/>
              <circle cx="6" cy="10" r="0.5" fill="currentColor"/>
              <circle cx="10" cy="10" r="0.5" fill="currentColor"/>
              <circle cx="6" cy="6" r="0.5" fill="currentColor"/>
              <circle cx="10" cy="6" r="0.5" fill="currentColor"/>
              <circle cx="10" cy="2" r="0.5" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Tag Autocomplete */}
          {showTagAutocomplete && (
            <TagAutocomplete
              suggestions={taggingState.personMappings}
              onSelect={handleTagAutocompleteSelect}
              onClose={closeTagAutocomplete}
              position={tagAutocompletePosition}
              darkMode={darkMode}
              filter={tagAutocompleteFilter}
            />
          )}
        </div>

        {/* Character and Word Counter */}
        <div className={`mb-4 px-3 py-2 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex justify-between items-center text-sm">
            <div className="flex gap-4">
              <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                📝 Words: <span className="font-medium">{countWords(text)}</span>
              </span>
              <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                🔤 Characters: <span className="font-medium">{getPlatformCharacterCount(text)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                getPlatformCharacterCount(text) > PLATFORM_LIMITS[selectedPlatform]
                  ? darkMode ? "bg-red-600 text-white" : "bg-red-100 text-red-800"
                  : getPlatformCharacterCount(text) > PLATFORM_LIMITS[selectedPlatform] * 0.9
                  ? darkMode ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-800"
                  : darkMode ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
              }`}>
                {selectedPlatform === 'linkedin' && '💼'}
                {selectedPlatform === 'twitter' && '🐦'}
                {selectedPlatform === 'mastodon' && '🐘'}
                {selectedPlatform === 'bluesky' && '🦋'}
                {' '}
                {getPlatformCharacterCount(text)}/{PLATFORM_LIMITS[selectedPlatform]}
                {getPlatformCharacterCount(text) > PLATFORM_LIMITS[selectedPlatform] && (
                  <span className="ml-1">⚠️</span>
                )}
              </span>
              {getPlatformCharacterCount(text) > PLATFORM_LIMITS[selectedPlatform] && (
                <span className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>
                  Will be chunked into {Math.ceil(getPlatformCharacterCount(text) / PLATFORM_LIMITS[selectedPlatform])} parts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              📷 Attach Images (optional)
            </label>
            {attachedImages.length > 0 && (
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"}`}>
                  {getSelectedImagesForPlatform(selectedPlatform).length}/{IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages} selected
                </span>
                <button
                  onClick={removeAllAttachedImages}
                  className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                  🗑️ Remove All
                </button>
              </div>
            )}
          </div>
          
          {/* Upload area - always visible now */}
          <div className="relative mb-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages}
            />
            <label
              htmlFor="image-upload"
              className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-colors ${
                attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages
                  ? darkMode 
                    ? "border-gray-700 bg-gray-800 cursor-not-allowed" 
                    : "border-gray-200 bg-gray-100 cursor-not-allowed"
                  : darkMode 
                    ? "border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600 cursor-pointer" 
                    : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer"
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">📷</div>
                <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {attachedImages.length >= IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages
                    ? `${selectedPlatform} limit reached`
                    : `Click to add images (max ${IMAGE_LIMITS[selectedPlatform as keyof typeof IMAGE_LIMITS].maxImages})`
                  }
                </div>
              </div>
            </label>
          </div>

          {/* Image previews with enhanced modification controls */}
          {attachedImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  💡 Images will be attached to the first post. Click images to preview, ✕ to remove, or drag to reorder.
                </div>
                {attachedImages.length > 1 && (
                  <button
                    onClick={() => {
                      setPendingPlatform(selectedPlatform);
                      setShowImageSelector(true);
                    }}
                    className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                  >
                    🎯 Select Images
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachedImages.map((image, index) => {
                  const selectedImages = getSelectedImagesForPlatform(selectedPlatform);
                  const isSelected = selectedImages.some(selected => selected.name === image.name && selected.file.size === image.file.size);
                  
                  return (
                    <div 
                      key={index} 
                      draggable={attachedImages.length > 1}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`relative group p-3 border rounded-xl transition-all hover:shadow-md ${
                        attachedImages.length > 1 ? 'cursor-move' : ''
                      } ${
                        isSelected 
                          ? darkMode 
                            ? "border-blue-500 bg-blue-900/20 hover:bg-blue-900/30" 
                            : "border-blue-500 bg-blue-50 hover:bg-blue-100"
                          : darkMode 
                            ? "border-gray-600 bg-gray-700 hover:bg-gray-650" 
                            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                      }`}
                      title={attachedImages.length > 1 ? "Drag to reorder images" : ""}
                    >
                    <div className="flex items-start space-x-3">
                      {/* Enhanced image preview with click to expand */}
                      <div className="relative">
                        <img
                          src={image.dataUrl}
                          alt={`Attached image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                          onClick={() => {
                            // Create modal to show full image
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 cursor-pointer';
                            modal.innerHTML = `
                              <img src="${image.dataUrl}" alt="${image.name}" class="max-w-[90%] max-h-[90%] object-contain rounded-lg" />
                            `;
                            modal.addEventListener('click', () => modal.remove());
                            document.body.appendChild(modal);
                          }}
                        />
                        {/* Image order indicator */}
                        <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                          {index + 1}
                        </div>
                        
                        {/* Drag handle indicator for multiple images */}
                        {attachedImages.length > 1 && (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-70 group-hover:opacity-100 ${darkMode ? "bg-gray-600 text-gray-300" : "bg-gray-400 text-gray-700"}`}>
                            ⋮⋮
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {image.name}
                        </div>
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                          {(image.file.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {image.file.type}
                        </div>
                        {index === 0 && (
                          <div className={`text-xs mt-1 font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                            ✅ Will be posted first
                          </div>
                        )}
                        {isSelected && (
                          <div className={`text-xs mt-1 font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}>
                            📌 Selected for {selectedPlatform}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced remove button */}
                    <button
                      onClick={() => removeAttachedImage(index)}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full text-sm flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                      title={`Remove ${image.name}`}
                    >
                      ×
                    </button>
                  </div>
                  );
                })}
              </div>
              
              {/* Reorder hint for multiple images */}
              {attachedImages.length > 1 && (
                <div className={`text-xs ${darkMode ? "text-yellow-400" : "text-yellow-600"} bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg`}>
                  🔄 Drag and drop to reorder images. The first image (#1) appears in your post.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Platform
          </label>
          <div className="flex gap-2 mb-3">
            {[
              { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
              { key: 'twitter', label: 'X/Twitter', icon: '🐦' },
              { key: 'mastodon', label: 'Mastodon', icon: '🐘' },
              { key: 'bluesky', label: 'Bluesky', icon: '🦋' }
            ].map((platform) => (
              <button
                key={platform.key}
                onClick={() => {
                  const newPlatform = platform.key as any;
                  const newLimit = IMAGE_LIMITS[newPlatform].maxImages;
                  
                  // Check if current images exceed new platform limit AND user hasn't made explicit selection
                  if (attachedImages.length > newLimit && !hasExplicitSelection[newPlatform]) {
                    // Open image selector modal only for first-time selection
                    setPendingPlatform(newPlatform);
                    setShowImageSelector(true);
                  } else {
                    // Switch directly if under limit OR user has already made selection
                    setSelectedPlatform(newPlatform);
                  }
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPlatform === platform.key
                    ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                    : (darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                }`}
              >
                {platform.icon} {platform.label}
                {auth[platform.key].isAuthenticated && (
                  <span className="ml-1 text-green-400">✓</span>
                )}
              </button>
            ))}
          </div>
          
          {/* X Premium Toggle - only show for Twitter */}
          {selectedPlatform === 'twitter' && (
            <div className={`mb-3 p-3 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    X Premium Account
                  </span>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Enable for 25,000 character limit instead of 280
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isXPremium}
                  onChange={(e) => setIsXPremium(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </label>
            </div>
          )}
          
          {/* Authentication Status */}
          <div className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {auth[selectedPlatform].isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-green-500">✅ Connected to {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : selectedPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}</span>
                  {selectedPlatform === 'twitter' && (
                    <div className={`text-xs p-2 rounded ${darkMode ? "bg-blue-900/30 text-blue-200" : "bg-blue-50 text-blue-700"}`}>
                      📷 <strong>Image uploads:</strong> Requires OAuth 1.0a credentials in .env file (see Settings for details)
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => logout(selectedPlatform)}
                    className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                  >
                    Logout
                  </button>
                  {getAuthenticatedPlatforms().length > 1 && (
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                      title="Logout from multiple platforms"
                    >
                      🔓
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Not connected to {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : selectedPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}</span>
                <button
                  onClick={() => {
                    setAuthPlatform(selectedPlatform);
                    setShowAuthModal(true);
                  }}
                  className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>

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
                              {isPosting ? '⏳' : '📤'} {isPosting ? 'Posting...' : `Post to ${selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : selectedPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}`}
            </button>
          ) : (
            <button onClick={handleCopyStyled} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl">
              📋 Copy for {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : selectedPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}
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
              {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : selectedPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'} Preview
            </h2>
            {selectedPlatform === 'linkedin' && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${darkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}>
                💡 <strong>LinkedIn Tagging Tip:</strong> After pasting, type @ in LinkedIn and select the person from the dropdown to create a proper tag. The @names in this preview help you remember who to tag.
              </div>
            )}
            {(() => {
              // Format text first, then chunk to ensure accurate character counts
              const formattedText = formatForPlatform(text, selectedPlatform);
              const chunks = chunkText(formattedText, selectedPlatform);
              const formattedChunks = chunks;
              
              return (
                <div className="space-y-4">
                  {chunks.length > 1 && (
                    <div className={`text-sm p-2 rounded-lg ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                      {selectedPlatform === 'linkedin' ? (
                        <>📱 This post will be split into {chunks.length} parts due to character limit ({PLATFORM_LIMITS[selectedPlatform]} chars)</>
                      ) : (
                        <>🧵 This post will create a thread with {chunks.length} parts due to character limit ({PLATFORM_LIMITS[selectedPlatform]} chars)</>
                      )}
                    </div>
                  )}
                  {formattedChunks.map((chunk, index) => (
                    <div key={index} className={`p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"}`}>
                      <div className="flex justify-between items-start mb-2">
                        {chunks.length > 1 && (
                          <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Part {index + 1} of {chunks.length} • {getPlatformTextLength(chunk, selectedPlatform)} characters
                          </div>
                        )}
                        {(selectedPlatform === 'twitter' || selectedPlatform === 'bluesky' || selectedPlatform === 'mastodon') && chunks.length > 1 && (
                          <button
                            onClick={async () => {
                              try {
                                if (navigator.clipboard && window.isSecureContext) {
                                  await navigator.clipboard.writeText(chunk);
                                } else {
                                  const textArea = document.createElement("textarea");
                                  textArea.value = chunk;
                                  textArea.style.position = "fixed";
                                  textArea.style.left = "-999999px";
                                  textArea.style.top = "-999999px";
                                  document.body.appendChild(textArea);
                                  textArea.focus();
                                  textArea.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                }
                                showNotification(`✅ Part ${index + 1} copied to clipboard!`);
                              } catch (err) {
                                console.error('Copy failed:', err);
                                showNotification('❌ Failed to copy. Please select and copy manually.');
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                          >
                            📋 Copy
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{chunk}</div>
                      {/* Show attached images only on first chunk */}
                      {index === 0 && getSelectedImagesForPlatform(selectedPlatform).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              📷 Selected Images ({getSelectedImagesForPlatform(selectedPlatform).length}):
                            </span>
                          </div>
                          <div className={`grid gap-3 ${
                            getSelectedImagesForPlatform(selectedPlatform).length === 1 ? 'grid-cols-1' :
                            getSelectedImagesForPlatform(selectedPlatform).length === 2 ? 'grid-cols-2' :
                            getSelectedImagesForPlatform(selectedPlatform).length === 3 ? 'grid-cols-3' :
                            'grid-cols-2'
                          }`}>
                            {getSelectedImagesForPlatform(selectedPlatform).map((image, imgIndex) => (
                              <div key={imgIndex} className="relative">
                                <img
                                  src={image.dataUrl}
                                  alt={`Attached image ${imgIndex + 1}`}
                                  className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                                />
                                {/* Image number overlay */}
                                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                                  {imgIndex + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Authentication Modal */}
        {showAuthModal && authPlatform && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-md w-full mx-4 p-6 rounded-xl shadow-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Connect to {authPlatform === 'linkedin' ? 'LinkedIn' : authPlatform === 'twitter' ? 'X/Twitter' : authPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}
                </h2>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className={`text-gray-500 hover:text-gray-700 ${darkMode ? "hover:text-gray-300" : ""}`}
                >
                  ✕
                </button>
              </div>
              
              {authPlatform === 'bluesky' ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Handle (e.g., username.bsky.social)
                    </label>
                    <input
                      type="text"
                      value={blueskyCredentials.handle}
                      onChange={(e) => setBlueskyCredentials(prev => ({ ...prev, handle: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      placeholder="your-handle.bsky.social"
                      disabled={isPosting}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      App Password
                    </label>
                    <input
                      type="password"
                      value={blueskyCredentials.appPassword}
                      onChange={(e) => setBlueskyCredentials(prev => ({ ...prev, appPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      disabled={isPosting}
                    />
                  </div>
                  <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <p>You can generate an app password in your Bluesky settings under "App Passwords".</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => authenticateBluesky(blueskyCredentials.handle, blueskyCredentials.appPassword)}
                      disabled={isPosting || !blueskyCredentials.handle || !blueskyCredentials.appPassword}
                      className={`flex-1 px-4 py-2 rounded-lg text-white ${
                        isPosting || !blueskyCredentials.handle || !blueskyCredentials.appPassword
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isPosting ? 'Authenticating...' : 'Connect'}
                    </button>
                    <button
                      onClick={() => setShowAuthModal(false)}
                      disabled={isPosting}
                      className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    You will be redirected to {authPlatform === 'linkedin' ? 'LinkedIn' : authPlatform === 'twitter' ? 'X/Twitter' : authPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'} to authorize this application.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => initiateOAuth(authPlatform as 'linkedin' | 'twitter' | 'mastodon')}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Connect to {authPlatform === 'linkedin' ? 'LinkedIn' : authPlatform === 'twitter' ? 'X/Twitter' : 'Mastodon'}
                    </button>
                    <button
                      onClick={() => setShowAuthModal(false)}
                      className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tag Manager Modal */}
        {showTagManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">🏷️ Unified Tagging Manager</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const dataToSave = {
                          taggingData: taggingState,
                          exportedAt: new Date().toISOString(),
                          appVersion: "0.2.1"
                        };
                        
                        const dataStr = JSON.stringify(dataToSave, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(dataBlob);
                        link.download = `tagging-data-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                      }}
                      className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                      title="Save tagging data to file"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={() => {
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
                              if (!data.taggingData || !data.taggingData.personMappings || !Array.isArray(data.taggingData.personMappings)) {
                                alert('❌ Invalid file format. Please select a valid tagging data backup file.');
                                return;
                              }
                              
                              // Validate each person mapping has required fields
                              const validMappings = data.taggingData.personMappings.filter((mapping: any) => 
                                mapping.id && mapping.name !== undefined && mapping.displayName !== undefined
                              );
                              
                              if (validMappings.length === 0) {
                                alert('❌ No valid person mappings found in the file.');
                                return;
                              }
                              
                              // Load the tagging data
                              setTaggingState({
                                personMappings: validMappings
                              });
                              
                              alert(`✅ Successfully loaded ${validMappings.length} person mappings!`);
                            } catch (error) {
                              console.error('Error parsing file:', error);
                              alert('❌ Error reading file. Please make sure it\'s a valid JSON file.');
                            }
                          };
                          reader.readAsText(file);
                        };
                        
                        fileInput.click();
                      }}
                      className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                      title="Load tagging data from file"
                    >
                      📁 Load
                    </button>
                    <button
                      onClick={() => setShowTagManager(false)}
                      className={`p-2 rounded-lg hover:bg-gray-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Usage Instructions */}
                <div className={`mb-6 p-4 rounded-lg ${darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-50 text-blue-800"}`}>
                  <h3 className="font-semibold mb-2">🎯 How to Use Unified Tagging</h3>
                  <div className="text-sm space-y-1">
                    <p>• In your posts, use <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-blue-200"}`}>@{"{Person Name}"}</code> to tag someone</p>
                    <p>• Example: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-blue-200"}`}>@{"{Yuan Tang}"}</code> will automatically convert to:</p>
                    <p className="ml-4">- LinkedIn: @Yuan Tang (manual tagging required)</p>
                    <p className="ml-4">- X/Twitter: @TerryTangYuan</p>
                    <p className="ml-4">- Bluesky: @terrytangyuan.xyz</p>
                  </div>
                </div>

                {/* Add New Person */}
                <div className={`mb-6 p-4 rounded-lg border ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
                  <h3 className="font-semibold mb-3">➕ Add New Person</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name (for tagging)</label>
                      <input
                        type="text"
                        value={newPersonMapping.name}
                        onChange={(e) => setNewPersonMapping(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Yuan Tang"
                        className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Display Name</label>
                      <input
                        type="text"
                        value={newPersonMapping.displayName}
                        onChange={(e) => setNewPersonMapping(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Yuan Tang"
                        className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Used for LinkedIn tagging (manual @ selection required after pasting)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">X/Twitter (optional)</label>
                      <input
                        type="text"
                        value={newPersonMapping.twitter}
                        onChange={(e) => setNewPersonMapping(prev => ({ ...prev, twitter: e.target.value }))}
                        placeholder="TerryTangYuan"
                        className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mastodon (optional)</label>
                      <input
                        type="text"
                        value={newPersonMapping.mastodon}
                        onChange={(e) => setNewPersonMapping(prev => ({ ...prev, mastodon: e.target.value }))}
                        placeholder="username@mastodon.social"
                        className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bluesky (optional)</label>
                      <input
                        type="text"
                        value={newPersonMapping.bluesky}
                        onChange={(e) => setNewPersonMapping(prev => ({ ...prev, bluesky: e.target.value }))}
                        placeholder="terrytangyuan.xyz"
                        className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                      />
                    </div>
                  </div>
                  <button
                    onClick={addPersonMapping}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ➕ Add Person
                  </button>
                </div>

                {/* Existing People */}
                <div>
                  <h3 className="font-semibold mb-3">👥 Existing People ({taggingState.personMappings.length})</h3>
                  {taggingState.personMappings.length === 0 ? (
                    <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      No people added yet. Add your first person above!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {taggingState.personMappings.map((person) => (
                        <div key={person.id} className={`p-4 rounded-lg border ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
                          {editingPersonId === person.id ? (
                            // Edit form
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium">✏️ Edit Person</h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEditedPerson}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    ✅ Save
                                  </button>
                                  <button
                                    onClick={cancelEditingPerson}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    ❌ Cancel
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Name (for tagging)</label>
                                  <input
                                    type="text"
                                    value={editPersonMapping.name}
                                    onChange={(e) => setEditPersonMapping(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Yuan Tang"
                                    className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Display Name</label>
                                  <input
                                    type="text"
                                    value={editPersonMapping.displayName}
                                    onChange={(e) => setEditPersonMapping(prev => ({ ...prev, displayName: e.target.value }))}
                                    placeholder="Yuan Tang"
                                    className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                  />
                                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    Used for LinkedIn tagging (manual @ selection required after pasting)
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">X/Twitter (optional)</label>
                                  <input
                                    type="text"
                                    value={editPersonMapping.twitter}
                                    onChange={(e) => setEditPersonMapping(prev => ({ ...prev, twitter: e.target.value }))}
                                    placeholder="TerryTangYuan"
                                    className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Mastodon (optional)</label>
                                  <input
                                    type="text"
                                    value={editPersonMapping.mastodon}
                                    onChange={(e) => setEditPersonMapping(prev => ({ ...prev, mastodon: e.target.value }))}
                                    placeholder="username@mastodon.social"
                                    className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Bluesky (optional)</label>
                                  <input
                                    type="text"
                                    value={editPersonMapping.bluesky}
                                    onChange={(e) => setEditPersonMapping(prev => ({ ...prev, bluesky: e.target.value }))}
                                    placeholder="terrytangyuan.xyz"
                                    className={`w-full p-2 border rounded-lg ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Display mode
                            <>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-medium">{person.displayName}</h4>
                                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    Tag with: <code className={`px-1 rounded ${darkMode ? "bg-gray-600" : "bg-gray-200"}`}>@{"{" + person.name + "}"}</code>
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      insertUnifiedTag(person.name);
                                      setShowTagManager(false);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    📝 Insert
                                  </button>
                                  <button
                                    onClick={() => startEditingPerson(person.id)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => deletePersonMapping(person.id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="font-medium">💼 LinkedIn:</span>
                                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    @{person.displayName}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium">🐦 X/Twitter:</span>
                                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {person.twitter ? `@${person.twitter}` : 'Not set'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium">🐘 Mastodon:</span>
                                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {person.mastodon ? `@${person.mastodon}` : 'Not set'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium">🦋 Bluesky:</span>
                                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {person.bluesky ? `@${person.bluesky}` : 'Not set'}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
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
      {notification.visible && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className={`px-4 py-2 rounded-lg shadow-lg border ${
            notification.message.includes('❌') 
              ? darkMode 
                ? 'bg-red-800 text-red-200 border-red-600' 
                : 'bg-red-100 text-red-800 border-red-300'
              : darkMode 
                ? 'bg-green-800 text-green-200 border-green-600' 
                : 'bg-green-100 text-green-800 border-green-300'
          }`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Image Selection Modal */}
      {showImageSelector && pendingPlatform && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  Select Images for {pendingPlatform === 'linkedin' ? 'LinkedIn' : pendingPlatform === 'twitter' ? 'Twitter/X' : pendingPlatform === 'mastodon' ? 'Mastodon' : 'Bluesky'}
                </h2>
                <button
                  onClick={() => {
                    setShowImageSelector(false);
                    setPendingPlatform(null);
                  }}
                  className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mb-3`}>
                  Select up to {IMAGE_LIMITS[pendingPlatform as keyof typeof IMAGE_LIMITS].maxImages} images to post to {pendingPlatform}:
                </div>
                
                {(() => {
                  const currentSelection = platformImageSelections[pendingPlatform] || [];
                  const maxImages = IMAGE_LIMITS[pendingPlatform as keyof typeof IMAGE_LIMITS].maxImages;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {attachedImages.map((image, index) => {
                        const isSelected = currentSelection.includes(index);
                        
                        return (
                          <div
                            key={index}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected
                                ? "border-blue-500 shadow-lg scale-[0.98]"
                                : darkMode 
                                  ? "border-gray-600 hover:border-gray-500" 
                                  : "border-gray-300 hover:border-gray-400"
                            }`}
                            onClick={() => {
                              const newSelection = isSelected
                                ? currentSelection.filter(i => i !== index)
                                : currentSelection.length < maxImages
                                  ? [...currentSelection, index].sort((a, b) => a - b)
                                  : currentSelection;
                              
                              updatePlatformSelection(pendingPlatform, newSelection);
                            }}
                          >
                            <img
                              src={image.dataUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            
                            {/* Selection indicator */}
                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? "bg-blue-500 text-white"
                                : "bg-black bg-opacity-50 text-white"
                            }`}>
                              {isSelected ? '✓' : index + 1}
                            </div>
                            
                            {/* Selection overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                                  Selected
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                
                <div className="mt-4 text-center">
                  <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-3`}>
                    {(() => {
                      const selected = (platformImageSelections[pendingPlatform] || []).length;
                      const max = IMAGE_LIMITS[pendingPlatform as keyof typeof IMAGE_LIMITS].maxImages;
                      return `${selected}/${max} images selected`;
                    })()}
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setShowImageSelector(false);
                        setPendingPlatform(null);
                      }}
                      className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-300 hover:bg-gray-400 text-black"}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlatform(pendingPlatform as 'linkedin' | 'twitter' | 'mastodon' | 'bluesky');
                        setShowImageSelector(false);
                        setPendingPlatform(null);
                        const selectedCount = (platformImageSelections[pendingPlatform] || []).length;
                        showNotification(`✅ Switched to ${pendingPlatform} with ${selectedCount} selected images`);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Switch Platform
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Platform Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Logout from Platforms</h2>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    setSelectedLogoutPlatforms([]);
                  }}
                  className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mb-3`}>
                  Select platforms to logout from:
                </div>
                
                {getAuthenticatedPlatforms().length > 1 && (
                  <div className="mb-3">
                    <button
                      onClick={() => {
                        const allPlatforms = getAuthenticatedPlatforms();
                        if (selectedLogoutPlatforms.length === allPlatforms.length) {
                          // Deselect all if all are selected
                          setSelectedLogoutPlatforms([]);
                        } else {
                          // Select all if not all are selected
                          setSelectedLogoutPlatforms(allPlatforms);
                        }
                      }}
                      className={`text-sm px-3 py-1 rounded-md border transition-colors ${
                        selectedLogoutPlatforms.length === getAuthenticatedPlatforms().length
                          ? darkMode
                            ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                            : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {selectedLogoutPlatforms.length === getAuthenticatedPlatforms().length ? '❌ Deselect All' : '✅ Select All'}
                    </button>
                  </div>
                )}
                
                <div className="space-y-2">
                  {getAuthenticatedPlatforms().map(platform => {
                    const platformName = platform === 'linkedin' ? 'LinkedIn' : 
                                        platform === 'twitter' ? 'X/Twitter' : 
                                        platform === 'mastodon' ? 'Mastodon' : 'Bluesky';
                    const isSelected = selectedLogoutPlatforms.includes(platform);
                    
                    return (
                      <div
                        key={platform}
                        onClick={() => toggleLogoutPlatform(platform)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          isSelected
                            ? darkMode 
                              ? 'border-red-500 bg-red-900/20' 
                              : 'border-red-500 bg-red-50'
                            : darkMode 
                              ? 'border-gray-600 bg-gray-700 hover:border-gray-500' 
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-red-500 bg-red-500'
                                : darkMode 
                                  ? 'border-gray-500' 
                                  : 'border-gray-300'
                            }`}>
                              {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="font-medium">{platformName}</span>
                          </div>
                          <span className="text-green-500">✅ Connected</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {getAuthenticatedPlatforms().length === 0 && (
                  <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No authenticated platforms found.
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    setSelectedLogoutPlatforms([]);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMultiPlatformLogout}
                  disabled={selectedLogoutPlatforms.length === 0}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    selectedLogoutPlatforms.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Logout ({selectedLogoutPlatforms.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">📅 Schedule Post</h3>
                <button
                  onClick={cancelScheduleModal}
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
                      onChange={(e) => setModalScheduleTime(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                    />
                    <select
                      value={modalTimezone}
                      onChange={(e) => setModalTimezone(e.target.value)}
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
                      onChange={(e) => {
                        setModalAutoPostEnabled(e.target.checked);
                        if (!e.target.checked) {
                          setModalAutoPostPlatforms([]);
                        }
                      }}
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
                          onClick={() => {
                            const authenticatedPlatforms = (['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).filter(
                              platform => auth[platform].isAuthenticated
                            );
                            setModalAutoPostPlatforms(authenticatedPlatforms);
                          }}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-green-700 hover:bg-green-600 text-green-200' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setModalAutoPostPlatforms([])}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-red-700 hover:bg-red-600 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                        >
                          None
                        </button>
                      </div>
                      
                                              <div className="grid grid-cols-2 gap-2">
                          {(['linkedin', 'twitter', 'mastodon', 'bluesky'] as const).map((platform) => {
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
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setModalAutoPostPlatforms(prev => [...prev, platform]);
                                    } else {
                                      setModalAutoPostPlatforms(prev => prev.filter(p => p !== platform));
                                    }
                                  }}
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
                        {modalAutoPostEnabled && modalAutoPostPlatforms.some(platform => !auth[platform].isAuthenticated) && (
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
                      onChange={(e) => setModalNotificationEnabled(e.target.checked)}
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
                  onClick={cancelScheduleModal}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleConfirm}
                  disabled={!modalScheduleTime || (modalAutoPostEnabled && modalAutoPostPlatforms.some(platform => !auth[platform].isAuthenticated))}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    modalScheduleTime && !(modalAutoPostEnabled && modalAutoPostPlatforms.some(platform => !auth[platform].isAuthenticated))
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
      )}
    </div>
  );
}

export default App;
