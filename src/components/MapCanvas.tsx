import { Canvas, Circle, Group, Line, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { armySize } from '@/game/army';
import type { GameState, Player } from '@/types';

import { ADJACENCY_PAIRS, TERRITORY_POSITIONS } from './mapLayout';
import { theme } from './theme';

interface Props {
  territories: GameState['territories'];
  players: Player[];
  selectedId: string | null;
  attackTargetId: string | null;
  onSelect: (id: string) => void;
}

const NODE_RADIUS = 16;

function ownerColor(owner: number | 'neutral', players: Player[]): string {
  return owner === 'neutral' ? theme.neutral : players[owner]?.color ?? theme.neutral;
}

export function MapCanvas({
  territories,
  players,
  selectedId,
  attackTargetId,
  onSelect,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const px = (id: string) => ({
    x: TERRITORY_POSITIONS[id].x * size.w,
    y: TERRITORY_POSITIONS[id].y * size.h,
  });

  const ready = size.w > 0 && size.h > 0;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {ready && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* Linhas de adjacência */}
            <Group>
              {ADJACENCY_PAIRS.map(([a, b]) => {
                const pa = px(a);
                const pb = px(b);
                return (
                  <Line
                    key={`${a}-${b}`}
                    p1={vec(pa.x, pa.y)}
                    p2={vec(pb.x, pb.y)}
                    color={theme.border}
                    strokeWidth={1.5}
                  />
                );
              })}
            </Group>

            {/* Nós dos territórios */}
            {Object.keys(territories).map((id) => {
              const p = px(id);
              const t = territories[id];
              const highlight =
                id === selectedId
                  ? theme.gold
                  : id === attackTargetId
                    ? theme.danger
                    : null;
              return (
                <Group key={id}>
                  {highlight && (
                    <Circle cx={p.x} cy={p.y} r={NODE_RADIUS + 4} color={highlight} />
                  )}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={NODE_RADIUS}
                    color={ownerColor(t.owner, players)}
                  />
                </Group>
              );
            })}
          </Canvas>

          {/* Camada de toque + rótulos (RN sobre o Skia) */}
          {Object.keys(territories).map((id) => {
            const p = px(id);
            const count = armySize(territories[id].army);
            return (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                style={[
                  styles.node,
                  { left: p.x - NODE_RADIUS, top: p.y - NODE_RADIUS },
                ]}
                hitSlop={6}
              >
                <Text style={styles.count}>{count}</Text>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  node: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textShadowColor: '#000',
    textShadowRadius: 2,
  },
});
