// API Configuration
// ==================
// Set VITE_API_BASE_URL environment variable to connect to your backend
// Example: VITE_API_BASE_URL=https://your-api.example.com/api
//
// For local development, the default is http://localhost:3001/api
// You can change this below or use environment variables

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Endpoint definitions matching your backend
export const ENDPOINTS = {
  videos: `${API_BASE_URL}/videos`,
  videoMetadata: (videoId) => `${API_BASE_URL}/videos/${videoId}`,
  videoManifest: (videoId) => `${API_BASE_URL}/videos/${videoId}/manifest`,
  chunk: (videoId, quality, chunkIndex) => `${API_BASE_URL}/chunks/${videoId}/${quality}/${chunkIndex}`,
};

// Authentication configuration
export const AUTH_CONFIG = {
  // Set to true if your backend requires authentication
  ENABLED: import.meta.env.VITE_AUTH_ENABLED === 'true' || false,
  // Token storage key in localStorage
  TOKEN_KEY: 'auth_token',
  // Header name for auth token
  HEADER_NAME: 'Authorization',
  // Token prefix (e.g., 'Bearer ' for JWT)
  TOKEN_PREFIX: 'Bearer ',
};

// Get authorization headers for API requests
export const getAuthHeaders = () => {
  if (!AUTH_CONFIG.ENABLED) return {};
  
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  if (!token) return {};
  
  return {
    [AUTH_CONFIG.HEADER_NAME]: `${AUTH_CONFIG.TOKEN_PREFIX}${token}`,
  };
};

// Set auth token (call after login)
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  }
};

// Check if authenticated
export const isAuthenticated = () => {
  if (!AUTH_CONFIG.ENABLED) return true;
  return !!localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
};

// Player Configuration
export const PLAYER_CONFIG = {
  // Number of chunks to buffer ahead
  BUFFER_AHEAD_COUNT: 4,
  // Retention percentage (keep last 10% of watched content)
  RETENTION_PERCENTAGE: 0.1,
  // Chunk duration in seconds (must match backend)
  CHUNK_DURATION: 5,
  // Default quality
  DEFAULT_QUALITY: '720p',
  // Available qualities
  QUALITIES: ['360p', '480p', '720p', '1080p'],
  // Retry configuration for failed requests
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  // Seek step sizes (in seconds)
  SEEK_STEP_SMALL: 5,
  SEEK_STEP_LARGE: 10,
};

// ===========================================
// BACKEND CORS CONFIGURATION
// ===========================================
// Add this to your Express backend to enable CORS:
//
// const cors = require('cors');
//
// app.use(cors({
//   origin: [
//     'http://localhost:5173',  // Vite dev server
//     'http://localhost:3000',  // Alternative dev server
//     'https://your-production-domain.com',
//     /\.lovableproject\.com$/,  // Lovable preview domains
//   ],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
//   exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
//   credentials: true,
// }));
//
// For development with any origin:
// app.use(cors());
//
// ===========================================
