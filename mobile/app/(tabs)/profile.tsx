import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import DailyLogHub, { Toggle } from '@/components/profile/DailyLogHub';
import ProfileSummary from '@/components/profile/ProfileSummary';
import { BlockedUsersSheet } from '@/components/community/ModerationSheets';
import PlansTab from '@/components/community/PlansTab';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import FlatHeader, { useDirectionalCollapse } from '@/components/ui/FlatHeader';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { Sheet } from '@/components/ui/Sheet';
import { useToast, type ToastFn } from '@/components/ui/Toast';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { SPLIT_TYPES } from '@/lib/splits';
import { colors } from '@/lib/theme';

// Port of src/pages/Profile.jsx (Session 4): Profile / Plans / Check-in tabs,
// the Edit-profile sheet on the Athlete Card, and the gear (account) sheet.
const TABS = [
  { value: 'my profile', label: 'Profile' },
  { value: 'my plans', label: 'Plans' },
  { value: 'check-in', label: 'Check-in' },
];

type EditField = {
  key: string;
  label: string;
  type: 'select' | 'date' | 'number' | 'text' | 'textarea';
  options?: string[];
  visibility: 'public' | 'private';
  note?: string;
};

// Mirrors the web EDIT_GROUPS: 'public' fields appear on the Athlete Card,
// 'private' fields are research-only (per-field badge on each input).
const EDIT_GROUPS: { title: string; fields: EditField[] }[] = [
  {
    title: 'About you',
    fields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['woman', 'man', 'prefer_not_to_say'], visibility: 'public' },
      { key: 'date_of_birth', label: 'Date of birth', type: 'date', visibility: 'private', note: 'Only your age range is shown publicly.' },
      { key: 'training_started_at', label: 'Training start date', type: 'date', visibility: 'public' },
      { key: 'enhancement_status', label: 'Enhancement status', type: 'select', options: ['natural', 'enhanced', 'previously_enhanced', 'prefer_not_to_say'], visibility: 'public' },
      { key: 'experience_level', label: 'Experience level', type: 'select', options: ['beginner', 'intermediate', 'advanced'], visibility: 'public' },
      { key: 'height_cm', label: 'Height cm', type: 'number', visibility: 'private' },
      { key: 'country_region', label: 'Country / region', type: 'text', visibility: 'private' },
      { key: 'ethnic_background_json', label: 'Ethnic background JSON', type: 'text', visibility: 'private' },
    ],
  },
  {
    title: 'Training context',
    fields: [
      { key: 'split_type', label: 'Training split', type: 'select', options: SPLIT_TYPES, visibility: 'public' },
      { key: 'gym_type', label: 'Gym type', type: 'select', options: ['commercial', 'home', 'outdoor'], visibility: 'private' },
    ],
  },
  {
    title: 'Work & sport',
    fields: [
      { key: 'job_title', label: 'Job / role', type: 'text', visibility: 'private' },
      { key: 'physical_labor_level', label: 'Physical labor at work', type: 'select', options: ['sedentary', 'light', 'moderate', 'heavy'], visibility: 'private' },
      { key: 'sport_primary', label: 'Primary sport', type: 'select', options: ['running', 'cycling', 'swimming', 'team_sport', 'none'], visibility: 'public' },
      { key: 'sport_sessions_per_week', label: 'Sport sessions / week', type: 'number', visibility: 'private' },
      { key: 'race_distance', label: 'Race distance', type: 'text', visibility: 'private' },
      { key: 'vo2_max', label: 'VO2 max', type: 'number', visibility: 'private' },
      { key: 'avg_daily_steps', label: 'Average daily steps', type: 'number', visibility: 'private' },
    ],
  },
  {
    title: 'Health notes',
    fields: [{ key: 'injury_limitations', label: 'Injury limitations', type: 'textarea', visibility: 'private' }],
  },
];

