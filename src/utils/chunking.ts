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
      // but avoid creating too-small chunks
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

      // Use sentence ending if found AND it's not too small (> 30% of limit)
      if (lastSentenceEndGraphemeIndex > -1 && lastSentenceEndGraphemeIndex > limit * 0.3) {
        return graphemes.slice(0, lastSentenceEndGraphemeIndex + 1).join('').length;
      }

      // Look for paragraph breaks (natural content break)
      const textUpToLimit = graphemes.slice(0, limit).join('');
      const paragraphBreak = textUpToLimit.lastIndexOf('\n\n');
      if (paragraphBreak > textUpToLimit.length * 0.3) {
        // Check if the text after the paragraph break starts with a list marker
        const afterBreak = textUpToLimit.substring(paragraphBreak + 2);
        const listMarkerPattern = /^(\d+[\.\)]\s|[-*•]\s)/;

        // If it's a list item, check if we can include it, otherwise DON'T use this break
        if (listMarkerPattern.test(afterBreak)) {
          // Find the end of this list item (next paragraph or line break)
          const nextParagraphBreak = afterBreak.indexOf('\n\n');
          const nextLineBreak = afterBreak.indexOf('\n');
          let listItemEnd: number;

          if (nextParagraphBreak !== -1 && (nextLineBreak === -1 || nextParagraphBreak < nextLineBreak)) {
            listItemEnd = nextParagraphBreak;
          } else if (nextLineBreak !== -1) {
            listItemEnd = nextLineBreak;
          } else {
            listItemEnd = afterBreak.length;
          }

          // If the complete list item fits within our grapheme limit, include it
          const splitter = new GraphemeSplitter();
          const listItemGraphemes = splitter.countGraphemes(textUpToLimit.substring(0, paragraphBreak + 2 + listItemEnd));

          if (listItemGraphemes <= limit) {
            return paragraphBreak + 2 + listItemEnd;
          } else {
            // List item is too long - we can't include it
            // Break BEFORE the paragraph that precedes this list item
            // This ensures the list item starts fresh in the next chunk
            const textBeforeParagraph = textUpToLimit.substring(0, paragraphBreak);

            // Try to find a sentence ending before this paragraph
            const sentenceMarkers = ['. ', '? ', '! '];
            let lastSentenceEnd = -1;
            for (const marker of sentenceMarkers) {
              const pos = textBeforeParagraph.lastIndexOf(marker);
              if (pos > lastSentenceEnd) {
                lastSentenceEnd = pos;
              }
            }
            if (lastSentenceEnd > textBeforeParagraph.length * 0.3) {
              return lastSentenceEnd + 2;
            }

            // Try previous paragraph break
            const prevParagraphBreak = textBeforeParagraph.lastIndexOf('\n\n');
            if (prevParagraphBreak > 0) {
              return prevParagraphBreak + 2;
            }

            // Last resort: break right before this paragraph (before the \n\n)
            return paragraphBreak;
          }
        } else {
          return paragraphBreak + 2;
        }
      }

      // Look for line breaks, but avoid breaking numbered/bulleted lists
      const lineBreak = textUpToLimit.lastIndexOf('\n');
      if (lineBreak > textUpToLimit.length * 0.5) {
        // Check if the text after the line break starts with a list marker
        const afterBreak = textUpToLimit.substring(lineBreak + 1);
        const listMarkerPattern = /^(\d+[\.\)]\s|[-*•]\s)/;

        // If it's a list item, check if we can include it, otherwise find a previous break
        if (listMarkerPattern.test(afterBreak)) {
          // Find the end of this list item (next line break or limit)
          const nextLineBreak = afterBreak.indexOf('\n');
          const listItemEnd = nextLineBreak === -1 ? afterBreak.length : nextLineBreak;

          // If the complete list item fits within our grapheme limit, include it
          const splitter = new GraphemeSplitter();
          const listItemGraphemes = splitter.countGraphemes(textUpToLimit.substring(0, lineBreak + 1 + listItemEnd));

          if (listItemGraphemes <= limit) {
            return lineBreak + 1 + listItemEnd;
          } else {
            // List item is too long to fit, find a previous break point
            const prevLineBreak = textUpToLimit.lastIndexOf('\n', lineBreak - 1);
            if (prevLineBreak > textUpToLimit.length * 0.3) {
              return prevLineBreak + 1;
            }
          }
        } else {
          return lineBreak + 1;
        }
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
  // Find the LAST sentence ending within the limit, but avoid creating too-small chunks
  const sentenceMarkers = ['. ', '? ', '! '];
  let lastSentenceEnd = -1;
  for (const marker of sentenceMarkers) {
    const pos = text.lastIndexOf(marker, limit - marker.length);
    if (pos > lastSentenceEnd) {
      lastSentenceEnd = pos;
    }
  }
  // Use the last sentence ending if found AND it's not too small (> 30% of limit)
  // This prevents creating tiny chunks like "Title! " followed by the rest
  if (lastSentenceEnd > -1 && lastSentenceEnd > limit * 0.3) {
    return lastSentenceEnd + 2; // +2 for marker length (e.g., '. ')
  }

  // Look for paragraph breaks (natural content break)
  const paragraphBreak = text.lastIndexOf('\n\n', limit - 2);
  if (paragraphBreak > limit * 0.3) {
    // Check if the text after the paragraph break starts with a list marker
    const afterBreak = text.substring(paragraphBreak + 2);
    const listMarkerPattern = /^(\d+[\.\)]\s|[-*•]\s)/;

    // If it's a list item, check if we can include it, otherwise DON'T use this break
    if (listMarkerPattern.test(afterBreak)) {
      // Find the end of this list item (next paragraph or line break)
      const nextParagraphBreak = afterBreak.indexOf('\n\n');
      const nextLineBreak = afterBreak.indexOf('\n');
      let listItemEnd: number;

      if (nextParagraphBreak !== -1 && (nextLineBreak === -1 || nextParagraphBreak < nextLineBreak)) {
        listItemEnd = nextParagraphBreak;
      } else if (nextLineBreak !== -1) {
        listItemEnd = nextLineBreak;
      } else {
        listItemEnd = afterBreak.length;
      }

      // If the complete list item fits, include it
      if (paragraphBreak + 2 + listItemEnd <= limit) {
        return paragraphBreak + 2 + listItemEnd;
      } else {
        // List item is too long - we can't include it
        // Break BEFORE the paragraph that precedes this list item
        // This ensures the list item starts fresh in the next chunk
        const textBeforeParagraph = text.substring(0, paragraphBreak);

        // Try to find a sentence ending before this paragraph
        const sentenceMarkers = ['. ', '? ', '! '];
        let lastSentenceEnd = -1;
        for (const marker of sentenceMarkers) {
          const pos = textBeforeParagraph.lastIndexOf(marker);
          if (pos > lastSentenceEnd) {
            lastSentenceEnd = pos;
          }
        }
        if (lastSentenceEnd > textBeforeParagraph.length * 0.3) {
          return lastSentenceEnd + 2;
        }

        // Try previous paragraph break
        const prevParagraphBreak = textBeforeParagraph.lastIndexOf('\n\n');
        if (prevParagraphBreak > 0) {
          return prevParagraphBreak + 2;
        }

        // Last resort: break right before this paragraph (before the \n\n)
        return paragraphBreak;
      }
    } else {
      return paragraphBreak + 2;
    }
  }

  // Look for line breaks, but avoid breaking numbered/bulleted lists
  const lineBreak = text.lastIndexOf('\n', limit - 1);
  if (lineBreak > limit * 0.5) {
    // Check if the text after the line break starts with a list marker
    const afterBreak = text.substring(lineBreak + 1);
    const listMarkerPattern = /^(\d+[\.\)]\s|[-*•]\s)/;

    // If it's a list item, check if we can include it, otherwise find a previous break
    if (listMarkerPattern.test(afterBreak)) {
      // Find the end of this list item (next line break or limit)
      const nextLineBreak = afterBreak.indexOf('\n');
      const listItemEnd = nextLineBreak === -1 ? afterBreak.length : nextLineBreak;

      // If the complete list item fits, include it
      if (lineBreak + 1 + listItemEnd <= limit) {
        return lineBreak + 1 + listItemEnd;
      } else {
        // List item is too long to fit, find a previous break point
        const prevLineBreak = text.lastIndexOf('\n', lineBreak - 1);
        if (prevLineBreak > limit * 0.3) {
          return prevLineBreak + 1;
        }
      }
    } else {
      return lineBreak + 1;
    }
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
    let actualChunkLength = breakPoint; // Track the actual length to remove from remainingText

    // Ensure chunk doesn't exceed limit after cleanup
    if (getPlatformTextLength(chunk, platform) > limit) {
      // If still too long, force break at a safe point
      chunk = remainingText.substring(0, limit).replace(/\s+$/, '');
      // Find last space before limit to avoid breaking words if possible
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > limit * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
      actualChunkLength = chunk.length;
    }

    // CRITICAL: Check if chunk ends with an orphaned list marker
    // If it does, remove it so it appears in the next chunk instead
    const lines = chunk.split('\n');
    const lastLine = lines[lines.length - 1]?.trim();
    if (lastLine && /^\d+[\.\)]\s*$/.test(lastLine)) {
      // Last line is ONLY a list marker - remove it
      lines.pop();
      chunk = lines.join('\n').replace(/\s+$/, '');
      // Find where this orphaned marker started in the original text
      actualChunkLength = chunk.length;
    }

    chunks.push(chunk);

    // Remove processed text and clean up leading whitespace
    remainingText = remainingText.substring(actualChunkLength).replace(/^\s+/, '');
  }

  // Final safety check: ensure no chunk exceeds limit
  const validatedChunks = chunks.map(chunk => {
    const chunkLength = getPlatformTextLength(chunk, platform);
    if (chunkLength > limit) {
      console.warn(`Chunk exceeds ${platform} limit (${chunkLength}/${limit}):`, chunk.substring(0, 50) + '...');
      // For Bluesky, we need to truncate by graphemes, not by string index
      // For now, just truncate by string index and let it be slightly over
      return chunk.substring(0, limit - 3) + '...';
    }
    return chunk;
  }).filter(chunk => getPlatformTextLength(chunk, platform) > 0);

  // Post-process: combine adjacent chunks if they fit together
  const optimizedChunks: string[] = [];
  let i = 0;
  while (i < validatedChunks.length) {
    let combinedChunk = validatedChunks[i];

    // Try to combine with next chunks while under limit
    while (i + 1 < validatedChunks.length) {
      const nextChunk = validatedChunks[i + 1];
      const testCombined = combinedChunk + ' ' + nextChunk;

      if (getPlatformTextLength(testCombined, platform) <= limit) {
        combinedChunk = testCombined;
        i++;
      } else {
        break;
      }
    }

    optimizedChunks.push(combinedChunk);
    i++;
  }

  return optimizedChunks;
};
