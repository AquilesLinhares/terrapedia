// Checklist da árvore de crafting: materiais (ou itens intermediários) que eu já tenho.
//
// Com um mundo ativo, as marcações são do mundo (tabela `world_craft_checks`, todos os membros veem e
// mudam; a página relê a cada 20 s). Sem mundo, ficam neste aparelho (localStorage `terrapedia:craft-checks`).
// Cada árvore (item final) tem a sua lista. A lógica comum está em worldChecklist.ts.

import { createWorldChecklist } from './worldChecklist'

/** Materiais marcados na árvore de `item` e onde ficam salvos (mundo ativo ou aparelho). */
export const useCraftChecks = createWorldChecklist({
  table: 'world_craft_checks',
  listColumn: 'item',
  valueColumn: 'material',
  localKey: 'terrapedia:craft-checks',
})
