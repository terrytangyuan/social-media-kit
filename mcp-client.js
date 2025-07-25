#!/usr/bin/env node

/**
 * Social Media Kit MCP Client
 * 
 * This client provides Model Context Protocol integration for the Social Media Kit API.
 * It allows AI agents to interact with social media formatting, post management, and 
 * platform-specific tools through the MCP protocol.
 */

import fetch from 'node-fetch';

class SocialMediaKitMCP {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api/mcp';
    this.tools = [];
    this.initialized = false;
  }

  async init() {
    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.tools = data.tools;
      this.initialized = true;
      
      console.error(`[MCP] Social Media Kit initialized with ${this.tools.length} tools`);
    } catch (error) {
      console.error(`[MCP] Initialization failed:`, error.message);
      throw error;
    }
  }

  async callTool(name, args) {
    if (!this.initialized) {
      await this.init();
    }

    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    const endpoint = this.getEndpointForTool(name, args);
    const method = this.getMethodForTool(name);
    
    // Handle ID-based endpoints
    let url = `${this.baseUrl}${endpoint}`;
    let body = args;
    
    if (['get_post', 'update_post', 'delete_post'].includes(name) && args.post_id) {
      url += `/${args.post_id}`;
      body = { ...args };
      delete body.post_id;
    }
    
    if (['update_person_mapping', 'delete_person_mapping'].includes(name) && args.person_id) {
      url += `/${args.person_id}`;
      body = { ...args };
      delete body.person_id;
    }

    // Handle GET requests with query parameters
    if (method === 'GET' && Object.keys(body).length > 0) {
      const params = new URLSearchParams(body);
      url += `?${params}`;
      body = undefined;
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  getEndpointForTool(name, args = {}) {
    const endpoints = {
      'format_text': '/format-text',
      'count_characters': '/count-characters',
      'chunk_text': '/chunk-text',
      'process_unified_tags': '/process-unified-tags',
      'preview_for_platform': '/preview-for-platform',
      'create_post': '/posts',
      'get_posts': '/posts',
      'get_post': '/posts',
      'update_post': '/posts',
      'delete_post': '/posts',
      'add_person_mapping': '/person-mappings',
      'get_person_mappings': '/person-mappings',
      'update_person_mapping': '/person-mappings',
      'delete_person_mapping': '/person-mappings',
      'get_platform_limits': '/platform-limits'
    };
    return endpoints[name] || '/';
  }

  getMethodForTool(name) {
    const methods = {
      'format_text': 'POST',
      'count_characters': 'POST',
      'chunk_text': 'POST',
      'process_unified_tags': 'POST',
      'preview_for_platform': 'POST',
      'create_post': 'POST',
      'get_posts': 'GET',
      'get_post': 'GET',
      'update_post': 'PUT',
      'delete_post': 'DELETE',
      'add_person_mapping': 'POST',
      'get_person_mappings': 'GET',
      'update_person_mapping': 'PUT',
      'delete_person_mapping': 'DELETE',
      'get_platform_limits': 'GET'
    };
    return methods[name] || 'POST';
  }

  async handleListTools() {
    if (!this.initialized) {
      await this.init();
    }
    
    return {
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  }

  async handleCallTool(name, args) {
    try {
      const result = await this.callTool(name, args);
      
      // Format the response for MCP
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text", 
            text: `Error calling tool ${name}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}

// Initialize MCP client
const client = new SocialMediaKitMCP();

// Handle MCP protocol messages
async function handleMessage(message) {
  try {
    switch (message.method) {
      case 'initialize':
        return {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "social-media-kit",
            version: "1.0.0"
          }
        };

      case 'tools/list':
        return await client.handleListTools();

      case 'tools/call':
        const { name, arguments: args } = message.params;
        return await client.handleCallTool(name, args);

      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  } catch (error) {
    return {
      error: {
        code: -1,
        message: error.message
      }
    };
  }
}

// Process incoming messages
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  // Process complete JSON messages (separated by newlines)
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        const response = await handleMessage(message);
        
        // Send response
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        console.error('[MCP] Error processing message:', error);
        process.stdout.write(JSON.stringify({
          error: {
            code: -1,
            message: `Failed to process message: ${error.message}`
          }
        }) + '\n');
      }
    }
  }
});

process.stdin.on('end', () => {
  console.error('[MCP] Client shutting down');
  process.exit(0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MCP] Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP] Received SIGTERM, shutting down...');
  process.exit(0);
});

console.error('[MCP] Social Media Kit MCP client started');
console.error('[MCP] API Base URL:', client.baseUrl); 