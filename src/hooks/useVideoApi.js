import { useState, useCallback } from 'react';
import { ENDPOINTS, PLAYER_CONFIG } from '../config/api';

// Get auth token if available
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch with retry logic
const fetchWithRetry = async (url, options = {}, retries = PLAYER_CONFIG.MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, PLAYER_CONFIG.RETRY_DELAY * (i + 1)));
    }
  }
};

export const useVideoApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithRetry(ENDPOINTS.videos);
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideoMetadata = useCallback(async (videoId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithRetry(ENDPOINTS.videoMetadata(videoId));
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideoManifest = useCallback(async (videoId) => {
    try {
      const response = await fetchWithRetry(ENDPOINTS.videoManifest(videoId));
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const fetchChunk = useCallback(async (videoId, quality, chunkIndex, signal) => {
    try {
      const response = await fetch(ENDPOINTS.chunk(videoId, quality, chunkIndex), {
        headers: getAuthHeaders(),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chunk ${chunkIndex}`);
      }
      
      return await response.arrayBuffer();
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    fetchVideos,
    fetchVideoMetadata,
    fetchVideoManifest,
    fetchChunk,
  };
};
