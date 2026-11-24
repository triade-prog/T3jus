-- "O que é apagado" com os arquivos do cliente (1030; F3.155, PT-11): a ficha traz arquivosParaApagar
-- só para a sócia dona, no cliente ativo ou inativo sem contrato nem processo; conta os documentos
-- prontos e não apagados (com os substituídos, sem os ENVIANDO e sem os termos), diz se há termo de
-- curatela e de tutela e conta as propostas; a contagem fica igual ou menor que a fila da exclusão
-- (0970), nunca maior; o escritório vem da sessão (PT-01).
begin;
select plan(28);

select ajustar_relogio(('2026-11-24 09:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p jsonb) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc,
    '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, '{"nome": "Helena Prado Souza", "capacidade": "CURATELA", "rl_papel": "CURADORA", "rl_nome": "Clara Prado Souza",
                           "cur_processo": "1004587-22.2025.8.26.0100"}') hel,
  pg_temp.cli(socia, rm, '{"nome": "Antônia Ferreira"}') ant,
  pg_temp.cli(socia, rm, '{"nome": "Davi Torres Lima", "capacidade": "MENOR", "nascimento": "2015-05-02", "rl_papel": "TUTORA",
                           "rl_nome": "Sônia Torres Lima"}') davi,
  pg_temp.cli(socia, rm, '{"nome": "Teo Lima", "capacidade": "MENOR", "nascimento": "2015-01-10", "rl_papel": "TUTORA", "rl_nome": "Sônia Lima"}') ambos,
  pg_temp.cli(socia, rm, '{"tipo": "PJ", "nome": "Construtora Vale Alto Ltda"}') pj,
  pg_temp.cli(socia, rm, '{"nome": "Rafael Moura"}') com_contrato,
  pg_temp.cli(socia, rm, '{"nome": "Ivo Lima"}') inativo,
  pg_temp.cli(socia, rm, '{"nome": "Vera Lúcia Campos"}') arquivado,
  pg_temp.cli(intrusa, outro, '{"nome": "Joana Pereira"}') joa
  from ids;

-- Anexa (iniciar e concluir) e devolve o id do documento.
create function pg_temp.anexar(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_dados jsonb, p_concluir boolean default true) returns uuid
language plpgsql as $$
declare v uuid := portal_cliente_documento_iniciar(p_pessoa, p_esc, p_cliente,
  jsonb_build_object('arquivoTipo', 'application/pdf', 'tamanho', 1000) || p_dados);
begin
  if p_concluir then perform portal_cliente_documento_concluir(p_pessoa, p_esc, v); end if;
  return v;
end $$;
create function pg_temp.termo_curatela(p_cliente uuid) returns uuid language sql as $$
  select (portal_cliente_documento_concluir(ids.socia, ids.rm, portal_cliente_termo_iniciar(ids.socia, ids.rm, p_cliente,
    '{"nome": "termo-curatela.pdf", "arquivoTipo": "application/pdf", "tamanho": 380000}')) ->> 'id')::uuid from ids
$$;
create function pg_temp.termo_tutela(p_cliente uuid) returns uuid language sql as $$
  select (portal_cliente_documento_concluir(ids.socia, ids.rm, portal_cliente_termo_tutela_iniciar(ids.socia, ids.rm, p_cliente,
    '{"nome": "termo-tutela.pdf", "arquivoTipo": "application/pdf", "tamanho": 380000}')) ->> 'id')::uuid from ids
$$;
create function pg_temp.proposta(p_cliente uuid) returns uuid language sql as $$
  select (portal_proposta_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'servico', 'Curatela',
    'escopo', 'Ação e acompanhamento.', 'responsavelId', ids.socia,
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2026-12-05', 'meses', 6)),
    'retorno', jsonb_build_object('em', '2026-11-30', 'responsavelId', ids.socia))) ->> 'id')::uuid
  from ids
