-- O contrato, a procuração e a declaração também em PDF (D23, CH-08; desenho aprovado em
-- docs/design/aprovadas/portal-contrato-pdf). O PDF é montado na api-portal a partir do .docx da
-- versão e leva no rodapé o contrato, a versão e o dia em que foi gerado (pergunta 4). Aqui só
-- as duas leituras passam a devolver esses dados; quem pode continua igual (documento_entrar).

create or replace function portal_documento_arquivo(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare g documentos_gerados;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  select * into g from documentos_gerados where id = p_id and escritorio_id = p_escritorio;
  if g.id is null then raise exception 'Documento não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object('id', g.id, 'nome', g.nome_arquivo, 'versao', g.numero, 'geradoEm', g.gerado_em,
                            'contrato', (select c.numero from contratos c where c.id = g.contrato_id));
end $$;

-- Os arquivos de uma geração, para o .zip de "Baixar todos" (decisão 16), agora com a versão e o
-- dia de cada um, para o PDF que vai junto (pergunta 2).
create or replace function portal_documento_geracao(p_pessoa uuid, p_escritorio uuid, p_geracao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform documento_entrar(p_pessoa, p_escritorio, false);
  select jsonb_build_object('numero', c.numero, 'cliente', k.nome, 'versao', max(g.numero),
                            'arquivos', jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome_arquivo, 'versao', g.numero, 'geradoEm', g.gerado_em)
                                                  order by g.ordem))
    into v
    from documentos_gerados g join contratos c on c.id = g.contrato_id join clientes_escritorio k on k.id = c.cliente_id
   where g.geracao_id = p_geracao and g.escritorio_id = p_escritorio
   group by c.numero, k.nome;
  if v is null then raise exception 'Geração não encontrada' using errcode = 'TC404'; end if;
  return v;
end $$;

call fechar_acesso();
