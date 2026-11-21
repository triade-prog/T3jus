-- 0551 · Quem cuida do repasse (F3.71, FI-05). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados rp-ficha, rp-trocar,
-- rp-trocado e rp-trocar-erro; decisões 3 e 4 da Carol, 21/11/2026).
-- - O padrão continua o responsável pelo contrato (0400). Trocar vale para o repasse inteiro.
-- - Só pode cuidar quem tem a área Financeiro: quem cuida faz a transferência e anota o atraso.
-- - O motivo é opcional e vai ao histórico do repasse e ao aviso de quem entra.
-- - Quem entra recebe o aviso no sino; quem sai recebe o aviso já lido (fica na lista, sem o ponto).

-- O sino passa a aceitar os avisos dos repasses (a lista é a que já existe mais as novas).
do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select unnest(array['REPASSE_PASSADO', 'REPASSE_ATRASADO', 'REPASSE_PROXIMA_ACAO'])) t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'levantamentos') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

-- Pode cuidar de um repasse: é da equipe e tem a área Financeiro.
create function pode_cuidar_repasse(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select pessoa_do_escritorio(p_pessoa, p_escritorio) and 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) $$;

-- Quem aparece na janela de troca: a equipe com a área Financeiro, com as áreas para reconhecer.
create function repasse_quem_pode_cuidar(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'dono', e_socio_dono(p.id, p_escritorio),
                                               'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)))
                            order by p.nome), '[]'::jsonb)
    from pessoas p
   where p.id in (select v.pessoa_id from vinculos v where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null)
     and pode_cuidar_repasse(p.id, p_escritorio)
$$;

-- Trocar quem cuida: agora com o motivo opcional, a recusa de quem não tem o Financeiro e o sino.
drop function portal_financeiro_repasse_responsavel(uuid, uuid, uuid, uuid);
create function portal_financeiro_repasse_responsavel(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid, p_responsavel uuid,
                                                      p_motivo text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l levantamentos;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_nome text;
  v_aviso jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio for update;
  if l.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  if p_responsavel is null or not pessoa_do_escritorio(p_responsavel, p_escritorio) then
    perform recusar_campos('Escolha alguém da equipe.', 'responsavelId');
  end if;
  if not pode_cuidar_repasse(p_responsavel, p_escritorio) then
    select nome into v_nome from pessoas where id = p_responsavel;
    perform recusar_motivo(v_nome || ' não tem a área Financeiro. Escolha outra pessoa.', 'SEM_AREA_FINANCEIRO');
  end if;
  if char_length(coalesce(v_motivo, '')) > 200 then
    perform recusar_campos('O motivo tem até 200 letras.', 'motivo');
  end if;
  if l.responsavel_id is distinct from p_responsavel then
    update levantamentos set responsavel_id = p_responsavel where id = l.id;
    perform registrar_historico('financeiro.repasse_responsavel', 'levantamentos', l.id::text,
      jsonb_strip_nulls(jsonb_build_object('de', l.responsavel_id, 'para', p_responsavel, 'motivo', v_motivo)));
    v_aviso := jsonb_build_object(
      'cliente', (select nome from clientes_escritorio where id = l.cliente_id),
      'levantamento', l.tipo,
      'quem', (select nome from pessoas where id = p_pessoa),
      'saiu', (select nome from pessoas where id = l.responsavel_id),
      'para', (select nome from pessoas where id = p_responsavel),
      'motivo', v_motivo,
      'partes', (select count(*) from destinacoes d where d.levantamento_id = l.id and d.feito_em is null and d.dispensado_em is null),
      'entrou', true);
    perform aviso_sino(p_escritorio, p_responsavel, p_pessoa, 'REPASSE_PASSADO', 'levantamentos', l.id, v_aviso);
    -- Quem sai fica sabendo, sem o ponto novo no sino.
    if l.responsavel_id is not null and l.responsavel_id is distinct from p_pessoa and pessoa_do_escritorio(l.responsavel_id, p_escritorio) then
      insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id, lido_em)
      values (p_escritorio, l.responsavel_id, 'REPASSE_PASSADO', jsonb_strip_nulls(v_aviso || jsonb_build_object('entrou', false)),
              'levantamentos', l.id, app_now());
    end if;
  end if;
  return pessoa_ref(p_responsavel);
end $$;

call fechar_acesso();
