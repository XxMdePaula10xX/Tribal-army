# Tribal Army — Game Design Document (Técnico)

## 1. VISÃO GERAL

**Tribal Army** é um jogo de estratégia por turnos estilo WAR/Tribal Wars. O objetivo é conquistar todos os 40 territórios através de recrutar tropas, atacar inimigos, e gerenciar ouro.

**Plataforma:** React Native + Expo (mobile: iOS e Android)
**Jogadores:** 2-6 (1 humano + IAs)
**Duração média:** 20-30 rodadas

---

## 2. MAPA E TERRITÓRIOS

### 40 Territórios, 8 Regiões

```
NORTE (5 territórios, +300 ouro/rodada):
  Valdoria, Eldermark, Ravencrest, Northreach, Frostwatch

CENTRAL (5 territórios, +250 ouro/rodada):
  Thornheim, Ironvale, Goldmere, Oakenshire, Kingsfall

FERRO (5 territórios, +200 ouro/rodada):
  Stonehelm, Emberfall, Drakenshire, Stormhold, Ashpeak

FLORESTAS (5 territórios, +250 ouro/rodada):
  Redwyn, Greenbarrow, Mistwood, Brightwall, Wolfgard

COSTA (5 territórios, +200 ouro/rodada):
  Wyverncoast, Silverfen, Sunspire, Falconridge, Crownhaven

SOMBRAS (5 territórios, +200 ouro/rodada):
  Shadowfen, Duskmire, Ashenford, Blackhollow, Grimmoor

ESTEPES (5 territórios, +300 ouro/rodada):
  Thornfen, Wildreach, Hollowmere, Farsteppe, Windmoor

DESERTO (5 territórios, +350 ouro/rodada):
  Dunereach, Sandgate, Scorchend, Emberwaste, Sunpeak
```

**Adjacências:** cada território tem 2-4 vizinhos (grafo conectado, totalmente validado).

**Propriedades de cada território:**
```typescript
interface Territory {
  id: string;
  name: string;
  region: string;
  adjacentTo: string[];
  owner: number | 'neutral'; // índice do jogador ou 'neutral'
  army: Army; // objeto com quantidade de cada tropa
}
```

---

## 3. TROPAS (12 TIPOS)

Cada tropa tem: **ataque**, **defesa**, **vida (HP)**, **custo em ouro**, e um **ícone/emoji**.

```typescript
interface Unit {
  name: string;
  atk: number;    // força de ataque
  def: number;    // força de defesa
  hp: number;     // vida (pontos de vida)
  cost: number;   // custo em ouro pra recrutar
  icon: string;   // emoji ou ícone visual
}

const UNITS = {
  lanceiro:      { name: 'Lanceiro',         atk: 2,  def: 4,  hp: 6,  cost: 50,  icon: '🛡' },
  espadachim:    { name: 'Espadachim',       atk: 4,  def: 4,  hp: 7,  cost: 80,  icon: '⚔️' },
  arqueiro:      { name: 'Arqueiro',         atk: 5,  def: 2,  hp: 4,  cost: 70,  icon: '🏹' },
  cavalaria:     { name: 'Cavalaria',        atk: 8,  def: 3,  hp: 8,  cost: 150, icon: '🐎' },
  escudeiro:     { name: 'Escudeiro',        atk: 1,  def: 6,  hp: 9,  cost: 70,  icon: '🛡️' },
  ninja:         { name: 'Ninja',            atk: 7,  def: 1,  hp: 3,  cost: 90,  icon: '🥷' },
  besteiro:      { name: 'Besteiro',         atk: 6,  def: 3,  hp: 5,  cost: 100, icon: '🎯' },
  guardareal:    { name: 'Guarda Real',      atk: 3,  def: 9,  hp: 12, cost: 160, icon: '💂' },
  cavaleiro:     { name: 'Cavaleiro Pesado', atk: 9,  def: 6,  hp: 14, cost: 200, icon: '🐴' },
  catapulta:     { name: 'Catapulta',        atk: 12, def: 1,  hp: 4,  cost: 220, icon: '🪨' },
  morteiro:      { name: 'Morteiro',         atk: 14, def: 2,  hp: 5,  cost: 280, icon: '💥' },
  campeao:       { name: 'Campeão',          atk: 10, def: 10, hp: 18, cost: 350, icon: '👑' },
};

interface Army {
  lanceiro: number;
  espadachim: number;
  arqueiro: number;
  cavalaria: number;
  escudeiro: number;
  ninja: number;
  besteiro: number;
  guardareal: number;
  cavaleiro: number;
  catapulta: number;
  morteiro: number;
  campeao: number;
}
```