export default function ProfileScreen() {
  const { user, logout, refresh, updateUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('my profile');
  const [gearOpen, setGearOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { collapse, onScroll } = useDirectionalCollapse();

  useEffect(() => {
    if (!user?.username) return;
    let cancelled = false;
    setLoadingProfile(true);
    Promise.all([api.get(`/public/users/${user.username}`), api.get('/workouts?limit=100')])
      .then(([data, workoutData]) => {
        if (!cancelled) setProfileData(withOwnStreak(data, workoutData.workouts || []));
      })
      .catch((err) => toast(err.message || 'Failed to load profile', 'error'))
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.username, toast]);

  const enriched = useMemo(
    () => (profileData ? { ...profileData, user: { ...profileData.user, ...user } } : null),
    [profileData, user],
  );

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatHeader
        title="Profile"
        titleColor={colors.emeraldInk}
        collapse={collapse}
        action={
          <Pressable
            onPress={() => setGearOpen(true)}
            accessibilityLabel="Settings"
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <IconGear size={22} color={colors.emeraldInk} />
          </Pressable>
        }
        tabs={
          <UnderlineTabs
            tabs={TABS}
            value={tab}
            onChange={setTab}
            accent={colors.emeraldInk}
            activeColor={colors.text}
            inactiveColor={colors.textMuted}
            borderColor={colors.border}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 96 }}>
        {tab === 'my profile' && (
          <ProfileSummary data={enriched} loading={loadingProfile} onEditProfile={() => setEditProfileOpen(true)} />
        )}
        {tab === 'my plans' && <PlansTab />}
        {tab === 'check-in' && <DailyLogHub user={user} updateUser={updateUser} refresh={refresh} toast={toast} />}
      </Animated.ScrollView>

      <Sheet open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit profile">
        <EditProfileMenu
          user={user}
          updateUser={updateUser}
          refresh={refresh}
          toast={toast}
          onClose={() => setEditProfileOpen(false)}
        />
      </Sheet>

      <Sheet open={gearOpen} onClose={() => setGearOpen(false)} title="Account settings">
        <GearMenu user={user} updateUser={updateUser} refresh={refresh} logout={logout} toast={toast} />
      </Sheet>
    </View>
  );
}

