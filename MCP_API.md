# Social Media Kit - Model Context Protocol (MCP) API

This API provides Model Context Protocol (MCP) compatible endpoints for AI agents to interact with the Social Media Kit programmatically. Perfect for agentic workflows that need to format text, manage posts, and handle cross-platform social media content.

## Base URL
```
http://localhost:3000/api/mcp
```

## Tool Discovery

### GET /api/mcp/tools
Get all available tools for MCP clients.

**Response:**
```json
{
  "tools": [
    {
      "name": "format_text",
      "description": "Format text with Unicode bold (**text**) and italic (_text_) styling",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": { "type": "string", "description": "Text to format" }
        },
        "required": ["text"]
      }
    }
    // ... more tools
  ],
  "description": "Social Media Kit MCP Tools - Text formatting, post management, and platform integration"
}
```

## Text Processing Tools

### POST /api/mcp/format-text
Format text with Unicode bold and italic styling.

**Request:**
```json
{
  "text": "This is **bold** and _italic_ text with @_user_mentions_"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "This is **bold** and _italic_ text with @_user_mentions_",
    "formatted": "This is 𝗯𝗼𝗹𝗱 and 𝘪𝘵𝘢𝘭𝘪𝘤 text with @_user_mentions_",
    "changes_made": true
  }
}
```

### POST /api/mcp/count-characters
Count characters for platform limits.

**Request:**
```json
{
  "text": "Your social media post content here",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "character_count": 35,
    "platform_limit": 280,
    "remaining": 245,
    "exceeds_limit": false,
    "platform": "twitter"
  }
}
```

### POST /api/mcp/chunk-text
Split text into platform-appropriate chunks for threading.

**Request:**
```json
{
  "text": "Very long social media post that exceeds platform limits...",
  "platform": "twitter",
  "is_premium": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chunks": ["First chunk...", "Second chunk..."],
    "total_chunks": 2,
    "needs_threading": true,
    "platform": "twitter",
    "character_limit": 280
  }
}
```

### POST /api/mcp/process-unified-tags
Convert unified tags (@{Person Name}) to platform-specific mentions.

**Request:**
```json
{
  "text": "Thanks to @{John Doe} and @{Jane Smith} for the collaboration!",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "Thanks to @{John Doe} and @{Jane Smith} for the collaboration!",
    "processed": "Thanks to @johndoe and @janesmith for the collaboration!",
    "tags_found": [
      {"original": "@{John Doe}", "person_name": "John Doe"},
      {"original": "@{Jane Smith}", "person_name": "Jane Smith"}
    ],
    "tags_processed": 2,
    "platform": "twitter"
  }
}
```

### POST /api/mcp/preview-for-platform
Complete preview with formatting and tag processing.

**Request:**
```json
{
  "text": "**Exciting news!** Thanks to @{John Doe} for the _amazing_ work!",
  "platform": "linkedin",
  "is_premium": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "**Exciting news!** Thanks to @{John Doe} for the _amazing_ work!",
    "processed": "𝗘𝘅𝗰𝗶𝘁𝗶𝗻𝗴 𝗻𝗲𝘄𝘀! Thanks to @John Doe for the 𝘢𝘮𝘢𝘻𝘪𝘯𝘨 work!",
    "character_count": 65,
    "character_limit": 3000,
    "remaining": 2935,
    "exceeds_limit": false,
    "platform": "linkedin",
    "needs_chunking": false
  }
}
```

## Post Management Tools

### POST /api/mcp/posts
Create a new social media post.

**Request:**
```json
{
  "title": "My awesome post",
  "content": "This is the content of my post with **formatting**",
  "platform": "linkedin",
  "schedule_time": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "My awesome post",
    "content": "This is the content of my post with **formatting**",
    "platform": "linkedin",
    "schedule_time": "2024-01-15T10:00:00Z",
    "created_at": "2024-01-14T15:30:00Z",
    "updated_at": "2024-01-14T15:30:00Z"
  }
}
```

### GET /api/mcp/posts
List all posts with pagination.

