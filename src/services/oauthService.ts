import { OAuthConfig } from '../types';

/**
 * Get OAuth configuration from server
 */
export const getOAuthConfig = async (): Promise<OAuthConfig | null> => {
  try {
    console.log('🔄 Loading OAuth config from server...');
    const response = await fetch('/api/oauth/config');
    if (response.ok) {
      const serverConfig = await response.json();
      console.log('✅ Server OAuth config loaded:', serverConfig);
      return serverConfig;
    } else {
      console.error('❌ Failed to load OAuth config:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading OAuth config:', error);
    return null;
  }
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  platform: 'linkedin' | 'twitter',
  code: string,
  codeVerifier?: string,
  state?: string
): Promise<any> => {
  try {
    console.log(`🔄 Exchanging ${platform} code for token...`);
    const tokenResponse = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        code,
        codeVerifier,
        state
      }),
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log(`✅ ${platform} token exchange successful`);
      return tokenData;
    } else {
      const errorData = await tokenResponse.text();
      console.error(`❌ ${platform} token exchange failed:`, errorData);
      throw new Error(`Token exchange failed: ${errorData}`);
    }
  } catch (error) {
    console.error(`❌ ${platform} token exchange error:`, error);
    throw error;
  }
}; 