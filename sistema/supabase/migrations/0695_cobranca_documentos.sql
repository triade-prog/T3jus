-- A fatura e o recibo da cobrança dos escritórios em PDF (F1.21, CO-06). Desenho aprovado pela
-- Carol em 22/11/2026 (docs/design/aprovadas/cobranca-pdfs, fatura-a4 e recibo-a4). O PDF é
-- montado na api-console e na api-portal (supabase/functions/_shared/cobranca_pdf.ts) a partir do
-- que estas funções devolvem; aqui ficam o dado e quem pode ver.
--
--  * Quem emite: os dados do T3jus (razão social, CNPJ, endereço, cidade, contato e remetente)
--    ficam em configuracoes.cobranca_emissor e ainda não foram informados (pergunta 1 do
--    desenho). Enquanto faltarem, o PDF do Console sai com os marcadores "A DEFINIR" e o Portal
--    não oferece o PDF: nenhum documento chega ao escritório com eles.
--  * O documento mostra a fatura como está hoje: a vencer, em atraso, paga (sem os códigos) ou
--    cancelada (sem os códigos). O motivo do cancelamento e o do pagamento à mão são internos e
--    não vão. O pagador é o da assinatura de hoje (nome, CNPJ de cobrança, e-mail e endereço).
--  * O recibo só sai de fatura paga, com o mesmo número da fatura.

insert into configuracoes (chave, valor, descricao) values
  ('cobranca_emissor', 'null',
   'Dados do T3jus na fatura e no recibo dos escritórios: {razaoSocial, cnpj, endereco, cidade, uf, contato, remetente}. Vazio: o Portal não oferece o PDF');

-- Os dados do emissor, só quando estão completos.
create function cobranca_emissor() returns jsonb
language sql
stable
set search_path = public
as $$
  select case when jsonb_typeof(v) = 'object'
                   and coalesce(length(btrim(v ->> 'razaoSocial')), 0) > 1 and coalesce(v ->> 'cnpj', '') ~ '^[0-9]{14}$'
                   and coalesce(length(btrim(v ->> 'endereco')), 0) > 1 and coalesce(length(btrim(v ->> 'cidade')), 0) > 1
                   and coalesce(v ->> 'contato', '') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
              then v end
    from (select configuracao('cobranca_emissor') as v) x
$$;

-- Tudo o que a folha da fatura e a do recibo mostram.
create function cobranca_documento_json(f faturas) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  a assinaturas;
  x escritorios;
  v_pago jsonb;
begin
  select * into a from assinaturas where id = f.assinatura_id;
  select * into x from escritorios where id = f.escritorio_id;
  if f.situacao = 'PAGA' then
    v_pago := jsonb_build_object(
      'pagaEm', f.paga_em, 'forma', f.forma_paga, 'baixa', f.baixa,
      -- Quando o sistema registrou (baixa automática) ou quem registrou à mão, sem o motivo.
      'registradoEm', coalesce((select m.registrado_em from pagamentos_manuais m where m.fatura_id = f.id),
                               (select max(e.ocorrido_em) from fatura_eventos e where e.fatura_id = f.id and e.acao = 'fatura.paga')),
      'registradoPor', (select p.nome from pagamentos_manuais m join pessoas p on p.id = m.registrado_por where m.fatura_id = f.id));
  end if;
  return fatura_json(f) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'emissor', cobranca_emissor(),
    'pagador', jsonb_build_object(
      'nome', x.nome, 'cnpj', coalesce(a.cnpj_nota, x.cnpj), 'email', a.email_cobranca,
      'socio', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = f.escritorio_id and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
      'endereco', assinatura_endereco_json(a)),
    'pessoasIncluidas', a.pessoas_incluidas,
    'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                  'valorUnitarioCentavos', i.valor_unitario_centavos, 'valorCentavos', i.valor_centavos) order by i.ordem)
                from fatura_itens i where i.fatura_id = f.id),
    -- O motivo do desconto é combinado com o escritório e aparece na fatura (como no Console).
    'motivoDesconto', case when exists (select 1 from fatura_itens i where i.fatura_id = f.id and i.tipo = 'DESCONTO') then a.desconto_motivo end,
    'codigos', case when f.situacao = 'A_VENCER' then jsonb_build_object(
      'provedor', f.pagamento_provedor, 'pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto,
      'codigoBarras', f.boleto_codigo_barras) end,
    'pagamento', v_pago,
    'canceladaEm', f.cancelada_em,
    -- As outras faturas em aberto, lembradas na fatura em atraso (cada uma tem o próprio documento).
    'outrasAbertas', coalesce((select jsonb_agg(jsonb_build_object('numero', o.numero, 'competencia', o.competencia, 'vencimento', o.vencimento,
                                                                   'totalCentavos', o.total_centavos) order by o.competencia)
                                 from faturas o where o.escritorio_id = f.escritorio_id and o.id <> f.id and o.situacao = 'A_VENCER'
                                  and o.vencimento < hoje_brasilia()), '[]'::jsonb),
    'carne', (select jsonb_build_object('numero', c.numero, 'parcela', p.numero, 'de', c.parcelas, 'geradoEm', c.gerado_em)
                from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id where p.id = f.carne_parcela_id));
end $$;

-- Console: Administração e Financeiro (quem vê a fatura), também com o emissor ainda a definir.
create function console_fatura_documento(p_pessoa uuid, p_escritorio uuid, p_fatura uuid, p_recibo boolean) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.ver');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  if p_recibo and f.situacao <> 'PAGA' then
    perform recusar_motivo('O recibo só sai de fatura paga', 'RECIBO_SO_DE_FATURA_PAGA');
  end if;
  return cobranca_documento_json(f);
end $$;

-- Portal: só o sócio dono, só as faturas que ele vê na lista (sem as canceladas) e só com os
-- dados do T3jus completos.
create function portal_plano_faturas_documento(p_pessoa uuid, p_escritorio uuid, p_fatura uuid, p_recibo boolean) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'portal.faturas.ver');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio and situacao <> 'CANCELADA';
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  if cobranca_emissor() is null then
    perform recusar_motivo('O PDF ainda não está disponível', case when p_recibo then 'RECIBO_PDF_INDISPONIVEL' else 'FATURA_PDF_INDISPONIVEL' end);
  end if;
  if p_recibo and f.situacao <> 'PAGA' then
    perform recusar_motivo('O recibo só sai de fatura paga', 'RECIBO_SO_DE_FATURA_PAGA');
  end if;
  return cobranca_documento_json(f);
end $$;

-- A folha "Plano e faturas" do Portal passa a dizer se o PDF da fatura e o recibo já saem.
alter function portal_plano_faturas(uuid, uuid) rename to portal_plano_faturas_sem_documentos;

create function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language sql
security definer
set search_path = public
as $$
  select portal_plano_faturas_sem_documentos(p_pessoa, p_escritorio) || jsonb_build_object('documentos', cobranca_emissor() is not null)
$$;

call fechar_acesso();
