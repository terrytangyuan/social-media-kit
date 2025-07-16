import { useState, useEffect } from 'react';
import { PlatformAuth, AuthState, OAuthConfig } from '../types';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utils/storage';
import { getOAuthConfig, exchangeCodeForToken } from '../services';
import { authenticateBluesky } from '../services/blueskyService';
import { DEFAULT_OAUTH_CONFIG } from '../constants/oauth';

const initialAuthState: PlatformAuth = {
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
};

export const useAuth = () => {
  const [auth, setAuth] = useState<PlatformAuth>(initialAuthState);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>(DEFAULT_OAUTH_CONFIG);
  const [oauthConfigLoaded, setOauthConfigLoaded] = useState(false);

  // Load saved authentication state on mount
  useEffect(() => {
    const savedAuth = getItem(STORAGE_KEYS.PLATFORM_AUTH, initialAuthState);
    setAuth(savedAuth);
  }, []);

  // Save authentication state changes
  useEffect(() => {
    setItem(STORAGE_KEYS.PLATFORM_AUTH, auth);
  }, [auth]);

  // Load OAuth configuration
  useEffect(() => {
    const loadOAuthConfig = async () => {
      try {
        const serverConfig = await getOAuthConfig();
        if (serverConfig) {
          const savedOAuthConfig = getItem(STORAGE_KEYS.OAUTH_CONFIG, DEFAULT_OAUTH_CONFIG);
          
          // Merge configs - server provides LinkedIn/Twitter settings, localStorage provides Bluesky
          const mergedConfig: OAuthConfig = {
            linkedin: serverConfig.linkedin,
            twitter: serverConfig.twitter,
            bluesky: {
              ...serverConfig.bluesky,
              ...(savedOAuthConfig.bluesky || {})
            }
          };
          
          setOauthConfig(mergedConfig);
          setItem(STORAGE_KEYS.OAUTH_CONFIG, mergedConfig);
        }
        setOauthConfigLoaded(true);
      } catch (error) {
        console.error('Failed to load OAuth config:', error);
        setOauthConfigLoaded(true);
      }
    };

    loadOAuthConfig();
  }, []);

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
    
    removeItem(`oauth_state_${platform}`);
    
    // Clean up Twitter code verifier on logout
    if (platform === 'twitter') {
      removeItem('twitter_code_verifier');
    }
    
    console.log(`✅ Logged out from ${platform}`);
  };

  const updateAuthState = (platform: 'linkedin' | 'twitter' | 'bluesky', updates: Partial<AuthState>) => {
    setAuth(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        ...updates
      }
    }));
  };

  const handleOAuthCallback = async (platform: 'linkedin' | 'twitter', code: string, state?: string) => {
    try {
      let codeVerifier;
      if (platform === 'twitter') {
        codeVerifier = getItem('twitter_code_verifier', '');
      }

      const tokenData = await exchangeCodeForToken(platform, code, codeVerifier, state);
      
      updateAuthState(platform, {
        isAuthenticated: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
        userInfo: tokenData
      });

      // Clean up stored state
      removeItem(`oauth_state_${platform}`);
      if (platform === 'twitter') {
        removeItem('twitter_code_verifier');
      }

      return { success: true, platform };
    } catch (error) {
      console.error(`OAuth callback error for ${platform}:`, error);
      return { success: false, error: error.message };
    }
  };

  const authenticateWithBluesky = async (handle: string, appPassword: string) => {
    try {
      const result = await authenticateBluesky(handle, appPassword, oauthConfig.bluesky.server);
      
      if (result.success) {
        setAuth(prev => ({
          ...prev,
          bluesky: {
            ...prev.bluesky,
            isAuthenticated: true,
            accessToken: result.accessToken!,
            refreshToken: result.refreshToken!,
            expiresAt: null,
            userInfo: result.userInfo,
            handle,
            appPassword
          }
        }));
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Bluesky authentication error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateOAuthConfig = (platform: 'linkedin' | 'twitter', clientId: string) => {
    const updatedConfig = {
      ...oauthConfig,
      [platform]: {
        ...oauthConfig[platform],
        clientId
      }
    };
    setOauthConfig(updatedConfig);
    setItem(STORAGE_KEYS.OAUTH_CONFIG, updatedConfig);
  };

  const updateBlueskyConfig = (server: string) => {
    const updatedConfig = {
      ...oauthConfig,
      bluesky: {
        ...oauthConfig.bluesky,
        server
      }
    };
    setOauthConfig(updatedConfig);
    setItem(STORAGE_KEYS.OAUTH_CONFIG, updatedConfig);
  };

  const clearOAuthLocalStorage = () => {
    removeItem(STORAGE_KEYS.OAUTH_CONFIG);
    removeItem(STORAGE_KEYS.PLATFORM_AUTH);
    setAuth(initialAuthState);
    setOauthConfig(DEFAULT_OAUTH_CONFIG);
  };

  return {
    auth,
    oauthConfig,
    oauthConfigLoaded,
    logout,
    updateAuthState,
    handleOAuthCallback,
    authenticateWithBluesky,
    updateOAuthConfig,
    updateBlueskyConfig,
    clearOAuthLocalStorage
  };
}; 