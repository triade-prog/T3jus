-- A importação e o cliente excluído a pedido do titular (F3.158; PT-11, VA-05), pelo plano revisado
-- (project-files t3jus/f3-177/plano-v2.md e revisao-v2.md, que vale onde os dois divergem) e pela
-- decisão da Carol C2 = (a), de 25/11/2026: o cliente com algo no processo continua no processo.
--
-- 1. As linhas da importação (importacao_linhas guardam o bruto da planilha, com nome, CPF,
--    telefone, e-mail e endereço, até o fim do prazo de desfazer, 7 dias). Na exclusão (gatilho
--    importacao_apagar_do_excluido, entre historico_anterior_ e sino_ pela ordem do nome), nas
--    importações CONCLUIDA ou DESFEITA do escritório (a PREVIA não muda):
--    a) saem as linhas do cliente (cliente_id, ou norm.cliente.id: o cliente novo, o juntado, o caso
--       e o lançamento que acharam o cliente e as de fora com outro erro);
--    b) nas importações de clientes (CLIENTES e CLIENTES_CONTRATOS; na de processos o duplicado é um
--       caso), sai a linha que apontava o excluído como duplicado e não virou outro cadastro (PULAR
--       ou erro): é a mesma pessoa, pelo mesmo CPF. A que virou cadastro NOVO de outra pessoa fica,
--       sem a chave duplicado; e a linha de outra pessoa com o telefone do excluído fica, sem a
--       chave telefoneDe, que guarda o nome copiado na prévia (revisão v2, M-B);
--    c) pelo CPF que a exclusão acabou de apagar (old.documento), saem as linhas sem cliente cujo
--       documento é o dele: em norm.cliente.documento ou no bruto com as correções (documento na
--       importação de clientes, cliente_documento na de casos e de financeiro), normalizado como a
--       importação normaliza (revisão v2, m-a). Não procura pelo nome: a linha que cita o cliente só
--       pelo nome, sem CPF, fica até 7 dias (R2, limite aceito).
-- 2. O desfazer dos processos (C2 = a). A ligação do cliente a um caso que já existia, feita pela
--    importação, fica quando alguém trabalhou no caso com ele depois da importação
--    (imp_ligacao_mexida, pelo catálogo, para a tabela nova entrar sozinha; revisão v1, M3). O
--    DELETE do desfazer usa o mesmo predicado, por linha (M4). A ligação que fica guarda o
--    importacao_id da importação desfeita, e a ficha do caso continua dizendo que ela veio da
--    importação (m9).
-- 3. A exclusão também olha os papéis do processo com o nome do cliente, numa lista curta (regra d):
--    pedido de documento, levantamento, requisição a caminho e versão de petição com ele nas
--    partes. Quem o desfazer antigo já soltou passa a só poder ser arquivado.
-- 4. Os clientes já excluídos ficam para a 1119 (importacao_linhas_preencher_excluidos), só por id.
--
-- Fica de fora: o caso NOVO de importação desfeita prende o cliente (F3.185); a ligação nova a caso
-- ao mesmo tempo que a exclusão (F3.187); o aviso do segundo cadastro com o mesmo CPF (F3.188).
--
-- Funções recriadas e de onde partem (a versão mais recente de cada uma):
--   imp_desfazer_plano_casos ..... 0920
--   imp_desfazer_cc .............. 0810 (a portal_importacao_desfazer de lá, renomeada na 0820; o
--                                  embrulho da 0820, recriado na 1116, e o da 0920 não mudam)
--   cliente_vinculos_lgpd ........ 0460
-- Novas: importacao_excluido_limpar, importacao_apagar_do_excluido (gatilho), imp_ligacao_mexida,
-- importacao_linhas_preencher_excluidos (a 1119 chama). Nenhuma nova é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. As linhas da importação do cliente excluído. Devolve {linhas, chaves}: as linhas apagadas e as
-- que perderam a chave duplicado ou telefoneDe. Sem evento (cliente.dados_excluidos já registra a
-- exclusão). Idempotente. Não é security definer: roda dentro da exclusão (contexto do escritório)
-- e do preenchimento (com as marcas da rotina).
create function importacao_excluido_limpar(p_escritorio uuid, p_cliente uuid, p_documento text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_doc text := nullif(regexp_replace(coalesce(p_documento, ''), '[^0-9]', '', 'g'), '');
  v_cli text := p_cliente::text;
  v_n integer;
  v_linhas integer := 0;
  v_chaves integer;
begin
  -- a) As linhas do cliente.
  delete from importacao_linhas l using importacoes i
   where i.id = l.importacao_id and i.escritorio_id = p_escritorio and i.estado in ('CONCLUIDA', 'DESFEITA')
     and l.escritorio_id = p_escritorio
     and (l.cliente_id = p_cliente or l.norm -> 'cliente' ->> 'id' = v_cli);
  get diagnostics v_n = row_count;
  v_linhas := v_linhas + v_n;
  -- b) O duplicado que é a mesma pessoa e não virou outro cadastro, só nas importações de clientes.
  delete from importacao_linhas l using importacoes i
   where i.id = l.importacao_id and i.escritorio_id = p_escritorio and i.estado in ('CONCLUIDA', 'DESFEITA')
     and i.o_que in ('CLIENTES', 'CLIENTES_CONTRATOS') and l.escritorio_id = p_escritorio
     and l.norm -> 'duplicado' ->> 'id' = v_cli
     and not (l.situacao = 'IMPORTADA' and l.cliente_id is not null and l.cliente_id <> p_cliente);
  get diagnostics v_n = row_count;
  v_linhas := v_linhas + v_n;
  -- c) Pelo CPF ou CNPJ de antes da exclusão, as linhas sem cliente.
  if v_doc is not null then
    delete from importacao_linhas l using importacoes i
     where i.id = l.importacao_id and i.escritorio_id = p_escritorio and i.estado in ('CONCLUIDA', 'DESFEITA')
       and l.escritorio_id = p_escritorio and l.cliente_id is null and l.norm -> 'cliente' ->> 'id' is null
       and (l.norm -> 'cliente' ->> 'documento' = v_doc
            or nullif(regexp_replace(coalesce((l.bruto || l.correcoes) ->> 'documento', ''), '[^0-9]', '', 'g'), '') = v_doc
            or nullif(regexp_replace(coalesce((l.bruto || l.correcoes) ->> 'cliente_documento', ''), '[^0-9]', '', 'g'), '') = v_doc);
    get diagnostics v_n = row_count;
    v_linhas := v_linhas + v_n;
  end if;
  -- As linhas de outra pessoa que citam o excluído: sem a chave duplicado (o cadastro NOVO) e sem a
  -- chave telefoneDe (revisão v2, M-B).
  update importacao_linhas l
     set norm = l.norm - array_remove(array[case when l.norm -> 'duplicado' ->> 'id' = v_cli then 'duplicado' end,
                                            case when l.norm -> 'telefoneDe' ->> 'id' = v_cli then 'telefoneDe' end], null)
    from importacoes i
   where i.id = l.importacao_id and i.escritorio_id = p_escritorio and i.estado in ('CONCLUIDA', 'DESFEITA')
     and i.o_que in ('CLIENTES', 'CLIENTES_CONTRATOS') and l.escritorio_id = p_escritorio
     and (l.norm -> 'duplicado' ->> 'id' = v_cli or l.norm -> 'telefoneDe' ->> 'id' = v_cli);
  get diagnostics v_chaves = row_count;
  return jsonb_build_object('linhas', v_linhas, 'chaves', v_chaves);
