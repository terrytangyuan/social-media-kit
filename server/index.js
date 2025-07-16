import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import utilities and routes
import { loadEnvironmentVariables } from './utils/env.js';
import authRoutes from './routes/auth.js';
import linkedinRoutes from './routes/linkedin.js';
import twitterRoutes from './routes/twitter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvironmentVariables();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Routes
app.use('/api/oauth', authRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/twitter', twitterRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: {
      linkedinConfigured: !!process.env.LINKEDIN_CLIENT_ID,
      twitterConfigured: !!process.env.TWITTER_CLIENT_ID
    }
  });
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
}); 