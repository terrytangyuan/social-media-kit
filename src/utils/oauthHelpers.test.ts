import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { generatePKCE } from './oauthHelpers';

describe('OAuth Helpers', () => {
  // Save original crypto
  const originalCrypto = global.crypto;

  beforeEach(() => {
    // Mock TextEncoder if not available
    if (typeof TextEncoder === 'undefined') {
      (global as any).TextEncoder = class {
        encode(input: string): Uint8Array {
          return new Uint8Array(Buffer.from(input, 'utf8'));
        }
      };
    }

    // Mock crypto for testing
    const mockCrypto = {
      getRandomValues: jest.fn((arr: Uint8Array) => {
        // Fill with predictable values for testing
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      }),
      subtle: {
        digest: jest.fn(async (algorithm: string, data: Uint8Array) => {
          // Return a mock hash (32 bytes for SHA-256)
          const hash = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            hash[i] = i * 2;
          }
          return hash.buffer;
        })
      }
    };

    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true
    });

    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });

    jest.restoreAllMocks();
  });

  describe('generatePKCE', () => {
    it('should generate codeVerifier and codeChallenge', async () => {
      const result = await generatePKCE();

      expect(result).toHaveProperty('codeVerifier');
      expect(result).toHaveProperty('codeChallenge');
    });

    it('should generate non-empty strings', async () => {
      const result = await generatePKCE();

      expect(result.codeVerifier).toBeTruthy();
      expect(result.codeChallenge).toBeTruthy();
      expect(result.codeVerifier.length).toBeGreaterThan(0);
      expect(result.codeChallenge.length).toBeGreaterThan(0);
    });

    it('should generate base64url-safe strings (no +, /, =)', async () => {
      const result = await generatePKCE();

      expect(result.codeVerifier).not.toContain('+');
      expect(result.codeVerifier).not.toContain('/');
      expect(result.codeVerifier).not.toContain('=');

      expect(result.codeChallenge).not.toContain('+');
      expect(result.codeChallenge).not.toContain('/');
      expect(result.codeChallenge).not.toContain('=');
    });

    it('should only contain base64url characters', async () => {
      const result = await generatePKCE();

      // Base64url uses: A-Z, a-z, 0-9, -, _
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;

      expect(result.codeVerifier).toMatch(base64urlRegex);
      expect(result.codeChallenge).toMatch(base64urlRegex);
    });

    it('should use crypto.getRandomValues', async () => {
      const mockGetRandomValues = global.crypto.getRandomValues as jest.MockedFunction<typeof crypto.getRandomValues>;

      await generatePKCE();

      expect(mockGetRandomValues).toHaveBeenCalled();
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should generate 32-byte random array for code verifier', async () => {
      const mockGetRandomValues = global.crypto.getRandomValues as jest.MockedFunction<typeof crypto.getRandomValues>;

      await generatePKCE();

      const callArg = mockGetRandomValues.mock.calls[0][0] as Uint8Array;
      expect(callArg.length).toBe(32);
    });

    it('should use SHA-256 for code challenge', async () => {
      const mockDigest = global.crypto.subtle.digest as jest.MockedFunction<typeof crypto.subtle.digest>;

      await generatePKCE();

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should encode code verifier before hashing', async () => {
      const mockDigest = global.crypto.subtle.digest as jest.MockedFunction<typeof crypto.subtle.digest>;

      await generatePKCE();

      // Should be called with encoded data
      expect(mockDigest).toHaveBeenCalled();
      const callArg = mockDigest.mock.calls[0][1] as Uint8Array;
      expect(callArg).toBeInstanceOf(Uint8Array);
    });

    it('should log generated PKCE parameters', async () => {
      const mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;

      await generatePKCE();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔐 Generated PKCE parameters:',
        expect.objectContaining({
          codeVerifier: expect.any(String),
          codeChallenge: expect.any(String)
        })
      );
    });

    it('should truncate logged values for security', async () => {
      const mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;

      await generatePKCE();

      const loggedObject = mockConsoleLog.mock.calls[0][1] as { codeVerifier: string; codeChallenge: string };

      expect(loggedObject.codeVerifier).toContain('...');
      expect(loggedObject.codeChallenge).toContain('...');
    });

    it('should generate consistent results with same random input', async () => {
      // Since we're using mocked predictable values, results should be consistent
      const result1 = await generatePKCE();
      const result2 = await generatePKCE();

      expect(result1.codeVerifier).toBe(result2.codeVerifier);
      expect(result1.codeChallenge).toBe(result2.codeChallenge);
    });

    it('should have codeChallenge different from codeVerifier', async () => {
      const result = await generatePKCE();

      expect(result.codeChallenge).not.toBe(result.codeVerifier);
    });

    it('should handle crypto API correctly', async () => {
      // This test verifies the integration with crypto API
      const result = await generatePKCE();

      expect(result.codeVerifier).toBeTruthy();
      expect(result.codeChallenge).toBeTruthy();

      // Verify both are strings
      expect(typeof result.codeVerifier).toBe('string');
      expect(typeof result.codeChallenge).toBe('string');
    });

    it('should generate reasonable length strings', async () => {
      const result = await generatePKCE();

      // Base64 encoding of 32 bytes should be around 43 characters
      // But may vary slightly due to padding removal
      expect(result.codeVerifier.length).toBeGreaterThan(30);
      expect(result.codeChallenge.length).toBeGreaterThan(30);
    });

    it('should not throw errors', async () => {
      await expect(generatePKCE()).resolves.not.toThrow();
    });

    it('should return an object', async () => {
      const result = await generatePKCE();

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    it('should have exactly 2 properties', async () => {
      const result = await generatePKCE();

      expect(Object.keys(result)).toHaveLength(2);
    });
  });

  describe('PKCE Compliance', () => {
    it('should follow RFC 7636 PKCE specification format', async () => {
      const result = await generatePKCE();

      // RFC 7636 requires base64url encoding without padding
      // Allowed characters: [A-Z] / [a-z] / [0-9] / "-" / "_"
      const pkceRegex = /^[A-Za-z0-9_-]+$/;

      expect(result.codeVerifier).toMatch(pkceRegex);
      expect(result.codeChallenge).toMatch(pkceRegex);
    });

    it('should generate code verifier with sufficient entropy', async () => {
      const result = await generatePKCE();

      // RFC 7636 recommends 43-128 characters for code verifier
      expect(result.codeVerifier.length).toBeGreaterThanOrEqual(32);
      expect(result.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('should use SHA-256 as recommended by RFC 7636', async () => {
      const mockDigest = global.crypto.subtle.digest as jest.MockedFunction<typeof crypto.subtle.digest>;

      await generatePKCE();

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.anything());
    });
  });
});
