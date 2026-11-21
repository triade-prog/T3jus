-- Pendências pequenas do Portal, desenho aprovado pela Carol em 21/11/2026
-- (docs/design/aprovadas/portal-pendencias-pequenas).
--
-- F3.65 (PA-03): o atalho "Não receber avisos" dentro da conversa. O pedido registrado pela
--   conversa fica ligado à mensagem do cliente que o originou (pergunta 2) e deixa na conversa uma
--   linha só da equipe (registrado, mudado ou retirado). Nada sai para o cliente (pergunta 3).
-- F3.73 (VA-05): a ficha do contrato diz quais parcelas foram pagas antes do T3jus e de que
--   importação o contrato veio. Os totais, o Caixa e os recibos não mudam.

-- ---------------------------------------------------------------------------------------
-- F3.65

alter table clientes_sem_avisos add column mensagem_id uuid references conversa_mensagens (id) on delete restrict;

alter table conversa_mensagens drop constraint conversa_mensagens_evento_check;
alter table conversa_mensagens add constraint conversa_mensagens_evento_check
  check (evento in ('IA_PASSOU', 'ASSUMIU', 'DEVOLVEU', 'PASSOU', 'IA_RESOLVEU', 'RESPONSAVEL_SAIU', 'APP_RESPONDEU',
                    'SEM_AVISOS_REGISTRADO', 'SEM_AVISOS_MUDADO', 'SEM_AVISOS_RETIRADO'));

-- Um pedido na ficha, agora com a mensagem que o originou, quando veio da conversa.
create or replace function sem_avisos_json(s clientes_sem_avisos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id, 'tipo', s.tipo, 'origem', s.origem, 'canal', s.canal,
    'quem', s.quem, 'contatoId', s.contato_id, 'quemPediu', s.quem_pediu, 'quemPapel', s.quem_papel,
    'pedidoEm', s.pedido_em, 'registradoEm', s.registrado_em, 'registradoPor', pessoa_ref(s.registrado_por),
    'mensagem', (select jsonb_build_object('id', m.id, 'texto', m.texto, 'em', m.criada_em) from conversa_mensagens m where m.id = s.mensagem_id),
    'retirada', case when s.retirado_em is not null then jsonb_build_object(
      'em', s.retirado_em, 'por', pessoa_ref(s.retirado_por), 'quem', s.retirado_quem, 'contatoId', s.retirado_contato_id,
      'quemPediu', s.retirado_quem_pediu, 'quemPapel', s.retirado_quem_papel, 'canal', s.retirado_canal) end)
$$;

-- O que a conversa precisa para o atalho: os contatos do cliente (para "quem pediu"), o pedido
-- que vale agora e se dá para mudar. Nulo para contato que não está em Clientes.
create function conversa_avisos(c conversas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'tipo', k.tipo,
    'contatos', coalesce((select jsonb_agg(jsonb_build_object('id', x ->> 'id', 'nome', x ->> 'nome', 'papel', x ->> 'papel',
                                                              'principal', coalesce((x ->> 'principal')::boolean, false)))
                            from jsonb_array_elements(k.contatos) x), '[]'::jsonb),
    'ativo', (select sem_avisos_json(s) from clientes_sem_avisos s
               where s.escritorio_id = c.escritorio_id and s.cliente_id = k.id and s.retirado_em is null),
    'podeMudar', k.estado in ('ATIVO', 'INATIVO'))
    from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'
$$;