---

## 4. SISTEMA DE COMBATE

### 4.1 Conceitos

- **Força de Ataque:** `sum(quantidade[tropa] × ataque[tropa])` do atacante
- **Força de Defesa:** `sum(quantidade[tropa] × defesa[tropa])` do defensor
- **Combos:** multiplicadores aplicados à força (vide seção 5)
- **Bônus Regional:** multiplicadores do ouro (nenhum bônus de atk/def/costRed — sempre 0)
- **Variância:** ±10% aleatória no dano
- **Vida (HP):** cada tropa tem pontos de vida; morre quando chega a zero

### 4.2 Uma Troca de Dano (Round)

1. Calcula força de ataque: `baseAtk × comboAtk × (1 + regionBonusAtk) × variance()`
2. Calcula força de defesa: `baseDef × comboDef × (1 + regionBonusDef) × variance()`
3. **Troca simultânea:**
   - O dano do atacante é aplicado às tropas defensoras (matando-as por ordem de prioridade)
   - O dano do defensor é aplicado às tropas atacantes (matando-as por ordem padrão)
4. Ambos os lados sofrem baixas ao mesmo tempo (não é sequencial)

### 4.3 Aplicação de Dano

```typescript
function applyDamage(army: Army, dano: number, priorityOrder: string[]): number {
  let killed = 0;
  let remaining = dano + (army._wound || 0); // acumula ferimentos entre rodadas
  
  for (const unitType of priorityOrder) {
    while (army[unitType] > 0 && remaining >= UNITS[unitType].hp) {
      remaining -= UNITS[unitType].hp;
      army[unitType]--;
      killed++;
    }
  }
  
  army._wound = (armySize(army) > 0) ? remaining : 0; // guarda ferimento pra próxima rodada
  return killed;
}
```

**Ordem de prioridade de baixas (foco do atacante):**
- `'default'`: tropas mais frágeis (menor HP) primeiro
- `'atkHigh'`: maior ataque primeiro (derruba catapultas)
- `'atkLow'`: menor ataque primeiro (poupa as ameaças)
- `'defHigh'`: maior defesa primeiro (quebra muralhas)
- `'defLow'`: menor defesa primeiro (mata rápido)

### 4.4 Resultado de Uma Rodada

```typescript
interface CombatResult {
  aRes: number;           // dano do atacante
  dRes: number;           // dano do defensor
  aLoss: number;          // tropas atacantes mortas
  dLoss: number;          // tropas defensoras mortas
  aSizeBefore: number;    // tamanho do exército atacante antes
  dSizeBefore: number;    // tamanho do exército defensor antes
  aSizeAfter: number;     // tamanho do exército atacante depois
  dSizeAfter: number;     // tamanho do exército defensor depois
  aWound: number;         // ferimento acumulado do atacante
  dWound: number;         // ferimento acumulado do defensor
  conquered: boolean;     // defensor zerado e atacante sobreviveu
  mutualWipe: boolean;    // ambos zeraram
  ongoing: boolean;       // batalha continua (ambos têm tropas)
}
```

### 4.5 Conquista

- **Conquista:** defensor chega a 0 tropas e atacante tem ≥1
  - Atacante move metade das tropas sobreviventes (arredondado pra baixo, mínimo 1) pro território conquistado
  - Defensor é varrido
- **Derrota:** atacante chega a 0 tropas
  - Nada muda, ataque falhou
- **Aniquilação Mútua:** ambos chegam a 0
  - Território vira neutro com 1 tropa simbólica

### 4.6 Fator de Escala de Dano

