# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start Vite development server (frontend only)
- `npm run server` - Start Express.js backend server
- `npm run build` - TypeScript compilation + Vite production build
- `npm start` - Full production build and server start (kills port 3000 first)

### Development Workflow
For development mode, run both servers concurrently:
1. Terminal 1: `npm run server` (backend on port 3000)
2. Terminal 2: `npm run dev` (frontend dev server with hot reload)

### Testing & Quality
- `npm test` - Run Jest test suite
- `npm run test:watch` - Jest in watch mode
- `npm run test:coverage` - Generate coverage report (70% minimum threshold)
- `npm run test:server` - Run server-specific tests
- `npm run lint` - ESLint code quality checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - TypeScript type checking without emit
- `npm run format` - Prettier code formatting
- `npm run format:check` - Check Prettier formatting

## Architecture Overview

### Monolithic Frontend Pattern
The main application logic is contained in `src/App.tsx` (~6,700 lines) which handles:
- OAuth authentication flows for 4 platforms (LinkedIn, Twitter/X, Mastodon, Bluesky)
- Real-time text editing with Unicode formatting
- Platform-specific content adaptation and posting
- Unified tagging system with autocomplete
- Post scheduling, reminders, and management

### Hybrid OAuth Architecture
The Express.js server (`server.js`) implements multiple OAuth flows:
- **LinkedIn**: OAuth 2.0 with `w_member_social` scope
- **Twitter/X**: Hybrid OAuth 2.0 for tweets + OAuth 1.0a for media uploads
- **Mastodon**: OAuth 2.0 with instance-specific configuration
- **Bluesky**: App password authentication via AT Protocol

### Utility Organization
Core functionality is modularized in `src/utils/`:
- `textFormatting.ts` - Unicode character conversion (bold/italic)
- `tagging.ts` - Unified `@{Person Name}` tagging system with platform conversion
- `bluesky-facets.ts` - AT Protocol facet handling for Bluesky

### Platform Abstraction
Text processing includes platform-specific adaptations:
- Character limits: LinkedIn (3,000), Twitter (280/25,000), Mastodon (500), Bluesky (300)
- Tag format conversion: `@{Person Name}` → platform-specific mentions
- Smart chunking at sentence/paragraph boundaries for long content

## Key Technical Details

### Authentication Flow
OAuth token exchange happens server-side to protect client secrets. Tokens are stored in localStorage with automatic refresh handling.

### Data Persistence
- **Client-side**: localStorage for drafts, posts, person mappings, and preferences
- **Export/Import**: JSON format for post backup and migration

### Text Formatting Engine
Uses Unicode characters for cross-platform bold/italic text:
- `**text**` → 𝗯𝗼𝗹𝗱 (Mathematical Bold)
- `_text_` → 𝘪𝘵𝘢𝘭𝘪𝘤 (Mathematical Italic)

### Tagging System
Unified `@{Person Name}` syntax converts to platform-specific formats:
- LinkedIn: `@Display Name` (requires manual selection after paste)
- Twitter/X: `@username` (automatic clickable mentions)
- Mastodon: `@username@instance` (automatic mentions)
- Bluesky: `@handle.domain` (with AT Protocol facets)

## Testing Strategy

### Test Structure
- **Unit tests**: `src/utils/*.test.ts` for text formatting and tagging
- **Component tests**: `src/components/__tests__/` for React components
- **Integration tests**: `tests/` directory for OAuth flows and API endpoints
- **Server tests**: `tests/server/` for Express.js API testing

### Coverage Requirements
Minimum 70% coverage across all metrics (branches, functions, lines, statements).

## Build & Deployment

### Production Build
1. TypeScript compilation with strict type checking
2. Vite optimized build to `dist/` directory
3. Express.js serves both API and static files on single port

### Environment Setup
Copy `.env.example` to `.env` and configure OAuth credentials:
- LinkedIn Client ID/Secret
- Twitter OAuth 2.0 Client ID + OAuth 1.0a credentials
- No server-side config needed for Mastodon/Bluesky (client-side auth)