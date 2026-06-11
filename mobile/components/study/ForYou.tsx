// Port of the For You surface from src/pages/Study.jsx — the editorial poster
// wall: one loud hero finding, the answer stream, then the featured-question
// prompt list. TrendMotif stays plain Views (the web version is divs, not
// Recharts), so this whole tab works in Expo Go too.
import { Pressable, Text, View } from 'react-native';
import {
  STUDY_ACCENT,
  STUDY_BORDER,
  STUDY_DIM,
  STUDY_MUTED,
  STUDY_TEXT,
  type StudyTopic,
  prettyGroupBy,
  prettyMeasure,
  studyTopicForQuery,
} from '@/lib/researchTheme';
import { timeAgo } from '@/lib/timeAgo';
import { monoFont } from '@/lib/theme';
import { EmptyText, EvidenceBadge, SkeletonRows } from './studyUi';

export default function ForYou({
  questions,
  findings,
  findingsLoading,
  onFeatured,
  onFinding,
}: {
  questions: any[];
  findings: any[];
  findingsLoading: boolean;
  onFeatured: (question: any) => void;
  onFinding: (finding: any) => void;
}) {
  const ranked = [...findings].sort((a, b) => (b.strength || 0) - (a.strength || 0));
  const hero = ranked[0];
  const rest = ranked.slice(1);

  return (
    <View style={{ gap: 36 }}>
      {findingsLoading && <SkeletonRows />}
      {!findingsLoading && hero && <FindingHero finding={hero} onOpen={onFinding} />}

      {!findingsLoading && rest.length > 0 && (
        <View>
          <PosterSectionHead
            title="More findings"
            body="Relationships surfaced from qualified, opted-in training logs. Tap one to rebuild it in the builder."
          />
          <View style={{ marginHorizontal: -16, marginTop: 12, borderTopWidth: 1, borderTopColor: STUDY_BORDER }}>
            {rest.map((finding) => (
              <FindingPoster key={finding.id} finding={finding} onPress={() => onFinding(finding)} />
            ))}
          </View>
        </View>
      )}

      {!findingsLoading && !findings.length && (
        <EmptyText>
          No findings discovered yet. Opt in and keep logging — relationships surface here as qualified data accumulates.
        </EmptyText>
      )}

      <View>
        <PosterSectionHead
          title="Start a question"
          body="Vetted starting points. Pick one to run it, then narrow the population in the builder."
        />
        <FeaturedDeck questions={questions} onOpen={onFeatured} />
      </View>
    </View>
  );
}

function PosterSectionHead({ title, body }: { title: string; body?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', lineHeight: 25, color: STUDY_TEXT }}>{title}</Text>
      {body ? <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 21, color: STUDY_MUTED }}>{body}</Text> : null}
    </View>
  );
}

// Solid topic chip — solid fill + contrasting ink (de-bubble color law).
function TopicBadge({ topic }: { topic: StudyTopic }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: topic.fill }}>
      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: topic.on }}>
        {topic.label}
      </Text>
    </View>
  );
}

// Deterministic ascending bar shape for a finding (stable per finding id).
function trendBars(seed: string | number, groupBy: string, count = 5) {
  let h = 2166136261;
  for (const ch of String(seed) + '|' + String(groupBy)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const bars: number[] = [];
  let level = 0.34 + (h % 16) / 100;
  for (let i = 0; i < count; i++) {
    const jitter = ((h >> (i * 4)) % 9) / 100;
    level = Math.min(1, level + 0.11 + jitter);
    bars.push(level);
  }
  return bars;
}

const RELATIONSHIP_ENDS: Record<string, [string, string]> = {
  rest_period_bucket: ['short rest', 'long rest'],
  sleep_quality_quartile: ['poor sleep', 'great sleep'],
  sleep_duration_bucket: ['less sleep', 'more sleep'],
  frequency_bucket: ['fewer days', 'more days'],
  protein_bucket: ['less protein', 'more protein'],
  rir_use: ['no RIR', 'logs RIR'],
  rir_bucket: ['near failure', 'far from failure'],
  rep_range_bucket: ['low reps', 'high reps'],
};

function relationshipEnds(groupBy: string): [string, string] {
  return RELATIONSHIP_ENDS[groupBy] || ['lower', 'higher'];
}

// The Chart Block: captioned by the finding detail, color carried by the topic
// hue. Plain Views — an honest "shape of the relationship" motif, not data.
export function TrendMotif({ finding, topic, height = 96 }: { finding: any; topic: StudyTopic; height?: number }) {
  const bars = trendBars(finding.id, finding.groupBy);
  const max = Math.max(...bars);
  const [lowEnd, highEnd] = relationshipEnds(finding.groupBy);
  return (
    <View style={{ borderRadius: 16, padding: 16, backgroundColor: 'rgba(30,34,31,0.72)', borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
        {bars.map((value, i) => {
          const top = i === bars.length - 1;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                height: `${Math.max(12, Math.round((value / max) * 100))}%`,
                backgroundColor: top ? topic.fill : topic.tint,
                borderWidth: top ? 1.5 : 0,
                borderColor: topic.color,
              }}
            />
          );
        })}
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: monoFont, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: STUDY_DIM }}>
          {lowEnd}
        </Text>
        <Text style={{ fontFamily: monoFont, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: topic.color }}>
          {highEnd}
        </Text>
      </View>
    </View>
  );
}

