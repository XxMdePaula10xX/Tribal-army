import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { theme } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function Button({ label, onPress, disabled, variant = 'primary', style }: Props) {
  const bg =
    variant === 'danger'
      ? theme.danger
      : variant === 'secondary'
        ? theme.bgPanelAlt
        : theme.gold;
  const fg = variant === 'primary' ? theme.bg : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: { fontWeight: '700', fontSize: 15 },
});
