import { Play, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoCard = ({ video }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/watch/${video.id}`);
  };

  return (
    <div className="video-card group" onClick={handleClick}>
      <div className="video-card-thumbnail">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      <div className="video-card-info">
        <h3 className="font-medium text-foreground line-clamp-2 leading-tight">
          {video.title}
        </h3>
        
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {video.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {video.qualities?.map((quality) => (
            <span key={quality} className="quality-badge">
              {quality}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const VideoCardSkeleton = () => {
  return (
    <div className="video-card">
      <div className="video-card-thumbnail skeleton skeleton-shine" />
      <div className="video-card-info space-y-2">
        <div className="h-4 w-3/4 skeleton skeleton-shine rounded" />
        <div className="h-3 w-1/2 skeleton skeleton-shine rounded" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-12 skeleton skeleton-shine rounded" />
          <div className="h-5 w-12 skeleton skeleton-shine rounded" />
        </div>
      </div>
    </div>
  );
};
