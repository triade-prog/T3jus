-- Passo 1 (F1): Console T3jus. Funções internas só nos clientes atribuídos (PT-24), carteira
-- com estágio (CO-01), ficha com CNPJ (CO-02), convite do sócio (PT-20), notas internas (CO-03)
-- e histórico administrativo (CO-04).
begin;
select plan(50);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Inês', 'IMPLANTACAO') as impl,
  teste.equipe('Fábio', 'FINANCEIRO', 'SUPORTE') as fin,
  teste.equipe('Sueli', 'SUPORTE') as sup,
  teste.pessoa('Sócia Ana') as socia,
  gen_random_uuid() as sessao;
-- A conta do sócio convidado vem do Auth antes do vínculo.
insert into auth.users (id, email) select gen_random_uuid(), 'convidado@exemplo.invalid';
create temp table conta as select id as convidado from auth.users where email = 'convidado@exemplo.invalid';

-- Cadastrar (PT-24: só administração).
select throws_ok($$ select console_criar_escritorio(impl, 'Ipê Advocacia', 'Brasília', 'DF') from ids $$,
  'TC401', null, 'PT-24: implantação não cadastra escritório');
create temp table c as select
  console_criar_escritorio(adm, 'Ipê Advocacia', 'Brasília', 'DF') as ipe,
  console_criar_escritorio(adm, 'Jatobá Advogados', 'Goiânia', 'GO') as jatoba
  from ids;
select is((select array_agg(nome order by nome) from ids, console_carteira(adm)), array['Ipê Advocacia', 'Jatobá Advogados'],
  'CO-01: quem cadastrou vê os clientes na carteira');
select is((select estagio from ids, console_carteira(adm) where nome = 'Ipê Advocacia'), 'IMPLANTACAO',
  'CO-01: o cliente nasce em implantação');
select is((select situacoes from ids, console_carteira(adm) where nome = 'Ipê Advocacia'),
  array['SEM_SOCIO', 'SEM_CONTATO', 'SEM_CONTRATO'],
  'CO-01: situações a tratar calculadas da ficha');
select throws_ok($$ select console_criar_escritorio(adm, 'X', 'Brasília', 'DF') from ids $$, 'TC422', null,
  'nome curto demais é recusado');
select throws_ok($$ select console_criar_escritorio(adm, 'Escritório Y', 'Brasília', 'ZZ') from ids $$, 'TC422', null,
  'UF inexistente é recusada');

