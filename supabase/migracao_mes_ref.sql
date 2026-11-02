-- =====================================================================
-- Separação por mês: pedidos e positivações passam a pertencer a um mês.
--
-- COMO USAR (uma única vez, ANTES de publicar a nova versão do app):
--   Supabase -> SQL Editor -> New query -> colar este arquivo -> Run
--
-- O que faz:
--   1. Cria a coluna mes_ref ("AAAA-MM", ex.: 2026-11) em pedidos e positivacoes.
--   2. Classifica os registros já existentes:
--        - se a tabela tem a coluna created_at, usa o mês da criação
--          (no horário de Brasília);
--        - se não tem, considera tudo como do mês 2026-10 (mês anterior),
--          assim novembro de 2026 começa zerado.
--   3. Define o mês atual (horário de Brasília) como valor padrão dos
--      novos registros.
--   4. Cria um índice para as consultas por vendedor e mês.
--
-- Não apaga nada: clientes, marcas, meta e todo o histórico continuam
-- no banco. Pode ser executado mais de uma vez sem problemas.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['pedidos', 'positivacoes'] loop
    execute format('alter table public.%I add column if not exists mes_ref text', t);

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'created_at'
    ) then
      execute format(
        'update public.%I set mes_ref = to_char(timezone(''America/Sao_Paulo'', created_at), ''YYYY-MM'') where mes_ref is null',
        t
      );
    else
      execute format('update public.%I set mes_ref = ''2026-10'' where mes_ref is null', t);
    end if;

    execute format(
      'alter table public.%I alter column mes_ref set default to_char(timezone(''America/Sao_Paulo'', now()), ''YYYY-MM'')',
      t
    );
    execute format('alter table public.%I alter column mes_ref set not null', t);
    execute format(
      'create index if not exists %I on public.%I (vendedor_id, mes_ref)',
      t || '_vendedor_mes_idx', t
    );
  end loop;
end $$;
