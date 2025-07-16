/**
 * Authenticate with Bluesky
 */
export const authenticateBluesky = async (
  handle: string,
  appPassword: string,
  server: string = 'https://bsky.social'
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; userInfo?: any; error?: string }> => {
  try {
    console.log('🔄 Authenticating with Bluesky...');
    const response = await fetch(`${server}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: handle,
        password: appPassword
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bluesky authentication successful');
      return {
        success: true,
        accessToken: data.accessJwt,
        refreshToken: data.refreshJwt,
        userInfo: data
      };
    } else {
      const errorData = await response.json();
      console.error('❌ Bluesky authentication failed:', errorData);
      return {
        success: false,
        error: errorData.message || 'Authentication failed'
      };
    }
  } catch (error) {
    console.error('❌ Bluesky authentication error:', error);
    return {
      success: false,
      error: 'Network error during authentication'
    };
  }
};

/**
 * Post content to Bluesky
 */
export const postToBluesky = async (
  content: string[],
  accessToken: string,
  userInfo: any,
  server: string = 'https://bsky.social'
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    console.log('🔄 Posting to Bluesky...');
    
    const posts = [];
    let replyRef = null;

    for (let i = 0; i < content.length; i++) {
      const postData: any = {
        $type: 'app.bsky.feed.post',
        text: content[i],
        createdAt: new Date().toISOString()
      };

      // Add reply reference for threaded posts
      if (replyRef) {
        postData.reply = replyRef;
      }

      const response = await fetch(`${server}/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          repo: userInfo.did,
          collection: 'app.bsky.feed.post',
          record: postData
        })
      });

      if (response.ok) {
        const result = await response.json();
        posts.push(result);
        
        // Set up reply reference for next post in thread
        if (i === 0) {
          replyRef = {
            root: {
              uri: result.uri,
              cid: result.cid
            },
            parent: {
              uri: result.uri,
              cid: result.cid
            }
          };
        } else {
          replyRef.parent = {
            uri: result.uri,
            cid: result.cid
          };
        }
        
        console.log(`✅ Bluesky post ${i + 1}/${content.length} successful`);
      } else {
        const errorData = await response.json();
        console.error(`❌ Bluesky post ${i + 1} failed:`, errorData);
        throw new Error(`Failed to post part ${i + 1}: ${errorData.message || 'Unknown error'}`);
      }
    }

    const message = content.length > 1 
      ? `Successfully posted Bluesky thread with ${content.length} posts!`
      : 'Successfully posted to Bluesky!';

    return {
      success: true,
      message,
      data: posts
    };
  } catch (error) {
    console.error('❌ Bluesky posting error:', error);
    throw error;
  }
}; 