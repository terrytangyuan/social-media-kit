import { OAuthConfig } from '../types';

// Default OAuth configuration (fallback if server config fails)
export const DEFAULT_OAUTH_CONFIG: OAuthConfig = {
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