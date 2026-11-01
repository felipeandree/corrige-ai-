-- CorrigeAÍ: schema inicial
-- Rode no SQL Editor do Supabase (ou via `supabase db push`).
--
-- Modelo de segurança:
--   * avaliacoes / gabaritos / entregas: o professor só enxerga o que é dele (RLS).
--   * O gabarito fica em tabela separada e NUNCA é exposto ao aluno.
--   * O aluno (anônimo) só acessa o banco pelas funções buscar_avaliacao_aluno
--     e enviar_entrega, que validam código, status e formato das respostas.

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

create or replace function public.gerar_codigo_avaliacao()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_codigo text;
begin
  loop
    v_codigo := '';
    for i in 1..5 loop
      v_codigo := v_codigo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.avaliacoes a where a.codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- Confere se `respostas` tem exatamente a forma de `estrutura`
-- ({"Português": 5} => {"Português": ["A", null, "C", "B", "E"]}).
create or replace function public.respostas_validas(
  estrutura jsonb,
  respostas jsonb,
  permitir_branco boolean
)
returns boolean
language plpgsql
immutable
as $$
declare
  disciplina text;
  qtd int;
  lista jsonb;
  item jsonb;
begin
  if jsonb_typeof(estrutura) <> 'object' or jsonb_typeof(respostas) <> 'object' then
    return false;
  end if;

  if (select count(*) from jsonb_object_keys(estrutura))
     <> (select count(*) from jsonb_object_keys(respostas)) then
    return false;
  end if;

  for disciplina, qtd in
    select key, value::int from jsonb_each_text(estrutura)
  loop
    lista := respostas -> disciplina;
    if lista is null or jsonb_typeof(lista) <> 'array' or jsonb_array_length(lista) <> qtd then
      return false;
    end if;

    for item in select value from jsonb_array_elements(lista)
    loop
      if jsonb_typeof(item) = 'null' then
        if not permitir_branco then
          return false;
        end if;
      elsif jsonb_typeof(item) <> 'string' or (item #>> '{}') not in ('A', 'B', 'C', 'D', 'E') then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default public.gerar_codigo_avaliacao()
    check (codigo ~ '^[A-Z]{5}$'),
  professor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome_professor text not null check (char_length(btrim(nome_professor)) between 2 and 120),
  tipo_prova text not null
    check (tipo_prova in ('Avaliação Mensal', 'Avaliação Bimestral', 'Simulado Geral', 'Recuperação')),
  nivel_ensino text not null check (nivel_ensino in ('Médio', 'Fundamental')),
  turma text not null check (char_length(btrim(turma)) between 1 and 80),
  estrutura jsonb not null check (jsonb_typeof(estrutura) = 'object'),
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now()
);

create index avaliacoes_professor_idx on public.avaliacoes (professor_id, created_at desc);

create table public.gabaritos (
  avaliacao_id uuid primary key references public.avaliacoes (id) on delete cascade,
  respostas jsonb not null
);

create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes (id) on delete cascade,
  nome_aluno text not null check (char_length(btrim(nome_aluno)) between 2 and 120),
  nome_normalizado text generated always as (lower(btrim(nome_aluno))) stored,
  respostas jsonb not null,
  created_at timestamptz not null default now()
);

-- Um aluno (pelo nome) entrega uma única vez por avaliação.
create unique index entregas_unica_por_aluno on public.entregas (avaliacao_id, nome_normalizado);
create index entregas_avaliacao_idx on public.entregas (avaliacao_id, created_at);

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('bug', 'sugestao', 'elogio', 'duvida')),
  tela text not null check (char_length(tela) <= 80),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 140),
  descricao text not null check (char_length(btrim(descricao)) between 10 and 4000),
  gravidade text not null check (gravidade in ('baixa', 'media', 'critica')),
  docente_nome text not null check (char_length(docente_nome) <= 120),
  docente_email text not null check (char_length(docente_email) <= 200),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.avaliacoes enable row level security;
alter table public.gabaritos enable row level security;
alter table public.entregas enable row level security;
alter table public.feedbacks enable row level security;

create policy "professor le suas avaliacoes" on public.avaliacoes
  for select to authenticated using (professor_id = (select auth.uid()));
create policy "professor altera suas avaliacoes" on public.avaliacoes
  for update to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
create policy "professor remove suas avaliacoes" on public.avaliacoes
  for delete to authenticated using (professor_id = (select auth.uid()));

create policy "professor le seus gabaritos" on public.gabaritos
  for select to authenticated using (
    exists (select 1 from public.avaliacoes a
            where a.id = avaliacao_id and a.professor_id = (select auth.uid()))
  );

create policy "professor le entregas das suas avaliacoes" on public.entregas
  for select to authenticated using (
    exists (select 1 from public.avaliacoes a
            where a.id = avaliacao_id and a.professor_id = (select auth.uid()))
  );
create policy "professor remove entregas das suas avaliacoes" on public.entregas
  for delete to authenticated using (
    exists (select 1 from public.avaliacoes a
            where a.id = avaliacao_id and a.professor_id = (select auth.uid()))
  );

