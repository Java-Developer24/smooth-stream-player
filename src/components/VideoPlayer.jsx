import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  Loader2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useChunkPlayer } from '../hooks/useChunkPlayer';
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

export const VideoPlayer = ({ videoId, metadata, manifest }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [quality, setQuality] = useState(PLAYER_CONFIG.DEFAULT_QUALITY);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    playerState,
    initializePlayer,
    handleSeek,
    changeQuality,
    togglePlay,
  } = useChunkPlayer(videoRef, manifest, videoId, quality);

  // Initialize player when manifest is ready
  useEffect(() => {
    if (manifest) {
      initializePlayer();
    }
  }, [manifest, initializePlayer]);

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

  // Calculate progress percentages
  const playedPercent = playerState.duration 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;
  
  const bufferedPercent = playerState.bufferedRanges.length > 0
    ? (Math.max(...playerState.bufferedRanges.map(r => r.end)) / playerState.duration) * 100
    : 0;

  // Get available qualities from manifest or use defaults
  const availableQualities = manifest?.qualities || PLAYER_CONFIG.QUALITIES;

  return (
    <div 
      ref={containerRef}
      className="player-container aspect-video bg-player-bg"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playerState.isPlaying && setShowControls(false)}
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
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="control-button">
              {playerState.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group">
              <button onClick={toggleMute} className="control-button">
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

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="control-button flex items-center gap-1"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm">{quality}</span>
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
            <button onClick={toggleFullscreen} className="control-button">
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Click overlay for play/pause (center area) */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={togglePlay}
        style={{ zIndex: showControls ? -1 : 1 }}
      />
    </div>
  );
};
