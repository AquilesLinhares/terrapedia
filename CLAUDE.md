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
- **Fase 3A (feita)**: organização salva no aparelho (localStorage): favoritos, grupos com nome
  (ex.: "Preparar Moon Lord") e lista "Buscar depois" com checkbox "já vi". Acesso pela barra
  de navegação (rodapé no celular, topo no PC). Cada item mostra sprite + nome PT e EN.
- **Fase 3B (feita)**: login com e-mail e senha (Supabase, plano grátis) e biblioteca sincronizada
  entre aparelhos. Sem login tudo continua funcionando só no aparelho. No primeiro login o app
  oferece importar o que já estava salvo no aparelho. Tela de conta em `/conta`.
- **Fase 4 (feita)**: crafting. Receitas baixadas da wiki (`src/data/recipes.json`), tabela de
  receitas e "Usado em" no lugar da seção "Crafting" dos artigos (nomes PT, sprites, links), árvore
  automática em `/arvore/<Item>` (expandir/recolher, quantidade, escolha de receita e de item de grupo,
  materiais totais, bancadas e ordem de crafting) e árvore montada à mão nos grupos (ligações
  "uso X para craftar Y", salvas no Supabase em `group_links`).
- **Futuro**:
  - Páginas reorganizadas por IA (sem custo — ex.: processadas offline / modelos gratuitos)

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- `vite-plugin-pwa` (manifest + service worker)
- React Router (rotas `/`, `/wiki/*`, `/favoritos`, `/depois`, `/grupos`, `/grupos/:id`, `/conta`, `/arvore/*`)

## Estrutura

- `src/lib/wikiApi.ts` — chamadas à API da wiki (busca e parse)
- `src/lib/cleanArticle.ts` — limpa o HTML do artigo e reescreve links/imagens
- `src/lib/ptSearch.ts` — busca local no dicionário PT ↔ EN (normalização + distância de edição)
- `src/data/dictionary.json` — dicionário gerado (formato compacto `[pt, en, tipo, página?]`). Não editar à mão.
- `scripts/` — geração do dicionário e das receitas (veja abaixo)
- `src/data/recipes.json` — receitas geradas por `scripts/build-recipes.mjs`. Não editar à mão.
- `src/lib/recipes.ts` — lê as receitas: `useRecipeBook()`, nomes PT (`ptName`), sprites, "Usado em" (`usesOf`)
- `src/lib/craftTree.ts` — árvore automática (`buildTree`), materiais totais (`computeTotals`) e escolhas salvas
- `src/components/CraftingSection.tsx`, `RecipeList.tsx`, `ItemChip.tsx` — receitas e "Usado em" no artigo
- `src/components/GroupLinkPicker.tsx` — ligar itens dentro de um grupo ("uso X para craftar Y")
- `src/pages/CraftingTreePage.tsx` — página da árvore (`/arvore/<Item>`)
- `src/lib/library.ts` — favoritos, grupos e "buscar depois" (veja "Biblioteca" abaixo)
- `src/lib/supabase.ts` — cliente do Supabase (lê o `.env`; sem `.env` vira `null` e o app fica só local)
- `src/lib/auth.ts` — login: `useAuth()`, `auth.signIn/signUp/signOut`, `onUserChange`
- `src/lib/librarySync.ts` — lê a biblioteca das tabelas e envia só as diferenças
- `supabase/schema.sql` — tabelas e regras de RLS (registro do que foi aplicado no projeto)
- `src/lib/articleRef.ts` — monta o item salvo de um artigo (nome PT do dicionário + sprite da infobox)
- `src/components/SearchBar.tsx` — busca com sugestões
- `src/components/NavBar.tsx` — navegação (`TopNav` no PC, `BottomNav` fixa no rodapé do celular)
- `src/components/ArticleActions.tsx`, `GroupPicker.tsx` — botões Favoritar / Ver depois / Grupo do artigo
- `src/components/SavedArticleRow.tsx` — linha de lista com sprite + nome PT + nome EN
- `src/pages/HomePage.tsx`, `src/pages/ArticlePage.tsx`
- `src/pages/FavoritesPage.tsx`, `ReadLaterPage.tsx`, `GroupsPage.tsx`, `GroupPage.tsx`, `AccountPage.tsx`
- `src/components/ImportPrompt.tsx` — aviso de importar no primeiro login
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

## Receitas (crafting)

`node scripts/build-recipes.mjs` baixa da wiki (com pausas, tenta de novo em caso de 429) a tabela
Cargo `Recipes`, a tabela `Items` (sprites) e os grupos "Any ..." da página
"Alternative crafting ingredients", e grava `src/data/recipes.json` (formato compacto: cada nome
uma vez em `names`, receitas como `[resultado, qtd, bancada, ingrediente, qtd, ...]`). Ficam só as
receitas atuais de PC/console/celular (sem old-gen, 3DS e páginas "Legacy:"). Rode de novo depois de
uma atualização do Terraria.

- **No artigo**: `cleanArticle` move a seção "Crafting" da wiki para `[data-crafting-slot]`; o
  `ArticlePage` desenha `CraftingSection` ali (portal) e esconde o original. Se o app não tiver
  receitas para a página, o original da wiki aparece. Artigos de conjunto ("Copper armor") usam os
  itens que redirecionam para eles (pelo dicionário).
- **Árvore**: não usa receitas de Shimmer, do Extrator de Clorofita nem as que "desfazem" itens
  (parede/plataforma/cerca/prateleira → bloco), para não andar em círculos. Item sem receita = material
  básico. Escolhas (receita, item do grupo, "não craftar") valem para a árvore toda e ficam em
  `terrapedia:craft-choices` no aparelho. Os totais somam itens repetidos antes de arredondar.

## Biblioteca (favoritos, grupos, buscar depois)

Tudo passa por `src/lib/library.ts`. As telas só usam `useLibrary()` (ler), `useSyncStatus()`
(situação da conta) e `library.*` (mudar). Toda mudança passa por `commit()`.

- **Sem login**: salvo no localStorage na chave `terrapedia:library` (como na Fase 3A).
- **Com login**: dados nas tabelas `favorites`, `read_later`, `groups`, `group_items`, `group_links` do Supabase,
  com RLS (cada pessoa só vê as próprias linhas). Uma cópia fica em `terrapedia:cloud:<id>`
  junto com `synced` (último estado confirmado pelo servidor). `commit()` chama `work()`, que
  envia a diferença entre `synced` e os dados atuais (`pushChanges`); sem internet, tenta de novo
  quando a conexão volta ou o app volta pra tela. Ao voltar pra tela também relê do servidor.
- **Importar**: no primeiro login de cada conta em cada aparelho (`terrapedia:import-asked:<id>`),
  se há algo salvo no aparelho, `ImportPrompt` oferece juntar (sem repetir; grupos com o mesmo nome
  se juntam). Os dados do aparelho não são apagados.

Cada artigo salvo guarda `page` (título EN da wiki, é o id), `en`, `pt` e `sprite`. Cada grupo também
guarda `links` (`{ from, to }` = "uso `from` para craftar `to`"); tirar um item do grupo apaga as ligações dele.

## Supabase

Projeto "terrapedia" (região São Paulo). Login por e-mail e senha, sem confirmação de e-mail.
O `.env` (fora do GitHub) tem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` — veja
`.env.example`. A chave pública pode ir pro navegador; quem protege os dados é o RLS. Nunca use a
chave secreta/service_role no app. Ao publicar o site, cadastre essas duas variáveis na hospedagem.
