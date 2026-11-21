-- A linha da parcela em A receber com as duas frentes juntas: o êxito e o reembolso (0640, F3.14
-- e F3.85) e a parcela que voltou de "Pago antes do T3jus" (0600, F3.84). A 0640 refez
-- parcela_linha depois da 0600 e deixou de fora eraPagoAntes e semAvisoAutomatico.

create or replace function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
    'recebido', x.rec, 'falta', greatest(r.valor - x.rec, 0), 'forma', r.forma,
    'situacao', parcela_situacao(r, x.rec),
    'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
    'responsavel', pessoa_ref(c.responsavel_id),
    'cobranca', parcela_cobranca(r.id),
    'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
    'exito', (select jsonb_build_object('id', e.id, 'encerradoEm', m.em, 'conferido', jsonb_build_object('por', pessoa_ref(e.conferido_por), 'em', e.conferido_em),
                                        'calculado', e.calculado, 'base', e.base, 'percentual', e.percentual, 'motivoAjuste', e.motivo_ajuste,
                                        'caso', jsonb_build_object('id', s.id, 'nome', s.nome))
                from exitos_conferir e join caso_etapa_mudancas m on m.id = e.etapa_mudanca_id join casos s on s.id = e.caso_id
               where e.id = r.exito_id),
    'reembolso', case when r.cancelado_em is null and r.valor is not null and x.rec < r.valor then parcela_reembolsos(r) end,
    'eraPagoAntes', r.corrige_pago_antes_id is not null,
    'semAvisoAutomatico', r.avisos_desde is not null and r.vencimento < automacao_local(r.avisos_desde)::date)
    from (select parcela_recebido(r.id) rec) x
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
$$;
