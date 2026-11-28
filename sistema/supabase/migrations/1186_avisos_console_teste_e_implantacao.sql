-- 1186 · O sino do Console com o teste grátis e a implantação juntos (CO-09 F1.34 e CO-08 F1.46).
-- A 1163 (avisos do teste) e a 1184 (avisos da implantação) mexem nas mesmas duas peças de
-- avisos_console, cada uma sem conhecer a outra:
--  * o check de tipo: a 1184 refaz com lista fixa (sem os TESTE_ da 1163);
--  * aviso_console_visivel: a 1163 refaz a partir da 0691 (sem os IMPLANTACAO_ da 1184) e a 1184
--    refaz sem os TESTE_.
-- No banco do Supabase a 1184 entrou antes da 1163; no repositório, a 1163 vem antes. Esta
-- migration deixa as duas ordens no mesmo lugar: o check é a união do que existe hoje com os tipos
-- das duas frentes, e a visibilidade junta as regras das duas. Não muda nenhuma linha.

do $$
declare v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_console'::regclass and conname = 'avisos_console_tipo_check'
    union select unnest(array['INTERESSADO_NOVO', 'INTERESSADO_ATRIBUIDO', 'INTERESSADO_VENCIDO', 'FATURA_ATRASO',
                              'IMPLANTACAO_PRAZO', 'IMPLANTACAO_ISENCAO_FIM', 'IMPLANTACAO_CARNE_RECUSADO',
                              'TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ACABOU', 'TESTE_QUER_ASSINAR', 'TESTE_REPETIDO'])) t;
  alter table avisos_console drop constraint avisos_console_tipo_check;
  execute format('alter table avisos_console add constraint avisos_console_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

-- Visível enquanto a pessoa tiver a permissão de agora (0691, 1163 e 1184 juntas). Quem mudar de
-- novo esta função parte desta versão.
create or replace function aviso_console_visivel(p_tipo text) returns boolean
language sql stable
set search_path = public
as $$
  select case when p_tipo like 'INTERESSADO_%' then pode_global('console.interessados.ver')
              when p_tipo like 'FATURA_%' then pode_global('console.cobranca.ver')
              when p_tipo = 'IMPLANTACAO_ISENCAO_FIM' then pode_global('console.implantacao.regras')
              when p_tipo like 'IMPLANTACAO_%' then pode_global('console.implantacao.ver')
              when p_tipo like 'TESTE_%' then pode_global('console.teste.ver')
              else true end
$$;

call fechar_acesso();
