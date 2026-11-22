-- O carnê da assinatura em PDF (F1.21, CO-06). Desenho aprovado pela Carol em 22/11/2026
-- (docs/design/aprovadas/cobranca-pdfs, carne-a4). O PDF é montado nas funções
-- (supabase/functions/_shared/cobranca_pdf.ts); aqui ficam o dado e quem pode ver.
--
--  * O carnê sai como está hoje (pergunta 8): a parcela paga diz quando e como, a cancelada diz
--    "não pague" e qual carnê vale no lugar, e as duas saem sem códigos.
--  * Os códigos de cada parcela são os mesmos da fatura do mês (vêm do meio de pagamento). Sem
--    eles, a parcela diz como pagar falando com o T3jus.
--  * O Console baixa sempre, para conferir. O Portal só oferece o carnê com o meio de pagamento
--    ligado e os dados do T3jus completos (pergunta 3): sem códigos, o carnê é só um calendário.

create function cobranca_carne_documento_json(c assinatura_carnes) returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'parcelas', c.parcelas, 'valorParcelaCentavos', c.valor_parcela_centavos,
    'diaVencimento', c.dia_vencimento, 'primeiraCompetencia', c.primeira_competencia,
    'ultimaCompetencia', (c.primeira_competencia + make_interval(months => c.parcelas - 1))::date,
    'geradoEm', c.gerado_em,
    'hoje', hoje_brasilia(),
    'emissor', cobranca_emissor(),
    'plano', (select p.nome from assinaturas a join planos p on p.id = a.plano_id where a.id = c.assinatura_id),
    'pagador', (select jsonb_build_object('nome', x.nome, 'cnpj', coalesce(a.cnpj_nota, x.cnpj), 'email', a.email_cobranca)
                  from assinaturas a join escritorios x on x.id = a.escritorio_id where a.id = c.assinatura_id),
    -- O carnê que vale no lugar das parcelas canceladas, quando houver.
    'substituto', (select jsonb_build_object('numero', n.numero, 'primeiraCompetencia', n.primeira_competencia,
                                             'ultimaCompetencia', (n.primeira_competencia + make_interval(months => n.parcelas - 1))::date,
                                             'valorParcelaCentavos', n.valor_parcela_centavos)
                     from assinatura_carnes n where n.id = c.substituido_por_carne),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'numero', p.numero, 'competencia', p.competencia, 'vencimento', p.vencimento, 'valorCentavos', p.valor_centavos,
        'situacao', case when f.situacao = 'PAGA' then 'PAGA' else p.situacao end,
        'emAtraso', p.situacao = 'A_VENCER' and coalesce(f.situacao, 'A_VENCER') <> 'PAGA' and p.vencimento < hoje_brasilia(),
        'pagaEm', f.paga_em, 'formaPaga', f.forma_paga,
        'canceladaEm', p.cancelada_em,
        -- Os códigos só da parcela ainda a pagar: os da parcela, ou os da fatura do mês.
        'codigos', case when p.situacao = 'A_VENCER' and coalesce(f.situacao, 'A_VENCER') not in ('PAGA', 'CANCELADA') then jsonb_build_object(
          'pixCopiaCola', coalesce(p.pix_copia_cola, f.pix_copia_cola), 'linhaBoleto', coalesce(p.linha_boleto, f.linha_boleto),
          'codigoBarras', coalesce(p.boleto_codigo_barras, f.boleto_codigo_barras)) end)
        order by p.numero)
      from assinatura_carne_parcelas p left join faturas f on f.id = p.fatura_id
     where p.carne_id = c.id), '[]'::jsonb))
$$;

-- Console: quem vê a cobrança, com o emissor e os códigos ainda a definir.
create function console_carne_documento(p_pessoa uuid, p_escritorio uuid, p_carne uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c assinatura_carnes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.ver');
  select * into c from assinatura_carnes where id = p_carne and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Carnê não encontrado' using errcode = 'TC404'; end if;
  return cobranca_carne_documento_json(c);
end $$;

-- Se o Portal já oferece o carnê: meio de pagamento ligado e dados do T3jus completos.
create function cobranca_carne_pdf_disponivel() returns boolean
language sql
stable
set search_path = public
as $$
  select meio_pagamento_ligado() is not null and cobranca_emissor() is not null
$$;

-- Portal: só o sócio dono e só com o carnê disponível.
create function portal_plano_faturas_carne_documento(p_pessoa uuid, p_escritorio uuid, p_carne uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c assinatura_carnes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'portal.faturas.ver');
  select * into c from assinatura_carnes where id = p_carne and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Carnê não encontrado' using errcode = 'TC404'; end if;
  if not cobranca_carne_pdf_disponivel() then
    perform recusar_motivo('O PDF do carnê ainda não está disponível', 'CARNE_PDF_INDISPONIVEL');
  end if;
  return cobranca_carne_documento_json(c);
end $$;

-- A folha "Plano e faturas" do Portal passa a dizer também se o carnê em PDF já sai.
create or replace function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language sql
security definer
set search_path = public
as $$
  select portal_plano_faturas_sem_documentos(p_pessoa, p_escritorio)
         || jsonb_build_object('documentos', cobranca_emissor() is not null, 'carnePdf', cobranca_carne_pdf_disponivel())
$$;

call fechar_acesso();
