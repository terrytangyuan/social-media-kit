import { useState, useEffect, useCallback } from 'react';
import { OAuthConfig, PlatformAuth, AuthState, DEFAULT_OAUTH_CONFIG } from '../types';

const PLATFORMS = ['linkedin', 'twitter', 'mastodon', 'bluesky'] as const;
type Platform = typeof PLATFORMS[number];

export const useAuth = () => {
  const [auth, setAuth] = useState<PlatformAuth>({
    linkedin: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: {}
    },
    twitter: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: {}
    },
    mastodon: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: {}
    },
    bluesky: {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userInfo: {}
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPlatform, setAuthPlatform] = useState<Platform | null>(null);

  const [blueskyCredentials, setBlueskyCredentials] = useState<{
    handle: string;
    appPassword: string;
  }>({ handle: '', appPassword: '' });

  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>(DEFAULT_OAUTH_CONFIG);
  const [oauthConfigLoaded, setOauthConfigLoaded] = useState(false);

  // Load initial auth and OAuth config from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem("platformAuth");
    const savedOAuthConfig = localStorage.getItem("oauthConfig");

    try {
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        // Merge with default auth state to ensure all platforms are present
        const mergedAuth: PlatformAuth = {
          linkedin: { ...auth.linkedin, ...parsedAuth.linkedin },
          twitter: { ...auth.twitter, ...parsedAuth.twitter },
          mastodon: { ...auth.mastodon, ...parsedAuth.mastodon },
          bluesky: { ...auth.bluesky, ...parsedAuth.bluesky }
        };
        setAuth(mergedAuth);
      }

      if (savedOAuthConfig) {
        const parsedOAuthConfig = JSON.parse(savedOAuthConfig);
        const mergedConfig: OAuthConfig = {
          linkedin: { ...DEFAULT_OAUTH_CONFIG.linkedin, ...(parsedOAuthConfig.linkedin || {}) },
          twitter: { ...DEFAULT_OAUTH_CONFIG.twitter, ...(parsedOAuthConfig.twitter || {}) },
          mastodon: { ...DEFAULT_OAUTH_CONFIG.mastodon, ...(parsedOAuthConfig.mastodon || {}) },
          bluesky: { ...DEFAULT_OAUTH_CONFIG.bluesky, ...(parsedOAuthConfig.bluesky || {}) }
        };
        setOauthConfig(mergedConfig);
        setOauthConfigLoaded(true);
      }
    } catch (error) {
      console.error('Error loading saved authentication:', error);
      // Reset to defaults if parsing fails
      setAuth(prevAuth => ({ ...prevAuth }));
      setOauthConfig(DEFAULT_OAUTH_CONFIG);
      setOauthConfigLoaded(true);
    }
  }, []);

  // Helper function to check if token is expired
  const isTokenExpired = useCallback((authData: AuthState): boolean => {
    if (!authData.isAuthenticated || !authData.accessToken) return true;
    if (!authData.expiresAt) return false; // No expiration info, assume valid
    return Date.now() >= authData.expiresAt;
  }, []);

  // Logout function for a specific platform or all platforms
  const logout = useCallback((platform?: Platform) => {
    setAuth(prev => {
      const updatedAuth: PlatformAuth = { ...prev };

      const platformsToLogout = platform ? [platform] : PLATFORMS;

      platformsToLogout.forEach(p => {
        updatedAuth[p] = {
          ...updatedAuth[p],
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          userInfo: {}
        };

        // Clear platform-specific additional details
        if (p === 'bluesky') {
          (updatedAuth[p] as any).handle = '';
          (updatedAuth[p] as any).appPassword = '';
        } else if (p === 'mastodon') {
          (updatedAuth[p] as any).handle = '';
          (updatedAuth[p] as any).instanceUrl = 'https://mastodon.social';
        }
      });

      // Persist to localStorage
      localStorage.setItem("platformAuth", JSON.stringify(updatedAuth));
      localStorage.removeItem(`oauth_state_${platform || 'all'}`);

      // Additional cleanup for Twitter's code verifier
      if (!platform || platform === 'twitter') {
        localStorage.removeItem('oauth_code_verifier');
      }

      return updatedAuth;
    });
  }, []);

  // Get authenticated platforms
  const getAuthenticatedPlatforms = useCallback((): Platform[] => {
    return PLATFORMS.filter(platform => auth[platform].isAuthenticated);
  }, [auth]);

  // Update OAuth configuration
  const updateOAuthConfig = useCallback((platform: Platform, clientId: string) => {
    setOauthConfig(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        clientId
      }
    }));

    // Persist to localStorage
    localStorage.setItem("oauthConfig", JSON.stringify({
      ...oauthConfig,
      [platform]: {
        ...oauthConfig[platform],
        clientId
      }
    }));
  }, [oauthConfig]);

  // Clear OAuth localStorage
  const clearOAuthLocalStorage = useCallback(() => {
    if (confirm('⚠️ This will clear all OAuth settings from localStorage and reload the page. Continue?')) {
      localStorage.removeItem('oauthConfig');
      localStorage.removeItem('oauth_state_linkedin');
      localStorage.removeItem('oauth_state_twitter');
      localStorage.removeItem('platformAuth');
      console.log('🧹 Cleared OAuth localStorage');
      window.location.reload();
    }
  }, []);

  // Save to localStorage whenever auth or config changes
  useEffect(() => {
    localStorage.setItem("platformAuth", JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    localStorage.setItem("oauthConfig", JSON.stringify(oauthConfig));
  }, [oauthConfig]);

  // Return hook state and functions
  return {
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
  };
};