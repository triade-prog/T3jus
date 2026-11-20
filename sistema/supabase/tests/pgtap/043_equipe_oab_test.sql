-- A OAB de cada advogado na Equipe (EX-12): incluir, mudar e remover só pela sócia dona; o
-- número só com dígitos e a letra à parte; as repetições recusadas com o código de cada campo;
-- uma principal por pessoa (trocar avisa); a frase do documento; o convite com a OAB; Sua conta
-- só da pessoa da sessão; quem sai leva as inscrições; o histórico; isolamento (PT-01, PT-03).
begin;
select plan(30);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Gustavo Lima') as gustavo,
  teste.pessoa('Renata Lopes') as renata,
  teste.pessoa('Intrusa') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO']),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']),
       portal_convidar(socia, rm, gustavo, 'Gustavo Lima', array['JURIDICO']) from ids;

-- Incluir.
create temp table sp as select portal_oab_incluir(socia, rm, felipe, '{"uf": "SP", "numero": "287.104", "tipo": "PRINCIPAL"}') j from ids;
select is((select j ->> 'numero' from sp), '287104', 'decisão 9: o número fica só com os dígitos');
select is((select j ->> 'texto' from sp), 'OAB/SP 287.104', 'o texto curto com o ponto de milhar');
select is((select j ->> 'frase' from sp), 'OAB/SP nº 287.104', 'a frase do documento com uma inscrição');
create temp table rj as select portal_oab_incluir(socia, rm, felipe, '{"uf": "rj", "numero": "0245880", "letra": "s", "tipo": "SUPLEMENTAR"}') j from ids;
select is((select j ->> 'frase' from rj), 'OAB/SP nº 287.104 e OAB/RJ nº 245.880-S',
  'decisão 17: a principal primeiro, ligadas por "e"; zeros à esquerda saem; a letra vira maiúscula');
select lives_ok($$ select portal_oab_incluir(socia, rm, felipe, '{"uf": "MG", "numero": "1", "tipo": "SUPLEMENTAR"}') from ids $$, 'uma terceira inscrição');
select is((select oab_frase(felipe, rm) from ids), 'OAB/SP nº 287.104, OAB/RJ nº 245.880-S e OAB/MG nº 1', 'três inscrições: vírgula e "e" no fim');

-- Erros presos aos campos.
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "", "numero": "51290A"}') from ids $$)) -> 'detalhe' -> 'motivos',
  '{"uf": "UF_OBRIGATORIA", "numero": "NUMERO_INVALIDO"}'::jsonb, 'decisões 9 e 11: UF sem escolher e letra no meio do número');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "XX", "numero": "1234567"}') from ids $$)) -> 'detalhe' -> 'motivos',
  '{"uf": "UF_INVALIDA", "numero": "NUMERO_INVALIDO"}'::jsonb, 'UF fora da lista e mais de 6 dígitos');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "SP", "numero": "000"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'numero',
  'NUMERO_INVALIDO', 'só zeros não vale');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "SP"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'numero',
  'NUMERO_OBRIGATORIO', 'decisão 11: UF sem número');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "SP", "numero": "12", "letra": "AB"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'letra',
  'LETRA_INVALIDA', 'decisão 10: uma letra só');
create temp table dup as select teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "SP", "numero": "287104", "letra": "A"}') from ids $$) e;
select is((select e -> 'detalhe' ->> 'motivo' from dup), 'OAB_DE_OUTRA_PESSOA', 'decisão 12: o mesmo número de outra pessoa (a letra não conta)');
select is((select e -> 'detalhe' ->> 'nome' from dup), 'Felipe Matos', 'a mensagem diz de quem é');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, felipe, '{"uf": "SP", "numero": "999", "tipo": "SUPLEMENTAR"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'uf',
  'UF_REPETIDA', 'duas inscrições da mesma pessoa na mesma UF');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "SP", "numero": "512907", "tipo": "PRINCIPAL"}') from ids $$)), null,
  'a primeira inscrição de Gustavo, como principal');
