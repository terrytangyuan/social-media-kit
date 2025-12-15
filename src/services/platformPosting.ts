import { PlatformAuth } from '../types';

// Helper function to attempt automatic token refresh
export const attemptTokenRefresh = async (
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  auth: PlatformAuth[typeof platform],
  onAuthUpdate: (newAuth: Partial<PlatformAuth[typeof platform]>) => void,
  showNotification: (message: string) => void
): Promise<boolean> => {
  if (!auth.refreshToken) {
    console.log(`🔄 No refresh token available for ${platform}, cannot auto-refresh`);
    return false;
  }

  try {
    console.log(`🔄 Attempting to refresh ${platform} token...`);

    const response = await fetch('/api/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        refreshToken: auth.refreshToken,
      }),
    });

    if (!response.ok) {
      console.warn(`❌ Token refresh failed for ${platform}: ${response.status}`);
      return false;
    }

    const tokenData = await response.json();

    // Update auth state with new tokens
    onAuthUpdate({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || auth.refreshToken,
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
    });

    console.log(`✅ Successfully refreshed ${platform} token`);
    showNotification(`🔄 ${platform.toUpperCase()} authentication refreshed automatically`);
    return true;

  } catch (error) {
    console.error(`❌ Error refreshing ${platform} token:`, error);
    return false;
  }
};

// Helper function to check if token is expired
export const isTokenExpired = (authData: any): boolean => {
  if (!authData.isAuthenticated || !authData.accessToken) return true;
  if (!authData.expiresAt) return false;
  return Date.now() >= authData.expiresAt;
};

// Helper function to ensure valid authentication before API calls
export const ensureValidAuth = async (
  platform: 'linkedin' | 'twitter' | 'mastodon' | 'bluesky',
  auth: PlatformAuth[typeof platform],
  onAuthUpdate: (newAuth: Partial<PlatformAuth[typeof platform]>) => void,
  showNotification: (message: string) => void
): Promise<boolean> => {
  // Check if authenticated
  if (!auth.isAuthenticated) {
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(auth)) {
    console.log(`⏰ ${platform} token is expired, attempting refresh...`);
    const refreshSuccess = await attemptTokenRefresh(platform, auth, onAuthUpdate, showNotification);
    return refreshSuccess;
  }

  return true;
};

