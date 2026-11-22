-- A aba Recebimentos da ficha do contrato com a situação de cada parcela (CH-04, desenho aprovado em
-- docs/design/aprovadas/portal-comercial-contratos, decisão 21): quem tem a área Financeiro vê a
-- coluna Situação e o "Recebido até hoje"; quem não tem continua sem esses campos.
--
-- Embrulha portal_contrato (como a 0651 fez com parcela_linha) para não reescrever a função
-- inteira, que outras frentes também mudam. A situação vem das mesmas funções de A receber.

alter function portal_contrato(uuid, uuid, uuid) rename to portal_contrato_sem_situacao;

create function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := portal_contrato_sem_situacao(p_pessoa, p_escritorio, p_contrato);
begin
  if not coalesce((v ->> 'financeiro')::boolean, false) then return v; end if;
  return v || jsonb_build_object(
    'recebidoAteHoje', (select coalesce(sum(p.valor), 0) from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id
                         where r.contrato_id = p_contrato and r.escritorio_id = p_escritorio),
    'recebimentos', coalesce((
      select jsonb_agg(l || jsonb_build_object('situacao', parcela_situacao(r, x.rec), 'recebido', x.rec,
                                               'falta', greatest(coalesce(r.valor, 0) - x.rec, 0),
                                               'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id))
                       order by o)
        from jsonb_array_elements(v -> 'recebimentos') with ordinality t(l, o)
        join recebimentos_previstos r on r.id = (l ->> 'id')::uuid
        cross join lateral (select parcela_recebido(r.id) rec) x), '[]'::jsonb));
end $$;

call fechar_acesso();
