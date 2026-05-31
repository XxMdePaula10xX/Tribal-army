import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { theme } from '@/components/theme';
import { UNITS, UNIT_TYPES } from '@/constants/units';
import {
  CARD_TRADE_COST,
  GOLD_PER_TERRITORY,
  INITIAL_GOLD,
  TOTAL_TERRITORIES,
} from '@/constants/game';
import { useGame } from '@/state/store';

// Descrições estáticas dos combos (espelham src/game/combos.ts).
const COMBOS: { name: string; effect: string; cond: string }[] = [
  { name: 'Muralha de Escudos', effect: '+12% defesa', cond: 'só tropas defensivas, ≥4 tipos' },
  { name: 'Carga de Cavalaria', effect: '+15% ataque', cond: '≥50% de cavalaria/cavaleiros' },
  { name: 'Linha de Tiro', effect: '+10% ataque', cond: '≥50% atiradores + 1 de frente' },
  { name: 'Trem de Cerco', effect: '+20% ataque', cond: '≥30% de cerco + 2 escoltas' },
  { name: 'Esquadrão Furtivo', effect: '+12% ataque', cond: '≥40% de ninjas' },
  { name: 'Guarda Lendária', effect: '+5% atk / +10% def', cond: '1 campeão + 2 guardas reais' },
  { name: 'Exército Combinado', effect: '+8% atk / +8% def', cond: '≥6 tipos diferentes' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export function HowToScreen() {
  const goToMenu = useGame((s) => s.goToMenu);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como Jogar</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="🎯 Objetivo">
          <P>
            Conquiste os {TOTAL_TERRITORIES} territórios do mapa. Vence quem
            controlar todos eles — ou quem tiver mais territórios se a partida
            atingir o limite de rodadas.
          </P>
        </Section>

        <Section title="🔄 O seu turno">
          <P>1. Você recebe ouro (renda) no início do turno.</P>
          <P>2. Toque num território seu e recrute tropas com o ouro.</P>
          <P>3. Ataque vizinhos inimigos (veja abaixo).</P>
          <P>4. Encerre o turno para passar a vez.</P>
        </Section>

        <Section title="⚔️ Combate">
          <P>
            Selecione um território seu e toque num vizinho inimigo para marcá-lo
            como alvo. Escolha em quem focar as baixas e ataque:
          </P>
          <P>• <Text style={styles.b}>Investida</Text>: uma troca de dano e reavalia.</P>
          <P>• <Text style={styles.b}>Assalto Total</Text>: ataca até alguém ser zerado.</P>
          <P>
            Atacante e defensor sofrem baixas ao mesmo tempo. Se o defensor for
            zerado, metade dos seus sobreviventes avança e o território é
            conquistado (+1 carta). Se você zerar, o ataque falha.
          </P>
        </Section>

        <Section title="🛡️ Tropas">
          <View style={styles.tableHead}>
            <Text style={[styles.cell, styles.cellName]}>Tropa</Text>
            <Text style={styles.cell}>⚔️</Text>
            <Text style={styles.cell}>🛡️</Text>
            <Text style={styles.cell}>❤️</Text>
            <Text style={[styles.cell, styles.cellCost]}>🪙</Text>
          </View>
          {UNIT_TYPES.map((k) => {
            const u = UNITS[k];
            return (
              <View key={k} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellName]}>
                  {u.icon} {u.name}
                </Text>
                <Text style={styles.cell}>{u.atk}</Text>
                <Text style={styles.cell}>{u.def}</Text>
                <Text style={styles.cell}>{u.hp}</Text>
                <Text style={[styles.cell, styles.cellCost]}>{u.cost}</Text>
              </View>
            );
          })}
        </Section>

        <Section title="✨ Combos">
          <P>
            Composições de exército ativam bônus de ataque/defesa automaticamente:
          </P>
          {COMBOS.map((c) => (
            <View key={c.name} style={styles.combo}>
              <Text style={styles.comboName}>
                {c.name} <Text style={styles.comboEffect}>({c.effect})</Text>
              </Text>
              <Text style={styles.comboCond}>{c.cond}</Text>
            </View>
          ))}
        </Section>

        <Section title="💰 Economia">
          <P>• Você começa com {INITIAL_GOLD} de ouro.</P>
          <P>
            • Renda por rodada: {GOLD_PER_TERRITORY} por território + bônus da
            região (Norte/Estepes/Deserto rendem mais).
          </P>
          <P>
            • Cada conquista dá 1 carta. Troque {CARD_TRADE_COST} cartas por ouro
            — quanto menos territórios você tem, maior a recompensa.
          </P>
        </Section>

        <Section title="💡 Dicas">
          <P>• Concentre tropas numa fronteira para romper as defesas inimigas.</P>
          <P>• Misture tipos de tropa para ativar combos.</P>
          <P>• Segurar uma região inteira maximiza a renda.</P>
        </Section>
      </ScrollView>

      <Button label="Voltar" variant="secondary" onPress={goToMenu} style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: theme.gold, marginBottom: 12 },
  content: { paddingBottom: 16, gap: 18 },
  section: { gap: 4 },
  sectionTitle: { color: theme.gold, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  p: { color: theme.text, fontSize: 14, lineHeight: 20 },
  b: { fontWeight: '800', color: theme.gold },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  cell: { color: theme.text, fontSize: 13, width: 40, textAlign: 'center' },
  cellName: { flex: 1, textAlign: 'left', fontWeight: '600' },
  cellCost: { width: 48 },
  combo: { marginTop: 6 },
  comboName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  comboEffect: { color: theme.success, fontWeight: '600' },
  comboCond: { color: theme.textDim, fontSize: 12 },
  back: { marginTop: 14 },
});
