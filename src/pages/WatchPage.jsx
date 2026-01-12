import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2, Clock, Film } from 'lucide-react';
import { Header } from '../components/Header';
import { VideoPlayer } from '../components/VideoPlayer';
import { useVideoApi } from '../hooks/useVideoApi';

import thumbnail1 from '../assets/video-thumbnail-1.jpg';
import thumbnail2 from '../assets/video-thumbnail-2.jpg';
import thumbnail3 from '../assets/video-thumbnail-3.jpg';

// Mock data for demo
const MOCK_METADATA = {
  'video-1': {
    id: 'video-1',
    title: 'Introduction to Chunk-Based Streaming',
    description: 'Learn how modern video platforms like YouTube and Netflix deliver content efficiently using chunk-based streaming. This video covers the fundamentals of adaptive bitrate streaming, Media Source Extensions (MSE), and how to implement your own streaming solution.\n\nTopics covered:\n• How chunk-based streaming works\n• Media Source Extensions (MSE) API\n• Buffer management strategies\n• Quality adaptation techniques',
    duration: 645,
    thumbnail: thumbnail1,
    qualities: ['360p', '720p', '1080p'],
    uploadedAt: '2024-01-15',
  },
  'video-2': {
    id: 'video-2',
    title: 'Building Scalable Video Platforms',
    description: 'Architecture patterns for high-performance streaming applications. Learn about CDN integration, chunk storage strategies, and handling millions of concurrent viewers.\n\nThis comprehensive guide covers everything from basic architecture to advanced scaling techniques used by major streaming platforms.',
    duration: 1823,
    thumbnail: thumbnail2,
    qualities: ['480p', '720p', '1080p'],
    uploadedAt: '2024-01-20',
  },
  'video-3': {
    id: 'video-3',
    title: 'Media Source Extensions Deep Dive',
    description: 'A comprehensive guide to using MSE APIs for building custom video players with advanced buffering strategies.\n\nLearn the internals of how browsers handle video streaming and how to leverage this for optimal playback performance.',
    duration: 2156,
    thumbnail: thumbnail3,
    qualities: ['360p', '480p', '720p'],
    uploadedAt: '2024-02-01',
  },
};

const MOCK_MANIFEST = {
  chunkDuration: 5,
  duration: 645,
  qualities: ['360p', '720p', '1080p'],
  chunks: Array.from({ length: 129 }, (_, i) => ({
    index: i,
    startTime: i * 5,
    endTime: Math.min((i + 1) * 5, 645),
  })),
};

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins} min`;
};

const WatchPage = () => {
  const { videoId } = useParams();
  const { loading, error, fetchVideoMetadata, fetchVideoManifest } = useVideoApi();
  
  const [metadata, setMetadata] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const loadVideoData = async () => {
      if (!videoId) return;

      try {
        // Try to fetch from API
        const [metaData, manifestData] = await Promise.all([
          fetchVideoMetadata(videoId),
          fetchVideoManifest(videoId),
        ]);

        if (metaData && manifestData) {
          setMetadata(metaData);
          setManifest(manifestData);
        } else {
          // Use mock data
          const mockMeta = MOCK_METADATA[videoId];
          if (mockMeta) {
            setMetadata(mockMeta);
            setManifest({
              ...MOCK_MANIFEST,
              duration: mockMeta.duration,
              qualities: mockMeta.qualities,
              chunks: Array.from(
                { length: Math.ceil(mockMeta.duration / 5) },
                (_, i) => ({
                  index: i,
                  startTime: i * 5,
                  endTime: Math.min((i + 1) * 5, mockMeta.duration),
                })
              ),
            });
            setUseMockData(true);
          } else {
            setLoadError('Video not found');
          }
        }
      } catch (err) {
        // Fallback to mock data
        const mockMeta = MOCK_METADATA[videoId];
        if (mockMeta) {
          setMetadata(mockMeta);
          setManifest({
            ...MOCK_MANIFEST,
            duration: mockMeta.duration,
            qualities: mockMeta.qualities,
          });
          setUseMockData(true);
        } else {
          setLoadError('Failed to load video');
        }
      }
    };

    loadVideoData();
  }, [videoId, fetchVideoMetadata, fetchVideoManifest]);

  if (loading && !metadata) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (loadError || error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Video Not Available
            </h1>
            <p className="text-muted-foreground mb-6">
              {loadError || error || 'The video you requested could not be found.'}
            </p>
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Videos
        </Link>

        {/* Demo Mode Banner */}
        {useMockData && (
          <div className="mb-4 p-3 bg-secondary/50 border border-border rounded-lg flex items-center gap-3 animate-fade-in">
            <Film className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Demo Mode</p>
              <p className="text-xs text-muted-foreground">
                Player controls are functional. Connect to your backend API for actual video playback.
              </p>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className="mb-6">
          <VideoPlayer
            videoId={videoId}
            metadata={metadata}
            manifest={manifest}
          />
        </div>

        {/* Video Info */}
        {metadata && (
          <div className="max-w-4xl animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {metadata.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{formatDuration(metadata.duration)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {metadata.qualities?.map((quality) => (
                  <span key={quality} className="quality-badge">
                    {quality}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-foreground whitespace-pre-line">
                {metadata.description}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WatchPage;
