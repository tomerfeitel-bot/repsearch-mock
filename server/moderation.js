const { getOne, runQuery } = require('./db')

// A block hides both directions: the blocker stops seeing the blocked user's
// content AND the blocked user stops seeing the blocker's, so harassment can't
// continue through replies the target can no longer see.
async function isBlocked(blockerId, blockedId) {
  if (!blockerId || !blockedId || blockerId === blockedId) return false
  return !!(await getOne(
    'SELECT 1 AS x FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    [blockerId, blockedId]
  ))
}

async function isBlockedEitherWay(viewerId, ownerId) {
  if (!viewerId || !ownerId || viewerId === ownerId) return false
  return !!(await getOne(
    `SELECT 1 AS x FROM user_blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
    [viewerId, ownerId, ownerId, viewerId]
  ))
}

// SQL fragment for list queries: keeps only rows whose author is not blocked
// by — and has not blocked — the viewer. Consumes TWO viewer-id params.
// `authorCol` is always a code-controlled column reference, never user input.
function notBlockedSql(authorCol) {
  return `NOT EXISTS (SELECT 1 FROM user_blocks ub
            WHERE (ub.blocker_id = ? AND ub.blocked_id = ${authorCol})
               OR (ub.blocker_id = ${authorCol} AND ub.blocked_id = ?))`
}

// Content removal shared by owner-delete (routes/posts.js) and the admin
// review path (routes/moderation.js).
async function removePost(postId) {
  // FKs cascade labels, votes, saves, comments and comment votes.
  await runQuery('DELETE FROM posts WHERE id = ?', [postId])
}

async function removeComment(comment) {
  const hasReplies = await getOne('SELECT 1 AS x FROM comments WHERE parent_id = ?', [comment.id])
  if (hasReplies) {
    // Soft-delete keeps the thread shape instead of re-rooting the replies.
    await runQuery("UPDATE comments SET body = '', deleted = 1 WHERE id = ?", [comment.id])
  } else {
    await runQuery('DELETE FROM comments WHERE id = ?', [comment.id])
  }
  await runQuery(
    'UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = ? AND deleted = 0) WHERE id = ?',
    [comment.post_id, comment.post_id]
  )
}

module.exports = { isBlocked, isBlockedEitherWay, notBlockedSql, removePost, removeComment }
