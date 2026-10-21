# Terrapedia — Wiki 2.0 do Terraria

## Visão

Terrapedia é um app web (PWA) que funciona no celular e no PC e mostra o conteúdo da
wiki oficial em inglês do Terraria (https://terraria.wiki.gg) com uma interface própria,
moderna e organizada.

O usuário dono do projeto é iniciante: explique decisões e passos de forma simples, em português.

## Princípios

- **Custo zero**: nada de APIs pagas. Hospedagem gratuita (ex.: GitHub Pages, Netlify, Vercel, Cloudflare Pages).
- **Conteúdo vem da wiki**: usamos a API pública do MediaWiki em `https://terraria.wiki.gg/api.php`
  (sempre com `origin=*` para liberar CORS no navegador). Não copiamos o conteúdo para o repositório
  — a exceção são os resumos da Fase 5 (`src/data/guides/`), escritos com nossas palavras em português,
  que são uma adaptação sob a mesma licença.
- **Licença CC BY-NC-SA**: o conteúdo da wiki é CC BY-NC-SA 3.0. Toda página de artigo **sempre**
  mostra crédito à Terraria Wiki e um link para a página original. Projeto sem fins comerciais.
- **Mobile primeiro**: tudo precisa ficar bom numa tela de celular.
- **Tudo em português**: interface, nomes do jogo (nome oficial PT do dicionário), rótulos das fichas e
  os resumos da Fase 5 (que usam "Modo Difícil", não "Hardmode"). O texto corrido dos artigos completos fica
  em inglês. O original em inglês fica sempre a um clique (botão PT / EN).

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
- **Fase 5 (piloto aprovado, próximas páginas a seguir)**: páginas reorganizadas por IA (escritas pelo
  Claude Code, sem API paga) num formato fixo por tipo, com etiquetas de busca por descrição. Piloto:
  Blood Moon, Eye of Cthulhu e Extractinator.
- **Artigos em português (feito, entre a Fase 5 e as próximas páginas)**: nomes do jogo e rótulos da wiki
  trocados pelo PT e botão PT / EN. A tradução do texto corrido (Translator API do Chrome + cache no
  Supabase) foi removida em 2026-10-21. Veja "Artigos em português" abaixo.
- **Resistência quando a wiki cai (feito)**: mensagens diferentes para sem internet / wiki em manutenção /
  página inexistente e cópia de cada artigo aberto no aparelho. Veja "Quando a wiki cai" abaixo.
- **Mundo compartilhado (feito)**: mundos com código de convite, membros com classe, progresso de chefes/eventos,
  etapa atual, grupos do mundo e atividade. Página `/mundo`. Veja "Mundo compartilhado" abaixo.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- `vite-plugin-pwa` (manifest + service worker)
- React Router (rotas `/`, `/wiki/*`, `/favoritos`, `/depois`, `/grupos`, `/grupos/:id`, `/conta`, `/arvore/*`, `/mundo`)

## Estrutura

- `src/lib/wikiApi.ts` — chamadas à API da wiki (busca e parse) e os erros `PageNotFoundError` / `WikiUnavailableError`
- `src/lib/pageCache.ts` — cópia no aparelho (IndexedDB) dos artigos já abertos
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
- `src/lib/localize.ts` — põe o artigo em português: rótulos e nomes do jogo (`localizeArticle`, `loadGameNames`)
- `src/lib/wikiLabels.ts` — dicionário fixo dos rótulos da wiki (Damage → Dano, Notes → Notas...)
- `src/lib/useLocalizedArticle.ts` — hook do artigo em português (chama `localizeArticle`)
- `src/lib/articleLang.ts` — preferência PT / EN dos artigos (salva no aparelho)
- `src/lib/supabase.ts` — cliente do Supabase (lê o `.env`; sem `.env` vira `null` e o app fica só local)
- `src/lib/auth.ts` — login: `useAuth()`, `auth.signIn/signUp/signOut`, `onUserChange`
- `src/lib/librarySync.ts` — lê a biblioteca das tabelas e envia só as diferenças
- `supabase/schema.sql` — tabelas e regras de RLS (registro do que foi aplicado no projeto)
- `src/lib/world.ts` — mundo compartilhado: `useWorld()`, `useWorldStage()`, `world.*` (veja "Mundo compartilhado")
- `src/lib/progression.ts` — chefes/eventos em ordem (`MILESTONES`) e etapas (`STAGES`, `currentStage`, `stageAtLeast`)
- `src/pages/WorldPage.tsx` — página "Meu mundo"; `src/components/WorldBar.tsx` — faixa do mundo ativo no topo
- `src/lib/articleRef.ts` — monta o item salvo de um artigo (nome PT do dicionário + sprite da infobox)
- `src/components/SearchBar.tsx` — busca com sugestões
- `src/components/NavBar.tsx` — navegação (`TopNav` no PC, `BottomNav` fixa no rodapé do celular)
- `src/components/ArticleActions.tsx`, `GroupPicker.tsx` — botões Favoritar / Ver depois / Grupo do artigo
- `src/components/SavedArticleRow.tsx` — linha de lista com sprite + nome PT + nome EN
- `src/pages/HomePage.tsx`, `src/pages/ArticlePage.tsx`
- `src/pages/FavoritesPage.tsx`, `ReadLaterPage.tsx`, `GroupsPage.tsx`, `GroupPage.tsx`, `AccountPage.tsx`
- `src/components/ImportPrompt.tsx` — aviso de importar no primeiro login
- `src/data/guides/*.json` — páginas reorganizadas (uma por artigo; veja "Páginas reorganizadas" abaixo)
- `src/data/guide-index.json` — etiquetas de busca, gerado por `scripts/build-guides.mjs`. Não editar à mão.
- `src/lib/guides.ts` — formato das páginas reorganizadas, `hasGuide`/`loadGuide` e busca por etiquetas (`searchGuides`)
- `src/components/GuideView.tsx` — desenha a página reorganizada (texto com `[[Item]]`, listas de itens, receitas)
- `src/index.css` — tema escuro e estilos do conteúdo da wiki (`.wiki-content`)

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (checa tipos)
- `npm run preview` — testa o build
- `node scripts/build-guides.mjs` — confere as páginas reorganizadas e gera o índice de etiquetas

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

## Páginas reorganizadas (Fase 5)

Resumos em português escritos a partir do artigo da wiki (lido pela API: `action=parse&prop=wikitext`),
com nossas palavras — nunca copiar trechos longos nem textos do jogo além de mensagens curtas como
"The Blood Moon is rising...". Um arquivo por artigo em `src/data/guides/`, com o nome do título
(`Eye_of_Cthulhu.json`). O formato fixo está em `src/lib/guides.ts`:

- **Todos**: `page` (título EN), `type`, `tags`, `summary`, `facts` (ficha rápida), `tips`, `source` (`revid` e data da revisão lida)
- **evento**: `natural` (quando acontece sozinho), `summon`, `effects`, `enemies`, `drops`
- **chefe**: `summon`, `where`, `prep`, `phases` (`{ name, text[] }`), `drops`
- **item**: `what`, `obtain`, `crafting`, `usedIn` — as receitas e o "Usado em" vêm sozinhos do `recipes.json`;
  essas seções só levam observações extras

Cada seção é `{ text?, groups?, recipesOf? }`. Textos aceitam `[[Iron Bar]]` (item clicável com nome PT + EN e sprite),
`[[Iron Bar|texto]]` e `**negrito**`. Itens sempre pelo nome **em inglês** (o PT vem do dicionário).
`groups` são listas de itens (`"Nome"` ou `{ name, qty?, note? }`) com um título opcional; `recipesOf` mostra a
receita de um item (ex.: o item que invoca o chefe).

**Etiquetas** (`tags`): 15–25 palavras/expressões que alguém usaria sem saber o nome (Extractinator → limo, lodo,
peneira, minério, transformar). A busca soma um ponto por palavra digitada que bate com uma etiqueta (tolerando erro
de digitação) e mais um por etiqueta de várias palavras escrita inteira; resultados com menos da metade dos pontos do
melhor somem. Aparecem nas sugestões com "pela descrição: ..." e na página "não encontrada".

**Na tela**: se o artigo tem resumo, ele aparece no lugar da página da wiki, com o botão "Ver página completa da wiki"
(`?completa=1`). Links com `#Seção` da wiki também abrem a página completa. O crédito no rodapé aponta a revisão usada.

Depois de criar ou editar uma página, rode `node scripts/build-guides.mjs`: ele confere o formato, avisa sobre nomes
de itens que não existem no dicionário/receitas e regenera o `guide-index.json`.

## Artigos em português

Os artigos completos da wiki aparecem em português por padrão (botão **PT / EN** no topo; a escolha fica em
`terrapedia:article-lang`). `useLocalizedArticle` chama `localizeArticle` sobre o HTML já limpo. O texto
corrido fica em inglês (a tradução automática pela Translator API do Chrome foi testada e removida):

1. **Rótulos** (fichas, cabeçalhos de tabela, títulos de seção, "(Forte)", moedas): `WIKI_LABELS` em
   `src/lib/wikiLabels.ts`. Funcionam sempre. Rótulo novo = uma linha nesse arquivo.
2. **Nomes do jogo**: texto dos links, itens das tabelas e título da ficha viram o nome PT (`loadGameNames`).
   Ordem de preferência: `NAME_OVERRIDES` (em `localize.ts`, ex.: "Shimmer" fica em inglês) →
   `scripts/manual-names.json` → tipo do dicionário (item, npc, chefe, evento, bioma, guia, página, buff).
   Apelidos e nomes iguais ao inglês não contam. Nas tabelas e na ficha o nome EN aparece pequeno
   (`.en-name`); no texto, ao passar o mouse (`title`). Nomes no meio do texto (com maiúscula, como a wiki
   escreve) também viram PT (`.game-name`).
   Para achar esses nomes, cada parágrafo/item/célula vira um "trecho" com marcadores `[0]`, `[1]`... no lugar
   de links, imagens e nomes; depois os marcadores voltam a ser os elementos.

Páginas reorganizadas (Fase 5) não passam por isso: já são escritas em português; a "página completa" delas sim.

## Quando a wiki cai

- **Erros diferentes** (`getJson` em `wikiApi.ts`): a wiki em manutenção responde 502/503 com uma página HTML
  ("Maintenance - wiki.gg") sem CORS, e o navegador só diz "falhou". Então, quando o pedido falha, um pedido
  `no-cors` ao `favicon.ico` mostra se o servidor está lá: respondeu → `WikiUnavailableError('maintenance')`;
  não respondeu (ou `navigator.onLine` falso) → `'offline'`. Resposta não-OK ou que não é JSON também é
  `'maintenance'`. Página inexistente continua sendo `PageNotFoundError` (tela "Página não encontrada").
  A tela de erro tem o botão "Tentar de novo".
- **Cópia no aparelho** (`src/lib/pageCache.ts`, IndexedDB `terrapedia` → `pages`): todo artigo que carrega é
  salvo (HTML como veio da wiki, com a data), pelo título pedido e pelo título real. Se a wiki ou a internet
  falhar, o artigo abre da cópia com o aviso "versão salva em [data]". Os resumos da Fase 5 vêm junto com o app
  e funcionam sempre.
- **Sem proxy**: a API é chamada direto do navegador (`origin=*`). Não há proxy de CORS no projeto.
- O service worker (`wiki-cache` em `vite.config.ts`) também guarda respostas da wiki por 7 dias; o IndexedDB
  é a garantia que não expira.

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

## Mundo compartilhado

Só com login. Tudo em `src/lib/world.ts`; as telas usam `useWorld()` (ler), `useWorldStage()` e `world.*` (mudar).

- **Tabelas** (`supabase/schema.sql`, bloco "Mundo compartilhado"): `worlds` (nome, modo `classic`/`expert`/`master`,
  `invite_code` tipo `TERRA-7K2Q`), `world_members` (nome no mundo, `class` `melee`/`ranged`/`magic`/`summoner`,
  `subclass` livre), `world_progress` (um registro por chefe/evento derrotado: `key` = título EN da wiki, quem e quando),
  `world_activity` (só leitura pelo app; escrita por gatilhos do banco). RLS: só membros veem e mexem
  (`private.is_world_member`). Cada um só muda a própria ficha; só quem criou apaga o mundo.
- **Criar / entrar**: funções `create_world` e `join_world` (security definer, porque quem não é membro não vê o
  mundo). O código aceita "TERRA-7K2Q", "terra 7k2q" ou só "7K2Q". Mundo ativo salvo no aparelho em
  `terrapedia:active-world:<id>`; aparece no topo (`WorldBar`). A página `/mundo` relê a cada 20 s.
- **Atividade**: gatilhos gravam "criou o mundo", "entrou", "derrotou X" (ao marcar), "criou o grupo X" e
  "adicionou Y ao grupo X" (itens em grupos do mundo). A página mostra as 20 últimas.
- **Etapa atual**: calculada no app por `currentStage()` a partir das keys derrotadas. Os ids das etapas são fixos e
  em ordem (`start`, `post-eye`, `post-evil`, `post-skeletron`, `hardmode`, `post-mech`, `post-all-mechs`,
  `post-plantera`, `post-golem`, `post-cultist`, `post-moon-lord`). Guias de classe futuros devem usar
  `useWorldStage()` e `stageAtLeast(etapa.id, 'post-skeletron')`. Chefe/evento novo = uma linha em `MILESTONES`.
- **Grupos do mundo**: `groups.world_id` preenchido = grupo do mundo (todos os membros veem, adicionam itens e
  ligações e renomeiam; só quem criou apaga). Vêm junto com a biblioteca (`fetchLibrary`), com `worldId` e `ownerId`.
  Itens e grupos que já existem só mudam os campos editáveis (o banco não deixa trocar dono nem mundo), por isso
  `pushChanges` insere o que é novo e faz `update` só de nome / en / pt / sprite.

## Supabase

Projeto "terrapedia" (região São Paulo). Login por e-mail e senha, sem confirmação de e-mail.
O `.env` (fora do GitHub) tem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` — veja
`.env.example`. A chave pública pode ir pro navegador; quem protege os dados é o RLS. Nunca use a
chave secreta/service_role no app. As duas variáveis também estão cadastradas na Vercel (veja "Publicação").
A tabela `page_translations` (cache das traduções automáticas) foi apagada do Supabase em 2026-10-21. Tudo o que foi aplicado no banco está registrado nesse arquivo.
Em Authentication → URL Configuration, a Site URL é o endereço publicado.

## Publicação

O site está na Vercel (time "Terrapedia", projeto `terrapedia`): **https://terrapedia-wiki.vercel.app**
(o endereço `terrapedia-eta.vercel.app` também funciona). Cada push na `main` publica sozinho, pela ligação da
Vercel com o GitHub. `vercel.json` manda toda rota para o `index.html`, para que recarregar `/grupos`,
`/wiki/...` etc. funcione. Variáveis `VITE_*` mudadas na Vercel só valem depois de uma nova publicação.
