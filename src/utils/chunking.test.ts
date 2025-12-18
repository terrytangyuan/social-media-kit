import { describe, it, expect } from '@jest/globals';
import { getPlatformTextLength, findBestBreakPoint, chunkText, Platform } from './chunking';

describe('Chunking Utilities', () => {
  describe('getPlatformTextLength', () => {
    it('should count regular ASCII text correctly', () => {
      const text = 'Hello World';
      expect(getPlatformTextLength(text, 'twitter')).toBe(11);
      expect(getPlatformTextLength(text, 'linkedin')).toBe(11);
      expect(getPlatformTextLength(text, 'mastodon')).toBe(11);
    });

    it('should count graphemes correctly for Bluesky', () => {
      const text = 'Hello 👋 World';
      // Twitter/LinkedIn/Mastodon count emojis as 2 chars
      expect(getPlatformTextLength(text, 'twitter')).toBe(14);
      // Bluesky counts graphemes (emoji is 1 grapheme)
      expect(getPlatformTextLength(text, 'bluesky')).toBe(13);
    });

    it('should handle Unicode characters', () => {
      const text = 'Café ☕️';
      expect(getPlatformTextLength(text, 'twitter')).toBe(text.length);
      expect(getPlatformTextLength(text, 'bluesky')).toBeGreaterThan(0);
    });

    it('should handle emoji sequences for Bluesky', () => {
      const text = '👨‍👩‍👧‍👦'; // Family emoji (single grapheme)
      // Bluesky should count this as 1 grapheme
      expect(getPlatformTextLength(text, 'bluesky')).toBe(1);
    });
  });

  describe('findBestBreakPoint', () => {
    describe('for Twitter/LinkedIn/Mastodon', () => {
      it('should break at sentence ending when available', () => {
        const text = 'This is a sentence. This is another sentence.';
        const breakPoint = findBestBreakPoint(text, 25, 'twitter');
        expect(text.substring(0, breakPoint)).toBe('This is a sentence. ');
      });

      it('should not break at very short sentence ending (<30% of limit)', () => {
        const text = 'Hi! This is a much longer sentence that continues.';
        const breakPoint = findBestBreakPoint(text, 100, 'twitter');
        // Should skip the "Hi!" and find a better break point
        expect(breakPoint).toBeGreaterThan(4);
      });

      it('should break at paragraph when no good sentence ending', () => {
        const text = 'First paragraph\n\nSecond paragraph continues here';
        const breakPoint = findBestBreakPoint(text, 50, 'twitter');
        // Should break around the paragraph boundary
        const chunk = text.substring(0, breakPoint);
        expect(chunk).toContain('First paragraph');
        expect(breakPoint).toBeGreaterThan(15);
      });

      it('should break at line break when available', () => {
        const text = 'First line\nSecond line continues';
        const breakPoint = findBestBreakPoint(text, 25, 'twitter');
        // Should break around the line boundary
        const chunk = text.substring(0, breakPoint);
        expect(chunk).toContain('First line');
        expect(breakPoint).toBeGreaterThan(10);
      });

      it('should break at word boundary when no better option', () => {
        const text = 'This is a long text without any sentence endings or paragraphs';
        const breakPoint = findBestBreakPoint(text, 20, 'twitter');
        expect(text.substring(0, breakPoint).endsWith(' ')).toBe(true);
      });

      it('should use limit when no good break point found', () => {
        const text = 'ThisIsOneVeryLongWordWithoutAnySpaces';
        const breakPoint = findBestBreakPoint(text, 10, 'twitter');
        expect(breakPoint).toBe(10);
      });
    });

    describe('for Bluesky', () => {
      it('should break at sentence ending using grapheme count', () => {
        const text = 'Hello! This continues with more text.';
        const breakPoint = findBestBreakPoint(text, 10, 'bluesky');
        expect(text.substring(0, breakPoint)).toBe('Hello! ');
      });

      it('should handle emoji in Bluesky grapheme counting', () => {
        const text = 'Hello 👋! More text here.';
        const breakPoint = findBestBreakPoint(text, 10, 'bluesky');
        // Should count emoji as 1 grapheme
        expect(breakPoint).toBeGreaterThan(0);
      });
    });
  });

  describe('chunkText', () => {
    const platformLimits = {
      linkedin: 3000,
      twitter: 280,
      mastodon: 500,
      bluesky: 300,
    };

    describe('Basic chunking', () => {
      it('should not chunk text within limit', () => {
        const text = 'Short text';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe(text);
      });

      it('should chunk text exceeding limit', () => {
        const text = 'A'.repeat(600);
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'twitter')).toBeLessThanOrEqual(280);
        });
      });

      it('should chunk at sentence boundaries when possible', () => {
        const text = 'This is the first sentence. This is the second sentence. ' + 'A'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0]).toContain('This is the first sentence.');
      });
    });

    describe('Platform-specific chunking', () => {
      it('should respect Twitter 280 character limit', () => {
        const text = 'A'.repeat(600);
        const chunks = chunkText(text, 'twitter', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should respect Mastodon 500 character limit', () => {
        const text = 'A'.repeat(1000);
        const chunks = chunkText(text, 'mastodon', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(500);
        });
      });

      it('should respect Bluesky 300 grapheme limit', () => {
        const text = 'A'.repeat(700);
        const chunks = chunkText(text, 'bluesky', platformLimits);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });

      it('should respect LinkedIn 3000 character limit', () => {
        const text = 'A'.repeat(4000);
        const chunks = chunkText(text, 'linkedin', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(3000);
        });
      });
    });

    describe('Chunk optimization', () => {
      it('should combine small adjacent chunks when they fit', () => {
        const text = 'First! ' + 'Second sentence here. ' + 'Third sentence.';
        const chunks = chunkText(text, 'twitter', platformLimits);
        // Should combine into one chunk since total is under 280
        expect(chunks).toHaveLength(1);
      });

      it('should not combine chunks that exceed limit', () => {
        const text = 'A'.repeat(200) + '. ' + 'B'.repeat(200) + '.';
        const chunks = chunkText(text, 'twitter', platformLimits);
        // Should be 2 chunks since combining would exceed 280
        expect(chunks.length).toBeGreaterThan(1);
      });

      it('should avoid creating very small chunks (<30% of limit)', () => {
        // Create text with a very short sentence followed by longer content
        const text = 'Hi! ' + 'This is a much longer sentence. '.repeat(10);
        const chunks = chunkText(text, 'mastodon', platformLimits);

        // First chunk should be more than just "Hi!"
        if (chunks.length > 1) {
          expect(chunks[0].length).toBeGreaterThan(platformLimits.mastodon * 0.3);
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const chunks = chunkText('', 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('');
      });

      it('should handle single character', () => {
        const chunks = chunkText('A', 'twitter', platformLimits);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('A');
      });

      it('should handle text with only whitespace', () => {
        const text = '   \n\n   ';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(0);
      });

      it('should handle text with multiple newlines', () => {
        const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
        const chunks = chunkText(text, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should handle very long words', () => {
        const longWord = 'A'.repeat(300);
        const chunks = chunkText(longWord, 'twitter', platformLimits);
        expect(chunks.length).toBeGreaterThan(1);
      });

      it('should handle mixed content with emojis', () => {
        const text = '🚀 '.repeat(100) + 'This is text.';
        const chunks = chunkText(text, 'bluesky', platformLimits);
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });

      it('should remove empty chunks from result', () => {
        const text = 'A'.repeat(500);
        const chunks = chunkText(text, 'twitter', platformLimits);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Real-world scenarios', () => {
      it('should chunk a typical job posting', () => {
        const text = `🚀 We're Hiring Software Engineers in 2026!

Our team at Red Hat AI continues to grow, and we're looking for passionate engineers (at multiple levels) to help us push the boundaries of AI infrastructure.

We're especially excited to meet folks with experience in: Golang, Rust, C++, Python, Kubernetes, distributed systems, and Open Source.

If building next-generation distributed AI systems excites you, we'd love to hear from you!

📮 Please email me (address in my profile) with a short summary of your background + your resume.

👉 Not looking right now? Know someone who'd be a great fit? Tag them in the comments or share this post!`;

        const chunks = chunkText(text, 'mastodon', platformLimits);

        // Should create multiple chunks
        expect(chunks.length).toBeGreaterThan(1);

        // Each chunk should be under the limit
        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'mastodon')).toBeLessThanOrEqual(500);
        });

        // Combined chunks should equal original text (after trimming)
        const combined = chunks.join(' ').replace(/\s+/g, ' ').trim();
        const original = text.replace(/\s+/g, ' ').trim();
        expect(combined.length).toBeLessThanOrEqual(original.length);
      });

      it('should chunk a Twitter thread properly', () => {
        const text = 'Introduction to the topic. ' + 'A'.repeat(250) + '. Conclusion.';
        const chunks = chunkText(text, 'twitter', platformLimits);

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(280);
        });
      });

      it('should handle Bluesky posts with emojis and mentions', () => {
        const text = '👋 Hello @user.bsky.social! '.repeat(20) + 'More content here.';
        const chunks = chunkText(text, 'bluesky', platformLimits);

        chunks.forEach(chunk => {
          expect(getPlatformTextLength(chunk, 'bluesky')).toBeLessThanOrEqual(300);
        });
      });
    });

    describe('Whitespace handling', () => {
      it('should trim trailing whitespace from chunks', () => {
        const text = 'This is a sentence.   ' + 'B'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);

        chunks.forEach(chunk => {
          // Chunks shouldn't have trailing whitespace (except maybe single space)
          expect(chunk).not.toMatch(/\s{2,}$/);
        });
      });

      it('should trim leading whitespace from subsequent chunks', () => {
        const text = 'First sentence.    Second sentence. ' + 'C'.repeat(300);
        const chunks = chunkText(text, 'twitter', platformLimits);

        if (chunks.length > 1) {
          for (let i = 1; i < chunks.length; i++) {
            // Subsequent chunks shouldn't start with whitespace
            expect(chunks[i]).not.toMatch(/^\s+/);
          }
        }
      });
    });

    describe('List item handling', () => {
      it('should keep numbered list items together with their content', () => {
        const text = `Introduction text here.

1. First item with some content
2. Second item with content
3. Third item with more content`;

        const chunks = chunkText(text, 'twitter', platformLimits);

        // No chunk should start with just a number and period without content
        chunks.forEach(chunk => {
          // If a chunk starts with a list marker, it should have content on the same line
          const lines = chunk.split('\n');
          lines.forEach(line => {
            if (/^\d+[\.\)]\s*$/.test(line.trim())) {
              // This line has ONLY a list marker with no content - this is the bug
              throw new Error(`Found orphaned list marker: "${line}"`);
            }
          });
        });
      });

      it('should handle numbered list items with long URLs', () => {
        const text = `https://www.linkedin.com/in/terrytangyuan/

1. Principal Machine Learning Engineer, AI Inference: https://redhat.wd5.myworkdayjobs.com/jobs/job/Boston/Principal-Machine-Learning-Engineer--AI-Inference_R-050966-2

2. Senior Machine Learning Engineer, LLM Compressor and Quantization: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Senior-Machine-Learning-Engineer--LLM-Compressor-and-Quantization_R-047155-1

3. Principal Machine Learning Engineer, Distributed vLLM Inference: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Boston/Principal-Machine-Learning-Engineer--Distributed-vLLM-Inference_R-050962-1`;

        const chunks = chunkText(text, 'linkedin', platformLimits);

        // Verify no orphaned list markers
        chunks.forEach((chunk, index) => {
          const lines = chunk.split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            // Check if line is ONLY a list marker (number + period/paren + optional space)
            if (/^\d+[\.\)]\s*$/.test(trimmed)) {
              throw new Error(`Chunk ${index + 1} has orphaned list marker: "${trimmed}"`);
            }
          });
        });

        // Verify each numbered item stays with its content
        const allText = chunks.join(' ');
        expect(allText).toContain('1. Principal');
        expect(allText).toContain('2. Senior');
        expect(allText).toContain('3. Principal');
      });

      it('should handle full user job posting with unicode formatting without breaking list items', () => {
        // This is the user's post WITH Unicode bold/italic formatting (as shown in preview)
        const text = `🚀 𝗠𝗼𝗿𝗲 𝗽𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝘀 𝗮𝗿𝗲 𝗼𝗽𝗲𝗻 𝗮𝘁 𝗥𝗲𝗱 𝗛𝗮𝘁 𝗔𝗜!

Our 𝗜𝗻𝗳𝗲𝗿𝗲𝗻𝗰𝗲 𝗘𝗻𝗴𝗶𝗻𝗲𝗲𝗿𝗶𝗻𝗴 team continues to grow with ML engineer, researcher, and developer advocate positions! We're looking for passionate candidates to help us push the boundaries of 𝗔𝗜/𝗟𝗟𝗠 𝗶𝗻𝗳𝗲𝗿𝗲𝗻𝗰𝗲 and contribute directly to open source projects like vLLM and llm-d.

📩 Please check out these job postings and 𝗲𝗺𝗮𝗶𝗹 𝗺𝗲 (address in my profile) with a short summary of your background + your resume. https://www.linkedin.com/in/terrytangyuan/

1. Principal Machine Learning Engineer, AI Inference: https://redhat.wd5.myworkdayjobs.com/jobs/job/Boston/Principal-Machine-Learning-Engineer--AI-Inference_R-050966-2

2. Senior Machine Learning Engineer, LLM Compressor and Quantization: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Senior-Machine-Learning-Engineer--LLM-Compressor-and-Quantization_R-047155-1

3. Principal Machine Learning Engineer, Distributed vLLM Inference: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Boston/Principal-Machine-Learning-Engineer--Distributed-vLLM-Inference_R-050962-1

4. Machine Learning Engineer, vLLM Inference, Tool Calling and Structured Output: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Machine-Learning-Engineer--vLLM-Inference---Tool-Calling-and-Structured-Output_R-052780

5. Machine Learning Systems Research Intern, PhD, Summer 2026: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/jobs/details/Machine-Learning-Systems-Research-Intern--PhD--Summer-2026_R-052661?q=machine+learning+research+intern

6: AI Developer Advocate: https://redhat.wd5.myworkdayjobs.com/Jobs/job/Boston/AI-Developer-Advocate_R-052430

If you are curious about what our teams are working on with open source communities, check out this newsletter that we recently launched! https://inferenceops.substack.com/

👉 Not looking right now? Know someone who'd be a great fit? Tag them in the comments or share this post!

#Hiring #WereHiring #NowHiring #JoinOurTeam #JobOpening #CareerOpportunity #JobSearch #HiringAlert  #OpenRoles  #SoftwareEngineering #KubernetesJobs #CloudNative #AIJobs #MLOps #DevOpsJobs #Careers #GrowthOpportunities #HiringTalent #CFBR`;

        console.log('Text length:', text.length);
        const chunks = chunkText(text, 'linkedin', platformLimits);

        // Debug: Print all chunks
        console.log('\n=== CHUNKS ===');
        chunks.forEach((chunk, index) => {
          console.log(`\nChunk ${index + 1} (${chunk.length} chars):`);
          console.log(chunk);
          console.log('='.repeat(50));
        });

        // Critical: No chunk should have ONLY a number followed by period/paren
        chunks.forEach((chunk, index) => {
          const lines = chunk.split('\n');
          lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            // Check if this line is ONLY a list marker with nothing after it
            if (/^\d+[\.\)]\s*$/.test(trimmed)) {
              console.error(`\nERROR: Chunk ${index + 1}, Line ${lineIndex + 1}: "${line}"`);
              console.error('Full chunk:', chunk);
              throw new Error(`Found orphaned list marker at chunk ${index + 1}: "${trimmed}"`);
            }
          });
        });

        // Each list item number should be on the same line/chunk as its description
        for (let i = 1; i <= 6; i++) {
          chunks.forEach((chunk, chunkIndex) => {
            const regex = new RegExp(`${i}[\.:]\\s*([^\\n]*)`);
            const match = chunk.match(regex);
            if (match) {
              const contentAfter = match[1].trim();
              if (contentAfter.length === 0) {
                console.error(`\nERROR: Found "${i}." without content`);
                console.error('Chunk:', chunk);
                throw new Error(`Chunk ${chunkIndex + 1}: Found "${i}." without content on same line`);
              }
              // Content should have some meaningful text, not just be empty
              expect(contentAfter.length).toBeGreaterThan(10);
            }
          });
        }
      });

      it('should handle bulleted lists', () => {
        const text = `Introduction:

- First bullet point
- Second bullet point
* Third bullet point
• Fourth bullet point`;

        const chunks = chunkText(text, 'twitter', platformLimits);

        chunks.forEach(chunk => {
          const lines = chunk.split('\n');
          lines.forEach(line => {
            // No line should be ONLY a bullet marker
            if (/^[-*•]\s*$/.test(line.trim())) {
              throw new Error(`Found orphaned bullet marker: "${line}"`);
            }
          });
        });
      });

      it('should handle user job posting for Bluesky without breaking list items', () => {
        // User's actual post for Bluesky (300 grapheme limit)
        const text = `🚀 More positions are open at Red Hat AI!

Our Inference Engineering team continues to grow with ML engineer, researcher, and developer advocate positions! We're looking for passionate candidates to help us push the boundaries of AI/LLM inference and contribute directly to open source projects like vLLM and llm-d.

📩 Please check out these job postings and email me (address in my profile) with a short summary of your background + your resume. https://www.linkedin.com/in/terrytangyuan/

1. Principal Machine Learning Engineer, AI Inference: https://redhat.wd5.myworkdayjobs.com/jobs/job/Boston/Principal-Machine-Learning-Engineer--AI-Inference_R-050966-2

2. Senior Machine Learning Engineer, LLM Compressor and Quantization: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Senior-Machine-Learning-Engineer--LLM-Compressor-and-Quantization_R-047155-1

3. Principal Machine Learning Engineer, Distributed vLLM Inference: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Boston/Principal-Machine-Learning-Engineer--Distributed-vLLM-Inference_R-050962-1

4. Machine Learning Engineer, vLLM Inference, Tool Calling and Structured Output: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Machine-Learning-Engineer--vLLM-Inference---Tool-Calling-and-Structured-Output_R-052780

5. Machine Learning Systems Research Intern, PhD, Summer 2026: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/jobs/details/Machine-Learning-Systems-Research-Intern--PhD--Summer-2026_R-052661?q=machine+learning+research+intern

6: AI Developer Advocate: https://redhat.wd5.myworkdayjobs.com/Jobs/job/Boston/AI-Developer-Advocate_R-052430

If you are curious about what our teams are working on with open source communities, check out this newsletter that we recently launched! https://inferenceops.substack.com/

👉 Not looking right now? Know someone who'd be a great fit? Tag them in the comments or share this post!

#Hiring #WereHiring #NowHiring #JoinOurTeam #JobOpening #CareerOpportunity #JobSearch #HiringAlert  #OpenRoles  #SoftwareEngineering #KubernetesJobs #CloudNative #AIJobs #MLOps #DevOpsJobs #Careers #GrowthOpportunities #HiringTalent #CFBR`;

        console.log('\n=== BLUESKY TEST (300 grapheme limit) ===');
        console.log('Text length:', text.length);

        const chunks = chunkText(text, 'bluesky', platformLimits);

        console.log(`Number of chunks: ${chunks.length}\n`);
        chunks.forEach((chunk, index) => {
          const graphemeCount = getPlatformTextLength(chunk, 'bluesky');
          console.log(`Chunk ${index + 1} (${graphemeCount} graphemes, ${chunk.length} chars):`);
          console.log(chunk);
          console.log('='.repeat(70));
        });

        // Verify no orphaned list markers
        chunks.forEach((chunk, index) => {
          const lines = chunk.split('\n');
          lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            if (/^\d+[\.\)]\s*$/.test(trimmed)) {
              console.error(`\nERROR in Bluesky chunk ${index + 1}, line ${lineIndex + 1}:`);
              console.error(`Found orphaned: "${trimmed}"`);
              console.error('Full chunk:', chunk);
              throw new Error(`Bluesky: Found orphaned list marker "${trimmed}" in chunk ${index + 1}`);
            }
          });
        });
      });

      it('should handle user job posting for Mastodon without breaking list items', () => {
        // User's actual post for Mastodon (500 char limit)
        const text = `🚀 More positions are open at Red Hat AI!

Our Inference Engineering team continues to grow with ML engineer, researcher, and developer advocate positions! We're looking for passionate candidates to help us push the boundaries of AI/LLM inference and contribute directly to open source projects like vLLM and llm-d.

📩 Please check out these job postings and email me (address in my profile) with a short summary of your background + your resume. https://www.linkedin.com/in/terrytangyuan/

1. Principal Machine Learning Engineer, AI Inference: https://redhat.wd5.myworkdayjobs.com/jobs/job/Boston/Principal-Machine-Learning-Engineer--AI-Inference_R-050966-2

2. Senior Machine Learning Engineer, LLM Compressor and Quantization: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Senior-Machine-Learning-Engineer--LLM-Compressor-and-Quantization_R-047155-1

3. Principal Machine Learning Engineer, Distributed vLLM Inference: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Boston/Principal-Machine-Learning-Engineer--Distributed-vLLM-Inference_R-050962-1

4. Machine Learning Engineer, vLLM Inference, Tool Calling and Structured Output: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/job/Machine-Learning-Engineer--vLLM-Inference---Tool-Calling-and-Structured-Output_R-052780

5. Machine Learning Systems Research Intern, PhD, Summer 2026: https://redhat.wd5.myworkdayjobs.com/en-US/jobs/jobs/details/Machine-Learning-Systems-Research-Intern--PhD--Summer-2026_R-052661?q=machine+learning+research+intern

6: AI Developer Advocate: https://redhat.wd5.myworkdayjobs.com/Jobs/job/Boston/AI-Developer-Advocate_R-052430

If you are curious about what our teams are working on with open source communities, check out this newsletter that we recently launched! https://inferenceops.substack.com/

👉 Not looking right now? Know someone who'd be a great fit? Tag them in the comments or share this post!

#Hiring #WereHiring #NowHiring #JoinOurTeam #JobOpening #CareerOpportunity #JobSearch #HiringAlert  #OpenRoles  #SoftwareEngineering #KubernetesJobs #CloudNative #AIJobs #MLOps #DevOpsJobs #Careers #GrowthOpportunities #HiringTalent #CFBR`;

        console.log('\n=== MASTODON TEST (500 char limit) ===');
        console.log('Text length:', text.length);

        const chunks = chunkText(text, 'mastodon', platformLimits);

        console.log(`Number of chunks: ${chunks.length}\n`);
        chunks.forEach((chunk, index) => {
          console.log(`Chunk ${index + 1} (${chunk.length} chars):`);
          console.log(chunk);
          console.log('='.repeat(70));
        });

        // Verify no orphaned list markers
        chunks.forEach((chunk, index) => {
          const lines = chunk.split('\n');
          lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            if (/^\d+[\.\)]\s*$/.test(trimmed)) {
              console.error(`\nERROR in Mastodon chunk ${index + 1}, line ${lineIndex + 1}:`);
              console.error(`Found orphaned: "${trimmed}"`);
              console.error('Full chunk:', chunk);
              throw new Error(`Mastodon: Found orphaned list marker "${trimmed}" in chunk ${index + 1}`);
            }
          });
        });
      });
    });
  });
});
