-- ============================================================
--  QA HUB — Supabase Schema
--  Cole isso no SQL Editor do Supabase e clique em Run
-- ============================================================

-- PROJETOS
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  desc        text default '',
  color       text default '#6366F1',
  tags        jsonb default '["Desktop","Mobile","Header","Footer","PDP","PDC"]',
  created_at  timestamptz default now()
);

-- ITENS DE QA
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade not null,
  title       text not null,
  status      text default 'backlog',
  prio        text default 'medio',
  tags        jsonb default '[]',
  desc        text default '',
  qa          text default '',
  dev         text default '',
  media       jsonb default '[]',
  comments    jsonb default '[]',
  created_at  timestamptz default now()
);

-- ÍNDICES
create index if not exists items_project_id_idx on items(project_id);

-- ROW LEVEL SECURITY — acesso público (sem login)
alter table projects enable row level security;
alter table items     enable row level security;

create policy "public_all_projects" on projects for all using (true) with check (true);
create policy "public_all_items"    on items     for all using (true) with check (true);
