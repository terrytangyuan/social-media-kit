# CHANGELOG

## Under Development

### ✨ New Features

- **Enhanced Image Upload Support**: Complete implementation of multiple image upload to first post
  - **Multiple Image Upload**: Support for uploading multiple images (up to platform limits)
  - **Platform-Specific Limits**: Enforced image limits per platform:
    - LinkedIn: Up to 9 images, 5MB each
    - Twitter/X: Up to 4 images, 5MB each
    - Mastodon: Up to 4 images, 8MB each
    - Bluesky: Up to 4 images, 10MB each
  - **Enhanced UI**: Modern multi-image selection with grid preview and individual image removal
  - **Smart Validation**: Real-time validation of file types, sizes, and platform limits
  - **Interactive Preview**: Click to expand images, drag-and-drop reordering, numbered indicators
  - **Modification Controls**: Individual remove buttons, remove all option, visual drag handles
  - **Improved Post Preview**: Smart grid layout adapting to image count with numbered overlays
  - **Auto-cleanup**: Images automatically cleared after successful posting
  - **Smart Platform Switching**: Interactive image selection modal when switching platforms with excess images
  - **Platform-Specific Image Selection**: Each platform maintains its own selected image set from the uploaded collection
  - **Visual Image Selection Modal**: Rich interface for selecting specific images per platform with preview and selection indicators
  - **Intelligent Selection Behavior**: Only prompts for image selection on first switch; respects user choices and doesn't re-prompt unless explicitly requested
  - **Manual Selection Override**: "Select Images" button always available for users to manually adjust their platform-specific selections
  - **Visual Indicators**: Clear display of current image count vs platform limits with helpful hints
  - **Platform-Specific Handling**: 
    - LinkedIn: FormData upload via API with multiple images
    - Twitter/X: Media upload with multiple image attachment via Twitter Media API
    - Mastodon: Media upload with multiple image support via Mastodon Media API  
    - Bluesky: Direct blob upload via client-side API calls
  - **Server-Side Image Processing**: Full FormData handling with multer middleware for robust file uploads
- **API Integration Fixes**: Resolved Twitter media upload failures and Bluesky content-type issues
- **Post Image Persistence**: Images are now saved with posts and restored when switching between posts or importing/exporting post data
  - Images stored in post history with full metadata
  - Platform-specific image selections preserved across sessions
  - Export/import functionality includes image data (base64 encoded)
  - Visual image indicators in post manager show image count per post

### 🐛 Bug Fixes

- **Fixed missing copy button in Mastodon post preview**: Added individual copy buttons for Mastodon thread chunks, bringing it in line with Twitter and Bluesky functionality

## v0.2.2

### 🏷️ New Features
- Added Mastodon support
- Added X Premium support
- Automatically convert URLs in BlueSky posts to clickable links using AT Protocol facets
- Added Welcome page
- Supports text formatting for numbers and greek letters
- Added resizer in editor area for longer posts

### 🐛 Bug Fixes

#### Text Formatting
- **Fixed italic text formatting not working**: Resolved issue where text was rendered as `_sometext_` instead of converting to italic Unicode characters
- **Fixed italic formatting with punctuation**: Text formatting now works correctly with exclamation marks and other punctuation (e.g., `_hello!_`, `_text_!`)
- **Improved regex pattern for italic detection**: Updated from restrictive word-boundary pattern to flexible pattern that works in all contexts while preserving @ mention protection

#### User Interface
- **Fixed Mastodon handles not displayed after editing**: Added missing Mastodon display section in person mappings view alongside LinkedIn, Twitter, and Bluesky
- **Improved person mappings layout**: Updated responsive grid from 3-column to 4-column layout to accommodate all platforms

#### BlueSky Tagging
- **Fixed BlueSky mentions not being clickable**: Implemented AT Protocol facets to make mentions properly clickable
- **Added handle-to-DID resolution**: Automatically resolves BlueSky handles to DIDs for proper mention linking
- **Smart fallback for missing handles**: When BlueSky handle is not set, properly falls back to display name without trying to resolve it
- **Fixed mentions followed by punctuation**: Improved regex pattern to correctly handle mentions like `@{Name}.` and `@{Name}!`
- **Fixed BlueSky handles with trailing periods**: Resolved issue where `@terrytangyuan.xyz.` would include the trailing period in the handle, preventing proper resolution
- **Fixed spacing sensitivity bug**: BlueSky tags now work correctly whether followed by one space or multiple spaces after punctuation (e.g., both `@{Name}. text` and `@{Name}.  text` now work)
- **Fixed display name handling**: When no social media handle is specified for a person, unified tags now convert to just the display name without the `@` symbol:
  - **BlueSky**: `@{John Doe}` becomes `John Doe` instead of `@John Doe` when no BlueSky handle is set
  - **Twitter**: `@{Jane Smith}` becomes `Jane Smith` instead of `@Jane Smith` when no Twitter handle is set
- **UTF-8 byte position accuracy**: Correctly calculates byte positions for facets to ensure proper mention detection


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
