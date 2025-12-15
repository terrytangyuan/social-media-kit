// Utility functions for platform-specific operations

/**
 * Extract post ID and URL from platform-specific API response
 * @param platform - The social media platform
 * @param result - The API response from posting
 * @param blueskyHandle - The Bluesky handle (required for Bluesky URL construction)
 * @returns Object containing postId and postUrl
 */
export const extractPostInfo = (
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  result: any,
  blueskyHandle?: string
): { postId: string; postUrl: string } => {
  let postId = '';
  let postUrl = '';

  if (platform === 'twitter' && result?.data?.data?.id) {
    postId = result.data.data.id;
    postUrl = `https://twitter.com/i/status/${postId}`;
  } else if (platform === 'linkedin' && result?.data?.id) {
    postId = result.data.id;
    // LinkedIn post URLs are more complex, so we'll just track the ID
  } else if (platform === 'bluesky' && result?.uri) {
    postId = result.uri;
    // Extract rkey from URI and construct Bluesky URL
    const uriParts = result.uri.split('/');
    const rkey = uriParts[uriParts.length - 1];
    if (blueskyHandle && rkey) {
      postUrl = `https://bsky.app/profile/${blueskyHandle}/post/${rkey}`;
    }
  } else if (platform === 'mastodon' && result?.data?.id) {
    postId = result.data.id;
    postUrl = result.data.url || '';
  }

  return { postId, postUrl };
};

/**
 * Check if an error is an authentication-related error
 * @param error - The error object or message
 * @returns true if the error is authentication-related
 */
export const isAuthenticationError = (error: Error | string | unknown): boolean => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('Authentication failed') ||
         errorMessage.includes('401') ||
         errorMessage.includes('Unauthorized') ||
         errorMessage.includes('session may have expired') ||
         errorMessage.includes('reconnect your') ||
         errorMessage.includes('Invalid access token');
};

/**
 * Capitalize the first letter of a platform name
 * @param platform - The platform identifier
 * @returns Capitalized platform name
 */
export const capitalizePlatform = (platform: string): string => {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};

/**
 * Get display name for a platform
 * @param platform - The platform identifier
 * @returns User-friendly platform name
 */
export const getPlatformDisplayName = (platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky'): string => {
  const displayNames: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'X/Twitter',
    mastodon: 'Mastodon',
    bluesky: 'Bluesky'
  };
  return displayNames[platform] || capitalizePlatform(platform);
};
