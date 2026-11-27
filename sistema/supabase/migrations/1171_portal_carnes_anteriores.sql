-- O carnê substituído no Portal (F1.29; CO-10, desenho D41 aprovado em 27/11/2026, pergunta 2).
-- Depois de uma troca, a sócia dona continua vendo o carnê antigo, abaixo do novo, para saber
-- quais páginas descartar: à vista até a última parcela válida dele ser paga ou por 60 dias da
-- troca; depois, dentro de "Carnês anteriores", fechado.
--
-- portal_plano_faturas ganha 'carnesAnteriores': os carnês substituídos, do mais novo para o
-- mais antigo, cada um com carne_json, 'aVista' e o número do carnê que vale no lugar. O motivo
-- da troca e o das parcelas canceladas são da equipe T3jus (o escritório não vê): saem do JSON.
-- Só muda a leitura; nada é gravado. Teste: pgTAP 183.
--
-- console_cobranca_fatura (0690) passa a devolver o motivo de cada item: a fatura do Console
-- mostra o motivo do desconto como estava na emissão (D41, estado 11). O resto é o corpo da 0690.

create function portal_carne_anterior_json(c assinatura_carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select (j - 'substituidoMotivo' - 'geradoPor')
         || jsonb_build_object(
              'itens', coalesce((select jsonb_agg(i - 'canceladaMotivo' order by (i ->> 'numero')::int) from jsonb_array_elements(j -> 'itens') i), '[]'::jsonb),
              'substituidoPor', (select n.numero from assinatura_carnes n where n.id = c.substituido_por_carne),
              'aVista', c.substituido_em >= app_now() - interval '60 days'
                        or exists (select 1 from assinatura_carne_parcelas p left join faturas f on f.id = p.fatura_id
                                    where p.carne_id = c.id and p.situacao = 'A_VENCER' and coalesce(f.situacao, 'A_VENCER') <> 'PAGA'))
    from (select carne_json(c) as j) x
$$;

create or replace function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language sql
security definer
set search_path = public
as $$
  select portal_plano_faturas_sem_documentos(p_pessoa, p_escritorio)
         || jsonb_build_object('documentos', cobranca_emissor() is not null, 'carnePdf', cobranca_carne_pdf_disponivel(),
              'carnesAnteriores', coalesce((select jsonb_agg(portal_carne_anterior_json(c) order by c.substituido_em desc)
                                              from assinatura_carnes c where c.escritorio_id = p_escritorio and c.substituido_em is not null), '[]'::jsonb))
$$;

create or replace function console_cobranca_fatura(p_pessoa uuid, p_escritorio uuid, p_fatura uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas; a assinaturas; v_atraso integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.ver');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  select * into a from assinaturas where id = f.assinatura_id;
  v_atraso := escritorio_atraso_dias(p_escritorio);
  return fatura_json(f) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'escritorio', (select jsonb_build_object('id', x.id, 'nome', x.nome, 'cnpj', x.cnpj, 'contrato', contrato_situacao(x.id),
                                             'atrasoDias', v_atraso, 'soConsultaDesde', a.so_consulta_desde)
                     from escritorios x where x.id = p_escritorio),
    'assinatura', jsonb_build_object('id', a.id, 'versao', a.versao, 'cnpjNota', a.cnpj_nota),
    'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                  'valorUnitarioCentavos', i.valor_unitario_centavos, 'valorCentavos', i.valor_centavos,
                                                  'motivo', i.motivo) order by i.ordem)
                from fatura_itens i where i.fatura_id = f.id),
    -- Lugar do meio de pagamento: vazio até ele ser escolhido (F3.20).
    'pagamento', jsonb_build_object('pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto, 'disponivel', f.pix_copia_cola is not null),
    'paraQuem', jsonb_build_object('email', a.email_cobranca,
      'socio', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1)),
    'pagamentoManual', (select jsonb_build_object('pagoEm', m.pago_em, 'valorCentavos', m.valor_centavos, 'forma', m.forma, 'motivo', m.motivo,
                                                  'por', p.nome, 'em', m.registrado_em)
                          from pagamentos_manuais m join pessoas p on p.id = m.registrado_por where m.fatura_id = f.id),
    'cancelamento', case when f.situacao = 'CANCELADA' then jsonb_build_object('em', f.cancelada_em, 'motivo', f.cancelada_motivo,
                                                                               'por', (select nome from pessoas where id = f.cancelada_por)) end,
    'historico', assinatura_eventos_json(a.id, f.id),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'criadoEm', x.criado_em, 'enviadoEm', x.enviado_em,
                                                            'descartadoEm', x.descartado_em, 'erro', x.ultimo_erro) order by x.criado_em)
                          from fatura_envios x where x.fatura_id = f.id), '[]'::jsonb),
    -- Os próximos passos da régua (com o contrato encerrado, a régua para).
    'proximos', case when f.situacao = 'A_VENCER' and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO') then
                  coalesce((select jsonb_agg(jsonb_build_object('tipo', t.tipo, 'dia', f.vencimento + t.d) order by t.d)
                              from (values ('VENCE_EM_3', -3), ('VENCE_HOJE', 0), ('VENCEU_3', 3), ('VENCEU_7', 7), ('VENCEU_15', 15)) t(tipo, d)
                             where f.vencimento + t.d > hoje_brasilia()), '[]'::jsonb)
                else '[]'::jsonb end,
    'proporConsulta', f.situacao = 'A_VENCER' and coalesce(fatura_atraso_dias(f), 0) >= configuracao_int('cobranca_propor_consulta_dias')
                      and a.so_consulta_desde is null,
    'permissoes', jsonb_build_object('editar', pode(p_pessoa, p_escritorio, 'console.cobranca.editar'),
                                     'soConsulta', pode(p_pessoa, p_escritorio, 'console.portal.so_consulta')));
end $$;

call fechar_acesso();
