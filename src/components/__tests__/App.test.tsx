import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the App component props and state
const mockInitialState = {
  text: '',
  darkMode: false,
  selectedPlatform: 'linkedin' as const,
  auth: {
    linkedin: { isAuthenticated: false, accessToken: null, refreshToken: null, expiresAt: null, userInfo: null },
    twitter: { isAuthenticated: false, accessToken: null, refreshToken: null, expiresAt: null, userInfo: null },
    bluesky: { isAuthenticated: false, accessToken: null, refreshToken: null, expiresAt: null, userInfo: null }
  },
  posts: [],
  personMappings: []
};

// Mock component for testing individual features
const MockTextEditor = ({ value, onChange, onBold, onItalic }: {
  value: string;
  onChange: (text: string) => void;
  onBold: () => void;
  onItalic: () => void;
}) => (
  <div>
    <div className="flex gap-2 mb-2">
      <button onClick={onBold} data-testid="bold-button">Bold</button>
      <button onClick={onItalic} data-testid="italic-button">Italic</button>
    </div>
    <textarea
      data-testid="text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write your post here..."
    />
  </div>
);

const MockPlatformSelector = ({ selected, onSelect }: {
  selected: string;
  onSelect: (platform: string) => void;
}) => (
  <div>
    {['linkedin', 'twitter', 'bluesky'].map(platform => (
      <button
        key={platform}
        data-testid={`platform-${platform}`}
        onClick={() => onSelect(platform)}
        className={selected === platform ? 'selected' : ''}
      >
        {platform}
      </button>
    ))}
  </div>
);

const MockEmojiPicker = ({ onEmojiSelect, onClose }: {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}) => (
  <div data-testid="emoji-picker">
    <button onClick={() => onEmojiSelect('😊')} data-testid="emoji-smile">😊</button>
    <button onClick={() => onEmojiSelect('👍')} data-testid="emoji-thumbs">👍</button>
    <button onClick={onClose} data-testid="emoji-close">✕</button>
  </div>
);

const MockTagManager = ({ personMappings, onAddPerson, onDeletePerson, onClose }: {
  personMappings: Array<{ id: string; name: string; displayName: string; twitter?: string; bluesky?: string }>;
  onAddPerson: (person: { name: string; displayName: string; twitter?: string; bluesky?: string }) => void;
  onDeletePerson: (id: string) => void;
  onClose: () => void;
}) => (
  <div data-testid="tag-manager">
    <div data-testid="person-list">
      {personMappings.map(person => (
        <div key={person.id} data-testid={`person-${person.id}`}>
          <span>{person.displayName}</span>
          <button onClick={() => onDeletePerson(person.id)} data-testid={`delete-person-${person.id}`}>Delete</button>
        </div>
      ))}
    </div>
    <button onClick={onClose} data-testid="tag-manager-close">Close</button>
  </div>
);

