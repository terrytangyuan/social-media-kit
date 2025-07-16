/**
 * Post content to Twitter (X)
 */
export const postToTwitter = async (
  content: string[],
  accessToken: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    console.log('🔄 Posting to Twitter...');
    const response = await fetch('/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        accessToken
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Twitter post successful:', result);
      const message = content.length > 1 
        ? `Successfully posted Twitter thread with ${content.length} tweets!`
        : 'Successfully posted to Twitter!';
      
      return {
        success: true,
        message,
        data: result
      };
    } else {
      console.error('❌ Twitter post failed:', result);
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please login again.');
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      return {
        success: false,
        message: result.error || 'Failed to post to Twitter'
      };
    }
  } catch (error) {
    console.error('❌ Twitter posting error:', error);
    throw error;
  }
}; 