```typescript
const DMG_SCALE = 0.45;
const actualDamage = calculatedDamage × DMG_SCALE;
```

Isso torna o combate gradual (exige vários ataques pra vencer). Ajuste pra mais rápido/lento conforme necessário.

---

## 5. COMBOS (7 tipos)

Combos são bônus aplicados à força de ataque/defesa quando a composição do exército atende certas condições.

```typescript
interface Combo {
  name: string;
  condition: (army: Army) => boolean;
  atkMult: number;
  defMult: number;
}

const COMBOS = [
  {
    name: 'Muralha de Escudos',
    condition: (a) => {
      const defensive = ['lanceiro', 'espadachim', 'escudeiro', 'guardareal'];
      const onlyDef = defensive.every(k => a[k] >= 0) && 
                      Object.keys(a).filter(k => a[k] > 0).every(k => defensive.includes(k));
      return onlyDef && Object.keys(a).filter(k => a[k] > 0).length >= 4;
    },
    atkMult: 1.0,
    defMult: 1.12,
  },
  {
    name: 'Carga de Cavalaria',
    condition: (a) => {
      const cav = a.cavalaria + a.cavaleiro;
      const total = armySize(a);
      return total > 0 && (cav / total) >= 0.5;
    },
    atkMult: 1.15,
    defMult: 1.0,
  },
  {
    name: 'Linha de Tiro',
    condition: (a) => {
      const arq = a.arqueiro + a.besteiro;
      const frente = a.lanceiro + a.espadachim + a.cavalaria + a.cavaleiro + a.guardareal;
      const total = armySize(a);
      return total > 0 && (arq / total) >= 0.5 && frente >= 1;
    },
    atkMult: 1.10,
    defMult: 1.0,
  },
  {
    name: 'Trem de Cerco',
    condition: (a) => {
      const cerco = a.catapulta + a.morteiro;
      const escolta = a.lanceiro + a.espadachim + a.guardareal;
      const total = armySize(a);
      return total > 0 && (cerco / total) >= 0.3 && escolta >= 2;
    },
    atkMult: 1.20,
    defMult: 1.0,
  },
  {
    name: 'Esquadrão Furtivo',
    condition: (a) => {
      const total = armySize(a);
      return total > 0 && (a.ninja / total) >= 0.4;
    },
    atkMult: 1.12,
    defMult: 1.0,
  },
  {
    name: 'Guarda Lendária',
    condition: (a) => a.campeao >= 1 && a.guardareal >= 2,
    atkMult: 1.05,
    defMult: 1.10,
  },
  {
    name: 'Exército Combinado',
    condition: (a) => {
      const types = Object.keys(a).filter(k => a[k] > 0).length;
      return types >= 6;
    },
    atkMult: 1.08,
    defMult: 1.08,
  },
];
```

**Aplicação:** antes de calcular o dano, verifica quais combos o exército ativa, multiplica atkMult e defMult.

---

## 6. ECONOMIA E TURNOS

### 6.1 Ouro

- **Ouro inicial:** 500 por jogador
- **Renda por rodada:**
  - Base: 200 ouro por território controlado
  - Bônus regional: +ouro adicional por cada território na região (vide seção 2)
  - **Primeiro turno não recebe renda** (flag `firstTurnDone`)

**Exemplo:** controlar 3 territórios (Valdoria na Norte, Thornheim na Central, Stonehelm no Ferro):
- Base: 3 × 200 = 600
- Bônus: +300 (Norte) +250 (Central) +200 (Ferro) = 750
- Total: 1350 ouro

### 6.2 Turno

1. **Recrutamento:** gastar ouro pra recrutar tropas no seu território
2. **Ataques:** atacar vizinhos inimigos (investidas ou assaltos)
3. **Fortificação:** mover tropas entre seus 2 territórios adjacentes (1 movimento por turno)
4. **Encerrar turno:** passa pro próximo jogador

### 6.3 Sistema de Cartas de Comeback

- Cada conquista de território = +1 carta
- Pode trocar 3 cartas por ouro: `reward = round(200 + (1 - controlledTerritories/40) × 600)`
  - Quanto menos territórios você tem, mais ouro ganha (favor ao perdedor)