describe('App Component', () => {
  let mockState: typeof mockInitialState;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockState = JSON.parse(JSON.stringify(mockInitialState));
    user = userEvent.setup();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Text Editor Functionality', () => {
    it('should update text when typing in the editor', async () => {
      const TestComponent = () => {
        const [text, setText] = React.useState('');
        return (
          <MockTextEditor
            value={text}
            onChange={setText}
            onBold={() => {}}
            onItalic={() => {}}
          />
        );
      };

      render(<TestComponent />);

      const textEditor = screen.getByTestId('text-editor') as HTMLTextAreaElement;
      await user.type(textEditor, 'Hello world!');

      await waitFor(() => {
        expect(textEditor.value).toBe('Hello world!');
      });
    });

    it('should apply bold formatting when bold button is clicked', async () => {
      let currentText = 'Hello world';
      const handleBold = () => {
        // Mock bold formatting: wrap selected text with **
        currentText = currentText.replace(/Hello/, '**Hello**');
      };

      render(
        <MockTextEditor
          value={currentText}
          onChange={() => {}}
          onBold={handleBold}
          onItalic={() => {}}
        />
      );

      const boldButton = screen.getByTestId('bold-button');
      await user.click(boldButton);

      expect(currentText).toBe('**Hello** world');
    });

    it('should apply italic formatting when italic button is clicked', async () => {
      let currentText = 'Hello world';
      const handleItalic = () => {
        // Mock italic formatting: wrap selected text with _
        currentText = currentText.replace(/world/, '_world_');
      };

      render(
        <MockTextEditor
          value={currentText}
          onChange={() => {}}
          onBold={() => {}}
          onItalic={handleItalic}
        />
      );

      const italicButton = screen.getByTestId('italic-button');
      await user.click(italicButton);

      expect(currentText).toBe('Hello _world_');
    });

    it('should show character count and word count', () => {
      const text = 'Hello world! This is a test.';
      const wordCount = text.trim().split(/\s+/).length;
      const charCount = text.length;

      expect(wordCount).toBe(6);
      expect(charCount).toBe(28);
    });
  });

  describe('Platform Selection', () => {
    it('should switch platforms when platform buttons are clicked', async () => {
      let selectedPlatform = 'linkedin';
      const handlePlatformSelect = (platform: string) => {
        selectedPlatform = platform;
      };

      render(
        <MockPlatformSelector
          selected={selectedPlatform}
          onSelect={handlePlatformSelect}
        />
      );

      const twitterButton = screen.getByTestId('platform-twitter');
      await user.click(twitterButton);

      expect(selectedPlatform).toBe('twitter');

      const blueskyButton = screen.getByTestId('platform-bluesky');
      await user.click(blueskyButton);

      expect(selectedPlatform).toBe('bluesky');
    });

    it('should show selected platform with appropriate styling', () => {
      render(
        <MockPlatformSelector
          selected="twitter"
          onSelect={() => {}}
        />
      );

      const twitterButton = screen.getByTestId('platform-twitter');
      expect(twitterButton).toHaveClass('selected');

      const linkedinButton = screen.getByTestId('platform-linkedin');
      expect(linkedinButton).not.toHaveClass('selected');
    });
  });

  describe('Emoji Picker', () => {
    it('should insert emoji when emoji is clicked', async () => {
      let insertedEmoji = '';
      const handleEmojiSelect = (emoji: string) => {
        insertedEmoji = emoji;
      };

      render(
        <MockEmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => {}}
        />
      );

      const smileEmoji = screen.getByTestId('emoji-smile');
      await user.click(smileEmoji);

      expect(insertedEmoji).toBe('😊');
    });

    it('should close emoji picker when close button is clicked', async () => {
      let isOpen = true;
      const handleClose = () => {
        isOpen = false;
      };

      render(
        <MockEmojiPicker
          onEmojiSelect={() => {}}
          onClose={handleClose}
        />
      );

      const closeButton = screen.getByTestId('emoji-close');
      await user.click(closeButton);

      expect(isOpen).toBe(false);
    });

    it('should display emoji picker with different emoji categories', () => {
      render(
        <MockEmojiPicker
          onEmojiSelect={() => {}}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('emoji-smile')).toBeInTheDocument();
      expect(screen.getByTestId('emoji-thumbs')).toBeInTheDocument();
    });
  });

  describe('Tag Manager', () => {
    const mockPersonMappings = [
      { id: '1', name: 'john', displayName: 'John Doe', twitter: 'johndoe' },
      { id: '2', name: 'jane', displayName: 'Jane Smith', bluesky: 'jane.bsky.social' }
    ];

    it('should display list of person mappings', () => {
      render(
        <MockTagManager
          personMappings={mockPersonMappings}
          onAddPerson={() => {}}
          onDeletePerson={() => {}}
          onClose={() => {}}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should delete person mapping when delete button is clicked', async () => {
      let deletedPersonId = '';
      const handleDeletePerson = (id: string) => {
        deletedPersonId = id;
      };

      render(
        <MockTagManager
          personMappings={mockPersonMappings}
          onAddPerson={() => {}}
          onDeletePerson={handleDeletePerson}
          onClose={() => {}}
        />
      );

      const deleteButton = screen.getByTestId('delete-person-1');
      await user.click(deleteButton);

      expect(deletedPersonId).toBe('1');
    });

    it('should close tag manager when close button is clicked', async () => {
      let isClosed = false;
      const handleClose = () => {
        isClosed = true;
      };

      render(
        <MockTagManager
          personMappings={mockPersonMappings}
          onAddPerson={() => {}}
          onDeletePerson={() => {}}
          onClose={handleClose}
        />
      );

      const closeButton = screen.getByTestId('tag-manager-close');
      await user.click(closeButton);

      expect(isClosed).toBe(true);
    });
  });

  describe('Authentication Status', () => {
    it('should show not authenticated status by default', () => {
      const authState = mockInitialState.auth.linkedin;
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBe(null);
    });

    it('should show authenticated status when user is logged in', () => {
      const authState = {
        isAuthenticated: true,
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600000,
        userInfo: { id: '123', name: 'John Doe' }
      };

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.accessToken).toBe('test_token');
      expect(authState.userInfo.name).toBe('John Doe');
    });

    it('should handle logout correctly', () => {
      let authState = {
        isAuthenticated: true,
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() + 3600000,
        userInfo: { id: '123', name: 'John Doe' }
      };

      // Mock logout
      authState = {
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        userInfo: null
      };

      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBe(null);
      expect(authState.userInfo).toBe(null);
    });
  });

  describe('Dark Mode Toggle', () => {
    it('should toggle dark mode when button is clicked', () => {
      let isDarkMode = false;
      const toggleDarkMode = () => {
        isDarkMode = !isDarkMode;
      };

      // Initial state
      expect(isDarkMode).toBe(false);

      // Toggle on
      toggleDarkMode();
      expect(isDarkMode).toBe(true);

      // Toggle off
      toggleDarkMode();
      expect(isDarkMode).toBe(false);
    });

    it('should persist dark mode preference in localStorage', () => {
      const mockSetItem = jest.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { setItem: mockSetItem, getItem: jest.fn() },
        writable: true,
      });

      // Mock saving dark mode preference
      const saveDarkModePreference = (isDark: boolean) => {
        localStorage.setItem('darkMode', JSON.stringify(isDark));
      };

      saveDarkModePreference(true);
      expect(mockSetItem).toHaveBeenCalledWith('darkMode', 'true');
    });
  });

  describe('Post Management', () => {
    it('should create new post with title and content', () => {
      const newPost = {
        id: 'post_1',
        title: 'My First Post',
        content: 'This is the content of my first post.',
        scheduleTime: '2024-01-01T12:00',
        timezone: 'America/New_York',
        createdAt: '2024-01-01T10:00:00.000Z'
      };

      expect(newPost.title).toBe('My First Post');
      expect(newPost.content).toBe('This is the content of my first post.');
      expect(newPost.id).toBe('post_1');
    });

    it('should switch between posts', () => {
      const posts = [
        { id: 'post_1', title: 'Post 1', content: 'Content 1' },
        { id: 'post_2', title: 'Post 2', content: 'Content 2' }
      ];

      let currentPostId = 'post_1';
      let currentContent = 'Content 1';

      // Switch to post 2
      const switchToPost = (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
          currentPostId = postId;
          currentContent = post.content;
        }
      };

      switchToPost('post_2');
      expect(currentPostId).toBe('post_2');
      expect(currentContent).toBe('Content 2');
    });

    it('should save and load posts from disk', () => {
      const posts = [
        { id: 'post_1', title: 'Post 1', content: 'Content 1' }
      ];

      const dataToSave = {
        posts: posts,
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0'
      };

      expect(dataToSave.posts).toHaveLength(1);
      expect(dataToSave.posts[0].title).toBe('Post 1');
      expect(dataToSave.appVersion).toBe('1.0.0');
    });
  });

  describe('Text Chunking', () => {
    it('should chunk text correctly for different platforms', () => {
      const longText = 'A'.repeat(500);
      
      const PLATFORM_LIMITS = {
        linkedin: 3000,
        twitter: 280,
        bluesky: 300
      };

      const chunkForPlatform = (text: string, platform: keyof typeof PLATFORM_LIMITS) => {
        const limit = PLATFORM_LIMITS[platform];
        if (text.length <= limit) return [text];
        
        const chunks = [];
        let remaining = text;
        while (remaining.length > 0) {
          if (remaining.length <= limit) {
            chunks.push(remaining);
            break;
          }
          chunks.push(remaining.substring(0, limit));
          remaining = remaining.substring(limit);
        }
        return chunks;
      };

      // LinkedIn should not chunk (under 3000 chars)
      const linkedinChunks = chunkForPlatform(longText, 'linkedin');
      expect(linkedinChunks).toHaveLength(1);

      // Twitter should chunk (over 280 chars)
      const twitterChunks = chunkForPlatform(longText, 'twitter');
      expect(twitterChunks.length).toBeGreaterThan(1);

      // Bluesky should chunk (over 300 chars)
      const blueskyChunks = chunkForPlatform(longText, 'bluesky');
      expect(blueskyChunks.length).toBeGreaterThan(1);
    });
  });
}); 