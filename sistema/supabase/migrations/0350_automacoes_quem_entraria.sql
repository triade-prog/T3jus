-- Quem entraria nos gatilhos do Jurídico e da Agenda (F3.62; PA-03). O lembrete mostra os
-- compromissos dos próximos 7 dias com "lembrar o cliente" marcado (cada um entra 1 dia antes);
-- a etapa do caso mostra as mudanças com texto para o cliente dos últimos 7 dias. Fica de fora,
-- com o motivo, quem pediu para não receber nenhum aviso e quem não tem WhatsApp. A lista das
-- parcelas ganha "origem", o mesmo formato dos outros gatilhos.

create function automacao_quem_entraria_juridico(a automacoes) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare v_itens jsonb;
begin
  select coalesce(jsonb_agg(x.j order by x.ord, x.quando), '[]'::jsonb) into v_itens from (
    select o.quando, case when fora.motivo is null then 0 else 1 end ord,
           jsonb_build_object(
             'origem', jsonb_build_object('id', o.id, 'descricao', o.descricao, 'quando', o.quando),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from (
        select c.id, c.cliente_id, left(c.titulo, 160) descricao, c.inicio quando
          from compromissos c
         where a.gatilho = 'LEMBRETE_AUDIENCIA' and c.escritorio_id = a.escritorio_id and c.estado = 'MARCADO'
           and c.cliente_id is not null and c.lembrete_cliente and c.tipo <> 'INTERNO'
           and c.inicio > app_now() and c.inicio <= app_now() + interval '7 days'
        union all
        select m.id, (select cc.cliente_id from caso_clientes cc where cc.caso_id = m.caso_id order by cc.cliente_id limit 1),
               left(cs.nome || ' · ' || t.nome, 160), m.em
          from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
         where a.gatilho = 'ETAPA_CASO' and m.escritorio_id = a.escritorio_id and m.aviso_texto is not null
           and m.em >= app_now() - interval '7 days'
           and exists (select 1 from caso_clientes cc where cc.caso_id = m.caso_id)) o
      join clientes_escritorio k on k.id = o.cliente_id
      cross join lateral (select contato_principal(k.contatos) ct) cc
      left join lateral (select s.quem_pediu, s.pedido_em, s.tipo from clientes_sem_avisos s
                          where s.cliente_id = k.id and s.retirado_em is null and s.tipo = 'TODOS' limit 1) sa_ on true
      cross join lateral (
        select case when sa_.tipo is not null then 'SEM_AVISOS'
                    when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP' end motivo,
               case when sa_.tipo is not null then jsonb_build_object('quemPediu', sa_.quem_pediu, 'em', sa_.pedido_em, 'tipo', sa_.tipo) end detalhe) fora
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'itens', v_itens);
end $$;

create or replace function portal_automacao_quem_entraria(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a automacoes; v_dias integer; v_hoje date := hoje_brasilia(); v_itens jsonb;
begin
  a := automacao_para_ler(p_pessoa, p_escritorio, p_id);
  if a.gatilho in ('ETAPA_CASO', 'LEMBRETE_AUDIENCIA') then
    return automacao_quem_entraria_juridico(a);
  elsif a.gatilho not in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return jsonb_build_object('disponivel', false, 'itens', '[]'::jsonb);
  end if;
  v_dias := coalesce((a.rascunho #>> '{passos,0,dias}')::integer, 1);
  select coalesce(jsonb_agg(x.j order by x.ord, x.venc), '[]'::jsonb) into v_itens from (
    select r.vencimento venc,
           case when fora.motivo is null then 0 else 1 end ord,
           jsonb_build_object(
             'parcela', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'valor', r.valor - parcela_recebido(r.id), 'vencimento', r.vencimento),
             'origem', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'quando', r.vencimento),
             'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'contato', jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel'),
             'diasAtraso', v_hoje - r.vencimento,
             'jaEmAtraso', a.gatilho = 'PARCELA_ATRASO' and v_hoje - r.vencimento > v_dias,
             'entra', fora.motivo is null, 'motivo', fora.motivo, 'detalhe', fora.detalhe) j
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
      cross join lateral (select automacao_contato(k) ct) cc
      cross join lateral (select parcela_cobranca(r.id) cob) cb
      cross join lateral (
        select case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null) then 'SEM_AVISOS'
          when ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then 'SEM_WHATSAPP'
          when (select (x.value ->> 'semCombinado')::boolean from jsonb_array_elements(a.rascunho -> 'passos') x where x.value ->> 'tipo' = 'CONDICOES' limit 1)
               and (cob ->> 'proxData')::date > v_hoje then 'COMBINADO' end motivo,
          case
          when exists (select 1 from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null)
            then (select jsonb_build_object('quemPediu', s.quem_pediu, 'em', s.pedido_em, 'tipo', s.tipo)
                    from clientes_sem_avisos s where s.cliente_id = k.id and s.retirado_em is null limit 1)
          when (cob ->> 'proxData')::date > v_hoje then jsonb_build_object('oQue', cob ->> 'proxOque', 'data', cob ->> 'proxData') end detalhe) fora
     where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
       and parcela_recebido(r.id) < r.valor
       and case when a.gatilho = 'PARCELA_ATRASO' then v_hoje - r.vencimento >= v_dias
                else r.vencimento = v_hoje + v_dias end
     limit 200) x;
  return jsonb_build_object('disponivel', true, 'dias', v_dias, 'itens', v_itens);
end $$;

call fechar_acesso();
