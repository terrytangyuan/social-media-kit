import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
  bluesky: AuthState & { handle?: string; appPassword?: string };
};

// Add unified tagging types
type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
  createdAt: string;
  updatedAt: string;
};

type TaggingState = {
  personMappings: PersonMapping[];
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
  }>>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [showPostManager, setShowPostManager] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter' | 'bluesky'>('linkedin');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPlatform, setAuthPlatform] = useState<'linkedin' | 'twitter' | 'bluesky' | null>(null);
  const [blueskyCredentials, setBlueskyCredentials] = useState({
    handle: '',
    appPassword: ''
  });
  const [isPosting, setIsPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<string>('');
  
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoTimeoutRef = useRef<number>();

  // X Premium setting
  const [isXPremium, setIsXPremium] = useState(false);

  // Dynamic platform limits based on X Premium setting
  const PLATFORM_LIMITS = {
    linkedin: 3000, // LinkedIn doesn't have strict limit, but 3000 is good practice
    twitter: isXPremium ? 25000 : 280, // X Premium: 25,000 chars, Regular: 280 chars
    bluesky: 300
  };

  // Add unified tagging state
  const [taggingState, setTaggingState] = useState<TaggingState>({
    personMappings: []
  });
  const [showTagManager, setShowTagManager] = useState(false);
  const [newPersonMapping, setNewPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    bluesky: ''
  });
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonMapping, setEditPersonMapping] = useState<Omit<PersonMapping, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    displayName: '',
    twitter: '',
    bluesky: ''
  });

  // Undo/Redo state
  const [undoHistory, setUndoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ text: string; selection: { start: number; end: number } }>>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("socialMediaDraft");
    const dark = localStorage.getItem("darkMode");
    const schedule = localStorage.getItem("scheduleTime");
    const savedTimezone = localStorage.getItem("timezone");
    const savedPosts = localStorage.getItem("socialMediaPosts");
    const savedAuth = localStorage.getItem("platformAuth");
    const savedOAuthConfig = localStorage.getItem("oauthConfig");
    const savedTagging = localStorage.getItem("unifiedTagging");
    const savedXPremium = localStorage.getItem("xPremium");
    
    if (savedXPremium) {
      setIsXPremium(JSON.parse(savedXPremium));
    }
    
    if (savedPosts) {
      const parsedPosts = JSON.parse(savedPosts);
      setPosts(parsedPosts);
      // If no current post and we have saved posts, use the first one
      if (parsedPosts.length > 0 && !saved) {
        const firstPost = parsedPosts[0];
        setCurrentPostId(firstPost.id);
        setText(firstPost.content);
        setScheduleTime(firstPost.scheduleTime);
        setTimezone(firstPost.timezone);
      }
    }
    
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuth(parsedAuth);
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
              
              // Merge configs - server provides LinkedIn/Twitter settings, localStorage provides Bluesky
              const mergedConfig = {
                linkedin: {
                  ...serverConfig.linkedin
                  // Client ID always comes from server
                },
                twitter: {
                  ...serverConfig.twitter
                  // Client ID always comes from server
                },
                bluesky: {
                  ...serverConfig.bluesky,
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
            setOauthConfig(serverConfig);
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
            setOauthConfig(parsedOAuthConfig);
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
    
    if (saved) setText(saved);
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
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("platformAuth", JSON.stringify(auth));
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
        let platform: 'linkedin' | 'twitter' | null = null;
        if (window.location.pathname.includes('/auth/linkedin')) {
          platform = 'linkedin';
        } else if (window.location.pathname.includes('/auth/twitter')) {
          platform = 'twitter';
        } else {
          // Fallback: check stored state
          const linkedinState = localStorage.getItem('oauth_state_linkedin');
          const twitterState = localStorage.getItem('oauth_state_twitter');
          if (state === linkedinState) platform = 'linkedin';
          else if (state === twitterState) platform = 'twitter';
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
            } catch (error) {
              console.error('OAuth completion error:', error);
              alert(`❌ Failed to complete ${platform} authentication: ${error}`);
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
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save state before making changes
    saveUndoState();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setText(before + emoji + after);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
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



  const saveCurrentPost = () => {
    if (!currentPostId) {
      createNewPost();
      return;
    }
    
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { ...post, content: text, scheduleTime, timezone }
        : post
    ));
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
    }
  };

  const deletePost = (postId: string) => {
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
    const dataToSave = {
      posts: posts,
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
          
          // Load the posts
          setPosts(validPosts);
          
          // If there are posts, switch to the first one
          if (validPosts.length > 0) {
            const firstPost = validPosts[0];
            setCurrentPostId(firstPost.id);
            setText(firstPost.content);
            setScheduleTime(firstPost.scheduleTime || getCurrentDateTimeString());
            setTimezone(firstPost.timezone || timezone);
          }
          
          alert(`✅ Successfully loaded ${validPosts.length} posts!`);
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('❌ Error reading file. Please make sure it\'s a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    
    fileInput.click();
  };

  // OAuth configuration functions
  const updateOAuthConfig = (platform: 'linkedin' | 'twitter', clientId: string) => {
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
  const completeOAuthFlow = async (platform: 'linkedin' | 'twitter', code: string, explicitConfig?: OAuthConfig) => {
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
          isAuthenticated: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
          userInfo: userInfo
        }
      }));
      
      alert(`✅ Successfully authenticated with ${platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}!`);
      
      // Clean up Twitter PKCE code verifier
      if (platform === 'twitter') {
        localStorage.removeItem('twitter_code_verifier');
        console.log('🧹 Cleaned up Twitter code verifier');
      }
      
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

  const initiateOAuth = async (platform: 'linkedin' | 'twitter') => {
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
    
    window.location.href = `${config.authUrl}?${params.toString()}`;
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
      alert('✅ Successfully authenticated with Bluesky!');
    } catch (error) {
      console.error('Bluesky auth error:', error);
      alert('❌ Failed to authenticate with Bluesky. Please check your credentials.');
      setPostingStatus('');
    } finally {
      setIsPosting(false);
    }
  };

  const logout = (platform: 'linkedin' | 'twitter' | 'bluesky') => {
    setAuth(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        userInfo: null,
        ...(platform === 'bluesky' && { handle: '', appPassword: '' })
      }
    }));
    
    localStorage.removeItem(`oauth_state_${platform}`);
    // Clean up Twitter code verifier on logout
    if (platform === 'twitter') {
      localStorage.removeItem('twitter_code_verifier');
    }
    alert(`✅ Logged out from ${platform}`);
  };

  // Posting functions
  const postToLinkedIn = async (content: string) => {
    const authData = auth.linkedin;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with LinkedIn');
    }
    
    console.log('📤 Posting to LinkedIn...');
    
    // Use our server endpoint to post to LinkedIn (avoids CORS issues) - v2
    const response = await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content,
        accessToken: authData.accessToken
      })
    });
    
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

  const postToTwitter = async (content: string, replyToTweetId?: string) => {
    const authData = auth.twitter;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with Twitter');
    }
    
    const requestBody: any = {
      content,
      accessToken: authData.accessToken
    };
    
    // Add reply field if this is a reply to another tweet
    if (replyToTweetId) {
      requestBody.replyToTweetId = replyToTweetId;
    }
    
    const response = await fetch('/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
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
    
    return facets;
  };

  const postToBluesky = async (content: string, replyToUri?: string, replyToCid?: string, rootUri?: string, rootCid?: string) => {
    const authData = auth.bluesky;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with Bluesky');
    }
    
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
        switch (selectedPlatform) {
          case 'linkedin':
            result = await postToLinkedIn(chunk);
            break;
          case 'twitter':
            result = await postToTwitter(chunk, previousPostId);
            // Extract tweet ID for next reply
            if (result?.data?.data?.id) {
              previousPostId = result.data.data.id;
            }
            break;
          case 'bluesky':
            result = await postToBluesky(chunk, previousPostUri, previousPostCid, rootPostUri, rootPostCid);
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
      alert(`✅ Successfully posted to ${selectedPlatform}!`);
      
      // Clear the text after successful posting
      setText('');
      
    } catch (error) {
      console.error('Posting error:', error);
      
      // Handle authentication errors by automatically logging out
      if (selectedPlatform === 'twitter' && error instanceof Error && error.message.includes('Authentication failed')) {
        logout('twitter');
        alert(`❌ Twitter authentication expired. You have been logged out. Please login again to continue posting.`);
      } else if (selectedPlatform === 'linkedin' && error instanceof Error && error.message.includes('Authentication failed')) {
        logout('linkedin');
        alert(`❌ LinkedIn authentication expired. You have been logged out. Please login again to continue posting.`);
      } else if (selectedPlatform === 'bluesky' && error instanceof Error && error.message.includes('Authentication failed')) {
        logout('bluesky');
        alert(`❌ Bluesky authentication expired. You have been logged out. Please login again to continue posting.`);
      } else {
        alert(`❌ Failed to post to ${selectedPlatform}: ${error}`);
      }
      setPostingStatus('');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostToAll = async () => {
    const connectedPlatforms = (['linkedin', 'twitter', 'bluesky'] as const).filter(
      platform => auth[platform].isAuthenticated
    );
    
    if (connectedPlatforms.length === 0) {
      alert('❌ No platforms are connected. Please connect to at least one platform first.');
      return;
    }
    
    const platformNames = {
      linkedin: 'LinkedIn',
      twitter: 'X/Twitter',
      bluesky: 'Bluesky'
    };
    
    const confirmMessage = `📤 Post to all connected platforms (${connectedPlatforms.map(p => platformNames[p]).join(', ')})?\n\nThis will post your content to ${connectedPlatforms.length} platform${connectedPlatforms.length > 1 ? 's' : ''}.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsPosting(true);
      const results: Array<{ platform: string; success: boolean; error?: string }> = [];
      
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
          
          for (let i = 0; i < formattedChunks.length; i++) {
            const chunk = formattedChunks[i];
            setPostingStatus(`Posting part ${i + 1} of ${formattedChunks.length} to ${platformNames[platform]}...`);
            
            let result;
            switch (platform) {
              case 'linkedin':
                result = await postToLinkedIn(chunk);
                break;
              case 'twitter':
                result = await postToTwitter(chunk, previousPostId);
                // Extract tweet ID for next reply
                if (result?.data?.data?.id) {
                  previousPostId = result.data.data.id;
                }
                break;
              case 'bluesky':
                result = await postToBluesky(chunk, previousPostUri, previousPostCid, rootPostUri, rootPostCid);
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
            }
            
            // Add delay between posts for multi-part content (increased for Twitter)
            if (i < formattedChunks.length - 1) {
              const delay = platform === 'twitter' ? 5000 : 2000; // 5 seconds for Twitter, 2 for others
              setPostingStatus(`Waiting ${delay/1000} seconds before posting next part to ${platformNames[platform]}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          results.push({ platform: platformNames[platform], success: true });
          
          // Add delay between platforms (longer if Twitter was just used)
          if (connectedPlatforms.indexOf(platform) < connectedPlatforms.length - 1) {
            const delay = platform === 'twitter' ? 3000 : 1000; // 3 seconds after Twitter, 1 second after others
            setPostingStatus(`Waiting ${delay/1000} seconds before posting to next platform...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);
          
          // Handle authentication errors by automatically logging out
          if (platform === 'twitter' && error instanceof Error && error.message.includes('Authentication failed')) {
            logout('twitter');
          } else if (platform === 'linkedin' && error instanceof Error && error.message.includes('Authentication failed')) {
            logout('linkedin');
          } else if (platform === 'bluesky' && error instanceof Error && error.message.includes('Authentication failed')) {
            logout('bluesky');
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
      
      if (successful.length === results.length) {
        alert(`✅ Successfully posted to all platforms!\n\n📤 Posted to: ${successful.map(r => r.platform).join(', ')}`);
        // Clear the text after successful posting to all platforms
        setText('');
      } else if (successful.length > 0) {
        const successMsg = `✅ Successful: ${successful.map(r => r.platform).join(', ')}`;
        const failMsg = `❌ Failed: ${failed.map(r => `${r.platform} (${r.error})`).join(', ')}`;
        alert(`⚠️ Partial success:\n\n${successMsg}\n\n${failMsg}`);
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

  const chunkText = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string[] => {
    const limit = PLATFORM_LIMITS[platform];
    
    if (text.length <= limit) {
      return [text];
    }
    
    const chunks: string[] = [];
    let remainingText = text;
    
    while (remainingText.length > 0) {
      if (remainingText.length <= limit) {
        chunks.push(remainingText);
        break;
      }
      
      // Find the best break point within the limit
      const breakPoint = findBestBreakPoint(remainingText, limit);
      
      // Extract chunk and clean up
      let chunk = remainingText.substring(0, breakPoint).replace(/\s+$/, ''); // Remove trailing whitespace
      
      // Ensure chunk doesn't exceed limit after cleanup
      if (chunk.length > limit) {
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
      if (chunk.length > limit) {
        console.warn(`Chunk exceeds ${platform} limit (${chunk.length}/${limit}):`, chunk.substring(0, 50) + '...');
        // Force truncate if somehow still too long
        return chunk.substring(0, limit - 3) + '...';
      }
      return chunk;
    }).filter(chunk => chunk.length > 0);
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

  const formatForPlatform = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string => {
    // First process unified tags, then apply Unicode styling
    const processedText = processUnifiedTags(text, platform);
    return toUnicodeStyle(processedText);
  };

  const toUnicodeStyle = (text: string): string => {
    let result = text;
    
    // Handle bold text first
    result = result.replace(/\*\*(.*?)\*\*/g, (_, m) => toBold(m));
    
    // Handle italic text - simpler pattern that works reliably
    result = result.replace(/_([^_]+?)_/g, (_, m) => toItalic(m));
    
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
        alert(message);
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
          alert(message);
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert("❌ Failed to copy text. Please manually copy the text from the preview below.");
    }
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
        if (!post.scheduleTime) return;
        
        const target = new Date(post.scheduleTime);
        const delay = target.getTime() - now.getTime();
        
        if (delay <= 0) return;
        
        console.log(`⏰ Reminder set for "${post.title}" at ${formatTimezoneTime(post.scheduleTime, post.timezone)} (in ${Math.round(delay / 1000)} seconds)`);
        
        const timeout = setTimeout(() => {
          try {
            // Create notification
            const notification = new Notification(`⏰ LinkedIn Post Reminder: ${post.title}`, {
              body: `Time to post "${post.title}" on LinkedIn!\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`,
              icon: "/favicon.ico",
              tag: `linkedin-reminder-${post.id}`,
              requireInteraction: true,
              silent: false
            });

            // Also show browser alert as fallback
            alert(`⏰ REMINDER: Time to post "${post.title}" on LinkedIn!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}\n\nClick on "📝 Posts" to switch to this post.`);

            // Auto-close notification after 15 seconds
            setTimeout(() => notification.close(), 15000);
            
            console.log(`✅ Notification triggered for "${post.title}"`);
          } catch (error) {
            console.error("❌ Notification error:", error);
            alert(`⏰ REMINDER: Time to post "${post.title}" on LinkedIn!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`);
          }
        }, delay);
        
        timeouts.push(timeout as unknown as number);
      });
    };

    setupNotifications();
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [posts]);

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
      bluesky: ''
    });
  };

  const processUnifiedTags = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string => {
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
          case 'bluesky':
            return person.bluesky ? `@${person.bluesky}` : person.displayName;
          default:
            return `@${person.displayName}`;
        }
      }

      // If no mapping found, handle based on platform
      if (platform === 'bluesky' || platform === 'twitter') {
        // For BlueSky and Twitter, return without @ since unmapped names can't be resolved to handles/DIDs
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

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const tag = `@{${personName}}`;
    
    // Save state before making changes
    saveUndoState();
    
    setText(before + tag + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
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
      setIsUndoRedoAction(false);
    }, 0);
  };

  const performRedo = () => {
    if (redoHistory.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUndoRedoAction(true);

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
                          <li>5. Copy the Client ID and add it to your <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>.env</code> file as <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>TWITTER_CLIENT_ID</code></li>
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
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">📝 Manage Posts</h2>
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
                <button
                  onClick={createNewPost}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                >
                  ➕ New Post
                </button>
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
                          <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            📅 {formatTimezoneTime(post.scheduleTime, post.timezone)}
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

        {/* Show editor only when there's a post to edit */}
        {currentPostId ? (
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
                    alert(`✅ Post saved as "${newPost.title}"`);
                  } else {
                    // Update existing post
                    saveCurrentPost();
                    const currentPost = posts.find(p => p.id === currentPostId);
                    alert(`✅ Post "${currentPost?.title || 'Untitled'}" updated`);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm"
              >
                💾 Save Current
              </button>

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
        </div>

        <div className="mb-4">
          <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Platform
          </label>
          <div className="flex gap-2 mb-3">
            {[
              { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
              { key: 'twitter', label: 'X/Twitter', icon: '🐦' },
              { key: 'bluesky', label: 'Bluesky', icon: '🦋' }
            ].map((platform) => (
              <button
                key={platform.key}
                onClick={() => setSelectedPlatform(platform.key as any)}
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
                <span className="text-green-500">✅ Connected to {selectedPlatform}</span>
                <button
                  onClick={() => logout(selectedPlatform)}
                  className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Not connected to {selectedPlatform}</span>
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
          <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
          <div className="flex gap-4">
            <span>{text.length} characters</span>
            <span className={`${text.length > PLATFORM_LIMITS[selectedPlatform] ? 'text-red-500' : 'text-green-500'}`}>
              Limit: {PLATFORM_LIMITS[selectedPlatform]}{selectedPlatform === 'twitter' && isXPremium ? ' (X Premium)' : ''}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block mb-1 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Schedule Post Reminder
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-800"}`}
            />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-800"}`}
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
          {scheduleTime && (
            <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              📅 Scheduled for: {formatTimezoneTime(scheduleTime, timezone)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                🔔 Notifications:
              </span>
              {notificationStatus === 'granted' && (
                <span className="text-xs text-green-600">✅ Enabled</span>
              )}
              {notificationStatus === 'denied' && (
                <span className="text-xs text-red-600">❌ Blocked</span>
              )}
              {notificationStatus === 'unsupported' && (
                <span className="text-xs text-orange-600">⚠️ Unsupported</span>
              )}
              {notificationStatus === 'unknown' && (
                <span className="text-xs text-yellow-600">❓ Unknown</span>
              )}
            </div>
            <button
              onClick={async () => {
                if (!("Notification" in window)) {
                  alert("❌ This browser doesn't support notifications.");
                  return;
                }
                
                if (Notification.permission === 'granted') {
                  new Notification("🧪 Test Notification", {
                    body: "Notifications are working correctly!",
                    icon: "/favicon.ico"
                  });
                  alert("✅ Test notification sent! Check if you received it.");
                } else {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    setNotificationStatus('granted');
                    new Notification("🧪 Test Notification", {
                      body: "Notifications are now enabled!",
                      icon: "/favicon.ico"
                    });
                    alert("✅ Notifications enabled! Test notification sent.");
                  } else {
                    setNotificationStatus('denied');
                    alert("❌ Please enable notifications in your browser settings.");
                  }
                }
              }}
              className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
            >
              🧪 Test
            </button>
          </div>
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
              {isPosting ? '⏳' : '📤'} {isPosting ? 'Posting...' : `Post to ${selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'}`}
            </button>
          ) : (
            <button onClick={handleCopyStyled} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl">
              📋 Copy for {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'}
            </button>
          )}
          
          {/* Post to All button */}
          {(() => {
            const connectedPlatforms = (['linkedin', 'twitter', 'bluesky'] as const).filter(
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

        </div>
          </>
        ) : (
          // Show welcome message when no post is selected
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
        )}

        {currentPostId && text.trim() && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">
              {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'} Preview
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
                            Part {index + 1} of {chunks.length} • {chunk.length} characters
                          </div>
                        )}
                        {(selectedPlatform === 'twitter' || selectedPlatform === 'bluesky') && chunks.length > 1 && (
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
                                alert(`✅ Part ${index + 1} copied to clipboard!`);
                              } catch (err) {
                                console.error('Copy failed:', err);
                                alert('❌ Failed to copy. Please select and copy manually.');
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                          >
                            📋 Copy
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{chunk}</div>
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
                  Connect to {authPlatform === 'linkedin' ? 'LinkedIn' : authPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'}
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
                    You will be redirected to {authPlatform === 'linkedin' ? 'LinkedIn' : 'X/Twitter'} to authorize this application.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => initiateOAuth(authPlatform as 'linkedin' | 'twitter')}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Connect to {authPlatform === 'linkedin' ? 'LinkedIn' : 'X/Twitter'}
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
                    <div className="md:col-span-2">
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
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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
    </div>
  );
}

export default App;
