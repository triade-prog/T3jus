-- Testar as automações de boas-vindas e de documento pendente com um cliente de verdade (F3.87,
-- PA-06). Desenho aprovado em docs/design/aprovadas/portal-gatilhos-novos (gn-cliente-testar e
-- gn-doc-testar): o "Simular com" lista os clientes de "Quem entraria" e a simulação usa o nome,
-- o contato, quem atende, os documentos que faltam e quem pediu. Nada é enviado.

alter function portal_automacao_simulacao(uuid, uuid, uuid, uuid) rename to automacao_simulacao_parcela;

create function portal_automacao_simulacao(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_parcela uuid default null, p_cliente uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes;
  k clientes_escritorio;
  v jsonb;
  v_exemplo jsonb;
begin
  v := automacao_simulacao_parcela(p_pessoa, p_escritorio, p_id, p_parcela);
  if p_cliente is null then return v; end if;
  if p_parcela is not null then perform recusar_motivo('Escolha a parcela ou o cliente', 'CLIENTE_FORA_DO_GATILHO'); end if;
  select * into a from automacoes where id = p_id and escritorio_id = p_escritorio;
  if a.gatilho not in ('CLIENTE_NOVO', 'DOCUMENTO_PENDENTE') then
    perform recusar_motivo('Este gatilho não usa cliente', 'CLIENTE_FORA_DO_GATILHO');
  end if;
  select * into k from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado = 'ATIVO';
  if k.id is null or (a.gatilho = 'CLIENTE_NOVO' and k.importacao_id is not null) then
    perform recusar_motivo('Cliente fora do gatilho', 'CLIENTE_FORA_DO_GATILHO');
  end if;
  v_exemplo := jsonb_build_object('cliente', k.nome, 'contato', contato_principal(k.contatos) ->> 'nome',
                                  'papel', contato_principal(k.contatos) ->> 'papel');
  if a.gatilho = 'CLIENTE_NOVO' then
    v_exemplo := v_exemplo || jsonb_build_object('quemCuida', pessoa_ref(automacao_quem_atende(p_escritorio, k.id)));
  else
    select v_exemplo || jsonb_build_object(
             'documentos', automacao_lista(array_agg(d.descricao order by d.pedido_em, d.criado_em)),
             'caso', (array_agg(c.nome order by d.pedido_em, d.criado_em))[1],
             'pedidoEm', min(d.pedido_em),
             'quemPediu', pessoa_ref((array_agg(d.pedido_por order by d.pedido_em, d.criado_em))[1]))
      into v_exemplo
      from documento_pedidos d join casos c on c.id = d.caso_id
     where d.escritorio_id = p_escritorio and d.cliente_id = k.id and d.chegou_em is null and c.situacao = 'ANDAMENTO'
    having count(*) > 0;
    if v_exemplo is null then perform recusar_motivo('Este cliente não tem documento pendente', 'CLIENTE_FORA_DO_GATILHO'); end if;
  end if;
  return v || jsonb_build_object('exemplo', v_exemplo);
end $$;

call fechar_acesso();
