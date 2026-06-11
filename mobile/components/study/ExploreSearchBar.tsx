// Port of src/components/study/ExploreSearchBar.jsx — the natural-language
// entry point for Explore. Parsing is local (lib/queryParser). The web's
// absolutely-positioned dropdown becomes an inline block so it isn't clipped
// by the surrounding ScrollView.
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { describeConfig, parseQuery } from '@/lib/queryParser';
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
} from '@/lib/researchTheme';

export default function ExploreSearchBar({ onSelect }: { onSelect: (config: any) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [interpreted, setInterpreted] = useState('');

  const result = useMemo(() => parseQuery(query), [query]);

  function choose(config: any, interpretation: string) {
    if (!config) return;
    setInterpreted(interpretation);
    setFocused(false);
    onSelect(config);
  }

  function chooseTop() {
    if (result.config) {
      choose(result.config, result.interpretation);
    } else if (result.suggestions[0]) {
      choose(result.suggestions[0].config, describeConfig(result.suggestions[0].config));
    }
  }

  function clear() {
    setQuery('');
    setInterpreted('');
    setFocused(false);
  }

  const showDropdown = focused && query.trim().length > 0;
  const presetList: any[] = result.status === 'unknown' ? result.popular : result.suggestions;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 16,
          paddingHorizontal: 12,
          backgroundColor: STUDY_CARD,
          borderWidth: 1,
          borderColor: STUDY_BORDER_STRONG,
        }}>
        <Text style={{ color: STUDY_MUTED }}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={(v) => setQuery(v)}
          onFocus={() => setFocused(true)}
          onSubmitEditing={chooseTop}
          returnKeyType="search"
          placeholder="Ask a question, e.g. 'does protein matter for gains?'"
          placeholderTextColor={STUDY_MUTED}
          style={{ flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: STUDY_TEXT }}
        />
        {query ? (
          <Pressable onPress={clear} hitSlop={8} accessibilityLabel="Clear search">
            <Text style={{ fontSize: 16, color: STUDY_MUTED }}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {interpreted && !showDropdown ? (
        <Text style={{ marginTop: 8, paddingHorizontal: 4, fontSize: 12, color: STUDY_MUTED }}>
          Interpreted as: <Text style={{ color: STUDY_ACCENT }}>{interpreted}</Text> — edit below to refine.
        </Text>
      ) : null}

      {showDropdown && (
        <View
          style={{
            marginTop: 8,
            overflow: 'hidden',
            borderRadius: 16,
            backgroundColor: STUDY_CARD,
            borderWidth: 1,
            borderColor: STUDY_BORDER_STRONG,
          }}>
          {result.config && (
            <Pressable
              onPress={() => choose(result.config, result.interpretation)}
              style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: STUDY_ACCENT_FAINT, borderBottomWidth: 1, borderBottomColor: STUDY_BORDER }}>
              <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_ACCENT }}>
                {result.status === 'confident' ? 'Run this' : 'Closest match'}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 14, color: STUDY_TEXT }}>{result.interpretation}</Text>
            </Pressable>
          )}

          {result.status === 'unknown' && (
            <Text style={{ paddingHorizontal: 16, paddingTop: 12, fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
              Couldn&apos;t turn that into a query — try one of these:
            </Text>
          )}

          {presetList.length > 0 && (
            <View>
              {result.config && result.suggestions.length > 0 && (
                <Text style={{ paddingHorizontal: 16, paddingTop: 12, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>
                  Or try
                </Text>
              )}
              {presetList.map((preset: any) => (
                <Pressable
                  key={preset.id}
                  onPress={() => choose(preset.config, describeConfig(preset.config))}
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: STUDY_BORDER }}>
                  <Text style={{ fontSize: 14, color: STUDY_TEXT }}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
