import { describe, it, expect } from '@jest/globals';
import { serializePostsForStorage, deserializePostsFromStorage } from './postSerialization';

describe('Post Serialization', () => {
  // Helper to create a mock File object
  const createMockFile = (name: string, content: string, type: string = 'image/png'): File => {
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
  };

  // Helper to create a data URL from content
  const createDataUrl = (content: string, type: string = 'image/png'): string => {
    const base64 = btoa(content);
    return `data:${type};base64,${base64}`;
  };

  describe('serializePostsForStorage', () => {
    it('should serialize posts with images', () => {
      const mockFile = createMockFile('test.png', 'test content');
      const dataUrl = createDataUrl('test content');

      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content',
          images: [
            {
              file: mockFile,
              dataUrl: dataUrl,
              name: 'test.png'
            }
          ]
        }
      ];

      const serialized = serializePostsForStorage(posts);

      expect(serialized).toHaveLength(1);
      expect(serialized[0].id).toBe('1');
      expect(serialized[0].title).toBe('Test Post');
      expect(serialized[0].images).toHaveLength(1);
      expect(serialized[0].images[0].dataUrl).toBe(dataUrl);
      expect(serialized[0].images[0].name).toBe('test.png');
      expect(serialized[0].images[0].file).toBeUndefined(); // File object removed
    });

    it('should handle posts without images', () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content'
        }
      ];

      const serialized = serializePostsForStorage(posts);

      expect(serialized).toHaveLength(1);
      expect(serialized[0].id).toBe('1');
      expect(serialized[0].images).toBeUndefined();
    });

    it('should handle empty posts array', () => {
      const serialized = serializePostsForStorage([]);
      expect(serialized).toHaveLength(0);
    });

    it('should handle posts with empty images array', () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content',
          images: []
        }
      ];

      const serialized = serializePostsForStorage(posts);

      expect(serialized).toHaveLength(1);
      expect(serialized[0].images).toHaveLength(0);
    });

    it('should preserve other post properties', () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content',
          scheduleTime: '2024-01-15T14:30',
          timezone: 'America/New_York',
          createdAt: '2024-01-15T10:00:00Z',
          customField: 'custom value'
        }
      ];

      const serialized = serializePostsForStorage(posts);

      expect(serialized[0].scheduleTime).toBe('2024-01-15T14:30');
      expect(serialized[0].timezone).toBe('America/New_York');
      expect(serialized[0].createdAt).toBe('2024-01-15T10:00:00Z');
      expect(serialized[0].customField).toBe('custom value');
    });

    it('should handle multiple posts with multiple images', () => {
      const dataUrl1 = createDataUrl('content1');
      const dataUrl2 = createDataUrl('content2');

      const posts = [
        {
          id: '1',
          title: 'Post 1',
          images: [
            { file: createMockFile('img1.png', 'content1'), dataUrl: dataUrl1, name: 'img1.png' },
            { file: createMockFile('img2.png', 'content2'), dataUrl: dataUrl2, name: 'img2.png' }
          ]
        },
        {
          id: '2',
          title: 'Post 2',
          images: [
            { file: createMockFile('img3.png', 'content3'), dataUrl: createDataUrl('content3'), name: 'img3.png' }
          ]
        }
      ];

      const serialized = serializePostsForStorage(posts);

      expect(serialized).toHaveLength(2);
      expect(serialized[0].images).toHaveLength(2);
      expect(serialized[1].images).toHaveLength(1);
      expect(serialized[0].images[0].file).toBeUndefined();
      expect(serialized[0].images[1].file).toBeUndefined();
    });
  });

  describe('deserializePostsFromStorage', () => {
    it('should deserialize posts with images', () => {
      const dataUrl = createDataUrl('test content');

      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content',
          images: [
            {
              dataUrl: dataUrl,
              name: 'test.png'
            }
          ]
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);

      expect(deserialized).toHaveLength(1);
      expect(deserialized[0].id).toBe('1');
      expect(deserialized[0].images).toHaveLength(1);
      expect(deserialized[0].images[0].file).toBeInstanceOf(File);
      expect(deserialized[0].images[0].file.name).toBe('test.png');
      expect(deserialized[0].images[0].dataUrl).toBe(dataUrl);
      expect(deserialized[0].images[0].name).toBe('test.png');
    });

    it('should handle posts without images', () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content'
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);

      expect(deserialized).toHaveLength(1);
      expect(deserialized[0].id).toBe('1');
      expect(deserialized[0].images).toBeUndefined();
    });

    it('should handle empty posts array', () => {
      const deserialized = deserializePostsFromStorage([]);
      expect(deserialized).toHaveLength(0);
    });

    it('should correctly decode base64 content', () => {
      const originalContent = 'Hello World!';
      const dataUrl = createDataUrl(originalContent);

      const posts = [
        {
          id: '1',
          images: [{ dataUrl, name: 'test.png' }]
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);
      const file = deserialized[0].images[0].file;

      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.size).toBeGreaterThan(0);
    });

    it('should handle different MIME types', () => {
      const jpegDataUrl = createDataUrl('jpeg content', 'image/jpeg');
      const gifDataUrl = createDataUrl('gif content', 'image/gif');

      const posts = [
        {
          id: '1',
          images: [
            { dataUrl: jpegDataUrl, name: 'photo.jpg' },
            { dataUrl: gifDataUrl, name: 'animation.gif' }
          ]
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);

      expect(deserialized[0].images[0].file.type).toBe('image/jpeg');
      expect(deserialized[0].images[0].file.name).toBe('photo.jpg');
      expect(deserialized[0].images[1].file.type).toBe('image/gif');
      expect(deserialized[0].images[1].file.name).toBe('animation.gif');
    });

    it('should preserve other post properties', () => {
      const posts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Content',
          scheduleTime: '2024-01-15T14:30',
          timezone: 'America/New_York',
          customField: 'custom value'
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);

      expect(deserialized[0].scheduleTime).toBe('2024-01-15T14:30');
      expect(deserialized[0].timezone).toBe('America/New_York');
      expect(deserialized[0].customField).toBe('custom value');
    });

    it('should extract MIME type from dataUrl', () => {
      const dataUrl = 'data:invalid;base64,dGVzdA==';

      const posts = [
        {
          id: '1',
          images: [{ dataUrl, name: 'test.png' }]
        }
      ];

      const deserialized = deserializePostsFromStorage(posts);

      // The regex extracts "invalid" as the MIME type
      expect(deserialized[0].images[0].file.type).toBe('invalid');
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve data through serialize and deserialize cycle', () => {
      const originalContent = 'test image content';
      const dataUrl = createDataUrl(originalContent);

      const originalPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Post content',
          images: [
            {
              file: createMockFile('test.png', originalContent),
              dataUrl: dataUrl,
              name: 'test.png'
            }
          ]
        }
      ];

      const serialized = serializePostsForStorage(originalPosts);
      const deserialized = deserializePostsFromStorage(serialized);

      expect(deserialized[0].id).toBe('1');
      expect(deserialized[0].title).toBe('Test Post');
      expect(deserialized[0].images).toHaveLength(1);
      expect(deserialized[0].images[0].name).toBe('test.png');
      expect(deserialized[0].images[0].dataUrl).toBe(dataUrl);
      expect(deserialized[0].images[0].file).toBeInstanceOf(File);
    });

    it('should handle multiple posts with various configurations', () => {
      const dataUrl1 = createDataUrl('content1');
      const dataUrl2 = createDataUrl('content2', 'image/jpeg');

      const originalPosts = [
        {
          id: '1',
          title: 'Post with images',
          images: [
            { file: createMockFile('img1.png', 'content1'), dataUrl: dataUrl1, name: 'img1.png' }
          ]
        },
        {
          id: '2',
          title: 'Post without images'
        },
        {
          id: '3',
          title: 'Post with multiple images',
          images: [
            { file: createMockFile('img2.jpg', 'content2', 'image/jpeg'), dataUrl: dataUrl2, name: 'img2.jpg' },
            { file: createMockFile('img3.png', 'content3'), dataUrl: createDataUrl('content3'), name: 'img3.png' }
          ]
        }
      ];

      const serialized = serializePostsForStorage(originalPosts);
      const deserialized = deserializePostsFromStorage(serialized);

      expect(deserialized).toHaveLength(3);
      expect(deserialized[0].images).toHaveLength(1);
      expect(deserialized[1].images).toBeUndefined();
      expect(deserialized[2].images).toHaveLength(2);
      expect(deserialized[2].images[0].file.type).toBe('image/jpeg');
    });
  });
});
