import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import { loadGame } from '@/storage/persistence';
import { useGame } from '@/state/store';

export function MenuScreen() {
  const goToSetup = useGame((s) => s.goToSetup);
  const continueGame = useGame((s) => s.continueGame);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    loadGame().then((g) => setHasSave(!!g && g.phase === 'playing'));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚔️ Tribal Army</Text>
      <Text style={styles.subtitle}>Conquiste os 40 territórios</Text>

      <View style={styles.menu}>
        <Button label="Novo Jogo" onPress={goToSetup} />
        <Button
          label="Continuar"
          variant="secondary"
          disabled={!hasSave}
          onPress={() => void continueGame()}
        />
      </View>

      <Text style={styles.version}>v1.0 — React Native + Expo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 42, fontWeight: '800', color: theme.gold },
  subtitle: { fontSize: 16, color: theme.textDim, marginTop: 8, marginBottom: 48 },
  menu: { width: '100%', maxWidth: 320, gap: 14 },
  version: { position: 'absolute', bottom: 24, color: theme.textDim, fontSize: 12 },
});