-- Registrar, mudar ou retirar o pedido. Mudar retira o que vale e registra o novo (os dois ficam
-- no histórico). Pela conversa, vem a conversa e, se houver, a mensagem do cliente.
create or replace function portal_cliente_sem_avisos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  q_quem text; q_contato text; q_nome text; q_papel text;
  v_id uuid;
  v_origem text := coalesce(p_dados ->> 'origem', '');
  v_canal text := p_dados ->> 'canal';
  v_dia date;
  v_quem text := p_dados ->> 'quem';
  v_ativo clientes_sem_avisos;
  v_conversa conversas;
  v_mensagem uuid;
  v_evento text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'EXCLUIDO' then perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO'); end if;
  if c.estado = 'ARQUIVADO' then perform recusar_motivo('O cliente foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO'); end if;
  if v_quem is null and v_origem = 'CONVERSA' and nullif(btrim(coalesce(p_dados ->> 'quemPediu', '')), '') is not null then v_quem := 'OUTRA'; end if;
  if v_canal is null and v_origem = 'CONVERSA' then v_canal := 'WHATSAPP'; end if;
  if v_canal is not null and v_canal not in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL') then perform recusar_campos('Diga como pediu', 'canal'); end if;
  select * into v_ativo from clientes_sem_avisos where escritorio_id = p_escritorio and cliente_id = p_cliente and retirado_em is null;
  -- Pela conversa (F3.65): a conversa tem de ser deste cliente, e a mensagem que originou o
  -- pedido, do cliente nessa conversa.
  if nullif(p_dados ->> 'conversaId', '') is not null then
    select * into v_conversa from conversas
     where id = (p_dados ->> 'conversaId')::uuid and escritorio_id = p_escritorio and cliente_id = p_cliente;
    if v_conversa.id is null then perform recusar_campos('A conversa não é deste cliente', 'conversaId'); end if;
  end if;
  if nullif(p_dados ->> 'mensagemId', '') is not null then
    select m.id into v_mensagem from conversa_mensagens m
     where m.id = (p_dados ->> 'mensagemId')::uuid and m.escritorio_id = p_escritorio and m.autor = 'CLIENTE'
       and m.conversa_id = v_conversa.id;
    if v_mensagem is null then perform recusar_campos('A mensagem não é desta conversa', 'mensagemId'); end if;
  end if;

  if coalesce((p_dados ->> 'retirar')::boolean, false) then
    if v_ativo.id is null then perform recusar_motivo('O cliente já recebe os avisos', 'SEM_PEDIDO'); end if;
    if v_canal is null then perform recusar_campos('Diga como pediu', 'canal'); end if;
    select x.quem, x.contato_id, x.nome, x.papel into q_quem, q_contato, q_nome, q_papel
      from sem_avisos_quem(c, v_quem, p_dados ->> 'contatoId', p_dados ->> 'quemPediu') x;
    update clientes_sem_avisos
       set retirado_em = app_now(), retirado_por = p_pessoa, retirado_quem = q_quem, retirado_contato_id = q_contato,
           retirado_quem_pediu = q_nome, retirado_quem_papel = q_papel, retirado_canal = v_canal
     where id = v_ativo.id;
    perform registrar_historico('cliente.avisos_voltaram', 'clientes_escritorio', p_cliente::text, jsonb_build_object('canal', v_canal));
    if v_conversa.id is not null then
      perform conversa_momento(v_conversa, 'SEM_AVISOS_RETIRADO', p_pessoa, jsonb_build_object('tipo', v_ativo.tipo, 'quemPediu', q_nome));
    end if;
    return jsonb_build_object('semAvisos', null);
  end if;

  if coalesce(p_dados ->> 'tipo', '') not in ('TODOS', 'COBRANCA') then perform recusar_campos('Escolha o que o cliente não quer receber', 'tipo'); end if;
  if v_origem not in ('CONVERSA', 'FICHA') then perform recusar_campos('Diga por onde o cliente pediu', 'origem'); end if;
  if v_origem = 'FICHA' and v_canal is null then perform recusar_campos('Diga como pediu', 'canal'); end if;
  if v_quem is not null or v_origem = 'FICHA' then
    select x.quem, x.contato_id, x.nome, x.papel into q_quem, q_contato, q_nome, q_papel
      from sem_avisos_quem(c, v_quem, p_dados ->> 'contatoId', p_dados ->> 'quemPediu') x;
  end if;
  begin
    v_dia := nullif(p_dados ->> 'pedidoEm', '')::date;
  exception when others then perform recusar_campos('Escreva a data como dd/mm/aaaa', 'pedidoEm');
  end;
  if v_dia > hoje_brasilia() then
    raise exception 'A data não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('pedidoEm'), 'motivo', 'DATA_NO_FUTURO')::text;
  end if;
  if v_dia < hoje_brasilia() - 365 then perform recusar_campos('A data é de mais de um ano atrás', 'pedidoEm'); end if;

  if v_ativo.id is not null then
    update clientes_sem_avisos set retirado_em = app_now(), retirado_por = p_pessoa where id = v_ativo.id;
  end if;
  insert into clientes_sem_avisos (escritorio_id, cliente_id, tipo, origem, quem, contato_id, quem_pediu, quem_papel, canal,
                                   pedido_em, registrado_por, mensagem_id)
  values (p_escritorio, p_cliente, p_dados ->> 'tipo', v_origem, q_quem, q_contato,
          coalesce(q_nome, nullif(btrim(coalesce(p_dados ->> 'quemPediu', '')), '')), q_papel, v_canal,
          -- O dia de hoje vale com a hora do registro; um dia anterior, ao meio-dia de Brasília.
          case when v_dia is null or v_dia = hoje_brasilia() then app_now()
               else (v_dia + time '12:00') at time zone 'America/Sao_Paulo' end,
          p_pessoa, v_mensagem)
  returning id into v_id;
  perform registrar_historico(case when v_ativo.id is null then 'cliente.sem_avisos' else 'cliente.sem_avisos_mudou' end,
                              'clientes_escritorio', p_cliente::text, jsonb_build_object('tipo', p_dados ->> 'tipo', 'canal', v_canal));
  if v_conversa.id is not null then
    v_evento := case when v_ativo.id is null then 'SEM_AVISOS_REGISTRADO' else 'SEM_AVISOS_MUDADO' end;
    perform conversa_momento(v_conversa, v_evento, p_pessoa, jsonb_build_object('tipo', p_dados ->> 'tipo',
      'quemPediu', coalesce(q_nome, nullif(btrim(coalesce(p_dados ->> 'quemPediu', '')), ''))));
  end if;
  return jsonb_build_object('semAvisos', jsonb_build_object('id', v_id, 'tipo', p_dados ->> 'tipo'));
end $$;

