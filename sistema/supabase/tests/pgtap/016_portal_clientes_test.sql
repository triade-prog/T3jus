-- Clientes do Portal (F1.13): cadastro com contatos e qualificação, busca, duplicados, ficha,
-- inativar e reativar, atendimentos e próximo contato (AP-01, AP-02, AP-04, AP-06).
begin;
select plan(42);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
-- Larissa abre só o Jurídico; Diego abre o Comercial.
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']) from ids;

-- Validação de CPF e CNPJ.
select ok(cpf_valido('52998224725') and not cpf_valido('52998224724') and not cpf_valido('11111111111'), 'CPF: dígitos conferidos e repetidos recusados');
select ok(cnpj_valido('11222333000181') and not cnpj_valido('11222333000180'), 'CNPJ: dígitos conferidos');

-- Cadastrar (AP-01).
create temp table c1 as select (portal_cliente_cadastrar(socia, rm, jsonb_build_object(
  'tipo', 'PF', 'nome', ' Helena Prado ', 'documento', '529.982.247-25', 'nacionalidade', 'brasileira', 'estado_civil', 'CASADO',
  'profissao', 'professora', 'cep', '01310-100', 'cidade', 'São Paulo', 'uf', 'SP', 'rg', '',
  'origem', 'INDICACAO_CLIENTE', 'origem_indicacao', 'João Souza',
  'contatos', jsonb_build_array(
    jsonb_build_object('nome', 'Helena Prado', 'telefone', '+5511988887777', 'principal', true),
    jsonb_build_object('nome', 'Beatriz Prado', 'papel', 'filha', 'email', 'bia@exemplo.invalid', 'principal', false)))) ->> 'id')::uuid as id from ids;
select is((select nome || '|' || documento || '|' || cep || '|' || coalesce(rg, 'vazio') from clientes_escritorio, c1 where clientes_escritorio.id = c1.id),
  'Helena Prado|52998224725|01310100|vazio', 'o servidor tira os espaços, deixa só os dígitos e trata branco como vazio');
select ok((select bool_and(k ->> 'id' ~ '^[0-9a-f-]{36}$') from clientes_escritorio c, c1, jsonb_array_elements(c.contatos) k where c.id = c1.id),
  'cada contato ganha um id no servidor');
select is((select dados from historico, c1 where entidade_id = c1.id::text and acao = 'cliente.cadastrado'), '{"tipo": "PF"}'::jsonb,
  'PT-03: o cadastro vai para o histórico sem dado pessoal');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, '{"tipo":"PF","nome":"Ana","documento":"52998224724","contatos":[{"nome":"Ana","telefone":"+5511988887777","principal":true}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["documento"]'::jsonb, 'CPF inválido é recusado no campo');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, '{"tipo":"PF","nome":"Ana","contatos":[{"nome":"Ana","telefone":"11988887777","principal":true}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["contatos"]'::jsonb, 'telefone fora do formato internacional é recusado');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, '{"tipo":"PF","nome":"Ana","contatos":[{"nome":"Ana","telefone":"+5511988887777","principal":false}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["contatos"]'::jsonb, 'precisa de um contato principal');
select is((teste.erro($$ select portal_cliente_cadastrar(socia, rm, '{"tipo":"PF","nome":"Ana","estado_civil":"NOIVO","contatos":[{"nome":"Ana","telefone":"+5511988887777","principal":true}]}') from ids $$))
  -> 'detalhe' -> 'campos', '["estado_civil"]'::jsonb, 'a regra da tabela devolve o campo errado');