function EditProfileMenu({
  user,
  updateUser,
  refresh,
  toast,
  onClose,
}: {
  user: any;
  updateUser: (patch: any) => void;
  refresh: () => Promise<void>;
  toast: ToastFn;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => normalizeUser(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(normalizeUser(user)), [user]);

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const payload: Record<string, any> = { bio: cleanValue(form.bio, 'textarea') || '' };
      for (const group of EDIT_GROUPS) {
        for (const field of group.fields) payload[field.key] = cleanValue(form[field.key], field.type);
      }
      const data = await api.patch('/profile', payload);
      updateUser(data.user);
      await refresh();
      toast('Profile updated', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <FormBlock title="Bio" first>
        <Field
          label="Bio"
          type="textarea"
          visibility="public"
          value={form.bio}
          onChange={(v) => setField('bio', v)}
        />
      </FormBlock>

      {EDIT_GROUPS.map((group) => (
        <FormBlock key={group.title} title={group.title}>
          <View style={{ gap: 12 }}>
            {group.fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                type={field.type}
                options={field.options}
                visibility={field.visibility}
                note={field.note}
                value={form[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </View>
        </FormBlock>
      ))}

      <Pressable
        disabled={saving}
        onPress={saveProfile}
        style={{
          minHeight: 48,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.emerald,
          opacity: saving ? 0.6 : 1,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>
          {saving ? 'Saving...' : 'Save profile'}
        </Text>
      </Pressable>
    </View>
  );
}

function GearMenu({
  user,
  updateUser,
  refresh,
  logout,
  toast,
}: {
  user: any;
  updateUser: (patch: any) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  toast: ToastFn;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => normalizeUser(user));
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  useEffect(() => setForm(normalizeUser(user)), [user]);

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const payload = {
        preferred_units: form.preferred_units,
        is_private: form.is_private ? 1 : 0,
      };
      const data = await api.patch('/profile', payload);
      updateUser(data.user);
      await refresh();
      toast('Settings saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  // The web asks for a password here, but since the Supabase migration the
  // server deletes the account without verifying one — a typed confirm sheet
  // is the honest native equivalent.
  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.del('/profile');
      toast('Account deleted', 'success');
      await logout();
    } catch (err: any) {
      toast(err.message || 'Failed to delete account', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <FormBlock title="Account" first>
        <ReadOnly label="Email" value={user.email} />
        <ReadOnly label="Username" value={user.username} last />
        <Pressable
          onPress={() => {
            logout().catch(() => toast('Logout failed', 'error'));
          }}
          style={{
            marginTop: 16,
            alignSelf: 'flex-start',
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Sign out</Text>
        </Pressable>
      </FormBlock>

      <FormBlock title="Preferences">
        <Text style={LABEL_STYLE}>Units</Text>
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            gap: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            padding: 4,
          }}>
          {['kg', 'lbs'].map((o) => {
            const active = form.preferred_units === o;
            return (
              <Pressable
                key={o}
                onPress={() => setField('preferred_units', o)}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? colors.emerald : 'transparent',
                }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.onEmerald : colors.textMuted }}>
                  {o}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            marginTop: 12,
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Text style={{ fontSize: 14, color: colors.text }}>Private profile</Text>
          <Toggle value={!!form.is_private} onPress={() => setField('is_private', !form.is_private)} />
        </View>
        <Pressable
          disabled={saving}
          onPress={saveProfile}
          style={{
            marginTop: 16,
            minHeight: 48,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.emerald,
            opacity: saving ? 0.6 : 1,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>
            {saving ? 'Saving...' : 'Save changes'}
          </Text>
        </Pressable>
      </FormBlock>

      <FormBlock title="Community">
        <Pressable
          onPress={() => setBlockedOpen(true)}
          style={{
            alignSelf: 'flex-start',
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Blocked users</Text>
        </Pressable>
      </FormBlock>

      <FormBlock title="Danger zone">
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMuted }}>
          Deleting your account removes your workouts, comments, PRs, templates, and research rows.
        </Text>
        <Pressable
          onPress={() => setDeleteOpen(true)}
          style={{
            marginTop: 16,
            alignSelf: 'flex-start',
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.negative,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fca5a5' }}>Delete account</Text>
        </Pressable>
      </FormBlock>

      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          if (!deleting) deleteAccount();
        }}
        title="Delete account?"
        message="This permanently removes your account, workouts, comments, PRs, templates, and research rows. This cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        danger
      />
      <BlockedUsersSheet open={blockedOpen} onClose={() => setBlockedOpen(false)} />
    </View>
  );
}

function FormBlock({ title, first = false, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <View style={first ? undefined : { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function ReadOnly({ label, value, last = false }: { label: string; value?: string; last?: boolean }) {
  return (
    <View
      style={{
        minHeight: 44,
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}>
      <Text style={LABEL_STYLE}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 14, color: colors.text }}>{value || '-'}</Text>
    </View>
  );
}

function VisibilityBadge({ visibility }: { visibility: 'public' | 'private' }) {
  const isPublic = visibility === 'public';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: isPublic ? colors.emerald : colors.surfaceAlt,
      }}>
      {isPublic ? (
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <Path
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            stroke={colors.onEmerald}
            strokeWidth={1.8}
          />
          <Path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke={colors.onEmerald} strokeWidth={1.8} />
        </Svg>
      ) : (
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <Path
            d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            stroke={colors.textMuted}
            strokeWidth={1.8}
          />
        </Svg>
      )}
      <Text style={{ fontSize: 10, fontWeight: '700', color: isPublic ? colors.onEmerald : colors.textMuted }}>
        {isPublic ? 'Public' : 'Private'}
      </Text>
    </View>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  options,
  visibility,
  note,
}: {
  label: string;
  type?: EditField['type'];
  value: any;
  onChange: (v: any) => void;
  options?: string[];
  visibility?: 'public' | 'private';
  note?: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={LABEL_STYLE}>{label}</Text>
        {visibility ? <VisibilityBadge visibility={visibility} /> : null}
      </View>
      {note ? <Text style={{ marginTop: 2, fontSize: 11, color: colors.inkSoft }}>{note}</Text> : null}
      {type === 'select' ? (
        <SelectField label={label} value={value} onChange={onChange} options={options || []} />
      ) : type === 'date' ? (
        <DateField value={value} onChange={onChange} />
      ) : (
        <TextInput
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          multiline={type === 'textarea'}
          keyboardType={type === 'number' ? 'decimal-pad' : 'default'}
          style={[
            FIELD_INPUT,
            type === 'textarea' ? { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' as const } : null,
          ]}
        />
      )}
    </View>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[FIELD_INPUT, { justifyContent: 'center' }]}>
        <Text style={{ fontSize: 14, color: value ? colors.text : colors.inkSoft }}>
          {value ? human(String(value)) : 'Prefer not to say'}
        </Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={value ?? ''}
        options={options.map((o) => ({ value: o, label: human(o) }))}
        onSelect={(v) => onChange(v)}
        onClear={() => onChange('')}
        clearLabel="Prefer not to say"
      />
    </>
  );
}

// Web <input type=date>; values travel as YYYY-MM-DD strings.
function DateField({ value, onChange }: { value: any; onChange: (v: string) => void }) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const dateValue = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : new Date();

  if (Platform.OS === 'android') {
    return (
      <>
        <Pressable onPress={() => setShowAndroidPicker(true)} style={[FIELD_INPUT, { justifyContent: 'center' }]}>
          <Text style={{ fontSize: 14, color: value ? colors.text : colors.inkSoft }}>
            {value ? String(value).slice(0, 10) : 'Not set'}
          </Text>
        </Pressable>
        {showAndroidPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            onChange={(_e, d) => {
              setShowAndroidPicker(false);
              if (d) onChange(d.toISOString().slice(0, 10));
            }}
          />
        )}
      </>
    );
  }
  return (
    <View style={{ marginTop: 4, alignItems: 'flex-start' }}>
      <DateTimePicker
        value={dateValue}
        mode="date"
        display="compact"
        themeVariant="dark"
        onChange={(_e, d) => {
          if (d) onChange(d.toISOString().slice(0, 10));
        }}
      />
    </View>
  );
}

function normalizeUser(user: any) {
  const out: Record<string, any> = { ...user };
  for (const key of ['split_days_json', 'supplements_json', 'ethnic_background_json']) {
    if (typeof out[key] === 'string') {
      try {
        out[key] = JSON.stringify(JSON.parse(out[key]));
      } catch {
        /* keep source text */
      }
    }
  }
  out.is_private = !!Number(out.is_private);
  out.research_opt_in = !!Number(out.research_opt_in);
  return out;
}

function cleanValue(value: any, type: string) {
  if (type === 'number') return value === '' || value === null || value === undefined ? null : Number(value);
  if (value === '') return null;
  return value;
}

function human(value: string) {
  return String(value).replaceAll('_', ' ');
}

function withOwnStreak(data: any, workouts: any[]) {
  const dates = new Set((workouts || []).map((w) => w.date).filter(Boolean));
  let current_streak = 0;
  const d = new Date();
  while (dates.has(d.toISOString().slice(0, 10))) {
    current_streak += 1;
    d.setDate(d.getDate() - 1);
    if (current_streak > 365) break;
  }
  return {
    ...data,
    stats: { ...(data.stats || {}), current_streak },
  };
}

function IconGear({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: '600' as const,
  color: colors.textMuted,
};

const FIELD_INPUT = {
  marginTop: 4,
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text,
};
