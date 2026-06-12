const { getOne } = require('./db');
const { isBlockedEitherWay } = require('./moderation');

async function followsUser(viewerId, ownerId) {
  if (!viewerId || !ownerId || viewerId === ownerId) return false;
  return !!(await getOne(
    'SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?',
    [viewerId, ownerId]
  ));
}

async function canViewWorkout(workout, viewerId) {
  if (!workout) return false;
  if (workout.user_id === viewerId) return true;
  if (await isBlockedEitherWay(viewerId, workout.user_id)) return false;
  if (workout.visibility === 'public') return true;
  if (workout.visibility === 'followers') return await followsUser(viewerId, workout.user_id);
  return false;
}

module.exports = { canViewWorkout, followsUser };
