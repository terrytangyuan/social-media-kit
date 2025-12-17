import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageManager } from './useImageManager';

describe('useImageManager Hook', () => {
  // Helper to create mock File objects
  const createMockFile = (name: string, type: string = 'image/png'): File => {
    const blob = new Blob(['test content'], { type });
    return new File([blob], name, { type });
  };

  // Mock FileReader
  beforeEach(() => {
    // Create a proper FileReader mock
    class MockFileReader {
      result: string | null = null;
      onload: ((event: any) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(blob: Blob) {
        // Call onload asynchronously
        setTimeout(() => {
          this.result = 'data:image/png;base64,mockdata';
          if (this.onload) {
            this.onload({ target: this });
          }
        }, 0);
      }
      abort() {}
    }
    
    global.FileReader = MockFileReader as any;
  });

  describe('Initial State', () => {
    it('should initialize with empty attachedImages array', () => {
      const { result } = renderHook(() => useImageManager());
      expect(result.current.attachedImages).toEqual([]);
    });

    it('should initialize with empty platformImageSelections', () => {
      const { result } = renderHook(() => useImageManager());
      expect(result.current.platformImageSelections).toEqual({});
    });

    it('should initialize with empty hasExplicitSelection', () => {
      const { result } = renderHook(() => useImageManager());
      expect(result.current.hasExplicitSelection).toEqual({});
    });

    it('should initialize showImageSelector as false', () => {
      const { result } = renderHook(() => useImageManager());
      expect(result.current.showImageSelector).toBe(false);
    });

    it('should initialize pendingPlatform as null', () => {
      const { result } = renderHook(() => useImageManager());
      expect(result.current.pendingPlatform).toBeNull();
    });
  });

  describe('handleImageUpload', () => {
    it('should upload valid image files', async () => {
      const { result } = renderHook(() => useImageManager());
      const mockFile = createMockFile('test.png');

      act(() => {
        result.current.handleImageUpload([mockFile]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(1);
      });

      expect(result.current.attachedImages[0].name).toBe('test.png');
      expect(result.current.attachedImages[0].dataUrl).toBe('data:image/png;base64,mockdata');
    });

    it('should filter out non-image files', async () => {
      const { result } = renderHook(() => useImageManager());
      const mockFiles = [
        createMockFile('test.png'),
        createMockFile('test.pdf', 'application/pdf')
      ];

      act(() => {
        result.current.handleImageUpload(mockFiles);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(1);
      });

      expect(result.current.attachedImages[0].name).toBe('test.png');
    });

    it('should handle empty file array', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([]);
      });

      expect(result.current.attachedImages).toHaveLength(0);
    });
  });

  describe('removeAttachedImage', () => {
    it('should remove image by index', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([
          createMockFile('test1.png'),
          createMockFile('test2.png')
        ]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(2);
      });

      act(() => {
        result.current.removeAttachedImage(0);
      });

      expect(result.current.attachedImages).toHaveLength(1);
      expect(result.current.attachedImages[0].name).toBe('test2.png');
    });
  });

  describe('updatePlatformSelection', () => {
    it('should update platform image selection', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([
          createMockFile('test1.png'),
          createMockFile('test2.png')
        ]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(2);
      });

      act(() => {
        result.current.updatePlatformSelection('linkedin', [0, 1]);
      });

      expect(result.current.platformImageSelections.linkedin).toEqual([0, 1]);
      expect(result.current.hasExplicitSelection.linkedin).toBe(true);
    });

    it('should enforce platform image limits', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([
          createMockFile('test1.png'),
          createMockFile('test2.png'),
          createMockFile('test3.png'),
          createMockFile('test4.png'),
          createMockFile('test5.png')
        ]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(5);
      });

      // Twitter limit is 4 images
      act(() => {
        result.current.updatePlatformSelection('twitter', [0, 1, 2, 3, 4]);
      });

      expect(result.current.platformImageSelections.twitter).toEqual([0, 1, 2, 3]);
      expect(result.current.platformImageSelections.twitter).toHaveLength(4);
    });
  });

  describe('selectImagesForPlatform', () => {
    it('should open image selector', () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.selectImagesForPlatform('linkedin');
      });

      expect(result.current.showImageSelector).toBe(true);
      expect(result.current.pendingPlatform).toBe('linkedin');
    });
  });

  describe('getSelectedImagesForPlatform', () => {
    it('should return explicitly selected images', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([
          createMockFile('test1.png'),
          createMockFile('test2.png'),
          createMockFile('test3.png')
        ]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(3);
      });

      act(() => {
        result.current.updatePlatformSelection('linkedin', [1, 2]);
      });

      const selected = result.current.getSelectedImagesForPlatform('linkedin');

      expect(selected).toHaveLength(2);
      expect(selected[0].name).toBe('test2.png');
      expect(selected[1].name).toBe('test3.png');
    });

    it('should return empty array when no images', () => {
      const { result } = renderHook(() => useImageManager());
      const selected = result.current.getSelectedImagesForPlatform('linkedin');
      expect(selected).toEqual([]);
    });
  });

  describe('reorderImages', () => {
    it('should reorder images from lower to higher index', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([
          createMockFile('test1.png'),
          createMockFile('test2.png'),
          createMockFile('test3.png')
        ]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(3);
      });

      act(() => {
        result.current.reorderImages(0, 2);
      });

      expect(result.current.attachedImages[0].name).toBe('test2.png');
      expect(result.current.attachedImages[1].name).toBe('test3.png');
      expect(result.current.attachedImages[2].name).toBe('test1.png');
    });
  });

  describe('clearAllImages', () => {
    it('should clear all images', async () => {
      const { result } = renderHook(() => useImageManager());

      act(() => {
        result.current.handleImageUpload([createMockFile('test.png')]);
      });

      await waitFor(() => {
        expect(result.current.attachedImages.length).toBe(1);
      });

      act(() => {
        result.current.clearAllImages();
      });

      expect(result.current.attachedImages).toEqual([]);
    });
  });
});