// Post to LinkedIn
export const postToLinkedIn = async (
  content: string,
  imageFiles: { file: File; dataUrl: string; name: string; }[] = [],
  accessToken: string
) => {
  console.log('📤 Posting to LinkedIn...');

  let response;
  if (imageFiles.length > 0) {
    // Use FormData for image upload
    const formData = new FormData();
    formData.append('content', content);
    formData.append('accessToken', accessToken);

    // Add multiple images
    imageFiles.forEach((imageFile, index) => {
      formData.append(`image${index}`, imageFile.file);
    });
    formData.append('imageCount', imageFiles.length.toString());

    response = await fetch('/api/linkedin/post', {
      method: 'POST',
      body: formData
    });
  } else {
    // JSON request for text-only posts
    response = await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content,
        accessToken: accessToken
      })
    });
  }

  if (!response.ok) {
    let errorMessage = `LinkedIn API error (${response.status})`;
    try {
      const errorData = await response.json();
      console.error('LinkedIn API error details:', errorData);

      if (response.status === 401) {
        errorMessage = `LinkedIn API error: Authentication failed. Please reconnect your LinkedIn account.`;
      } else {
        errorMessage = `LinkedIn API error (${response.status}): ${errorData.message || errorData.error || response.statusText}`;
      }
    } catch (parseError) {
      console.error('Failed to parse LinkedIn error response:', parseError);
      const errorText = await response.text();
      errorMessage = `LinkedIn API error (${response.status}): ${errorText || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// Post to Twitter/X
export const postToTwitter = async (
  content: string,
  replyToTweetId: string | undefined,
  imageFiles: { file: File; dataUrl: string; name: string; }[] = [],
  accessToken: string,
  showNotification?: (message: string) => void
) => {
  // Note about hybrid authentication for images
  if (imageFiles.length > 0 && showNotification) {
    showNotification('📷 Uploading images to Twitter using OAuth 1.0a authentication...');
  }

  let response;
  if (imageFiles.length > 0) {
    // Use FormData for image upload
    const formData = new FormData();
    formData.append('content', content);
    formData.append('accessToken', accessToken);

    // Add multiple images
    imageFiles.forEach((imageFile, index) => {
      formData.append(`image${index}`, imageFile.file);
    });
    formData.append('imageCount', imageFiles.length.toString());

    // Add reply field if this is a reply to another tweet
    if (replyToTweetId) {
      formData.append('replyToTweetId', replyToTweetId);
    }

    response = await fetch('/api/twitter/post', {
      method: 'POST',
      body: formData
    });
  } else {
    // JSON request for text-only posts
    const requestBody: any = {
      content,
      accessToken: accessToken
    };

    // Add reply field if this is a reply to another tweet
    if (replyToTweetId) {
      requestBody.replyToTweetId = replyToTweetId;
    }

    response = await fetch('/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  }

  if (!response.ok) {
    let errorMessage = `Twitter API error (${response.status})`;
    try {
      const errorData = await response.json();
      console.error('Twitter API error details:', errorData);

      // Handle specific Twitter error cases
      if (response.status === 403) {
        if (errorData.detail?.includes('not permitted')) {
          errorMessage = `Twitter API error: You are not permitted to perform this action. This might be due to:\n• Rate limiting (posting too frequently)\n• API permission issues\n• Account restrictions\n\nTry waiting a few minutes before posting again.`;
        } else {
          errorMessage = `Twitter API error (403 Forbidden): ${errorData.detail || errorData.error || 'Permission denied'}`;
        }
      } else if (response.status === 429) {
        errorMessage = `Twitter API error: Rate limit exceeded. Please wait before posting again.`;
      } else if (response.status === 401) {
        errorMessage = `Twitter API error: Authentication failed. Please reconnect your Twitter account.`;
      } else {
        errorMessage = `Twitter API error (${response.status}): ${errorData.detail || errorData.error || errorData.message || response.statusText}`;
      }
    } catch (parseError) {
      console.error('Failed to parse Twitter error response:', parseError);
      const errorText = await response.text();
      errorMessage = `Twitter API error (${response.status}): ${errorText || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// Helper function to create facets for BlueSky mentions
export const createBlueskyFacets = async (text: string, accessToken: string) => {
  const facets = [];

  // Convert string to UTF-8 bytes for accurate byte position calculation
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Find all mentions in the text with proper word boundaries
  const mentionRegex = /@([a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?)*|[A-Za-z][A-Za-z0-9\s]*[A-Za-z0-9])(?=\s|[.!?,:;]|\b|$)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const handle = match[1].trim(); // Extract handle/name without @
    const mentionText = match[0]; // Full @handle text

    // Only try to resolve if it looks like a valid BlueSky handle (contains a dot)
    if (!handle.includes('.')) {
      console.log(`⏭️ Skipping display name: @${handle} (not a resolvable BlueSky handle)`);
      continue;
    }

    // Calculate byte positions correctly
    const beforeMention = text.substring(0, match.index);
    const beforeBytes = encoder.encode(beforeMention);
    const mentionBytes = encoder.encode(mentionText);

    const byteStart = beforeBytes.length;
    const byteEnd = byteStart + mentionBytes.length;

    try {
      // Resolve handle to DID using BlueSky API
      const response = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const did = data.did;

        // Create facet for this mention
        facets.push({
          index: {
            byteStart: byteStart,
            byteEnd: byteEnd
          },
          features: [{
            $type: 'app.bsky.richtext.facet#mention',
            did: did
          }]
        });

        console.log(`✅ Resolved @${handle} to DID: ${did}`);
      } else {
        console.warn(`⚠️ Could not resolve handle: @${handle}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error resolving handle @${handle}:`, error);
    }
  }

  // Find all URLs in the text and create link facets
  const urlRegex = /https?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?]/g;
  let urlMatch;

  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const url = urlMatch[0];

    // Calculate byte positions for the URL
    const beforeUrl = text.substring(0, urlMatch.index);
    const beforeBytes = encoder.encode(beforeUrl);
    const urlBytes = encoder.encode(url);

    const byteStart = beforeBytes.length;
    const byteEnd = byteStart + urlBytes.length;

    // Create facet for this link
    facets.push({
      index: {
        byteStart: byteStart,
        byteEnd: byteEnd
      },
      features: [{
        $type: 'app.bsky.richtext.facet#link',
        uri: url
      }]
    });

    console.log(`🔗 Added clickable link: ${url}`);
  }

  // Find all hashtags in the text and create tag facets
  const hashtagRegex = /#([a-zA-Z0-9_]+)(?![a-zA-Z0-9_-]|\.[\w])/g;
  let hashtagMatch;

  while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
    const hashtag = hashtagMatch[1]; // Extract hashtag without #
    const hashtagText = hashtagMatch[0]; // Full #hashtag text

    // Calculate byte positions for the hashtag
    const beforeHashtag = text.substring(0, hashtagMatch.index);
    const beforeBytes = encoder.encode(beforeHashtag);
    const hashtagBytes = encoder.encode(hashtagText);

    const byteStart = beforeBytes.length;
    const byteEnd = byteStart + hashtagBytes.length;

    // Create facet for this hashtag
    facets.push({
      index: {
        byteStart: byteStart,
        byteEnd: byteEnd
      },
      features: [{
        $type: 'app.bsky.richtext.facet#tag',
        tag: hashtag
      }]
    });

    console.log(`🏷️ Added clickable hashtag: #${hashtag}`);
  }

  return facets;
};

