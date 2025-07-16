import express from 'express';

const router = express.Router();

// OAuth configuration endpoint
router.get('/config', (req, res) => {
  const config = {
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      redirectUri: req.get('origin') || 'http://localhost:3000',
      scope: 'w_member_social',
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization'
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      redirectUri: req.get('origin') || 'http://localhost:3000',
      scope: 'tweet.read tweet.write users.read',
      authUrl: 'https://twitter.com/i/oauth2/authorize'
    },
    bluesky: {
      server: 'https://bsky.social'
    }
  };
  
  res.json(config);
});

// OAuth token exchange endpoint
router.post('/token', async (req, res) => {
  const { platform, code, clientId, redirectUri } = req.body;
  
  try {
    let tokenUrl;
    let tokenData;
    
    if (platform === 'linkedin') {
      tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      console.log('LinkedIn Client Secret in API call:', clientSecret ? 'FOUND' : 'NOT FOUND');
      
      if (!clientSecret) {
        throw new Error('LinkedIn client secret not configured. Please set LINKEDIN_CLIENT_SECRET environment variable.');
      }
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      });
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });
      
      tokenData = await response.json();
      
      if (!response.ok) {
        throw new Error(`LinkedIn token exchange failed: ${tokenData.error_description || tokenData.error}`);
      }
      
      // Fetch user profile from LinkedIn API (optional)
      console.log('Attempting to fetch LinkedIn user profile (optional)...');
      try {
        let profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        });
        
        console.log('LinkedIn userinfo response status:', profileResponse.status);
        
        if (profileResponse.ok) {
          const userProfile = await profileResponse.json();
          console.log('LinkedIn profile fetched successfully:', userProfile);
          tokenData.userProfile = userProfile;
        } else {
          const errorText = await profileResponse.text();
          console.log('LinkedIn profile fetch failed (non-critical):', profileResponse.status, errorText);
          tokenData.userProfile = { 
            authenticated: true, 
            note: 'Profile fetch failed but posting will still work' 
          };
        }
      } catch (profileError) {
        console.log('LinkedIn profile fetch error (non-critical):', profileError);
        tokenData.userProfile = { 
          authenticated: true, 
          note: 'Profile fetch failed but posting will still work' 
        };
      }
      
    } else if (platform === 'twitter') {
      tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;
      
      if (!clientSecret) {
        throw new Error('Twitter client secret not configured. Please set TWITTER_CLIENT_SECRET environment variable.');
      }
      
      // Twitter requires PKCE - get code_verifier from request
      const codeVerifier = req.body.codeVerifier;
      if (!codeVerifier) {
        throw new Error('Twitter OAuth requires PKCE code_verifier');
      }
      
      console.log('🔐 Twitter PKCE code verifier received:', {
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        length: codeVerifier.length
      });
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: params
      });
      
      tokenData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Twitter token exchange failed: ${tokenData.error_description || tokenData.error}`);
      }
      
      // Fetch user profile from Twitter API
      console.log('Fetching Twitter user profile...');
      try {
        const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        });
        
        if (profileResponse.ok) {
          const userProfile = await profileResponse.json();
          console.log('Twitter profile fetched successfully');
          tokenData.userProfile = userProfile;
        } else {
          console.warn('Failed to fetch Twitter profile, but token exchange succeeded');
          tokenData.userProfile = null;
        }
      } catch (profileError) {
        console.error('Error fetching Twitter profile:', profileError);
        tokenData.userProfile = null;
      }
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    res.json(tokenData);
    
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    res.status(500).json({ 
      error: 'Token exchange failed', 
      details: error.message 
    });
  }
});

export default router; 