$$;
create function pg_temp.contrato(p_cliente uuid) returns uuid language sql as $$
  select (portal_contrato_criar(ids.socia, ids.rm, jsonb_build_object('clienteId', p_cliente, 'objeto', 'Aposentadoria por idade',
    'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
    'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid
  from ids
$$;
create function pg_temp.excluir(p_cliente uuid, p_nome text) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
    'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', p_nome)) from ids, clientes_escritorio c where c.id = p_cliente
$$;
create function pg_temp.ficha(p_pessoa uuid, p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente(p_pessoa, ids.rm, p_cliente) from ids
$$;
create function pg_temp.editar(p_cliente uuid, p jsonb) returns jsonb language sql as $$
  select portal_cliente_editar(ids.socia, ids.rm, p_cliente, c.versao,
    '{"tipo": "PF", "origem": "GOOGLE", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p)
    from ids, clientes_escritorio c where c.id = p_cliente
$$;

-- Helena (curatela): o RG velho (depois substituído), o RG novo, outro, comprovante, a CNH ainda
-- enviando e o termo de curatela; 2 propostas, a primeira passa pela versão 3.
create temp table d as select
  pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "RG_CPF", "nome": "RG Helena Prado.pdf"}') rg_velho from ids, cli;
alter table d add column rg uuid, add column enviando uuid;
update d set rg = pg_temp.anexar(ids.socia, ids.rm, cli.hel, '{"tipo": "RG_CPF", "nome": "RG Helena Prado novo.pdf"}') from ids, cli;
select pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "OUTRO", "descricao": "Certidão de óbito de João Prado", "nome": "obito joao.pdf"}'),
       pg_temp.anexar(socia, rm, cli.hel, '{"tipo": "COMPROVANTE_RESIDENCIA", "dataDocumento": "2026-11-01", "nome": "conta de luz.pdf"}')
  from ids, cli;
update d set enviando = pg_temp.anexar(ids.socia, ids.rm, cli.hel, '{"tipo": "CNH", "nome": "CNH Helena.pdf"}', false) from ids, cli;
select pg_temp.termo_curatela(cli.hel) from cli;
create temp table pr as select pg_temp.proposta(cli.hel) hel1, pg_temp.proposta(cli.hel) hel2, pg_temp.proposta(cli.pj) pj1, pg_temp.proposta(cli.pj) pj2 from cli;
update propostas set servico = 'Curatela e interdição' where id = (select hel1 from pr);
update propostas set servico = 'Curatela e interdição.' where id = (select hel1 from pr);

-- Davi (menor com tutora): 2 documentos e o termo de tutela.
select pg_temp.anexar(socia, rm, cli.davi, '{"tipo": "RG_CPF", "nome": "RG Davi.pdf"}'),
       pg_temp.anexar(socia, rm, cli.davi, '{"tipo": "OUTRO", "descricao": "Certidão de nascimento", "nome": "certidao.pdf"}'),
       pg_temp.termo_tutela(cli.davi)
  from ids, cli;

-- Teo (ambos), pelo caminho real (revisão, M4): menor com tutora, com o termo de tutela; passa à
-- curatela e recebe o termo de curatela. O de tutela fica guardado (PT-03).
select pg_temp.termo_tutela(cli.ambos) from cli;
select pg_temp.editar(cli.ambos, '{"nome": "Teo Lima", "capacidade": "CURATELA", "rl_papel": "CURADORA", "rl_nome": "Helena Ramos Castro"}') from cli;
select pg_temp.termo_curatela(cli.ambos) from cli;

-- Rafael tem contrato; Ivo é inativado; Vera tem contrato e é arquivada a pedido; Joana é de outro escritório.
select pg_temp.anexar(socia, rm, cli.com_contrato, '{"tipo": "RG_CPF", "nome": "RG Rafael.pdf"}'),
       pg_temp.anexar(socia, rm, cli.inativo, '{"tipo": "RG_CPF", "nome": "RG Ivo.pdf"}'),
       pg_temp.anexar(socia, rm, cli.arquivado, '{"tipo": "RG_CPF", "nome": "RG Vera.pdf"}'),
       pg_temp.anexar(intrusa, outro, cli.joa, '{"tipo": "RG_CPF", "nome": "RG Joana.pdf"}')
  from ids, cli;
select pg_temp.contrato(cli.com_contrato), pg_temp.contrato(cli.arquivado) from cli;
select portal_cliente_inativar(socia, rm, cli.inativo, c.versao, 'Mudou de escritório') from ids, cli, clientes_escritorio c where c.id = cli.inativo;
select portal_cliente_arquivar_lgpd(socia, rm, cli.arquivado, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(),
  'canal', 'WHATSAPP', 'quemPediu', 'TITULAR', 'conferido', true)) from ids, cli, clientes_escritorio c where c.id = cli.arquivado;

