-- Teste das regras (RLS) do checklist da árvore, dos buffs, das casas de NPCs, do quadro de tarefas e das notas, com 3 usuários temporários:
-- A e B no mesmo mundo, C de fora. Tudo roda numa transação desfeita no fim (rollback):
-- nenhum usuário, mundo ou nota fica gravado.
--
-- Como rodar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- A última tabela mostra cada teste e o resultado; o esperado está entre parênteses no nome do teste.

begin;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-a000-00000000000a', 'teste-a@exemplo.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000b', 'teste-b@exemplo.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000c', 'teste-c@exemplo.invalid', 'authenticated', 'authenticated');
create temp table r (n serial, k text, v text) on commit drop;
create temp table ctx (k text primary key, v text) on commit drop;
grant all on r, ctx, r_n_seq to authenticated;
set local role authenticated;

-- ===== A cria o mundo, marca um material e escreve as notas =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
do $$
declare wid uuid; n int;
begin
  wid := public.create_world('Mundo de teste', 'classic', 'Teste A');
  insert into ctx values ('wid', wid::text), ('code', (select invite_code from public.worlds where id = wid));
  insert into public.world_craft_checks (world_id, item, material) values (wid, 'Iron Pickaxe', 'Iron Bar');
  insert into public.world_buff_checks (world_id, boss, item) values (wid, 'Skeletron', 'Ironskin Potion');
  insert into public.world_notes (world_id, page, body) values (wid, 'Gel', 'nota do mundo de A');
  insert into public.world_npc_houses (world_id, houses) values (wid, '[{"id":"a","biome":"forest","npcs":["Guide"]}]');
  insert into public.world_tasks (world_id, title, item_page) values (wid, 'Farmar gel', 'Gel');
  insert into public.notes (page, body) values ('Gel', 'nota pessoal de A');
  update public.notes set body = 'nota pessoal de A (editada)', updated_at = now() where page = 'Gel';
  get diagnostics n = row_count;
  insert into r (k, v) values ('A edita a própria nota (1)', n::text);
end $$;

