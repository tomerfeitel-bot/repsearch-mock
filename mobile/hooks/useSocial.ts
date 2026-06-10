import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

// Port of src/hooks/useSocial.js — follow graph + the legacy event feed.
type ToastFn = ((message: string, type?: 'info' | 'success' | 'error') => void) | null | undefined;

export function useSocial(toast: ToastFn) {
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedMeta, setFeedMeta] = useState({ total: 0, offset: 0, hasMore: false });
  const [following, setFollowing] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(
    async (opts: { scope?: string; type?: string; limit?: number; offset?: number; replace?: boolean } = {}) => {
      const { scope = 'following', type = 'all', limit = 20, offset = 0, replace = true } = opts;
      setFeedLoading(true);
      try {
        const qs = `?scope=${scope}&type=${type}&limit=${limit}&offset=${offset}`;
        const data = await api.get(`/feed${qs}`);
        setFeed((prev) => (replace ? data.items : [...prev, ...data.items]));
        setFeedMeta({
          total: data.total || offset + (data.items?.length || 0) + (data.has_more ? 1 : 0),
          offset: offset + (data.items?.length || 0),
          hasMore: !!data.has_more,
        });
      } catch (err: any) {
        toast?.(err.message || 'Failed to load feed', 'error');
      } finally {
        setFeedLoading(false);
      }
    },
    [toast],
  );

  const loadMore = useCallback(
    (opts = {}) => {
      return loadFeed({ ...opts, offset: feedMeta.offset, replace: false });
    },
    [loadFeed, feedMeta.offset],
  );

  const loadFollowing = useCallback(async () => {
    try {
      const data = await api.get('/social/following');
      const users = data.following || data.users || [];
      setFollowing(users);
      setFollowingIds(new Set(users.map((u: any) => u.id)));
      return users;
    } catch (err: any) {
      toast?.(err.message || 'Failed to load following', 'error');
      return [];
    }
  }, [toast]);

  const follow = useCallback(
    async (userId: string) => {
      try {
        await api.post(`/social/follow/${userId}`);
        setFollowingIds((prev) => new Set([...prev, userId]));
      } catch (err: any) {
        toast?.(err.message || 'Failed to follow', 'error');
      }
    },
    [toast],
  );

  const unfollow = useCallback(
    async (userId: string) => {
      try {
        await api.del(`/social/follow/${userId}`);
        setFollowingIds((prev) => {
          const n = new Set(prev);
          n.delete(userId);
          return n;
        });
        setFollowing((prev) => prev.filter((u) => u.id !== userId));
      } catch (err: any) {
        toast?.(err.message || 'Failed to unfollow', 'error');
      }
    },
    [toast],
  );

  return {
    feed,
    feedLoading,
    feedMeta,
    loadFeed,
    loadMore,
    following,
    followingIds,
    loadFollowing,
    follow,
    unfollow,
  };
}
