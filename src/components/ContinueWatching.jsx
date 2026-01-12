import { useNavigate } from 'react-router-dom';
import { Play, X, Clock } from 'lucide-react';
import { formatTimeAgo, removeFromHistory } from '../services/watchHistory';

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ContinueWatchingCard = ({ item, onRemove }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/watch/${item.videoId}`);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    removeFromHistory(item.videoId);
    onRemove?.(item.videoId);
  };

  return (
    <div 
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-card hover:bg-card-hover transition-all duration-300"
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-player-progress">
          <div 
            className="h-full bg-primary"
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          title="Remove from history"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Time remaining */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
          {formatDuration(item.duration - item.currentTime)} left
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-1">
          {item.title || `Video ${item.videoId}`}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTimeAgo(item.lastWatched)}</span>
        </div>
      </div>
    </div>
  );
};

export const ContinueWatchingSection = ({ items, onUpdate }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Continue Watching
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <ContinueWatchingCard 
            key={item.videoId} 
            item={item} 
            onRemove={onUpdate}
          />
        ))}
      </div>
    </section>
  );
};
