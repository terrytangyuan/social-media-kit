# Complete Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create a `.env` file in the root directory:
```env
# LinkedIn OAuth (Required)
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here

# Twitter OAuth (Required)
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Server Configuration
PORT=3000
```

### 3. Get Your OAuth Credentials
Follow the [Platform Setup](#platform-setup) section below to get your credentials.

### 4. Start the Application
```bash
npm start
```

### 5. Open the App
Navigate to `http://localhost:3000` and start using the app!

## 🔧 Platform Setup

### LinkedIn Authentication

**Required Permissions & Products:**
Your LinkedIn application **must** have these products enabled and approved:

**Essential Products (Required for posting):**
- ✅ **"Sign In with LinkedIn using OpenID Connect"** - Required for user authentication
- ✅ **"Share on LinkedIn"** - Required for posting content to LinkedIn

**Required OAuth Scopes:**
- ✅ `w_member_social` - Write access to post content on behalf of the user

**Setup Steps:**
1. **Create LinkedIn App**:
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Create a new application or select an existing one
   - Fill in all required application details

2. **Configure Authentication**:
   - Go to the **Auth** tab in your LinkedIn app
   - Set **Authorized redirect URLs**: `http://localhost:3000` (for development)
   - For production: `https://yourdomain.com` (use your actual domain)
   - **Important**: Do NOT include `/auth/linkedin` in the URL

3. **Enable Required Products**:
   - Go to the **Products** tab
   - Request access to **"Sign In with LinkedIn using OpenID Connect"**
   - Request access to **"Share on LinkedIn"**
   - Wait for approval (usually instant for these products)

4. **Configure Scopes**:
   - In the **Auth** tab, ensure `w_member_social` scope is selected
   - This scope allows posting content on behalf of the authenticated user

5. **Get Credentials**:
   - Copy your **Client ID** and **Client Secret** from the Auth tab
   - Add to your `.env` file:
     ```env
     LINKEDIN_CLIENT_ID=your_client_id_here
     LINKEDIN_CLIENT_SECRET=your_client_secret_here
     ```

### Twitter/X Authentication

**Required Permissions & Configuration:**
Your Twitter application **must** be configured with specific settings for posting to work:

**Essential App Configuration:**
- ✅ **App Type**: "Web App, Automated App or Bot" (NOT "Confidential Client")
- ✅ **Authentication**: OAuth 2.0 must be enabled
- ✅ **User Authentication**: OAuth 2.0 User Context must be supported

**Required Permissions:**
- ✅ **Read and Write** - Required for reading user info and posting tweets
- ✅ **Tweet permissions**: Must include both read and write access

**Required OAuth Scopes:**
- ✅ `tweet.read` - Read access to tweets
- ✅ `tweet.write` - Write access to create tweets  
- ✅ `users.read` - Read access to user information

**Setup Steps:**
1. **Create Twitter App**:
   - Go to [Twitter Developer Portal](https://developer.twitter.com/)
   - Create a new application in your developer account
   - Fill in all required application details

2. **Configure App Type & Authentication**:
   - In **App Settings**, set **App Type** to "Web App, Automated App or Bot"
   - **Critical**: Do NOT select "Confidential Client"
   - Enable **OAuth 2.0** authentication
   - Ensure **User authentication settings** are configured

3. **Set Permissions**:
   - Go to **App permissions** section
   - Select **Read and Write** permissions
   - Ensure tweet permissions include both read and write access

4. **Configure OAuth Settings**:
   - In **User authentication settings**:
     - **App permissions**: Read and Write
     - **Type of App**: Web App, Automated App or Bot
     - **Callback URI**: `http://localhost:3000` (for development)
     - **Website URL**: `http://localhost:3000`
   - For production: use `https://yourdomain.com`
   - **Important**: Do NOT include `/auth/twitter` in the URL

5. **Configure Scopes**:
   - Ensure these scopes are selected:
     - `tweet.read` (read tweets)
     - `tweet.write` (create tweets)
     - `users.read` (read user profile)

6. **Get Credentials**:
   - Go to **Keys and tokens** tab
   - Copy your **Client ID** and **Client Secret** (for OAuth 2.0 tweet posting)
   - Copy your **API Key**, **API Secret**, **Access Token**, and **Access Token Secret** (for OAuth 1.0a media uploads)
   - Add to your `.env` file:
     ```env
     # OAuth 2.0 credentials (for tweet posting)
     TWITTER_CLIENT_ID=your_client_id_here
     TWITTER_CLIENT_SECRET=your_client_secret_here
     
     # OAuth 1.0a credentials (for media uploads)
     TWITTER_API_KEY=your_api_key_here
     TWITTER_API_SECRET=your_api_secret_here
     TWITTER_ACCESS_TOKEN=your_access_token_here
     TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
     ```

**Important**: For **image uploads** to work, you need both OAuth 2.0 AND OAuth 1.0a credentials:
- **OAuth 2.0** (Client ID/Secret) is used for posting tweets and user authentication
- **OAuth 1.0a** (API Key/Secret + Access Token/Secret) is used for uploading media files

### Bluesky Authentication

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

## 🖥️ Server Setup

### Backend Requirements
**LinkedIn and Twitter authentication requires a backend service to securely complete OAuth flows.**

The server provides:
- **Frontend**: Serves the built React app at `http://localhost:3000`
- **OAuth API**: Token exchange endpoint at `http://localhost:3000/api/oauth/token`
- **LinkedIn Posting**: Server-side endpoint at `http://localhost:3000/api/linkedin/post`
- **Twitter Posting**: Server-side endpoint at `http://localhost:3000/api/twitter/post`
- **Secure OAuth flows**: Handle LinkedIn and Twitter authentication flows securely

### Production Mode (Recommended)
```bash
# Build and start the unified production server
npm start
```

### Development Mode
```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend dev server (in another terminal)
npm run dev
```

## 🔐 Security Notes

- **Never commit your `.env` file** to version control
- Client secrets are stored securely on the server
- OAuth flows follow security best practices
- Tokens are exchanged server-to-server
- All posting goes through secure server endpoints
- App passwords for Bluesky are generated securely by Bluesky
- No sensitive data is transmitted to third parties

## 📝 Complete Setup Checklist

### Prerequisites
- [ ] Node.js (version 16 or higher)
- [ ] npm (comes with Node.js)

### Environment Setup
- [ ] `.env` file created
- [ ] LinkedIn Client ID added to `.env`
- [ ] LinkedIn Client Secret added to `.env`
- [ ] Twitter Client ID added to `.env`
- [ ] Twitter Client Secret added to `.env`

### LinkedIn Developer Portal
- [ ] Application created
- [ ] "Sign In with LinkedIn using OpenID Connect" product enabled
- [ ] "Share on LinkedIn" product enabled
- [ ] Redirect URI set to `http://localhost:3000`
- [ ] Client ID and Secret copied

### Twitter Developer Portal
- [ ] Application created
- [ ] App Type set to "Web App, Automated App or Bot"
- [ ] OAuth 2.0 enabled
- [ ] Permissions set to "Read and Write"
- [ ] Callback URL set to `http://localhost:3000`
- [ ] Client ID and Secret copied

### Testing
- [ ] Server starts successfully with `npm start`
- [ ] App loads at `http://localhost:3000`
- [ ] LinkedIn authentication works
- [ ] Twitter authentication works
- [ ] LinkedIn posting works
- [ ] Twitter posting works

## 🎯 Usage Guide

### Getting Started
1. **Configure environment**: Complete the setup checklist above
2. **Start the server**: `npm start`
3. **Open the app**: Navigate to `http://localhost:3000`
4. **Check settings**: Click ⚙️ Settings to verify configuration status
5. **Authenticate**: Click platform buttons to authenticate with each service

### Using the App
1. **Select platform**: Choose your desired platform(s)
2. **Write content**: Create your post content in the main text area
3. **Format text**: Use `**bold**` and `_italic_` formatting
4. **Add emojis**: Click the 😊 Emojis button to add emojis
5. **Post content**: Click "Post to [Platform]" to publish
6. **Monitor progress**: Watch real-time posting status

### Features
- **Settings Management**: ⚙️ Settings button opens OAuth configuration panel
- **Visual Status**: Platform buttons show green checkmarks (✓) when authenticated
- **Real-time Status**: OAuth settings panel shows current configuration status
- **Automatic Posting**: When authenticated, "Copy" button becomes "Post" button
- **Multi-part Posts**: Automatic chunking based on platform limits
- **Authentication Persistence**: OAuth settings and tokens stored in localStorage

### Platform Limits
- **LinkedIn**: 3,000 characters
- **X/Twitter**: 280 characters (25,000 with X Premium) - automatically creates threads for longer content
- **Bluesky**: 300 characters

## 🐛 Troubleshooting

### Common Authentication Issues

1. **"The redirect_uri does not match the registered value"**:
   - **Most common issue!** In your developer portal, set redirect URI to exactly: `http://localhost:3000`
   - Do NOT include `/auth/linkedin` or `/auth/twitter` - just the base URL
   - For production, use your exact domain: `https://yourdomain.com`

2. **"CLIENT ID NOT CONFIGURED" error**: 
   - Add your Client ID to the `.env` file (e.g., `LINKEDIN_CLIENT_ID=your_client_id_here`)
   - Restart the server with `npm start` to load the new configuration
   - Verify you copied the correct Client ID from the developer portal

3. **LinkedIn posting returns 403 Forbidden**: 
   - **Check Required Products**: Ensure "Share on LinkedIn" product is enabled and approved
   - **Verify Permissions**: Confirm `w_member_social` scope is configured
   - **Product Approval**: Some LinkedIn products require manual approval

4. **Twitter "Unsupported Authentication" error**: 
   - **Check App Type**: Must be "Web App, Automated App or Bot" (NOT "Confidential Client")
   - **Verify OAuth Context**: Ensure your app supports "OAuth 2.0 User Context"
   - **Check Permissions**: Must have "Read and Write" permissions enabled

5. **"code verifier mismatch" (Twitter PKCE errors)**: 
   - ✅ **FIXED** in v0.2.0 - Clear browser cache if still occurring
   - Clear browser localStorage and cookies
   - Restart the authentication process

6. **"Invalid Client" or authentication errors**:
   - Verify Client ID and Client Secret are correct
   - Check that credentials haven't expired or been regenerated
   - Ensure environment variables are loaded correctly

7. **OAuth redirect fails**: 
   - Verify redirect URLs match exactly in developer portals
   - Check that your app domain is correctly configured
   - Ensure HTTPS is used in production

8. **Token expires or invalid token errors**: 
   - Re-authenticate through the platform login
   - Clear browser localStorage if tokens seem corrupted
   - Check token expiration times

### Server Issues

1. **Port 3000 in use**: 
   - Kill existing processes: `sudo lsof -ti:3000 | xargs sudo kill -9`
   - Change the PORT in your `.env` file if 3000 is already in use

2. **Environment variables not loading**: 
   - Ensure `.env` file exists and restart server
   - Use `npm start` to ensure proper environment loading

3. **Module not found**: 
   - Run `npm install` to install dependencies

4. **CORS errors during posting**: 
   - ✅ **FIXED** with server-side endpoints
   - LinkedIn posts go through `/api/linkedin/post`
   - Twitter posts go through `/api/twitter/post`

### Development vs Production

- **Development**: Use `http://localhost:3000` for all redirect URIs
- **Production**: Update redirect URIs to your production domain with HTTPS
- Use environment variables for sensitive configuration in production
- Implement proper error handling and logging

## 📊 API Endpoints

The server provides these endpoints:

- `GET /api/oauth/config` - OAuth configuration
- `POST /api/oauth/token` - OAuth token exchange
- `POST /api/linkedin/post` - LinkedIn posting (✅ New in v0.2.0)
- `POST /api/twitter/post` - Twitter posting (✅ New in v0.2.0)

## 🏗️ Architecture

```
Frontend (React) → Backend (Express) → OAuth Providers & APIs
     ↓                    ↓                        ↓
  User Interface    Token Exchange &         LinkedIn & Twitter
  Authentication     Secure Posting              APIs
     ↓                    ↓                        ↓
  Settings Panel    Environment Variables    Platform APIs
  OAuth Settings     (.env file)            (Posts, Auth)
```

This architecture ensures:
- **Security**: Client secrets remain secure on the server
- **No CORS Issues**: All API calls go through the backend
- **Proper OAuth**: Follows OAuth 2.0 security best practices
- **User-Friendly**: Simple interface with automatic token management

---

**Having issues?** Check the troubleshooting section above or see [CHANGELOG.md](CHANGELOG.md) for recent fixes and improvements. 