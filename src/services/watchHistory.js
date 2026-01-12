// Watch History Service
// Persists video watch progress to localStorage

const STORAGE_KEY = 'streambox_watch_history';
const MAX_HISTORY_ITEMS = 50;

// Get all watch history
export const getWatchHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Get watch progress for a specific video
export const getVideoProgress = (videoId) => {
  const history = getWatchHistory();
  return history.find(item => item.videoId === videoId) || null;
};

// Save watch progress for a video
export const saveVideoProgress = (videoId, currentTime, duration, metadata = {}) => {
  const history = getWatchHistory();
  const existingIndex = history.findIndex(item => item.videoId === videoId);
  
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCompleted = progressPercent > 95; // Consider completed if > 95%
  
  const entry = {
    videoId,
    currentTime,
    duration,
    progressPercent,
    isCompleted,
    lastWatched: Date.now(),
    title: metadata.title || '',
    thumbnail: metadata.thumbnail || null,
    qualities: metadata.qualities || [],
  };
  
  if (existingIndex >= 0) {
    history[existingIndex] = entry;
  } else {
    history.unshift(entry);
  }
  
  // Keep only the most recent items
  const trimmedHistory = history
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, MAX_HISTORY_ITEMS);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (e) {
    console.warn('Failed to save watch history:', e);
  }
  
  return entry;
};

// Get videos that are in progress (not completed)
export const getContinueWatching = () => {
  const history = getWatchHistory();
  return history
    .filter(item => !item.isCompleted && item.progressPercent > 2)
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 10);
};

// Get recently completed videos
export const getRecentlyWatched = () => {
  const history = getWatchHistory();
  return history
    .filter(item => item.isCompleted)
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 10);
};

// Remove a video from history
export const removeFromHistory = (videoId) => {
  const history = getWatchHistory();
  const filtered = history.filter(item => item.videoId !== videoId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// Clear all watch history
export const clearWatchHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Format time ago
export const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
