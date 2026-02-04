import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { UserLayout } from '@/components/layout/UserLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  History,
  Play,
  Clock,
  Crown,
  CheckCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface WatchProgressItem {
  id: string;
  video_id: string;
  watched_seconds: number | null;
  completed: boolean | null;
  last_watched_at: string | null;
  videos: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    duration_seconds: number;
    is_premium: boolean | null;
    yogic_points: number | null;
  };
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const HistoryPage: React.FC = () => {
  const { user, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();

  const { data: history, isLoading } = useQuery({
    queryKey: ['watch-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('watch_progress')
        .select(`
          id,
          video_id,
          watched_seconds,
          completed,
          last_watched_at,
          videos (
            id,
            title,
            description,
            thumbnail_url,
            duration_seconds,
            is_premium,
            yogic_points
          )
        `)
        .eq('user_id', user.id)
        .order('last_watched_at', { ascending: false });
      if (error) throw error;
      return data as WatchProgressItem[];
    },
    enabled: !!user,
  });

  const handlePlayVideo = (video: WatchProgressItem['videos']) => {
    if (video.is_premium && !hasActiveSubscription) {
      navigate('/subscribe');
      return;
    }
    navigate(`/video/${video.id}`);
  };

  const completedCount = history?.filter((h) => h.completed).length || 0;
  const inProgressCount = history?.filter((h) => !h.completed && (h.watched_seconds || 0) > 0).length || 0;

  if (!user) {
    return (
      <UserLayout>
        <div className="content-container py-16 text-center">
          <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Watch History</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to see your watch history
          </p>
          <Button asChild>
            <Link to="/login">Log In</Link>
          </Button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="content-container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Watch History
          </h1>
          <p className="text-muted-foreground">
            Continue where you left off
          </p>
        </div>

        {/* Stats */}
        {history && history.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{history.length}</div>
              <div className="text-sm text-muted-foreground">Videos Watched</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-success">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-warning">{inProgressCount}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-accent">
                {Math.round(
                  (history.reduce((acc, h) => acc + (h.watched_seconds || 0), 0) / 60)
                )}
              </div>
              <div className="text-sm text-muted-foreground">Minutes Watched</div>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item) => {
              const progressPercent = item.videos.duration_seconds > 0
                ? Math.min(100, ((item.watched_seconds || 0) / item.videos.duration_seconds) * 100)
                : 0;

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row">
                    <div
                      className="relative w-full md:w-64 h-36 bg-cover bg-center cursor-pointer flex-shrink-0"
                      style={{
                        backgroundImage: item.videos.thumbnail_url
                          ? `url(${item.videos.thumbnail_url})`
                          : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground)))',
                      }}
                      onClick={() => handlePlayVideo(item.videos)}
                    >
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      {item.completed && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-success text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      )}
                      {item.videos.is_premium && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gold text-charcoal">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(item.videos.duration_seconds)}
                      </div>
                      {/* Progress bar overlay */}
                      {!item.completed && progressPercent > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3
                          className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary transition-colors line-clamp-1"
                          onClick={() => handlePlayVideo(item.videos)}
                        >
                          {item.videos.title}
                        </h3>
                        {item.videos.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.videos.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {item.last_watched_at
                                ? formatDistanceToNow(new Date(item.last_watched_at), {
                                    addSuffix: true,
                                  })
                                : 'Recently'}
                            </span>
                          </div>
                          {!item.completed && progressPercent > 0 && (
                            <div className="flex items-center gap-2">
                              <Progress value={progressPercent} className="w-24 h-2" />
                              <span>{Math.round(progressPercent)}%</span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePlayVideo(item.videos)}
                        >
                          {item.completed ? (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Rewatch
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Continue
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">
              No watch history yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start watching videos to build your history!
            </p>
            <Button asChild>
              <Link to="/browse">Browse Videos</Link>
            </Button>
          </Card>
        )}
      </div>
    </UserLayout>
  );
};

export default HistoryPage;
