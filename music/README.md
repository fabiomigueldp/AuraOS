# 🎵 AuraOS Music Library

Esta pasta contém a biblioteca de música local do AuraOS.

## 📁 Estrutura

```
music/
├── tracks/          # Arquivos de áudio (.mp3, .m4a, .wav, .flac, .ogg)
├── covers/          # Capas das músicas (.png, .jpg, .jpeg, .webp, .gif)
└── README.md        # Este arquivo
```

## ➕ Como Adicionar Nova Música

### 1. **Prepare os Arquivos**
- **Arquivo de música**: Coloque em `tracks/` com nome no formato: `artista_-_titulo.extensao`
- **Capa (opcional)**: Coloque em `covers/` com o mesmo nome base: `artista_-_titulo.png`

### 2. **Convenção de Nomenclatura**
- Use **underscore (_)** para espaços
- Use **`_-_`** para separar artista do título
- Evite caracteres especiais
- Extensões suportadas:
  - **Áudio**: `.mp3`, `.m4a`, `.wav`, `.flac`, `.ogg`
  - **Imagem**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

### 3. **Exemplos de Nomes Válidos**
```
✅ beethoven_-_fur_elise.mp3
✅ the_beatles_-_hey_jude.m4a
✅ pink_floyd_-_another_brick_in_the_wall.wav
✅ daft_punk_-_one_more_time.flac
```

### 4. **Registrar no Sistema**
Abra o arquivo `index.html` e localize a seção **MUSIC LIBRARY REGISTRY** (por volta da linha 2920).

Adicione sua entrada no array `musicRegistry`:

```javascript
{
    name: 'artista_-_titulo',
    audioFile: 'artista_-_titulo.mp3',
    coverFile: 'artista_-_titulo.png'  // ou null se não tiver capa
}
```

### 5. **Exemplo Completo**

Para adicionar "Bohemian Rhapsody" do Queen:

1. **Adicione os arquivos:**
   - `tracks/queen_-_bohemian_rhapsody.mp3`
   - `covers/queen_-_bohemian_rhapsody.jpg`

2. **Registre no código:**
```javascript
{
    name: 'queen_-_bohemian_rhapsody',
    audioFile: 'queen_-_bohemian_rhapsody.mp3',
    coverFile: 'queen_-_bohemian_rhapsody.jpg'
}
```

3. **Teste:**
   - Abra o AuraOS
   - Vá para o Aura Music
   - Clique no botão 🔍 "Descobrir Arquivos"
   - A música aparecerá na playlist!

## 🎯 Músicas Atuais

- **Beethoven** - Für Elise
- **Bennett** - Vois Sur Ton Chemin  
- **Local Artist** - Gape Noster

## 🔧 Dicas

- **Sem capa?** Deixe `coverFile: null` no registro
- **Múltiplos formatos?** Prefira MP3 para melhor compatibilidade
- **Problemas?** Verifique o console do navegador (F12) para logs detalhados
- **Performance:** O sistema carrega arquivos automaticamente no IndexedDB para acesso offline

## 🎨 Capas Recomendadas

- **Resolução:** 300x300px ou maior (quadrada)
- **Formato:** PNG para melhor qualidade, JPG para menor tamanho
- **Tamanho:** Máximo 2MB por imagem
