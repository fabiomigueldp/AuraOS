# AuraCitadel Asset Dependencies Analysis

## Asset Dependencies Overview

O jogo **AuraCitadel** depende de vários assets que atualmente não estão presentes no projeto. Após análise detalhada do código-fonte, foram identificadas as seguintes dependências de assets:

---

## 🎵 MÚSICA (Music Assets)

### Arquivos de música necessários:
Todos devem estar localizados no diretório `music/`

1. **music/game_start_or_calm_phase.mp3**
   - **Usado em:** Início do jogo e fases calmas
   - **Função:** `AuraGameSDK.audio.playLoopMusic('music/game_start_or_calm_phase.mp3', 0.5)`
   - **Volume:** 50%
   - **Descrição:** Música de fundo tranquila e atmosférica para o início do jogo e períodos de pausa entre ondas

2. **music/game_resume_or_calm_phase.mp3**
   - **Usado em:** Quando o jogo é retomado de um save
   - **Função:** `AuraGameSDK.audio.playLoopMusic('music/game_resume_or_calm_phase.mp3', 0.5)`
   - **Volume:** 50%
   - **Descrição:** Música similar à de início, para continuidade quando o jogador retoma uma partida salva

3. **music/wave_battle.mp3**
   - **Usado em:** Durante ondas de combate ativo
   - **Função:** `AuraGameSDK.audio.playLoopMusic('music/wave_battle.mp3', 0.6)`
   - **Volume:** 60%
   - **Descrição:** Música mais intensa e dinâmica para momentos de ação durante as ondas de inimigos

4. **music/build_phase.mp3**
   - **Usado em:** Fase de construção entre ondas
   - **Função:** `AuraGameSDK.audio.playLoopMusic('music/build_phase.mp3', 0.4)`
   - **Volume:** 40%
   - **Descrição:** Música de preparação, mais calma que a de batalha mas com tensão crescente

---

## 🔊 EFEITOS SONOROS (Sound Effects)

### Arquivos de som necessários:
Todos devem estar localizados no diretório `sounds/`

**⚠️ PROBLEMA CRÍTICO:** O jogo usa o diretório `sounds/` mas outros jogos do projeto usam `gameassets/sounds/`. Há inconsistência na estrutura de diretórios.

1. **sounds/tower_fire.wav**
   - **Usado em:** Quando uma torre dispara um projétil
   - **Função:** `new Audio('sounds/tower_fire.wav')`
   - **Volume:** Controlado por `AuraGameSDK.audio.getVolume()` (50% default)
   - **Descrição:** Som curto de disparo, similar a laser ou blaster sci-fi

2. **sounds/enemy_death.wav**
   - **Usado em:** Quando um inimigo é eliminado
   - **Função:** `new Audio('sounds/enemy_death.wav')`
   - **Volume:** Controlado por `AuraGameSDK.audio.getVolume()` (30% default)
   - **Descrição:** Som de destruição eletrônica/digital, representando a eliminação de "glitches"

3. **sounds/blueprint_unlocked.wav**
   - **Usado em:** Quando um novo componente/blueprint é desbloqueado
   - **Função:** `new Audio('sounds/blueprint_unlocked.wav')`
   - **Volume:** Controlado por `AuraGameSDK.audio.getVolume()` (70% default)
   - **Descrição:** Som positivo de descoberta/desbloqueio, com tom tecnológico

4. **sounds/tower_place.wav**
   - **Usado em:** Quando uma torre é construída/colocada
   - **Função:** `new Audio('sounds/tower_place.wav')`
   - **Volume:** Controlado por `AuraGameSDK.audio.getVolume()` (50% default)
   - **Descrição:** Som de construção/montagem mecânica

---

## 📁 ESTRUTURA DE DIRETÓRIOS RECOMENDADA

### Diretórios que devem ser criados:

```
AuraOS/
├── sounds/                    # ← NOVO - Para AuraCitadel
│   ├── tower_fire.wav
│   ├── enemy_death.wav
│   ├── blueprint_unlocked.wav
│   └── tower_place.wav
├── music/                     # ← JÁ EXISTE
│   ├── tracks/               # ← JÁ EXISTE
│   │   ├── [arquivos existantes]
│   │   ├── game_start_or_calm_phase.mp3    # ← NOVO
│   │   ├── game_resume_or_calm_phase.mp3   # ← NOVO
│   │   ├── wave_battle.mp3                 # ← NOVO
│   │   └── build_phase.mp3                 # ← NOVO
│   └── covers/               # ← JÁ EXISTE
└── gameassets/               # ← JÁ EXISTE
    ├── sounds/               # ← NÃO EXISTE - Usado por outros jogos
    └── [outros assets]
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. Inconsistência de Estrutura de Diretórios
- **AuraCitadel** usa `sounds/` para efeitos sonoros
- **Outros jogos** (AuraBreaker, AuraPong, etc.) usam `gameassets/sounds/`
- **Recomendação:** Padronizar todos os jogos para usar `gameassets/sounds/`

### 2. Diretório `sounds/` Não Existe
- O diretório `sounds/` não existe no projeto
- Todos os assets de som do AuraCitadel falharão ao carregar
- **Impacto:** Jogo funcionará mas sem efeitos sonoros

### 3. Diretório `gameassets/sounds/` Também Não Existe
- Outros jogos também terão problemas de áudio
- **Impacto:** Nenhum jogo terá efeitos sonoros funcionais

### 4. Arquivos de Música Específicos Faltando
- Apenas 4 arquivos de música existem no projeto
- AuraCitadel precisa de 4 arquivos específicos adicionais
- **Impacto:** Música de fundo não funcionará

---

## 🔧 SOLUÇÕES RECOMENDADAS

### Solução 1: Padronização de Estrutura
1. Criar diretório `gameassets/sounds/`
2. Modificar AuraCitadel.js para usar `gameassets/sounds/` em vez de `sounds/`
3. Criar todos os arquivos de som necessários

### Solução 2: Manter Estrutura Atual
1. Criar diretório `sounds/`
2. Criar todos os arquivos de som necessários
3. Modificar outros jogos para usar `sounds/` também

### Solução 3: Estrutura Híbrida
1. Manter `music/` para música
2. Usar `gameassets/sounds/` para todos os efeitos sonoros
3. Padronizar todos os jogos

---

## 📋 CHECKLIST DE ASSETS NECESSÁRIOS

### Música (4 arquivos):
- [ ] `music/game_start_or_calm_phase.mp3`
- [ ] `music/game_resume_or_calm_phase.mp3`
- [ ] `music/wave_battle.mp3`
- [ ] `music/build_phase.mp3`

### Efeitos Sonoros (4 arquivos):
- [ ] `sounds/tower_fire.wav` (ou `gameassets/sounds/tower_fire.wav`)
- [ ] `sounds/enemy_death.wav` (ou `gameassets/sounds/enemy_death.wav`)
- [ ] `sounds/blueprint_unlocked.wav` (ou `gameassets/sounds/blueprint_unlocked.wav`)
- [ ] `sounds/tower_place.wav` (ou `gameassets/sounds/tower_place.wav`)

### Diretórios:
- [ ] `sounds/` (ou modificar código para usar `gameassets/sounds/`)
- [ ] `gameassets/sounds/` (para consistência com outros jogos)

---

## 🎨 CARACTERÍSTICAS DOS ASSETS

### Música:
- **Gênero:** Eletrônico/Sintético/Sci-Fi
- **Tom:** Futurístico, combina com tema "Aura"
- **Duração:** Loops de 1-3 minutos
- **Formato:** MP3
- **Qualidade:** 128-320 kbps

### Efeitos Sonoros:
- **Estilo:** Eletrônico/Digital/Sci-Fi
- **Duração:** 0.1-2 segundos
- **Formato:** WAV (melhor para efeitos curtos)
- **Qualidade:** 44.1kHz, 16-bit mínimo

---

## 📊 STATUS ATUAL

### Assets Existentes: ❌ 0/8 (0%)
### Assets Necessários: 8 total
- 4 arquivos de música
- 4 efeitos sonoros

### Diretórios:
- `music/tracks/` ✅ Existe
- `sounds/` ❌ Não existe
- `gameassets/sounds/` ❌ Não existe

---

## ⚡ IMPACTO NA EXPERIÊNCIA DO JOGADOR

### Sem os assets:
- ❌ Jogo silencioso (sem imersão sonora)
- ❌ Feedback auditivo ausente para ações do jogador
- ❌ Experiência de jogo incompleta
- ⚠️ Possíveis erros no console do navegador

### Com os assets:
- ✅ Experiência completa e imersiva
- ✅ Feedback auditivo para todas as ações
- ✅ Música adaptativa ao estado do jogo
- ✅ Ambiente sonoro profissional

---

**Conclusão:** O AuraCitadel está funcionalmente completo em termos de código, mas completamente dependente de assets externos que não existem no projeto atual. A criação destes assets é essencial para uma experiência de jogo completa.