create policy "usuario envia feedback" on public.feedbacks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "usuario le seus feedbacks" on public.feedbacks
  for select to authenticated using (user_id = (select auth.uid()));

-- Privilégios mínimos. O anônimo não toca em nenhuma tabela.
revoke all on public.avaliacoes, public.gabaritos, public.entregas, public.feedbacks from anon, authenticated;
grant select, delete on public.avaliacoes to authenticated;
grant update (status) on public.avaliacoes to authenticated;
grant select on public.gabaritos to authenticated;
grant select, delete on public.entregas to authenticated;
grant select, insert on public.feedbacks to authenticated;

-- ---------------------------------------------------------------------------
-- RPC do professor: cria avaliação + gabarito de forma atômica
-- ---------------------------------------------------------------------------

create or replace function public.criar_avaliacao(
  p_nome_professor text,
  p_tipo_prova text,
  p_nivel_ensino text,
  p_turma text,
  p_gabarito jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_estrutura jsonb;
  v_id uuid;
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'NAO_AUTENTICADO' using errcode = '28000';
  end if;

  if jsonb_typeof(p_gabarito) <> 'object' or p_gabarito = '{}'::jsonb
     or (select count(*) from jsonb_object_keys(p_gabarito)) > 12 then
    raise exception 'GABARITO_INVALIDO' using errcode = '22023';
  end if;

  select jsonb_object_agg(key, jsonb_array_length(value))
    into v_estrutura
    from jsonb_each(p_gabarito)
   where jsonb_typeof(value) = 'array';

  if v_estrutura is null
     or (select count(*) from jsonb_object_keys(v_estrutura)) <> (select count(*) from jsonb_object_keys(p_gabarito))
     or exists (select 1 from jsonb_each_text(v_estrutura) where value::int not between 1 and 20)
     or not public.respostas_validas(v_estrutura, p_gabarito, false) then
    raise exception 'GABARITO_INVALIDO' using errcode = '22023';
  end if;

  if exists (select 1 from jsonb_object_keys(p_gabarito) k where char_length(k) not between 1 and 40) then
    raise exception 'GABARITO_INVALIDO' using errcode = '22023';
  end if;

  insert into public.avaliacoes (professor_id, nome_professor, tipo_prova, nivel_ensino, turma, estrutura)
  values (auth.uid(), btrim(p_nome_professor), p_tipo_prova, p_nivel_ensino, btrim(p_turma), v_estrutura)
  returning id, codigo into v_id, v_codigo;

  insert into public.gabaritos (avaliacao_id, respostas) values (v_id, p_gabarito);

  return v_codigo;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs do aluno (acesso anônimo, sem expor o gabarito)
-- ---------------------------------------------------------------------------

create or replace function public.buscar_avaliacao_aluno(p_codigo text)
returns table (
  codigo text,
  tipo_prova text,
  nivel_ensino text,
  turma text,
  nome_professor text,
  estrutura jsonb
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select a.codigo, a.tipo_prova, a.nivel_ensino, a.turma, a.nome_professor, a.estrutura
    from public.avaliacoes a
   where a.codigo = upper(btrim(p_codigo))
     and a.status = 'ativa';
$$;

create or replace function public.enviar_entrega(
  p_codigo text,
  p_nome text,
  p_respostas jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_avaliacao public.avaliacoes;
begin
  select * into v_avaliacao
    from public.avaliacoes
   where codigo = upper(btrim(p_codigo));

  -- Mesma resposta para código inexistente e prova encerrada: não serve de oráculo.
  if not found or v_avaliacao.status <> 'ativa' then
    raise exception 'AVALIACAO_INDISPONIVEL' using errcode = 'P0002';
  end if;

  if p_nome is null or char_length(btrim(p_nome)) not between 2 and 120 then
    raise exception 'NOME_INVALIDO' using errcode = '22023';
  end if;

  if not public.respostas_validas(v_avaliacao.estrutura, p_respostas, true) then
    raise exception 'RESPOSTAS_INVALIDAS' using errcode = '22023';
  end if;

  begin
    insert into public.entregas (avaliacao_id, nome_aluno, respostas)
    values (v_avaliacao.id, btrim(p_nome), p_respostas);
  exception when unique_violation then
    raise exception 'ENTREGA_DUPLICADA' using errcode = '23505';
  end;
end;
$$;

revoke all on function public.gerar_codigo_avaliacao() from public, anon, authenticated;
revoke all on function public.respostas_validas(jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.buscar_avaliacao_aluno(text) from public;
revoke all on function public.enviar_entrega(text, text, jsonb) from public;
revoke all on function public.criar_avaliacao(text, text, text, text, jsonb) from public, anon;
grant execute on function public.buscar_avaliacao_aluno(text) to anon, authenticated;
grant execute on function public.enviar_entrega(text, text, jsonb) to anon, authenticated;
grant execute on function public.criar_avaliacao(text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: o professor acompanha as entregas ao vivo (respeitando a RLS)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entregas'
  ) then
    alter publication supabase_realtime add table public.entregas;
  end if;
end;
$$;
