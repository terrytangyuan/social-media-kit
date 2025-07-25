import express from 'express';

// Import text formatting utilities
const formatText = (input) => {
  const boldMap = {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
    'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
    'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
    'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
    'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };

  const italicMap = {
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
    'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
    'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
    'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
    'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡'
  };

  let result = input;
  
  // Convert **text** to Unicode bold
  result = result.replace(/\*\*(.*?)\*\*/g, (_, text) => {
    return text.split('').map(char => boldMap[char] || char).join('');
  });
  
  // Convert _text_ to Unicode italic, avoiding @ mentions
  result = result.replace(/(?:^|[\s])_([^_]+)_(?=[\s]|$)/g, (match, text) => {
    const leadingChar = match[0] === '_' ? '' : match[0];
    const formattedText = text.split('').map(char => italicMap[char] || char).join('');
    return leadingChar + formattedText;
  });
  
  return result;
};

// Platform configuration
const PLATFORM_LIMITS = {
  linkedin: 3000,
  twitter: 280, // Will be dynamic based on premium status
  bluesky: 300
};

// In-memory storage for demo (replace with database in production)
let posts = [];
let personMappings = [];
let currentPostId = 1;
let currentPersonId = 1;

const router = express.Router();

// =============================================================================
// MCP TOOL DISCOVERY ENDPOINT
// =============================================================================

/**
 * GET /api/mcp/tools
 * Returns all available tools for MCP clients
 */
router.get('/tools', (req, res) => {
  const tools = [
    {
      name: "format_text",
      description: "Format text with Unicode bold (**text**) and italic (_text_) styling",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to format" }
        },
        required: ["text"]
      }
    },
    {
      name: "count_characters",
      description: "Count characters in text for different platforms",
      inputSchema: {
        type: "object", 
        properties: {
          text: { type: "string", description: "Text to count" },
          platform: { type: "string", enum: ["linkedin", "twitter", "bluesky"], description: "Target platform" }
        },
        required: ["text", "platform"]
      }
    },
    {
      name: "chunk_text",
      description: "Split text into chunks for threading based on platform limits",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to chunk" },
          platform: { type: "string", enum: ["linkedin", "twitter", "bluesky"], description: "Target platform" },
          is_premium: { type: "boolean", description: "Whether user has premium (affects Twitter limit)" }
        },
        required: ["text", "platform"]
      }
    },
    {
      name: "process_unified_tags",
      description: "Convert unified tags (@{Person Name}) to platform-specific mentions",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text with unified tags" },
          platform: { type: "string", enum: ["linkedin", "twitter", "bluesky"], description: "Target platform" }
        },
        required: ["text", "platform"]
      }
    },
    {
      name: "create_post",
      description: "Create a new social media post",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Post title" },
          content: { type: "string", description: "Post content" },
          platform: { type: "string", enum: ["linkedin", "twitter", "bluesky"], description: "Target platform" },
          schedule_time: { type: "string", description: "ISO datetime string for scheduling" }
        },
        required: ["content"]
      }
    },
    {
      name: "get_posts",
      description: "List all posts",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum number of posts to return" },
          offset: { type: "number", description: "Number of posts to skip" }
        }
      }
    },
    {
      name: "get_post",
      description: "Get details of a specific post",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "Post ID" }
        },
        required: ["post_id"]
      }
    },
    {
      name: "update_post",
      description: "Update an existing post",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "Post ID" },
          title: { type: "string", description: "Updated title" },
          content: { type: "string", description: "Updated content" },
          schedule_time: { type: "string", description: "Updated schedule time" }
        },
        required: ["post_id"]
      }
    },
    {
      name: "delete_post",
      description: "Delete a post",
      inputSchema: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "Post ID" }
        },
        required: ["post_id"]
      }
    },
    {
      name: "add_person_mapping",
      description: "Add a person mapping for unified tagging",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Person's name/identifier" },
          display_name: { type: "string", description: "Display name" },
          twitter: { type: "string", description: "Twitter handle (without @)" },
          bluesky: { type: "string", description: "Bluesky handle" }
        },
        required: ["name", "display_name"]
      }
    },
    {
      name: "get_person_mappings",
      description: "List all person mappings",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "update_person_mapping",
      description: "Update a person mapping",
      inputSchema: {
        type: "object",
        properties: {
          person_id: { type: "string", description: "Person mapping ID" },
          name: { type: "string", description: "Updated name" },
          display_name: { type: "string", description: "Updated display name" },
          twitter: { type: "string", description: "Updated Twitter handle" },
          bluesky: { type: "string", description: "Updated Bluesky handle" }
        },
        required: ["person_id"]
      }
    },
    {
      name: "delete_person_mapping",
      description: "Delete a person mapping",
      inputSchema: {
        type: "object",
        properties: {
          person_id: { type: "string", description: "Person mapping ID" }
        },
        required: ["person_id"]
      }
    },
    {
      name: "get_platform_limits",
      description: "Get character limits for all platforms",
      inputSchema: {
        type: "object",
        properties: {
          is_premium: { type: "boolean", description: "Whether user has premium (affects Twitter limit)" }
        }
      }
    },
    {
      name: "preview_for_platform",
      description: "Preview how text will look after formatting and tag processing for a specific platform",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to preview" },
          platform: { type: "string", enum: ["linkedin", "twitter", "bluesky"], description: "Target platform" },
          is_premium: { type: "boolean", description: "Whether user has premium (affects Twitter limit)" }
        },
        required: ["text", "platform"]
      }
    }
  ];

  res.json({
    tools,
    description: "Social Media Kit MCP Tools - Text formatting, post management, and platform integration"
  });
});

