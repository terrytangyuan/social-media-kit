import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FormDataLib = require('form-data');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
try {
  const envFile = readFileSync('.env', 'utf8');
  console.log('Loading .env file...');
  envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
        console.log(`Loaded: ${key.trim()} = ${value.substring(0, 10)}...`);
      }
    }
  });
  console.log('LinkedIn Client ID loaded:', process.env.LINKEDIN_CLIENT_ID ? 'YES' : 'NO');
  console.log('LinkedIn Client Secret loaded:', process.env.LINKEDIN_CLIENT_SECRET ? 'YES' : 'NO');
  console.log('Twitter Client ID loaded:', process.env.TWITTER_CLIENT_ID ? 'YES' : 'NO');
  console.log('Twitter Client Secret loaded:', process.env.TWITTER_CLIENT_SECRET ? 'YES' : 'NO');
  console.log('Mastodon Client ID loaded:', process.env.MASTODON_CLIENT_ID ? 'YES' : 'NO');
  console.log('Mastodon Client Secret loaded:', process.env.MASTODON_CLIENT_SECRET ? 'YES' : 'NO');
} catch (error) {
  console.log('Warning: Could not load .env file:', error.message);
}

const app = express();

// Configure multer for handling file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// OAuth configuration endpoint
app.get('/api/oauth/config', (req, res) => {
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
    mastodon: {
      clientId: process.env.MASTODON_CLIENT_ID || '',
      redirectUri: req.get('origin') || 'http://localhost:3000',
      scope: 'read write',
      instanceUrl: process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social'
    },
    bluesky: {
      server: 'https://bsky.social'
    }
  };
  
  res.json(config);
});

