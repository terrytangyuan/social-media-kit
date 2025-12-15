// Tag Autocomplete Types
export type TagSuggestion = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
};

export type TagAutocompleteProps = {
  suggestions: TagSuggestion[];
  onSelect: (suggestion: TagSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
  darkMode: boolean;
  filter: string;
};

// OAuth configuration type
export type OAuthConfig = {
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

export type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userInfo: any;
};

export type PlatformAuth = {
  linkedin: AuthState & { handle?: string; appPassword?: string };
  twitter: AuthState & { handle?: string; appPassword?: string };
  mastodon: AuthState & { handle?: string; instanceUrl?: string };
  bluesky: AuthState & { handle?: string; appPassword?: string };
};

// Unified tagging types
export type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  mastodon?: string;
  bluesky?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaggingState = {
  personMappings: PersonMapping[];
};

export type PlatformPostResult = {
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt: string;
};

export type PublishedPost = {
  id: string;
  title: string;
  content: string;
  originalPostId: string;
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

export type DeletedPost = {
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
