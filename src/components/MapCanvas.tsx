import { useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  GRAIN_DOTS,
  MAP_GEOMETRY,
  MAP_H,
  MAP_W,
  type Pt,
} from '@/data/mapGeometry';
import { armySize } from '@/game/army';
import type { GameState, Player } from '@/types';

import { theme } from './theme';

interface Props {
  territories: GameState['territories'];
  players: Player[];
  selectedId: string | null;
  attackTargetId: string | null;
  onSelect: (id: string) => void;
}

const { polygons, centroids, regionBorders, order } = MAP_GEOMETRY;

function pathFor(poly: Pt[]): string {
  return (
    poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') +
    ' Z'
  );
}

const POLY_PATHS: Record<string, string> = Object.fromEntries(
  order.filter((id) => polygons[id]).map((id) => [id, pathFor(polygons[id])])
);

function inside(poly: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function ownerColor(owner: number | 'neutral', players: Player[]): string {
  return owner === 'neutral' ? theme.neutral : players[owner]?.color ?? theme.neutral;
}

export function MapCanvas({ territories, players, selectedId, attackTargetId, onSelect }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  // Espelho numérico do transform (modelo de origem no canto superior esquerdo).
  const s = useRef(1);
  const TX = useRef(0);
  const TY = useRef(0);
  const minS = useRef(0.2);
  const maxS = useRef(3);
  const inited = useRef(false);
  const g = useRef({
    moved: false,
    pointers: 0,
    baseDist: 1,
    baseS: 1,
    baseTX: 0,
    baseTY: 0,
    startX: 0,
    startY: 0,
  }).current;

  const clamp = (v: number) => Math.max(minS.current, Math.min(maxS.current, v));

  const apply = (ns: number, nTx: number, nTy: number) => {
    s.current = ns;
    TX.current = nTx;
    TY.current = nTy;
    scale.setValue(ns);
    tx.setValue(nTx);
    ty.setValue(nTy);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
    if (!inited.current && width > 0 && height > 0) {
      const fit = Math.min(width / MAP_W, height / MAP_H) * 0.98;
      minS.current = fit * 0.8;
      maxS.current = fit * 6;
      apply(fit, (width - MAP_W * fit) / 2, (height - MAP_H * fit) / 2);
      inited.current = true;
    }
  };

  const hit = (x: number, y: number) => {
    const mx = (x - TX.current) / s.current;
    const my = (y - TY.current) / s.current;
    for (const id of order) {
      if (polygons[id] && inside(polygons[id], mx, my)) {
        onSelect(id);
        return;
      }
    }
  };

  const zoomBy = (factor: number) => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const mx = (cx - TX.current) / s.current;
    const my = (cy - TY.current) / s.current;
    const ns = clamp(s.current * factor);
    apply(ns, cx - mx * ns, cy - my * ns);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        g.moved = false;
        g.pointers = 0;
      },
      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          const [a, b] = touches;
          const dist = Math.hypot(a.locationX - b.locationX, a.locationY - b.locationY);
          const cx = (a.locationX + b.locationX) / 2;
          const cy = (a.locationY + b.locationY) / 2;
          if (g.pointers !== 2) {
            g.pointers = 2;
            g.baseDist = dist || 1;
            g.baseS = s.current;
            g.baseTX = TX.current;
            g.baseTY = TY.current;
          }
          const ns = clamp((g.baseS * dist) / g.baseDist);
          const mx = (cx - g.baseTX) / g.baseS;
          const my = (cy - g.baseTY) / g.baseS;
          apply(ns, cx - mx * ns, cy - my * ns);
          g.moved = true;
        } else if (touches.length === 1) {
          const t = touches[0];
          if (g.pointers !== 1) {
            g.pointers = 1;
            g.baseTX = TX.current;
            g.baseTY = TY.current;
            g.startX = t.locationX;
            g.startY = t.locationY;
          }
          const dx = t.locationX - g.startX;
          const dy = t.locationY - g.startY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) g.moved = true;
          apply(s.current, g.baseTX + dx, g.baseTY + dy);
        }
      },
      onPanResponderRelease: (e) => {
        if (!g.moved) hit(e.nativeEvent.locationX, e.nativeEvent.locationY);
        g.pointers = 0;
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={onLayout} {...pan.panHandlers}>
      <Animated.View
        style={{
          width: MAP_W,
          height: MAP_H,
          transformOrigin: '0 0',
          transform: [{ translateX: tx }, { translateY: ty }, { scale }],
        }}
      >
        <Svg width={MAP_W} height={MAP_H}>
          <Defs>
            <Pattern id="grain" patternUnits="userSpaceOnUse" width={40} height={40}>
              {GRAIN_DOTS.map((d, i) => (
                <Circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill={d.dark ? '#000' : '#fff'}
                  fillOpacity={d.dark ? 0.18 : 0.14}
                />
              ))}
            </Pattern>
            <RadialGradient id="shade" cx="50%" cy="38%" r="75%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
              <Stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.26} />
            </RadialGradient>
          </Defs>

          <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={theme.bg} />

          {/* Preenchimento por dono */}
          {order.map((id) =>
            POLY_PATHS[id] ? (
              <Path
                key={`f-${id}`}
                d={POLY_PATHS[id]}
                fill={ownerColor(territories[id].owner, players)}
                stroke="#0f0b07"
                strokeWidth={1.5}
              />
            ) : null
          )}

          {/* Textura (grain + sombreamento) */}
          {order.map((id) =>
            POLY_PATHS[id] ? (
              <Path key={`g-${id}`} d={POLY_PATHS[id]} fill="url(#grain)" />
            ) : null
          )}
          {order.map((id) =>
            POLY_PATHS[id] ? (
              <Path key={`s-${id}`} d={POLY_PATHS[id]} fill="url(#shade)" />
            ) : null
          )}

          {/* Bordas grossas entre regiões */}
          {regionBorders.map(([a, b], i) => (
            <Line
              key={`rb-${i}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="#0f0b07"
              strokeWidth={5}
              strokeLinecap="round"
            />
          ))}

          {/* Destaque de seleção / alvo */}
          {selectedId && POLY_PATHS[selectedId] && (
            <Path d={POLY_PATHS[selectedId]} fill="none" stroke={theme.gold} strokeWidth={5} />
          )}
          {attackTargetId && POLY_PATHS[attackTargetId] && (
            <Path d={POLY_PATHS[attackTargetId]} fill="none" stroke={theme.danger} strokeWidth={5} />
          )}

          {/* Contagem de tropas */}
          {order.map((id) =>
            centroids[id] ? (
              <SvgText
                key={`t-${id}`}
                x={centroids[id][0]}
                y={centroids[id][1] + 7}
                fontSize={22}
                fontWeight="bold"
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={0.6}
                textAnchor="middle"
              >
                {armySize(territories[id].army)}
              </SvgText>
            ) : null
          )}
        </Svg>
      </Animated.View>

      <View style={styles.zoom}>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.3)}>
          <Text style={styles.zoomText}>＋</Text>
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 1.3)}>
          <Text style={styles.zoomText}>－</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, overflow: 'hidden' },
  zoom: { position: 'absolute', right: 10, bottom: 10, gap: 8 },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.bgPanel,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: theme.gold, fontSize: 24, fontWeight: '800' },
});
