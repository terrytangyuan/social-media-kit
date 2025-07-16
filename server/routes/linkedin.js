import express from 'express';

const router = express.Router();

// LinkedIn posting endpoint
router.post('/post', async (req, res) => {
  try {
    const { content, accessToken } = req.body;
    
    if (!content || !accessToken) {
      return res.status(400).json({ error: 'Content and access token are required' });
    }
    
    console.log('📤 Posting to LinkedIn via server...');
    
    // Try to get the authenticated user's profile to get their URN
    let userUrn = 'urn:li:person:~'; // Default fallback
    
    try {
      // Try the /v2/people/~ endpoint first
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202506'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        userUrn = profileData.id;
        console.log('✅ Got user URN from profile:', userUrn);
      } else {
        console.log('⚠️ Could not get user profile, trying /v2/userinfo...');
        
        // Try the userinfo endpoint as backup
        const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202506'
          }
        });
        
        if (userinfoResponse.ok) {
          const userinfoData = await userinfoResponse.json();
          userUrn = userinfoData.sub;
          console.log('✅ Got user URN from userinfo:', userUrn);
        } else {
          console.log('⚠️ Could not get user info, using fallback URN');
        }
      }
    } catch (profileError) {
      console.log('⚠️ Profile fetch error, using fallback:', profileError.message);
    }
    
    // Use the newer LinkedIn Posts API with correct format
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202506'
      },
      body: JSON.stringify({
        author: userUrn,
        commentary: content,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ LinkedIn API error:', response.status, response.statusText, errorData);
      console.error('🔍 Request details:', {
        url: 'https://api.linkedin.com/rest/posts',
        method: 'POST',
        author: userUrn,
        contentLength: content.length
      });
      return res.status(response.status).json({ 
        error: 'LinkedIn API error', 
        details: errorData,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    const result = await response.json();
    console.log('✅ LinkedIn post successful:', result);
    
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('❌ LinkedIn posting error:', error);
    res.status(500).json({ 
      error: 'LinkedIn posting failed', 
      details: error.message 
    });
  }
});

export default router; 