#!/usr/bin/env node

/**
 * Test script for the Social Media Kit MCP API
 * 
 * This script tests all the major API endpoints to ensure they're working correctly.
 * Run this after starting the server to verify the MCP integration.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/mcp';

class MCPAPITester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async runAllTests() {
    console.log('🚀 Starting Social Media Kit MCP API Tests\n');

    // Test 1: Tool Discovery
    await this.test('Tool Discovery', async () => {
      const result = await this.apiCall('/tools');
      if (!result.tools || !Array.isArray(result.tools)) {
        throw new Error('Tools not returned as array');
      }
      if (result.tools.length === 0) {
        throw new Error('No tools found');
      }
      console.log(`   Found ${result.tools.length} tools`);
    });

    // Test 2: Text Formatting
    await this.test('Format Text', async () => {
      const result = await this.apiCall('/format-text', {
        method: 'POST',
        body: JSON.stringify({ text: '**Bold** and _italic_ text with @_username_' })
      });
      
      if (!result.success || !result.data.formatted) {
        throw new Error('Text formatting failed');
      }
      
      if (!result.data.formatted.includes('𝗕𝗼𝗹𝗱') || !result.data.formatted.includes('𝘪𝘵𝘢𝘭𝘪𝘤')) {
        throw new Error('Unicode formatting not applied correctly');
      }
      
      if (!result.data.formatted.includes('@_username_')) {
        throw new Error('Username with underscores was incorrectly formatted');
      }
      
      console.log(`   Original: ${result.data.original}`);
      console.log(`   Formatted: ${result.data.formatted}`);
    });

    // Test 3: Character Counting
    await this.test('Count Characters', async () => {
      const result = await this.apiCall('/count-characters', {
        method: 'POST',
        body: JSON.stringify({ 
          text: 'Hello world!', 
          platform: 'twitter' 
        })
      });
      
      if (!result.success || result.data.character_count !== 12) {
        throw new Error('Character count incorrect');
      }
      
      console.log(`   Count: ${result.data.character_count}/${result.data.platform_limit}`);
    });

    // Test 4: Text Chunking
    await this.test('Chunk Text', async () => {
      const longText = 'A'.repeat(500); // Long text to force chunking
      const result = await this.apiCall('/chunk-text', {
        method: 'POST',
        body: JSON.stringify({ 
          text: longText, 
          platform: 'twitter',
          is_premium: false
        })
      });
      
      if (!result.success || !result.data.needs_threading) {
        throw new Error('Text chunking failed');
      }
      
      if (result.data.chunks.length < 2) {
        throw new Error('Text should have been split into multiple chunks');
      }
      
      console.log(`   Split into ${result.data.total_chunks} chunks`);
    });

    // Test 5: Create Person Mapping
    let personId;
    await this.test('Create Person Mapping', async () => {
      const result = await this.apiCall('/person-mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test-person',
          display_name: 'Test Person',
          twitter: 'testperson',
          bluesky: 'test.bsky.social'
        })
      });
      
      if (!result.success || !result.data.id) {
        throw new Error('Person mapping creation failed');
      }
      
      personId = result.data.id;
      console.log(`   Created person mapping with ID: ${personId}`);
    });

    // Test 6: Process Unified Tags
    await this.test('Process Unified Tags', async () => {
      const result = await this.apiCall('/process-unified-tags', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Thanks to @{Test Person} for the help!',
          platform: 'twitter'
        })
      });
      
      if (!result.success || !result.data.processed.includes('@testperson')) {
        throw new Error('Unified tag processing failed');
      }
      
      console.log(`   Original: ${result.data.original}`);
      console.log(`   Processed: ${result.data.processed}`);
    });

    // Test 7: Platform Preview
    await this.test('Platform Preview', async () => {
      const result = await this.apiCall('/preview-for-platform', {
        method: 'POST',
        body: JSON.stringify({
          text: '**Exciting!** Thanks @{Test Person} for the _amazing_ work!',
          platform: 'twitter'
        })
      });
      
      if (!result.success || !result.data.processed) {
        throw new Error('Platform preview failed');
      }
      
      console.log(`   Preview: ${result.data.processed}`);
      console.log(`   Characters: ${result.data.character_count}/${result.data.character_limit}`);
    });

    // Test 8: Create Post
    let postId;
    await this.test('Create Post', async () => {
      const result = await this.apiCall('/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Post',
          content: 'This is a test post with **formatting**',
          platform: 'linkedin'
        })
      });
      
      if (!result.success || !result.data.id) {
        throw new Error('Post creation failed');
      }
      
      postId = result.data.id;
      console.log(`   Created post with ID: ${postId}`);
    });

    // Test 9: Get Post
    await this.test('Get Post', async () => {
      const result = await this.apiCall(`/posts/${postId}`);
      
      if (!result.success || result.data.id !== postId) {
        throw new Error('Post retrieval failed');
      }
      
      console.log(`   Retrieved post: ${result.data.title}`);
    });

    // Test 10: Get Platform Limits
    await this.test('Get Platform Limits', async () => {
      const result = await this.apiCall('/platform-limits');
      
      if (!result.success || !result.data.limits) {
        throw new Error('Platform limits retrieval failed');
      }
      
      console.log(`   Limits: LinkedIn=${result.data.limits.linkedin}, Twitter=${result.data.limits.twitter}, Bluesky=${result.data.limits.bluesky}`);
    });

    // Test 11: List Posts
    await this.test('List Posts', async () => {
      const result = await this.apiCall('/posts');
      
      if (!result.success || !Array.isArray(result.data.posts)) {
        throw new Error('Post listing failed');
      }
      
      console.log(`   Found ${result.data.total} posts`);
    });

    // Test 12: List Person Mappings
    await this.test('List Person Mappings', async () => {
      const result = await this.apiCall('/person-mappings');
      
      if (!result.success || !Array.isArray(result.data.person_mappings)) {
        throw new Error('Person mappings listing failed');
      }
      
      console.log(`   Found ${result.data.total} person mappings`);
    });

    // Cleanup: Delete test data
    await this.test('Cleanup - Delete Post', async () => {
      const result = await this.apiCall(`/posts/${postId}`, { method: 'DELETE' });
      
      if (!result.success) {
        throw new Error('Post deletion failed');
      }
      
      console.log(`   Deleted post: ${postId}`);
    });

    await this.test('Cleanup - Delete Person Mapping', async () => {
      const result = await this.apiCall(`/person-mappings/${personId}`, { method: 'DELETE' });
      
      if (!result.success) {
        throw new Error('Person mapping deletion failed');
      }
      
      console.log(`   Deleted person mapping: ${personId}`);
    });

    // Summary
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! The MCP API is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the API implementation.');
      process.exit(1);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/tools`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    console.log('✅ Server is running and accessible');
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible:', error.message);
    console.log('💡 Make sure to start the server with: npm start');
    process.exit(1);
  }
}

// Run tests
async function main() {
  await checkServer();
  
  const tester = new MCPAPITester();
  await tester.runAllTests();
}

main().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
}); 