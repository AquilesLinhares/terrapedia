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
- **Lote de melhorias leves (feito, 2026-10-21)**: velocidade (cópia do aparelho na hora + pré-carregamento),
  Ctrl+K e histórico, checklist "já tenho" na árvore, notas nos artigos, busca por voz e janela compacta.
  Veja "Melhorias leves" abaixo.
- **Acesso rápido flutuante (feito, 2026-10-22)**: janelinha "glass" que fica por cima do jogo (Document
  Picture-in-Picture, Chrome/Edge no PC) com itens fixados, favoritos, buscar depois e etapa do mundo.
  Veja "Acesso rápido flutuante" abaixo.
- **Guias de classe (feito: Invocador e Mago em 2026-10-22, À distância e Corpo a corpo em 2026-10-23)**: uma página por
  classe em `/classes/<classe>`, etapas iguais às do mundo compartilhado, abas Resumo e Detalhado (mapa de caminhos), filtro
  de subclasse e selos Expert/Mestre. Veja "Guias de classe" abaixo.
- **Ferramentas de jogo, lote A — combate (feito, 2026-10-23)**: página `/ferramentas` no menu com Calculadora de lacaios,
  Melhor modificador, Checklist de buffs (salvo no mundo), Planejador de arena e Comparador de itens. Dados das tabelas Cargo da
  wiki. Veja "Ferramentas" abaixo.
- **Ferramentas de jogo, lote B — NPCs e mundo (feito, 2026-10-23)**: Felicidade dos NPCs (casas salvas no mundo), Vendedores
  (lojas, chegada, "quem vende?") e Condições de chefes e eventos. Veja "Ferramentas" abaixo.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- `vite-plugin-pwa` (manifest + service worker)
- React Router (rotas `/`, `/wiki/*`, `/favoritos`, `/depois`, `/grupos`, `/grupos/:id`, `/conta`, `/arvore/*`, `/mundo`, `/historico`,
  `/classes`, `/classes/:slug`, `/ferramentas`, `/ferramentas/lacaios`, `/ferramentas/modificador`, `/ferramentas/buffs`,
  `/ferramentas/arena`, `/ferramentas/comparar`, `/ferramentas/felicidade`, `/ferramentas/vendedores`, `/ferramentas/condicoes`).
  Só `HomePage` e `ArticlePage` vão no pacote principal; as outras telas são `lazy()` em `main.tsx`.

## Estrutura

- `src/lib/wikiApi.ts` — chamadas à API da wiki (busca e parse) e os erros `PageNotFoundError` / `WikiUnavailableError`
- `src/lib/pageCache.ts` — cópia no aparelho (IndexedDB) dos artigos já abertos
- `src/lib/articleLoader.ts` — `getArticle` (reaproveita pedidos de até 5 min e salva no aparelho), `prefetchArticle`, `installLinkPrefetch`
- `src/lib/recent.ts` — histórico das últimas 30 páginas (`useRecent()`, `recent.*`); tela `src/pages/HistoryPage.tsx`
- `src/lib/notes.ts`, `src/components/NoteBox.tsx` — notas nos artigos (minha / do mundo)
- `src/lib/craftChecks.ts` — checklist "já tenho" da árvore de crafting
- `src/lib/voiceSearch.ts` — busca por voz (Web Speech API)
- `src/lib/quickWindow.ts` — abre/fecha a janelinha flutuante (`openQuickWindow`, `useQuickWindow`, `quickWindowSupported`)
- `src/components/QuickWindow.tsx` — `QuickWindowHost` (portal no Layout), botão do menu e cartão da página inicial;
  `src/components/QuickPanel.tsx` — conteúdo da janelinha (baixado só quando ela abre)
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
- `src/data/classes/<classe>.json` — guias de classe (`summoner.json`...); `src/lib/classGuides.ts` — formato, `CLASS_LIST`, `loadClassGuide`
- `src/data/exclusive-items.json` — itens exclusivos de Expert/Mestre citados nos guias, gerado por `scripts/build-classes.mjs`. Não editar à mão.
- `src/pages/ClassesPage.tsx` (`/classes`), `src/pages/ClassGuidePage.tsx` (`/classes/:slug`), `src/components/ClassSummary.tsx` (aba Resumo),
  `ClassPathMap.tsx` (aba Detalhado), `ClassItems.tsx` (itens, sprites e selo Expert/Mestre)
