import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import { useGame } from '@/state/store';

export function GameOverScreen() {
  const game = useGame((s) => s.game);
  const goToSetup = useGame((s) => s.goToSetup);
  const goToMenu = useGame((s) => s.goToMenu);

  const winner =
    game && game.winnerIdx !== null ? game.players[game.winnerIdx] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.crown}>👑</Text>
      <Text style={styles.title}>Fim de Jogo</Text>
      {winner ? (
        <Text style={[styles.winner, { color: winner.color }]}>
          {winner.name} venceu!
        </Text>
      ) : (
        <Text style={styles.winner}>Empate</Text>
      )}

      <View style={styles.actions}>
        <Button label="Novo Jogo" onPress={goToSetup} />
        <Button label="Menu Principal" variant="secondary" onPress={goToMenu} />
      </View>
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
  crown: { fontSize: 64 },
  title: { fontSize: 32, fontWeight: '800', color: theme.gold, marginTop: 12 },
  winner: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 8, marginBottom: 48 },
  actions: { width: '100%', maxWidth: 320, gap: 14 },
});