// OAuth token exchange endpoint
app.post('/api/oauth/token', async (req, res) => {
  const { platform, code, clientId, redirectUri, instanceUrl } = req.body;
  
  try {
    let tokenUrl;
    let tokenData;
    
    if (platform === 'linkedin') {
      tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      
      // You need to set the LINKEDIN_CLIENT_SECRET environment variable
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      console.log('LinkedIn Client Secret in API call:', clientSecret ? 'FOUND' : 'NOT FOUND');
      console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('LINKEDIN')));
      
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
      
      // Optionally fetch user profile from LinkedIn API (not required for posting)
      console.log('Attempting to fetch LinkedIn user profile (optional)...');
      try {
        // Try the v2 userinfo endpoint (most reliable)
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
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
          // Set a minimal profile to indicate successful authentication
          tokenData.userProfile = { 
            authenticated: true, 
            note: 'Profile fetch failed but posting will still work' 
          };
        }
      } catch (profileError) {
        console.log('LinkedIn profile fetch error (non-critical):', profileError);
        // Set a minimal profile to indicate successful authentication
        tokenData.userProfile = { 
          authenticated: true, 
          note: 'Profile fetch failed but posting will still work' 
        };
      }
      
    } else if (platform === 'twitter') {
      tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      
      // You need to set the TWITTER_CLIENT_SECRET environment variable
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
      
      // Fetch user profile from Twitter API (server-side to avoid CORS issues)
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
    } else if (platform === 'mastodon') {
      if (!instanceUrl) {
        throw new Error('Mastodon instance URL is required');
      }
      
      tokenUrl = `${instanceUrl}/oauth/token`;
      
      // You need to set the MASTODON_CLIENT_SECRET environment variable
      const clientSecret = process.env.MASTODON_CLIENT_SECRET;
      
      if (!clientSecret) {
        throw new Error('Mastodon client secret not configured. Please set MASTODON_CLIENT_SECRET environment variable.');
      }
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: 'read write'
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
        throw new Error(`Mastodon token exchange failed: ${tokenData.error_description || tokenData.error}`);
      }
      
      // Fetch user profile from Mastodon API
      console.log('Fetching Mastodon user profile...');
      try {
        const profileResponse = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        });
        
        if (profileResponse.ok) {
          const userProfile = await profileResponse.json();
          console.log('Mastodon profile fetched successfully');
          tokenData.userProfile = userProfile;
          tokenData.instanceUrl = instanceUrl; // Store instance URL for later use
        } else {
          console.warn('Failed to fetch Mastodon profile, but token exchange succeeded');
          tokenData.userProfile = null;
          tokenData.instanceUrl = instanceUrl;
        }
      } catch (profileError) {
        console.error('Error fetching Mastodon profile:', profileError);
        tokenData.userProfile = null;
        tokenData.instanceUrl = instanceUrl;
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

// LinkedIn posting endpoint
app.post('/api/linkedin/post', upload.any(), async (req, res) => {
  try {
    const { content, accessToken, imageCount } = req.body;
    
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
    
    const postData = {
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
    };
    
    // Handle image uploads if present
    if (req.files && req.files.length > 0) {
      console.log(`📷 Uploading ${req.files.length} images to LinkedIn...`);
      
      // Note: LinkedIn image upload is complex and requires multiple API calls
      // For now, we'll just post without images and log a warning
      console.warn('⚠️ LinkedIn image uploads not yet implemented on server side');
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
      body: JSON.stringify(postData)
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

// Twitter posting endpoint
app.post('/api/twitter/post', upload.any(), async (req, res) => {
  try {
    const { content, accessToken, replyToTweetId, imageCount } = req.body;
    
    if (!content || !accessToken) {
      return res.status(400).json({ error: 'Content and access token are required' });
    }
    
    console.log('📤 Posting to Twitter via server...');
    
    const mediaIds = [];
    
    // Handle image uploads if present
    if (req.files && req.files.length > 0) {
      console.log(`📷 Uploading ${req.files.length} images to Twitter...`);
      
      for (const file of req.files) {
        try {
          // Upload media to Twitter - Twitter requires specific FormData format
          const mediaFormData = new FormDataLib();
          mediaFormData.append('media', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
          });
          
          const mediaResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...mediaFormData.getHeaders()
            },
            body: mediaFormData
          });
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            mediaIds.push(mediaData.media_id_string);
            console.log(`✅ Uploaded image to Twitter: ${mediaData.media_id_string}`);
          } else {
            console.warn(`❌ Failed to upload image to Twitter:`, await mediaResponse.text());
          }
        } catch (uploadError) {
          console.warn('❌ Error uploading image to Twitter:', uploadError);
        }
      }
    }
    
    const tweetData = {
      text: content
    };
    
    // Add media if any were uploaded successfully
    if (mediaIds.length > 0) {
      tweetData.media = {
        media_ids: mediaIds
      };
    }
    
    // Add reply field if this is a reply to another tweet
    if (replyToTweetId) {
      tweetData.reply = {
        in_reply_to_tweet_id: replyToTweetId
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
      return res.status(response.status).json({ 
        error: 'Twitter API error', 
        details: errorData,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    const result = await response.json();
    console.log('✅ Twitter post successful:', result);
    
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('❌ Twitter posting error:', error);
    res.status(500).json({ 
      error: 'Twitter posting failed', 
      details: error.message 
    });
  }
});

// Mastodon posting endpoint
app.post('/api/mastodon/post', upload.any(), async (req, res) => {
  try {
    const { content, accessToken, instanceUrl, replyToStatusId, imageCount } = req.body;
    
    if (!content || !accessToken || !instanceUrl) {
      return res.status(400).json({ error: 'Content, access token, and instance URL are required' });
    }
    
    console.log('📤 Posting to Mastodon via server...');
    
    const mediaIds = [];
    
    // Handle image uploads if present
    if (req.files && req.files.length > 0) {
      console.log(`📷 Uploading ${req.files.length} images to Mastodon...`);
      
      for (const file of req.files) {
        try {
          // Upload media to Mastodon - try with built-in FormData
          const mediaFormData = new FormData();
          
          // Create a Blob from the buffer
          const fileBlob = new Blob([file.buffer], { type: file.mimetype });
          
          mediaFormData.append('file', fileBlob, file.originalname);
          mediaFormData.append('description', 'Image uploaded via social-media-kit');
          
          const uploadUrl = `${instanceUrl}/api/v1/media`;
          
          const mediaResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`
              // Let fetch automatically set Content-Type for FormData
            },
            body: mediaFormData
          });
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            mediaIds.push(mediaData.id);
            console.log(`✅ Uploaded image to Mastodon: ${mediaData.id}`);
          } else {
            const errorText = await mediaResponse.text();
            console.warn(`❌ Failed to upload image to Mastodon (${mediaResponse.status} ${mediaResponse.statusText}):`, errorText);
          }
        } catch (uploadError) {
          console.warn('❌ Error uploading image to Mastodon:', uploadError);
        }
      }
    }
    
    const statusData = {
      status: content
    };
    
    // Add media if any were uploaded successfully
    if (mediaIds.length > 0) {
      statusData.media_ids = mediaIds;
    }
    
    // Add reply field if this is a reply to another status
    if (replyToStatusId) {
      statusData.in_reply_to_id = replyToStatusId;
    }
    
    const response = await fetch(`${instanceUrl}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Mastodon API error:', response.status, response.statusText, errorData);
      return res.status(response.status).json({ 
        error: 'Mastodon API error', 
        details: errorData,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    const result = await response.json();
    console.log('✅ Mastodon post successful:', result);
    
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('❌ Mastodon posting error:', error);
    res.status(500).json({ 
      error: 'Mastodon posting failed', 
      details: error.message 
    });
  }
});

// Scheduled posting endpoint for server-side reliability
app.post('/api/schedule/post', async (req, res) => {
  try {
    const { 
      postId, 
      content, 
      platforms, 
      scheduleTime, 
      timezone, 
      images,
      platformImageSelections,
      authTokens 
    } = req.body;
    
    if (!postId || !content || !platforms || !scheduleTime || !authTokens) {
      return res.status(400).json({ 
        error: 'Missing required fields: postId, content, platforms, scheduleTime, authTokens' 
      });
    }
    
    console.log(`📅 Scheduling post "${postId}" for ${scheduleTime} to platforms:`, platforms);
    
    // Calculate delay until scheduled time
    const now = new Date();
    const targetTime = new Date(scheduleTime);
    const delay = targetTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      return res.status(400).json({ 
        error: 'Scheduled time must be in the future' 
      });
    }
    
    // Store the scheduled post (in a real app, you'd use a database)
    // For now, we'll just set a timeout
    setTimeout(async () => {
      try {
        console.log(`🤖 Executing scheduled post "${postId}"`);
        
        const results = [];
        
        for (const platform of platforms) {
          const accessToken = authTokens[platform];
          if (!accessToken) {
            console.warn(`❌ No auth token for ${platform}, skipping`);
            continue;
          }
          
          try {
            let result;
            
            switch (platform) {
              case 'linkedin': {
                // Use existing LinkedIn posting logic
                const linkedinResponse = await fetch(`${req.protocol}://${req.get('host')}/api/linkedin/post`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    content,
                    accessToken,
                    imageCount: 0 // TODO: Handle images in scheduled posts
                  })
                });
                result = await linkedinResponse.json();
                break;
              }
                
              case 'twitter': {
                const twitterResponse = await fetch(`${req.protocol}://${req.get('host')}/api/twitter/post`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    content,
                    accessToken,
                    imageCount: 0
                  })
                });
                result = await twitterResponse.json();
                break;
              }
                
              case 'mastodon': {
                const mastodonResponse = await fetch(`${req.protocol}://${req.get('host')}/api/mastodon/post`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    content,
                    accessToken: authTokens.mastodon.accessToken,
                    instanceUrl: authTokens.mastodon.instanceUrl,
                    imageCount: 0
                  })
                });
                result = await mastodonResponse.json();
                break;
              }
                
              case 'bluesky':
                // Bluesky posting would need to be implemented server-side
                console.warn('⚠️ Bluesky server-side posting not yet implemented');
                continue;
            }
            
            results.push({
              platform,
              success: result.success || false,
              result: result.data || result,
              error: result.error || null
            });
            
            console.log(`✅ Posted to ${platform} successfully`);
            
          } catch (error) {
            console.error(`❌ Failed to post to ${platform}:`, error);
            results.push({
              platform,
              success: false,
              error: error.message
            });
          }
        }
        
        console.log(`🎉 Scheduled post "${postId}" execution completed:`, results);
        
        // In a real app, you might want to notify the client via WebSocket or store results
        
      } catch (error) {
        console.error(`❌ Scheduled post execution failed for "${postId}":`, error);
      }
    }, delay);
    
    res.json({ 
      success: true, 
      message: `Post scheduled successfully for ${targetTime.toISOString()}`,
      delay: Math.round(delay / 1000) // seconds
    });
    
  } catch (error) {
    console.error('❌ Schedule post error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule post', 
      details: error.message 
    });
  }
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
}); 