### 6.4 Rodada

Uma rodada = todos os jogadores vivos fizeram um turno cada. Após a rodada, próxima fase:
- Incrementa `round`
- Paga ouro (renda regional)
- Verifica vitória (alguém conquistou todos os 40?)

---

## 7. IA (3 Dificuldades)

### 7.1 Recrutamento

```typescript
const aggression = {
  facil: 0.4,
  medio: 0.65,
  dificil: 0.9,
};

// IA gasta ouro de forma agressiva:
// fácil = conservador, médio = equilibrado, difícil = máximo agressivo
```

Tipo de tropa preferido:
- **Fácil:** tropas básicas e baratas (lanceiro, espadachim)
- **Médio:** mistura (alguns elite como cavalaria)
- **Difícil:** elite (cavaleiros, catapultas, morteiros, campeões)

### 7.2 Ataque

```typescript
const margin = {
  facil: 1.30,    // precisa de vantagem clara
  medio: 1.15,    // vantagem moderada
  dificil: 1.0,   // ataca mesmo com paridade
};

// condição de ataque:
if (myAttack >= targetDefense × margin) {
  // ataca
}
```

1. Escolhe o alvo mais fácil (menor defesa efetiva entre vizinhos inimigos)
2. Se atender a margem de segurança, ataca (assalto total até conquistar ou falhar)
3. Se conquistar, marca aquele território como tendo conquistado neste turno (limite de 1 por turno)

### 7.3 Foco de Alvo

- **Fácil:** padrão (mais frágeis primeiro)
- **Médio:** padrão
- **Difícil:** `atkHigh` (derruba as ameaças ofensivas primeiro)

### 7.4 Fortificação

Move 1 tropa por turno de um território seguro (interior) pra um vizinho na fronteira, reforçando defesas.

---

## 8. ESTADOS DO JOGO

```typescript
interface GameState {
  round: number;
  phase: 'menu' | 'setup' | 'playing' | 'gameover';
  currentPlayerIdx: number;
  firstTurnDone: boolean;
  
  players: Player[];
  territories: Territory[];
  
  selected: string | null;      // ID do território selecionado
  attackTarget: string | null;  // ID do alvo de ataque
  
  log: LogEntry[];
  history: GameSnapshot[];
}

interface Player {
  idx: number;
  name: string;
  color: string;
  isHuman: boolean;
  difficulty: 'facil' | 'medio' | 'dificil';
  gold: number;
  cards: number;
  conqueredThisTurn: boolean;
}
```

---

## 9. PERSISTÊNCIA

- **Save:** localStorage (ou AsyncStorage em React Native)
- **Chave:** `tribalArmy_save` (game state inteiro)
- **Histórico:** `tribalArmy_history` (lista de partidas finalizadas)
- **Config:** `tribalArmy_config` (preferências do jogador)

---

## 10. FLUXO DE JOGO

### 10.1 Menu Principal

- Novo Jogo
- Continuar
- Histórico
- Como Jogar
- Configurações

### 10.2 Setup

- Escolher número de jogadores (2-6)
- Dar nome a cada jogador (humano vs IA)
- Escolher cores
- Escolher dificuldade de cada IA
- Distribuir 40 territórios igualmente (4 ou 5 pra cada)

### 10.3 Gameplay

**Loop de um turno (jogador humano ou IA):**

1. **Recebimento de renda** (se não é o primeiro turno)
2. **Recrutamento** (escolher tropas e gastar ouro)
3. **Ataques** (escolher origem, alvo, foco, intensidade)
4. **Fortificação** (opcional: mover 1 lote entre vizinhos)
5. **Encerrar turno** (passa pro próximo jogador)

Se IA:
- Recruta de forma automática (algoritmo simples baseado em ouro/dificuldade)
- Ataca os vizinhos com menor defesa (conforme margem de dificuldade)
- Fortifica internamente

### 10.4 Condição de Vitória

- Alguém controla todos os 40 territórios → **Vitória!**
- Ou, se houver timeout/limite de rodadas (ex: 100), empate

---

## 11. INTERFACE (Mobile)

