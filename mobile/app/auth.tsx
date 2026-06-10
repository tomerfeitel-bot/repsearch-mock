import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/lib/theme';

// Port of src/pages/Auth.jsx. Validation rules and copy are identical; inputs
// become TextInputs and the form submits from the button instead of onSubmit.
export default function AuthScreen() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!email || !password) return 'Email and password are required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email';
    if (mode === 'register' && !username.trim()) return 'Username is required';
    if (mode === 'register' && !/^[a-zA-Z0-9_]{3,24}$/.test(username))
      return 'Username must be 3–24 letters, digits, or underscores';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  }

  async function handleSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const u = mode === 'login' ? await login(email, password) : await register(email, username, password);
      router.replace(u.onboarded ? '/community' : '/onboarding');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%' as const,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    fontSize: 15,
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 384, alignSelf: 'center', gap: 32 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  stroke={colors.accentInk}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text }}>RepSearch</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Real data from real lifters.</Text>
          </View>

          <View style={{ gap: 12 }}>
            <TextInput
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              placeholder="Email"
              placeholderTextColor={colors.inkSoft}
              value={email}
              onChangeText={setEmail}
              style={inputStyle}
            />
            {mode === 'register' && (
              <TextInput
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                placeholder="Username"
                placeholderTextColor={colors.inkSoft}
                value={username}
                onChangeText={setUsername}
                style={inputStyle}
              />
            )}
            <TextInput
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Password"
              placeholderTextColor={colors.inkSoft}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
              style={inputStyle}
            />

            {error ? <Text style={{ color: '#c98f88', fontSize: 14, paddingLeft: 4 }}>{error}</Text> : null}

            <Pressable
              disabled={loading}
              onPress={handleSubmit}
              style={{
                width: '100%',
                backgroundColor: colors.accent,
                opacity: loading ? 0.5 : 1,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
              }}>
              {loading ? (
                <Spinner />
              ) : (
                <Text style={{ color: colors.accentInk, fontWeight: '600', fontSize: 15 }}>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Pressable
              onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}>
              <Text style={{ color: '#e8c074', fontSize: 14, fontWeight: '500' }}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
