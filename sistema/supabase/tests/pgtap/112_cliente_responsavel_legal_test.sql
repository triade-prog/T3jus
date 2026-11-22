-- Quem assina pelo cliente menor ou sob curatela (F3.98; AP-01, CH-08, PT-11): o que se exige para
-- salvar (pergunta 6), a conta de representado ou assistido pela data, a curatela com o modo
-- (pergunta 4), o que a procuração pede, a janela dos 18 anos e o sino (pergunta 3), os dados de
-- gerar documentos e quem assinou no documento gerado, a exclusão a pedido do titular e o
-- isolamento (PT-01, PT-03).
begin;
select plan(35);

-- Rafaela é cadastrada em 10/11, ainda com 17 anos; o resto do teste é em 22/11/2026.
select ajustar_relogio(('2026-11-10 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['CONTRATOS', 'JURIDICO'], '{"uf": "SP", "numero": "287104"}') from ids;

create function pg_temp.cli(p jsonb) returns jsonb
language sql as $$
  select '{"tipo": "PF", "contatos": [{"nome": "Contato", "telefone": "+5511984723316", "principal": true}]}'::jsonb || p
$$;

create temp table rafa as select (portal_cliente_cadastrar(socia, rm, pg_temp.cli(jsonb_build_object(
  'nome', 'Rafaela Nunes Torres', 'documento', '609.124.853-70', 'capacidade', 'MENOR', 'nascimento', '2008-11-19',
  'rl_papel', 'TUTORA', 'rl_nome', 'Cleusa Nunes Torres', 'rl_documento', '127.508.394-32', 'nacionalidade', 'brasileira',
  'endereco', 'Rua Itaqueri, 1.020', 'cidade', 'São Paulo', 'uf', 'SP'))) ->> 'id')::uuid id from ids;
select ok((select id is not null from rafa), 'com 17 anos, o menor se cadastra');
create temp table ct_rafa as select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', rafa.id, 'objeto', 'Indenização',
  'responsavelId', ids.felipe, 'advogados', jsonb_build_array(ids.felipe),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 300000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid id
  from ids, rafa;

select ajustar_relogio(('2026-11-22 12:00-03'::timestamptz - now()));

-- Para salvar o menor: a data de nascimento e o nome de quem assina (pergunta 6).
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "rl_papel": "MAE", "rl_nome": "Joana"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["nascimento"]'::jsonb, 'F3.98: o menor sem data de nascimento é recusado no campo');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_papel": "MAE"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["rl_nome"]'::jsonb, 'F3.98: o menor sem quem assina é recusado no campo');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_papel": "CURADORA", "rl_nome": "Joana"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["rl_papel"]'::jsonb, 'F3.98: quem assina pelo menor é mãe, pai ou tutor');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "nascimento": "2027-01-01", "rl_papel": "MAE", "rl_nome": "Joana"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["nascimento"]'::jsonb, 'F3.98: a data de nascimento no futuro é recusada');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "nascimento": "2008-11-21", "rl_papel": "MAE", "rl_nome": "Joana"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["nascimento"]'::jsonb, 'F3.98: quem já tem 18 anos não se cadastra como menor');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_papel": "MAE", "rl_nome": "Joana", "rl_documento": "377.640.215-64"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["rl_documento"]'::jsonb, 'F3.98: o CPF de quem assina tem os dígitos conferidos');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Pedro", "documento": "48821390730", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_papel": "MAE", "rl_nome": "Joana", "rl_documento": "48821390730"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["rl_documento"]'::jsonb, 'F3.98: quem assina não tem o CPF do próprio cliente');

-- Pedro, 12 anos, representado pela mãe; o endereço de Joana é o dele (mora junto, por padrão).
create temp table pedro as select (portal_cliente_cadastrar(socia, rm, pg_temp.cli(jsonb_build_object(
  'nome', 'Pedro Henrique Alves Souza', 'documento', '488.213.907-30', 'capacidade', 'MENOR', 'nascimento', '2014-03-14',
  'rl_papel', 'MAE', 'rl_nome', ' Joana Alves Souza ', 'nacionalidade', 'brasileira', 'endereco', 'Rua Bresser, 845', 'cidade', 'São Paulo',
  'uf', 'SP', 'rl_cep', '04040-031', 'cur_modo', 'ASSISTE'))) ->> 'id')::uuid id from ids;
select is((select rl_nome || '|' || rl_mora_junto::text || '|' || coalesce(rl_cep, 'sem cep') || '|' || coalesce(cur_modo, 'sem modo')
             from clientes_escritorio, pedro where clientes_escritorio.id = pedro.id),
  'Joana Alves Souza|true|sem cep|sem modo', 'F3.98: mora junto por padrão, sem endereço próprio; a curatela não entra no menor');
create temp table fp as select portal_cliente(socia, rm, pedro.id) j from ids, pedro;
select is((select j -> 'assina' from fp), '{"idade": 12, "modo": null, "faz16": "2030-03-14", "faz18": "2032-03-14", "situacao": "REPRESENTADO"}'::jsonb,
  'F3.98: até 15 anos, representado, com as datas dos 16 e dos 18');