// =============================================================================
// TEXT PROCESSING TOOLS
// =============================================================================

/**
 * POST /api/mcp/format-text
 * Format text with Unicode styling
 */
router.post('/format-text', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const formatted = formatText(text);
    
    res.json({
      success: true,
      data: {
        original: text,
        formatted,
        changes_made: formatted !== text
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/count-characters  
 * Count characters for platform limits
 */
router.post('/count-characters', (req, res) => {
  try {
    const { text, platform } = req.body;
    
    if (!text || !platform) {
      return res.status(400).json({ error: 'Text and platform are required' });
    }

    // Remove formatting markers for accurate count
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/(?:^|[\s])_([^_]+)_(?=[\s]|$)/g, (match, text) => {
      const leadingChar = match[0] === '_' ? '' : match[0];
      return leadingChar + text;
    });

    const count = cleanText.length;
    const limit = PLATFORM_LIMITS[platform] || 280;
    
    res.json({
      success: true,
      data: {
        character_count: count,
        platform_limit: limit,
        remaining: limit - count,
        exceeds_limit: count > limit,
        platform
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/chunk-text
 * Split text into platform-appropriate chunks
 */
router.post('/chunk-text', (req, res) => {
  try {
    const { text, platform, is_premium = false } = req.body;
    
    if (!text || !platform) {
      return res.status(400).json({ error: 'Text and platform are required' });
    }

    // Adjust Twitter limit based on premium status
    const limits = { ...PLATFORM_LIMITS };
    if (platform === 'twitter') {
      limits.twitter = is_premium ? 25000 : 280;
    }

    const limit = limits[platform] || 280;
    
    if (text.length <= limit) {
      return res.json({
        success: true,
        data: {
          chunks: [text],
          total_chunks: 1,
          needs_threading: false,
          platform,
          character_limit: limit
        }
      });
    }

    // Split into chunks
    const chunks = [];
    let currentChunk = '';
    const words = text.split(' ');

    for (const word of words) {
      const testChunk = currentChunk ? currentChunk + ' ' + word : word;
      
      if (testChunk.length <= limit) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = word;
        } else {
          // Word is longer than limit, force split
          chunks.push(word.substring(0, limit));
          currentChunk = word.substring(limit);
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    res.json({
      success: true,
      data: {
        chunks,
        total_chunks: chunks.length,
        needs_threading: chunks.length > 1,
        platform,
        character_limit: limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/process-unified-tags
 * Convert @{Person Name} tags to platform-specific mentions
 */
router.post('/process-unified-tags', (req, res) => {
  try {
    const { text, platform } = req.body;
    
    if (!text || !platform) {
      return res.status(400).json({ error: 'Text and platform are required' });
    }

    let processedText = text;
    const tagsFound = [];

    // Process unified tags like @{Person Name}
    processedText = processedText.replace(/@\{([^}]+)\}/g, (match, personName) => {
      tagsFound.push({ original: match, person_name: personName });
      
      const person = personMappings.find(p => 
        p.name.toLowerCase() === personName.toLowerCase() || 
        p.display_name.toLowerCase() === personName.toLowerCase()
      );

      if (person) {
        switch (platform) {
          case 'linkedin':
            return `@${person.display_name}`;
          case 'twitter':
            return person.twitter ? `@${person.twitter}` : person.display_name;
          case 'bluesky':
            return person.bluesky ? `@${person.bluesky}` : person.display_name;
          default:
            return `@${person.display_name}`;
        }
      }

      // If no mapping found
      if (platform === 'bluesky' || platform === 'twitter') {
        return personName; // Remove @ for unmapped names
      }
      return `@${personName}`; // Keep @ for LinkedIn
    });

    res.json({
      success: true,
      data: {
        original: text,
        processed: processedText,
        tags_found: tagsFound,
        tags_processed: tagsFound.length,
        platform
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mcp/preview-for-platform
 * Complete preview with formatting and tag processing
 */
router.post('/preview-for-platform', (req, res) => {
  try {
    const { text, platform, is_premium = false } = req.body;
    
    if (!text || !platform) {
      return res.status(400).json({ error: 'Text and platform are required' });
    }

    // Process unified tags first
    let processed = text.replace(/@\{([^}]+)\}/g, (match, personName) => {
      const person = personMappings.find(p => 
        p.name.toLowerCase() === personName.toLowerCase() || 
        p.display_name.toLowerCase() === personName.toLowerCase()
      );

      if (person) {
        switch (platform) {
          case 'linkedin':
            return `@${person.display_name}`;
          case 'twitter':
            return person.twitter ? `@${person.twitter}` : person.display_name;
          case 'bluesky':
            return person.bluesky ? `@${person.bluesky}` : person.display_name;
          default:
            return `@${person.display_name}`;
        }
      }

      if (platform === 'bluesky' || platform === 'twitter') {
        return personName;
      }
      return `@${personName}`;
    });

    // Apply formatting
    const formatted = formatText(processed);

    // Get character count and limits
    const limits = { ...PLATFORM_LIMITS };
    if (platform === 'twitter') {
      limits.twitter = is_premium ? 25000 : 280;
    }
    
    const limit = limits[platform] || 280;
    const count = formatted.length;

    res.json({
      success: true,
      data: {
        original: text,
        processed: formatted,
        character_count: count,
        character_limit: limit,
        remaining: limit - count,
        exceeds_limit: count > limit,
        platform,
        needs_chunking: count > limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// POST MANAGEMENT TOOLS  
// =============================================================================

/**
 * POST /api/mcp/posts
 * Create a new post
 */
router.post('/posts', (req, res) => {
  try {
    const { title, content, platform, schedule_time } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = {
      id: String(currentPostId++),
      title: title || `Post ${currentPostId - 1}`,
      content,
      platform: platform || 'linkedin',
      schedule_time: schedule_time || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    posts.push(post);

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/posts
 * List all posts
 */
router.get('/posts', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);

    const paginatedPosts = posts.slice(numOffset, numOffset + numLimit);

    res.json({
      success: true,
      data: {
        posts: paginatedPosts,
        total: posts.length,
        limit: numLimit,
        offset: numOffset,
        has_more: numOffset + numLimit < posts.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/posts/:id
 * Get a specific post
 */
router.get('/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const post = posts.find(p => p.id === id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mcp/posts/:id
 * Update a post
 */
router.put('/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, schedule_time } = req.body;
    
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[postIndex];
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (schedule_time !== undefined) post.schedule_time = schedule_time;
    post.updated_at = new Date().toISOString();

    posts[postIndex] = post;

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mcp/posts/:id
 * Delete a post
 */
router.delete('/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const postIndex = posts.findIndex(p => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const deletedPost = posts.splice(postIndex, 1)[0];

    res.json({
      success: true,
      data: {
        deleted_post: deletedPost,
        message: 'Post deleted successfully'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// PERSON MAPPING TOOLS
// =============================================================================

/**
 * POST /api/mcp/person-mappings
 * Add a person mapping
 */
router.post('/person-mappings', (req, res) => {
  try {
    const { name, display_name, twitter, bluesky } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display_name are required' });
    }

    const personMapping = {
      id: String(currentPersonId++),
      name,
      display_name,
      twitter: twitter || '',
      bluesky: bluesky || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    personMappings.push(personMapping);

    res.json({
      success: true,
      data: personMapping
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/person-mappings
 * List all person mappings
 */
router.get('/person-mappings', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        person_mappings: personMappings,
        total: personMappings.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mcp/person-mappings/:id
 * Update a person mapping
 */
router.put('/person-mappings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, twitter, bluesky } = req.body;
    
    const personIndex = personMappings.findIndex(p => p.id === id);
    if (personIndex === -1) {
      return res.status(404).json({ error: 'Person mapping not found' });
    }

    const person = personMappings[personIndex];
    if (name !== undefined) person.name = name;
    if (display_name !== undefined) person.display_name = display_name;
    if (twitter !== undefined) person.twitter = twitter;
    if (bluesky !== undefined) person.bluesky = bluesky;
    person.updated_at = new Date().toISOString();

    personMappings[personIndex] = person;

    res.json({
      success: true,
      data: person
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mcp/person-mappings/:id
 * Delete a person mapping
 */
router.delete('/person-mappings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const personIndex = personMappings.findIndex(p => p.id === id);

    if (personIndex === -1) {
      return res.status(404).json({ error: 'Person mapping not found' });
    }

    const deletedPerson = personMappings.splice(personIndex, 1)[0];

    res.json({
      success: true,
      data: {
        deleted_person: deletedPerson,
        message: 'Person mapping deleted successfully'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// UTILITY TOOLS
// =============================================================================

/**
 * GET /api/mcp/platform-limits
 * Get platform character limits
 */
router.get('/platform-limits', (req, res) => {
  try {
    const { is_premium = false } = req.query;
    const isPremium = is_premium === 'true';

    const limits = { ...PLATFORM_LIMITS };
    if (isPremium) {
      limits.twitter = 25000;
    }

    res.json({
      success: true,
      data: {
        limits,
        is_premium: isPremium,
        notes: {
          linkedin: "No strict limit, but 3000 is recommended",
          twitter: isPremium ? "Premium: 25,000 characters" : "Regular: 280 characters", 
          bluesky: "300 characters maximum"
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 