import { Redirect } from 'expo-router';
import { ScreenSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

// Entry redirect — the root-layout guard handles later transitions; this picks
// the first screen once auth state resolves.
export default function Index() {
  const { token, user, loading } = useAuth();
  if (loading) return <ScreenSpinner />;
  if (!token) return <Redirect href="/auth" />;
  if (user && !user.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/community" />;
}