select is((select j -> 'faltando' from fp), '["RL_DOCUMENTO", "RL_RG", "RL_QUALIFICACAO"]'::jsonb,
  'CH-08: o menor não precisa de estado civil, profissão nem RG; quem assina por ele, sim');
select is((select (j ->> 'totalQualificacao')::int from fp), 6, 'CH-08: o total do que a procuração pede segue quem assina');
select is((select j ->> 'rl_nome' from fp), 'Joana Alves Souza', 'a ficha traz quem assina');

-- Lucas, 16 anos: assistido.
create temp table lucas as select (portal_cliente_cadastrar(socia, rm, pg_temp.cli(jsonb_build_object(
  'nome', 'Lucas Ferreira Moura', 'capacidade', 'MENOR', 'nascimento', '2010-02-03', 'rl_papel', 'PAI', 'rl_nome', 'Marcos Ferreira Moura',
  'rl_mora_junto', false, 'rl_endereco', 'Rua Cajuru, 312', 'rl_cidade', 'São Paulo', 'rl_uf', 'SP'))) ->> 'id')::uuid id from ids;
select is((select portal_cliente(socia, rm, lucas.id) -> 'assina' ->> 'situacao' from ids, lucas), 'ASSISTIDO', 'F3.98: aos 16 e 17 anos, assistido');
select is((select rl_endereco from clientes_escritorio, lucas where clientes_escritorio.id = lucas.id), 'Rua Cajuru, 312',
  'F3.98: quem não mora com o cliente guarda o próprio endereço');
select ok((select 'RL_ENDERECO' <> all (qualificacao_faltando(c)) from clientes_escritorio c, lucas where c.id = lucas.id),
  'CH-08: com o endereço de quem assina preenchido, ele não falta');

-- Sebastião, sob curatela: o modo é "representa" quando não vem (pergunta 4); a data não fica.
create temp table seb as select (portal_cliente_cadastrar(socia, rm, pg_temp.cli(jsonb_build_object(
  'nome', 'Sebastião Ramos Filho', 'capacidade', 'CURATELA', 'nascimento', '1952-05-02', 'rl_papel', 'CURADORA',
  'rl_nome', 'Helena Ramos Castro', 'cur_processo', '1004587-22.2025.8.26.0100'))) ->> 'id')::uuid id from ids;
select is((select cur_modo || '|' || coalesce(nascimento::text, 'sem data') from clientes_escritorio, seb where clientes_escritorio.id = seb.id),
  'REPRESENTA|sem data', 'pergunta 4 e 5: a curadora representa por padrão; o curatelado não guarda data de nascimento');
select is((select qualificacao_faltando(c) from clientes_escritorio c, seb where c.id = seb.id),
  array['DOCUMENTO', 'NACIONALIDADE', 'ESTADO_CIVIL', 'PROFISSAO', 'RG', 'ENDERECO', 'RL_DOCUMENTO', 'RL_RG', 'RL_QUALIFICACAO'],
  'CH-08: o curatelado precisa da qualificação completa, e quem assina também');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, pg_temp.cli('{"nome": "Ana", "capacidade": "CURATELA", "rl_papel": "MAE", "rl_nome": "Joana"}')) from ids $$))
  -> 'detalhe' -> 'campos', '["rl_papel"]'::jsonb, 'F3.98: na curatela, quem assina é curadora ou curador');

-- Voltar a "assina por si" limpa tudo (PT-11); a empresa nunca tem responsável.
select portal_cliente_editar(socia, rm, lucas.id, 1, pg_temp.cli(jsonb_build_object('nome', 'Lucas Ferreira Moura', 'capacidade', 'PLENA',
  'nascimento', '2010-02-03', 'rl_nome', 'Marcos'))) from ids, lucas;
select ok((select capacidade = 'PLENA' and nascimento is null and rl_nome is null and rl_papel is null and rl_endereco is null and rl_mora_junto is null
             from clientes_escritorio, lucas where clientes_escritorio.id = lucas.id), 'PT-11: quem assina por si não guarda data nem responsável');
select ok((select (h.dados -> 'campos') ?& array['capacidade', 'nascimento', 'rl_nome'] from historico h, lucas
            where h.entidade_id = lucas.id::text and h.acao = 'cliente.editado'), 'PT-03: o histórico diz quais campos mudaram, sem os valores');
create temp table pj as select (portal_cliente_cadastrar(socia, rm, '{"tipo": "PJ", "nome": "Farmácia Bom Jesus", "capacidade": "MENOR", "nascimento": "2014-03-14", "rl_nome": "Joana", "contatos": [{"nome": "Antônia", "telefone": "+5511977001122", "principal": true}]}') ->> 'id')::uuid id from ids;
select is((select capacidade || '|' || coalesce(rl_nome, 'sem') from clientes_escritorio, pj where clientes_escritorio.id = pj.id), 'PLENA|sem',
  'F3.98: a empresa assina pelo representante, nunca pelo responsável');

