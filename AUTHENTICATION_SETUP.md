# Authentication Setup Guide

## Overview
The Social Media Kit supports automatic posting to LinkedIn, X/Twitter, and Bluesky platforms. This guide will help you set up authentication for each platform using the built-in settings UI.

## ⚠️ Important: Backend Setup Required

**LinkedIn and Twitter authentication requires a backend service to securely complete OAuth flows.**

Before setting up authentication, you must:
1. **Follow the [OAuth Backend Setup Guide](oauth-setup.md)** to set up the backend server
2. Get your LinkedIn and Twitter client secrets
3. Start the backend server

## Getting Started

### 1. Set Up Backend (Required for LinkedIn/Twitter)
1. Follow the complete setup guide in [oauth-setup.md](oauth-setup.md)
2. Install dependencies: `npm install`
3. Create `.env` file with your client secrets
4. Start the backend server: `npm run server`

### 2. Access OAuth Settings
1. Open the Social Media Kit application at `http://localhost:3000`
2. Click the **⚙️ Settings** button in the top header
3. The OAuth Settings panel will open with configuration options for all platforms

## Platform-Specific Setup

### 1. LinkedIn Authentication

**Setup Steps:**
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new application (or select an existing one)
3. In the Auth tab, configure:
   - Authorized redirect URLs: `http://localhost:3000` (for development)
   - For production: `https://yourdomain.com` (NOT `/auth/linkedin`)
   - Scopes: `w_member_social` (for posting)
4. Copy your Client ID and Client Secret from the Auth tab
5. **Add to .env file**: 
   - `LINKEDIN_CLIENT_ID=your_client_id_here`
   - `LINKEDIN_CLIENT_SECRET=your_client_secret_here`
6. **Restart the server** to load the new configuration

**Example:**
If your LinkedIn client ID is `86abc123def456789`, add this to your .env file:
```
LINKEDIN_CLIENT_ID=86abc123def456789
LINKEDIN_CLIENT_SECRET=your_client_secret_here
```

**How it works:**
- Uses OAuth 2.0 authorization code flow
- Redirects to LinkedIn for authorization
- Posts using LinkedIn's UGC API

### 2. X/Twitter Authentication

**Setup Steps:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new application
3. In the App settings, configure:
   - Callback URLs: `http://localhost:3000` (for development)
   - For production: `https://yourdomain.com` (NOT `/auth/twitter`)
   - Scopes: `tweet.read`, `tweet.write`, `users.read`
4. Copy your Client ID and Client Secret from the app settings
5. **Add to .env file**: 
   - `TWITTER_CLIENT_ID=your_client_id_here`
   - `TWITTER_CLIENT_SECRET=your_client_secret_here`
6. **Restart the server** to load the new configuration

**How it works:**
- Uses OAuth 2.0 authorization code flow
- Redirects to X/Twitter for authorization
- Posts using Twitter API v2

### 3. Bluesky Authentication

**Setup Steps:**
1. Go to your Bluesky settings
2. Navigate to "App Passwords"
3. Create a new app password
4. Use your Bluesky handle and app password to authenticate directly in the app

**Configuration:**
- **In the app**: Open ⚙️ Settings
- The Bluesky server is pre-configured to `https://bsky.social`
- You can change this if using a different Bluesky server
- Authentication is done per-session using handle and app password

**How it works:**
- Uses Bluesky's AT Protocol authentication
- Requires handle and app password (no OAuth needed)
- Posts using Bluesky's API

## Features

### Settings Management
- **⚙️ Settings Button**: Click to open/close OAuth configuration panel
- **Environment Configuration**: Client IDs are configured in .env file and loaded by server
- **Visual Status**: Platform buttons show green checkmarks (✓) when authenticated
- **Real-time Status**: OAuth settings panel shows current configuration status

### Authentication Status
- Visual indicators show connection status for each platform
- Green checkmarks (✓) appear next to connected platforms
- Connection status displayed below platform selection

### Automatic Posting
- When authenticated, the "Copy" button becomes a "Post" button
- Supports multi-part posts (automatic chunking based on platform limits)
- Real-time posting status with progress indicators
- Automatic delays between multi-part posts

### Authentication Persistence
- OAuth settings are stored in localStorage
- Authentication tokens are stored in localStorage
- Automatic re-authentication when tokens expire
- Secure token management

## Platform Limits
- **LinkedIn**: 3,000 characters
- **X/Twitter**: 280 characters
- **Bluesky**: 300 characters

## Security Notes
- Client IDs are stored securely in server environment (.env file)
- Client secrets are stored securely in server environment (.env file)
- Tokens are stored locally in your browser
- OAuth flows use secure HTTPS redirects
- App passwords for Bluesky are generated securely by Bluesky
- No sensitive data is transmitted to third parties

## Troubleshooting

### Common Issues:
1. **"The redirect_uri does not match the registered value"**:
   - Most common issue! In your developer portal, set redirect URI to: `http://localhost:3000`
   - Do NOT include `/auth/linkedin` or `/auth/twitter` - just the base URL
   - The app uses the current page's origin as the redirect URI
2. **"CLIENT ID NOT CONFIGURED" error**: 
   - Add your Client ID to the .env file (e.g., `LINKEDIN_CLIENT_ID=your_client_id_here`)
   - Restart the server to load the new configuration
   - Make sure you copied the correct Client ID from the developer portal
3. **OAuth redirect fails**: Check that your redirect URLs match exactly
4. **Token expires**: Re-authenticate through the platform login
5. **API errors**: Verify your API permissions and rate limits
6. **CORS issues**: Ensure your app is running on the correct domain

### Development vs Production:
- Update redirect URLs for your production domain in the developer portals
- Use environment variables for sensitive configuration in production
- Implement proper error handling and logging

## Configuration Tips

### For Development:
- Use `http://localhost:3000` for LinkedIn redirect URI
- Use `http://localhost:3000` for Twitter callback URL
- Client IDs are configured in .env file and loaded by server

### For Production:
- Update redirect URIs to your production domain
- Use HTTPS for all redirect URIs
- Consider implementing server-side token management
- Monitor API usage and rate limits

## Usage Flow
1. **Configure environment**: Add your Client IDs to the .env file
2. **Start the backend server**: `npm run server`
3. **Open the app**: Navigate to `http://localhost:3000`
4. **Check settings**: Open ⚙️ Settings to verify configuration status
5. **Select platform**: Choose your desired platform
6. **Authenticate**: Click "Login" if not authenticated
7. **Complete OAuth flow**: Follow the secure authentication process
8. **Write content**: Create your post content
9. **Post automatically**: Click "Post to [Platform]" to publish
10. **Monitor progress**: Track posting status and progress

The system will automatically handle text chunking, formatting, and posting based on each platform's requirements. The backend server ensures secure OAuth flows while the frontend provides a user-friendly interface - no code editing required! 