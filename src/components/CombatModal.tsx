import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import { UNITS, type UnitType } from '@/constants/units';
import type { CombatResult } from '@/types';

import { Button } from './Button';
import { theme } from './theme';

interface Props {
  results: CombatResult[] | null;
  onDismiss: () => void;
}

/** Número que anima de 0 até `value`. */
function Counter({ value, style }: { value: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 650, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

function aggregateLosses(
  results: CombatResult[],
  key: 'aLossByType' | 'dLossByType'
): Partial<Record<UnitType, number>> {
  const total: Partial<Record<UnitType, number>> = {};
  for (const r of results) {
    for (const [k, n] of Object.entries(r[key]) as [UnitType, number][]) {
      total[k] = (total[k] || 0) + n;
    }
  }
  return total;
}

function LossList({ losses }: { losses: Partial<Record<UnitType, number>> }) {
  const entries = (Object.entries(losses) as [UnitType, number][]).filter(([, n]) => n > 0);
  if (entries.length === 0) return <Text style={styles.lossNone}>nenhuma</Text>;
  return (
    <View style={styles.lossRow}>
      {entries.map(([k, n]) => (
        <Text key={k} style={styles.lossItem}>
          {UNITS[k].icon} {UNITS[k].name} ×{n}
        </Text>
      ))}
    </View>
  );
}

function resultInfo(r: CombatResult): { label: string; color: string } {
  if (r.conquered) return { label: '🏰 Conquistado!', color: theme.success };
  if (r.mutualWipe) return { label: '☠️ Aniquilação mútua', color: theme.warning };
  if (r.ongoing) return { label: '⚔️ Batalha continua', color: theme.gold };
  return { label: '🛡️ Ataque repelido', color: theme.danger };
}

export function CombatModal({ results, onDismiss }: Props) {
  const last = results && results.length ? results[results.length - 1] : null;
  const visible = !!last;

  const appear = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    appear.setValue(0);
    shake.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.spring(appear, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(shake, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(480),
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  if (!last) return null;

  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const shakeX = shake.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -9, 9, -6, 5, 0],
  });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const aLosses = aggregateLosses(results!, 'aLossByType');
  const dLosses = aggregateLosses(results!, 'dLossByType');
  const aTotal = results!.reduce((s, r) => s + r.aLoss, 0);
  const dTotal = results!.reduce((s, r) => s + r.dLoss, 0);
  const info = resultInfo(last);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: appear }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale }, { translateX: shakeX }] }]}>
          <Text style={styles.title}>⚔️ Combate</Text>

          <View style={styles.clash}>
            <View style={styles.side}>
              <Text style={styles.sideLabel}>Atacante</Text>
              <Counter value={Math.round(last.aRes)} style={[styles.dmg, { color: theme.gold }]} />
              {last.aComboNames.length > 0 && (
                <Text style={styles.combo}>{last.aComboNames.join(', ')}</Text>
              )}
            </View>
            <Text style={styles.vs}>×</Text>
            <View style={styles.side}>
              <Text style={styles.sideLabel}>Defensor</Text>
              <Counter value={Math.round(last.dRes)} style={[styles.dmg, { color: theme.link }]} />
              {last.dComboNames.length > 0 && (
                <Text style={styles.combo}>{last.dComboNames.join(', ')}</Text>
              )}
            </View>
          </View>

          <View style={styles.lossBlock}>
            <Text style={styles.lossLabel}>Baixas do atacante ({aTotal}):</Text>
            <LossList losses={aLosses} />
          </View>
          <View style={styles.lossBlock}>
            <Text style={styles.lossLabel}>Baixas do defensor ({dTotal}):</Text>
            <LossList losses={dLosses} />
          </View>

          <Animated.Text
            style={[styles.result, { color: info.color, transform: [{ scale: popScale }] }]}
          >
            {info.label}
          </Animated.Text>

          <Button label="Continuar" onPress={onDismiss} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.bgPanel,
    borderRadius: 14,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: { color: theme.gold, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  clash: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center' },
  sideLabel: { color: theme.textDim, fontSize: 13, marginBottom: 2 },
  dmg: { fontSize: 34, fontWeight: '900' },
  combo: { color: theme.success, fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
  vs: { color: theme.textDim, fontSize: 20, fontWeight: '800', paddingHorizontal: 8 },
  lossBlock: { gap: 2 },
  lossLabel: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  lossRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  lossItem: { color: theme.text, fontSize: 13 },
  lossNone: { color: theme.textDim, fontSize: 13, fontStyle: 'italic' },
  result: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginVertical: 4 },
});