-- PJ com representante; PF não guarda representante.
create temp table c2 as select (portal_cliente_cadastrar(larissa, rm, jsonb_build_object(
  'tipo', 'PJ', 'nome', 'Padaria Estrela Ltda', 'documento', '11.222.333/0001-81', 'rep_nome', 'Carlos Lima', 'origem', 'GOOGLE',
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Carlos Lima', 'telefone', '+5511977776666', 'principal', true)))) ->> 'id')::uuid as id from ids;
select is((select origem from clientes_escritorio, c2 where clientes_escritorio.id = c2.id), null,
  'decisão 1: sem a área Comercial, a origem não é gravada');
select is((select qualificacao_faltando(c) from clientes_escritorio c, c2 where c.id = c2.id),
  array['ENDERECO', 'REP_CARGO', 'REP_DOCUMENTO', 'REP_QUALIFICACAO'], 'CH-08: a PJ diz o que falta para a procuração');
select is((select qualificacao_faltando(c) from clientes_escritorio c, c1 where c.id = c1.id),
  array['RG', 'ENDERECO'], 'CH-08: a PF diz o que falta');

-- Lista e busca.
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(socia, rm) -> 'clientes') x),
  '["Helena Prado", "Padaria Estrela Ltda"]'::jsonb, 'AP-01: a lista mostra os clientes ativos');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(socia, rm, 'beatriz') -> 'clientes') x),
  '["Helena Prado"]'::jsonb, 'a busca acha a cliente pelo nome de um contato');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(socia, rm, '97777-6666') -> 'clientes') x),
  '["Padaria Estrela Ltda"]'::jsonb, 'a busca acha pelo telefone só com os dígitos');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(socia, rm, '100%') -> 'clientes') x),
  null, 'o % da busca é texto, não curinga');
select ok((select not (x ? 'origem') and not (x ? 'proxContato') from ids, jsonb_array_elements(portal_clientes(larissa, rm) -> 'clientes') x limit 1),
  'decisão 1: sem a área Comercial a lista não traz origem nem próximo contato');
select is((teste.erro($$ select portal_clientes(larissa, rm, null, 'ATIVO', true) from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'o filtro de vencidos é só do Comercial');
select is((select portal_clientes(intrusa, outro) -> 'clientes' from ids), '[]'::jsonb, 'PT-01: outro escritório não vê estes clientes');
select is((teste.erro($$ select portal_cliente(intrusa, outro, c1.id) from ids, c1 $$)) ->> 'codigo', 'TC404',
  'PT-01: a ficha de outro escritório não abre');

-- Duplicados.
select is((select jsonb_agg(x ->> 'por') from ids, jsonb_array_elements(portal_clientes_duplicados(socia, rm, '52998224725', null)) x),
  '["DOCUMENTO"]'::jsonb, 'avisa o CPF repetido');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes_duplicados(socia, rm, null, '+55 11 98888-7777')) x),
  '["Helena Prado"]'::jsonb, 'avisa o telefone repetido');
select is((select portal_clientes_duplicados(socia, rm, '52998224725', null, c1.id) from ids, c1), '[]'::jsonb, 'na edição, ignora o próprio cliente');

-- Ficha e edição.
select ok((select (f ? 'origem') and not (f ? 'estado') and f ->> 'situacao' = 'ATIVO' from ids, c1, portal_cliente(socia, rm, c1.id) f),
  'a ficha do Comercial traz a origem');
select ok((select not (f ? 'origem') and not (f ? 'proxContato') and not (f ? 'atendimentos') from ids, c1, portal_cliente(larissa, rm, c1.id) f),
  'decisão 1: a ficha sem Comercial não traz origem, próximo contato nem atendimentos');
select lives_ok($$ select portal_cliente_editar(larissa, rm, c1.id, 1, (select to_jsonb(c) - 'origem' || '{"rg":"12.345.678-9","origem":"SITE"}'
                    from clientes_escritorio c where c.id = c1.id)) from ids, c1 $$, 'quem não tem Comercial edita a ficha');
select is((select origem || '|' || versao from clientes_escritorio, c1 where clientes_escritorio.id = c1.id), 'INDICACAO_CLIENTE|2',
  'decisão 1: a edição sem Comercial não muda a origem');
select is((select dados -> 'campos' from historico, c1 where entidade_id = c1.id::text and acao = 'cliente.editado'), '["rg"]'::jsonb,
  'PT-13: o histórico guarda só quais campos mudaram');
