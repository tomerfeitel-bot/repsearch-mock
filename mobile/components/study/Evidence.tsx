// Port of the Evidence surface from src/pages/Study.jsx — tracked (saved)
// questions, the two-study side-by-side comparison, and discovered findings.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_COMPARE_A,
  STUDY_COMPARE_B,
  STUDY_MUTED,
  STUDY_TEXT,
} from '@/lib/researchTheme';
import { savedStudyFacts, savedStudyRecipe } from '@/lib/studyState';
import { monoFont } from '@/lib/theme';
import { FindingPoster } from './ForYou';
import { EmptyText, EvidenceBadge, MiniMetric, SectionTitle, SkeletonRows } from './studyUi';

export default function Evidence({
  savedQuestions,
  savedLoading,
  findings,
  onOpenSaved,
  onDeleteSaved,
  onOpenFinding,
}: {
  savedQuestions: any[];
  savedLoading: boolean;
  findings: any[];
  onOpenSaved: (question: any) => void;
  onDeleteSaved: (id: string) => void;
  onOpenFinding: (finding: any) => void;
}) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const selectedStudies = compareIds.map((id) => savedQuestions.find((question) => question.id === id)).filter(Boolean);

  function toggleCompare(id: string) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((item) => item !== id);
      if (ids.length >= 2) return [ids[1], id];
      return [...ids, id];
    });
  }

  return (
    <View style={{ gap: 24 }}>
      <SectionTitle title="Evidence" body="Saved scans and discovered findings stay tied to the real v2 research query JSON." />
      <View style={{ gap: 12 }}>
        <SectionTitle
          title="Compare saved studies"
          body="Select two saved studies to compare their scope, variables, population, and evidence side by side."
        />
        {selectedStudies.length < 2 ? (
          <EmptyText>
            {selectedStudies.length === 0 ? 'Pick two tracked questions below.' : 'Pick one more tracked question.'}
          </EmptyText>
        ) : (
          <SavedStudyComparison studies={selectedStudies} onOpenSaved={onOpenSaved} />
        )}
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Tracked questions" />
        {savedLoading && <SkeletonRows />}
        {!savedLoading && savedQuestions.length === 0 && <EmptyText>No saved questions yet.</EmptyText>}
        {savedQuestions.map((question) => (
          <View key={question.id} style={{ borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
            <Pressable onPress={() => onOpenSaved(question)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19, color: STUDY_TEXT }}>{question.label}</Text>
                <EvidenceBadge status={question.evidenceStatus} />
              </View>
              <Text style={{ marginTop: 8, fontSize: 12, fontFamily: monoFont, color: STUDY_MUTED }}>
                n={question.qualifiedUsers} / matched {question.matchedUsers}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>{savedStudyRecipe(question)}</Text>
            </Pressable>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Pressable
                onPress={() => toggleCompare(question.id)}
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: compareIds.includes(question.id) ? STUDY_ACCENT_FAINT : STUDY_BG,
                  borderWidth: 1,
                  borderColor: compareIds.includes(question.id) ? STUDY_ACCENT : STUDY_BORDER,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>
                  {compareIds.includes(question.id) ? 'Selected to compare' : 'Compare'}
                </Text>
              </Pressable>
              <Pressable onPress={() => onDeleteSaved(question.id)} hitSlop={8}>
                <Text style={{ fontSize: 12, color: STUDY_MUTED }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle title="Discovered findings" />
        {!findings.length && <EmptyText>No findings yet.</EmptyText>}
        {findings.length > 0 && (
          <View style={{ marginHorizontal: -16, borderTopWidth: 1, borderTopColor: STUDY_BORDER }}>
            {findings.map((finding) => (
              <FindingPoster key={finding.id} finding={finding} onPress={() => onOpenFinding(finding)} />
            ))}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Contribution title="Safe queries" value="Whitelist" body="Fields, axes, measures, and operators are validated server-side." />
        <Contribution title="Privacy" value="Opt-in" body="Only opted-in users contribute to aggregate evidence." />
      </View>
    </View>
  );
}

function SavedStudyComparison({ studies, onOpenSaved }: { studies: any[]; onOpenSaved: (study: any) => void }) {
  return (
    <View style={{ gap: 12, borderRadius: 16, padding: 12, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {studies.map((study, index) => (
          <View
            key={study.id}
            style={{
              flex: 1,
              borderRadius: 12,
              padding: 12,
              backgroundColor: STUDY_BG,
              borderWidth: 1,
              borderColor: index === 0 ? STUDY_COMPARE_A : STUDY_COMPARE_B,
            }}>
            <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>
              Study {index + 1}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', lineHeight: 16, color: STUDY_TEXT }}>{study.label}</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              <MiniMetric label="Evidence" value={study.evidenceStatus || 'Not enough'} />
              <MiniMetric label="Matched" value={`n=${study.matchedUsers || study.qualifiedUsers || 0}`} />
            </View>
            <Pressable
              onPress={() => onOpenSaved(study)}
              style={{
                marginTop: 12,
                borderRadius: 12,
                paddingVertical: 8,
                alignItems: 'center',
                backgroundColor: STUDY_CARD,
                borderWidth: 1,
                borderColor: STUDY_BORDER_STRONG,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>Open</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {studies.map((study) => (
          <View key={`${study.id}-recipe`} style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
            {savedStudyFacts(study).map((fact, i) => (
              <View key={fact.label} style={{ paddingVertical: 8, borderBottomWidth: i === 3 ? 0 : 1, borderBottomColor: STUDY_BORDER }}>
                <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>{fact.label}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', lineHeight: 16, color: STUDY_TEXT }}>{fact.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
        This compares the saved study recipes and evidence snapshots. Rerunning both as a single statistical contrast can be added later without turning the Builder back into a cohort tool.
      </Text>
    </View>
  );
}

function Contribution({ title, value, body }: { title: string; value: string; body: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <Text style={{ fontSize: 12, color: STUDY_MUTED }}>{title}</Text>
      <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: STUDY_TEXT }}>{value}</Text>
      <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>{body}</Text>
    </View>
  );
}
