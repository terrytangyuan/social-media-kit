# Authentication Setup Guide

## Overview
The Social Media Kit supports automatic posting to LinkedIn, X/Twitter, and Bluesky platforms. This guide will help you set up authentication for each platform using the built-in settings UI.

## Getting Started

### 1. Access OAuth Settings
1. Open the Social Media Kit application
2. Click the **⚙️ Settings** button in the top header
3. The OAuth Settings panel will open with configuration options for all platforms

## Platform-Specific Setup

### 1. LinkedIn Authentication

**Setup Steps:**
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new application (or select an existing one)
3. In the Auth tab, configure:
   - Authorized redirect URLs: `http://localhost:5173/auth/linkedin` (for development)
   - For production: `https://yourdomain.com/auth/linkedin`
   - Scopes: `w_member_social` (for posting)
4. Copy your Client ID from the Auth tab
5. **In the app**: 
   - Open ⚙️ Settings
   - Paste your Client ID into the LinkedIn Client ID field
   - Settings are automatically saved

**Example:**
If your LinkedIn client ID is `86abc123def456789`, simply paste it into the LinkedIn Client ID field in the settings.

**How it works:**
- Uses OAuth 2.0 authorization code flow
- Redirects to LinkedIn for authorization
- Posts using LinkedIn's UGC API

### 2. X/Twitter Authentication

**Setup Steps:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new application
3. In the App settings, configure:
   - Callback URLs: `http://localhost:5173/auth/twitter` (for development)
   - For production: `https://yourdomain.com/auth/twitter`
   - Scopes: `tweet.read`, `tweet.write`, `users.read`
4. Copy your Client ID from the app settings
5. **In the app**:
   - Open ⚙️ Settings
   - Paste your Client ID into the X/Twitter Client ID field
   - Settings are automatically saved

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
- **Auto-save**: All settings are automatically saved as you type
- **Reset**: Reset all settings to default values with one click
- **Visual Status**: Platform buttons show green checkmarks (✓) when authenticated

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
- Client IDs are stored locally in your browser
- Tokens are stored locally in your browser
- OAuth flows use secure HTTPS redirects
- App passwords for Bluesky are generated securely by Bluesky
- No sensitive data is transmitted to third parties

## Troubleshooting

### Common Issues:
1. **"CLIENT ID NOT CONFIGURED" error**: 
   - Open ⚙️ Settings and enter your Client ID
   - Make sure you copied the correct Client ID from the developer portal
2. **OAuth redirect fails**: Check that your redirect URLs match exactly
3. **Token expires**: Re-authenticate through the platform login
4. **API errors**: Verify your API permissions and rate limits
5. **CORS issues**: Ensure your app is running on the correct domain

### Development vs Production:
- Update redirect URLs for your production domain in the developer portals
- Use environment variables for sensitive configuration in production
- Implement proper error handling and logging

## Configuration Tips

### For Development:
- Use `http://localhost:5173/auth/linkedin` for LinkedIn redirect URI
- Use `http://localhost:5173/auth/twitter` for Twitter callback URL
- Settings are saved in browser localStorage

### For Production:
- Update redirect URIs to your production domain
- Use HTTPS for all redirect URIs
- Consider implementing server-side token management
- Monitor API usage and rate limits

## Usage Flow
1. Open ⚙️ Settings and configure your Client IDs
2. Select your desired platform
3. Click "Login" if not authenticated
4. Complete authentication flow
5. Write your post content
6. Click "Post to [Platform]" to publish automatically
7. Monitor posting status and progress

The system will automatically handle text chunking, formatting, and posting based on each platform's requirements. All configuration is now done through the user-friendly settings interface - no code editing required! 