### 11.1 Tela Principal (Gameplay)

- **Topo:** ouro, rodada, nome do jogador atual, bônus visuais
- **Centro:** mapa dos 40 territórios (clicável)
- **Direita/Bottom:** painel lateral com:
  - Info do território selecionado
  - Recrutamento (lista de tropas, botões +)
  - Log de eventos
  - Botões de ação (Investida, Assalto, Fortificar, Encerrar)

### 11.2 Mapa

Cada território é um círculo clicável com:
- Nome do território
- Ícone do dono (cor)
- Número de tropas

Linhas conectam vizinhos adjacentes.

### 11.3 Painel de Recrutamento

Accordion com lista de 12 tropas. Cada linha mostra:
- Ícone + nome
- ⚔️ ataque, 🛡️ defesa, ❤️ vida
- 🪙 custo
- Quantidade atual
- Botão + pra recrutar

### 11.4 Botões de Ataque

Quando um alvo é marcado:
- **Seletor de foco:** "Focar baixas em..." (dropdown com 5 opções)
- **Investida:** 1 troca de dano, reavalia
- **Assalto Total:** repete até alguém zerar

### 11.5 Modal de Combate

Mostra:
- Dano do atacante (base × combo × sorte) → resultado
- Dano do defensor (idem)
- Baixas dos dois lados
- Resultado (conquistado / repelido / aniquilação mútua)

---

## 12. FÓRMULAS CHAVE

```typescript
// Calcular força de um exército
function armyAttack(army: Army): number {
  return Object.keys(UNITS).reduce((sum, k) => sum + (army[k] || 0) * UNITS[k].atk, 0);
}

function armyDefense(army: Army): number {
  return Object.keys(UNITS).reduce((sum, k) => sum + (army[k] || 0) * UNITS[k].def, 0);
}

function armySize(army: Army): number {
  return Object.keys(UNITS).reduce((sum, k) => sum + (army[k] || 0), 0);
}

// Variância ±10%
function variance(): number {
  return 0.90 + Math.random() * 0.20; // [0.90, 1.10]
}

// Dano efetivo
const baseDamage = attackForce × comboMultiplier × (1 + regionBonus) × variance();
const actualDamage = baseDamage × DMG_SCALE; // 0.45

// Renda de troca de cartas
const reward = Math.round(200 + (1 - controlledTerritories / 40) * 600);
```

---

## 13. DADOS PARA PRÉ-POPULAR

### Mapa (JSON com adjacências)

```json
{
  "territories": [
    {
      "id": "valdoria",
      "name": "Valdoria",
      "region": "norte",
      "adjacentTo": ["eldermark", "thornheim", "frostwatch"]
    },
    ...
  ]
}
```

(Vide seção 2 para lista completa dos 40 territórios e suas adjacências — todos validados, grafo totalmente conectado)

---

## 14. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Estrutura de dados (territories, players, game state)
- [ ] Lógica de recrutamento
- [ ] Sistema de combate (aplicação de dano, combos)
- [ ] IA (recrutamento, ataque, fortificação)
- [ ] Economia (renda, custo de tropas, cartas)
- [ ] Persistência (save/load)
- [ ] Interface mobile (mapa, painel, botões)
- [ ] Fluxo de jogo (menu → setup → gameplay → vitória)
- [ ] Feedback visual (modal de combate, log, animações)

---

## NOTAS IMPORTANTES

1. **DMG_SCALE = 0.45** foi calibrado pra dar partidas de ~25 rodadas com IA. Ajuste se quiser mais rápido/lento.
2. **Bônus regionais** de ouro são o incentivo principal pra manter territórios. Não há bônus de ataque/defesa — só ouro.
3. **Ferimentos acumulam** entre rodadas de combate na mesma sequência de ataque. Limpam quando a batalha termina.
4. **Fortificação** é 1 movimento de tropa entre 2 vizinhos seus por turno — clássico do WAR.
5. **IA difícil** é bem competente mas não imbatível — ajuste as margens se ficar muito fácil/difícil.

---

**Data de criação:** 30/05/2026  
**Versão:** 1.0 (HTML/JS → React Native)
