/**
 * Post content to LinkedIn
 */
export const postToLinkedIn = async (
  content: string,
  accessToken: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    console.log('🔄 Posting to LinkedIn...');
    const response = await fetch('/api/linkedin/post', {
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
      console.log('✅ LinkedIn post successful:', result);
      return {
        success: true,
        message: 'Successfully posted to LinkedIn!',
        data: result
      };
    } else {
      console.error('❌ LinkedIn post failed:', result);
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please login again.');
      }
      
      return {
        success: false,
        message: result.error || 'Failed to post to LinkedIn'
      };
    }
  } catch (error) {
    console.error('❌ LinkedIn posting error:', error);
    throw error;
  }
}; 