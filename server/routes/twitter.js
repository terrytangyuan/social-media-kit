import express from 'express';

const router = express.Router();

// Twitter posting endpoint
router.post('/post', async (req, res) => {
  try {
    const { content, accessToken, replyToTweetId } = req.body;
    
    if (!content || !accessToken) {
      return res.status(400).json({ error: 'Content and access token are required' });
    }
    
    console.log('📤 Posting to Twitter via server...');
    
    // Handle array of content for threading
    const contentArray = Array.isArray(content) ? content : [content];
    const results = [];
    let previousTweetId = replyToTweetId;
    
    for (let i = 0; i < contentArray.length; i++) {
      const tweetText = contentArray[i];
      console.log(`📤 Posting tweet ${i + 1}/${contentArray.length}:`, tweetText.substring(0, 50) + '...');
      
      const tweetData = {
        text: tweetText
      };
      
      // Add reply field if this is a reply to another tweet
      if (previousTweetId) {
        tweetData.reply = {
          in_reply_to_tweet_id: previousTweetId
        };
      }
      
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tweetData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Twitter API error:', response.status, response.statusText, errorData);
        
        // Parse Twitter error for specific error types
        let errorMessage = 'Twitter API error';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].message || errorMessage;
          }
        } catch (parseError) {
          // Use default error message if parsing fails
        }
        
        return res.status(response.status).json({ 
          error: errorMessage, 
          details: errorData,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      const result = await response.json();
      results.push(result);
      
      // Set up for next tweet in thread
      if (result.data && result.data.id) {
        previousTweetId = result.data.id;
        console.log(`✅ Tweet ${i + 1} posted successfully. ID: ${result.data.id}`);
      }
    }
    
    console.log('✅ Twitter posting completed:', {
      totalTweets: results.length,
      isThread: results.length > 1
    });
    
    res.json({ 
      success: true, 
      data: results,
      tweetCount: results.length,
      isThread: results.length > 1
    });
    
  } catch (error) {
    console.error('❌ Twitter posting error:', error);
    res.status(500).json({ 
      error: 'Twitter posting failed', 
      details: error.message 
    });
  }
});

export default router; 