-- A conversa aberta: quem escreve (o id do contato), os avisos do cliente e as linhas da equipe
-- do pedido de avisos.
create or replace function portal_conversa(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_juridico boolean;
  v_caso jsonb;
  v_contato jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  if v_juridico and c.cliente_id is not null then
    select jsonb_build_object('id', k.id, 'nome', k.nome, 'etapa', e.nome, 'responsavel', pessoa_ref(k.responsavel_id)) into v_caso
      from casos k join caso_clientes cc on cc.caso_id = k.id join etapas e on e.id = k.etapa_id
     where k.escritorio_id = p_escritorio and cc.cliente_id = c.cliente_id and k.situacao = 'ANDAMENTO'
     order by k.etapa_desde desc limit 1;
  end if;
  if c.cliente_id is not null and c.contato_id is not null then
    select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
     where x.id = c.cliente_id and k ->> 'id' = c.contato_id;
  end if;
  return conversa_linha(c) || jsonb_build_object(
    'versao', c.versao, 'motivoTexto', c.motivo_texto, 'responsavelRazao', c.responsavel_razao, 'assumidaEm', c.assumida_em,
    'notaIa', c.nota_ia, 'eu', p_pessoa, 'whatsappLigado', whatsapp_ligado(p_escritorio),
    'principal', coalesce((v_contato ->> 'principal')::boolean, false),
    'juridico', v_juridico,
    'contatoId', c.contato_id,
    'avisos', conversa_avisos(c),
    'mensagens', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', m.id, 'autor', m.autor, 'pessoa', pessoa_ref(m.pessoa_id), 'evento', m.evento,
               'para', case when m.evento in ('IA_PASSOU', 'PASSOU', 'RESPONSAVEL_SAIU', 'APP_RESPONDEU') then pessoa_ref((m.dados ->> 'para')::uuid) end,
               'de', case when m.evento in ('ASSUMIU', 'PASSOU', 'RESPONSAVEL_SAIU') then pessoa_ref((m.dados ->> 'de')::uuid) end,
               'razao', m.dados ->> 'razao', 'motivo', m.dados ->> 'motivo',
               'tipoAvisos', case when m.evento like 'SEM_AVISOS_%' then m.dados ->> 'tipo' end,
               'quemPediu', case when m.evento like 'SEM_AVISOS_%' then m.dados ->> 'quemPediu' end,
               'texto', m.texto, 'anexo', m.anexo, 'avisoTipo', m.aviso_tipo, 'envio', m.envio, 'envioMotivo', m.envio_motivo,
               'em', m.criada_em)) order by m.criada_em, m.id)
        from conversa_mensagens m where m.conversa_id = c.id), '[]'::jsonb),
    'contexto', jsonb_build_object(
      'proxContato', case when c.cliente_id is not null then prox_contato(c.cliente_id) end,
      'caso', v_caso,
      'compromisso', (select jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'tipoEscrito', a.tipo_escrito,
                                                'inicio', a.inicio, 'modalidade', a.modalidade, 'local', a.local)
                        from compromissos a
                       where a.escritorio_id = p_escritorio and a.cliente_id = c.cliente_id and a.estado = 'MARCADO' and a.fim > app_now()
                       order by a.inicio limit 1)));
end $$;

-- ---------------------------------------------------------------------------------------
-- F3.73: a parcela paga antes do T3jus e a importação de onde o contrato veio.
create or replace function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_fin boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_fin := 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  return contrato_linha(c) || jsonb_build_object(
    'observacoes', c.observacoes, 'versao', c.versao, 'assinadoEm', c.assinado_em,
    'assinaturaPor', pessoa_ref(c.assinatura_por), 'encerradoEm', c.encerrado_em, 'motivoEncerramento', c.motivo_encerramento,
    'proposta', (select jsonb_build_object('id', p.id, 'numero', p.numero) from propostas p where p.id = c.proposta_id),
    'advogados', coalesce((select jsonb_agg(pessoa_ref(a.pessoa_id) order by pe.nome) from contrato_advogados a join pessoas pe on pe.id = a.pessoa_id
                            where a.contrato_id = c.id), '[]'::jsonb),
    'financeiro', v_fin,
    'importacao', (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por),
                                             'linha', (select min(l.numero) from importacao_linhas l where l.importacao_id = i.id and l.contrato_id = c.id),
                                             'desfazerAte', i.desfazer_ate, 'desfeita', i.estado = 'DESFEITA')
                     from importacoes i where i.id = c.importacao_id and i.importado_em is not null),
    'recebimentos', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                                          'origem', r.origem, 'criadoEm', r.criado_em, 'pagoAntes', r.pago_antes,
                                          'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
                                          'base', (select jsonb_build_object('valor', b.valor_base, 'fonte', b.fonte, 'por', pessoa_ref(b.informado_por), 'em', b.informado_em)
                                                     from bases_mensais b where b.recebimento_id = r.id))
                       order by r.vencimento, r.descricao)
        from recebimentos_previstos r where r.contrato_id = c.id), '[]'::jsonb),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', a.nome, 'dados', h.dados) order by h.id desc)
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'contratos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

call fechar_acesso();