-- 1. A função nova.
select ok((select not prosecdef from pg_proc where proname = 'cliente_arquivos_para_apagar'),
  'PT-11 F3.155: cliente_arquivos_para_apagar existe e não é security definer (só o embrulho a chama)');
select ok(not has_function_privilege('service_role', 'cliente_arquivos_para_apagar(uuid,uuid)', 'execute')
          and not has_function_privilege('authenticated', 'cliente_arquivos_para_apagar(uuid,uuid)', 'execute'),
  'PT-11 F3.155: o servidor e o navegador não chamam a contagem direto (revisão, M5)');

-- 2. Helena: 4 documentos prontos (os 2 RG, o substituído incluído, outro e comprovante), o termo de
-- curatela e as 2 propostas.
select is((select pg_temp.ficha(ids.socia, cli.hel) -> 'arquivosParaApagar' from ids, cli),
  '{"documentos": 4, "curatela": true, "tutela": false, "propostas": 2}'::jsonb,
  'PT-11 F3.155: a dona vê os documentos (com o substituído), o termo de curatela e as propostas');
select ok((select substituido_por = d.rg from cliente_documentos, d where id = d.rg_velho),
  'PT-11 F3.155: o RG velho está substituído e mesmo assim conta (o arquivo existe e sai na exclusão)');

-- 3. A CNH ainda enviando não conta.
select is((select situacao::text from cliente_documentos, d where id = d.enviando), 'ENVIANDO',
  'PT-11 F3.155: a CNH de Helena existe e está enviando');
select is((select count(*)::int from cliente_documentos, cli where cliente_id = cli.hel and not tipo_termo_responsavel(tipo)), 5,
  'PT-11 F3.155: Helena tem 5 documentos, e a contagem fica em 4 (sem o enviando)');

-- 4. Antônia, sem nada: a chave vem com zeros.
select is((select pg_temp.ficha(ids.socia, cli.ant) -> 'arquivosParaApagar' from ids, cli),
  '{"documentos": 0, "curatela": false, "tutela": false, "propostas": 0}'::jsonb,
  'PT-11 F3.155: sem arquivo, a chave vem com zeros (a tela não mostra a linha)');

-- 5. Davi: documentos e o termo de tutela.
select is((select pg_temp.ficha(ids.socia, cli.davi) -> 'arquivosParaApagar' from ids, cli),
  '{"documentos": 2, "curatela": false, "tutela": true, "propostas": 0}'::jsonb,
  'PT-11 F3.155: o menor com tutora tem os documentos e o termo de tutela');

-- 6. Teo: os dois termos ao mesmo tempo.
select is((select pg_temp.ficha(ids.socia, cli.ambos) -> 'arquivosParaApagar' from ids, cli),
  '{"documentos": 0, "curatela": true, "tutela": true, "propostas": 0}'::jsonb,
  'PT-11 F3.155: quem passou da tutela à curatela tem os dois termos (o de tutela guardado)');
select is((select pg_temp.ficha(ids.socia, cli.ambos) -> 'termoTutela' from ids, cli), 'null'::jsonb,
  'PT-11 F3.155: o termo de tutela não está à vista, mas conta (o arquivo existe)');

-- 7. A empresa: sem documentos, com 2 propostas.
select is((select pg_temp.ficha(ids.socia, cli.pj) -> 'arquivosParaApagar' from ids, cli),
  '{"documentos": 0, "curatela": false, "tutela": false, "propostas": 2}'::jsonb,
  'PT-11 F3.155: a empresa tem as 2 propostas e nenhum documento');

-- 8. Quem não é a dona não recebe.
create temp table fd as select pg_temp.ficha(ids.diego, cli.hel) f from ids, cli;
select ok((select f ->> 'id' is not null and f -> 'dono' = 'false'::jsonb from fd), 'PT-11 F3.155: Diego (Comercial) vê a ficha, sem ser o dono');
select ok((select not (f ? 'arquivosParaApagar') from fd), 'PT-11 F3.155: quem não é a dona não recebe a chave');

-- 9. Com contrato: a janela é a de arquivar.
create temp table fc as select pg_temp.ficha(ids.socia, cli.com_contrato) f from ids, cli;
select is((select jsonb_typeof(f -> 'vinculosLgpd') from fc), 'object', 'PT-11 F3.155: Rafael tem contrato (vinculosLgpd é objeto)');
select ok((select not (f ? 'arquivosParaApagar') from fc), 'PT-11 F3.155: com contrato ou processo, a chave não vem (nada se apaga)');

