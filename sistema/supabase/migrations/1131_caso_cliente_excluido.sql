-- Ligação nova a caso ao mesmo tempo que a exclusão a pedido do titular (F3.187; PT-11, EX-01), pelo
-- plano revisado (project-files t3jus/f3-180/plano.md, seção 4, e revisao.md, M4, M5 e D7).
--
-- A causa. Nenhuma das seis escritas em caso_clientes travava o cliente: cadastrar caso
-- (juridico_caso_criar_sem_docs, o corpo da 0240 renomeado na 0854), adicionar cliente ao caso
-- (portal_juridico_caso_cliente, 0240), o contrato que abre ou junta caso (0740, duas) e a importação
-- dos processos (0810, substituída, e 0920). A chave estrangeira só pede FOR KEY SHARE, que não
-- segura nada depois que a exclusão confirma. E caso_clientes_erros (0240) confere só que o cliente é
-- do escritório, não o estado: pela API dava para ligar a um caso um cliente já EXCLUIDO, sem corrida
-- nenhuma (a tela só não oferece).
--
-- 1. caso_cliente_nasce (BEFORE INSERT em caso_clientes), no molde de historico_anterior_nasce
--    (1116): FOR SHARE no cliente na mesma consulta que lê o estado; o EXCLUIDO recebe
--    CLIENTE_EXCLUIDO. Fecha a corrida e o buraco da API, nas seis escritas. A importação dos
--    processos que cruza com a exclusão espera por ela e volta inteira; o escritório refaz a prévia
--    (o mesmo da 1116). Só INSERT: cliente_id nunca muda por UPDATE (o único UPDATE é o contrato_id,
--    0740). O ARQUIVADO continua podendo ser ligado (plano, D6: dúvida no painel; se a Carol decidir
--    recusar, a conferência vai em caso_clientes_erros, pelo campo). caso_clientes_erros não muda
--    (revisão, D7): o gatilho já responde com CLIENTE_EXCLUIDO.
-- 2. portal_juridico_caso_cliente recriada (corpo da 0240, nunca recriada): o cliente com FOR SHARE
--    antes do caso com FOR UPDATE. Ordem cliente → caso: hoje a exclusão não toca em casos, mas a
--    F3.185 vai fazer UPDATE em casos na exclusão, e a ordem caso → cliente faria ciclo.
-- 3. juridico_caso_criar_sem_docs recriada (corpo da 0240, só renomeado na 0854): os clientes da
--    lista com FOR SHARE em ordem de id, numa instrução só, antes do INSERT do caso (revisão, M4).
--    Tira o ciclo entre duas telas que cadastram casos com os mesmos clientes em ordens diferentes.
--
-- O ciclo que ainda é possível (revisão, M4). O FOR SHARE conflita com o FOR NO KEY UPDATE de quem
-- atualiza o cliente (a chave estrangeira, FOR KEY SHARE, não conflitava). Quem trava vários
-- clientes (o cadastro de caso, aqui em ordem de id, e a importação dos processos, na ordem das
-- linhas) pode formar ciclo com outra transação que atualize dois dos mesmos clientes em outra ordem:
-- a importação de clientes com JUNTAR (imp_juntar, 0420, na ordem das linhas) e o desfazer dos
-- clientes (0420). Cai uma com 40P01, sem dado errado, e quem caiu refaz. O mesmo já vale para a
-- 1116 com o financeiro. Escrito no README.
--
-- Testes: pgTAP 165 (165_nascer_cliente_excluido_test.sql, com a trava de catálogo das tabelas com
-- chave para clientes_escritorio) e a concorrência tests/concorrencia/exclusao-caso-simultaneo.sh
-- (k1 a k5). Ordem da publicação (painel, P23): conferir com pg_get_functiondef que a produção tem os
-- corpos da 0240 em portal_juridico_caso_cliente e juridico_caso_criar_sem_docs; aplicar depois da
-- 1130. Se for preciso voltar: drop trigger caso_cliente_nasce on caso_clientes.
--
-- Funções recriadas e de onde partem:
--   portal_juridico_caso_cliente ......... 0240 (nunca recriada depois)
--   juridico_caso_criar_sem_docs ......... 0240 (portal_juridico_caso_criar, renomeada na 0854)
-- Nova: caso_cliente_nasce (gatilho, não é security definer).

