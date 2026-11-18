-- T2 (PT-01) e F0.3: usuário do escritório A não lista, lê, busca nem altera nada do B.
-- O escritório vem do contexto que a sessão validou; o RLS separa mesmo se a função esquecer o filtro.
begin;
select plan(30);

call teste.criar_exemplos();
select teste.permitir('SOCIO', 'exemplos.ver', 'exemplos.criar', 'exemplos.alterar');

create temp table ids as select
  teste.escritorio('Aurora Advocacia') as a,
  teste.escritorio('Bela Vista Advogados') as b,
  teste.pessoa('Sócia Aurora') as pa,
  teste.pessoa('Sócio Bela Vista') as pb,
  teste.pessoa('Advogado em dois escritórios') as pmulti,
  teste.pessoa('Sem vínculo') as psem,
  gen_random_uuid() as sessao;
select teste.vincular(pa, a), teste.vincular(pb, b), teste.vincular(pmulti, a), teste.vincular(pmulti, b) from ids;

create temp table ex as select
  exemplo_criar(pa, a, 'Prazo da contestação') as ea,
  exemplo_criar(pb, b, 'Audiência do Bela Vista') as eb
from ids;
grant select on ids, ex to dominio;

select results_eq($$ select exemplo_listar(pa, a) from ids $$, array['Prazo da contestação'], 'lista só o do próprio escritório');
select throws_ok($$ select exemplo_listar(pa, b) from ids $$, 'TC401', null, 'não lista o escritório B');
select throws_ok($$ select exemplo_ler(pa, a, eb) from ids, ex $$, 'TC404', null, 'não lê registro do B nem pelo id');
select is((select count(*)::int from ids, exemplo_buscar(pa, a, 'Portão')), 0, 'busca não encontra nada do B');
select throws_ok($$ select exemplo_alterar(pa, a, eb, 1, 'invadido') from ids, ex $$, 'TC404', null, 'não altera registro do B');
select results_eq($$ select exemplo_listar(pb, b) from ids $$, array['Audiência do Bela Vista'], 'registro do B continua intacto');
select throws_ok($$ select exemplo_listar(psem, a) from ids $$, 'TC401', null, 'pessoa sem vínculo não entra');
select throws_ok($$ select exemplo_listar(pa, gen_random_uuid()) from ids $$, 'TC401', null,
  'escritório que não existe responde igual a sem permissão');
select throws_ok($$ select exemplo_listar(gen_random_uuid(), a) from ids $$, 'TC401', null, 'pessoa que não existe não entra');

-- Uma pessoa em dois escritórios (PT-22): cada entrada vê só o escritório escolhido.
select results_eq($$ select exemplo_listar(pmulti, a) from ids $$, array['Prazo da contestação'], 'advogado que atende mais de um escritório no A vê só o A');
select results_eq($$ select exemplo_listar(pmulti, b) from ids $$, array['Audiência do Bela Vista'], 'advogado que atende mais de um escritório no B vê só o B');
select results_eq($$ select nome from ids, meus_escritorios(pmulti) $$, array['Aurora Advocacia', 'Bela Vista Advogados'], 'lista os dois escritórios dele');
select results_eq($$ select nome from ids, meus_escritorios(pa) $$, array['Aurora Advocacia'], 'a sócia do A só vê o A');
select ok((select acesso_portal(pa) from ids), 'quem tem vínculo entra no Portal');
select ok(not (select acesso_portal(psem) from ids), 'quem não tem vínculo não entra');

-- O RLS direto, como o papel dono das tabelas, sem nenhuma função no caminho.
select set_config('app.pessoa_id', (select pa::text from ids), true), set_config('app.escritorio_id', (select a::text from ids), true);
set local role dominio;
select is((select count(*)::int from exemplos where escritorio_id = (select b from ids)), 0, 'RLS: filtrar pelo B não traz nada');
select is((select count(*)::int from exemplos), 1, 'RLS: sem filtro, só o A');
select set_config('app.transicao_evento', 'CRIADO', true);
select throws_ok($$ insert into exemplos (escritorio_id, titulo) select b, 'x' from ids $$, '42501', null, 'RLS: não grava no B');
select is((select count(*)::int from historico where escritorio_id = (select b from ids)), 0, 'RLS: histórico do B não aparece');
select is((select array_agg(nome) from escritorios), array['Aurora Advocacia'], 'RLS: só o próprio escritório');
select is((select count(*)::int from pessoas where id = (select pb from ids)), 0, 'RLS: pessoas do B não aparecem');
select is((select count(*)::int from vinculos where escritorio_id = (select b from ids)), 0, 'RLS: vínculos do B não aparecem');
select set_config('app.escritorio_id', '', true), set_config('app.pessoa_id', '', true);
select is((select count(*)::int from exemplos), 0, 'RLS: sem contexto, nada aparece');
reset role;

-- O escritório vem da sessão (servidor), nunca do navegador.
select throws_ok($$ select escolher_escritorio(pa, sessao, b) from ids $$, 'TC401', null, 'não escolhe escritório sem vínculo');
select lives_ok($$ select escolher_escritorio(pa, sessao, a) from ids $$, 'escolhe o escritório em que tem vínculo');
select is((select escritorio_da_sessao(pa, sessao) from ids), (select a from ids), 'a sessão guarda o escritório escolhido');
select is((select escritorio_da_sessao(pb, sessao) from ids), null, 'a sessão de uma pessoa não serve para outra');
select throws_ok($$ select escolher_escritorio(pb, sessao, b) from ids $$, null, 'não toma a sessão de outra pessoa');

-- Negar por padrão (PT-02): ação sem permissão cadastrada não passa.
select throws_ok($$ select entrar_escritorio(pa, a, 'exemplos.apagar') from ids $$, 'TC401', null, 'ação não cadastrada é negada');

-- Só quatro funções gravam o contexto da transação (pessoa, equipe e escritório). A quarta,
-- abrir_escritorio_novo, é o cadastro de escritório no Console (passo 1).
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc ~ 'app\.(pessoa_id|escritorio_id|equipe)'
      and p.prosrc ~ 'set_config'),
  array['abrir_escritorio_novo', 'entrar_escritorio', 'limpar_contexto', 'tentar_definir_pessoa'],
  'só limpar_contexto, tentar_definir_pessoa, entrar_escritorio e abrir_escritorio_novo gravam o contexto');

select * from finish();
rollback;
