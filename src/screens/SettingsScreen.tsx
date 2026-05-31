import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import type { Difficulty } from '@/constants/game';
import { useGame } from '@/state/store';
import { clearHistory, clearSave } from '@/storage/persistence';

const COUNTS = [2, 3, 4, 5, 6];
const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'facil', label: 'Fácil' },
  { id: 'medio', label: 'Médio' },
  { id: 'dificil', label: 'Difícil' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const goToMenu = useGame((s) => s.goToMenu);
  const config = useGame((s) => s.config);
  const setConfig = useGame((s) => s.setConfig);
  const [cleared, setCleared] = useState(false);

  const resetData = async () => {
    await Promise.all([clearSave(), clearHistory()]);
    setCleared(true);
    Alert.alert('Dados apagados', 'Save e histórico foram removidos.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>

      <Text style={styles.label}>Dificuldade padrão das IAs</Text>
      <View style={styles.row}>
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d.id}
            label={d.label}
            active={config.defaultDifficulty === d.id}
            onPress={() => setConfig({ ...config, defaultDifficulty: d.id })}
          />
        ))}
      </View>

      <Text style={styles.label}>Número padrão de jogadores</Text>
      <View style={styles.row}>
        {COUNTS.map((c) => (
          <Chip
            key={c}
            label={String(c)}
            active={config.defaultPlayerCount === c}
            onPress={() => setConfig({ ...config, defaultPlayerCount: c })}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={cleared ? 'Dados apagados ✓' : 'Apagar save e histórico'}
          variant="danger"
          onPress={resetData}
        />
        <Button label="Voltar" variant="secondary" onPress={goToMenu} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: theme.gold, marginBottom: 12 },
  label: { color: theme.textDim, fontSize: 14, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: theme.bgPanel,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: theme.bg },
  actions: { marginTop: 'auto', gap: 14 },
});