-- ===== B entra pelo código =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
do $$
declare wid uuid := (select v::uuid from ctx where k = 'wid'); n int;
begin
  insert into r (k, v) values ('B entra pelo código (true)', (public.join_world(lower(replace((select v from ctx where k = 'code'), '-', ' ')), 'Teste B') = wid)::text);
  insert into r (k, v) values ('B vê o checklist de A (1)', (select count(*) from public.world_craft_checks where world_id = wid)::text);
  insert into r (k, v) values ('B vê os buffs marcados por A (1)', (select count(*) from public.world_buff_checks where world_id = wid)::text);
  delete from public.world_buff_checks where world_id = wid and item = 'Ironskin Potion';
  get diagnostics n = row_count;
  insert into r (k, v) values ('B desmarca o buff de A (1)', n::text);
  insert into public.world_buff_checks (world_id, boss, item) values (wid, 'Skeletron', 'Campfire');
  insert into r (k, v) values ('B vê as casas de NPCs de A (Guide)', (select houses->0->'npcs'->>0 from public.world_npc_houses where world_id = wid));
  -- o mesmo update que o app faz
  with u as (update public.world_npc_houses set houses = '[{"id":"b","biome":"snow","npcs":["Mechanic"]}]', updated_by = auth.uid(), updated_at = now()
             where world_id = wid returning world_id) select count(*) into n from u;
  insert into r (k, v) values ('B muda as casas de NPCs (1)', n::text);
  begin
    update public.world_npc_houses set houses = '[]', updated_by = '00000000-0000-4000-a000-00000000000a' where world_id = wid;
    insert into r (k, v) values ('B muda as casas fingindo ser A (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B muda as casas fingindo ser A (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    insert into public.world_npc_houses (world_id, houses) values (wid, '[]');
    insert into r (k, v) values ('B cria segunda linha de casas (23505, o app faz update)', 'aceitou');
  exception when others then insert into r (k, v) values ('B cria segunda linha de casas (23505, o app faz update)', sqlstate);
  end;
  delete from public.world_npc_houses where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('B apaga as casas (0, ninguém apaga)', n::text);
  insert into r (k, v) values ('B vê a nota do mundo (nota do mundo de A)', (select body from public.world_notes where world_id = wid and page = 'Gel'));
  -- quadro de tarefas
  insert into r (k, v) values ('B vê a tarefa de A (Farmar gel)', (select title from public.world_tasks where world_id = wid));
  insert into public.world_tasks (world_id, title, assigned_to) values (wid, 'Construir arena', '00000000-0000-4000-a000-00000000000a');
  update public.world_tasks set done = true, assigned_to = auth.uid() where world_id = wid and title = 'Farmar gel';
  get diagnostics n = row_count;
  insert into r (k, v) values ('B marca a tarefa de A como feita e assume (1)', n::text);
  begin
    insert into public.world_tasks (world_id, title, created_by) values (wid, 'x', '00000000-0000-4000-a000-00000000000a');
    insert into r (k, v) values ('B cria tarefa fingindo ser A (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B cria tarefa fingindo ser A (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    insert into public.world_tasks (world_id, title, assigned_to) values (wid, 'x', '00000000-0000-4000-a000-00000000000c');
    insert into r (k, v) values ('B dá tarefa para C, que não é membro (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B dá tarefa para C, que não é membro (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    update public.world_tasks set assigned_to = '00000000-0000-4000-a000-00000000000c' where world_id = wid;
    insert into r (k, v) values ('B passa tarefa para C (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B passa tarefa para C (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    update public.world_tasks set title = 'hack' where world_id = wid;
    insert into r (k, v) values ('B troca o título (bloqueado, só done/assigned_to)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B troca o título (bloqueado, só done/assigned_to)', 'bloqueado ' || sqlstate);
  end;
  insert into public.world_tasks (world_id, title) values (wid, 'Apagar depois');
  delete from public.world_tasks where world_id = wid and title = 'Apagar depois';
  get diagnostics n = row_count;
  insert into r (k, v) values ('B apaga uma tarefa (1)', n::text);
  insert into r (k, v) values ('B vê nota pessoal de A (0)', (select count(*) from public.notes)::text);
  update public.notes set body = 'hack' where page = 'Gel';
  get diagnostics n = row_count;
  insert into r (k, v) values ('B edita nota pessoal de A (0)', n::text);
  begin
    insert into public.world_craft_checks (world_id, item, material) values (wid, 'Iron Pickaxe', 'Iron Bar');
    insert into r (k, v) values ('B marca de novo o mesmo material (23505, o app ignora)', 'aceitou');
  exception when others then insert into r (k, v) values ('B marca de novo o mesmo material (23505, o app ignora)', sqlstate);
  end;
  begin
    insert into public.world_craft_checks (world_id, item, material, checked_by) values (wid, 'Iron Pickaxe', 'Wood', '00000000-0000-4000-a000-00000000000a');
    insert into r (k, v) values ('B marca fingindo ser A (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B marca fingindo ser A (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  insert into public.world_craft_checks (world_id, item, material) values (wid, 'Iron Pickaxe', 'Wood');
  delete from public.world_craft_checks where world_id = wid and material = 'Iron Bar';
  get diagnostics n = row_count;
  insert into r (k, v) values ('B desmarca o que A marcou (1)', n::text);
  -- o mesmo update que o app faz: body + updated_by + updated_at, devolvendo a linha
  with u as (update public.world_notes set body = 'editada por B', updated_by = auth.uid(), updated_at = now()
             where world_id = wid and page = 'Gel' returning page) select count(*) into n from u;
  insert into r (k, v) values ('B edita a nota do mundo (1)', n::text);
  begin
    update public.world_notes set body = 'x', updated_by = '00000000-0000-4000-a000-00000000000a' where world_id = wid;
    insert into r (k, v) values ('B edita fingindo ser A (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B edita fingindo ser A (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    update public.world_notes set page = 'Torch' where world_id = wid;
    insert into r (k, v) values ('B troca a página da nota (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('B troca a página da nota (bloqueado)', 'bloqueado ' || sqlstate);
  end;
end $$;

-- ===== C não é membro =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}', true);
do $$
declare wid uuid := (select v::uuid from ctx where k = 'wid'); n int;
begin
  insert into r (k, v) values ('C vê checklist / notas do mundo / notas (0/0/0)',
    (select count(*) from public.world_craft_checks) || '/' || (select count(*) from public.world_notes) || '/' || (select count(*) from public.notes));
  begin
    insert into public.world_craft_checks (world_id, item, material) values (wid, 'Iron Pickaxe', 'Gel');
    insert into r (k, v) values ('C marca no mundo alheio (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('C marca no mundo alheio (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  begin
    insert into public.world_notes (world_id, page, body) values (wid, 'Torch', 'invasor');
    insert into r (k, v) values ('C escreve nota no mundo alheio (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('C escreve nota no mundo alheio (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  update public.world_notes set body = 'hack', updated_by = auth.uid() where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C edita nota do mundo (0)', n::text);
  delete from public.world_craft_checks where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C apaga checklist (0)', n::text);
  insert into r (k, v) values ('C vê buffs do mundo alheio (0)', (select count(*) from public.world_buff_checks)::text);
  begin
    insert into public.world_buff_checks (world_id, boss, item) values (wid, 'Skeletron', 'Gel');
    insert into r (k, v) values ('C marca buff no mundo alheio (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('C marca buff no mundo alheio (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  delete from public.world_buff_checks where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C apaga buffs (0)', n::text);
  delete from public.world_notes where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C apaga nota do mundo (0)', n::text);
  insert into r (k, v) values ('C vê tarefas do mundo alheio (0)', (select count(*) from public.world_tasks)::text);
  begin
    insert into public.world_tasks (world_id, title) values (wid, 'invasor');
    insert into r (k, v) values ('C cria tarefa no mundo alheio (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('C cria tarefa no mundo alheio (bloqueado)', 'bloqueado ' || sqlstate);
  end;
  update public.world_tasks set done = false where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C muda tarefas (0)', n::text);
  delete from public.world_tasks where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C apaga tarefas (0)', n::text);
  insert into r (k, v) values ('C vê casas de NPCs do mundo alheio (0)', (select count(*) from public.world_npc_houses)::text);
  update public.world_npc_houses set houses = '[]', updated_by = auth.uid() where world_id = wid;
  get diagnostics n = row_count;
  insert into r (k, v) values ('C muda casas do mundo alheio (0)', n::text);
  begin
    insert into public.world_npc_houses (world_id, houses) values ((select v::uuid from ctx where k = 'wid'), '[]');
    insert into r (k, v) values ('C cria casas no mundo alheio (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('C cria casas no mundo alheio (bloqueado)', 'bloqueado ' || sqlstate);
  end;
end $$;

-- ===== A confere o resultado; B sai do mundo =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
insert into r (k, v) select 'A vê checklist (Wood)', string_agg(material, ',') from public.world_craft_checks;
insert into r (k, v) select 'A vê buffs (Campfire)', string_agg(item, ',') from public.world_buff_checks;
insert into r (k, v) select 'A vê as casas que B mudou (Mechanic / true)', (houses->0->'npcs'->>0) || ' / ' || (updated_by = '00000000-0000-4000-a000-00000000000b') from public.world_npc_houses;
insert into r (k, v) select 'A vê nota do mundo / editor é B (editada por B / true)', body || ' / ' || (updated_by = '00000000-0000-4000-a000-00000000000b') from public.world_notes;
insert into r (k, v) select 'A vê as tarefas (Construir arena: não feita, de A / Farmar gel: feita, de B)',
  string_agg(title || ': ' || case when done then 'feita' else 'não feita' end || ', de '
    || case assigned_to when '00000000-0000-4000-a000-00000000000a' then 'A' when '00000000-0000-4000-a000-00000000000b' then 'B' else '?' end, ' / ' order by title)
  from public.world_tasks;
insert into r (k, v) select 'A vê a própria nota (nota pessoal de A (editada))', body from public.notes;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
delete from public.world_members where user_id = auth.uid();
insert into r (k, v) select 'B depois de sair vê checklist/notas/tarefas (0/0/0)',
  (select count(*) from public.world_craft_checks) || '/' || (select count(*) from public.world_notes) || '/' || (select count(*) from public.world_tasks);
-- keepalive: leitura pública de 1 linha, nenhuma escrita
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
insert into r (k, v) select 'anon lê keepalive (1)', count(*)::text from public.keepalive;
do $$ declare n int; begin
  begin
    update public.keepalive set note = 'x'; get diagnostics n = row_count;
    insert into r (k, v) values ('anon muda keepalive (bloqueado)', 'ACEITOU (ruim)');
  exception when others then insert into r (k, v) values ('anon muda keepalive (bloqueado)', 'bloqueado ' || sqlstate);
  end;
end $$;
reset role;
select k as teste, v as resultado from r order by n;
rollback;
