import { useEffect, useCallback } from 'react';
import { PLAYER_CONFIG } from '../config/api';

export const useKeyboardControls = ({
  videoRef,
  containerRef,
  togglePlay,
  toggleMute,
  toggleFullscreen,
  handleSeek,
  playerState,
  isEnabled = true,
}) => {
  const handleKeyDown = useCallback((e) => {
    if (!isEnabled) return;
    
    // Ignore if user is typing in an input field
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      return;
    }

    const { currentTime, duration } = playerState;
    const seekStepSmall = PLAYER_CONFIG.SEEK_STEP_SMALL;
    const seekStepLarge = PLAYER_CONFIG.SEEK_STEP_LARGE;

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        togglePlay?.();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (handleSeek && duration > 0) {
          const newTime = Math.max(0, currentTime - seekStepSmall);
          handleSeek(newTime);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (handleSeek && duration > 0) {
          const newTime = Math.min(duration, currentTime + seekStepSmall);
          handleSeek(newTime);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (videoRef?.current) {
          videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (videoRef?.current) {
          videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
        }
        break;

      case 'KeyM':
        e.preventDefault();
        toggleMute?.();
        break;

      case 'KeyF':
        e.preventDefault();
        toggleFullscreen?.();
        break;

      case 'KeyJ':
        // Seek backward 10 seconds (YouTube-style)
        e.preventDefault();
        if (handleSeek && duration > 0) {
          const newTime = Math.max(0, currentTime - seekStepLarge);
          handleSeek(newTime);
        }
        break;

      case 'KeyL':
        // Seek forward 10 seconds (YouTube-style)
        e.preventDefault();
        if (handleSeek && duration > 0) {
          const newTime = Math.min(duration, currentTime + seekStepLarge);
          handleSeek(newTime);
        }
        break;

      case 'Home':
        e.preventDefault();
        handleSeek?.(0);
        break;

      case 'End':
        e.preventDefault();
        if (duration > 0) {
          handleSeek?.(duration - 1);
        }
        break;

      case 'Digit0':
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
      case 'Digit7':
      case 'Digit8':
      case 'Digit9':
        // Jump to percentage of video (0 = 0%, 5 = 50%, etc.)
        e.preventDefault();
        if (duration > 0) {
          const percent = parseInt(e.code.replace('Digit', '')) / 10;
          handleSeek?.(duration * percent);
        }
        break;

      default:
        break;
    }
  }, [
    isEnabled,
    videoRef,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    handleSeek,
    playerState,
  ]);

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isEnabled]);

  return null;
};
