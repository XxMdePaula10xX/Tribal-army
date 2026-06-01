import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CombatModal } from '@/components/CombatModal';
import { MapCanvas } from '@/components/MapCanvas';
import { MovePanel } from '@/components/MovePanel';
import { RecruitPanel } from '@/components/RecruitPanel';
import { theme } from '@/components/theme';
import { MAP } from '@/data/map';
import { armyAttack, armyDefense, armySize, comboBonus } from '@/game';
import { useGame } from '@/state/store';
import type { CombatFocus } from '@/types';

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
  const [mode, setMode] = useState<'idle' | 'attack' | 'move'>('idle');
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  const me = game.currentPlayerIdx;
  const player = game.players[me];

  const confirmExit = () => {
    Alert.alert(
      'Sair da partida?',
      'O progresso fica salvo e você pode continuar depois pelo menu.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: goToMenu },
      ]
    );
  };

  const mine = (id: string) => game.territories[id].owner === me;

  const handleSelect = (id: string) => {
    // MODO ATACAR: origem = território meu selecionado; alvo = inimigo vizinho.
    if (mode === 'attack' && selectedId && mine(selectedId)) {
      if (!mine(id) && MAP[selectedId].adjacentTo.includes(id)) {
        setAttackTarget(id);
        return;
      }
      if (mine(id)) {
        // troca a origem do ataque
        select(id);
        setAttackTarget(null);
        return;
      }
      return; // toque inválido no modo atacar
    }

    // MODO REMANEJAR: origem e destino são territórios meus vizinhos.
    if (mode === 'move' && selectedId && mine(selectedId)) {
      if (id !== selectedId && mine(id) && MAP[selectedId].adjacentTo.includes(id)) {
        setMoveTargetId(id);
        return;
      }
      if (mine(id)) {
        select(id);
        return;
      }
      return;
    }

    // MODO NORMAL: só seleciona para ver detalhes.
    select(id === selectedId ? null : id);
  };

  const resetModes = () => {
    setMode('idle');
    setAttackTarget(null);
    setMoveTargetId(null);
  };

  // Sinaliza no mapa os destinos válidos conforme o modo.
  const highlightIds: string[] =
    selectedId && mine(selectedId) && mode === 'attack'
      ? MAP[selectedId].adjacentTo.filter((n) => !mine(n))
      : selectedId && mine(selectedId) && mode === 'move'
        ? MAP[selectedId].adjacentTo.filter((n) => mine(n))
        : [];

  const enemyNeighbors =
    selectedId && mine(selectedId)
      ? MAP[selectedId].adjacentTo.filter((n) => !mine(n))
      : [];
  const ownNeighbors =
    selectedId && mine(selectedId)
      ? MAP[selectedId].adjacentTo.filter((n) => mine(n))
      : [];

  const selected = selectedId ? game.territories[selectedId] : null;
  const canAttackFrom = !!selected && selected.owner === me && armySize(selected.army) >= 2;
  const canAttack = canAttackFrom && !!attackTargetId;

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
          moveTargetId={moveTargetId}
          highlightIds={highlightIds}
          highlightKind={mode === 'move' ? 'move' : 'attack'}
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

          {/* Dica do modo ativo */}
          {mode === 'attack' && selected?.owner === me && (
            <Text style={styles.modeHint}>
              {attackTargetId
                ? `Alvo: ${MAP[attackTargetId].name}. Escolha o foco e ataque abaixo.`
                : enemyNeighbors.length
                  ? 'Toque num território inimigo destacado (vermelho) para atacar.'
                  : 'Nenhum vizinho inimigo a partir daqui.'}
            </Text>
          )}
          {mode === 'move' && selected?.owner === me && (
            <Text style={styles.modeHint}>
              {moveTargetId
                ? `Movendo para ${MAP[moveTargetId].name}…`
                : ownNeighbors.length
                  ? 'Toque num território seu destacado (verde) para mover tropas.'
                  : 'Nenhum território seu vizinho para remanejar.'}
            </Text>
          )}

          {/* Ações do território selecionado */}
          {selected?.owner === me && mode === 'idle' && (
            <View style={styles.ownActions}>
              <Button label="⚒️ Recrutar" onPress={() => setRecruitOpen(true)} style={styles.flex1} />
              <Button
                label="⚔️ Atacar"
                variant="danger"
                disabled={!canAttackFrom || enemyNeighbors.length === 0}
                onPress={() => {
                  setMode('attack');
                  setAttackTarget(null);
                }}
                style={styles.flex1}
              />
              <Button
                label={player.fortifiedThisTurn ? '↔️ Remanejado' : '↔️ Remanejar'}
                variant="secondary"
                disabled={player.fortifiedThisTurn || ownNeighbors.length === 0}
                onPress={() => setMode('move')}
                style={styles.flex1}
              />
            </View>
          )}

          {/* Painel de ataque (modo atacar com alvo escolhido) */}
          {mode === 'attack' && canAttack && (
            <View style={styles.attackBox}>
              <Text style={styles.attackTitle}>Atacar {MAP[attackTargetId!].name}</Text>
              <Text style={styles.focusLabel}>Focar baixas em:</Text>
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
                <Button label="Investida" onPress={() => attack(focus, false)} style={styles.flex1} />
                <Button
                  label="Assalto Total"
                  variant="danger"
                  onPress={() => attack(focus, true)}
                  style={styles.flex1}
                />
              </View>
            </View>
          )}

          {/* Cancelar modo ativo */}
          {mode !== 'idle' && (
            <Button label="✕ Cancelar" variant="secondary" onPress={resetModes} />
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

      <CombatModal
        results={lastCombat}
        onDismiss={() => {
          dismissCombat();
          // Se a batalha terminou (não está mais em curso), sai do modo atacar.
          const lr = lastCombat && lastCombat.length ? lastCombat[lastCombat.length - 1] : null;
          if (lr && !lr.ongoing) resetModes();
        }}
      />

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
            setMode('idle');
          }}
        />
      )}

      <Button label="Menu" variant="secondary" onPress={confirmExit} style={styles.menuBtn} />
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
  modeHint: {
    color: theme.gold,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: theme.bgPanelAlt,
    borderRadius: 8,
    padding: 10,
    overflow: 'hidden',
  },
  focusLabel: { color: theme.textDim, fontSize: 13 },
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
  menuBtn: { position: 'absolute', top: 48, right: 12, paddingVertical: 6, paddingHorizontal: 12 },
});
