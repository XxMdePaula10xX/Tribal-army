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
  G,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  BIOME_COLORS,
  BIOME_MARKS,
  BIOMES,
  MAP_GEOMETRY,
  MAP_H,
  MAP_W,
  TILE,
  type Biome,
  type Pt,
} from '@/data/mapGeometry';
import { armySize } from '@/game/army';
import type { GameState, Player } from '@/types';

import mapData from '../../assets/data/map.json';
import { theme } from './theme';

interface Props {
  territories: GameState['territories'];
  players: Player[];
  selectedId: string | null;
  attackTargetId: string | null;
  onSelect: (id: string) => void;
}

const { polygons, centroids, regionBorders, rivers, order } = MAP_GEOMETRY;

const linePath = (poly: Pt[]) =>
  poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const ringPath = (poly: Pt[]) => linePath(poly) + ' Z';

const POLY_PATHS: Record<string, string> = Object.fromEntries(
  order.filter((id) => polygons[id]).map((id) => [id, ringPath(polygons[id])])
);

const REGION_BY_ID: Record<string, string> = Object.fromEntries(
  (mapData.territories as { id: string; region: string }[]).map((t) => [t.id, t.region])
);
const BIOME_OF: Record<string, Biome> = Object.fromEntries(
  order.map((id) => [id, BIOMES[REGION_BY_ID[id]]])
);

/** Catmull-Rom → curva suave para os rios. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const RIVER_PATHS = rivers.map(smoothPath);

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

/** Marcas de textura de um bioma (formas distintas por bioma). */
function biomeMarks(biome: Biome) {
  return BIOME_MARKS[biome].map((m, i) => {
    const x = m.x;
    const y = m.y;
    switch (biome) {
      case 'floresta':
        return <Circle key={i} cx={x} cy={y} r={2.4} fill="#2f6b34" fillOpacity={0.55} />;
      case 'neve':
        return <Circle key={i} cx={x} cy={y} r={1.6} fill="#ffffff" fillOpacity={0.7} />;
      case 'pantano':
        return <Circle key={i} cx={x} cy={y} r={2.6} fill="#3f4a2a" fillOpacity={0.5} />;
      case 'montanha':
        return <Path key={i} d={`M${x},${y} l4,-6 l4,6 z`} fill="#6b5b46" fillOpacity={0.5} />;
      case 'grama':
        return <Rect key={i} x={x} y={y} width={1.6} height={4} fill="#3f6b1f" fillOpacity={0.4} />;
      default: // deserto, praia, savana → "dunas"
        return (
          <Path key={i} d={`M${x},${y} q4,-3 8,0`} stroke="#00000022" strokeWidth={1.4} fill="none" />
        );
    }
  });
}

export function MapCanvas({ territories, players, selectedId, attackTargetId, onSelect }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
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

  const biomesPresent = Array.from(new Set(order.map((id) => BIOME_OF[id])));

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
            {biomesPresent.map((b) => (
              <Pattern key={b} id={`pat-${b}`} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
                {biomeMarks(b)}
              </Pattern>
            ))}
            <RadialGradient id="shade" cx="50%" cy="40%" r="75%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
              <Stop offset="60%" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.22} />
            </RadialGradient>
          </Defs>

          {/* Oceano */}
          <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#1d6e8c" />

          {/* Preenchimento de bioma + textura */}
          {order.map((id) =>
            POLY_PATHS[id] ? (
              <Path
                key={`b-${id}`}
                d={POLY_PATHS[id]}
                fill={BIOME_COLORS[BIOME_OF[id]]}
                stroke="#5a4a32"
                strokeWidth={1.2}
              />
            ) : null
          )}
          {order.map((id) =>
            POLY_PATHS[id] ? <Path key={`t-${id}`} d={POLY_PATHS[id]} fill={`url(#pat-${BIOME_OF[id]})`} /> : null
          )}
          {order.map((id) =>
            POLY_PATHS[id] ? <Path key={`sh-${id}`} d={POLY_PATHS[id]} fill="url(#shade)" /> : null
          )}

          {/* Rios */}
          {RIVER_PATHS.map((d, i) => (
            <G key={`r-${i}`}>
              <Path d={d} fill="none" stroke="#2b6fa8" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
              <Path d={d} fill="none" stroke="#5aa6d8" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          ))}

          {/* Bordas de região */}
          {regionBorders.map((pl, i) => (
            <Path
              key={`rb-${i}`}
              d={linePath(pl)}
              fill="none"
              stroke="#3a2e1c"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Borda do dono */}
          {order.map((id) =>
            POLY_PATHS[id] ? (
              <Path
                key={`o-${id}`}
                d={POLY_PATHS[id]}
                fill="none"
                stroke={ownerColor(territories[id].owner, players)}
                strokeWidth={3}
                strokeOpacity={0.9}
              />
            ) : null
          )}

          {/* Destaque seleção / alvo */}
          {selectedId && POLY_PATHS[selectedId] && (
            <Path d={POLY_PATHS[selectedId]} fill="none" stroke={theme.gold} strokeWidth={6} />
          )}
          {attackTargetId && POLY_PATHS[attackTargetId] && (
            <Path d={POLY_PATHS[attackTargetId]} fill="none" stroke={theme.danger} strokeWidth={6} />
          )}

          {/* Brasão do dono + tropas */}
          {order.map((id) =>
            centroids[id] ? (
              <G key={`badge-${id}`}>
                <Circle
                  cx={centroids[id][0]}
                  cy={centroids[id][1]}
                  r={15}
                  fill={ownerColor(territories[id].owner, players)}
                  stroke="#0f0b07"
                  strokeWidth={1.5}
                />
                <SvgText
                  x={centroids[id][0]}
                  y={centroids[id][1] + 6}
                  fontSize={18}
                  fontWeight="bold"
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={0.5}
                  textAnchor="middle"
                >
                  {armySize(territories[id].army)}
                </SvgText>
              </G>
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
  container: { flex: 1, backgroundColor: '#1d6e8c', overflow: 'hidden' },
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
