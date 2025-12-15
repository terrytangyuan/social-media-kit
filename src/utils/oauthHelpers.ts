// OAuth helper utilities

/**
 * Generate PKCE (Proof Key for Code Exchange) parameters for OAuth 2.0
 * Used for Twitter/X OAuth flow to enhance security
 * @returns Object containing codeVerifier and codeChallenge
 */
export const generatePKCE = async () => {
  // Generate a proper base64url-safe code verifier
  const array = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = btoa(Array.from(array, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Generate code challenge using SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);

  const codeChallenge = btoa(Array.from(new Uint8Array(hash), byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('🔐 Generated PKCE parameters:', {
    codeVerifier: codeVerifier.substring(0, 10) + '...',
    codeChallenge: codeChallenge.substring(0, 10) + '...'
  });

  return { codeVerifier, codeChallenge };
};
