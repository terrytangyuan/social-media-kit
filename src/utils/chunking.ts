import GraphemeSplitter from 'grapheme-splitter';

export type Platform = 'linkedin' | 'twitter' | 'mastodon' | 'bluesky';

export const getPlatformTextLength = (text: string, platform: Platform): number => {
  if (platform === 'bluesky') {
    // Use grapheme-splitter for Bluesky (matches what Bluesky sees)
    try {
      const splitter = new GraphemeSplitter();
      return splitter.countGraphemes(text);
    } catch {
      return Array.from(text).length;
    }
  }
  // For other platforms, use UTF-16 length
  return text.length;
};

// Helper function to find the best break point within the character limit
// For Bluesky, we need to work with grapheme-aware positions
export const findBestBreakPoint = (text: string, limit: number, platform: Platform): number => {
  if (platform === 'bluesky') {
    // For Bluesky, we need to find break points by grapheme count, not string index
    try {
      const splitter = new GraphemeSplitter();
      const graphemes = splitter.splitGraphemes(text);

      // We want to break at or before the limit (in graphemes)
      if (graphemes.length <= limit) {
        return text.length;
      }

      // Look for sentence endings FIRST (highest priority - complete thoughts)
      // Search through graphemes to find the last sentence ending within the limit
      const sentenceMarkers = ['. ', '? ', '! '];
      let lastSentenceEndGraphemeIndex = -1;

      for (let i = 0; i < Math.min(limit, graphemes.length); i++) {
        const currentText = graphemes.slice(0, i + 1).join('');
        for (const marker of sentenceMarkers) {
          if (currentText.endsWith(marker)) {
            lastSentenceEndGraphemeIndex = i;
            break;
          }
        }
      }

      if (lastSentenceEndGraphemeIndex > -1) {
        return graphemes.slice(0, lastSentenceEndGraphemeIndex + 1).join('').length;
      }

      // Look for paragraph breaks (natural content break)
      const textUpToLimit = graphemes.slice(0, limit).join('');
      const paragraphBreak = textUpToLimit.lastIndexOf('\n\n');
      if (paragraphBreak > textUpToLimit.length * 0.3) {
        return paragraphBreak + 2;
      }

      // Look for line breaks
      const lineBreak = textUpToLimit.lastIndexOf('\n');
      if (lineBreak > textUpToLimit.length * 0.5) {
        return lineBreak + 1;
      }

      // Look for word boundaries (spaces)
      const spaceBreak = textUpToLimit.lastIndexOf(' ');
      if (spaceBreak > textUpToLimit.length * 0.6) {
        return spaceBreak + 1;
      }

      // Use the full limit
      return textUpToLimit.length;
    } catch {
      // Fallback to regular logic if grapheme-splitter fails
      return Math.min(limit, text.length);
    }
  }

  // For other platforms, use the original logic (UTF-16 based)
  // Look for sentence endings FIRST (highest priority - complete thoughts)
  // Find the LAST sentence ending within the limit, regardless of position
  const sentenceMarkers = ['. ', '? ', '! '];
  let lastSentenceEnd = -1;
  for (const marker of sentenceMarkers) {
    const pos = text.lastIndexOf(marker, limit - marker.length);
    if (pos > lastSentenceEnd) {
      lastSentenceEnd = pos;
    }
  }
  // Use the last sentence ending if found (no threshold - complete sentences are priority)
  if (lastSentenceEnd > -1) {
    return lastSentenceEnd + 2; // +2 for marker length (e.g., '. ')
  }

  // Look for paragraph breaks (natural content break)
  const paragraphBreak = text.lastIndexOf('\n\n', limit - 2);
  if (paragraphBreak > limit * 0.3) {
    return paragraphBreak + 2;
  }

  // Look for line breaks
  const lineBreak = text.lastIndexOf('\n', limit - 1);
  if (lineBreak > limit * 0.5) {
    return lineBreak + 1;
  }

  // Look for word boundaries (spaces)
  const spaceBreak = text.lastIndexOf(' ', limit - 1);
  if (spaceBreak > limit * 0.6) {
    return spaceBreak + 1;
  }

  // If no good break point found, use the limit (will be handled by caller)
  return limit;
};

export const chunkText = (
  text: string,
  platform: Platform,
  platformLimits: { [key in Platform]: number }
): string[] => {
  const limit = platformLimits[platform];

  if (getPlatformTextLength(text, platform) <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  while (getPlatformTextLength(remainingText, platform) > 0) {
    if (getPlatformTextLength(remainingText, platform) <= limit) {
      chunks.push(remainingText);
      break;
    }

    // Find the best break point within the limit
    const breakPoint = findBestBreakPoint(remainingText, limit, platform);

    // Extract chunk and clean up
    let chunk = remainingText.substring(0, breakPoint).replace(/\s+$/, ''); // Remove trailing whitespace

    // Ensure chunk doesn't exceed limit after cleanup
    if (getPlatformTextLength(chunk, platform) > limit) {
      // If still too long, force break at a safe point
      chunk = remainingText.substring(0, limit).replace(/\s+$/, '');
      // Find last space before limit to avoid breaking words if possible
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > limit * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
    }

    chunks.push(chunk);

    // Remove processed text and clean up leading whitespace
    remainingText = remainingText.substring(chunk.length).replace(/^\s+/, '');
  }

  // Final safety check: ensure no chunk exceeds limit
  return chunks.map(chunk => {
    const chunkLength = getPlatformTextLength(chunk, platform);
    if (chunkLength > limit) {
      console.warn(`Chunk exceeds ${platform} limit (${chunkLength}/${limit}):`, chunk.substring(0, 50) + '...');
      // For Bluesky, we need to truncate by graphemes, not by string index
      // For now, just truncate by string index and let it be slightly over
      return chunk.substring(0, limit - 3) + '...';
    }
    return chunk;
  }).filter(chunk => getPlatformTextLength(chunk, platform) > 0);
};
