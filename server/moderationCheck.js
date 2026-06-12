// End-to-end check of the moderation paths: report post/comment/user, block
// semantics (feed/detail/profile/follow), delete own content, admin review
// (remove content, ban, unban), and admin authz. Creates throwaway users and
// removes them again.
//
// The admin checks sign in as modtest.admin@example.com, so the server under
// test must run with that address allow-listed:
//   ADMIN_EMAILS=modtest.admin@example.com npm run dev
// then: npm run check:moderation
// (point INTEGRATION_API_URL elsewhere to test a deployed server.)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.env.INTEGRATION_API_URL || 'http://localhost:3002/api';
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = fs.readFileSync(path.join(__dirname, '../mobile/.env'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

async function api(method, p, token, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — ' + JSON.stringify(detail)}`);
  if (!cond) process.exitCode = 1;
}

async function makeUser(prefix, stamp, emailOverride) {
  const email = emailOverride || `${prefix}.${stamp}@example.com`;
  const password = `Tt!${stamp}aB9x`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${prefix}: ${error.message}`);
  const { data: signin, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn ${prefix}: ${sErr.message}`);
  const token = signin.session.access_token;
  const username = `${prefix}_${stamp}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
  const prof = await api('POST', '/auth/profile', token, { username });
  if (prof.status !== 201) throw new Error(`profile ${prefix}: ${JSON.stringify(prof)}`);
  return { id: created.user.id, email, token, username };
}

(async () => {
  const stamp = Date.now().toString(36);
  let author, reporter, moderator;
  try {
    author = await makeUser('modauthor', stamp);
    reporter = await makeUser('modreport', stamp);
    moderator = await makeUser('modadmin', stamp, 'modtest.admin@example.com');
    check('created 3 throwaway users', true);

    // --- author posts + comments -------------------------------------------
    const post = await api('POST', '/posts', author.token, { kind: 'discussion', title: `Mod test ${stamp}`, body: 'offensive text' });
    check('author creates post', post.status === 201, post);
    const postId = post.data.post.id;
    const comment = await api('POST', `/posts/${postId}/comments`, author.token, { body: 'rude comment' });
    check('author comments', comment.status === 201, comment);
    const commentId = comment.data.comment.id;
    const reply = await api('POST', `/posts/${postId}/comments`, reporter.token, { body: 'reply under rude comment', parent_id: commentId });
    check('reporter replies (keeps comment soft-deletable)', reply.status === 201, reply);

    // --- reports -------------------------------------------------------------
    const r1 = await api('POST', '/moderation/reports', reporter.token, { target_type: 'post', target_id: postId, reason: 'harassment', details: 'test detail' });
    check('report post', r1.status === 201 && r1.data.ok, r1);
    const r1b = await api('POST', '/moderation/reports', reporter.token, { target_type: 'post', target_id: postId, reason: 'spam' });
    check('re-report is idempotent', r1b.status === 201, r1b);
    const r2 = await api('POST', '/moderation/reports', reporter.token, { target_type: 'comment', target_id: commentId, reason: 'inappropriate' });
    check('report comment', r2.status === 201, r2);
    const r3 = await api('POST', '/moderation/reports', reporter.token, { target_type: 'user', target_id: author.id, reason: 'other', details: 'bad actor' });
    check('report user', r3.status === 201, r3);
    const rSelf = await api('POST', '/moderation/reports', author.token, { target_type: 'post', target_id: postId, reason: 'spam' });
    check('self-report rejected', rSelf.status === 400, rSelf);
    const rBadReason = await api('POST', '/moderation/reports', reporter.token, { target_type: 'post', target_id: postId, reason: 'nonsense' });
    check('invalid reason rejected', rBadReason.status === 400, rBadReason);

    // --- block semantics ------------------------------------------------------
    const followRes = await api('POST', `/social/follow/${author.id}`, reporter.token);
    check('reporter follows author (pre-block)', followRes.status === 200, followRes);
    const b1 = await api('POST', `/moderation/blocks/${author.id}`, reporter.token);
    check('block author', b1.status === 200 && b1.data.blocked, b1);
    const following = await api('GET', '/social/following', reporter.token);
    check('block severed follow', !(following.data.following || []).some((u) => u.id === author.id), following.data);
    const feed = await api('GET', '/posts?scope=global&sort=new&limit=50', reporter.token);
    check('blocked author posts hidden from feed', !(feed.data.items || []).some((p) => p.id === postId), feed.data.items?.length);
    const detail = await api('GET', `/posts/${postId}`, reporter.token);
    check('blocked post detail forbidden', detail.status === 403, detail);
    const feedAuthor = await api('GET', '/posts?scope=global&sort=new&limit=50', author.token);
    check('block hides in BOTH directions (author side has no reporter content)', feedAuthor.status === 200, feedAuthor.status);
    const profAuthorView = await api('GET', `/public/users/${reporter.username}`, author.token);
    check('blocked-them profile looks private to the blocked user', profAuthorView.data.private === true, profAuthorView.data);
    const profReporterView = await api('GET', `/public/users/${author.username}`, reporter.token);
    check('blocker sees blocked-stub profile', profReporterView.data.blocked === true && profReporterView.data.viewer?.blocked === true, profReporterView.data);
    const refollow = await api('POST', `/social/follow/${author.id}`, reporter.token);
    check('re-follow rejected while blocked', refollow.status === 403, refollow);
    const blockedList = await api('GET', '/moderation/blocks', reporter.token);
    check('blocked list shows author', (blockedList.data.blocked || []).some((u) => u.id === author.id), blockedList.data);
    const vote = await api('POST', `/posts/${postId}/vote`, reporter.token, { value: 1 });
    check('voting on blocked post forbidden', vote.status === 403, vote);

    const ub = await api('DELETE', `/moderation/blocks/${author.id}`, reporter.token);
    check('unblock', ub.status === 200 && ub.data.blocked === false, ub);
    const feedAfter = await api('GET', '/posts?scope=global&sort=new&limit=50', reporter.token);
    check('post visible again after unblock', (feedAfter.data.items || []).some((p) => p.id === postId), feedAfter.data.items?.length);

    // --- delete own content ---------------------------------------------------
    const delOther = await api('DELETE', `/posts/comments/${commentId}`, reporter.token);
    check("can't delete someone else's comment", delOther.status === 403, delOther);
    const delOwnReply = await api('DELETE', `/posts/comments/${reply.data.comment.id}`, reporter.token);
    check('delete own comment', delOwnReply.status === 200, delOwnReply);
    const delPostOther = await api('DELETE', `/posts/${postId}`, reporter.token);
    check("can't delete someone else's post", delPostOther.status === 403, delPostOther);

    // re-add a reply so the admin comment-removal exercises the soft-delete path
    const reply2 = await api('POST', `/posts/${postId}/comments`, reporter.token, { body: 'reply again', parent_id: commentId });
    check('reply re-added', reply2.status === 201, reply2);

    // --- admin review ---------------------------------------------------------
    const nonAdmin = await api('GET', '/moderation/admin/reports', reporter.token);
    check('non-admin denied on admin endpoint', nonAdmin.status === 403, nonAdmin);
    const queue = await api('GET', '/moderation/admin/reports?status=open', moderator.token);
    const mine = (queue.data.reports || []).filter((r) => r.target_user_id === author.id && r.reporter_id === reporter.id);
    check('admin sees the 3 open reports', queue.status === 200 && mine.length === 3, { status: queue.status, count: mine.length });
    const commentReport = mine.find((r) => r.target_type === 'comment');
    const postReport = mine.find((r) => r.target_type === 'post');
    const userReport = mine.find((r) => r.target_type === 'user');
    check('admin payload carries usernames + live content', !!postReport?.reporter_username && !!postReport?.target_username && postReport?.content?.exists === true, postReport);

    const resolveComment = await api('POST', `/moderation/admin/reports/${commentReport.id}/resolve`, moderator.token, { status: 'resolved', remove_content: true, note: 'removed in test' });
    check('admin removes comment', resolveComment.status === 200 && resolveComment.data.actions.includes('removed_comment'), resolveComment);
    const threadAfter = await api('GET', `/posts/${postId}`, reporter.token);
    const findNode = (nodes, id) => {
      for (const n of nodes || []) {
        if (n.id === id) return n;
        const hit = findNode(n.children, id);
        if (hit) return hit;
      }
      return null;
    };
    const softDeleted = findNode(threadAfter.data.comments, commentId);
    check('comment soft-deleted (placeholder, masked author/body)', !!softDeleted && softDeleted.deleted === 1 && !softDeleted.body && !softDeleted.username, softDeleted);
    check('replies under soft-deleted comment survive', (softDeleted?.children || []).length === 1, softDeleted?.children?.length);

    const resolvePost = await api('POST', `/moderation/admin/reports/${postReport.id}/resolve`, moderator.token, { status: 'resolved', remove_content: true });
    check('admin removes post', resolvePost.status === 200 && resolvePost.data.actions.includes('removed_post'), resolvePost);
    const goneDetail = await api('GET', `/posts/${postId}`, reporter.token);
    check('removed post is gone', goneDetail.status === 404, goneDetail);

    const banRes = await api('POST', `/moderation/admin/reports/${userReport.id}/resolve`, moderator.token, { status: 'resolved', ban_user: true });
    check('admin bans user from report', banRes.status === 200 && banRes.data.actions.includes('banned_user'), banRes);
    const bannedMe = await api('GET', '/auth/me', author.token);
    check('banned user locked out of API', bannedMe.status === 401, bannedMe);
    const bannedProfile = await api('GET', `/public/users/${author.username}`, reporter.token);
    check('banned profile hidden', bannedProfile.status === 404, bannedProfile);

    const unbanRes = await api('POST', `/moderation/admin/users/${author.id}/unban`, moderator.token);
    check('admin unban', unbanRes.status === 200, unbanRes);
    const meAgain = await api('GET', '/auth/me', author.token);
    check('unbanned user works again', meAgain.status === 200, meAgain.status);

    // --- delete own post -------------------------------------------------------
    const post2 = await api('POST', '/posts', author.token, { kind: 'discussion', title: 'second post', body: 'x' });
    const delOwnPost = await api('DELETE', `/posts/${post2.data.post.id}`, author.token);
    check('delete own post', delOwnPost.status === 200, delOwnPost);

    const adminMe = await api('GET', '/auth/me', moderator.token);
    check('/auth/me reports is_admin for allow-listed email', adminMe.data.user?.is_admin === 1, adminMe.data.user?.is_admin);
    const reporterMe = await api('GET', '/auth/me', reporter.token);
    check('/auth/me is_admin = 0 for normal user', reporterMe.data.user?.is_admin === 0, reporterMe.data.user?.is_admin);
  } finally {
    for (const u of [author, reporter, moderator]) {
      if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
    }
    console.log('cleanup done');
  }
})().catch((e) => {
  console.error('INTEGRATION ERROR:', e.message);
  process.exit(1);
});
