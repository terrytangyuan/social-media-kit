import '@testing-library/jest-dom';

// Type declarations for jest-dom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveValue(value: string | number): R;
      toHaveStyle(css: Record<string, any>): R;
    }
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock window.location methods individually to avoid jsdom navigation errors
// Use try-catch to handle redefinition errors across multiple test files
try {
  Object.defineProperty(window.location, 'assign', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
} catch (e) {
  // Already defined, skip
}
try {
  Object.defineProperty(window.location, 'replace', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
} catch (e) {
  // Already defined, skip
}
try {
  Object.defineProperty(window.location, 'reload', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
} catch (e) {
  // Already defined, skip
}

// Mock crypto for UUID generation
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mocked-uuid-1234'),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock Notification API
global.Notification = jest.fn().mockImplementation((title: string, options?: NotificationOptions) => ({
  title,
  ...options,
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})) as any;

Object.defineProperty(global.Notification, 'permission', {
  value: 'granted',
  writable: true,
});

Object.defineProperty(global.Notification, 'requestPermission', {
  value: jest.fn().mockResolvedValue('granted'),
  writable: true,
});

// Mock fetch for testing
global.fetch = jest.fn();

// Mock marked library
jest.mock('marked', () => ({
  marked: jest.fn().mockImplementation((text: string) => Promise.resolve(text)),
}));

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
}); 