-- Tabelas da biblioteca (favoritos, "buscar depois" e grupos) no Supabase.
-- Já aplicado no projeto "terrapedia". Fica aqui como registro, para recriar se precisar.
--
-- Cada linha guarda o dono (user_id). As regras de RLS fazem cada pessoa ver e mudar só as
-- próprias linhas, mesmo usando a chave pública no navegador.

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page text not null,
  en text not null,
  pt text,
  sprite text,
  added_at timestamptz not null default now(),
  primary key (user_id, page)
);

create table public.read_later (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page text not null,
  en text not null,
  pt text,
  sprite text,
  added_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, page)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  -- permite que group_items confira que o grupo é do mesmo dono
  unique (id, user_id)
);

create index groups_user_id_idx on public.groups (user_id);

create table public.group_items (
  group_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page text not null,
  en text not null,
  pt text,
  sprite text,
  added_at timestamptz not null default now(),
  primary key (group_id, page),
  -- o item só pode entrar num grupo do mesmo dono; apagar o grupo apaga os itens
  foreign key (group_id, user_id) references public.groups (id, user_id) on delete cascade
);

create index group_items_user_id_idx on public.group_items (user_id);
create index group_items_group_user_idx on public.group_items (group_id, user_id);

-- RLS: ligado em todas as tabelas, com uma regra por operação.
alter table public.favorites enable row level security;
alter table public.read_later enable row level security;
alter table public.groups enable row level security;
alter table public.group_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['favorites', 'read_later', 'groups', 'group_items'] loop
    execute format('create policy "ver os próprios" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "criar os próprios" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "mudar os próprios" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "apagar os próprios" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Acesso pela API: só quem está logado; visitantes (anon) não acessam nada.
revoke all on public.favorites, public.read_later, public.groups, public.group_items from anon;
grant select, insert, update, delete on public.favorites, public.read_later, public.groups, public.group_items to authenticated;

-- ===== Fase 4: ligações feitas à mão dentro de um grupo ("uso X para craftar Y") =====
-- Já aplicado no projeto "terrapedia" (migração "group_links", 2026-10-20).
-- Para aplicar num projeto que já tem as tabelas acima, rode só este bloco no SQL Editor do Supabase.

create table public.group_links (
  group_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  from_page text not null,
  to_page text not null,
  created_at timestamptz not null default now(),
  primary key (group_id, from_page, to_page),
  check (from_page <> to_page),
  -- o grupo é do mesmo dono; apagar o grupo apaga as ligações
  foreign key (group_id, user_id) references public.groups (id, user_id) on delete cascade,
  -- as duas pontas são itens do grupo; tirar o item do grupo apaga as ligações dele
  foreign key (group_id, from_page) references public.group_items (group_id, page) on delete cascade,
  foreign key (group_id, to_page) references public.group_items (group_id, page) on delete cascade
);

create index group_links_user_id_idx on public.group_links (user_id);
create index group_links_group_user_idx on public.group_links (group_id, user_id);
create index group_links_to_idx on public.group_links (group_id, to_page);

alter table public.group_links enable row level security;

create policy "ver os próprios" on public.group_links for select to authenticated using ((select auth.uid()) = user_id);
create policy "criar os próprios" on public.group_links for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "mudar os próprios" on public.group_links for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "apagar os próprios" on public.group_links for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.group_links from anon;
grant select, insert, update, delete on public.group_links to authenticated;

-- ===== Cache das traduções automáticas: a tabela page_translations e a função merge_page_translation
-- existiram de 2026-10-21 até serem apagadas no mesmo dia (o app não usa mais tradução automática). =====

-- ===== Mundo compartilhado =====
-- Já aplicado no projeto "terrapedia" (migração "shared_worlds", 2026-10-21).
-- Um mundo tem membros, progresso (chefes/eventos derrotados) e um registro de atividade.
-- Só membros veem e mexem nos dados do mundo. Criar e entrar por código passam pelas funções
-- create_world/join_world, porque quem ainda não é membro não pode ver o mundo.
-- Os grupos podem ser pessoais (world_id nulo) ou do mundo (todos os membros veem e mexem).

create schema if not exists private;
grant usage on schema private to authenticated;

create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  mode text not null check (mode in ('classic', 'expert', 'master')),
  invite_code text not null unique check (invite_code ~ '^TERRA-[A-Z0-9]{4}$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index worlds_created_by_idx on public.worlds (created_by);

create table public.world_members (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  class text check (class in ('melee', 'ranged', 'magic', 'summoner')),
  subclass text check (char_length(subclass) <= 40),
  joined_at timestamptz not null default now(),
  primary key (world_id, user_id)
);
create index world_members_user_id_idx on public.world_members (user_id);

-- key = título EN da página do chefe/evento (ex.: "Skeletron"); a lista fica no app (src/lib/progression.ts)
create table public.world_progress (
  world_id uuid not null references public.worlds (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 60),
  marked_by uuid default auth.uid() references auth.users (id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (world_id, key)
);
create index world_progress_marked_by_idx on public.world_progress (marked_by);

-- Escrito só pelo banco (funções e gatilhos abaixo); o app só lê.
create table public.world_activity (
  id bigint generated always as identity primary key,
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  kind text not null check (kind in ('created', 'joined', 'defeated', 'group_created', 'item_added')),
  subject text,
  subject_pt text,
  group_name text,
  created_at timestamptz not null default now()
);
create index world_activity_world_idx on public.world_activity (world_id, created_at desc);
create index world_activity_user_id_idx on public.world_activity (user_id);

-- Grupos do mundo
alter table public.groups add column world_id uuid references public.worlds (id) on delete cascade;
create index groups_world_id_idx on public.groups (world_id);
-- Itens e ligações agora só precisam que o grupo exista (num grupo do mundo, cada membro adiciona os seus)
alter table public.group_items drop constraint if exists group_items_group_id_user_id_fkey;
alter table public.group_links drop constraint if exists group_links_group_id_user_id_fkey;
alter table public.group_items add foreign key (group_id) references public.groups (id) on delete cascade;
alter table public.group_links add foreign key (group_id) references public.groups (id) on delete cascade;
drop index if exists public.group_items_group_user_idx;
drop index if exists public.group_links_group_user_idx;
alter table public.groups drop constraint if exists groups_id_user_id_key;

-- Funções das regras (security definer para não cair em recursão no RLS; o schema private não vai pra API)
create function private.is_world_member(wid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.world_members m where m.world_id = wid and m.user_id = (select auth.uid()))
$$;

create function private.can_edit_group(gid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid
      and ((g.world_id is null and g.user_id = (select auth.uid()))
        or (g.world_id is not null and private.is_world_member(g.world_id)))
  )
$$;

create function private.member_name(wid uuid, uid uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select display_name from public.world_members where world_id = wid and user_id = uid), 'Alguém')
$$;

revoke all on function private.is_world_member(uuid), private.can_edit_group(uuid), private.member_name(uuid, uuid) from public;
grant execute on function private.is_world_member(uuid), private.can_edit_group(uuid) to authenticated;

-- RLS do mundo
alter table public.worlds enable row level security;
alter table public.world_members enable row level security;
alter table public.world_progress enable row level security;
alter table public.world_activity enable row level security;

create policy "membros veem" on public.worlds for select to authenticated using (private.is_world_member(id));
create policy "membros mudam" on public.worlds for update to authenticated
  using (private.is_world_member(id)) with check (private.is_world_member(id));
create policy "quem criou apaga" on public.worlds for delete to authenticated using ((select auth.uid()) = created_by);

create policy "membros veem" on public.world_members for select to authenticated using (private.is_world_member(world_id));
create policy "muda a própria ficha" on public.world_members for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sai do mundo" on public.world_members for delete to authenticated using ((select auth.uid()) = user_id);

create policy "membros veem" on public.world_progress for select to authenticated using (private.is_world_member(world_id));
create policy "membros marcam" on public.world_progress for insert to authenticated
  with check (private.is_world_member(world_id) and (select auth.uid()) = marked_by);
create policy "membros desmarcam" on public.world_progress for delete to authenticated using (private.is_world_member(world_id));

create policy "membros veem" on public.world_activity for select to authenticated using (private.is_world_member(world_id));

-- Só as colunas que o app muda podem ser alteradas (ex.: ninguém troca o world_id de uma ficha)
revoke all on public.worlds, public.world_members, public.world_progress, public.world_activity from anon, authenticated;
grant select on public.worlds, public.world_members, public.world_progress, public.world_activity to authenticated;
grant update (name, mode), delete on public.worlds to authenticated;
grant update (display_name, class, subclass), delete on public.world_members to authenticated;
grant insert, delete on public.world_progress to authenticated;

-- RLS dos grupos: pessoais (do dono) ou do mundo (dos membros). Grupo do mundo só quem criou apaga.
drop policy "ver os próprios" on public.groups;
drop policy "criar os próprios" on public.groups;
drop policy "mudar os próprios" on public.groups;
drop policy "apagar os próprios" on public.groups;
create policy "ver" on public.groups for select to authenticated using (
  (world_id is null and (select auth.uid()) = user_id) or (world_id is not null and private.is_world_member(world_id)));
create policy "criar" on public.groups for insert to authenticated with check (
  (select auth.uid()) = user_id and (world_id is null or private.is_world_member(world_id)));
create policy "mudar" on public.groups for update to authenticated
  using ((world_id is null and (select auth.uid()) = user_id) or (world_id is not null and private.is_world_member(world_id)))
  with check ((world_id is null and (select auth.uid()) = user_id) or (world_id is not null and private.is_world_member(world_id)));
create policy "apagar" on public.groups for delete to authenticated using (
  (select auth.uid()) = user_id and (world_id is null or private.is_world_member(world_id)));
revoke update on public.groups from authenticated;
grant update (name) on public.groups to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['group_items', 'group_links'] loop
    execute format('drop policy "ver os próprios" on public.%I', t);
    execute format('drop policy "criar os próprios" on public.%I', t);
    execute format('drop policy "mudar os próprios" on public.%I', t);
    execute format('drop policy "apagar os próprios" on public.%I', t);
    execute format('create policy "ver" on public.%I for select to authenticated using (private.can_edit_group(group_id))', t);
    execute format('create policy "criar" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and private.can_edit_group(group_id))', t);
    execute format('create policy "apagar" on public.%I for delete to authenticated using (private.can_edit_group(group_id))', t);
  end loop;
end $$;
create policy "mudar" on public.group_items for update to authenticated
  using (private.can_edit_group(group_id)) with check (private.can_edit_group(group_id));
revoke update on public.group_items, public.group_links from authenticated;
grant update (en, pt, sprite) on public.group_items to authenticated;

-- Criar mundo e entrar por código
create function public.create_world(p_name text, p_mode text, p_display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
  code text;
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- sem 0/O e 1/I, que se confundem
begin
  if uid is null then
    raise exception 'login necessário';
  end if;
  loop
    code := 'TERRA-' || (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 4));
    begin
      insert into public.worlds (name, mode, invite_code, created_by) values (trim(p_name), p_mode, code, uid) returning id into wid;
      exit;
    exception when unique_violation then
      -- código já usado por outro mundo: sorteia de novo
    end;
  end loop;
  insert into public.world_members (world_id, user_id, display_name) values (wid, uid, trim(p_display_name));
  insert into public.world_activity (world_id, user_id, actor_name, kind) values (wid, uid, trim(p_display_name), 'created');
  return wid;
end
$$;

-- Aceita "TERRA-7K2Q", "terra 7k2q" ou só "7K2Q". Devolve o id do mundo, ou null se o código não existe.
create function public.join_world(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  added int;
begin
  if uid is null then
    raise exception 'login necessário';
  end if;
  if clean like 'TERRA%' then
    clean := substr(clean, 6);
  end if;
  select id into wid from public.worlds where invite_code = 'TERRA-' || clean;
  if wid is null then
    return null;
  end if;
  insert into public.world_members (world_id, user_id, display_name) values (wid, uid, trim(p_display_name)) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    insert into public.world_activity (world_id, user_id, actor_name, kind) values (wid, uid, trim(p_display_name), 'joined');
  end if;
  return wid;
end
$$;

revoke all on function public.create_world(text, text, text), public.join_world(text, text) from public, anon;
grant execute on function public.create_world(text, text, text), public.join_world(text, text) to authenticated;

-- Atividade automática: chefe derrotado, grupo do mundo criado, item adicionado a um grupo do mundo
create function private.log_defeat() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.world_activity (world_id, user_id, actor_name, kind, subject)
  values (new.world_id, new.marked_by, private.member_name(new.world_id, new.marked_by), 'defeated', new.key);
  return null;
end
$$;

create function private.log_world_group() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.world_id is not null then
    insert into public.world_activity (world_id, user_id, actor_name, kind, group_name)
    values (new.world_id, new.user_id, private.member_name(new.world_id, new.user_id), 'group_created', new.name);
  end if;
  return null;
end
$$;

create function private.log_group_item() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  wid uuid;
  gname text;
begin
  select world_id, name into wid, gname from public.groups where id = new.group_id;
  if wid is not null then
    insert into public.world_activity (world_id, user_id, actor_name, kind, subject, subject_pt, group_name)
    values (wid, new.user_id, private.member_name(wid, new.user_id), 'item_added', new.page, coalesce(new.pt, new.en), gname);
  end if;
  return null;
end
$$;

create trigger log_defeat after insert on public.world_progress for each row execute function private.log_defeat();
create trigger log_world_group after insert on public.groups for each row execute function private.log_world_group();
create trigger log_group_item after insert on public.group_items for each row execute function private.log_group_item();

-- ============================================================
-- Checklist da árvore de crafting (materiais que o mundo já tem)
-- Uma linha por material marcado na árvore de um item. Membros veem, marcam e desmarcam.
-- ============================================================
create table public.world_craft_checks (
  world_id uuid not null references public.worlds (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 120),
  material text not null check (char_length(material) between 1 and 120),
  checked_by uuid default auth.uid() references auth.users (id) on delete set null,
  checked_at timestamptz not null default now(),
  primary key (world_id, item, material)
);
create index world_craft_checks_checked_by_idx on public.world_craft_checks (checked_by);

alter table public.world_craft_checks enable row level security;
create policy "membros veem" on public.world_craft_checks for select to authenticated using (private.is_world_member(world_id));
create policy "membros marcam" on public.world_craft_checks for insert to authenticated
  with check (private.is_world_member(world_id) and (select auth.uid()) = checked_by);
create policy "membros desmarcam" on public.world_craft_checks for delete to authenticated using (private.is_world_member(world_id));
revoke all on public.world_craft_checks from anon, authenticated;
grant select, insert, delete on public.world_craft_checks to authenticated;

-- ============================================================
-- Notas nos artigos (pessoal e do mundo)
-- ============================================================
-- Nota pessoal: uma por página, só o dono vê
create table public.notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page text not null check (char_length(page) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, page)
);
alter table public.notes enable row level security;
create policy "ver os próprios" on public.notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "criar os próprios" on public.notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "mudar os próprios" on public.notes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "apagar os próprios" on public.notes for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.notes from anon, authenticated;
grant select, insert, delete on public.notes to authenticated;
grant update (body, updated_at) on public.notes to authenticated;

-- Nota do mundo: uma por página em cada mundo; qualquer membro vê, escreve e apaga
create table public.world_notes (
  world_id uuid not null references public.worlds (id) on delete cascade,
  page text not null check (char_length(page) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (world_id, page)
);
create index world_notes_updated_by_idx on public.world_notes (updated_by);
alter table public.world_notes enable row level security;
create policy "membros veem" on public.world_notes for select to authenticated using (private.is_world_member(world_id));
create policy "membros escrevem" on public.world_notes for insert to authenticated
  with check (private.is_world_member(world_id) and (select auth.uid()) = updated_by);
create policy "membros mudam" on public.world_notes for update to authenticated
  using (private.is_world_member(world_id)) with check (private.is_world_member(world_id) and (select auth.uid()) = updated_by);
create policy "membros apagam" on public.world_notes for delete to authenticated using (private.is_world_member(world_id));
revoke all on public.world_notes from anon, authenticated;
grant select, insert, delete on public.world_notes to authenticated;
grant update (body, updated_by, updated_at) on public.world_notes to authenticated;

-- ============================================================
-- Acesso rápido (itens fixados na janelinha flutuante)
-- Aplicado no projeto "terrapedia" em 2026-10-22 (migração "quick_access").
-- Pessoal: cada um só vê e mexe nas próprias linhas. `position` é a ordem na lista (0 = primeiro).
-- ============================================================
create table public.quick_access (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page text not null check (char_length(page) between 1 and 200),
  en text not null check (char_length(en) between 1 and 200),
  pt text check (char_length(pt) <= 200),
  sprite text check (char_length(sprite) <= 500),
  position integer not null default 0 check (position between 0 and 1000),
  added_at timestamptz not null default now(),
  primary key (user_id, page)
);
alter table public.quick_access enable row level security;
create policy "ver os próprios" on public.quick_access for select to authenticated using ((select auth.uid()) = user_id);
create policy "criar os próprios" on public.quick_access for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "mudar os próprios" on public.quick_access for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "apagar os próprios" on public.quick_access for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.quick_access from anon, authenticated;
grant select, insert, update, delete on public.quick_access to authenticated;

-- ============================================================
-- Função do "automatic RLS" do Supabase (liga o RLS em toda tabela nova, pelo gatilho de eventos `ensure_rls`).
-- Aplicado em 2026-10-22 (migração "revoke_rls_auto_enable_execute"): ninguém pode chamá-la pela API
-- (/rest/v1/rpc/rls_auto_enable). O gatilho continua funcionando: conferido criando uma tabela de teste numa
-- transação desfeita (relrowsecurity = true).
-- ============================================================
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- ============================================================
-- Checklist de buffs (Ferramentas): o que já está pronto para cada chefe, no mundo ativo.
-- Aplicado em 2026-10-23 (migração "world_buff_checks"). Mesmas regras de world_craft_checks:
-- membros veem, marcam e desmarcam; ninguém muda uma marcação (só apaga). Sem mundo, fica no aparelho.
-- ============================================================
create table public.world_buff_checks (
  world_id uuid not null references public.worlds (id) on delete cascade,
  boss text not null check (char_length(boss) between 1 and 80),
  item text not null check (char_length(item) between 1 and 120),
  checked_by uuid default auth.uid() references auth.users (id) on delete set null,
  checked_at timestamptz not null default now(),
  primary key (world_id, boss, item)
);
create index world_buff_checks_checked_by_idx on public.world_buff_checks (checked_by);

alter table public.world_buff_checks enable row level security;
create policy "membros veem" on public.world_buff_checks for select to authenticated using (private.is_world_member(world_id));
create policy "membros marcam" on public.world_buff_checks for insert to authenticated
  with check (private.is_world_member(world_id) and (select auth.uid()) = checked_by);
create policy "membros desmarcam" on public.world_buff_checks for delete to authenticated using (private.is_world_member(world_id));
revoke all on public.world_buff_checks from anon, authenticated;
grant select, insert, delete on public.world_buff_checks to authenticated;

-- ============================================================
-- Felicidade dos NPCs (Ferramentas): casas montadas no mundo ativo (uma linha por mundo; `houses` =
-- [{ id, biome, npcs[] }]). Aplicado em 2026-10-23 (migração "world_npc_houses").
-- Membros veem, criam e mudam (só houses/updated_*; o app faz update e, se não havia linha, insert).
-- Ninguém apaga pela API (some junto com o mundo). Sem mundo, fica no aparelho.
-- ============================================================
create table public.world_npc_houses (
  world_id uuid primary key references public.worlds (id) on delete cascade,
  houses jsonb not null default '[]'::jsonb check (jsonb_typeof(houses) = 'array' and pg_column_size(houses) <= 20000),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index world_npc_houses_updated_by_idx on public.world_npc_houses (updated_by);
alter table public.world_npc_houses enable row level security;
create policy "membros veem" on public.world_npc_houses for select to authenticated using (private.is_world_member(world_id));
create policy "membros criam" on public.world_npc_houses for insert to authenticated
  with check (private.is_world_member(world_id) and (select auth.uid()) = updated_by);
create policy "membros mudam" on public.world_npc_houses for update to authenticated
  using (private.is_world_member(world_id)) with check (private.is_world_member(world_id) and (select auth.uid()) = updated_by);
revoke all on public.world_npc_houses from anon, authenticated;
grant select, insert on public.world_npc_houses to authenticated;
grant update (houses, updated_by, updated_at) on public.world_npc_houses to authenticated;
