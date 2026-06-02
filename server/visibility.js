const { getOne } = require('./db')

function followsUser(viewerId, ownerId) {
  if (!viewerId || !ownerId || viewerId === ownerId) return false
  return !!getOne(
    'SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?',
    [viewerId, ownerId],
  )
}

function canViewWorkout(workout, viewerId) {
  if (!workout) return false
  if (workout.user_id === viewerId) return true
  if (workout.visibility === 'public') return true
  if (workout.visibility === 'followers') return followsUser(viewerId, workout.user_id)
  return false
}

module.exports = { canViewWorkout, followsUser }
