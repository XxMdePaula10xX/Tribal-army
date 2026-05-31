# ⚔️ Tribal Army

Jogo de estratégia por turnos (estilo WAR / Tribal Wars) reconstruído em
**React Native + Expo**. Conquiste os 40 territórios recrutando tropas,
atacando vizinhos e gerenciando ouro contra IAs.

## Stack

- **Expo** (managed) + **TypeScript**
- **react-native-svg** — renderização do mapa (nós e adjacências)
- **zustand** — estado global
- **@react-native-async-storage/async-storage** — save/load

## Como rodar

```bash
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS) — todas as dependências
nativas usadas (`react-native-svg`) já vêm embutidas no Expo Go, então não é
preciso development build. Em emulador: `npm run android` / `npm run ios`.

```bash
npm run typecheck   # checagem de tipos (tsc)
npm test            # testes unitários (jest)
```

### Harness de balanceamento

`scripts/balance.ts` roda dezenas de partidas só de IAs e mede quantas são
decisivas e a rodada média — útil para ajustar `DMG_SCALE` e a IA:

```bash
npx tsx scripts/balance.ts
```

## Estrutura

```
src/
├── constants/   UNITS, custos, tabelas de IA, DMG_SCALE
├── data/        mapa (carregado de assets/data/map.json) e regiões
├── types/       Army, Player, GameState, CombatResult...
├── game/        lógica pura
│   ├── army.ts      métricas de exército
│   ├── combos.ts    7 combos de composição
│   ├── combat.ts    variância, ordem de baixas, troca de dano
│   ├── economy.ts   renda, custo de recrutamento, cartas
│   ├── engine.ts    recrutar / atacar / conquistar / fim de turno
│   ├── ai.ts        IA (recrutamento, ataque, fortificação)
│   └── setup.ts     criação da partida
├── state/       store zustand (navegação + ações)
├── storage/     persistência (AsyncStorage)
├── components/  MapCanvas (SVG), Button, RecruitPanel, layout, tema
└── screens/     Menu, Setup, Game, GameOver
```

Documento de design técnico completo em [`docs/GDD_TECNICO.md`](docs/GDD_TECNICO.md).

## Regras (resumo)

- **40 territórios** em 8 regiões; cada região dá bônus de ouro por turno.
- **12 tipos de tropa** com atk/def/hp/custo próprios.
- **Combate** com troca simultânea de dano, escala `DMG_SCALE = 0.45`,
  variância de ±10% e **7 combos** de composição.
- **Conquista:** zere as tropas do defensor e metade dos sobreviventes avança.
- **IA** em 3 dificuldades (fácil/médio/difícil) com agressão e margem de
  ataque distintas.
- **Vitória:** controlar todos os 40 territórios.

## Status

Jogo completo e jogável: menu → setup → partida → fim de jogo, com:

- Mapa SVG interativo (seleção, ataque, conquista).
- **Painel de recrutamento** com rascunho — ajusta com +/− e só cobra ao
  confirmar (dá pra remover antes de recrutar).
- **Remanejamento de tropas** entre territórios vizinhos (1 por turno).
- Combate com foco de baixas (investida e assalto total) e **relatório
  detalhado** mostrando quais tropas morreram de cada lado.
- Turnos de IA automáticos (3 dificuldades).
- **Telas de Histórico**, **Configurações** e **Como Jogar**.
- Persistência via AsyncStorage (save, histórico, config).
- **34 testes unitários** cobrindo exército, combos, combate, economia e engine.

### Economia

- Renda base: `GOLD_PER_TERRITORY = 150` por território.
- Bônus de região pago só ao controlar a região **inteira**, proporcional ao
  número de territórios (`REGION_BONUS_PER_TERRITORY = 30` por território).

### Balanceamento

A IA recruta concentrando forças numa cabeça de ponte e fortifica avançando o
grosso do interior. Com `DMG_SCALE = 0.6` e a economia atual, ~68% das partidas
(só de IAs) terminam com conquista total, em média ~35 rodadas; as demais
encerram no limite de rodadas (`MAX_ROUNDS`). Medido por `scripts/balance.ts`.

### Próximos passos

- Redesign visual do mapa (formatos/tamanhos variados, zoom/pan, regiões).
- Animações de combate.
