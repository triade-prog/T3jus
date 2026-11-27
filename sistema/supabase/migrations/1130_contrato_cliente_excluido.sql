-- Contrato novo ao mesmo tempo que a exclusão a pedido do titular (F3.180; PT-11, CH-01), pelo
-- plano revisado (project-files t3jus/f3-180/plano.md, seção 2, e revisao.md, M6 e D7).
--
-- A causa. portal_contrato_criar (0200) conferia o cliente ATIVO sem trava (contrato_conferir), e o
-- INSERT em contratos só pede FOR KEY SHARE no cliente pela chave estrangeira. FOR KEY SHARE espera o
-- FOR UPDATE do começo da exclusão, mas, quando ela confirma, a linha do cliente continua existindo e
-- a chave passa: o contrato nascia para o cliente EXCLUIDO, com objeto, observações e condições em
-- texto livre, e o sino CONTRATO_GERADO. E, com proposta, havia ciclo: o contrato segurava a proposta
-- (FOR UPDATE) e depois pedia o cliente; a exclusão segura o cliente e depois atualiza as propostas
-- (comercial_apagar_do_excluido, 1090). Um dos dois caía com 40P01.
--
-- A exclusão de hoje (versão em vigor de cliente_para_exclusao: 1114) pega a trava do motor das
-- automações do escritório, depois o cliente com FOR UPDATE, depois a trava pedidos_exclusao: (0170),
-- e só então o UPDATE do estado, cujo gatilho cliente_excluido_nao_muda (0460) recusa com
-- TEM_CONTRATO_OU_PROCESSO quem tem contrato de qualquer situação. Nenhum caminho de contrato pega a
-- trava das automações nem a pedidos_exclusao:.
--
-- 1. contrato_nasce (BEFORE INSERT em contratos), no molde de historico_anterior_nasce (1116): FOR
--    SHARE no cliente na mesma consulta que lê o estado. FOR SHARE conflita com o FOR UPDATE e com o
--    UPDATE da exclusão: se a exclusão vem antes, o INSERT espera e, quando ela confirma, o Postgres
--    reavalia o where sobre a versão nova (EXCLUIDO) e não acha nada (CLIENTE_EXCLUIDO); se o contrato
--    vem antes, a exclusão espera e o UPDATE do estado vê o contrato e recusa. O BEFORE roda antes da
--    conferência da chave estrangeira (gatilho AFTER interno). Cobre a tela, a importação de clientes
--    com contrato (0420) e qualquer caminho futuro. O cliente de outro escritório ou um id que não
--    existe recebem a mesma resposta, como nos moldes (revisão, m3).
-- 2. portal_contrato_criar recriada (corpo da 0200, nunca recriada; os embrulhos da 0530 e da 0740
--    só a chamam), com a ordem nova logo depois de entrar:
--      a. a trava do escritório contratos: (antes na 0200 depois da proposta);
--      b. o cliente pedido com FOR SHARE (só trava; o estado é conferido a seguir);
--      c. contrato_conferir, numa instrução nova, que já vê o estado confirmado e devolve o campo
--         clienteId para o cliente que não está ATIVO, como antes;
--      d. a proposta com FOR UPDATE, o número, o INSERT, como na 0200.
--    Por que a trava do escritório primeiro: a importação de clientes com contrato pega a mesma
--    trava (0420) e depois faz o UPDATE do juntar no cliente (FOR NO KEY UPDATE, que conflita com FOR
--    SHARE). Se a tela segurasse o cliente e depois esperasse a trava, haveria ciclo. Só a 0200 e a
--    0420 pegam a contratos: (revisão, D7), e a exclusão não a pega.
--    Por que o cliente antes da proposta: a exclusão faz cliente → propostas; com o contrato fazendo
--    cliente → proposta, quem chega segundo espera no cliente, antes de segurar a proposta.
-- Sem mudança de tela: o Portal já trata o campo clienteId e o motivo CLIENTE_EXCLUIDO
-- (packages/domain/src/textos.ts). Sem mudança no inventário.
--
-- Testes: pgTAP 165 (165_nascer_cliente_excluido_test.sql) e a concorrência
-- tests/concorrencia/exclusao-contrato-simultaneo.sh (c1 a c5, com o deadlock de hoje no c3).
-- Ordem da publicação (painel, P24): conferir com pg_get_functiondef que a produção tem o corpo da
-- 0200 em portal_contrato_criar; aplicar esta 1130, a 1131 e a 1132. Se for preciso voltar:
-- drop trigger contrato_nasce on contratos (a ordem nova de portal_contrato_criar pode ficar).
--
-- Função recriada e de onde parte:
--   portal_contrato_criar ................ 0200 (nunca recriada depois)
-- Nova: contrato_nasce (gatilho, não é security definer).