- `src/data/tools-data.json` — dados das Ferramentas, gerado por `scripts/build-tools.mjs`. Não editar à mão.
- `src/lib/toolsData.ts` — lê os dados (`useToolsData()`), `SET_NAMES` (nomes PT dos conjuntos), etapa/classe das ferramentas
  (`useToolStage()`, `useToolClass()`) e `useDefeated()`
- `src/lib/minionCalc.ts`, `bestModifier.ts`, `bossPrep.ts` (buffs e arena por chefe), `buffChecks.ts`, `itemCompare.ts` — lógica de cada ferramenta
- `src/lib/worldChecklist.ts` — checklist salvo no mundo ativo ou no aparelho (usado pela árvore e pelos buffs)
- `src/pages/ToolsPage.tsx` (cartões, lista `TOOLS`), `src/pages/tools/*Page.tsx` (uma por ferramenta),
  `src/components/ToolsUI.tsx` (cabeçalho, etapa, classe, busca de itens, `SetChip`), `BossPicker.tsx` (`useBoss()`, `?chefe=`)
- `src/data/npc-data.json` — preferências e lojas dos NPCs, gerado por `scripts/build-npcs.mjs`. Não editar à mão.
- `src/lib/npcs.ts` — NPCs: `useNpcData()`, `NPCS` (como chega, etapa, vendedor), `BIOMES`, felicidade (`npcMood`, `housePylon`,
  `suggestHouses`), `conditionUnlocked`; `src/lib/npcHouses.ts` — casas salvas (`useNpcHouses()`); `src/components/NpcName.tsx`
- `src/lib/bossSummons.ts` — como invocar cada chefe/evento (`SUMMONS`, `SUMMON_LIST`, `EXTRA_EVENTS`)
- `src/index.css` — tema escuro e estilos do conteúdo da wiki (`.wiki-content`)

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (checa tipos)
- `npm run preview` — testa o build
- `node scripts/build-guides.mjs` — confere as páginas reorganizadas e gera o índice de etiquetas
- `node scripts/build-classes.mjs` — confere os guias de classe e gera os selos Expert/Mestre (precisa de internet)
- `node scripts/build-tools.mjs [pasta-loc]` — baixa os dados das Ferramentas (precisa de internet; veja "Ferramentas")
- `node scripts/build-npcs.mjs` — baixa preferências e lojas dos NPCs (precisa de internet; veja "Ferramentas")

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
- **Checklist "já tenho"** (`src/lib/craftChecks.ts`, `useCraftChecks(item)`): caixinha em cada item da árvore e nos
  materiais totais. Item marcado não é aberto (`buildTree`/`computeTotals` recebem `have`), então totais, bancadas e
  ordem de crafting descontam o que já tenho. Lista por árvore (item final). Com mundo ativo fica na tabela
  `world_craft_checks` (membros veem e mudam; relê a cada 20 s); sem mundo, em `terrapedia:craft-checks`.

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

## Guias de classe

