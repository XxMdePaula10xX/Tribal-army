# ⚔️ Tribal Army

Jogo de estratégia por turnos (estilo WAR / Tribal Wars) reconstruído em
**React Native + Expo**. Conquiste os 40 territórios recrutando tropas,
atacando vizinhos e gerenciando ouro contra IAs.

## Stack

- **Expo** (managed) + **TypeScript**
- **@shopify/react-native-skia** — renderização do mapa (canvas 2D)
- **zustand** — estado global
- **@react-native-async-storage/async-storage** — save/load

## Como rodar

```bash
npm install
npx expo start
```

Abra no **Expo Go** (Android/iOS) lendo o QR code, ou rode em emulador com
`npm run android` / `npm run ios`.

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
├── components/  MapCanvas (Skia), Button, layout, tema
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

- Mapa Skia interativo (seleção, ataque, conquista).
- **Painel de recrutamento completo** — os 12 tipos com stats, custo,
  quantidade atual e botões +1/+5.
- Combate com foco de baixas (investida e assalto total) + modal de resultado.
- Turnos de IA automáticos (3 dificuldades).
- **Telas de Histórico** (partidas finalizadas) e **Configurações**
  (dificuldade/jogadores padrão, apagar dados).
- Persistência via AsyncStorage (save, histórico, config).
- **32 testes unitários** cobrindo exército, combos, combate, economia e engine.

### Balanceamento

A IA recruta concentrando forças numa cabeça de ponte e fortifica avançando o
grosso do interior; com `DMG_SCALE = 0.6` as partidas decidem em ~78% dos casos
em média ~30 rodadas (medido pela harness). O caso de 4 IAs difíceis ainda pode
empatar por estagnação e encerra no limite de rodadas (`MAX_ROUNDS`) — knob
aberto para tuning futuro.

### Próximos passos sugeridos

- Animações de combate e movimentação de tropas.
- Tela "Como Jogar".
- Ajuste fino das posições do mapa (hoje geradas por região).