**Query Parameters:**
- `limit` (optional): Maximum number of posts to return (default: 50)
- `offset` (optional): Number of posts to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "total": 10,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### GET /api/mcp/posts/:id
Get details of a specific post.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "My awesome post",
    "content": "Post content...",
    "platform": "linkedin",
    "schedule_time": "2024-01-15T10:00:00Z",
    "created_at": "2024-01-14T15:30:00Z",
    "updated_at": "2024-01-14T15:30:00Z"
  }
}
```

### PUT /api/mcp/posts/:id
Update an existing post.

**Request:**
```json
{
  "title": "Updated title",
  "content": "Updated content with **new formatting**",
  "schedule_time": "2024-01-16T10:00:00Z"
}
```

### DELETE /api/mcp/posts/:id
Delete a post.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_post": {...},
    "message": "Post deleted successfully"
  }
}
```

## Person Mapping Tools

### POST /api/mcp/person-mappings
Add a person mapping for unified tagging.

**Request:**
```json
{
  "name": "john-doe",
  "display_name": "John Doe",
  "twitter": "johndoe",
  "bluesky": "johndoe.bsky.social"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "john-doe",
    "display_name": "John Doe",
    "twitter": "johndoe",
    "bluesky": "johndoe.bsky.social",
    "created_at": "2024-01-14T15:30:00Z",
    "updated_at": "2024-01-14T15:30:00Z"
  }
}
```

### GET /api/mcp/person-mappings
List all person mappings.

**Response:**
```json
{
  "success": true,
  "data": {
    "person_mappings": [...],
    "total": 5
  }
}
```

### PUT /api/mcp/person-mappings/:id
Update a person mapping.

### DELETE /api/mcp/person-mappings/:id
Delete a person mapping.

## Utility Tools

### GET /api/mcp/platform-limits
Get character limits for all platforms.

**Query Parameters:**
- `is_premium` (optional): Whether user has premium (affects Twitter limit)

**Response:**
```json
{
  "success": true,
  "data": {
    "limits": {
      "linkedin": 3000,
      "twitter": 280,
      "bluesky": 300
    },
    "is_premium": false,
    "notes": {
      "linkedin": "No strict limit, but 3000 is recommended",
      "twitter": "Regular: 280 characters",
      "bluesky": "300 characters maximum"
    }
  }
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing required parameters)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Example Agent Workflows

### 1. Create and Format a Post

```javascript
// 1. First, check platform limits
const limits = await fetch('/api/mcp/platform-limits?is_premium=false');

// 2. Format the text
const formatResponse = await fetch('/api/mcp/format-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "**Exciting news!** Our new feature is _amazing_"
  })
});

// 3. Preview for specific platform
const previewResponse = await fetch('/api/mcp/preview-for-platform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "**Exciting news!** Thanks to @{John Doe} for the _amazing_ work!",
    platform: "twitter"
  })
});

// 4. Create the post
const postResponse = await fetch('/api/mcp/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Exciting Announcement",
    content: formatResponse.data.formatted,
    platform: "twitter"
  })
});
```

### 2. Manage Person Mappings

```javascript
// Add a new person mapping
await fetch('/api/mcp/person-mappings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "john-doe",
    display_name: "John Doe",
    twitter: "johndoe",
    bluesky: "johndoe.bsky.social"
  })
});

// Use unified tagging
const taggedResponse = await fetch('/api/mcp/process-unified-tags', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Thanks @{John Doe} for the great work!",
    platform: "twitter"
  })
});
// Result: "Thanks @johndoe for the great work!"
```

### 3. Handle Long Content with Threading

```javascript
// Check if content needs chunking
const chunkResponse = await fetch('/api/mcp/chunk-text', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Very long content that exceeds Twitter's character limit...",
    platform: "twitter",
    is_premium: false
  })
});

if (chunkResponse.data.needs_threading) {
  // Create multiple posts for threading
  for (let i = 0; i < chunkResponse.data.chunks.length; i++) {
    await fetch('/api/mcp/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Thread Part ${i + 1}`,
        content: chunkResponse.data.chunks[i],
        platform: "twitter"
      })
    });
  }
}
```

## Integration with MCP Clients

To use this API with MCP clients like Claude Desktop or other AI agents:

1. **Tool Discovery**: Point your MCP client to `/api/mcp/tools` to get available tools
2. **Function Calling**: Use the tool names and schemas to make API calls
3. **Error Handling**: Handle HTTP errors and API error responses appropriately
4. **State Management**: Use post and person mapping endpoints to maintain state

This API enables AI agents to programmatically manage social media content with proper formatting, tagging, and platform-specific optimizations. 