end $$;

create function importacao_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- O gatilho é AFTER: OLD ainda traz o CPF ou CNPJ que a exclusão acabou de limpar (0170).
  perform importacao_excluido_limpar(new.escritorio_id, new.id, old.documento);
  return null;
end $$;
-- Pelo nome, roda depois de historico_anterior_apagar_do_excluido (1116) e antes de
-- sino_apagar_do_excluido e z_cliente_excluido_arquivos, sem depender de nenhum.
create trigger importacao_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function importacao_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 2. "Alguém trabalhou neste caso, com este cliente, depois da importação?" No molde de
-- imp_caso_mexido (0820), pelo catálogo, para a tabela nova entrar sozinha. Fora da varredura:
-- caso_clientes (a própria ligação; revisão v2, m-b) e as três da importação, escritas aqui.
--   1. a ligação tem contrato; ou
--   2. há linha do par (caso, cliente) em qualquer tabela com caso_id e cliente_id (hoje:
--      compromissos, contas_pagar, documento_pedidos, exitos_conferir, levantamentos e
--      requisicoes_a_caminho; o 162 trava a lista); ou
--   3. há linha do caso criada depois da importação (estrito: o que a própria importação cria tem
--      a mesma hora) em qualquer tabela com caso_id e criado_em ou em (o documento enviado sem
--      pedido, a mudança de etapa, o prazo, a tarefa). Na tabela que também tem cliente_id, só a
--      linha sem cliente: a de um cliente conta só para ele, pelo item 2 (o levantamento de Ana não
--      segura Bia, M4; o compromisso de outro cliente não segura este, M3); ou
--   4. há versão de petição do caso com o cliente nas partes.
create function imp_ligacao_mexida(cc caso_clientes, i importacoes) returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  v boolean;
  v_fora text[] := array['caso_clientes', 'historico_financeiro_anterior', 'lembrete_contrato', 'importacao_linhas'];
