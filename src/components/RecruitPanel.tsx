import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UNITS, UNIT_TYPES, type UnitType } from '@/constants/units';
import { useGame } from '@/state/store';

import { Button } from './Button';
import { theme } from './theme';

interface Props {
  territoryId: string;
  visible: boolean;
  onClose: () => void;
}

export function RecruitPanel({ territoryId, visible, onClose }: Props) {
  const game = useGame((s) => s.game)!;
  const recruit = useGame((s) => s.recruit);

  const player = game.players[game.currentPlayerIdx];
  const army = game.territories[territoryId]?.army;

  const buy = (k: UnitType, qty: number) => recruit(territoryId, { [k]: qty });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Recrutar tropas</Text>
            <Text style={styles.gold}>🪙 {player.gold}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {UNIT_TYPES.map((k) => {
              const u = UNITS[k];
              const owned = army?.[k] ?? 0;
              const affordable = player.gold >= u.cost;
              return (
                <View key={k} style={styles.row}>
                  <Text style={styles.icon}>{u.icon}</Text>
                  <View style={styles.info}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Text style={styles.stats}>
                      ⚔️{u.atk} 🛡️{u.def} ❤️{u.hp} · 🪙{u.cost}
                    </Text>
                  </View>
                  <Text style={styles.qty}>×{owned}</Text>
                  <View style={styles.buttons}>
                    <Pressable
                      disabled={!affordable}
                      onPress={() => buy(k, 1)}
                      style={[styles.add, !affordable && styles.addDisabled]}
                    >
                      <Text style={styles.addText}>+1</Text>
                    </Pressable>
                    <Pressable
                      disabled={player.gold < u.cost * 5}
                      onPress={() => buy(k, 5)}
                      style={[styles.add, player.gold < u.cost * 5 && styles.addDisabled]}
                    >
                      <Text style={styles.addText}>+5</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Button label="Concluir" onPress={onClose} style={styles.done} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bgPanel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: theme.gold, fontSize: 20, fontWeight: '800' },
  gold: { color: theme.text, fontSize: 16, fontWeight: '700' },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPanelAlt,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icon: { fontSize: 24, width: 32, textAlign: 'center' },
  info: { flex: 1 },
  name: { color: theme.text, fontWeight: '700', fontSize: 15 },
  stats: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  qty: { color: theme.gold, fontWeight: '700', fontSize: 15, minWidth: 36, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 6 },
  add: {
    backgroundColor: theme.gold,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  addDisabled: { opacity: 0.35 },
  addText: { color: theme.bg, fontWeight: '800', fontSize: 13 },
  done: { marginTop: 14 },
});
