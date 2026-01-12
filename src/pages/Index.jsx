import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';
import { useVideoApi } from '../hooks/useVideoApi';
import { AlertCircle, Film, RefreshCw } from 'lucide-react';

import thumbnail1 from '../assets/video-thumbnail-1.jpg';
import thumbnail2 from '../assets/video-thumbnail-2.jpg';
import thumbnail3 from '../assets/video-thumbnail-3.jpg';
import thumbnail4 from '../assets/video-thumbnail-4.jpg';
import thumbnail5 from '../assets/video-thumbnail-5.jpg';
import thumbnail6 from '../assets/video-thumbnail-6.jpg';

// Mock data for demo (remove when connecting to real API)
const MOCK_VIDEOS = [
  {
    id: 'video-1',
    title: 'Introduction to Chunk-Based Streaming',
    description: 'Learn how modern video platforms deliver content efficiently',
    duration: 645,
    thumbnail: thumbnail1,
    qualities: ['360p', '720p', '1080p'],
  },
  {
    id: 'video-2',
    title: 'Building Scalable Video Platforms',
    description: 'Architecture patterns for high-performance streaming',
    duration: 1823,
    thumbnail: thumbnail2,
    qualities: ['480p', '720p', '1080p'],
  },
  {
    id: 'video-3',
    title: 'Media Source Extensions Deep Dive',
    description: 'Understanding MSE for adaptive streaming',
    duration: 2156,
    thumbnail: thumbnail3,
    qualities: ['360p', '480p', '720p'],
  },
  {
    id: 'video-4',
    title: 'Optimizing Video Delivery',
    description: 'CDN strategies and caching techniques',
    duration: 987,
    thumbnail: thumbnail4,
    qualities: ['720p', '1080p'],
  },
  {
    id: 'video-5',
    title: 'Real-time Quality Adaptation',
    description: 'Implementing ABR algorithms',
    duration: 1456,
    thumbnail: thumbnail5,
    qualities: ['360p', '480p', '720p', '1080p'],
  },
  {
    id: 'video-6',
    title: 'Video Encoding Best Practices',
    description: 'Codec selection and encoding parameters',
    duration: 2890,
    thumbnail: thumbnail6,
    qualities: ['480p', '720p', '1080p'],
  },
];

const Index = () => {
  const { error, fetchVideos } = useVideoApi();
  const [videos, setVideos] = useState(MOCK_VIDEOS);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const data = await fetchVideos();
        if (data && data.length > 0) {
          setVideos(data);
          setUseMockData(false);
        }
      } catch (err) {
        // Keep using mock data
      } finally {
        setIsLoading(false);
      }
    };
    
    // Short timeout to show loading state briefly
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    loadVideos();
    
    return () => clearTimeout(timer);
  }, [fetchVideos]);

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVideos();
      if (data && data.length > 0) {
        setVideos(data);
        setUseMockData(false);
      }
    } catch (err) {
      setVideos(MOCK_VIDEOS);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Discover Videos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Experience seamless chunk-based streaming with intelligent buffering and quality adaptation.
          </p>
        </div>

        {/* Demo Mode Banner */}
        {useMockData && !isLoading && (
          <div className="mb-8 p-4 bg-secondary/50 border border-border rounded-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Demo Mode</p>
                <p className="text-xs text-muted-foreground">
                  Showing sample videos. Connect to your backend API for real content.
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary-hover rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !useMockData && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Failed to Load Videos
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Video Grid */}
        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {videos.map((video, index) => (
              <div 
                key={video.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Videos Available
            </h2>
            <p className="text-muted-foreground">
              Upload some videos to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
