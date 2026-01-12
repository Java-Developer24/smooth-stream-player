import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  AlertCircle,
  RotateCcw,
  PictureInPicture2,
  X,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { useChunkPlayer } from '../hooks/useChunkPlayer';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { usePictureInPicture, useMiniPlayer } from '../hooks/usePictureInPicture';
import { saveVideoProgress, getVideoProgress } from '../services/watchHistory';
import { PLAYER_CONFIG } from '../config/api';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoPlayer = ({ videoId, metadata, manifest, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const saveProgressIntervalRef = useRef(null);

  const [quality, setQuality] = useState(PLAYER_CONFIG.DEFAULT_QUALITY);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

  const {
    playerState,
    initializePlayer,
    handleSeek,
    changeQuality,
    togglePlay,
  } = useChunkPlayer(videoRef, manifest, videoId, quality);

  // Picture-in-Picture support
  const { isPiPSupported, isPiPActive, togglePiP } = usePictureInPicture(videoRef);
  
  // Mini player on scroll
  const { showMiniPlayer } = useMiniPlayer(containerRef);

  // Keyboard controls
  useKeyboardControls({
    videoRef,
    containerRef,
    togglePlay,
    toggleMute: () => {
      if (videoRef.current) {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        videoRef.current.muted = newMuted;
      }
    },
    toggleFullscreen: () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    },
    handleSeek,
    playerState,
    isEnabled: !isPiPActive,
  });

  // Initialize player when manifest is ready
  useEffect(() => {
    if (manifest) {
      initializePlayer();
    }
  }, [manifest, initializePlayer]);

  // Restore watch position
  useEffect(() => {
    if (!hasRestoredPosition && playerState.duration > 0 && videoId) {
      const savedProgress = getVideoProgress(videoId);
      if (savedProgress && savedProgress.currentTime > 5 && !savedProgress.isCompleted) {
        // Resume from saved position
        handleSeek(savedProgress.currentTime);
      }
      setHasRestoredPosition(true);
    }
  }, [playerState.duration, videoId, hasRestoredPosition, handleSeek]);

  // Save watch progress periodically
  useEffect(() => {
    if (!videoId || !metadata) return;

    saveProgressIntervalRef.current = setInterval(() => {
      if (playerState.currentTime > 0 && playerState.duration > 0) {
        saveVideoProgress(videoId, playerState.currentTime, playerState.duration, {
          title: metadata.title,
          thumbnail: metadata.thumbnail,
          qualities: metadata.qualities,
        });
      }
    }, 5000); // Save every 5 seconds

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
      // Save final position on unmount
      if (playerState.currentTime > 0 && playerState.duration > 0) {
        saveVideoProgress(videoId, playerState.currentTime, playerState.duration, {
          title: metadata?.title,
          thumbnail: metadata?.thumbnail,
          qualities: metadata?.qualities,
        });
      }
    };
  }, [videoId, metadata, playerState.currentTime, playerState.duration]);

  // Handle quality change
  const onQualityChange = useCallback((newQuality) => {
    setQuality(newQuality);
    changeQuality(newQuality);
    setShowQualityMenu(false);
  }, [changeQuality]);

  // Handle progress bar click/drag
  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !playerState.duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * playerState.duration;
    handleSeek(Math.max(0, Math.min(time, playerState.duration)));
  }, [playerState.duration, handleSeek]);

  const handleProgressDrag = useCallback((e) => {
    if (!isDragging) return;
    handleProgressClick(e);
  }, [isDragging, handleProgressClick]);

  // Volume control
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  }, [isMuted]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.() || 
      containerRef.current.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || 
      document.webkitExitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (playerState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Skip buttons
  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, playerState.currentTime - PLAYER_CONFIG.SEEK_STEP_LARGE);
    handleSeek(newTime);
  }, [playerState.currentTime, handleSeek]);

  const skipForward = useCallback(() => {
    const newTime = Math.min(playerState.duration, playerState.currentTime + PLAYER_CONFIG.SEEK_STEP_LARGE);
    handleSeek(newTime);
  }, [playerState.currentTime, playerState.duration, handleSeek]);

  // Calculate progress percentages
  const playedPercent = playerState.duration 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;
  
  const bufferedPercent = playerState.bufferedRanges.length > 0
    ? (Math.max(...playerState.bufferedRanges.map(r => r.end)) / playerState.duration) * 100
    : 0;

  // Get available qualities from manifest or use defaults
  const availableQualities = manifest?.qualities || PLAYER_CONFIG.QUALITIES;

  // Mini Player Component
  const MiniPlayerOverlay = () => {
    if (!showMiniPlayer || isPiPActive) return null;

    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 aspect-video bg-player-bg rounded-lg shadow-2xl overflow-hidden border border-border animate-slide-up">
        <video
          className="w-full h-full object-cover pointer-events-none"
          ref={(el) => {
            if (el && videoRef.current) {
              el.srcObject = videoRef.current.captureStream?.() || null;
            }
          }}
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={togglePlay} className="control-button p-1">
                {playerState.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <span className="text-white text-xs">
                {formatTime(playerState.currentTime)}
              </span>
            </div>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="control-button p-1"
              title="Back to player"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full h-1 bg-player-progress rounded-full mt-1">
            <div 
              className="h-full bg-primary rounded-full"
              style={{ width: `${playedPercent}%` }}
            />
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 control-button p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="player-container aspect-video bg-player-bg"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => playerState.isPlaying && setShowControls(false)}
        tabIndex={0}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full"
          onClick={togglePlay}
          playsInline
        />

        {/* Buffering Overlay */}
        {playerState.isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="buffering-spinner" />
          </div>
        )}

        {/* Error Overlay */}
        {playerState.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-lg mb-2">Playback Error</p>
            <p className="text-sm text-muted-foreground mb-4">{playerState.error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg hover:bg-primary-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Center Play Button (when paused) */}
        {!playerState.isPlaying && !playerState.isBuffering && !playerState.error && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors">
              <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div 
          className={`player-controls transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Bar */}
          <div 
            ref={progressRef}
            className="progress-bar mb-4"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={handleProgressDrag}
            onMouseLeave={() => setIsDragging(false)}
          >
            <div 
              className="progress-buffered" 
              style={{ width: `${bufferedPercent}%` }} 
            />
            <div 
              className="progress-played" 
              style={{ width: `${playedPercent}%` }} 
            />
            <div 
              className="progress-handle"
              style={{ left: `${playedPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="control-button" title="Play/Pause (Space)">
                {playerState.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              {/* Skip Backward */}
              <button onClick={skipBackward} className="control-button" title="Rewind 10s (J)">
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Forward */}
              <button onClick={skipForward} className="control-button" title="Forward 10s (L)">
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group">
                <button onClick={toggleMute} className="control-button" title="Mute (M)">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover:w-20 transition-all duration-300 accent-primary opacity-0 group-hover:opacity-100"
                />
              </div>

              {/* Time Display */}
              <span className="text-white/90 text-sm ml-2">
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Picture-in-Picture */}
              {isPiPSupported && (
                <button 
                  onClick={togglePiP} 
                  className={`control-button ${isPiPActive ? 'text-primary' : ''}`}
                  title="Picture-in-Picture (P)"
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}

              {/* Quality Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="control-button flex items-center gap-1"
                  title="Quality"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm hidden sm:inline">{quality}</span>
                </button>
                
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => onQualityChange(q)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors ${
                          q === quality ? 'text-primary font-medium' : 'text-foreground'
                        }`}
                      >
                        {q}
                        {q === quality && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="control-button" title="Fullscreen (F)">
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Hints (shown briefly) */}
        <div className="absolute top-4 left-4 text-white/60 text-xs hidden lg:block pointer-events-none">
          {showControls && (
            <div className="space-y-0.5 animate-fade-in">
              <p>Space: Play/Pause</p>
              <p>←/→: Seek ±5s</p>
              <p>J/L: Seek ±10s</p>
              <p>M: Mute • F: Fullscreen</p>
            </div>
          )}
        </div>
      </div>

      {/* Mini Player */}
      <MiniPlayerOverlay />
    </>
  );
};
