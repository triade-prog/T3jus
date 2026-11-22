-- O contrato, a procuração e a declaração também em PDF (D23, CH-08; 0751): o arquivo e a geração
-- devolvem a versão, o dia em que foi gerado e o número do contrato, que o PDF leva no rodapé
-- (pergunta 4). Quem pode baixar continua igual: a área Contratos, só no próprio escritório.
begin;
select plan(8);

select ajustar_relogio(('2026-11-21 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'JURIDICO'], '{"uf": "SP", "numero": "287104"}'),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO'], '{"uf": "SP", "numero": "401226"}'),
       portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['CONTRATOS']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS']) from ids;
select portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}'),
       portal_oab_incluir(socia, rm, felipe, '{"uf": "RJ", "numero": "245880", "letra": "S", "tipo": "SUPLEMENTAR"}') from ids;
create temp table oab as select
  (select id from oab_inscricao where pessoa_id = ids.socia and removido_em is null) msp,
  (select id from oab_inscricao where pessoa_id = ids.felipe and uf = 'SP' and removido_em is null) fsp,
  (select id from oab_inscricao where pessoa_id = ids.felipe and uf = 'RJ' and removido_em is null) frj,
  (select id from oab_inscricao where pessoa_id = ids.larissa and removido_em is null) lsp
  from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'documento', '52998224725', 'nacionalidade', 'brasileiro', 'estadoCivil', 'CASADO', 'profissao', 'Pedreiro',
     'endereco', 'Rua das Flores, 120', 'cidade', 'São Paulo', 'uf', 'SP',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid bene,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PJ', 'nome', 'Farmácia Bom Jesus Ltda.', 'origem', 'GOOGLE',
     'documento', '11222333000181', 'endereco', 'Av. Brasil, 900', 'cidade', 'São Paulo', 'uf', 'SP',
     'repNome', 'Antônia Ferreira Prado', 'repCargo', 'Sócia-administradora', 'repDocumento', '11144477735',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia', 'telefone', '+5511977001122', 'principal', true)))) ->> 'id')::uuid farm
  from ids;
create temp table ct as select
  (portal_contrato_criar_oab(socia, rm, jsonb_build_object('clienteId', cli.bene, 'objeto', 'Aposentadoria por idade',
     'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.felipe, ids.socia),
     'inscricoes', jsonb_build_object(ids.felipe, jsonb_build_array(oab.fsp)),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'PARCELADO', 'total', 600000, 'parcelas', 3, 'primeiro', '2026-12-10')))) ->> 'id')::uuid bene,
  (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', cli.farm, 'objeto', 'Defesa em execução fiscal',
     'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
     'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 450000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid farm
  from ids, cli, oab;

create function pg_temp.pedido(p_docs jsonb, p_out jsonb, p_extra jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object('documentos', p_docs, 'outorgados', p_out, 'poderes', '["RECEBER_QUITAR", "ACORDO"]'::jsonb,
                            'cidadeData', 'São Paulo, 21 de novembro de 2026') || p_extra
$$;
-- O resultado que a API monta, na ordem dos documentos do pedido conferido.
create function pg_temp.resultado(p_pessoa uuid, p_esc uuid, p_contrato uuid, p_pedido jsonb) returns jsonb
language sql as $$
  select jsonb_build_object('geracaoId', gen_random_uuid(), 'padraoDe', '2026-11-21',
    'documentos', (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'chave', d ->> 'chave', 'arquivo', lower(d ->> 'tipo') || '.docx',
                                                       'tamanho', 4200, 'marcados', '["RG de Benedito Souza Lima"]'::jsonb) order by n)
                     from jsonb_array_elements(portal_documento_preparar(p_pessoa, p_esc, p_contrato, p_pedido) -> 'pedido' -> 'documentos') with ordinality x(d, n)))
$$;
create function pg_temp.gerar(p_pessoa uuid, p_esc uuid, p_contrato uuid, p_pedido jsonb) returns jsonb
language sql as $$ select portal_documento_gravar(p_pessoa, p_esc, p_contrato, p_pedido, pg_temp.resultado(p_pessoa, p_esc, p_contrato, p_pedido)) $$;

create temp table g as select pg_temp.gerar(felipe, rm, ct.bene, pg_temp.pedido(
  '[{"tipo": "CONTRATO", "modeloId": null}, {"tipo": "PROCURACAO", "modeloId": null}]'::jsonb,
  jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) j from ids, ct, oab;
create temp table g2 as select pg_temp.gerar(felipe, rm, ct.bene, pg_temp.pedido(
  '[{"tipo": "CONTRATO", "modeloId": null}]'::jsonb,
  jsonb_build_array(jsonb_build_object('pessoaId', ids.felipe, 'inscricoes', jsonb_build_array(oab.fsp))))) j from ids, ct, oab;
create temp table doc as select
  (select id from documentos_gerados where contrato_id = ct.bene and tipo = 'CONTRATO' and numero = 2) v2,
  (select geracao_id from documentos_gerados where contrato_id = ct.bene and numero = 1 limit 1) ger1
  from ct;

create temp table a as select portal_documento_arquivo(felipe, rm, doc.v2) j from ids, doc;
select is((select (j ->> 'versao')::int from a), 2, 'D23: o arquivo diz a versão, para o rodapé e o nome do PDF');
select is((select j ->> 'contrato' from a), (select numero from contratos where id = (select bene from ct)), 'D23: e o número do contrato');
select is((select (j ->> 'geradoEm')::timestamptz from a), (select gerado_em from documentos_gerados where id = (select v2 from doc)), 'D23: e quando foi gerado');
select ok((select j ? 'nome' from a), 'o nome do arquivo continua vindo');

create temp table z as select portal_documento_geracao(felipe, rm, doc.ger1) j from ids, doc;
select is((select jsonb_array_length(j -> 'arquivos') from z), 2, 'pergunta 2: os arquivos da geração, para o .zip com Word e PDF');
select ok((select bool_and(x ? 'versao' and x ? 'geradoEm') from z, jsonb_array_elements(j -> 'arquivos') x), 'pergunta 2: cada arquivo com a versão e o dia');

select throws_ok(format('select portal_documento_arquivo(%L, %L, %L)', (select larissa from ids), (select rm from ids), (select v2 from doc)),
  'TC401', null, 'quem não tem a área Contratos não baixa (nem em PDF)');
select throws_ok(format('select portal_documento_arquivo(%L, %L, %L)', (select intrusa from ids), (select outro from ids), (select v2 from doc)),
  'TC404', null, 'de outro escritório, o documento não existe');

select * from finish();
rollback;