begin
  if cc.contrato_id is not null then
    return true;
  end if;
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> all (v_fora)
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'caso_id' and not a.attisdropped)
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'cliente_id' and not a.attisdropped)
            order by c.relname loop
    execute format('select exists (select 1 from %I where caso_id = $1 and cliente_id = $2)', r.relname) into v using cc.caso_id, cc.cliente_id;
    if v then return true; end if;
  end loop;
  for r in select c.relname, (select a.attname from pg_attribute a where a.attrelid = c.oid and a.attname in ('criado_em', 'em')
                                and not a.attisdropped order by a.attname = 'criado_em' desc limit 1) coluna,
                  exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'cliente_id' and not a.attisdropped) com_cliente
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> all (v_fora)
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'caso_id' and not a.attisdropped)
              and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname in ('criado_em', 'em') and not a.attisdropped)
            order by c.relname loop
    execute format('select exists (select 1 from %I where caso_id = $1 and %I > $2%s)', r.relname, r.coluna,
                   case when r.com_cliente then ' and cliente_id is null' end) into v using cc.caso_id, i.importado_em;
    if v then return true; end if;
  end loop;
  return exists (select 1 from peticao_versoes pv join peticoes p on p.id = pv.peticao_id
                  where p.caso_id = cc.caso_id and pv.escritorio_id = cc.escritorio_id and pv.escolhas -> 'partes' ? cc.cliente_id::text);
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O desfazer dos processos.

-- O plano, corpo da 0920: a ligação mexida não sai e entra em mexidos como o caso (uma entrada por
-- caso, sem repetir o caso que já entrou como mexido); ligacoes conta só as que saem.
create or replace function imp_desfazer_plano_casos(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  with cs as (select c.*, imp_caso_mexido(c.id) mexido from casos c
               where c.escritorio_id = i.escritorio_id and c.importacao_id = i.id
                 and (c.situacao = 'ANDAMENTO' or c.encerrado_por = 'IMPORTADO_ENCERRADO')),
  lig as (select cc.caso_id, imp_ligacao_mexida(cc, i) mexido from caso_clientes cc where cc.escritorio_id = i.escritorio_id and cc.importacao_id = i.id)
  select jsonb_build_object(
    'clientes', 0, 'juntados', 0, 'contratos', 0, 'parcelas', 0,
    'casos', (select count(*) from cs where not mexido and situacao = 'ANDAMENTO'),
    'encerrados', (select count(*) from cs where not mexido and encerrado_por = 'IMPORTADO_ENCERRADO'),
    'ligacoes', (select count(*) from lig where not mexido),
    'mexidos', (select coalesce(jsonb_agg(x order by x ->> 'nome'), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'CASO', 'id', id, 'nome', nome) x from cs where mexido
                  union
                  select jsonb_build_object('tipo', 'CASO', 'id', s.id, 'nome', s.nome) from casos s
                   where s.id in (select caso_id from lig where mexido) and s.id not in (select id from cs where mexido)) m))
$$;

