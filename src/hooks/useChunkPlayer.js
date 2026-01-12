import { useState, useRef, useCallback, useEffect } from 'react';
import { PLAYER_CONFIG, ENDPOINTS } from '../config/api';

const BUFFER_AHEAD = PLAYER_CONFIG.BUFFER_AHEAD_COUNT;
const RETENTION_PERCENT = PLAYER_CONFIG.RETENTION_PERCENTAGE;

export const useChunkPlayer = (videoRef, manifest, videoId, quality) => {
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    isBuffering: true,
    currentTime: 0,
    duration: 0,
    bufferedRanges: [],
    currentChunkIndex: 0,
    error: null,
  });

  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const loadedChunksRef = useRef(new Set());
  const pendingChunksRef = useRef(new Set());
  const abortControllerRef = useRef(null);
  const totalWatchedRef = useRef(0);
  const isInitializedRef = useRef(false);
  const updateQueueRef = useRef([]);
  const isUpdatingRef = useRef(false);

  // Get mime type based on quality
  const getMimeType = useCallback(() => {
    return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
  }, []);

  // Calculate chunk index from time
  const getChunkIndex = useCallback((time) => {
    if (!manifest?.chunkDuration) return 0;
    return Math.floor(time / manifest.chunkDuration);
  }, [manifest]);

  // Get total chunks
  const getTotalChunks = useCallback(() => {
    if (!manifest) return 0;
    return manifest.chunks?.length || Math.ceil(manifest.duration / manifest.chunkDuration);
  }, [manifest]);

  // Process update queue
  const processUpdateQueue = useCallback(async () => {
    if (isUpdatingRef.current || updateQueueRef.current.length === 0) return;
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) return;

    isUpdatingRef.current = true;
    const update = updateQueueRef.current.shift();

    try {
      await update();
    } catch (err) {
      console.error('Buffer update error:', err);
    } finally {
      isUpdatingRef.current = false;
      if (updateQueueRef.current.length > 0) {
        processUpdateQueue();
      }
    }
  }, []);

  // Queue a buffer update
  const queueBufferUpdate = useCallback((updateFn) => {
    updateQueueRef.current.push(updateFn);
    processUpdateQueue();
  }, [processUpdateQueue]);

  // Fetch and append a chunk
  const fetchAndAppendChunk = useCallback(async (chunkIndex) => {
    if (!manifest || !sourceBufferRef.current) return false;
    if (loadedChunksRef.current.has(chunkIndex)) return true;
    if (pendingChunksRef.current.has(chunkIndex)) return true;
    if (chunkIndex < 0 || chunkIndex >= getTotalChunks()) return false;

    pendingChunksRef.current.add(chunkIndex);

    try {
      const response = await fetch(ENDPOINTS.chunk(videoId, quality, chunkIndex), {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) throw new Error(`Chunk fetch failed: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      
      return new Promise((resolve) => {
        queueBufferUpdate(() => {
          return new Promise((innerResolve) => {
            if (!sourceBufferRef.current || sourceBufferRef.current.updating) {
              pendingChunksRef.current.delete(chunkIndex);
              resolve(false);
              innerResolve();
              return;
            }

            const handleUpdateEnd = () => {
              sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
              loadedChunksRef.current.add(chunkIndex);
              pendingChunksRef.current.delete(chunkIndex);
              resolve(true);
              innerResolve();
            };

            sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
            
            try {
              sourceBufferRef.current.appendBuffer(arrayBuffer);
            } catch (err) {
              sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
              pendingChunksRef.current.delete(chunkIndex);
              resolve(false);
              innerResolve();
            }
          });
        });
      });
    } catch (err) {
      pendingChunksRef.current.delete(chunkIndex);
      if (err.name !== 'AbortError') {
        console.error(`Error fetching chunk ${chunkIndex}:`, err);
      }
      return false;
    }
  }, [manifest, videoId, quality, getTotalChunks, queueBufferUpdate]);

  // Buffer management - remove old chunks based on 10% rule
  const cleanupBuffer = useCallback(() => {
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) return;
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const retentionWindow = totalWatchedRef.current * RETENTION_PERCENT;
    const removeEndTime = Math.max(0, currentTime - retentionWindow);

    if (removeEndTime <= 0) return;

    const buffered = sourceBufferRef.current.buffered;
    if (buffered.length === 0) return;

    const bufferStart = buffered.start(0);
    if (bufferStart >= removeEndTime) return;

    queueBufferUpdate(() => {
      return new Promise((resolve) => {
        if (!sourceBufferRef.current || sourceBufferRef.current.updating) {
          resolve();
          return;
        }

        const handleUpdateEnd = () => {
          sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
          
          // Update loaded chunks set
          const chunkDuration = manifest?.chunkDuration || PLAYER_CONFIG.CHUNK_DURATION;
          const removedUpToChunk = Math.floor(removeEndTime / chunkDuration);
          for (let i = 0; i < removedUpToChunk; i++) {
            loadedChunksRef.current.delete(i);
          }
          
          resolve();
        };

        sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
        
        try {
          sourceBufferRef.current.remove(bufferStart, removeEndTime);
        } catch (err) {
          sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
          resolve();
        }
      });
    });
  }, [manifest, videoRef, queueBufferUpdate]);

  // Buffer chunks ahead
  const bufferAhead = useCallback(async () => {
    const currentChunk = getChunkIndex(videoRef.current?.currentTime || 0);
    const totalChunks = getTotalChunks();
    
    const chunksToLoad = [];
    for (let i = 0; i <= BUFFER_AHEAD; i++) {
      const chunkIndex = currentChunk + i;
      if (chunkIndex < totalChunks && !loadedChunksRef.current.has(chunkIndex)) {
        chunksToLoad.push(chunkIndex);
      }
    }

    for (const chunkIndex of chunksToLoad) {
      await fetchAndAppendChunk(chunkIndex);
    }

    // Cleanup old buffer periodically
    cleanupBuffer();
  }, [getChunkIndex, getTotalChunks, fetchAndAppendChunk, cleanupBuffer, videoRef]);

  // Handle seek
  const handleSeek = useCallback(async (time) => {
    if (!videoRef.current || !manifest) return;

    const targetChunk = getChunkIndex(time);
    
    // Cancel pending requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    pendingChunksRef.current.clear();

    setPlayerState(prev => ({ ...prev, isBuffering: true }));

    // Check if chunk is already buffered
    const buffered = sourceBufferRef.current?.buffered;
    let isBuffered = false;
    
    if (buffered) {
      for (let i = 0; i < buffered.length; i++) {
        if (time >= buffered.start(i) && time < buffered.end(i)) {
          isBuffered = true;
          break;
        }
      }
    }

    if (isBuffered) {
      videoRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, isBuffering: false }));
    } else {
      // Fetch the target chunk first
      await fetchAndAppendChunk(targetChunk);
      videoRef.current.currentTime = time;
      
      // Then buffer ahead
      await bufferAhead();
      setPlayerState(prev => ({ ...prev, isBuffering: false }));
    }
  }, [manifest, getChunkIndex, fetchAndAppendChunk, bufferAhead, videoRef]);

  // Initialize MediaSource
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || !manifest || isInitializedRef.current) return;

    isInitializedRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      
      videoRef.current.src = URL.createObjectURL(mediaSource);

      await new Promise((resolve, reject) => {
        const handleSourceOpen = () => {
          mediaSource.removeEventListener('sourceopen', handleSourceOpen);
          resolve();
        };
        const handleError = (e) => {
          mediaSource.removeEventListener('error', handleError);
          reject(e);
        };
        mediaSource.addEventListener('sourceopen', handleSourceOpen);
        mediaSource.addEventListener('error', handleError);
      });

      // Create source buffer
      const mimeType = getMimeType();
      if (!MediaSource.isTypeSupported(mimeType)) {
        throw new Error(`MIME type not supported: ${mimeType}`);
      }

      sourceBufferRef.current = mediaSource.addSourceBuffer(mimeType);
      sourceBufferRef.current.mode = 'segments';

      // Set duration
      if (manifest.duration) {
        mediaSource.duration = manifest.duration;
        setPlayerState(prev => ({ ...prev, duration: manifest.duration }));
      }

      // Load initial chunks
      await fetchAndAppendChunk(0);
      
      setPlayerState(prev => ({ ...prev, isBuffering: false }));

      // Start playback
      try {
        await videoRef.current.play();
        setPlayerState(prev => ({ ...prev, isPlaying: true }));
      } catch (playError) {
        console.log('Autoplay prevented:', playError);
      }

      // Buffer more chunks
      bufferAhead();
    } catch (err) {
      console.error('Player initialization error:', err);
      setPlayerState(prev => ({ 
        ...prev, 
        error: err.message,
        isBuffering: false 
      }));
    }
  }, [manifest, getMimeType, fetchAndAppendChunk, bufferAhead, videoRef]);

  // Handle quality change
  const changeQuality = useCallback(async (newQuality) => {
    if (!videoRef.current || !manifest) return;

    const currentTime = videoRef.current.currentTime;
    
    // Clear buffer and reload
    loadedChunksRef.current.clear();
    pendingChunksRef.current.clear();
    
    if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
      const buffered = sourceBufferRef.current.buffered;
      if (buffered.length > 0) {
        queueBufferUpdate(() => {
          return new Promise((resolve) => {
            if (!sourceBufferRef.current) {
              resolve();
              return;
            }
            
            const handleUpdateEnd = () => {
              sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
              resolve();
            };
            
            sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
            try {
              sourceBufferRef.current.remove(buffered.start(0), buffered.end(buffered.length - 1));
            } catch (err) {
              sourceBufferRef.current?.removeEventListener('updateend', handleUpdateEnd);
              resolve();
            }
          });
        });
      }
    }

    // Reload from current position
    setPlayerState(prev => ({ ...prev, isBuffering: true }));
    
    setTimeout(() => {
      handleSeek(currentTime);
    }, 100);
  }, [manifest, handleSeek, videoRef, queueBufferUpdate]);

  // Time update handler
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      totalWatchedRef.current = Math.max(totalWatchedRef.current, currentTime);
      
      setPlayerState(prev => ({
        ...prev,
        currentTime,
        currentChunkIndex: getChunkIndex(currentTime),
      }));

      // Check if we need to buffer more
      bufferAhead();
    };

    const handleWaiting = () => {
      setPlayerState(prev => ({ ...prev, isBuffering: true }));
    };

    const handlePlaying = () => {
      setPlayerState(prev => ({ ...prev, isBuffering: false, isPlaying: true }));
    };

    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleProgress = () => {
      const bufferedRanges = [];
      for (let i = 0; i < video.buffered.length; i++) {
        bufferedRanges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setPlayerState(prev => ({ ...prev, bufferedRanges }));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('progress', handleProgress);
    };
  }, [videoRef, getChunkIndex, bufferAhead]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (mediaSourceRef.current?.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch (e) {}
      }
    };
  }, []);

  return {
    playerState,
    initializePlayer,
    handleSeek,
    changeQuality,
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    togglePlay: () => {
      if (videoRef.current?.paused) {
        videoRef.current.play();
      } else {
        videoRef.current?.pause();
      }
    },
  };
};
