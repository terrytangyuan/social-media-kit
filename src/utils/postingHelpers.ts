// Helper utilities for posting to social media platforms

/**
 * Post a chunk of text to a specific platform with threading support
 * @param platform - The platform to post to
 * @param chunk - The text chunk to post
 * @param platformImages - Array of images to attach (only for first post)
 * @param threadingData - Data for threading (previousPostId, URIs, CIDs)
 * @param postFunctions - Object containing platform posting functions
 * @returns Result from the platform API and updated threading data
 */
export const postChunkToPlatform = async (
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  chunk: string,
  platformImages: { file: File; dataUrl: string; name: string; }[],
  threadingData: {
    previousPostId?: string;
    previousPostUri?: string;
    previousPostCid?: string;
    rootPostUri?: string;
    rootPostCid?: string;
    isFirstChunk: boolean;
  },
  postFunctions: {
    postToLinkedIn: (content: string, images: any[]) => Promise<any>;
    postToTwitter: (content: string, replyTo?: string, images?: any[]) => Promise<any>;
    postToBluesky: (content: string, replyToUri?: string, replyToCid?: string, rootUri?: string, rootCid?: string, images?: any[]) => Promise<any>;
    postToMastodon: (content: string, replyTo?: string, images?: any[]) => Promise<any>;
  }
) => {
  let result;
  const updatedThreadingData = { ...threadingData };

  switch (platform) {
    case 'linkedin':
      result = await postFunctions.postToLinkedIn(chunk, platformImages);
      break;
    case 'twitter':
      result = await postFunctions.postToTwitter(chunk, threadingData.previousPostId, platformImages);
      // Extract tweet ID for next reply
      if (result?.data?.data?.id) {
        updatedThreadingData.previousPostId = result.data.data.id;
      }
      break;
    case 'bluesky':
      result = await postFunctions.postToBluesky(
        chunk,
        threadingData.previousPostUri,
        threadingData.previousPostCid,
        threadingData.rootPostUri,
        threadingData.rootPostCid,
        platformImages
      );
      // Extract URI and CID for next reply
      if (result?.uri && result?.cid) {
        // Set root on first post
        if (threadingData.isFirstChunk) {
          updatedThreadingData.rootPostUri = result.uri;
          updatedThreadingData.rootPostCid = result.cid;
        }
        updatedThreadingData.previousPostUri = result.uri;
        updatedThreadingData.previousPostCid = result.cid;
      }
      break;
    case 'mastodon':
      result = await postFunctions.postToMastodon(chunk, threadingData.previousPostId, platformImages);
      // Extract status ID for next reply
      if (result?.data?.id) {
        updatedThreadingData.previousPostId = result.data.id;
      }
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return { result, threadingData: updatedThreadingData };
};

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

/**
 * Wait for a specified delay with optional status update
 * @param delayMs - Delay in milliseconds
 * @param onStatus - Optional callback to update status message
 */
export const waitWithStatus = async (
  delayMs: number,
  onStatus?: (message: string) => void
): Promise<void> => {
  if (onStatus) {
    onStatus(`Waiting ${delayMs / 1000} seconds...`);
  }
  await new Promise(resolve => setTimeout(resolve, delayMs));
};
