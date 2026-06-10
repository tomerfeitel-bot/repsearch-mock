import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Port of src/components/ui/Toast.jsx. Same provider/callback API — callers do
// `const toast = useToast(); toast('Saved', 'success')` exactly like the web —
// but rendered as a root-level absolutely-positioned view instead of a DOM
// portal with `fixed`.
type ToastType = 'info' | 'success' | 'error';
type ToastFn = (message: string, type?: ToastType) => void;

type ToastItem = { id: number; message: string; type: ToastType };

const ToastContext = createContext<ToastFn>(() => {});

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(20, 60, 38, 0.95)', border: '#2f6e4a', text: '#d7eadf' },
  error: { bg: '#9b463d', border: '#b06a63', text: '#ffffff' },
  info: { bg: 'rgba(30, 34, 31, 0.95)', border: '#4a514b', text: '#f3f5f1' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const toast = useCallback<ToastFn>((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 0,
          right: 0,
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          zIndex: 100,
        }}>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type];
          return (
            <Animated.View
              key={t.id}
              entering={FadeInUp.duration(200)}
              exiting={FadeOutUp.duration(150)}
              style={{
                backgroundColor: s.bg,
                borderColor: s.border,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                maxWidth: 384,
                width: '100%',
              }}>
              <Text style={{ color: s.text, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                {t.message}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
