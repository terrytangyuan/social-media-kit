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

// Default OAuth configuration
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
  linkedin: AuthState;
  twitter: AuthState;
  bluesky: AuthState & {
    handle: string;
    appPassword: string;
  };
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

  const PLATFORM_LIMITS = {
    linkedin: 3000, // LinkedIn doesn't have strict limit, but 3000 is good practice
    twitter: 280,
    bluesky: 300
  };

  useEffect(() => {
    const saved = localStorage.getItem("socialMediaDraft");
    const dark = localStorage.getItem("darkMode");
    const schedule = localStorage.getItem("scheduleTime");
    const savedTimezone = localStorage.getItem("timezone");
    const savedPosts = localStorage.getItem("socialMediaPosts");
    const savedAuth = localStorage.getItem("platformAuth");
    const savedOAuthConfig = localStorage.getItem("oauthConfig");
    
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
    
    if (savedOAuthConfig) {
      try {
        const parsedOAuthConfig = JSON.parse(savedOAuthConfig);
        setOauthConfig(parsedOAuthConfig);
      } catch (error) {
        console.error('Error parsing saved OAuth config:', error);
      }
    }
    
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
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      if (error) {
        alert(`❌ OAuth Error: ${error}\n${urlParams.get('error_description') || 'Authentication failed'}`);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (code && state) {
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
          const storedState = localStorage.getItem(`oauth_state_${platform}`);
          if (state === storedState) {
            try {
              await completeOAuthFlow(platform, code);
            } catch (error) {
              console.error('OAuth completion error:', error);
              alert(`❌ Failed to complete ${platform} authentication: ${error}`);
            }
          } else {
            alert('❌ OAuth Error: Invalid state parameter. Possible security issue.');
          }
          
          // Clean up
          localStorage.removeItem(`oauth_state_${platform}`);
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

  const getMarkdownPreview = () => {
    const html = marked(text, { breaks: true });
    return DOMPurify.sanitize(html);
  };

  const applyMarkdown = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const wrapped = `${wrapper}${selected}${wrapper}`;
    setText(before + wrapped + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

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

  const saveToDraft = () => {
    if (!currentPostId) {
      // Create new post with current content
      const currentTime = getCurrentDateTimeString();
      const newPost = {
        id: Date.now().toString(),
        title: `Post ${posts.length + 1}`,
        content: text,
        scheduleTime: currentTime,
        timezone: timezone,
        createdAt: new Date().toISOString()
      };
      setPosts(prev => [...prev, newPost]);
      setCurrentPostId(newPost.id);
      setScheduleTime(currentTime);
      return;
    }
    
    // Update existing post with current content
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { ...post, content: text, scheduleTime, timezone }
        : post
    ));
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
      appVersion: "1.0.0"
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
    setOauthConfig(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        clientId
      }
    }));
  };

  const updateBlueskyConfig = (server: string) => {
    setOauthConfig(prev => ({
      ...prev,
      bluesky: {
        server
      }
    }));
  };

  // OAuth completion function
  const completeOAuthFlow = async (platform: 'linkedin' | 'twitter', code: string) => {
    const config = oauthConfig[platform];
    
    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          code,
          clientId: config.clientId,
          redirectUri: config.redirectUri
        })
      });
      
      if (!tokenResponse.ok) {
        // If API endpoint doesn't exist (development), show manual token instructions
        throw new Error(`OAuth token exchange failed. You may need to implement a backend token exchange service or manually configure tokens.`);
      }
      
      const tokenData = await tokenResponse.json();
      
      // Fetch user profile
      let userInfo;
      if (platform === 'linkedin') {
        const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        });
        
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch LinkedIn profile');
        }
        
        userInfo = await profileResponse.json();
      } else if (platform === 'twitter') {
        const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        });
        
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch Twitter profile');
        }
        
        userInfo = await profileResponse.json();
      }
      
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
      
    } catch (error) {
      console.error('OAuth completion error:', error);
      
      // For development - show manual instructions
      if (error instanceof Error && error.message.includes('OAuth token exchange failed')) {
        alert(`⚠️ ${platform.toUpperCase()} AUTHENTICATION INCOMPLETE\n\nThis app needs a backend service to complete OAuth. For development:\n\n1. The authorization was successful\n2. You need to manually exchange the code for a token\n3. Or implement a backend OAuth handler\n\nSee AUTHENTICATION_SETUP.md for details.`);
      } else {
        throw error;
      }
    }
  };

  // Authentication functions
  const initiateOAuth = (platform: 'linkedin' | 'twitter') => {
    const config = oauthConfig[platform];
    
    // Check if client ID is properly configured
    if (!config.clientId || config.clientId === '') {
      alert(`❌ ${platform.toUpperCase()} CLIENT ID NOT CONFIGURED!\n\nPlease configure your OAuth settings:\n1. Click the ⚙️ Settings button\n2. Enter your ${platform === 'linkedin' ? 'LinkedIn' : 'Twitter'} Client ID\n3. Save the settings\n\nSee AUTHENTICATION_SETUP.md for detailed instructions.`);
      return;
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
    alert(`✅ Logged out from ${platform}`);
  };

  // Posting functions
  const postToLinkedIn = async (content: string) => {
    const authData = auth.linkedin;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with LinkedIn');
    }
    
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:person:${authData.userInfo.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }
    
    return response.json();
  };

  const postToTwitter = async (content: string, replyToTweetId?: string) => {
    const authData = auth.twitter;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with Twitter');
    }
    
    const tweetData: any = {
      text: content
    };
    
    // Add reply field if this is a reply to another tweet
    if (replyToTweetId) {
      tweetData.reply = {
        in_reply_to_tweet_id: replyToTweetId
      };
    }
    
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetData)
    });
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }
    
    return response.json();
  };

  const postToBluesky = async (content: string, replyToUri?: string, replyToCid?: string) => {
    const authData = auth.bluesky;
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error('Not authenticated with Bluesky');
    }
    
    const record: any = {
      text: content,
      createdAt: new Date().toISOString()
    };
    
    // Add reply field if this is a reply to another post
    if (replyToUri && replyToCid) {
      record.reply = {
        root: {
          uri: replyToUri,
          cid: replyToCid
        },
        parent: {
          uri: replyToUri,
          cid: replyToCid
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
      throw new Error(`Bluesky API error: ${response.statusText}`);
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
      
      const chunks = chunkText(text, selectedPlatform);
      const formattedChunks = chunks.map(chunk => formatForPlatform(chunk, selectedPlatform));
      
      let results = [];
      
      let previousPostId: string | undefined;
      let previousPostUri: string | undefined;
      let previousPostCid: string | undefined;
      
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
            if (result?.data?.id) {
              previousPostId = result.data.id;
            }
            break;
          case 'bluesky':
            result = await postToBluesky(chunk, previousPostUri, previousPostCid);
            // Extract URI and CID for next reply
            if (result?.uri && result?.cid) {
              previousPostUri = result.uri;
              previousPostCid = result.cid;
            }
            break;
          default:
            throw new Error(`Unsupported platform: ${selectedPlatform}`);
        }
        
        results.push(result);
        
        // Add delay between posts for multi-part content
        if (i < formattedChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      setPostingStatus('');
      alert(`✅ Successfully posted to ${selectedPlatform}!`);
      
      // Clear the text after successful posting
      setText('');
      
    } catch (error) {
      console.error('Posting error:', error);
      alert(`❌ Failed to post to ${selectedPlatform}: ${error}`);
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
          
          const chunks = chunkText(text, platform);
          const formattedChunks = chunks.map(chunk => formatForPlatform(chunk, platform));
          
          let previousPostId: string | undefined;
          let previousPostUri: string | undefined;
          let previousPostCid: string | undefined;
          
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
                if (result?.data?.id) {
                  previousPostId = result.data.id;
                }
                break;
              case 'bluesky':
                result = await postToBluesky(chunk, previousPostUri, previousPostCid);
                // Extract URI and CID for next reply
                if (result?.uri && result?.cid) {
                  previousPostUri = result.uri;
                  previousPostCid = result.cid;
                }
                break;
            }
            
            // Add delay between posts for multi-part content
            if (i < formattedChunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          results.push({ platform: platformNames[platform], success: true });
          
          // Add delay between platforms
          if (connectedPlatforms.indexOf(platform) < connectedPlatforms.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);
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
    "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄", "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹‍♀️", "🤹", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"],
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
      
      // Try to break at natural points
      let breakPoint = limit;
      
      // Look for sentence ending
      const sentenceEnd = remainingText.lastIndexOf('.', limit);
      const questionEnd = remainingText.lastIndexOf('?', limit);
      const exclamationEnd = remainingText.lastIndexOf('!', limit);
      
      const sentenceBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (sentenceBreak > limit * 0.7) {
        breakPoint = sentenceBreak + 1;
      } else {
        // Look for paragraph break
        const paragraphBreak = remainingText.lastIndexOf('\n\n', limit);
        if (paragraphBreak > limit * 0.5) {
          breakPoint = paragraphBreak;
        } else {
          // Look for single line break
          const lineBreak = remainingText.lastIndexOf('\n', limit);
          if (lineBreak > limit * 0.7) {
            breakPoint = lineBreak;
          } else {
            // Look for word boundary
            const spaceBreak = remainingText.lastIndexOf(' ', limit);
            if (spaceBreak > limit * 0.8) {
              breakPoint = spaceBreak;
            }
          }
        }
      }
      
      chunks.push(remainingText.substring(0, breakPoint).trim());
      remainingText = remainingText.substring(breakPoint).trim();
    }
    
    return chunks;
  };

  const formatForPlatform = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string => {
    // All platforms support Unicode styled text
    return toUnicodeStyle(text);
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
      U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭"
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
      U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡"
    };
    return input.split("").map(c => italicMap[c] || c).join("");
  };

  const handleCopyStyled = async () => {
    try {
      const chunks = chunkText(text, selectedPlatform);
      const formattedChunks = chunks.map((chunk) => {
        return formatForPlatform(chunk, selectedPlatform);
      });
      
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
        
        timeouts.push(timeout);
      });
    };

    setupNotifications();
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [posts]);

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
              onClick={() => setShowOAuthSettings(!showOAuthSettings)}
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

        {showOAuthSettings && (
          <div className={`mb-6 p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">⚙️ OAuth Settings</h2>
              <button
                onClick={() => setShowOAuthSettings(false)}
                className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-700"}`}
              >
                ✕ Close
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
                      <li>3. In Auth tab, add redirect URI: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:5173</code></li>
                      <li>4. Enable scope: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>w_member_social</code></li>
                      <li>5. Copy the Client ID and paste it below</li>
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
                    />
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {oauthConfig.linkedin.clientId ? '✅ LinkedIn Client ID configured' : '⚠️ Client ID required for LinkedIn posting'}
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
                      <li>3. In App Settings, add callback URL: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>http://localhost:5173</code></li>
                      <li>4. Enable scopes: <code className={`px-1 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>tweet.read tweet.write users.read</code></li>
                      <li>5. Copy the Client ID and paste it below</li>
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
                    />
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {oauthConfig.twitter.clientId ? '✅ Twitter Client ID configured' : '⚠️ Client ID required for Twitter posting'}
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
                  💡 Settings are automatically saved
                </div>
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
            
            {currentPostId && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={saveCurrentPost}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                >
                  💾 Save Current
                </button>
              </div>
            )}
          </div>
        )}

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
            onClick={saveToDraft}
            className={`px-3 py-1 rounded-xl text-sm ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
          >
            💾 Save to Draft
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className={`w-full h-40 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 mb-4 ${
            darkMode 
              ? "bg-gray-700 text-white border-gray-600 focus:ring-blue-500 dark-textarea" 
              : "bg-white text-gray-800 border-gray-300 focus:ring-blue-400 light-textarea"
          }`}
          placeholder="Write your post here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

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
              Limit: {PLATFORM_LIMITS[selectedPlatform]}
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





        {text.trim() && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">
              {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'} Preview
            </h2>
            {(() => {
              const chunks = chunkText(text, selectedPlatform);
              const formattedChunks = chunks.map((chunk) => {
                return formatForPlatform(chunk, selectedPlatform);
              });
              
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
