// Helper utilities for posting to social media platforms

/**
 * Calculate delay between posts based on platform
 * @param platform - The platform to calculate delay for
 * @param delayType - Type of delay ('chunk' for between chunks, 'platform' for between platforms)
 * @returns Delay in milliseconds
 */
export const getPostDelay = (
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  delayType: 'chunk' | 'platform' = 'chunk'
): number => {
  if (delayType === 'chunk') {
    // Delay between chunks of the same post
    return platform === 'twitter' ? 5000 : 2000; // 5 seconds for Twitter, 2 for others
  } else {
    // Delay between different platforms
    return platform === 'twitter' ? 3000 : 1000; // 3 seconds after Twitter, 1 second after others
  }
};
