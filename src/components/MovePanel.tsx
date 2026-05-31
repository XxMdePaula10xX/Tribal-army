import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UNITS, UNIT_TYPES, type UnitType } from '@/constants/units';
import { MAP } from '@/data/map';
import { useGame } from '@/state/store';

import { Button } from './Button';
import { theme } from './theme';

interface Props {
  fromId: string;
  toId: string;
  visible: boolean;
  onClose: () => void;
}

type Draft = Partial<Record<UnitType, number>>;

export function MovePanel({ fromId, toId, visible, onClose }: Props) {
  const game = useGame((s) => s.game)!;
  const fortify = useGame((s) => s.fortify);

  const fromArmy = game.territories[fromId]?.army;
  const [draft, setDraft] = useState<Draft>({});

  const total = UNIT_TYPES.reduce((s, k) => s + (draft[k] || 0), 0);

  const change = (k: UnitType, delta: number) => {
    setDraft((d) => {
      const max = fromArmy?.[k] ?? 0;
      const next = Math.min(max, Math.max(0, (d[k] || 0) + delta));
      return { ...d, [k]: next };
    });
  };

  const reset = () => setDraft({});
  const cancel = () => {
    reset();
    onClose();
  };
  const confirm = () => {
    if (total > 0) fortify(fromId, toId, draft);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Remanejar tropas</Text>
          <Text style={styles.route}>
            {MAP[fromId]?.name} → {MAP[toId]?.name}
          </Text>

          <ScrollView contentContainerStyle={styles.list}>
            {UNIT_TYPES.map((k) => {
              const u = UNITS[k];
              const avail = fromArmy?.[k] ?? 0;
              if (avail === 0) return null;
              const pending = draft[k] || 0;
              return (
                <View key={k} style={styles.row}>
                  <Text style={styles.icon}>{u.icon}</Text>
                  <View style={styles.info}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Text style={styles.stats}>disponível: {avail}</Text>
                  </View>
                  <Text style={styles.qty}>{pending}</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      disabled={pending === 0}
                      onPress={() => change(k, -1)}
                      style={[styles.step, styles.minus, pending === 0 && styles.stepDisabled]}
                    >
                      <Text style={[styles.stepText, styles.minusText]}>−</Text>
                    </Pressable>
                    <Pressable
                      disabled={pending >= avail}
                      onPress={() => change(k, 1)}
                      style={[styles.step, styles.plus, pending >= avail && styles.stepDisabled]}
                    >
                      <Text style={styles.stepText}>＋</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.cost}>Movendo: {total} tropa(s)</Text>
            <View style={styles.actions}>
              <Button label="Cancelar" variant="secondary" onPress={cancel} style={styles.flex1} />
              <Button label="Mover" onPress={confirm} disabled={total === 0} style={styles.flex1} />
            </View>
          </View>
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
    maxHeight: '82%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: { color: theme.gold, fontSize: 20, fontWeight: '800' },
  route: { color: theme.textDim, fontSize: 14, marginTop: 2, marginBottom: 12 },
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
  qty: { color: theme.gold, fontWeight: '700', fontSize: 16, minWidth: 32, textAlign: 'right' },
  stepper: { flexDirection: 'row', gap: 6 },
  step: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  plus: { backgroundColor: theme.gold },
  minus: { backgroundColor: theme.bgPanel, borderWidth: 1, borderColor: theme.border },
  stepDisabled: { opacity: 0.3 },
  stepText: { color: theme.bg, fontWeight: '900', fontSize: 18 },
  minusText: { color: theme.text },
  footer: { marginTop: 12, gap: 10 },
  cost: { color: theme.text, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
});
