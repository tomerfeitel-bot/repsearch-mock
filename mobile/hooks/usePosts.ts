import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

// Port of src/hooks/usePosts.js — forum posts: ranked feed, search/label/kind
// filters, voting, saving, comments. Same API; toast is the useToast callback.
export type FeedQuery = {
  scope?: string;
  sort?: string;
  kind?: string;
  label?: string;
  q?: string;
  limit?: number;
  offset?: number;
  replace?: boolean;
};

export type PostItem = {
  id: string;
  kind: string;
  title?: string;
  body?: string;
  username: string;
  created_at: string;
  score: number;
  viewer_vote: number;
  saved?: boolean;
  comment_count?: number;
  labels?: string[];
  attachment?: any;
  top_comment?: { username: string; body: string } | null;
  [key: string]: any;
};

type ToastFn = ((message: string, type?: 'info' | 'success' | 'error') => void) | null | undefined;

export function usePosts(toast: ToastFn) {
  const [feed, setFeed] = useState<PostItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedMeta, setFeedMeta] = useState({ offset: 0, hasMore: false });

  const buildQuery = (opts: FeedQuery = {}) => {
    const { scope = 'global', sort = 'hot', kind = '', label = '', q = '', limit = 20, offset = 0 } = opts;
    const p = new URLSearchParams({ scope, sort, limit: String(limit), offset: String(offset) });
    if (kind) p.set('kind', kind);
    if (label) p.set('label', label);
    if (q) p.set('q', q);
    return p.toString();
  };

  const loadFeed = useCallback(
    async (opts: FeedQuery = {}) => {
      const { offset = 0, replace = true } = opts;
      setFeedLoading(true);
      try {
        const data = await api.get(`/posts?${buildQuery(opts)}`);
        setFeed((prev) => (replace ? data.items : [...prev, ...data.items]));
        setFeedMeta({
          offset: offset + (data.items?.length || 0),
          hasMore: !!data.has_more,
        });
        return data;
      } catch (err: any) {
        toast?.(err.message || 'Failed to load feed', 'error');
        return null;
      } finally {
        setFeedLoading(false);
      }
    },
    [toast],
  );

  const loadMore = useCallback(
    (opts: FeedQuery = {}) => {
      return loadFeed({ ...opts, offset: feedMeta.offset, replace: false });
    },
    [loadFeed, feedMeta.offset],
  );

  const createPost = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const data = await api.post('/posts', payload);
        return data.post;
      } catch (err: any) {
        toast?.(err.message || 'Failed to post', 'error');
        throw err;
      }
    },
    [toast],
  );

  const getPost = useCallback(async (id: string) => {
    return api.get(`/posts/${encodeURIComponent(id)}`);
  }, []);

  const votePost = useCallback(
    async (id: string, value: number) => {
      // Optimistic: caller updates local state from the returned score.
      try {
        return await api.post(`/posts/${encodeURIComponent(id)}/vote`, { value });
      } catch (err: any) {
        toast?.(err.message || 'Vote failed', 'error');
        return null;
      }
    },
    [toast],
  );

  const voteComment = useCallback(
    async (commentId: string, value: number) => {
      try {
        return await api.post(`/posts/comments/${commentId}/vote`, { value });
      } catch (err: any) {
        toast?.(err.message || 'Vote failed', 'error');
        return null;
      }
    },
    [toast],
  );

  const setSaved = useCallback(
    async (id: string, saved: boolean) => {
      try {
        if (saved) await api.post(`/posts/${encodeURIComponent(id)}/save`);
        else await api.del(`/posts/${encodeURIComponent(id)}/save`);
        return saved;
      } catch (err: any) {
        toast?.(err.message || 'Could not update saved', 'error');
        return !saved;
      }
    },
    [toast],
  );

  const loadSaved = useCallback(async (): Promise<PostItem[]> => {
    try {
      const data = await api.get('/posts/saved');
      return data.items || [];
    } catch (err: any) {
      toast?.(err.message || 'Failed to load saved posts', 'error');
      return [];
    }
  }, [toast]);

  const addComment = useCallback(
    async (postId: string, body: string, parentId: string | null = null) => {
      try {
        const data = await api.post(`/posts/${postId}/comments`, { body, parent_id: parentId });
        return data.comment;
      } catch (err: any) {
        toast?.(err.message || 'Failed to comment', 'error');
        throw err;
      }
    },
    [toast],
  );

  const loadComposeOptions = useCallback(async () => {
    try {
      return await api.get('/posts/compose-options');
    } catch (err: any) {
      toast?.(err.message || 'Failed to load options', 'error');
      return { workouts: [] };
    }
  }, [toast]);

  // Patch one post in the local feed (after vote/save) without a refetch.
  const patchFeedItem = useCallback((id: string, patch: Partial<PostItem>) => {
    setFeed((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  return {
    feed,
    feedLoading,
    feedMeta,
    loadFeed,
    loadMore,
    patchFeedItem,
    createPost,
    getPost,
    votePost,
    voteComment,
    setSaved,
    loadSaved,
    addComment,
    loadComposeOptions,
  };
}
