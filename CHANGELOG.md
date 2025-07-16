# CHANGELOG

## v0.2.1

### 🏷️ New Features

#### Unified Tagging System
- **Cross-Platform Tagging**: Introduced `@{Person Name}` syntax for unified tagging across all platforms
- **Smart Platform Conversion**: Automatically converts unified tags to platform-specific formats:
  - LinkedIn: Uses display name format (e.g., `@Yuan Tang`) with manual tagging required
  - Twitter/X: Uses username format (e.g., `@TerryTangYuan`) for automatic clickable mentions
  - Bluesky: Uses handle format (e.g., `@terrytangyuan.xyz`) for automatic clickable mentions
- **Tag Manager UI**: Dedicated interface for managing person mappings
  - Visual tagging guide with examples for each platform
  - Easy insertion of unified tags into posts
  - Clear instructions and help text for LinkedIn's manual tagging requirements
- **Persistent Storage**: All person mappings automatically saved to localStorage

#### Other Improvements
- Handle logout for Twitter/X gracefully when session expires
- Support undo/redo in in the post editor
- Add resize indicator in the editor text area

## v0.2.0

### 🎉 Major Release - All Authentication & Posting Issues Resolved

This release addresses all major authentication and posting issues that were preventing successful LinkedIn and Twitter integration. Users can now authenticate and post to both platforms successfully.

### 🐛 Critical Bug Fixes

#### LinkedIn Integration
- **Fixed LinkedIn 403 Forbidden Errors**: Updated from deprecated API version 202410 to latest version 202506
- **Fixed LinkedIn Posting Pipeline**: Implemented proper server-side posting via `/api/linkedin/post` endpoint
- **Fixed LinkedIn Profile Fetching**: Enhanced error handling for optional profile fetching with fallback mechanisms
- **Fixed LinkedIn User URN Resolution**: Improved user identification for posting with multiple fallback methods

#### Twitter/X Integration  
- **Fixed Twitter PKCE Implementation**: Resolved "Value passed for the code verifier did not match the code challenge" errors
  - Completely rewrote `generatePKCE()` function with proper base64url encoding
  - Fixed faulty `String.fromCharCode.apply()` usage that was causing verification failures
  - Implemented proper cryptographic random byte generation
- **Fixed Twitter CORS Issues**: Added server-side posting endpoint `/api/twitter/post` to eliminate cross-origin restrictions
- **Fixed Twitter Authentication Flow**: Enhanced PKCE parameter handling and storage throughout OAuth process

### 🚀 New Features

#### Server Infrastructure
- **New LinkedIn Posting Endpoint**: `POST /api/linkedin/post` for server-side LinkedIn posting
- **New Twitter Posting Endpoint**: `POST /api/twitter/post` for server-side Twitter posting  
- **Enhanced OAuth Token Exchange**: Improved `/api/oauth/token` with better error handling and debugging
- **Improved Environment Configuration**: Better .env file loading with detailed logging and validation

#### Frontend Improvements
- **Enhanced Error Messages**: More descriptive error messages for authentication failures
- **Better Token Management**: Improved OAuth token cleanup and session management
- **Improved PKCE Handling**: Proper PKCE code verifier generation and verification

### 🔧 Technical Improvements

#### Backend (server.js)
- Updated LinkedIn API from version 202410 → 202506
- Enhanced PKCE code verifier handling for Twitter OAuth
- Improved error logging and debugging throughout OAuth flows
- Better environment variable loading with detailed logging
- Added comprehensive error handling for all API endpoints

#### Frontend (src/App.tsx)
- Fixed `generatePKCE()` function with proper base64url encoding using crypto APIs
- Updated posting functions to use server endpoints instead of direct API calls
- Enhanced error messages and token cleanup for OAuth flows
- Better PKCE parameter storage and management

### 📝 Configuration Updates

#### Required App Configurations
- **LinkedIn**: Must enable "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn" products
- **Twitter**: Must be configured as "Web App, Automated App or Bot" (NOT "Confidential Client")

#### Environment Variables
- Enhanced .env file validation and loading
- Better error messages for missing configuration

### 🔒 Security Enhancements
- Proper PKCE implementation for Twitter OAuth 2.0
- Server-side token handling to prevent exposure
- Enhanced error handling without exposing sensitive information

### 📚 Documentation Updates
- Created comprehensive SETUP.md consolidating all setup instructions
- Enhanced README.md with v0.2.0 summary
- Consolidated authentication and OAuth setup guides
- Added comprehensive setup instructions for both platforms

### 🎯 Platform-Specific Fixes

#### LinkedIn
- **API Version**: Updated to 202506 (latest)
- **Posting Endpoint**: Now uses `/rest/posts` with proper user URN resolution
- **Error Handling**: Enhanced 403/401 error handling and debugging
- **Profile Fetching**: Added fallback methods for user profile retrieval

#### Twitter/X
- **PKCE Implementation**: Complete rewrite with proper cryptographic methods
- **Authentication**: Fixed OAuth 2.0 User Context requirements
- **Posting**: Server-side posting to eliminate CORS issues
- **Error Handling**: Better handling of authentication and posting errors

### 🔄 Migration Notes

Users upgrading from previous versions should:
1. Clear browser cache and localStorage
2. Re-authenticate with both LinkedIn and Twitter
3. Ensure .env file contains all required credentials
4. Verify LinkedIn app has required products enabled
5. Verify Twitter app is configured correctly

### 🐛 Known Issues Resolved

- ✅ LinkedIn 403 "Forbidden" errors during posting
- ✅ Twitter "code verifier mismatch" PKCE errors  
- ✅ Cross-Origin Request Blocked errors for posting
- ✅ Invalid access token errors
- ✅ Authentication flow interruptions
- ✅ Server startup and port conflicts

### 🛠️ Development Improvements

- Enhanced npm scripts with `npm start` production command
- Better error logging and debugging throughout
- Improved development workflow with unified build process
- Enhanced testing and validation procedures

---

## v0.1.0

### 🎉 Initial Release

- Basic LinkedIn, Twitter/X, and Bluesky integration
- Frontend posting interface with character counting
- Basic OAuth authentication flows
- Thread chunking for Twitter posts
- Simple server-side API endpoints 
