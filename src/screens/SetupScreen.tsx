import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import { PLAYER_COLORS, type Difficulty } from '@/constants/game';
import type { PlayerConfig } from '@/game';
import { useGame } from '@/state/store';

const COUNTS = [2, 3, 4, 5, 6];
const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'facil', label: 'Fácil' },
  { id: 'medio', label: 'Médio' },
  { id: 'dificil', label: 'Difícil' },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SetupScreen() {
  const newGame = useGame((s) => s.newGame);
  const goToMenu = useGame((s) => s.goToMenu);
  const config = useGame((s) => s.config);
  const [count, setCount] = useState(config.defaultPlayerCount);
  const [difficulty, setDifficulty] = useState<Difficulty>(config.defaultDifficulty);

  const start = () => {
    const configs: PlayerConfig[] = [
      { name: 'Você', isHuman: true, difficulty: 'medio', color: PLAYER_COLORS[0] },
    ];
    for (let i = 1; i < count; i++) {
      configs.push({
        name: `IA ${i}`,
        isHuman: false,
        difficulty,
        color: PLAYER_COLORS[i],
      });
    }
    newGame(configs);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurar Partida</Text>

      <Text style={styles.label}>Número de jogadores</Text>
      <View style={styles.row}>
        {COUNTS.map((c) => (
          <Chip key={c} label={String(c)} active={count === c} onPress={() => setCount(c)} />
        ))}
      </View>

      <Text style={styles.label}>Dificuldade das IAs</Text>
      <View style={styles.row}>
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d.id}
            label={d.label}
            active={difficulty === d.id}
            onPress={() => setDifficulty(d.id)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Começar" onPress={start} />
        <Button label="Voltar" variant="secondary" onPress={goToMenu} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: theme.gold, marginBottom: 32 },
  label: { color: theme.textDim, fontSize: 14, marginTop: 20, marginBottom: 10 },
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
  actions: { marginTop: 48, gap: 14 },
});