-- O desfazer, corpo da 0810 (renomeado na 0820): a ligação sai só quando não foi mexida, pelo mesmo
-- predicado do plano, por linha (revisão v1, M4).
create or replace function imp_desfazer_cc(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_plano jsonb;
  c casos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  if i.id is null or i.o_que <> 'CASOS' then return imp_desfazer_clientes(p_pessoa, p_escritorio, p_importacao, p_motivo); end if;
  if i.estado not in ('CONCLUIDA', 'DESFEITA') then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  if i.estado = 'DESFEITA' then perform recusar_motivo('A importação já foi desfeita', 'JA_DESFEITA'); end if;
  if i.criado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem importou ou a sócia dona desfaz' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.desfazer_ate < app_now() then perform recusar_motivo('O prazo de desfazer acabou', 'PRAZO_ENCERRADO'); end if;
  if length(v_motivo) not between 3 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  v_plano := imp_desfazer_plano(i);

  -- Os casos novos: em Encerrados, marcados "importação desfeita", sem resultado.
  for c in select * from casos where escritorio_id = p_escritorio and importacao_id = i.id and situacao = 'ANDAMENTO' loop
    if exists (select 1 from jsonb_array_elements(v_plano -> 'mexidos') m where m ->> 'id' = c.id::text) then continue; end if;
    update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), encerrado_por = 'IMPORTACAO_DESFEITA' where id = c.id;
    perform registrar_historico('juridico.caso_encerrado', 'casos', c.id::text,
      jsonb_build_object('importacaoDesfeita', i.id, 'motivo', left(v_motivo, 300)));
  end loop;
  -- Os casos que já existiam perdem só o cliente que a importação ligou e com quem ninguém trabalhou.
  delete from caso_clientes cc where cc.escritorio_id = p_escritorio and cc.importacao_id = i.id and not imp_ligacao_mexida(cc, i);

  perform definir_transicao('DESFEITA', v_motivo);
  update importacoes set estado = 'DESFEITA', desfeita_em = app_now(), desfeita_por = p_pessoa, motivo_desfazer = v_motivo
   where id = i.id returning * into i;
  perform registrar_historico('importacao.desfeita', 'importacoes', i.id::text, jsonb_build_object('motivo', v_motivo) || (v_plano - 'mexidos'));
  return imp_json(i, p_pessoa) || jsonb_build_object('feito', v_plano);
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O contrato e o processo que impedem a exclusão (regra d; corpo da 0460). Em processos entram os
-- casos com a ligação ou com papel do processo que tem o nome do cliente e não se limpa, numa lista
-- curta: pedido de documento, levantamento, requisição a caminho e versão de petição com ele nas
-- partes. Fora: compromissos (aceitam qualquer caso e prenderiam quem só teve uma reunião anotada),
-- contas_pagar (a F3.156 limpa) e exitos_conferir (exigem contrato, que nunca sai). Só os casos do
-- escritório do cliente; sem repetição, na ordem de criação.
create or replace function cliente_vinculos_lgpd(p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.contratos is null and x.processos is null then null
              else jsonb_build_object('contratos', coalesce(x.contratos, '[]'::jsonb), 'processos', coalesce(x.processos, '[]'::jsonb)) end
    from (select (select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero) order by c.criado_em)
                    from contratos c where c.cliente_id = p_cliente) contratos,
                 (select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'numeroCnj', s.numero_cnj) order by s.criado_em, s.id)
                    from casos s
                   where s.escritorio_id = e.esc
                     and (exists (select 1 from caso_clientes cc where cc.caso_id = s.id and cc.cliente_id = p_cliente)
                          or s.id in (select d.caso_id from documento_pedidos d where d.escritorio_id = e.esc and d.cliente_id = p_cliente)
                          or s.id in (select l.caso_id from levantamentos l where l.escritorio_id = e.esc and l.cliente_id = p_cliente)
                          or s.id in (select q.caso_id from requisicoes_a_caminho q where q.escritorio_id = e.esc and q.cliente_id = p_cliente)
                          or s.id in (select p.caso_id from peticao_versoes pv join peticoes p on p.id = pv.peticao_id
                                       where pv.escritorio_id = e.esc and pv.escolhas -> 'partes' ? p_cliente::text))) processos
            from (select (select k.escritorio_id from clientes_escritorio k where k.id = p_cliente) esc) e) x
$$;

-- Os índices da regra d (revisão v1, m2): por escritório e cliente.
create index if not exists documento_pedidos_cliente on documento_pedidos (escritorio_id, cliente_id);
create index if not exists levantamentos_cliente on levantamentos (escritorio_id, cliente_id);
create index if not exists requisicoes_a_caminho_cliente on requisicoes_a_caminho (escritorio_id, cliente_id);

-- ---------------------------------------------------------------------------------------
-- 5. Os clientes excluídos antes desta migration (a 1119 chama), no molde de
-- avisos_sino_preencher_excluidos (1110): só por id (o CPF já saiu da ficha), com as marcas
-- fim_da_guarda e aplicando_prazos só durante a chamada. Devolve {escritório: {clientes, linhas,
-- chaves}}. Idempotente: chamada de novo, devolve {}.
create function importacao_linhas_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v jsonb;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select c.id, c.escritorio_id from clientes_escritorio c
            where c.estado = 'EXCLUIDO'
              and exists (select 1 from importacao_linhas l where l.escritorio_id = c.escritorio_id)
            order by c.escritorio_id, c.id loop
    v := importacao_excluido_limpar(r.escritorio_id, r.id, null);
    if (v ->> 'linhas')::integer + (v ->> 'chaves')::integer > 0 then
      v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0, "linhas": 0, "chaves": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'linhas', (v_um ->> 'linhas')::integer + (v ->> 'linhas')::integer,
        'chaves', (v_um ->> 'chaves')::integer + (v ->> 'chaves')::integer));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Inventário (PT-11): o prazo das linhas importadas (revisão v1, m5) e o destino no pedido do
-- titular. A situação continua APROVADO, com o ok da Carol antes do merge.
update inventario_dados
   set prazo = 'As linhas da prévia: 24 horas; as da importação concluída ou desfeita (de fora e importadas): até o fim do prazo de desfazer (7 dias)',
       no_fim = 'Apagadas no fim do prazo de desfazer; as do cliente excluído a pedido do titular, e as que trazem o CPF dele, saem na exclusão'
 where tabela = 'importacao_linhas';

call fechar_acesso();
