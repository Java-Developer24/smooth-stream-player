// API Configuration
// Update this to match your backend URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const ENDPOINTS = {
  videos: `${API_BASE_URL}/videos`,
  videoMetadata: (videoId) => `${API_BASE_URL}/videos/${videoId}`,
  videoManifest: (videoId) => `${API_BASE_URL}/videos/${videoId}/manifest`,
  chunk: (videoId, quality, chunkIndex) => `${API_BASE_URL}/chunks/${videoId}/${quality}/${chunkIndex}`,
};

// Player Configuration
export const PLAYER_CONFIG = {
  // Number of chunks to buffer ahead
  BUFFER_AHEAD_COUNT: 4,
  // Retention percentage (keep last 10% of watched content)
  RETENTION_PERCENTAGE: 0.1,
  // Chunk duration in seconds
  CHUNK_DURATION: 5,
  // Default quality
  DEFAULT_QUALITY: '720p',
  // Available qualities
  QUALITIES: ['360p', '480p', '720p', '1080p'],
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};
