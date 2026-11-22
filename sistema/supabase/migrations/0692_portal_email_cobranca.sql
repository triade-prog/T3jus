-- O e-mail de cobrança na folha "Plano e faturas" do Portal (F1.21, CO-06).
-- O desenho aprovado (docs/design/aprovadas/console-cobranca, estados 44 e 46) mostra à sócia
-- dona para onde a fatura vai: "Vence todo dia 10 · Pix ou boleto · a fatura chega em ...".
-- O Console já guarda esse e-mail na assinatura (email_cobranca, 0690); aqui a função do Portal
-- passa a devolvê-lo. Só o sócio dono chega a esta função (portal.faturas.ver), então o e-mail
-- não aparece para o resto da equipe. Nada mais muda.

create or replace function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; pl planos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'portal.faturas.ver');
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then
    return jsonb_build_object('hoje', hoje_brasilia(), 'assinatura', null, 'faturas', '[]'::jsonb);
  end if;
  select * into pl from planos where id = a.plano_id;
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'assinatura', jsonb_build_object(
      'plano', pl.nome, 'precoCentavos', a.preco_centavos, 'pessoasIncluidas', a.pessoas_incluidas,
      'pessoasAtivas', pessoas_ativas_portal(p_escritorio), 'pessoaAMaisCentavos', pessoa_a_mais_centavos(),
      'diaVencimento', a.dia_vencimento, 'forma', a.forma, 'emailCobranca', a.email_cobranca, 'inicioCobranca', a.inicio_cobranca,
      'soConsultaDesde', a.so_consulta_desde, 'atrasoDias', escritorio_atraso_dias(p_escritorio)),
    'faturas', coalesce((select jsonb_agg(fatura_json(f) || jsonb_build_object(
        'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                      'valorCentavos', i.valor_centavos) order by i.ordem) from fatura_itens i where i.fatura_id = f.id),
        'pagamento', jsonb_build_object('pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto, 'disponivel', f.pix_copia_cola is not null))
        order by f.competencia desc, f.numero desc)
      from faturas f where f.escritorio_id = p_escritorio and f.situacao <> 'CANCELADA'), '[]'::jsonb),
    'carne', case when a.forma = 'CARNE' then
               (select coalesce(jsonb_agg(carne_json(c) order by c.primeira_competencia), '[]'::jsonb)
                  from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null) end);
end $$;

call fechar_acesso();
