import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

// Forum posts: ranked feed, search/label/kind filters, voting, saving, comments.
// Follow/following state stays in useSocial; this hook owns the posts surface.
export function usePosts(toast) {
  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedMeta, setFeedMeta] = useState({ offset: 0, hasMore: false })

  const buildQuery = (opts = {}) => {
    const { scope = 'global', sort = 'hot', kind = '', label = '', q = '', limit = 20, offset = 0 } = opts
    const p = new URLSearchParams({ scope, sort, limit: String(limit), offset: String(offset) })
    if (kind) p.set('kind', kind)
    if (label) p.set('label', label)
    if (q) p.set('q', q)
    return p.toString()
  }

  const loadFeed = useCallback(async (opts = {}) => {
    const { offset = 0, replace = true } = opts
    setFeedLoading(true)
    try {
      const data = await api.get(`/posts?${buildQuery(opts)}`)
      setFeed(prev => replace ? data.items : [...prev, ...data.items])
      setFeedMeta({
        offset: offset + (data.items?.length || 0),
        hasMore: !!data.has_more,
      })
      return data
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load feed', 'error')
      return null
    } finally {
      setFeedLoading(false)
    }
  }, [toast])

  const loadMore = useCallback((opts = {}) => {
    return loadFeed({ ...opts, offset: feedMeta.offset, replace: false })
  }, [loadFeed, feedMeta.offset])

  const createPost = useCallback(async (payload) => {
    try {
      const data = await api.post('/posts', payload)
      return data.post
    } catch (err) {
      if (toast) toast(err.message || 'Failed to post', 'error')
      throw err
    }
  }, [toast])

  const getPost = useCallback(async (id) => {
    return api.get(`/posts/${id}`)
  }, [])

  const votePost = useCallback(async (id, value) => {
    // Optimistic: caller updates local state from the returned score.
    try {
      return await api.post(`/posts/${id}/vote`, { value })
    } catch (err) {
      if (toast) toast(err.message || 'Vote failed', 'error')
      return null
    }
  }, [toast])

  const voteComment = useCallback(async (commentId, value) => {
    try {
      return await api.post(`/posts/comments/${commentId}/vote`, { value })
    } catch (err) {
      if (toast) toast(err.message || 'Vote failed', 'error')
      return null
    }
  }, [toast])

  const setSaved = useCallback(async (id, saved) => {
    try {
      if (saved) await api.post(`/posts/${id}/save`)
      else await api.del(`/posts/${id}/save`)
      return saved
    } catch (err) {
      if (toast) toast(err.message || 'Could not update saved', 'error')
      return !saved
    }
  }, [toast])

  const loadSaved = useCallback(async () => {
    try {
      const data = await api.get('/posts/saved')
      return data.items || []
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load saved posts', 'error')
      return []
    }
  }, [toast])

  const addComment = useCallback(async (postId, body, parentId = null) => {
    try {
      const data = await api.post(`/posts/${postId}/comments`, { body, parent_id: parentId })
      return data.comment
    } catch (err) {
      if (toast) toast(err.message || 'Failed to comment', 'error')
      throw err
    }
  }, [toast])

  const loadComposeOptions = useCallback(async () => {
    try {
      return await api.get('/posts/compose-options')
    } catch (err) {
      if (toast) toast(err.message || 'Failed to load options', 'error')
      return { workouts: [] }
    }
  }, [toast])

  // Patch one post in the local feed (after vote/save) without a refetch.
  const patchFeedItem = useCallback((id, patch) => {
    setFeed(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  return {
    feed, feedLoading, feedMeta,
    loadFeed, loadMore, patchFeedItem,
    createPost, getPost,
    votePost, voteComment, setSaved, loadSaved,
    addComment, loadComposeOptions,
  }
}