-- ---------------------------------------------------------------------------------------
-- 1. Nascer.
create function caso_cliente_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from clientes_escritorio where id = new.cliente_id and escritorio_id = new.escritorio_id and estado <> 'EXCLUIDO' for share;
  if not found then
    perform recusar_motivo('O cliente foi excluído a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  return new;
end $$;
create trigger caso_cliente_nasce before insert on caso_clientes
  for each row execute function caso_cliente_nasce();

-- ---------------------------------------------------------------------------------------
-- 2. Adicionar cliente ao caso: cliente (FOR SHARE) → caso (FOR UPDATE).
create or replace function portal_juridico_caso_cliente(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_cli uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  -- F3.187: o cliente antes do caso.
  begin v_cli := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then v_cli := null; end;
  perform 1 from clientes_escritorio where id = v_cli and escritorio_id = p_escritorio for share;
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  if cardinality(caso_clientes_erros(p_escritorio, jsonb_build_array(p_dados))) > 0 then perform recusar_campos('Confira o cliente', 'clientes'); end if;
  v_cli := (p_dados ->> 'clienteId')::uuid;
  if exists (select 1 from caso_clientes where caso_id = c.id and cliente_id = v_cli) then
    perform recusar_motivo('Este cliente já está no caso', 'CLIENTE_JA_NO_CASO');
  end if;
  insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
  values (p_escritorio, c.id, v_cli, p_dados ->> 'papel', nullif(p_dados ->> 'contratoId', '')::uuid,
          (select coalesce(max(ordem), 0) + 1 from caso_clientes where caso_id = c.id));
  perform registrar_historico('juridico.caso_cliente', 'casos', c.id::text, jsonb_build_object('cliente', v_cli, 'papel', p_dados ->> 'papel'));
  return jsonb_build_object('id', c.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. Cadastrar o caso: os clientes da lista com FOR SHARE, em ordem de id, antes do caso (M4).
create or replace function juridico_caso_criar_sem_docs(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_etapa uuid;
  v_id uuid;
  x record;
  v_clis uuid[] := '{}';
  v_um uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  -- F3.187 (revisão, M4): os clientes pedidos, numa instrução só e em ordem de id.
  if jsonb_typeof(p_dados -> 'clientes') = 'array' and jsonb_array_length(p_dados -> 'clientes') <= 20 then
    for x in select v from jsonb_array_elements(p_dados -> 'clientes') t(v) loop
      begin v_um := nullif(x.v ->> 'clienteId', '')::uuid; exception when others then v_um := null; end;
      if v_um is not null then v_clis := v_clis || v_um; end if;
    end loop;
    perform 1 from clientes_escritorio where id = any (v_clis) and escritorio_id = p_escritorio order by id for share;
  end if;
  perform etapas_garantir(p_escritorio);
  e := caso_erros(p_escritorio, p_dados) || caso_clientes_erros(p_escritorio, p_dados -> 'clientes');
  begin v_etapa := nullif(p_dados ->> 'etapaId', '')::uuid; exception when others then v_etapa := null; end;
  if v_etapa is null or not exists (select 1 from etapas where id = v_etapa and escritorio_id = p_escritorio and not final) then
    e := e || 'etapaId'::text;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o caso', variadic (select array_agg(distinct v order by v) from unnest(e) v)); end if;
  if nullif(btrim(coalesce(p_dados ->> 'numero', '')), '') is not null and exists (
       select 1 from casos where escritorio_id = p_escritorio and numero_cnj = regexp_replace(p_dados ->> 'numero', '[^0-9]', '', 'g')) then
    raise exception 'Já existe um caso com este número' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'NUMERO_JA_CADASTRADO', 'campos', jsonb_build_array('numero'))::text;
  end if;

  insert into casos (escritorio_id, nome, area, parte_contraria, numero_cnj, tribunal, vara, sistema, distribuido_em, valor_causa,
                     etapa_id, responsavel_id, avisar_cliente, criado_por)
  values (p_escritorio, btrim(p_dados ->> 'nome'), p_dados ->> 'area', nullif(btrim(coalesce(p_dados ->> 'parteContraria', '')), ''),
          nullif(regexp_replace(coalesce(p_dados ->> 'numero', ''), '[^0-9]', '', 'g'), ''),
          nullif(btrim(coalesce(p_dados ->> 'tribunal', '')), ''), nullif(btrim(coalesce(p_dados ->> 'vara', '')), ''),
          nullif(btrim(coalesce(p_dados ->> 'sistema', '')), ''), json_data(p_dados, 'distribuidoEm'), json_inteiro(p_dados, 'valorCausa'),
          v_etapa, (p_dados ->> 'responsavelId')::uuid, coalesce((p_dados ->> 'avisarCliente')::boolean, true), p_pessoa)
  returning id into v_id;
  for x in select v, n from jsonb_array_elements(p_dados -> 'clientes') with ordinality t(v, n) loop
    insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, contrato_id, ordem)
    values (p_escritorio, v_id, (x.v ->> 'clienteId')::uuid, x.v ->> 'papel', nullif(x.v ->> 'contratoId', '')::uuid, x.n);
  end loop;
  insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
  values (p_escritorio, v_id, v_etapa, 'Caso cadastrado.', p_pessoa);
  perform registrar_historico('juridico.caso_cadastrado', 'casos', v_id::text,
    jsonb_build_object('etapa', v_etapa, 'responsavel', p_dados ->> 'responsavelId', 'clientes', jsonb_array_length(p_dados -> 'clientes')));
  return jsonb_build_object('id', v_id, 'versao', 1);
end $$;

call fechar_acesso();