-- Só os clientes atribuídos (PT-24).
select is((select count(*)::int from ids, console_carteira(impl)), 0, 'PT-24: sem atribuição, a carteira vem vazia');
select throws_ok($$ select console_ficha(impl, ipe) from ids, c $$, 'TC401', null, 'PT-24: nem abre a ficha de cliente não atribuído');
select is((teste.erro($$ select console_atribuir(adm, ipe, impl, 'FINANCEIRO') from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'FUNCAO_NAO_ATRIBUIDA', 'PT-24: só atribui com uma função que a pessoa tem');
create temp table at as select
  console_atribuir(adm, ipe, impl, 'IMPLANTACAO') as a_impl,
  console_atribuir(adm, ipe, fin, 'FINANCEIRO') as a_fin
  from ids, c;
select throws_ok($$ select console_atribuir(adm, ipe, impl, 'IMPLANTACAO') from ids, c $$, 'TC422', null, 'a mesma atribuição duas vezes não');
select throws_ok($$ select console_atribuir(impl, ipe, sup, 'SUPORTE') from ids, c $$, 'TC401', null, 'implantação não atribui clientes');
select is((select array_agg(nome) from ids, console_carteira(impl)), array['Ipê Advocacia'], 'PT-24: atribuída, vê só o cliente dela');

-- Ficha (CO-02) com versão (PT-19).
select is((select console_ficha(impl, ipe) -> 'escritorio' ->> 'versao' from ids, c), '1', 'implantação abre a ficha');
select is((select console_editar_ficha(impl, ipe, 1, 'Ipê Advocacia', 'Brasília', 'DF', 'SQS 308 bloco C',
            '11222333000181', '[{"nome":"Ana","papel":"Sócia","telefone":"+5561988880000"}]') from ids, c),
  2, 'CO-02: implantação preenche a ficha');
select is((teste.erro($$ select console_editar_ficha(impl, ipe, 1, 'Outro nome', 'Brasília', 'DF', null, null, '[]') from ids, c $$)) ->> 'codigo',
  'TC409', 'PT-19: editar com a versão velha é conflito');
select is((select dados from historico where acao = 'ficha.alterada' and entidade_id = (select ipe::text from c)),
  '{"campos": ["endereco", "cnpj", "contatos"]}'::jsonb, 'o histórico guarda quais campos mudaram, não os contatos');
select is((teste.erro($$ select console_editar_ficha(adm, jatoba, 1, 'Jatobá Advogados', 'Goiânia', 'GO', null, '11222333000181', '[]') from ids, c $$))
  -> 'detalhe', '{"campos": ["cnpj"]}'::jsonb, 'CO-02: cada CNPJ é de um escritório só');
select is((teste.erro($$ select console_editar_ficha(adm, jatoba, 1, 'Jatobá Advogados', 'Goiânia', 'GO', null, null,
            '[{"nome":"Zé","papel":"Estagiário"}]') from ids, c $$)) ->> 'codigo', 'TC422', 'contato sem telefone nem e-mail é recusado');
select is((teste.erro($$ select console_editar_ficha(adm, jatoba, 1, 'Jatobá Advogados', 'Goiânia', 'GO', null, '1122233300018', '[]') from ids, c $$)) ->> 'codigo',
  'TC422', 'CNPJ fora do formato é recusado');
select throws_ok($$ select console_editar_ficha(fin, ipe, 2, 'Ipê Advocacia', 'Brasília', 'DF', null, null, '[]') from ids, c $$,
  'TC401', null, 'PT-24: financeiro não edita a ficha');
select lives_ok($$ select console_ficha(fin, ipe) from ids, c $$, 'financeiro consulta a ficha');

-- Contrato: só administração (PT-24: implantação não muda contrato).
select throws_ok($$ select console_alterar_contrato(impl, ipe, 1, 'CT-2026-001') from ids, c $$, 'TC401', null,
  'PT-24: implantação não muda o contrato');
select is((select console_alterar_contrato(adm, ipe, 1, 'CT-2026-001') from ids, c), 2, 'CO-02: administração registra a referência do contrato');
select ok((select console_ficha(impl, ipe) -> 'permissoes' from ids, c) ? 'console.ficha.editar'
          and not ((select console_ficha(impl, ipe) -> 'permissoes' from ids, c) ? 'console.contrato.editar'),
  'a ficha diz o que a pessoa pode fazer nela');

-- Estágio (CO-01): implantação conclui só com sócio.
select is((teste.erro($$ select console_mudar_estagio(impl, ipe, 2, 'ATIVO', null) from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'SEM_SOCIO', 'CO-01: implantação não conclui sem sócio');

-- Convite do sócio (PT-20): conta própria, ligada ao escritório.
create temp table vs as select console_vincular_socio(impl, ipe, convidado, 'Ana Souza') as v_socio from ids, c, conta;
select ok((select acesso_portal(convidado) from conta), 'PT-20: o sócio convidado entra no Portal');
select is((select array_agg(nome) from conta, meus_escritorios(convidado)), array['Ipê Advocacia'], 'PT-20: ligado só ao escritório do convite');
select is((teste.erro($$ select console_vincular_socio(impl, ipe, convidado, 'Ana Souza') from ids, c, conta $$)) -> 'detalhe' ->> 'motivo',
  'JA_SOCIO', 'o mesmo sócio não é convidado duas vezes');
select lives_ok($$ select console_vincular_socio(adm, jatoba, convidado, 'Outro nome') from ids, c, conta $$,
  'PT-22: o mesmo sócio em outro escritório (advogado que atende mais de um escritório)');
select is((select nome from pessoas, conta where id = convidado), 'Ana Souza', 'quem já tem conta mantém o nome');
select is((select console_mudar_estagio(impl, ipe, 2, 'ATIVO', 'Sócia fez o primeiro acesso') from ids, c), 3,
  'CO-01: com sócio, a implantação conclui');
select is((select interno from historico where acao = 'estado.mudou' and entidade = 'clientes' and dados ->> 'para' = 'ATIVO'), true,
  'a mudança de estágio entra no histórico como interna');
select throws_ok($$ select console_mudar_estagio(adm, ipe, 3, 'IMPLANTACAO', null) from ids, c $$, 'TC023', null,
  'de ativo não volta para implantação');

-- Notas internas (CO-03).
select lives_ok($$ select console_escrever_nota(fin, ipe, 'Boleto de outubro combinado para o dia 10.') from ids, c $$,
  'CO-03: financeiro escreve nota interna');
select throws_ok($$ select * from ids, c, console_notas(sup, ipe) $$, 'TC401', null, 'suporte não atribuído não lê as notas');
select throws_ok($$ update notas_internas set texto = 'x' $$, 'TC010', null, 'nota interna não se altera nem se apaga');

-- O cliente nunca vê o que é interno (CO-03), mesmo com o contexto do próprio escritório.
select set_config('teste.convidado', (select convidado::text from conta), true),
       set_config('teste.ipe', (select ipe::text from c), true);
set local role dominio;
select set_config('app.pessoa_id', current_setting('teste.convidado'), true),
       set_config('app.escritorio_id', current_setting('teste.ipe'), true);
select is((select count(*)::int from clientes) + (select count(*)::int from notas_internas), 0,
  'CO-03: o sócio não lê carteira nem notas internas');
select is((select count(*)::int from historico where interno), 0, 'CO-03: nem os eventos internos do histórico');
select ok((select count(*)::int from historico where acao = 'ficha.alterada') > 0, 'mas vê as mudanças da ficha do escritório');
reset role;
select throws_ok($$ select console_ficha(convidado, ipe) from conta, c $$, 'TC401', null, 'sócio não usa as funções do Console');
select throws_ok($$ select escolher_escritorio(impl, sessao, ipe) from ids, c $$, 'TC401', null,
  'atribuição da equipe não abre o painel do sócio');

-- Histórico administrativo (CO-04).
select ok((select count(*)::int from ids, c, console_historico(impl, ipe) where interno) >= 3
          and (select count(*)::int from ids, c, console_historico(impl, ipe) where acao = 'ficha.alterada') = 1,
  'CO-04: a equipe vê o histórico do cliente, inclusive o interno');
select is((select autor_nome from ids, c, console_historico(impl, ipe) where acao = 'nota.escrita'), 'Fábio', 'com o nome de quem fez');

-- Rever funções e desativar (PT-24).
select lives_ok($$ select console_definir_funcoes(adm, impl, array['SUPORTE']) from ids $$, 'PT-24: administração revê as funções');
select is((select count(*)::int from ids, console_carteira(impl)), 0, 'PT-24: sem a função, a atribuição para na hora');
select is((teste.erro($$ select console_definir_funcoes(adm, adm, array['SUPORTE']) from ids $$)) -> 'detalhe' ->> 'motivo',
  'ULTIMA_ADMINISTRACAO', 'a equipe nunca fica sem administração');
select lives_ok($$ select console_desativar_membro(adm, fin) from ids $$, 'administração desativa alguém da equipe');
select ok(not (select acesso_console(fin) from ids), 'desativado não entra mais no Console');

-- Estrutura: toda tabela interna exige alguém da equipe no contexto; a primeira pessoa da
-- equipe só entra uma vez pelo SQL.
select is(
  (select array_agg(t.tabela order by t.tabela) from tabelas_internas t
    where not exists (select 1 from pg_policy p where p.polrelid = ('public.' || t.tabela)::regclass
                        and p.polname = 'isolamento_escritorio' and pg_get_expr(p.polqual, p.polrelid) ~ 'contexto_equipe\(\)')),
  null, 'CO-03: toda tabela interna só aparece para a equipe');
select throws_ok($$ call iniciar_equipe(gen_random_uuid(), 'Outra pessoa') $$, 'P0001', null, 'a primeira administração só entra uma vez');

select * from finish();
rollback;