function findingStatus(finding: any) {
  const s = finding.strength || 0;
  return s >= 80 ? 'Strong' : s >= 50 ? 'Good' : 'Sparse';
}

// The loud lead poster — the strongest finding.
function FindingHero({ finding, onOpen }: { finding: any; onOpen: (finding: any) => void }) {
  const topic = studyTopicForQuery(finding.query_json || finding.query || {});
  return (
    <View style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 28, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TopicBadge topic={topic} />
        <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: topic.color }}>
          Strongest signal
        </Text>
        <View style={{ marginLeft: 'auto' }}>
          <EvidenceBadge status={findingStatus(finding)} />
        </View>
      </View>

      <Pressable onPress={() => onOpen(finding)} style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', lineHeight: 33, color: STUDY_TEXT }}>{finding.headline}</Text>
      </Pressable>

      <Pressable onPress={() => onOpen(finding)} style={{ marginTop: 16 }}>
        <TrendMotif finding={finding} topic={topic} height={140} />
      </Pressable>

      <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 23, color: STUDY_MUTED }}>{finding.detail}</Text>

      <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 8 }}>
        <Pressable
          onPress={() => onOpen(finding)}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#0B7A43',
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Open in builder</Text>
        </Pressable>
        <Text style={{ fontFamily: monoFont, fontSize: 11, color: STUDY_DIM }}>
          {prettyMeasure(finding.measure)} · signal {finding.strength || 0}/100
        </Text>
      </View>
    </View>
  );
}

// One finding in the answer stream — a full-bleed feed item.
export function FindingPoster({ finding, onPress }: { finding: any; onPress: () => void }) {
  const topic = studyTopicForQuery(finding.query_json || finding.query || {});
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TopicBadge topic={topic} />
        {finding.discovered_at ? (
          <Text style={{ fontFamily: monoFont, fontSize: 11, color: STUDY_DIM }}>{timeAgo(finding.discovered_at)}</Text>
        ) : null}
        <View style={{ marginLeft: 'auto' }}>
          <EvidenceBadge status={findingStatus(finding)} />
        </View>
      </View>

      <Pressable onPress={onPress} style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', lineHeight: 23, color: STUDY_TEXT }}>
          {finding.headline || finding.title || 'Discovered relationship'}
        </Text>
      </Pressable>

      <Pressable onPress={onPress} style={{ marginTop: 12 }}>
        <TrendMotif finding={finding} topic={topic} height={84} />
      </Pressable>

      {finding.detail ? (
        <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 23, color: STUDY_MUTED }}>{finding.detail}</Text>
      ) : null}

      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: monoFont, fontSize: 11, color: topic.color }}>{prettyMeasure(finding.measure)}</Text>
        <Text style={{ fontFamily: monoFont, fontSize: 11, color: STUDY_DIM }}>·</Text>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: monoFont, fontSize: 11, color: STUDY_DIM }}>
          by {prettyGroupBy(finding.groupBy).toLowerCase()}
        </Text>
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: STUDY_ACCENT }}>Open →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Featured questions are prompts, not answers — a de-bubbled list-row stream
// with a solid topic glyph and a clear go-affordance. No chart.
function FeaturedDeck({ questions, onOpen }: { questions: any[]; onOpen: (question: any) => void }) {
  if (!questions.length) return <EmptyText>No featured questions available right now.</EmptyText>;
  return (
    <View style={{ marginHorizontal: -16, marginTop: 12, borderTopWidth: 1, borderTopColor: STUDY_BORDER }}>
      {questions.map((question) => {
        const topic = studyTopicForQuery(question.query, question.type);
        return (
          <Pressable
            key={question.id}
            onPress={() => onOpen(question)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: STUDY_BORDER,
              backgroundColor: pressed ? 'rgba(255,255,255,0.03)' : 'transparent',
            })}>
            <View
              style={{
                height: 48,
                width: 48,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: topic.fill,
              }}>
              <Text style={{ fontFamily: monoFont, fontSize: 14, fontWeight: '700', color: topic.on }}>{topic.symbol}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', lineHeight: 21, color: STUDY_TEXT }}>{question.title}</Text>
              <Text style={{ marginTop: 2, fontSize: 14, lineHeight: 19, color: STUDY_MUTED }}>{question.subtitle}</Text>
            </View>
            <Text style={{ flexShrink: 0, fontSize: 20, fontWeight: '700', color: topic.color }}>→</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