// Post to Bluesky
export const postToBluesky = async (
  content: string,
  replyToUri: string | undefined,
  replyToCid: string | undefined,
  rootUri: string | undefined,
  rootCid: string | undefined,
  imageFiles: { file: File; dataUrl: string; name: string; }[] = [],
  accessToken: string,
  userDid: string
) => {
  // Create facets for mentions to make them clickable
  const facets = await createBlueskyFacets(content, accessToken);

  const record: any = {
    text: content,
    createdAt: new Date().toISOString()
  };

  // Add facets if any mentions were found
  if (facets.length > 0) {
    record.facets = facets;
  }

  // Handle multiple image uploads if provided
  if (imageFiles.length > 0) {
    try {
      const uploadedImages = [];

      // Upload each image to Bluesky
      for (const imageFile of imageFiles) {
        const uploadResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': imageFile.file.type,
          },
          body: imageFile.file
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedImages.push({
            alt: `Uploaded image: ${imageFile.name}`,
            image: uploadData.blob,
            aspectRatio: {
              width: 1920,
              height: 1080
            }
          });
        } else {
          console.warn(`Failed to upload image ${imageFile.name} to Bluesky:`, await uploadResponse.text());
        }
      }

      // Add the images to the record if any uploaded successfully
      if (uploadedImages.length > 0) {
        record.embed = {
          $type: 'app.bsky.embed.images',
          images: uploadedImages
        };
      }
    } catch (error) {
      console.warn('Error uploading images to Bluesky:', error);
    }
  }

  // Add reply field if this is a reply to another post
  if (replyToUri && replyToCid) {
    record.reply = {
      root: {
        uri: rootUri || replyToUri,
        cid: rootCid || replyToCid
      },
      parent: {
        uri: replyToUri,
        cid: replyToCid
      }
    };
  }

  const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      repo: userDid,
      collection: 'app.bsky.feed.post',
      record: record
    })
  });

  if (!response.ok) {
    let errorMessage = `Bluesky API error (${response.status})`;
    try {
      const errorData = await response.json();
      console.error('Bluesky API error details:', errorData);

      // Handle specific Bluesky error cases
      if (response.status === 401) {
        errorMessage = `Bluesky API error: Authentication failed. Your session may have expired. Please reconnect your Bluesky account.`;
      } else if (response.status === 403) {
        errorMessage = `Bluesky API error: Permission denied. This might be due to:\n• Account restrictions\n• Invalid app password\n• Server policy violations`;
      } else if (response.status === 429) {
        errorMessage = `Bluesky API error: Rate limit exceeded. Please wait before posting again.`;
      } else if (response.status === 400) {
        const details = errorData.message || errorData.error || 'Invalid request';
        errorMessage = `Bluesky API error: ${details}`;
      } else {
        errorMessage = `Bluesky API error (${response.status}): ${errorData.message || errorData.error || response.statusText}`;
      }
    } catch (parseError) {
      console.error('Failed to parse Bluesky error response:', parseError);
      const errorText = await response.text();
      errorMessage = `Bluesky API error (${response.status}): ${errorText || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// Post to Mastodon
export const postToMastodon = async (
  content: string,
  replyToStatusId: string | undefined,
  imageFiles: { file: File; dataUrl: string; name: string; }[] = [],
  accessToken: string,
  instanceUrl: string
) => {
  let response;
  if (imageFiles.length > 0) {
    // Use FormData for image upload
    const formData = new FormData();
    formData.append('content', content);
    formData.append('accessToken', accessToken);
    formData.append('instanceUrl', instanceUrl);

    // Add multiple images
    imageFiles.forEach((imageFile, index) => {
      formData.append(`image${index}`, imageFile.file);
    });
    formData.append('imageCount', imageFiles.length.toString());

    // Add reply field if this is a reply to another status
    if (replyToStatusId) {
      formData.append('replyToStatusId', replyToStatusId);
    }

    response = await fetch('/api/mastodon/post', {
      method: 'POST',
      body: formData
    });
  } else {
    // JSON request for text-only posts
    const requestBody: any = {
      content,
      accessToken: accessToken,
      instanceUrl: instanceUrl
    };

    // Add reply field if this is a reply to another status
    if (replyToStatusId) {
      requestBody.replyToStatusId = replyToStatusId;
    }

    response = await fetch('/api/mastodon/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  }

  if (!response.ok) {
    let errorMessage = `Mastodon API error (${response.status})`;
    try {
      const errorData = await response.json();
      console.error('Mastodon API error details:', errorData);

      // Handle specific Mastodon error cases
      if (response.status === 401) {
        errorMessage = `Mastodon API error: Authentication failed. Your session may have expired. Please reconnect your Mastodon account.`;
      } else if (response.status === 403) {
        errorMessage = `Mastodon API error: Permission denied. This might be due to:\n• Account restrictions\n• Invalid access token\n• Server policy violations`;
      } else if (response.status === 429) {
        errorMessage = `Mastodon API error: Rate limit exceeded. Please wait before posting again.`;
      } else if (response.status === 400) {
        errorMessage = `Mastodon API error: Invalid request. Please check your content.`;
      } else {
        errorMessage = `Mastodon API error (${response.status}): ${errorData.details || errorData.error || response.statusText}`;
      }
    } catch (parseError) {
      console.error('Failed to parse Mastodon error response:', parseError);
      const errorText = await response.text();
      errorMessage = `Mastodon API error (${response.status}): ${errorText || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};
