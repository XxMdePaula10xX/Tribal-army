import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import { useGame } from '@/state/store';
import { clearHistory, loadHistory, type HistoryEntry } from '@/storage/persistence';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryScreen() {
  const goToMenu = useGame((s) => s.goToMenu);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const refresh = () => loadHistory().then(setEntries);
  useEffect(() => {
    refresh();
  }, []);

  const onClear = async () => {
    await clearHistory();
    refresh();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico</Text>

      {entries.length === 0 ? (
        <Text style={styles.empty}>Nenhuma partida finalizada ainda.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e, i) => `${e.date}-${i}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.winner, { color: item.winnerColor ?? theme.textDim }]}>
                  {item.winnerName ? `🏆 ${item.winnerName}` : 'Empate'}
                </Text>
                <Text style={styles.round}>Rodada {item.round}</Text>
              </View>
              <Text style={styles.players}>{item.playerNames.join(' · ')}</Text>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.actions}>
        {entries.length > 0 && (
          <Button label="Limpar histórico" variant="danger" onPress={onClear} style={styles.flex1} />
        )}
        <Button label="Voltar" variant="secondary" onPress={goToMenu} style={styles.flex1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: theme.gold, marginBottom: 20 },
  empty: { color: theme.textDim, fontStyle: 'italic', flex: 1 },
  list: { gap: 10, paddingBottom: 12 },
  card: {
    backgroundColor: theme.bgPanel,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  winner: { fontSize: 16, fontWeight: '800' },
  round: { color: theme.textDim, fontSize: 13 },
  players: { color: theme.text, marginTop: 6 },
  date: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex1: { flex: 1 },
});
