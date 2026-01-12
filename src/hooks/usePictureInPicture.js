import { useState, useEffect, useCallback, useRef } from 'react';

export const usePictureInPicture = (videoRef) => {
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  useEffect(() => {
    // Check if PiP is supported
    setIsPiPSupported(
      'pictureInPictureEnabled' in document && 
      document.pictureInPictureEnabled
    );
  }, []);

  useEffect(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  const togglePiP = useCallback(async () => {
    if (!videoRef?.current || !isPiPSupported) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, [videoRef, isPiPSupported]);

  const enterPiP = useCallback(async () => {
    if (!videoRef?.current || !isPiPSupported || isPiPActive) return;

    try {
      await videoRef.current.requestPictureInPicture();
    } catch (err) {
      console.error('Failed to enter PiP:', err);
    }
  }, [videoRef, isPiPSupported, isPiPActive]);

  const exitPiP = useCallback(async () => {
    if (!isPiPActive) return;

    try {
      await document.exitPictureInPicture();
    } catch (err) {
      console.error('Failed to exit PiP:', err);
    }
  }, [isPiPActive]);

  return {
    isPiPSupported,
    isPiPActive,
    togglePiP,
    enterPiP,
    exitPiP,
  };
};

// Hook for mini player visibility based on scroll
export const useMiniPlayer = (containerRef, threshold = 100) => {
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!containerRef?.current) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const isOutOfView = rect.bottom < -threshold;
      
      setShowMiniPlayer(isOutOfView);
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [containerRef, threshold]);

  return { showMiniPlayer };
};