-- ---------------------------------------------------------------------------------------
-- 1. Nascer.
create function contrato_nasce() returns trigger
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
create trigger contrato_nasce before insert on contratos
  for each row execute function contrato_nasce();

-- ---------------------------------------------------------------------------------------
-- 2. Criar o contrato pela tela: trava do escritório → cliente (FOR SHARE) → proposta (FOR UPDATE).
create or replace function portal_contrato_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_id uuid;
  v_numero text;
  v_prop uuid;
  v_cli uuid;
  p propostas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  -- F3.180: a fila dos contratos do escritório, depois o cliente, depois a proposta.
  perform pg_advisory_xact_lock(hashtext('contratos:' || p_escritorio::text));
  begin v_cli := nullif(p_dados ->> 'clienteId', '')::uuid; exception when others then v_cli := null; end;
  perform 1 from clientes_escritorio where id = v_cli and escritorio_id = p_escritorio for share;
  e := contrato_conferir(p_escritorio, p_dados, true);
  if coalesce(p_dados ->> 'propostaId', '') <> '' then
    begin v_prop := (p_dados ->> 'propostaId')::uuid; exception when others then v_prop := null; end;
    select * into p from propostas where id = v_prop and escritorio_id = p_escritorio for update;
    if p.id is null then e := e || 'propostaId'::text;
    elsif p.estado <> 'ACEITA' then perform recusar_motivo('Só a proposta aceita vira contrato', 'PROPOSTA_NAO_ACEITA');
    elsif p.cliente_id::text <> p_dados ->> 'clienteId' then e := e || 'clienteId'::text;
    end if;
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o contrato', variadic e); end if;
  v_numero := contrato_proximo_numero(p_escritorio);
  perform definir_transicao('ELABORACAO');
  insert into contratos (escritorio_id, numero, cliente_id, objeto, observacoes, responsavel_id, proposta_id, criado_por)
  values (p_escritorio, v_numero, (p_dados ->> 'clienteId')::uuid, btrim(p_dados ->> 'objeto'),
          nullif(btrim(coalesce(p_dados ->> 'observacoes', '')), ''), (p_dados ->> 'responsavelId')::uuid, p.id, p_pessoa)
  returning id into v_id;
  perform contrato_gravar_advogados(p_escritorio, v_id, p_dados -> 'advogados');
  perform honorario_gravar(p_escritorio, 'CONTRATO', v_id, p_dados -> 'condicoes');
  if p.id is not null then
    perform definir_transicao('CONTRATO');
    update propostas set estado = 'CONTRATO' where id = p.id;
    perform registrar_historico('proposta.virou_contrato', 'propostas', p.id::text, jsonb_build_object('contrato', v_numero));
  end if;
  perform registrar_historico('contrato.criado', 'contratos', v_id::text,
    jsonb_build_object('numero', v_numero, 'proposta', p.numero,
                       'tipos', (select jsonb_agg(c ->> 'tipo') from jsonb_array_elements(p_dados -> 'condicoes') c)));
  return jsonb_build_object('id', v_id, 'numero', v_numero, 'versao', 1);
end $$;

call fechar_acesso();
