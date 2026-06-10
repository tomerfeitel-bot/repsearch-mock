import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AvatarWithDot,
  HeroFrame,
  IconComment,
  IconShare,
  KIND_META,
  SaveButton,
  sharePost,
  StudyAttachment,
  VotePill,
} from '@/components/community/PostCard';
import { ProgramDetailSheet, StartProgramSheet } from '@/components/community/PlansTab';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { usePosts } from '@/hooks/usePosts';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { labelStyle } from '@/lib/bubbleColors';
import { muscleColor } from '@/lib/musclePalette';
import { colors, monoFont } from '@/lib/theme';
import { timeAgo } from '@/lib/timeAgo';

// Port of src/pages/PostDetail.jsx — the full thread: post lead, attachment
// detail, nested comment tree, and a sticky reply composer pinned above the
// keyboard via KeyboardAvoidingView.
const exerciseById = new Map(SEED_EXERCISES.map((e: any) => [e.id, e]));

const KIND_PROMPT: Record<string, string> = {
  discussion: 'Add your take, ask for details, or reply to the strongest branch.',
  workout: 'Ask about exercise choices, set progression, recovery, or how the session felt.',
  program: 'Ask how they ran it, what changed week to week, or where it worked best.',
  template: 'Ask how to adapt it, when to use it, or what substitutions fit.',
  study: 'Challenge the method, share a data point, or ask what variable should be checked next.',
  pr: 'Ask how they built up to it: programming, technique, recovery, and what finally clicked.',
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { getPost, votePost, voteComment, setSaved, addComment } = usePosts(toast);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPost(id);
      setPost(data.post);
      setComments(data.comments || []);
    } catch (err: any) {
      toast?.(err.message || 'Could not load post', 'error');
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id, getPost, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function onVote(value: number) {
    const res = await votePost(post.id, value);
    if (res) setPost((p: any) => ({ ...p, score: res.score, viewer_vote: res.viewer_vote }));
  }

  async function onToggleSave() {
    const next = await setSaved(post.id, !post.saved);
    setPost((p: any) => ({ ...p, saved: next }));
  }

  async function submitComment(body: string, parentId: string | null, done?: () => void) {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await addComment(post.id, body.trim(), parentId);
      await load();
      done?.();
    } finally {
      setPosting(false);
    }
  }

  // The standout reply: highest-scored top-level comment.
  const topReplyId = useMemo(() => {
    if (comments.length < 2) return null;
    const top = [...comments].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    return top && (top.score || 0) > 0 ? top.id : null;
  }, [comments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Loading...</Text>
      </View>
    );
  }
  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Post not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const meta = KIND_META[post.kind] || KIND_META.discussion;
  const prompt = KIND_PROMPT[post.kind] || KIND_PROMPT.discussion;
  const prTitle = post.kind === 'pr' && !post.title ? post.body : '';
  const total = post.comment_count;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* sticky top bar */}
      <View
        style={{
          paddingTop: insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
          zIndex: 20,
        }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back to feed"
          style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <IconBack size={20} color={colors.text} />
        </Pressable>
        <View style={{ minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
            {meta.label}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: monoFont, color: colors.textMuted }}>
            @{post.username}
          </Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Post — borderless lead */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => router.push(`/user/${post.username}`)} accessibilityLabel={`View ${post.username}`}>
              <AvatarWithDot username={post.username} dot={meta.fill} />
            </Pressable>
            <Pressable onPress={() => router.push(`/user/${post.username}`)} style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                {post.username}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: monoFont, color: colors.textMuted }}>
                {timeAgo(post.created_at)}
              </Text>
            </Pressable>
            <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: meta.fill }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: meta.on }}>{meta.label}</Text>
            </View>
          </View>

          {post.title || prTitle ? (
            <Text style={{ marginTop: 12, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.text }}>
              {post.title || prTitle}
            </Text>
          ) : null}
          {post.body && !prTitle ? (
            <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.text }}>{post.body}</Text>
          ) : null}

          {post.labels?.length > 0 ? (
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {post.labels.map((l: string) => {
                const s = labelStyle(l);
                return (
                  <View key={l} style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: s.backgroundColor }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: s.color }}>{l}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <AttachmentDetail post={post} />
          </View>

          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VotePill score={post.score} vote={post.viewer_vote} onVote={onVote} />
            <Pressable
              onPress={() => sharePost(post)}
              accessibilityLabel="Share post"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 }}>
              <IconShare size={18} color={colors.textMuted} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Share</Text>
            </Pressable>
            <SaveButton saved={!!post.saved} onPress={onToggleSave} />
          </View>
        </View>

        {/* Conversation lead-in */}
        <View
          style={{
            marginTop: 20,
            paddingHorizontal: 16,
            paddingTop: 16,
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Conversation</Text>
          <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.textMuted }}>
            {total} {total === 1 ? 'reply' : 'replies'}
          </Text>
        </View>
        <Text style={{ paddingHorizontal: 16, marginTop: 4, fontSize: 13, color: colors.textMuted }}>{prompt}</Text>

        {/* Connected comment flow */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {comments.length === 0 && (
            <View
              style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: 16,
              }}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                No replies yet. Start the thread with a question or a useful data point.
              </Text>
            </View>
          )}
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              node={c}
              depth={0}
              opUser={post.username}
              topReplyId={topReplyId}
              onVote={voteComment}
              onReply={submitComment}
              posting={posting}
            />
          ))}
        </View>
      </ScrollView>

      {/* Sticky composer — standing invitation above the home indicator */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Join the conversation..."
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            minWidth: 0,
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderColor: colors.border,
            fontSize: 14,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={() => submitComment(reply, null, () => setReply(''))}
          disabled={posting || !reply.trim()}
          style={{
            height: 44,
            paddingHorizontal: 20,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: posting || !reply.trim() ? 0.5 : 1,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentInk }}>Comment</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentNode({
  node,
  depth,
  opUser,
  topReplyId,
  onVote,
  onReply,
  posting,
}: {
  node: any;
  depth: number;
  opUser: string;
  topReplyId: string | null;
  onVote: (id: string, value: number) => Promise<any>;
  onReply: (body: string, parentId: string | null, done?: () => void) => void;
  posting: boolean;
}) {
  const router = useRouter();
  const [score, setScore] = useState(node.score);
  const [vote, setVote] = useState(node.viewer_vote);
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState('');

  async function doVote(value: number) {
    const res = await onVote(node.id, value);
    if (res) {
      setScore(res.score);
      setVote(res.viewer_vote);
    }
  }

  const childCount = countReplies(node);
  const kids = node.children || [];
  const isOp = node.username === opUser;
  const isTop = node.id === topReplyId;

  return (
    <View style={{ paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 8 }}>
        <Pressable onPress={() => router.push(`/user/${node.username}`)} accessibilityLabel={`View ${node.username}`} style={{ marginTop: 2 }}>
          <Avatar username={node.username} size="sm" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => router.push(`/user/${node.username}`)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{node.username}</Text>
            </Pressable>
            {isOp && (
              <View style={{ borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.emerald }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onEmerald }}>OP</Text>
              </View>
            )}
            {isTop && (
              <View style={{ borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.brassSoft }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brass }}>Top reply</Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: colors.textMuted }}>· {timeAgo(node.created_at)}</Text>
          </View>
          <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.text }}>{node.body}</Text>

          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <VotePill score={score} vote={vote} onVote={doVote} size="sm" />
            <Pressable
              onPress={() => setReplying((r) => !r)}
              style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconComment size={15} color={colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Reply</Text>
            </Pressable>
            {childCount > 0 && (
              <Pressable onPress={() => setCollapsed((c) => !c)} style={{ height: 32, paddingHorizontal: 12, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                  {collapsed ? `Show ${childCount} ${childCount === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
                </Text>
              </Pressable>
            )}
          </View>

          {replying && (
            <View style={{ marginTop: 8, borderRadius: 16, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <TextInput
                autoFocus
                multiline
                value={text}
                onChangeText={setText}
                placeholder={`Reply to ${node.username}...`}
                placeholderTextColor={colors.textMuted}
                style={{ minHeight: 48, fontSize: 14, color: colors.text, textAlignVertical: 'top' }}
              />
              <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <Pressable
                  onPress={() => {
                    setReplying(false);
                    setText('');
                  }}
                  style={{ height: 36, paddingHorizontal: 12, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onReply(text, node.id, () => {
                      setText('');
                      setReplying(false);
                      setCollapsed(false);
                    })
                  }
                  disabled={posting || !text.trim()}
                  style={{
                    height: 36,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    justifyContent: 'center',
                    backgroundColor: colors.accent,
                    opacity: posting || !text.trim() ? 0.5 : 1,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentInk }}>Reply</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!collapsed && kids.length > 0 && (
            <View style={{ marginTop: 4, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border }}>
              {kids.map((child: any) => (
                <CommentNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  opUser={opUser}
                  topReplyId={topReplyId}
                  onVote={onVote}
                  onReply={onReply}
                  posting={posting}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function countReplies(node: any): number {
  return (node.children || []).reduce((total: number, child: any) => total + 1 + countReplies(child), 0);
}

function AttachmentDetail({ post }: { post: any }) {
  if (post.kind === 'workout') return <WorkoutAttachment id={post.attachment?.id} summary={post.attachment} />;
  if (post.kind === 'program') return <ProgramAttachment a={post.attachment} />;
  if (post.kind === 'template') return <TemplateAttachment a={post.attachment} />;
  if (post.kind === 'study') return <StudyAttachment a={post.attachment} />;
  return null;
}

function WorkoutAttachment({ id, summary }: { id?: string; summary: any }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get(`/public/workouts/${id}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of data?.sets || []) {
      if (!map.has(s.exercise_id)) map.set(s.exercise_id, []);
      map.get(s.exercise_id)!.push(s);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <HeroFrame>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
            {summary?.duration_min ?? '-'}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>min</Text>
          <Text style={{ marginLeft: 'auto', fontSize: 12, color: KIND_META.workout.ink }}>
            {summary?.workout_day || 'Workout'}
          </Text>
        </View>
        {groups.map(([eid, sets]) => {
          const seed: any = exerciseById.get(eid);
          return (
            <View key={eid} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)', padding: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: muscleColor(seed?.primary_muscle) }} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{seed?.name || eid}</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.textMuted }}>
                {sets
                  .filter((s: any) => s.set_type !== 'warmup')
                  .map((s: any) => `${s.weight_kg}x${s.reps}`)
                  .join('  ')}
              </Text>
            </View>
          );
        })}
      </View>
    </HeroFrame>
  );
}

function ProgramAttachment({ a }: { a: any }) {
  const [startOpen, setStartOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const toast = useToast();
  if (!a) return null;
  const program = {
    id: a.id,
    name: a.name,
    description: a.description,
    strictness: a.strictness,
    proof: { starts: a.enrollment_count },
  };
  return (
    <HeroFrame>
      <Text style={{ fontWeight: '700', color: colors.text }}>{a.name}</Text>
      {a.description ? (
        <Text numberOfLines={3} style={{ marginTop: 4, fontSize: 12, color: colors.textMuted }}>
          {a.description}
        </Text>
      ) : null}
      <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{a.enrollment_count || 0} started · open-ended</Text>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setStartOpen(true)}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>Start program</Text>
        </Pressable>
        <Pressable
          onPress={() => setDetailOpen(true)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>View details</Text>
        </Pressable>
      </View>
      <StartProgramSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        program={program}
        onStarted={() => {
          setStartOpen(false);
          toast?.(`Started ${a.name}`, 'success');
        }}
      />
      {detailOpen ? <ProgramDetailSheet program={program} onClose={() => setDetailOpen(false)} /> : null}
    </HeroFrame>
  );
}

function TemplateAttachment({ a }: { a: any }) {
  const toast = useToast();
  if (!a) return null;
  return (
    <HeroFrame>
      <Text style={{ fontWeight: '700', color: colors.text }}>{a.name}</Text>
      <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
        {a.exercise_count || 0} exercises · used {a.usage_count || 0}x
      </Text>
      <Pressable
        onPress={() => toast?.('Starting workouts from a template arrives in Session 3', 'info')}
        style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>Start as workout</Text>
      </Pressable>
    </HeroFrame>
  );
}

function IconBack({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={19} y1={12} x2={5} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Polyline points="12 19 5 12 12 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