select is((teste.erro($$ select portal_oab_incluir(socia, rm, gustavo, '{"uf": "RJ", "numero": "77", "tipo": "PRINCIPAL"}') from ids $$)) -> 'detalhe' -> 'motivos' ->> 'tipo',
  'PRINCIPAL_JA_EXISTE', 'duas principais só trocando');

-- Mudar: marcar a RJ como principal troca a SP para suplementar.
select lives_ok($$ select portal_oab_mudar(socia, rm, (rj.j ->> 'id')::uuid, (select versao from oab_inscricao where id = (rj.j ->> 'id')::uuid),
  '{"uf": "RJ", "numero": "245880", "letra": "S", "tipo": "PRINCIPAL", "trocarPrincipal": true}') from ids, rj $$, 'decisão 4: trocar a principal');
select is((select oab_frase(felipe, rm) from ids), 'OAB/RJ nº 245.880-S, OAB/SP nº 287.104 e OAB/MG nº 1', 'a nova principal vem primeiro');
select is((teste.erro($$ select portal_oab_mudar(socia, rm, (sp.j ->> 'id')::uuid, 1, '{"uf": "SP", "numero": "287104", "tipo": "SUPLEMENTAR"}') from ids, sp $$)) ->> 'codigo',
  'TC409', 'PT-19: a versão lida antiga é recusada');

-- Remover: marca a data e não apaga; a principal removida passa para a mais antiga.
select lives_ok($$ select portal_oab_remover(socia, rm, (rj.j ->> 'id')::uuid, (select versao from oab_inscricao where id = (rj.j ->> 'id')::uuid)) from ids, rj $$,
  'remover a inscrição');
select is((select removido_em is not null from oab_inscricao, rj where id = (rj.j ->> 'id')::uuid), true, 'PT-03: a removida fica guardada');
select is((select oab_frase(felipe, rm) from ids), 'OAB/SP nº 287.104 e OAB/MG nº 1', 'a SP volta a ser a principal');
select throws_ok($$ delete from oab_inscricao $$, 'TC023', null, 'inscrição não se apaga');

-- Quem pode.
select is((teste.erro($$ select portal_oab_incluir(felipe, rm, felipe, '{"uf": "PR", "numero": "5"}') from ids $$)) ->> 'codigo', 'TC401',
  'só a sócia dona muda as inscrições');
select is((teste.erro($$ select portal_equipe_pessoa(intrusa, outro, felipe) from ids $$)) ->> 'codigo', 'TC404', 'PT-01: pessoa de outro escritório não existe');

-- Sua conta: só a própria.
select is((select portal_conta(felipe, rm) ->> 'frase' from ids), 'OAB/SP nº 287.104 e OAB/MG nº 1', 'decisão 7: cada pessoa vê a própria OAB');
select is((select jsonb_array_length(portal_conta(larissa, rm) -> 'oab') from ids), 0, 'quem não tem OAB vê a lista vazia');

-- Convite com a OAB principal.
select portal_convidar(socia, rm, renata, 'Renata Lopes', array['JURIDICO'], '{"uf": "SP", "numero": "498310"}') from ids;
select is((select oab_frase(renata, rm) from ids), 'OAB/SP nº 498.310', 'decisão 6: o convite grava a OAB principal');

-- Quem sai leva as inscrições.
select portal_retirar(socia, rm, (select id from vinculos where pessoa_id = renata and escritorio_id = rm), 1, null) from ids;
select is((select oab_frase(renata, rm) from ids), null, 'convite cancelado: a OAB sai junto');

-- Histórico.
select is((select array_agg(distinct acao order by acao) from historico, ids where escritorio_id = rm and acao like 'equipe.oab_%'),
  array['equipe.oab_incluida', 'equipe.oab_mudada', 'equipe.oab_removida'], 'inclusão, mudança e remoção no histórico da equipe');

select * from finish();
rollback;
