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
  bluesky: AuthState & { handle?: string; appPassword?: string };
}; 