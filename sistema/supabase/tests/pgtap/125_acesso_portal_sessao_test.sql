-- 0880 · acesso_portal_sessao: o mesmo que acesso_portal + escritorio_da_sessao, numa chamada só
-- (F3.136, PT-27). O acesso continua conferido a cada chamada (PT-21).
begin;
select plan(11);

create temp table ids as select
  teste.escritorio('Aurora Advocacia') as a,
  teste.escritorio('Bela Vista Advogados') as b,
  teste.pessoa('Sócia Aurora') as pa,
  teste.pessoa('Sócio Bela Vista') as pb,
  teste.pessoa('Só da equipe') as pconsole,
  teste.pessoa('Sem vínculo') as psem,
  gen_random_uuid() as sessao,
  gen_random_uuid() as outra;
select teste.vincular(pa, a), teste.vincular(pa, b), teste.vincular(pb, b) from ids;
grant select on ids to dominio;
select escolher_escritorio(pa, sessao, a) from ids;

-- O mesmo resultado das duas funções de antes, caso a caso.
create function pg_temp.antes(p_pessoa uuid, p_sessao uuid) returns jsonb language plpgsql as $$
declare v_acesso boolean := coalesce(acesso_portal(p_pessoa), false);
begin
  return jsonb_build_object('acesso', v_acesso,
    'escritorio', case when v_acesso and p_sessao is not null then escritorio_da_sessao(p_pessoa, p_sessao) end);
end $$;

select is((select acesso_portal_sessao(pa, sessao) from ids), (select jsonb_build_object('acesso', true, 'escritorio', a) from ids),
  'com acesso e escritório escolhido, devolve os dois');
select is((select acesso_portal_sessao(pa, outra) from ids), jsonb_build_object('acesso', true, 'escritorio', null),
  'sessão sem escritório escolhido: acesso sim, escritório nulo');
select is((select acesso_portal_sessao(pb, sessao) from ids), jsonb_build_object('acesso', true, 'escritorio', null),
  'a sessão de uma pessoa não serve para outra');
select is((select acesso_portal_sessao(psem, sessao) from ids), jsonb_build_object('acesso', false, 'escritorio', null),
  'pessoa sem vínculo não tem acesso');
select is((select acesso_portal_sessao(gen_random_uuid(), sessao) from ids), jsonb_build_object('acesso', false, 'escritorio', null),
  'pessoa que não existe não tem acesso, sem erro');
select is((select acesso_portal_sessao(pa, null) from ids), jsonb_build_object('acesso', true, 'escritorio', null),
  'sem sessão: só o acesso');
select is((select array_agg(acesso_portal_sessao(p, s) order by p, s) from ids, unnest(array[pa, pb, psem]) p, unnest(array[sessao, outra]) s),
          (select array_agg(pg_temp.antes(p, s) order by p, s) from ids, unnest(array[pa, pb, psem]) p, unnest(array[sessao, outra]) s),
  'igual a acesso_portal + escritorio_da_sessao em todas as combinações');

-- Vínculo revogado para na hora (PT-21).
select escolher_escritorio(pb, outra, b) from ids;
update vinculos set revogado_em = app_now(), revogado_por = (select pa from ids) where pessoa_id = (select pb from ids);
select is((select acesso_portal_sessao(pb, outra) from ids), jsonb_build_object('acesso', false, 'escritorio', null),
  'vínculo revogado: sem acesso e sem escritório');

-- Contrato fechado: o escritório some, o acesso pelos outros vínculos continua.
update escritorios set contrato_fim_em = hoje_brasilia() - 60 where id = (select a from ids);
select is((select acesso_portal_sessao(pa, sessao) from ids), pg_temp.antes((select pa from ids), (select sessao from ids)),
  'contrato fechado: igual às funções de antes');
select is((select acesso_portal_sessao(pa, sessao) -> 'escritorio' from ids), 'null'::jsonb,
  'contrato fechado: a sessão perde o escritório');


select ok(exists (select 1 from pg_proc where proname = 'acesso_portal_sessao' and prosecdef and proowner = 'dominio'::regrole),
  'acesso_portal_sessao é security definer do papel dominio');

select * from finish();
rollback;
