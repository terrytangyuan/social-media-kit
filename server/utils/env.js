import { readFileSync } from 'fs';

export const loadEnvironmentVariables = () => {
  try {
    const envFile = readFileSync('.env', 'utf8');
    console.log('Loading .env file...');
    
    envFile.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
          console.log(`Loaded: ${key.trim()} = ${value.substring(0, 10)}...`);
        }
      }
    });
    
    console.log('LinkedIn Client ID loaded:', process.env.LINKEDIN_CLIENT_ID ? 'YES' : 'NO');
    console.log('LinkedIn Client Secret loaded:', process.env.LINKEDIN_CLIENT_SECRET ? 'YES' : 'NO');
    console.log('Twitter Client ID loaded:', process.env.TWITTER_CLIENT_ID ? 'YES' : 'NO');
    console.log('Twitter Client Secret loaded:', process.env.TWITTER_CLIENT_SECRET ? 'YES' : 'NO');
    
    return true;
  } catch (error) {
    console.log('Warning: Could not load .env file:', error.message);
    return false;
  }
}; 