-- 10. Inativo: pode ser excluído, a chave vem.
select is((select estado::text from clientes_escritorio, cli where id = cli.inativo), 'INATIVO', 'PT-11 F3.155: Ivo está inativo');
select is((select (pg_temp.ficha(ids.socia, cli.inativo) -> 'arquivosParaApagar' ->> 'documentos')::int from ids, cli), 1,
  'PT-11 F3.155: no inativo a chave vem, com o documento');

-- 11. Arquivado: a chave não vem.
select is((select estado::text from clientes_escritorio, cli where id = cli.arquivado), 'ARQUIVADO', 'PT-11 F3.155: Vera está arquivada');
select ok((select not (pg_temp.ficha(ids.socia, cli.arquivado) ? 'arquivosParaApagar') from ids, cli),
  'PT-11 F3.155: no arquivado a chave não vem (vinculosLgpd vem null, e o estado barra)');

-- 15. Isolamento: o escritório vem da sessão.
select is((select cliente_arquivos_para_apagar(ids.outro, cli.hel) from ids, cli),
  '{"documentos": 0, "curatela": false, "tutela": false, "propostas": 0}'::jsonb,
  'PT-01 F3.155: com outro escritório, os arquivos de Helena não contam');
select is((select cliente_arquivos_para_apagar(ids.rm, cli.joa) from ids, cli),
  '{"documentos": 0, "curatela": false, "tutela": false, "propostas": 0}'::jsonb,
  'PT-01 F3.155: o cliente de outro escritório não conta no escritório da sessão');
select is((teste.erro($$ select portal_cliente(intrusa, rm, cli.hel) from ids, cli $$)) ->> 'codigo', 'TC401',
  'PT-01 F3.155: quem não é do escritório não recebe a ficha');

-- 12. A contagem bate com a fila: depois de excluir Helena.
create temp table antes as select pg_temp.ficha(ids.socia, cli.hel) -> 'arquivosParaApagar' a from ids, cli;
select pg_temp.excluir(cli.hel, 'Helena Prado Souza') from cli;
-- (a) Os documentos: os prontos contados, o termo e a CNH enviando (que a fila cobre e a tela não cita).
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel and caminho !~ '/propostas/'),
  (select (a ->> 'documentos')::int + 1 + 1 from antes),
  'PT-11 F3.155: a fila tem os documentos contados, mais o termo e o enviando');
-- (b) As propostas: a tela conta por proposta (R6), a fila por versão do Word.
select is((select count(distinct split_part(split_part(caminho, '/', 3), '-v', 1))::int from arquivos_apagar, cli
             where cliente_id = cli.hel and caminho ~ '/propostas/'),
  (select (a ->> 'propostas')::int from antes), 'PT-11 F3.155: as propostas da fila são as contadas');
-- (c) A exclusão limpa o escopo e sobe a versão (revisão, I1): o esperado sai das versões finais.
select is((select count(*)::int from arquivos_apagar, cli where cliente_id = cli.hel and caminho ~ '\.docx$'),
  (select sum(greatest(versao, 1))::int from propostas, cli where cliente_id = cli.hel),
  'PT-11 F3.155: a fila tem um .docx por versão de cada proposta (a tela conta a proposta, não as versões)');

-- 13. Depois da exclusão, a ficha não traz a chave.
select ok((select not (pg_temp.ficha(ids.socia, cli.hel) ? 'arquivosParaApagar') from ids, cli),
  'PT-11 F3.155: no excluído a chave não vem');

-- 14. A auxiliar direto depois da exclusão: os documentos saíram; as propostas continuam (sem dado pessoal).
select is((select cliente_arquivos_para_apagar(ids.rm, cli.hel) from ids, cli),
  '{"documentos": 0, "curatela": false, "tutela": false, "propostas": 2}'::jsonb,
  'PT-11 F3.155: depois da exclusão, nenhum documento conta; as propostas continuam existindo');

-- A ficha sem a chave continua igual para os outros campos (o embrulho da 0960 vale).
select ok((select f ? 'termoCuratela' and f ? 'termoTutela' and f ? 'vinculosLgpd' from (select pg_temp.ficha(ids.socia, cli.davi) f from ids, cli) x),
  'PT-11 F3.155: a ficha continua com termoCuratela, termoTutela e vinculosLgpd');

select * from finish();
rollback;
