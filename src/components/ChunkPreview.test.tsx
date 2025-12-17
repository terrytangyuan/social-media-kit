import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChunkPreview } from './ChunkPreview';

describe('ChunkPreview Component', () => {
  const mockShowNotification = jest.fn();
  const mockFormatForPlatform = jest.fn((text: string) => text);
  const mockGetSelectedImagesForPlatform = jest.fn(() => []);

  const defaultProps = {
    text: 'Test content',
    darkMode: false,
    selectedPlatform: 'linkedin' as const,
    platformLimits: {
      linkedin: 3000,
      twitter: 280,
      mastodon: 500,
      bluesky: 300
    },
    formatForPlatform: mockFormatForPlatform,
    getSelectedImagesForPlatform: mockGetSelectedImagesForPlatform,
    showNotification: mockShowNotification
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });

    // Mock window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true
    });

    // Mock document.execCommand
    document.execCommand = jest.fn(() => true);
  });

  describe('Rendering', () => {
    it('should render single chunk for short text', () => {
      render(<ChunkPreview {...defaultProps} text="Short text" />);

      expect(screen.getByText('Short text')).toBeInTheDocument();
    });

    it('should show warning for multiple chunks', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      expect(screen.getByText(/will create a thread/)).toBeInTheDocument();
    });

    it('should show LinkedIn-specific message for chunked posts', () => {
      const longText = 'a'.repeat(4000);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="linkedin" />);

      expect(screen.getByText(/will be split into/)).toBeInTheDocument();
    });

    it('should not show warning for single chunk', () => {
      render(<ChunkPreview {...defaultProps} text="Short text" />);

      expect(screen.queryByText(/will be split/)).not.toBeInTheDocument();
      expect(screen.queryByText(/will create a thread/)).not.toBeInTheDocument();
    });

    it('should apply dark mode classes', () => {
      const { container } = render(<ChunkPreview {...defaultProps} text="Test" darkMode={true} />);

      const chunk = container.querySelector('.bg-gray-700');
      expect(chunk).toBeInTheDocument();
    });

    it('should apply light mode classes', () => {
      const { container } = render(<ChunkPreview {...defaultProps} text="Test" darkMode={false} />);

      const chunk = container.querySelector('.bg-gray-50');
      expect(chunk).toBeInTheDocument();
    });
  });

  describe('Chunking Display', () => {
    it('should display chunk count and part numbers', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      expect(screen.getByText(/Part 1 of 2/)).toBeInTheDocument();
      expect(screen.getByText(/Part 2 of 2/)).toBeInTheDocument();
    });

    it('should show character count for each chunk', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      expect(screen.getByText(/characters/)).toBeInTheDocument();
    });

    it('should render multiple chunks correctly', () => {
      const longText = 'a'.repeat(1000);
      const { container } = render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="mastodon" />);

      const chunks = container.querySelectorAll('.whitespace-pre-wrap');
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should preserve whitespace in chunks', () => {
      const textWithSpaces = 'Line 1\n\nLine 2\n\nLine 3';
      render(<ChunkPreview {...defaultProps} text={textWithSpaces} />);

      const content = screen.getByText(textWithSpaces);
      expect(content).toHaveClass('whitespace-pre-wrap');
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button for Twitter threads', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should show copy button for Bluesky threads', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="bluesky" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should show copy button for Mastodon threads', () => {
      const longText = 'a'.repeat(600);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="mastodon" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should not show copy button for single chunk', () => {
      render(<ChunkPreview {...defaultProps} text="Short text" selectedPlatform="twitter" />);

      expect(screen.queryByText(/📋 Copy/)).not.toBeInTheDocument();
    });

    it('should copy chunk to clipboard when copy button clicked', async () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show success notification after copying', async () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('✅'));
        expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Part 1'));
      });
    });

    it('should use fallback copy method when clipboard API unavailable', async () => {
      // Remove clipboard API
      Object.assign(navigator, { clipboard: undefined });

      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(document.execCommand).toHaveBeenCalledWith('copy');
      });
    });

    it('should show error notification when copy fails', async () => {
      (navigator.clipboard.writeText as jest.MockedFunction<any>).mockRejectedValue(new Error('Copy failed'));

      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      const copyButtons = screen.getAllByText(/📋 Copy/);
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('❌'));
      });
    });
  });

  describe('Image Display', () => {
    const mockImages = [
      { file: new File([''], 'test1.png'), dataUrl: 'data:image/png;base64,test1', name: 'test1.png' },
      { file: new File([''], 'test2.png'), dataUrl: 'data:image/png;base64,test2', name: 'test2.png' }
    ];

    it('should show images when available', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue(mockImages);

      render(<ChunkPreview {...defaultProps} text="Test with images" />);

      expect(screen.getByText(/📷 Selected Images \(2\):/)).toBeInTheDocument();
    });

    it('should only show images on first chunk', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue(mockImages);

      const longText = 'a'.repeat(400);
      const { container } = render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      // Should only have one image section
      const imageSections = container.querySelectorAll('[class*="grid-cols"]');
      expect(imageSections).toHaveLength(1);
    });

    it('should not show images when none selected', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue([]);

      render(<ChunkPreview {...defaultProps} text="Test without images" />);

      expect(screen.queryByText(/📷 Selected Images/)).not.toBeInTheDocument();
    });

    it('should use single column grid for one image', () => {
      const singleImage = [mockImages[0]];
      mockGetSelectedImagesForPlatform.mockReturnValue(singleImage);

      const { container } = render(<ChunkPreview {...defaultProps} text="Test" />);

      expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
    });

    it('should use two column grid for two images', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue(mockImages);

      const { container } = render(<ChunkPreview {...defaultProps} text="Test" />);

      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
    });

    it('should use three column grid for three images', () => {
      const threeImages = [...mockImages, { file: new File([''], 'test3.png'), dataUrl: 'data:image/png;base64,test3', name: 'test3.png' }];
      mockGetSelectedImagesForPlatform.mockReturnValue(threeImages);

      const { container } = render(<ChunkPreview {...defaultProps} text="Test" />);

      expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();
    });

    it('should show image numbering overlay', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue(mockImages);

      render(<ChunkPreview {...defaultProps} text="Test" />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render images with correct attributes', () => {
      mockGetSelectedImagesForPlatform.mockReturnValue(mockImages);

      render(<ChunkPreview {...defaultProps} text="Test" />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', 'data:image/png;base64,test1');
      expect(images[0]).toHaveAttribute('alt', 'Attached image 1');
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should format text using formatForPlatform', () => {
      render(<ChunkPreview {...defaultProps} text="Test text" />);

      expect(mockFormatForPlatform).toHaveBeenCalledWith('Test text', 'linkedin');
    });

    it('should call getSelectedImagesForPlatform', () => {
      render(<ChunkPreview {...defaultProps} text="Test" />);

      expect(mockGetSelectedImagesForPlatform).toHaveBeenCalledWith('linkedin');
    });

    it('should use platform-specific limits for chunking', () => {
      const longText = 'a'.repeat(400);
      render(<ChunkPreview {...defaultProps} text={longText} selectedPlatform="twitter" />);

      expect(screen.getByText(/280 chars/)).toBeInTheDocument();
    });

    it('should adjust chunks based on selected platform', () => {
      const text = 'a'.repeat(400);
      const { rerender } = render(<ChunkPreview {...defaultProps} text={text} selectedPlatform="twitter" />);

      const twitterChunks = screen.getAllByText(/Part \d+ of \d+/);

      rerender(<ChunkPreview {...defaultProps} text={text} selectedPlatform="mastodon" />);

      const mastodonChunks = screen.getAllByText(/Part \d+ of \d+/);

      // Twitter (280) and Mastodon (500) will have different chunk counts
      expect(twitterChunks.length).not.toBe(mastodonChunks.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const { container } = render(<ChunkPreview {...defaultProps} text="" />);

      expect(container.querySelector('.whitespace-pre-wrap')).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const veryLongText = 'a'.repeat(10000);
      const { container } = render(<ChunkPreview {...defaultProps} text={veryLongText} selectedPlatform="twitter" />);

      const chunks = container.querySelectorAll('.whitespace-pre-wrap');
      expect(chunks.length).toBeGreaterThan(10);
    });

    it('should handle special characters in text', () => {
      const specialText = 'Test <>&"\'\n\t';
      render(<ChunkPreview {...defaultProps} text={specialText} />);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('should handle Unicode characters', () => {
      const unicodeText = '😀 Hello 世界 🌍';
      render(<ChunkPreview {...defaultProps} text={unicodeText} />);

      expect(screen.getByText(unicodeText)).toBeInTheDocument();
    });

    it('should toggle between dark and light mode', () => {
      const { container, rerender } = render(<ChunkPreview {...defaultProps} text="Test" darkMode={false} />);

      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();

      rerender(<ChunkPreview {...defaultProps} text="Test" darkMode={true} />);

      expect(container.querySelector('.bg-gray-700')).toBeInTheDocument();
    });
  });
});
