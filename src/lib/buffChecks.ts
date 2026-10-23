// Checklist de buffs (/ferramentas/buffs): o que já está pronto para cada chefe.
//
// Com um mundo ativo fica na tabela `world_buff_checks` (todos os membros veem e mudam; relê a cada 20 s).
// Sem mundo, neste aparelho (localStorage `terrapedia:buff-checks`). Uma lista por chefe (key de MILESTONES).

import { createWorldChecklist } from './worldChecklist'

export const useBuffChecks = createWorldChecklist({
  table: 'world_buff_checks',
  listColumn: 'boss',
  valueColumn: 'item',
  localKey: 'terrapedia:buff-checks',
})
