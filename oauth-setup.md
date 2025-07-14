# OAuth Backend Setup Guide

## Quick Start (If you see the OAuth error)

If you're seeing the "⚠️ LINKEDIN AUTHENTICATION INCOMPLETE" error, follow these steps:

1. **Copy the environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Get your client secrets**:
   - LinkedIn: Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/) → Your App → Auth tab → Copy Client Secret
   - Twitter: Go to [Twitter Developer Portal](https://developer.twitter.com/) → Your App → Keys and tokens → Copy Client Secret

3. **Update the .env file**:
   ```bash
   nano .env
   # Replace the placeholder values with your actual client secrets
   ```

4. **Start the backend server**:
   ```bash
   npm run server
   ```

5. **Open the app**:
   - Navigate to `http://localhost:3000`
   - Try the LinkedIn authentication again

## Overview
This guide will help you set up the OAuth backend service required for LinkedIn and Twitter authentication.

## Prerequisites
- Node.js 18 or higher
- npm or yarn

## Detailed Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment Variables
Create a `.env` file in the root directory:

```env
# OAuth Client Secrets
# These are required for the backend server to complete OAuth flows
# DO NOT commit these to version control

# LinkedIn OAuth
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here

# Twitter OAuth  
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Server Configuration
PORT=3000
```

### 3. Get Your Client Secrets

#### LinkedIn Client Secret
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Select your application
3. Go to the "Auth" tab
4. Copy the "Client Secret" value
5. Add it to your `.env` file as `LINKEDIN_CLIENT_SECRET`

#### Twitter Client Secret
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Select your application
3. Go to "Keys and tokens"
4. Find "OAuth 2.0 Client ID and Client Secret"
5. Copy the "Client Secret" value
6. Add it to your `.env` file as `TWITTER_CLIENT_SECRET`

### 4. Update Redirect URIs

⚠️ **Important**: The redirect URI must match exactly what your app is using!

#### LinkedIn
- Development: `http://localhost:3000` (NOT `/auth/linkedin`)
- Production: `https://yourdomain.com` (NOT `/auth/linkedin`)

#### Twitter  
- Development: `http://localhost:3000` (NOT `/auth/twitter`)
- Production: `https://yourdomain.com` (NOT `/auth/twitter`)

**Why just the base URL?** The app uses `window.location.origin` as the redirect URI, which is the base URL without any path.

### 5. Start the Backend Server

#### Development Mode
```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend dev server (in another terminal)
npm run dev
```

#### Production Mode
```bash
# Build and start the production server
npm run start
```

The backend server will:
- Serve the built frontend at `http://localhost:3000`
- Provide OAuth token exchange API at `http://localhost:3000/api/oauth/token`
- Handle LinkedIn and Twitter OAuth flows securely

### 6. Test Authentication

1. Open the app at `http://localhost:3000`
2. Click ⚙️ Settings and configure your Client IDs
3. Try connecting to LinkedIn or Twitter
4. The OAuth flow should now complete successfully

## Security Notes

- **Never commit your `.env` file** to version control
- Client secrets are stored securely on the server
- The OAuth flow follows security best practices
- Tokens are exchanged server-to-server

## Troubleshooting

### Common Issues

1. **"The redirect_uri does not match the registered value"**
   - This is the most common issue!
   - In LinkedIn Developer Portal, set redirect URI to: `http://localhost:3000`
   - Do NOT include `/auth/linkedin` - just use the base URL
   - The app uses `window.location.origin` as the redirect URI

2. **"Client secret not configured"**
   - Make sure your `.env` file exists and contains the correct client secret
   - Restart the server after adding environment variables

3. **"Token exchange failed"**
   - Verify your client secret is correct
   - Check that redirect URIs match exactly in the developer portals

4. **CORS errors**
   - The server includes CORS middleware for frontend communication
   - Make sure both frontend and backend are running on the same domain

5. **Port conflicts**
   - Change the PORT in your `.env` file if 3000 is already in use
   - Update frontend requests to match the new port

### Development Tips

- Use `npm run dev` for frontend development with hot reload
- Use `npm run server` for backend development with manual restart
- Check browser console and server logs for detailed error messages
- Test with different platforms to ensure OAuth flows work correctly

## Architecture

```
Frontend (React) → Backend (Express) → OAuth Providers (LinkedIn/Twitter)
     ↓                    ↓                        ↓
  User clicks         Exchanges code              Returns tokens
  "Login"            for access token           securely to backend
     ↓                    ↓                        ↓
  Opens OAuth         Sends tokens to            Frontend receives
  authorization       frontend for storage       tokens and user info
```

This setup ensures your client secrets remain secure while providing a smooth OAuth experience for users. 