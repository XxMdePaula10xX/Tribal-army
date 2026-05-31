import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { MapCanvas } from '@/components/MapCanvas';
import { MovePanel } from '@/components/MovePanel';
import { RecruitPanel } from '@/components/RecruitPanel';
import { theme } from '@/components/theme';
import { UNITS, type UnitType } from '@/constants/units';
import { MAP } from '@/data/map';
import { armyAttack, armyDefense, armySize, comboBonus } from '@/game';
import { useGame } from '@/state/store';
import type { CombatFocus, CombatResult } from '@/types';

const FOCUS_OPTIONS: { id: CombatFocus; label: string }[] = [
  { id: 'default', label: 'Frágeis' },
  { id: 'atkHigh', label: 'Maior ATK' },
  { id: 'defHigh', label: 'Maior DEF' },
  { id: 'defLow', label: 'Menor DEF' },
];

export function GameScreen() {
  const game = useGame((s) => s.game)!;
  const selectedId = useGame((s) => s.selectedId);
  const attackTargetId = useGame((s) => s.attackTargetId);
  const lastCombat = useGame((s) => s.lastCombat);
  const select = useGame((s) => s.select);
  const setAttackTarget = useGame((s) => s.setAttackTarget);
  const attack = useGame((s) => s.attack);
  const tradeCards = useGame((s) => s.tradeCards);
  const endTurn = useGame((s) => s.endTurn);
  const dismissCombat = useGame((s) => s.dismissCombat);
  const goToMenu = useGame((s) => s.goToMenu);

  const [focus, setFocus] = useState<CombatFocus>('default');
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  const me = game.currentPlayerIdx;
  const player = game.players[me];

  const handleSelect = (id: string) => {
    const tappedOwner = game.territories[id].owner;

    // Modo remanejar: escolher um território seu vizinho como destino.
    if (
      moveMode &&
      selectedId &&
      tappedOwner === me &&
      id !== selectedId &&
      MAP[selectedId].adjacentTo.includes(id)
    ) {
      setMoveTargetId(id);
      return;
    }

    if (id === selectedId) {
      select(null);
      return;
    }
    if (tappedOwner === me) {
      select(id);
      setMoveMode(false);
      return;
    }
    // Território inimigo: vira alvo se adjacente ao território selecionado.
    if (selectedId && game.territories[selectedId].owner === me && MAP[selectedId].adjacentTo.includes(id)) {
      setAttackTarget(id);
    } else {
      select(id);
    }
  };

  // Tem algum vizinho seu para onde remanejar?
  const hasOwnNeighbor =
    !!selectedId &&
    game.territories[selectedId].owner === me &&
    MAP[selectedId].adjacentTo.some((n) => game.territories[n].owner === me);

  const selected = selectedId ? game.territories[selectedId] : null;
  const target = attackTargetId ? game.territories[attackTargetId] : null;
  const canAttack =
    !!selected && selected.owner === me && armySize(selected.army) >= 2 && !!target;

  const lastResult = useMemo(
    () => (lastCombat && lastCombat.length ? lastCombat[lastCombat.length - 1] : null),
    [lastCombat]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: player.color }]}>
        <Text style={styles.headerText}>Rodada {game.round}</Text>
        <Text style={[styles.playerName, { color: player.color }]}>{player.name}</Text>
        <Text style={styles.headerText}>🪙 {player.gold}</Text>
        <Text style={styles.headerText}>🃏 {player.cards}</Text>
      </View>

      {/* Mapa */}
      <View style={styles.map}>
        <MapCanvas
          territories={game.territories}
          players={game.players}
          selectedId={selectedId}
          attackTargetId={attackTargetId}
          onSelect={handleSelect}
        />
      </View>

      {/* Painel inferior */}
      <View style={styles.panel}>
        <ScrollView contentContainerStyle={styles.panelContent}>
          {selected ? (
            <TerritoryInfo id={selectedId!} />
          ) : (
            <Text style={styles.hint}>Toque num território seu para começar.</Text>
          )}

          {/* Recrutamento + remanejamento */}
          {selected?.owner === me && (
            <View style={styles.ownActions}>
              <Button
                label="⚒️ Recrutar"
                onPress={() => setRecruitOpen(true)}
                style={styles.flex1}
              />
              {hasOwnNeighbor && (
                <Button
                  label={
                    player.fortifiedThisTurn
                      ? '↔️ Remanejado'
                      : moveMode
                        ? '↔️ Toque o destino'
                        : '↔️ Remanejar'
                  }
                  variant={moveMode ? 'primary' : 'secondary'}
                  disabled={player.fortifiedThisTurn}
                  onPress={() => setMoveMode((m) => !m)}
                  style={styles.flex1}
                />
              )}
            </View>
          )}

          {/* Ataque */}
          {canAttack && (
            <View style={styles.attackBox}>
              <Text style={styles.attackTitle}>
                Atacar {MAP[attackTargetId!].name}
              </Text>
              <View style={styles.focusRow}>
                {FOCUS_OPTIONS.map((f) => (
                  <Button
                    key={f.id}
                    label={f.label}
                    variant={focus === f.id ? 'primary' : 'secondary'}
                    onPress={() => setFocus(f.id)}
                    style={styles.focusBtn}
                  />
                ))}
              </View>
              <View style={styles.attackActions}>
                <Button
                  label="Investida"
                  onPress={() => attack(focus, false)}
                  style={styles.flex1}
                />
                <Button
                  label="Assalto Total"
                  variant="danger"
                  onPress={() => attack(focus, true)}
                  style={styles.flex1}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Ações de turno */}
        <View style={styles.turnActions}>
          {player.cards >= 3 && (
            <Button label="Trocar Cartas" variant="secondary" onPress={tradeCards} style={styles.flex1} />
          )}
          <Button label="Encerrar Turno" onPress={endTurn} style={styles.flex1} />
        </View>
      </View>

      {/* Modal de combate */}
      <Modal visible={!!lastResult} transparent animationType="fade" onRequestClose={dismissCombat}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Resultado do Combate</Text>
            {lastResult && (
              <>
                <Text style={styles.modalLine}>
                  Atacante: {Math.round(lastResult.aRes)} de dano
                  {lastResult.aComboNames.length ? ` (${lastResult.aComboNames.join(', ')})` : ''}
                </Text>
                <Text style={styles.modalLine}>
                  Defensor: {Math.round(lastResult.dRes)} de dano
                  {lastResult.dComboNames.length ? ` (${lastResult.dComboNames.join(', ')})` : ''}
                </Text>
                <View style={styles.lossBlock}>
                  <Text style={styles.lossLabel}>
                    Baixas do atacante ({lastCombat?.reduce((s, r) => s + r.aLoss, 0)}):
                  </Text>
                  <LossList losses={aggregateLosses(lastCombat, 'aLossByType')} />
                </View>
                <View style={styles.lossBlock}>
                  <Text style={styles.lossLabel}>
                    Baixas do defensor ({lastCombat?.reduce((s, r) => s + r.dLoss, 0)}):
                  </Text>
                  <LossList losses={aggregateLosses(lastCombat, 'dLossByType')} />
                </View>
                <Text style={[styles.modalResult, resultStyle(lastResult)]}>
                  {lastResult.conquered
                    ? '🏰 Conquistado!'
                    : lastResult.mutualWipe
                      ? '☠️ Aniquilação mútua'
                      : lastResult.ongoing
                        ? '⚔️ Batalha continua'
                        : '🛡️ Ataque repelido'}
                </Text>
              </>
            )}
            <Button label="Continuar" onPress={dismissCombat} />
          </View>
        </View>
      </Modal>

      {selectedId && selected?.owner === me && (
        <RecruitPanel
          territoryId={selectedId}
          visible={recruitOpen}
          onClose={() => setRecruitOpen(false)}
        />
      )}

      {selectedId && moveTargetId && (
        <MovePanel
          fromId={selectedId}
          toId={moveTargetId}
          visible={!!moveTargetId}
          onClose={() => {
            setMoveTargetId(null);
            setMoveMode(false);
          }}
        />
      )}

      <Button label="Menu" variant="secondary" onPress={goToMenu} style={styles.menuBtn} />
    </View>
  );
}

