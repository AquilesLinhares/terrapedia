# Terrapedia — Wiki 2.0 do Terraria

## Visão

Terrapedia é um app web (PWA) que funciona no celular e no PC e mostra o conteúdo da
wiki oficial em inglês do Terraria (https://terraria.wiki.gg) com uma interface própria,
moderna e organizada.

O usuário dono do projeto é iniciante: explique decisões e passos de forma simples, em português.

## Princípios

- **Custo zero**: nada de APIs pagas. Hospedagem gratuita (ex.: GitHub Pages, Netlify, Vercel, Cloudflare Pages).
- **Conteúdo vem da wiki**: usamos a API pública do MediaWiki em `https://terraria.wiki.gg/api.php`
  (sempre com `origin=*` para liberar CORS no navegador). Não copiamos o conteúdo para o repositório.
- **Licença CC BY-NC-SA**: o conteúdo da wiki é CC BY-NC-SA 3.0. Toda página de artigo **sempre**
  mostra crédito à Terraria Wiki e um link para a página original. Projeto sem fins comerciais.
- **Mobile primeiro**: tudo precisa ficar bom numa tela de celular.

## Roadmap

- **Fase 1 (feita)**: busca com sugestões, página de artigo limpa (com infobox, imagens e
  tabelas de crafting), links internos abrindo dentro do app, visual escuro, PWA.
- **Fase 2 (feita)**: busca em português com dicionário PT-BR ↔ EN local (sem acento, sem
  maiúsculas, tolera erro de digitação), mostrando "Lua de Sangue (Blood Moon)".
- **Futuro**:
  - Login (provedor gratuito)
  - Favoritos e grupos de favoritos
  - Lista de "buscar depois"
  - Árvores de crafting interativas
  - Páginas reorganizadas por IA (sem custo — ex.: processadas offline / modelos gratuitos)

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- `vite-plugin-pwa` (manifest + service worker)
- React Router (rotas `/` e `/wiki/*`)

## Estrutura

- `src/lib/wikiApi.ts` — chamadas à API da wiki (busca e parse)
- `src/lib/cleanArticle.ts` — limpa o HTML do artigo e reescreve links/imagens
- `src/lib/ptSearch.ts` — busca local no dicionário PT ↔ EN (normalização + distância de edição)
- `src/data/dictionary.json` — dicionário gerado (formato compacto `[pt, en, tipo, página?]`). Não editar à mão.
- `scripts/` — geração do dicionário (veja abaixo)
- `src/components/SearchBar.tsx` — busca com sugestões
- `src/pages/HomePage.tsx`, `src/pages/ArticlePage.tsx`
- `src/index.css` — tema escuro e estilos do conteúdo da wiki (`.wiki-content`)

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (checa tipos)
- `npm run preview` — testa o build

## Dicionário PT-BR ↔ EN

Fontes, em ordem: nomes oficiais do jogo (itens, NPCs, buffs, biomas, eventos), links de idioma
da wiki (`prop=langlinks`, `lllang=pt`) e `scripts/manual-names.json` (eventos, guias, apelidos).
Só entram **nomes**, nunca descrições/textos do jogo. Os arquivos extraídos do jogo não vão pro repositório.

Para regenerar (ex.: depois de uma atualização do Terraria):

1. `.\scripts\extract-terraria-loc.ps1 -TerrariaExe "D:\SteamLibrary\steamapps\common\Terraria\Terraria.exe" -OutDir C:\temp\terraria-loc`
2. `node scripts/build-dictionary.mjs C:\temp\terraria-loc` (demora alguns minutos: faz pausas pra não sobrecarregar a wiki)

Para adicionar um apelido ou evento, edite `scripts/manual-names.json` e regenere.