-- Rafaela fez 18 anos em 19/11: a ficha avisa e continua editável (pergunta 3).
create temp table fr as select portal_cliente(socia, rm, rafa.id) j from ids, rafa;
select is((select j -> 'assina' ->> 'situacao' from fr), 'FEZ_18', 'pergunta 3: quem fez 18 anos aparece como "fez 18"');
select is((select j -> 'faltando' from fr), '["ESTADO_CIVIL", "PROFISSAO", "RG"]'::jsonb,
  'pergunta 3: aos 18, estado civil, profissão e RG passam a ir no documento');
select ok((select portal_cliente_editar(socia, rm, rafa.id, versao, pg_temp.cli(jsonb_build_object('nome', 'Rafaela Nunes Torres', 'documento', '60912485370',
  'capacidade', 'MENOR', 'nascimento', '2008-11-19', 'rl_papel', 'TUTORA', 'rl_nome', 'Cleusa Nunes Torres', 'rg', '52.884.106-2'))) ->> 'versao' is not null
             from ids, rafa, clientes_escritorio c where c.id = rafa.id), 'pergunta 3: o cadastro só muda na janela; até lá, a ficha se edita');

-- O sino no dia (pergunta 3): para quem responde pelo contrato ativo, uma vez.
select is((select (avisar_clientes_fez_18() ->> 'avisos')::int), 1, 'pergunta 3: o sino avisa quem responde pelo contrato ativo');
select is((select (avisar_clientes_fez_18() ->> 'avisos')::int), 0, 'pergunta 3: o aviso sai uma vez só');
select is((select pessoa_id = ids.felipe and dados ->> 'cliente' = 'Rafaela Nunes Torres' and dados ->> 'quem' = 'Cleusa, a tutora'
             from avisos_sino, ids where tipo = 'CLIENTE_FEZ_18'), true, 'o aviso diz quem fez 18 e quem assinava');

-- A janela "Agora assina por si".
select is((teste.erro($$ select portal_cliente_assina_por_si(socia, rm, pedro.id, 1, '{}') from ids, pedro $$)) -> 'detalhe' ->> 'motivo',
  'CLIENTE_NAO_FEZ_18', 'pergunta 3: só quem já fez 18 anos passa a assinar por si');
select portal_cliente_assina_por_si(socia, rm, rafa.id, c.versao, '{"estado_civil": "SOLTEIRO", "profissao": "atendente"}') from ids, rafa, clientes_escritorio c where c.id = rafa.id;
select ok((select capacidade = 'PLENA' and nascimento is null and rl_nome is null and estado_civil = 'SOLTEIRO' and profissao = 'atendente'
             from clientes_escritorio, rafa where clientes_escritorio.id = rafa.id), 'pergunta 3: a janela limpa a data e o responsável e completa a qualificação');
select is((select (portal_cliente(socia, rm, rafa.id) -> 'quemAssinava') - 'contratos'::text from ids, rafa),
  '{"ate": "2026-11-18", "nome": "Cleusa Nunes Torres", "papel": "TUTORA", "documento": null}'::jsonb,
  'nada se apaga: quem assinava fica na ficha, até a véspera dos 18');
select is((select dados ->> 'fez18' from historico, rafa where entidade_id = rafa.id::text and acao = 'cliente.passou_a_assinar'), '2026-11-19',
  'PT-03: o evento vai para o histórico, sem nome nem CPF');

-- Gerar documentos: os dados levam quem assina.
select is((select portal_documento_dados(socia, rm, ct.id) -> 'cliente' ->> 'rlNome'
             from ids, (select (portal_contrato_criar(socia, rm, jsonb_build_object('clienteId', pedro.id, 'objeto', 'Pensão',
               'responsavelId', ids.socia, 'advogados', jsonb_build_array(ids.socia),
               'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 100000, 'vencimento', '2026-12-05')))) ->> 'id')::uuid id
                  from ids, pedro) ct), 'Joana Alves Souza', 'CH-08: a página de gerar recebe quem assina pelo menor');

-- Exclusão a pedido do titular: a data e quem assina saem junto.
select portal_cliente_pedir_exclusao(socia, rm, seb.id, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR')) from ids, seb;
select portal_cliente_excluir_dados(socia, rm, seb.id, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
  'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', 'Sebastião Ramos Filho')) from ids, seb, clientes_escritorio c where c.id = seb.id;
select ok((select estado = 'EXCLUIDO' and capacidade = 'PLENA' and rl_nome is null and cur_processo is null and cur_modo is null
             from clientes_escritorio, seb where clientes_escritorio.id = seb.id), 'F1.15: a exclusão tira quem assina e a curatela');

-- Isolamento.
select is((teste.erro($$ select portal_cliente_assina_por_si(intrusa, outro, rafa.id, 1, '{}') from ids, rafa $$)) ->> 'codigo', 'TC404',
  'PT-01: o cliente de outro escritório não aparece');

select * from finish();
rollback;
