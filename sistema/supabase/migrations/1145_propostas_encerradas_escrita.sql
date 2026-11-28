-- A proposta de cliente excluído ou arquivado a pedido do titular não se envia, não se responde e não
-- se edita, com a recusa clara (F3.204; PT-11, AP-05), pelo plano revisado (project-files
-- t3jus/f3-204/plano.md, seção 4.2, e revisao.md, M2 e M4). A leitura está na 1144.
--
-- portal_proposta_enviada, portal_proposta_resposta e portal_proposta_editar (corpos da 0190; nenhuma
-- migration depois as recria) seguem a ordem da 1140 (portal_proposta_pedir_contrato): lê o cliente da
-- proposta sem trava, trava o cliente com FOR SHARE, recusa o EXCLUIDO (CLIENTE_EXCLUIDO) e o ARQUIVADO
-- (CLIENTE_ARQUIVADO) antes de qualquer outra conferência, e só então lê a proposta com FOR UPDATE. A
-- ação feita durante a exclusão (ou o arquivamento) espera por ela e é recusada; a que chega antes faz a
-- exclusão esperar e entra (a proposta fica ACEITA, RECUSADA ou ENVIADA e, se for o caso, encerrada na
-- leitura). Fecha o "rascunho do arquivado ainda se marca como enviado" (plano, 1.1) e troca o texto
-- errado do excluído ("Complete a proposta antes de enviar", porque a exclusão apagou o escopo).
--
-- Sem deadlock: a exclusão e o arquivamento fazem cliente → propostas (1114, 1135, 1143); estes três
-- caminhos também fazem cliente → proposta, e nenhum segura a proposta e depois pede o cliente. A F3.194
-- (o gatilho BEFORE INSERT com FOR SHARE no cliente em propostas, atendimentos e retornos) não recria
-- estas funções; reler com FOR SHARE o cliente que a mesma transação já travou não custa nada (revisão,
-- M4). Quem fizer a F3.194 confere que o gatilho novo de atendimentos não muda o texto destas recusas,
-- que agora vêm antes do INSERT. Roteiro: tests/concorrencia/exclusao-proposta-simultanea.sh.

