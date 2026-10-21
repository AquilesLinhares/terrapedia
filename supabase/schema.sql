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

-- ===== Cache compartilhado das traduções (aplicado em 2026-10-21, migração "page_translations") =====
-- Cada linha = um artigo; `segments` = { hash do trecho em inglês: tradução em português }.
-- Todo mundo lê (inclusive sem login); só quem tem conta grava; ninguém apaga.

create table public.page_translations (
  page text not null check (char_length(page) between 1 and 255),
  lang text not null default 'pt' check (lang = 'pt'),
  segments jsonb not null default '{}'::jsonb
    check (jsonb_typeof(segments) = 'object' and pg_column_size(segments) < 2000000),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (page, lang)
);

create index page_translations_updated_by_idx on public.page_translations (updated_by);

alter table public.page_translations enable row level security;

create policy "page_translations: todos leem" on public.page_translations
  for select to anon, authenticated using (true);
create policy "page_translations: logados criam" on public.page_translations
  for insert to authenticated with check (updated_by = (select auth.uid()));
create policy "page_translations: logados atualizam" on public.page_translations
  for update to authenticated using (true) with check (updated_by = (select auth.uid()));

grant select on public.page_translations to anon, authenticated;
grant insert, update on public.page_translations to authenticated;

-- Junta trechos novos aos existentes. security invoker: as regras acima continuam valendo.
create function public.merge_page_translation(p_page text, p_segments jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.page_translations (page, lang, segments, updated_at, updated_by)
  values (p_page, 'pt', p_segments, now(), (select auth.uid()))
  on conflict (page, lang) do update
    set segments = public.page_translations.segments || excluded.segments,
        updated_at = now(),
        updated_by = (select auth.uid());
$$;

revoke execute on function public.merge_page_translation(text, jsonb) from public, anon;
grant execute on function public.merge_page_translation(text, jsonb) to authenticated;

-- ===== Remoção do cache das traduções (2026-10-21): o app não usa mais a tabela acima =====
-- AINDA NÃO APLICADO. Rodar no SQL Editor do Supabase; depois disso, apagar a seção "Cache compartilhado" acima.
--
-- drop function if exists public.merge_page_translation(text, jsonb);
-- drop table if exists public.page_translations;