Um arquivo por classe em `src/data/classes/` com o nome do `PlayerClass` (`summoner.json`, depois `magic.json`, `melee.json`,
`ranged.json`). Classe sem arquivo aparece como "em breve" em `/classes`. Fonte: "Guide:Class setups" da wiki (só a parte da
classe) + páginas dos itens, organizados com nossas palavras e na versão atual do jogo (1.4.5). As armas vão na subclasse pela
categoria da wiki (campo `listcat` da tabela Cargo `Items`): no Mago, "wands" → Cajados, "spell books" → Livros de magia, o resto
(armas de fogo mágicas, instrumentos...) → Armas mágicas. Em À distância, "bows"/"repeaters" → Arcos, "guns" → Armas de fogo,
"launchers" e as armas especiais (estrelas, gel, dardos — as que o Shroomite Helmet reforça) → Lançadores, itens jogados → Arremesso
(sem armas no Modo Difícil: a etapa tem só um `note` mandando para os lançadores). Em Corpo a corpo, "broadswords"/"shortswords"
→ Espadas, "spears" → Lanças, "yoyos" → Ioiôs, "flails" → Manguais, "boomerangs" e armas que voltam para a mão (facas,
Paladin's Hammer) → Bumerangues. Nomes de NPCs nos textos seguem o dicionário
(Taberneiro, Inventor Goblin, Caixeiro-viajante, Médico Bruxo, Feiticeiro). Formato em `src/lib/classGuides.ts`:

- **Guia**: `intro`, `basics` (como a classe funciona), `subclasses` (`id` na URL, `label` igual às sugestões da ficha do mundo,
  `icon`), `names` (nomes PT que faltam no dicionário, ex.: conjuntos de armadura — também vão em `scripts/manual-names.json`),
  `stages`, `source`.
- **Etapa** (`stage` = id de `STAGES` em `progression.ts`, em ordem): `summary`, `armor` + `armorAlt` (melhor no geral),
  `weapons` (um por subclasse: `{ sub, item?, alt?, note? }`; sem `item` = nada bom nessa etapa), `accessories`, `buffs`,
  `ammo` (opcional; cartão "Munição", usado em À distância), `paths` (mapa) e `next` (`target` = `key` de `MILESTONES`, `optional`, `prep`, `arena`).
- **Caminho** (`paths`): `id` único no guia, `title`, `when` ("se você usa X..."), `sub`, `armor`, `weapons`, `extras`, `pros`,
  `cons`, `next` (ids de caminhos da etapa seguinte).
- **Itens**: `"Nome EN"` ou `{ name, note?, qty?, image?, sub? }`. `image` troca o sprite (ex.: `"Hallowed armor Hood.png"`);
  `sub` faz o item só aparecer com aquele filtro. Textos aceitam `[[Item]]` e `**negrito**` como as páginas reorganizadas.
  Prefira `[[Item]]` sem texto próprio: o nome PT oficial aparece sozinho.

**Na tela**: abre na etapa do mundo ativo (`useWorldStage()`; se o guia não tiver aquela etapa, a última já alcançada).
Filtro de subclasse: o da URL (`?sub=`), senão a subclasse escrita na ficha do mundo. Na URL também `?aba=detalhado` e `?etapa=`.
Selo **Expert**/**Mestre** pela raridade do item na wiki (-12 / -13); num mundo Clássico aparece riscado ("só Expert").
O Detalhado mostra todas as etapas numa linha do tempo; tocar num caminho destaca de onde ele vem e para onde vai.

Depois de criar ou editar um guia, rode `node scripts/build-classes.mjs`: confere chaves, etapas, ligações dos caminhos, chefes,
subclasses e se todo item existe no dicionário/receitas, e regenera `exclusive-items.json`.

## Ferramentas

Página `/ferramentas` (cartões; `ready: false` em `TOOLS` mostra "em breve"). Cada ferramenta é uma tela `lazy()`. Todas
usam a etapa do mundo ativo (`useToolStage()`; sem mundo, a pessoa escolhe e fica em `terrapedia:tools-stage`) e a classe da
minha ficha (`useToolClass()`; sem ficha, `terrapedia:tools-class`). Itens sempre pelo nome EN; PT e sprite vêm do dicionário/receitas.

- **Dados** (`scripts/build-tools.mjs` → `src/data/tools-data.json`, ~150 KB, baixado só quando uma ferramenta abre): tabelas Cargo
  da wiki (veja Special:CargoTables) `Items` (números de armas/acessórios/armaduras/ferramentas, categoria `listcat`, buffs, vendedor
  pela tag `vendor:`), `Equipinfo` (bônus de equipamento: dano por classe, `maxMinions`, `maxTurrets`, imunidades...), `Modifiers`
  (números dos modificadores), `Drops` (fonte e chance); da página "Modifiers" os grupos (Universal, Comum, Corpo a corpo, À
  distância, Magia, Invocação), os de acessório e a ordem do mais ao menos valioso; das páginas "Minion-summoning weapons" e
  "Sentry-summoning weapons" o total de vagas de cada conjunto (já com o bônus de conjunto). Os nomes PT oficiais dos
  modificadores vêm dos arquivos de tradução do jogo (só nomes): passe a pasta extraída por `extract-terraria-loc.ps1` como
  argumento; sem ela o script mantém os nomes que já estão no arquivo. Rode de novo depois de uma atualização do Terraria.
- **Calculadora de lacaios** (`/ferramentas/lacaios`): cabeça/corpo/pernas, acessórios e poções/mesas; bônus de conjunto = total
  do conjunto − peças. Os acessórios do Exército do Ancião (`dd2Accessory`) dão +1 sentinela e não somam entre si. A sugestão escolhe
  o conjunto com mais vagas disponível na etapa (`GEAR_AVAILABILITY`: etapa mínima + chefe/evento que precisa, ex.: Abelha Rainha;
  sem mundo os chefes opcionais não são conferidos) e mostra o próximo passo. Montagem salva em `terrapedia:minion-loadout`. Itens exclusivos de Expert/Mestre ganham o selo (`ExclusiveBadge`, dados de `exclusive-items.json`, que só cobre itens citados nos guias de classe). Link na aba Resumo do guia do Invocador.
- **Melhor modificador** (`/ferramentas/modificador?item=`): regras da seção "Best modifiers" da wiki em `bestModifier.ts`
  (espadas/chicotes → Lendário, lanças/ioiôs/manguais → Divino, à distância → Surreal, magia → Mítico, invocação → Fabuloso; sem
  repulsão → Demoníaco/Louvável; casos especiais: Terrariano, Metralhadora, Arpão, magias que ficam na tela, cajados de dano alto).
  Mostra os números da arma com o modificador e todos os possíveis. Acessórios: Guarda para todos + escolha de dano por classe.
  Armas que se gastam (`consumable`) e itens sem dano não aparecem.
- **Checklist de buffs** (`/ferramentas/buffs?chefe=`) e **Planejador de arena** (`/ferramentas/arena?chefe=`): dados em
  `src/lib/bossPrep.ts`, escritos por nós. `BUFF_GROUPS` (poções, da classe, comida/cura, estações de arena) com `from`/`until`
  (etapa em que o item passa a valer / é trocado por um melhor), `class` e `needs`; cada chefe em `BOSS_PREP` tem a etapa em que
  costuma ser enfrentado (`fight`, que filtra as listas), buffs extras e a arena (`build`, `size`, `tips`). Sem `?chefe=` abre o
  próximo chefe não derrotado do mundo. As caixinhas ficam na tabela `world_buff_checks` (mundo ativo; relê a cada 20 s) ou em
  `terrapedia:buff-checks`. Chefe novo = uma entrada em `BOSS_PREP` com a mesma `key` de `MILESTONES`.
- **Comparador de itens** (`/ferramentas/comparar?itens=A|B|C`): até 3 itens; melhor valor de cada linha em dourado; efeitos em PT
  (`describeEquip`), texto do jogo em inglês buscado na hora (`fetchTooltips`, não fica salvo), receitas, drops e vendedores.
- **Dados dos NPCs** (`scripts/build-npcs.mjs` → `src/data/npc-data.json`, ~35 KB, baixado só quando a ferramenta abre): preferências
  da página "NPCs/preferences" (tabela com rowspan; a Princesa "ama todos" e todos gostam dela), lojas das páginas de cada vendedor
  (`{{shop row|Item|condição}}`) e preços da tabela Cargo `Items` (campo `buy`; medalhas do Defensor viram `"5m"`). Itens só de
  sementes especiais (Remix, Zenith, Not the Bees...) ficam de fora. As condições vêm em inglês: famílias comuns (golfe, Bestiário,
  "com X no inventário") são traduzidas por regra; o resto em `scripts/npc-conditions-pt.json` (texto limpo EN → PT; `""` = sem
  condição). O script lista as que faltam. No PT valem `[[Item]]`, `{lua:1,2}` (fases da lua, 1 = cheia ... 8 = crescente gibosa) e
  `{pilone}`. Cada condição também guarda `stage`/`needs` (etapa e chefes) quando dá para tirar do texto. Rode de novo depois de
  uma atualização do Terraria.
- **Felicidade dos NPCs** (`/ferramentas/felicidade`): casas com bioma e NPCs; regras da seção "Happiness" da página NPCs (1.4.5):
  solidão (até 2 vizinhos) −5%, cada vizinho além de 3 +5%, ama/gosta/não gosta/odeia = 88/94/106/112% (bioma e cada vizinho),
  limite 75–150%, arredonda em 1%. Considera a casa inteira a até 25 blocos e as casas a mais de 120 blocos entre si. Pilone: um
  vendedor (menos Taberneiro e visitantes) + mais um NPC na casa; desde a 1.4.5 a felicidade não importa. "Sugerir arranjo" usa
  os NPCs liberados (`npcUnlocked`: etapa + chefe/evento opcional do mundo) e faz busca local (mudar NPC de casa, trocar dois,
  trocar bioma; menor soma de preços, bônus por Pilone diferente, penalidade por casa de um NPC só). Casas na tabela
  `world_npc_houses` (uma linha por mundo; membros veem e mudam; o app faz `update` e, se não havia linha, `insert`; relê a cada
  20 s; espera 800 ms sem mexer para salvar) ou em `terrapedia:npc-houses`.
- **Vendedores** (`/ferramentas/vendedores?npc=&item=`): ícones dos NPCs (cabeça do mapa, `npcIcon`), "Como chega" (`NPCS`, escrito
  por nós), loja com preço em moedas (imagens da wiki) e condição; "ainda não no seu mundo" quando a etapa/chefes da condição não
  foram cumpridos (`conditionUnlocked`; sem mundo, cada chefe vale pela etapa de `milestoneStage` em `progression.ts`). Busca
  reversa "Quem vende...?" com `ItemPicker`. "Any Pylon" aparece como "Pilone (do bioma)".
- **Condições de chefes e eventos** (`/ferramentas/condicoes?chefe=`): dados em `src/lib/bossSummons.ts` (escritos por nós): item de
  invocação (com a receita do `recipes.json`), como começar sem item, onde, se acontece sozinho, o que precisa antes, `after`
  (etapa) e `needs`. Estado: Derrotado ✓ (mundo ativo) / Possível agora / Ainda não. Lua de Sangue e Eclipse Solar ficam em
  `EXTRA_EVENTS` (não contam para a etapa). Chefe novo em `MILESTONES` = uma entrada em `SUMMONS` com a mesma `key`.
- **Menu**: "Ferramentas" no topo (PC) e no rodapé (celular, 7 itens, "Ferram."). No PC os nomes dos links só aparecem a partir
  de `xl` (1280 px); abaixo disso, só ícones.

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
  salvo (HTML como veio da wiki, com a data), pelo título pedido e pelo título real. Se existe cópia, ela aparece
  **na hora** e a wiki é consultada em segundo plano (a página só é redesenhada se o HTML mudou). Se a wiki ou a
  internet falhar, fica a cópia com o aviso "versão salva em [data]". Os resumos da Fase 5 vêm junto com o app
  e funcionam sempre.
- **Sem proxy**: a API é chamada direto do navegador (`origin=*`). Não há proxy de CORS no projeto.
- O service worker (`wiki-cache` em `vite.config.ts`) também guarda respostas da wiki por 7 dias; o IndexedDB
  é a garantia que não expira.

## Melhorias leves

- **Velocidade**: a API da wiki leva ~2,5–3,5 s num artigo nunca aberto. `getArticle` guarda o pedido por 5 min,
  então o pré-carregamento vira a própria resposta: `installLinkPrefetch` (em `main.tsx`) baixa o artigo de qualquer
  link `/wiki/...` depois de 120 ms com o mouse em cima, ou na hora em que o dedo encosta; a busca baixa a sugestão
  escolhida (setas/mouse) após 150 ms. Com "economia de dados" ligada não pré-carrega. Imagens dos artigos têm
  `loading="lazy"` + `decoding="async"` (a da ficha é `eager` com `fetchpriority="high"`); a largura/altura da wiki
  reservam o espaço. Dicionário e receitas são `import()` separados; o dicionário só começa a baixar quando a busca
  ganha foco e o navegador está livre (`requestIdleCallback`). Medição (2026-10-21, build local): artigo já aberto
  antes, depois de reabrir o app: ~310–385 ms → 25–150 ms; pacote principal 618 KB → 501 KB (+ 75 KB comuns).
- **Busca rápida**: Ctrl+K / Cmd+K ou "/" focam a busca de qualquer tela (atalho em `Layout.tsx`, acha o campo por
  `[data-search-input]`). Busca vazia mostra as páginas abertas recentemente.
- **Histórico**: `recent.add(ref)` é chamado pelo `ArticlePage` quando o nome PT e o sprite chegam. Só no aparelho
  (`terrapedia:history`), máximo 30, sem repetir. Página `/historico` (link na busca vazia e na página inicial).
- **Notas** (`NoteBox` abaixo do título do artigo e do resumo): "Minha nota" na tabela `notes` (RLS: só o dono; sem
  login fica em `terrapedia:notes`) e "Nota do mundo" na tabela `world_notes` (uma por página em cada mundo; membros
  veem, escrevem e apagam; guarda quem editou por último). Texto vazio apaga. Salvar faz `update` e, se não havia
  linha, `insert` (o banco só deixa mudar `body`/`updated_*`). Ctrl+Enter salva.
- **Voz**: botão de microfone na busca (`listen()` em pt-BR, texto parcial vai aparecendo). Sem `SpeechRecognition`
  no navegador (ex.: Firefox) o botão some.
- **Janela compacta**: tudo funciona a partir de ~360 px. Abaixo de 640 px a navegação vai para o rodapé; estilos da
  wiki com `min-width` fixo são anulados (`index.css`). O PWA usa `launch_handler: focus-existing` para reabrir a
  janela que já está do lado do jogo.

## Acesso rápido flutuante

- **Janela**: `documentPictureInPicture.requestWindow()` (só num clique; Chrome/Edge 116+ no PC). A janela nasce vazia:
  `copyStyles` copia as folhas do app (as de outro site, como o Google Fonts, viram `<link>`), põe a classe
  `quick-window` no `<html>` e o `QuickWindowHost` (no `Layout`) desenha o `QuickPanel` lá dentro com `createPortal`.
  Por ser o mesmo app, o painel usa a mesma biblioteca e o mesmo roteador: `navigate()` abre a página na janela
  principal e a janelinha continua aberta. Fechar a aba principal fecha a janelinha.
- **Tamanho**: padrão 320×480; o que a pessoa deixar fica em `terrapedia:quick-size` (salvo ao redimensionar e ao
  fechar). Aba escolhida em `terrapedia:quick-tab`.
- **Conteúdo**: mini busca (só o dicionário local, sem pedir nada à wiki), abas Rápido / Favoritos / Depois / Mundo num
  "dock" embaixo. Rápido tem subir / descer / tirar (aparecem ao passar o mouse); Depois tem o "já vi"; Mundo mostra
  nome, modo, etapa e os 5 próximos chefes/eventos de `MILESTONES`. Nada atualiza sozinho: as listas mudam quando a
  biblioteca/mundo mudam no app.
- **Visual**: a janela do sistema não pode ser transparente, então o "vidro" é fundo escuro com brilhos (`html.quick-window body`)
  e painéis translúcidos (`.glass` em `index.css`).
- **Fixar**: botão "Fixar" nos artigos e resumos (`ArticleActions`) → `library.toggleQuick` / `moveQuick`. Os itens ficam em
  `LibraryData.quick` (a ordem é a do array) e, com login, na tabela `quick_access` (RLS: só o dono; `position` = ordem).
  Mudar a ordem manda `upsert` das linhas que mudaram de posição.
- **Sem a API** (celular, Firefox, Safari, navegador embutido): o botão do menu some e a página inicial mostra a dica
  "abra no Chrome ou Edge do PC". Se o navegador recusar abrir (ex.: navegador dentro de outro app), aparece um aviso.
- **Teste**: o navegador embutido do Claude Code tem a API mas não abre a janela ("no window"); dá para testar trocando
  `documentPictureInPicture.requestWindow` por uma função que devolve o `contentWindow` de um `<iframe>`.

## Biblioteca (favoritos, grupos, buscar depois)

Tudo passa por `src/lib/library.ts`. As telas só usam `useLibrary()` (ler), `useSyncStatus()`
(situação da conta) e `library.*` (mudar). Toda mudança passa por `commit()`.

- **Sem login**: salvo no localStorage na chave `terrapedia:library` (como na Fase 3A).
- **Com login**: dados nas tabelas `favorites`, `read_later`, `groups`, `group_items`, `group_links`, `quick_access` do Supabase,
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
Tabelas criadas em 2026-10-21 (registradas no fim do `schema.sql`): `world_craft_checks`, `notes`, `world_notes`.
Em 2026-10-23 também `world_npc_houses` (casas da Felicidade dos NPCs; criada pelo MCP, avisos de segurança sem nada novo; as
linhas dela no teste SQL ainda precisam ser rodadas no SQL Editor).
Em 2026-10-23: `world_buff_checks` (checklist de buffs; mesmas regras de `world_craft_checks`). RLS conferido pelo MCP (ligado,
3 regras, `anon` sem acesso, ninguém faz `update`); o teste `teste-mundo-checklist-notas.sql` ganhou as linhas dela e
passou em tudo no SQL Editor em 2026-10-23.
Em 2026-10-22: `quick_access` (acesso rápido; RLS conferido: o dono vê, outra conta não vê nem muda). No mesmo dia,
`rls_auto_enable()` (função do "automatic RLS" do Supabase, chamada pelo gatilho de eventos `ensure_rls`) perdeu o EXECUTE para
`public`, `anon` e `authenticated`; o gatilho continua ligando o RLS em tabelas novas. Avisos de segurança que ficam de propósito:
`create_world`/`join_world` chamáveis por quem tem login (é assim que o app cria e entra em mundos) e "Leaked password protection"
desligado (recurso de plano pago).
`supabase/tests/teste-mundo-checklist-notas.sql` testa o RLS delas com 3 usuários temporários (A e B no mundo, C de
fora) numa transação desfeita no fim. Roda colando no SQL Editor do Supabase; passou nos 22 itens em 2026-10-21 e, já com os de `world_buff_checks`, em tudo em 2026-10-23.
(O MCP do Supabase recusa esse script porque ele escreve em `auth.users`; rode pelo SQL Editor.)

## Publicação

O site está na Vercel (time "Terrapedia", projeto `terrapedia`): **https://terrapedia-wiki.vercel.app**
(o endereço `terrapedia-eta.vercel.app` também funciona). Cada push na `main` publica sozinho, pela ligação da
Vercel com o GitHub. `vercel.json` manda toda rota para o `index.html`, para que recarregar `/grupos`,
`/wiki/...` etc. funcione. Variáveis `VITE_*` mudadas na Vercel só valem depois de uma nova publicação.
