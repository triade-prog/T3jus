-- 0652 · Os recibos em PDF dentro do .zip dos comprovantes para o contador (F3.93; FI-14, FI-21).
-- Desenho aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias (ct-exportar:
-- a pasta leva os recibos) e o recibo de docs/design/aprovadas/portal-recibo-recorrente.
-- - O PDF do recibo passa a sair também do servidor (api-portal/recibo_pdf.ts), com o que valia
--   no registro (a cópia do recibo) e o reembolso pago junto (0650).
-- - Ao montar a pasta do mês, a API recebe aqui os recibos dos recebimentos do caixa do escritório
--   no mês e põe cada PDF na pasta "Recibos" do .zip. Mês sem comprovante anexado, mas com recibo,
--   também ganha a pasta.
-- - A pasta já montada não muda (0621): só as montadas daqui em diante levam os recibos.

-- O que vai no papel de um recibo: a cópia do registro (ou, recibo antigo, os dados de hoje) e o
-- reembolso pago junto.
create function recibo_dados(p_escritorio uuid, p_recibo uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce((select c.dados from recibo_copias c where c.recibo_id = b.id), recibo_montar(p_escritorio, b.id, null))
         || jsonb_build_object('reembolsos', recibo_reembolsos(b.pagamento_id))
    from recibos b where b.id = p_recibo and b.escritorio_id = p_escritorio
$$;

-- Ao preparar a pasta ainda não montada: os recibos do mês, na ordem do dia.
alter function portal_financeiro_pasta_preparar(uuid, uuid, uuid) rename to financeiro_pasta_preparar_sem_recibos;
create function portal_financeiro_pasta_preparar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_pasta_preparar_sem_recibos(p_pessoa, p_escritorio, p_exportacao);
  v_mes date := (v ->> 'mes')::date;
begin
  if v -> 'pasta' <> 'null'::jsonb then return v || jsonb_build_object('recibos', '[]'::jsonb); end if;
  return v || jsonb_build_object('recibos', coalesce((
    select jsonb_agg(recibo_dados(p_escritorio, b.id) order by p.recebido_em, b.ano, b.numero)
      from recibos b join pagamentos_recebidos p on p.id = b.pagamento_id
     where b.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO'
       and p.recebido_em between v_mes and (v_mes + interval '1 month')::date - 1), '[]'::jsonb));
end $$;

call fechar_acesso();
