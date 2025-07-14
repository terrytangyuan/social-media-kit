import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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
} catch (error) {
  console.log('Warning: Could not load .env file:', error.message);
}

const app = express();

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
    bluesky: {
      server: 'https://bsky.social'
    }
  };
  
  res.json(config);
});

// OAuth token exchange endpoint
app.post('/api/oauth/token', async (req, res) => {
  const { platform, code, clientId, redirectUri } = req.body;
  
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
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: 'challenge' // Twitter requires PKCE
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