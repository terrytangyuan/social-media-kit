import { useState } from 'react';
import { PlatformAuth, PersonMapping } from '../types';
import { postToLinkedIn, postToTwitter, postToBluesky } from '../services';
import { formatForPlatform, chunkText } from '../utils/textFormatting';

export const usePosting = () => {
  const [isPosting, setIsPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<string>('');

  const postToPlatform = async (
    platform: 'linkedin' | 'twitter' | 'bluesky',
    content: string,
    auth: PlatformAuth,
    personMappings: PersonMapping[],
    logout: (platform: 'linkedin' | 'twitter' | 'bluesky') => void
  ): Promise<{ success: boolean; message: string }> => {
    const authData = auth[platform];
    
    if (!authData.isAuthenticated || !authData.accessToken) {
      throw new Error(`Not authenticated with ${platform}`);
    }

    try {
      setIsPosting(true);
      setPostingStatus(`📤 Posting to ${platform}...`);

      // Format content for the platform
      const formattedContent = formatForPlatform(content, platform, personMappings);
      const chunks = chunkText(formattedContent, platform);

      let result;
      switch (platform) {
        case 'linkedin':
          result = await postToLinkedIn(formattedContent, authData.accessToken);
          break;
        case 'twitter':
          result = await postToTwitter(chunks, authData.accessToken);
          break;
        case 'bluesky':
          result = await postToBluesky(chunks, authData.accessToken, authData.userInfo);
          break;
      }

      setPostingStatus(result.message);
      return result;
    } catch (error) {
      console.error(`Error posting to ${platform}:`, error);
      
      // Handle authentication errors by logging out
      if (error.message.includes('Authentication failed')) {
        logout(platform);
        throw new Error(`Authentication expired. You have been logged out. Please login again.`);
      }
      
      throw error;
    } finally {
      setIsPosting(false);
    }
  };

  const postToMultiplePlatforms = async (
    platforms: ('linkedin' | 'twitter' | 'bluesky')[],
    content: string,
    auth: PlatformAuth,
    personMappings: PersonMapping[],
    logout: (platform: 'linkedin' | 'twitter' | 'bluesky') => void
  ) => {
    const results: Array<{
      platform: string;
      success: boolean;
      message: string;
    }> = [];

    setIsPosting(true);

    for (const platform of platforms) {
      try {
        const result = await postToPlatform(platform, content, auth, personMappings, logout);
        results.push({
          platform,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        // For multi-platform posting, handle auth errors differently
        if (error.message.includes('Authentication expired')) {
          logout(platform);
          results.push({
            platform,
            success: false,
            message: `Authentication expired for ${platform}. You have been logged out.`
          });
        } else {
          results.push({
            platform,
            success: false,
            message: error.message
          });
        }
      }
    }

    setIsPosting(false);

    // Create summary message
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let summaryMessage = '';
    if (successful.length > 0) {
      summaryMessage += `✅ Successfully posted to: ${successful.map(r => r.platform).join(', ')}`;
    }
    if (failed.length > 0) {
      if (summaryMessage) summaryMessage += '\n';
      summaryMessage += `❌ Failed to post to: ${failed.map(r => r.platform).join(', ')}`;
    }

    setPostingStatus(summaryMessage);

    return {
      results,
      allSuccessful: failed.length === 0,
      message: summaryMessage
    };
  };

  return {
    isPosting,
    postingStatus,
    setPostingStatus,
    postToPlatform,
    postToMultiplePlatforms
  };
}; 