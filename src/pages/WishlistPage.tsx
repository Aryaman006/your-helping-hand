import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { UserLayout } from '@/components/layout/UserLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Heart,
  Play,
  Clock,
  Crown,
  Trash2,
  Loader2,
  Bookmark,
} from 'lucide-react';

interface WishlistItem {
  id: string;
  video_id: string;
  created_at: string;
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

const WishlistPage: React.FC = () => {
  const { user, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          video_id,
          created_at,
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user,
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: () => {
      toast.error('Failed to remove from wishlist');
    },
  });

  const handlePlayVideo = (video: WishlistItem['videos']) => {
    if (video.is_premium && !hasActiveSubscription) {
      navigate('/subscribe');
      return;
    }
    navigate(`/video/${video.id}`);
  };

  if (!user) {
    return (
      <UserLayout>
        <div className="content-container py-16 text-center">
          <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Your Wishlist</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to see your saved videos
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
            <Heart className="w-8 h-8 text-primary" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground">
            Videos you've saved to watch later
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : wishlist && wishlist.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div
                  className="relative h-40 bg-cover bg-center cursor-pointer"
                  style={{
                    backgroundImage: item.videos.thumbnail_url
                      ? `url(${item.videos.thumbnail_url})`
                      : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground)))',
                  }}
                  onClick={() => handlePlayVideo(item.videos)}
                >
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white" />
                  </div>
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
                </div>
                <CardContent className="p-4">
                  <h3
                    className="font-semibold line-clamp-2 mb-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handlePlayVideo(item.videos)}
                  >
                    {item.videos.title}
                  </h3>
                  {item.videos.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.videos.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(item.videos.duration_seconds)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromWishlist.mutate(item.id)}
                      disabled={removeFromWishlist.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-muted-foreground mb-6">
              Start adding videos to watch later!
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

export default WishlistPage;
