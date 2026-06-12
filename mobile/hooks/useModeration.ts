import { useCallback } from 'react';
import { api } from '@/lib/api';
import type { ToastFn } from '@/components/ui/Toast';

// Report / block actions behind the moderation entry points (post menus,
// comment rows, user profiles). Server enforcement lives in
// server/routes/moderation.js; this hook only wires calls + toasts.
export type ReportTargetType = 'post' | 'comment' | 'user';

export const REPORT_REASONS = [
  { v: 'spam', label: 'Spam' },
  { v: 'harassment', label: 'Harassment or bullying' },
  { v: 'inappropriate', label: 'Inappropriate content' },
  { v: 'misinformation', label: 'Dangerous misinformation' },
  { v: 'other', label: 'Something else' },
];

export function useModeration(toast: ToastFn | null | undefined) {
  const report = useCallback(
    async (targetType: ReportTargetType, targetId: string, reason: string, details: string) => {
      try {
        await api.post('/moderation/reports', {
          target_type: targetType,
          target_id: targetId,
          reason,
          details: details || undefined,
        });
        toast?.('Report received. We review reports within 24 hours.', 'success');
        return true;
      } catch (err: any) {
        toast?.(err.message || 'Failed to send report', 'error');
        return false;
      }
    },
    [toast],
  );

  const block = useCallback(
    async (userId: string, username?: string) => {
      try {
        await api.post(`/moderation/blocks/${encodeURIComponent(userId)}`);
        toast?.(`Blocked ${username ? `@${username}` : 'user'}. You won't see each other's content.`, 'success');
        return true;
      } catch (err: any) {
        toast?.(err.message || 'Failed to block user', 'error');
        return false;
      }
    },
    [toast],
  );

  const unblock = useCallback(
    async (userId: string, username?: string) => {
      try {
        await api.del(`/moderation/blocks/${encodeURIComponent(userId)}`);
        toast?.(`Unblocked ${username ? `@${username}` : 'user'}.`, 'success');
        return true;
      } catch (err: any) {
        toast?.(err.message || 'Failed to unblock user', 'error');
        return false;
      }
    },
    [toast],
  );

  const loadBlocked = useCallback(async (): Promise<{ id: string; username: string; created_at: string }[]> => {
    try {
      const data = await api.get('/moderation/blocks');
      return data.blocked || [];
    } catch (err: any) {
      toast?.(err.message || 'Failed to load blocked users', 'error');
      return [];
    }
  }, [toast]);

  return { report, block, unblock, loadBlocked };
}