select is((teste.erro($$ select portal_cliente_editar(socia, rm, c1.id, 1, '{"nome":"Helena","contatos":[{"nome":"H","telefone":"+5511988887777","principal":true}]}') from ids, c1 $$))
  ->> 'codigo', 'TC409', 'PT-19: versão antiga recebe o conflito');
select is((select portal_cliente(socia, rm, c1.id) -> 'alterado' ->> 'por' from ids, c1), 'Larissa Costa',
  'a ficha diz quem salvou por último');

-- Atendimentos e próximo contato (AP-02, AP-06).
select is((teste.erro($$ select portal_atendimentos(larissa, rm, c1.id) from ids, c1 $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'decisão 1: o histórico de atendimento é só do Comercial');
select is((teste.erro($$ select portal_registrar_atendimento(diego, rm, c1.id, jsonb_build_object('canal', 'WHATSAPP', 'resumo', 'Oi',
          'proxEm', hoje_brasilia() - 1, 'proxResponsavel', diego, 'proxOque', 'Ligar')) from ids, c1 $$)) -> 'detalhe' -> 'campos',
  '["proxEm"]'::jsonb, 'o próximo contato não fica no passado');
select is((teste.erro($$ select portal_registrar_atendimento(diego, rm, c1.id, jsonb_build_object('canal', 'WHATSAPP', 'resumo', 'Oi',
          'proxEm', hoje_brasilia(), 'proxResponsavel', intrusa, 'proxOque', 'Ligar')) from ids, c1 $$)) -> 'detalhe' -> 'campos',
  '["proxResponsavel"]'::jsonb, 'o responsável é alguém do escritório');
create temp table at1 as select portal_registrar_atendimento(diego, rm, c1.id, jsonb_build_object('canal', 'WHATSAPP',
  'resumo', 'Primeira conversa sobre o inventário', 'comQuem', 'Beatriz (filha)',
  'proxEm', hoje_brasilia() + 1, 'proxResponsavel', socia, 'proxOque', 'Mandar a proposta')) as id from ids, c1;
select is((select portal_cliente(diego, rm, c1.id) -> 'proxContato' ->> 'oque' from ids, c1), 'Mandar a proposta',
  'AP-06: o próximo contato vem do último atendimento');
select throws_ok($$ update atendimentos set resumo = 'outro' $$, null, null, 'decisão 3: atendimento não se edita');
select throws_ok($$ delete from atendimentos $$, null, null, 'decisão 3: atendimento não se apaga');
select ajustar_relogio(interval '3 days');
select is((select jsonb_agg(x ->> 'nome') from ids, jsonb_array_elements(portal_clientes(diego, rm, null, 'ATIVO', true) -> 'clientes') x),
  '["Helena Prado"]'::jsonb, 'AP-06: o filtro mostra o retorno vencido');
select ajustar_relogio(interval '0');

-- Inativar e reativar (decisão 2).
select is((teste.erro($$ select portal_cliente_inativar(larissa, rm, c1.id, 2, 'Desistiu') from ids, c1 $$)) -> 'detalhe' ->> 'motivo',
  'AREA_NAO_LIBERADA', 'decisão 2: só o Comercial inativa');
select is((teste.erro($$ select portal_cliente_inativar(diego, rm, c1.id, 2, '  ') from ids, c1 $$)) -> 'detalhe' -> 'campos', '["motivo"]'::jsonb,
  'o motivo é obrigatório');
select is((select portal_cliente_inativar(diego, rm, c1.id, 2, 'Desistiu do inventário') from ids, c1), 3, 'Diego inativa com o motivo');
select ok((select prox_contato(c1.id) is null and portal_clientes(socia, rm) -> 'clientes' @> '[]' and
                  not (portal_clientes(socia, rm) -> 'clientes') @> jsonb_build_array(jsonb_build_object('nome', 'Helena Prado'))
             from ids, c1), 'o inativo sai da lista e o próximo contato se encerra');
select is((select portal_cliente_reativar(socia, rm, c1.id, 3, null) from ids, c1), 4, 'a sócia reativa sem motivo');

select * from finish();
rollback;