function resultStyle(r: CombatResult) {
  if (r.conquered) return { color: theme.success };
  if (r.mutualWipe) return { color: theme.warning };
  if (r.ongoing) return { color: theme.gold };
  return { color: theme.danger };
}

/** Soma as baixas por tipo ao longo de todos os rounds de um combate. */
function aggregateLosses(
  results: CombatResult[] | null,
  key: 'aLossByType' | 'dLossByType'
): Partial<Record<UnitType, number>> {
  const total: Partial<Record<UnitType, number>> = {};
  for (const r of results ?? []) {
    for (const [k, n] of Object.entries(r[key]) as [UnitType, number][]) {
      total[k] = (total[k] || 0) + n;
    }
  }
  return total;
}

function LossList({ losses }: { losses: Partial<Record<UnitType, number>> }) {
  const entries = (Object.entries(losses) as [UnitType, number][]).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    return <Text style={styles.lossNone}>nenhuma</Text>;
  }
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

function TerritoryInfo({ id }: { id: string }) {
  const game = useGame((s) => s.game)!;
  const t = game.territories[id];
  const ownerName =
    t.owner === 'neutral' ? 'Neutro' : game.players[t.owner].name;
  const combo = comboBonus(t.army);

  return (
    <View>
      <Text style={styles.terrName}>
        {MAP[id].name} <Text style={styles.terrRegion}>· {MAP[id].region}</Text>
      </Text>
      <Text style={styles.terrLine}>
        Dono: {ownerName} · {armySize(t.army)} tropas
      </Text>
      <Text style={styles.terrLine}>
        ⚔️ {armyAttack(t.army)} · 🛡️ {armyDefense(t.army)}
      </Text>
      {combo.names.length > 0 && (
        <Text style={styles.combo}>Combos: {combo.names.join(', ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: theme.bgPanel,
    borderBottomWidth: 3,
  },
  headerText: { color: theme.text, fontWeight: '600', fontSize: 14 },
  playerName: { fontWeight: '800', fontSize: 16 },
  map: { flex: 1 },
  panel: {
    backgroundColor: theme.bgPanel,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    maxHeight: '42%',
  },
  panelContent: { padding: 16, gap: 12 },
  hint: { color: theme.textDim, fontStyle: 'italic' },
  terrName: { color: theme.gold, fontSize: 18, fontWeight: '800' },
  terrRegion: { color: theme.textDim, fontSize: 13, fontWeight: '400' },
  terrLine: { color: theme.text, marginTop: 4 },
  combo: { color: theme.success, marginTop: 4, fontStyle: 'italic' },
  ownActions: { flexDirection: 'row', gap: 8 },
  lossBlock: { gap: 2 },
  lossLabel: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  lossRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  lossItem: { color: theme.text, fontSize: 13 },
  lossNone: { color: theme.textDim, fontSize: 13, fontStyle: 'italic' },
  attackBox: {
    backgroundColor: theme.bgPanelAlt,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  attackTitle: { color: theme.text, fontWeight: '700', fontSize: 15 },
  focusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  focusBtn: { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 8 },
  attackActions: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  turnActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  modalBackdrop: {
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
  modalTitle: { color: theme.gold, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalLine: { color: theme.text, fontSize: 14 },
  modalResult: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginVertical: 6 },
  menuBtn: { position: 'absolute', top: 48, right: 12, paddingVertical: 6, paddingHorizontal: 12 },
});