-- ---------------------------------------------------------------------------------------
-- O cliente da proposta, travado, e a recusa de quem saiu a pedido do titular. Sem security definer: só
-- as três funções abaixo chamam, já dentro de entrar_escritorio.
create function proposta_cliente_travar(p_escritorio uuid, p_proposta uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  v_cli uuid;
  v_estado text;
begin
  select x.cliente_id into v_cli from propostas x where x.id = p_proposta and x.escritorio_id = p_escritorio;
  if v_cli is null then raise exception 'Proposta não encontrada' using errcode = 'TC404'; end if;
  select k.estado into v_estado from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio for share;
  if v_estado = 'EXCLUIDO' then
    perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  if v_estado = 'ARQUIVADO' then
    perform recusar_motivo('Este cliente foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Editar (PT-19, PT-03): o cliente antes; o resto como na 0190.
create or replace function portal_proposta_editar(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  e text[];
  v_versao integer;
  v_antes jsonb;
  v_depois jsonb;
  v_campos text[];
  v_ret_antes jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  perform proposta_cliente_travar(p_escritorio, p_proposta);
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio for update;
  if a.estado not in ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO') then perform recusar_motivo('A proposta já foi respondida', 'PROPOSTA_RESPONDIDA'); end if;
  e := proposta_conferir(p_escritorio, p_dados || jsonb_build_object('clienteId', a.cliente_id),
                         not (a.estado = 'RASCUNHO' and coalesce((p_dados ->> 'rascunho')::boolean, false)));
  if cardinality(e) > 0 then perform recusar_campos('Confira a proposta', variadic (select array_agg(distinct x) from unnest(e) x)); end if;
  v_antes := honorario_lista(p_escritorio, 'PROPOSTA', p_proposta);
  v_ret_antes := prox_contato(a.cliente_id);
  update propostas set servico = btrim(p_dados ->> 'servico'), escopo = nullif(btrim(coalesce(p_dados ->> 'escopo', '')), ''),
                       responsavel_id = (p_dados ->> 'responsavelId')::uuid, valida_ate = json_data(p_dados, 'validaAte')
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  perform honorario_gravar(p_escritorio, 'PROPOSTA', p_proposta, p_dados -> 'condicoes');
  v_depois := honorario_lista(p_escritorio, 'PROPOSTA', p_proposta);
  if jsonb_typeof(p_dados -> 'retorno') = 'object' and coalesce(p_dados -> 'retorno' ->> 'em', '') <> ''
     and (v_ret_antes is null or v_ret_antes ->> 'em' is distinct from p_dados -> 'retorno' ->> 'em'
          or v_ret_antes -> 'responsavel' ->> 'id' is distinct from p_dados -> 'retorno' ->> 'responsavelId') then
    perform proposta_marcar_retorno(p_escritorio, p_proposta, p_pessoa,
      p_dados -> 'retorno' || jsonb_build_object('oque', coalesce(nullif(p_dados -> 'retorno' ->> 'oque', ''), v_ret_antes ->> 'oque')));
  end if;
  select coalesce(array_agg(k order by k), '{}') into v_campos
    from unnest(array['servico', 'escopo', 'responsavel_id', 'valida_ate']) k
   where to_jsonb(a) -> k is distinct from (select to_jsonb(x) -> k from propostas x where x.id = p_proposta);
  if cardinality(v_campos) > 0 or v_antes <> v_depois then
    perform registrar_historico('proposta.editada', 'propostas', p_proposta::text,
      jsonb_build_object('campos', to_jsonb(v_campos)) || case when v_antes <> v_depois
        then jsonb_build_object('condicoes_antes', v_antes, 'condicoes_depois', v_depois) else '{}'::jsonb end);
  end if;
  return jsonb_build_object('id', p_proposta, 'versao', v_versao);
end $$;

-- ---------------------------------------------------------------------------------------
-- Marcar como enviada: o cliente antes; o resto como na 0190.
create or replace function portal_proposta_enviada(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  perform proposta_cliente_travar(p_escritorio, p_proposta);
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio for update;
  if a.estado <> 'RASCUNHO' then perform recusar_motivo('A proposta já foi enviada', 'JA_ENVIADA'); end if;
  if a.escopo is null or not exists (select 1 from honorario_condicoes where dono_tipo = 'PROPOSTA' and dono_id = a.id) then
    perform recusar_motivo('Complete a proposta antes de enviar', 'PROPOSTA_INCOMPLETA');
  end if;
  perform definir_transicao('ENVIADA');
  update propostas set estado = 'ENVIADA', enviada_em = app_now()
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  return v_versao;
end $$;

-- ---------------------------------------------------------------------------------------
-- Registrar a resposta: o cliente antes (hoje a recusa vinha do gatilho de atendimentos, depois do
-- UPDATE, com o texto genérico); o resto como na 0190.
create or replace function portal_proposta_resposta(p_pessoa uuid, p_escritorio uuid, p_proposta uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a propostas;
  e text[] := '{}';
  v_resp text := p_dados ->> 'resposta';
  v_em date := json_data(p_dados, 'em');
  v_canal text := p_dados ->> 'canal';
  v_motivo text := nullif(p_dados ->> 'motivo', '');
  v_obs text := nullif(btrim(coalesce(p_dados ->> 'observacao', '')), '');
  v_estado text;
  v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  perform proposta_cliente_travar(p_escritorio, p_proposta);
  select * into a from propostas where id = p_proposta and escritorio_id = p_escritorio for update;
  if a.estado not in ('ENVIADA', 'NEGOCIACAO') then perform recusar_motivo('Marque a proposta como enviada antes', 'PROPOSTA_NAO_ENVIADA'); end if;
  if coalesce(v_resp, '') not in ('ACEITOU', 'MUDANCA', 'RECUSOU') then e := e || 'resposta'::text; end if;
  if v_em is null or v_em > hoje_brasilia() then e := e || 'em'::text; end if;
  if coalesce(v_canal, '') not in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL', 'VIDEO') then e := e || 'canal'::text; end if;
  if v_resp = 'RECUSOU' and coalesce(v_motivo, '') not in ('VALOR_ALTO', 'OUTRO_ESCRITORIO', 'DESISTIU', 'SEM_RESPOSTA', 'OUTRO') then e := e || 'motivo'::text; end if;
  if length(coalesce(v_obs, '')) > 1000 then e := e || 'observacao'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a resposta', variadic e); end if;
  v_estado := case v_resp when 'ACEITOU' then 'ACEITA' when 'RECUSOU' then 'RECUSADA' else 'NEGOCIACAO' end;
  if v_estado <> a.estado then perform definir_transicao(v_estado, case when v_resp = 'RECUSOU' then v_motivo end); end if;
  update propostas set estado = v_estado, respondida_em = v_em, resposta_canal = v_canal,
                       motivo_recusa = case when v_resp = 'RECUSOU' then v_motivo end
   where id = p_proposta and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('propostas', p_proposta); end if;
  insert into atendimentos (escritorio_id, cliente_id, ocorrido_em, canal, atendido_por, resumo, criado_por)
  values (p_escritorio, a.cliente_id,
          case when v_em = hoje_brasilia() then app_now() else (v_em + time '12:00') at time zone 'America/Sao_Paulo' end,
          v_canal, p_pessoa,
          case v_resp when 'ACEITOU' then 'Aceitou a proposta ' || a.numero || '.'
                      when 'RECUSOU' then 'Recusou a proposta ' || a.numero || '.'
                      else 'Pediu mudança na proposta ' || a.numero || '.' end || coalesce(' ' || v_obs, ''),
          p_pessoa);
  if v_resp = 'MUDANCA' then
    perform proposta_marcar_retorno(p_escritorio, p_proposta, p_pessoa,
      jsonb_build_object('em', hoje_brasilia(), 'responsavelId', a.responsavel_id, 'oque', 'Responder ao pedido de mudança da proposta ' || a.numero));
  end if;
  perform registrar_historico('proposta.resposta', 'propostas', p_proposta::text,
    jsonb_build_object('resposta', v_resp, 'em', v_em, 'canal', v_canal, 'motivo', v_motivo, 'observacao', v_obs));
  return jsonb_build_object('id', p_proposta, 'versao', v_versao, 'situacao', v_estado);
end $$;

call fechar_acesso();
