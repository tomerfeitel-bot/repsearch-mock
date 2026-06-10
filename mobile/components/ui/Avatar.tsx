import { Text, View } from 'react-native';

// Port of src/components/ui/Avatar.jsx. The color hash must stay identical so
// a user's avatar color matches the web app.
const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#059669', '#ea580c', '#db2777', '#0d9488', '#e11d48'];

const SIZES = {
  sm: { box: 32, text: 12 },
  md: { box: 40, text: 14 },
  lg: { box: 56, text: 16 },
  xl: { box: 80, text: 20 },
} as const;

export function Avatar({
  username,
  size = 'md',
}: {
  username?: string | null;
  size?: keyof typeof SIZES;
}) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '?';
  const color = COLORS[(username?.charCodeAt(0) || 0) % COLORS.length];
  const s = SIZES[size];
  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: s.text }}>{initials}</Text>
    </View>
  );
}
