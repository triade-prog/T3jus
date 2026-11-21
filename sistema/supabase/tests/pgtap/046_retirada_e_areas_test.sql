-- Quem sai da equipe e quem não tem a área (F1.10, EX-10, PA-01): a petição que esperava a
-- revisão de quem saiu passa adiante; toda tabela com responsável tem quem a passe; e toda rota
-- de área do Portal recusa quem não tem a área liberada.
begin;
select plan(10);

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.pessoa('Beatriz Nogueira') as beatriz,
  teste.pessoa('Sem Área') as semarea,
  teste.pessoa('Rita Souza') as rita,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, felipe, 'Felipe Matos', array['JURIDICO'], '{"uf": "SP", "numero": "287104"}'),
       portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO'], '{"uf": "SP", "numero": "401226"}'),
       portal_convidar(socia, rm, beatriz, 'Beatriz Nogueira', array['JURIDICO']),
       portal_convidar(socia, rm, semarea, 'Sem Área', array[]::text[]),
       portal_convidar(socia, rm, rita, 'Rita Souza', array['COMERCIAL']) from ids;
select portal_oab_incluir(socia, rm, socia, '{"uf": "SP", "numero": "214538", "tipo": "PRINCIPAL"}') from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Joana Pereira', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Joana Pereira', 'telefone', '+5511985521034', 'principal', true)))) ->> 'id')::uuid joana
  from ids;
select portal_juridico_etapas(socia, rm) from ids;
create temp table cs as select
  (portal_juridico_caso_criar(socia, rm, jsonb_build_object('nome', 'Pereira x Mercado Bom Preço', 'area', 'TRABALHISTA',
     'etapaId', (select id from etapas where escritorio_id = ids.rm and ordem = 3), 'responsavelId', ids.felipe,
     'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli.joana, 'papel', 'AUTOR')))) ->> 'id')::uuid pereira
  from ids, cli;

create function pg_temp.adv(p uuid, p_esc uuid) returns jsonb
language sql as $$
  select jsonb_build_array(jsonb_build_object('pessoaId', p, 'inscricoes', (select jsonb_agg(id) from oab_inscricao where pessoa_id = p and escritorio_id = p_esc and removido_em is null)))
$$;
create function pg_temp.gerar(p_quem uuid) returns uuid
language sql as $$
  select (portal_peticao_gravar(p_quem, ids.rm, cs.pereira,
            jsonb_build_object('modelo', '{"padrao": "JUNTADA"}'::jsonb, 'partes', jsonb_build_array(cli.joana), 'advogados', pg_temp.adv(ids.felipe, ids.rm),
                               'enderecamento', 'Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo', 'cidadeData', 'São Paulo, 21 de novembro de 2026'),
            jsonb_build_object('peticaoId', gen_random_uuid(), 'versaoId', gen_random_uuid(), 'documentoId', gen_random_uuid(),
                               'modeloNome', 'Juntada de documentos', 'arquivo', 'juntada.docx', 'tamanho', 4200, 'marcados', '[]'::jsonb,
                               'previa', '[[{"t": "fixo", "texto": "Excelentíssimo(a)"}]]'::jsonb)) ->> 'id')::uuid
    from ids, cs, cli
$$;

-- Duas petições esperando o Felipe (o responsável do caso): uma da Beatriz, outra da Larissa.
create temp table pt as select pg_temp.gerar(beatriz) da_beatriz, pg_temp.gerar(larissa) da_larissa from ids;
select portal_peticao_enviar(beatriz, rm, da_beatriz, null), portal_peticao_enviar(larissa, rm, da_larissa, null) from ids, pt;
select is((select array_agg(distinct revisor_id) from peticoes, pt where id in (da_beatriz, da_larissa)), (select array[felipe] from ids),
  'as duas esperam a revisão do Felipe');

update pessoas set senha_criada_em = now() where id = (select felipe from ids);
select portal_retirar(socia, rm, v.id, v.versao, larissa) from ids, vinculos v where v.pessoa_id = ids.felipe and v.escritorio_id = ids.rm;
select is((select revisor_id from peticoes, pt where id = da_beatriz), (select larissa from ids),
  'EX-10: a revisão passa para quem ficou com o trabalho, se ela pode revisar');
select is((select revisor_id from peticoes, pt where id = da_larissa), (select socia from ids),
  'quem gerou não revisa a própria petição: a revisão vai para a sócia dona');
select is((select count(*)::int from peticao_eventos e, pt where e.peticao_id in (da_beatriz, da_larissa) and e.tipo = 'PASSADA'), 2,
  'a passagem fica nos eventos da petição');
select is((select count(*)::int from avisos_sino a, ids, pt where a.tipo = 'PETICAO_REVISAR' and a.pessoa_id = larissa and a.origem_id = da_beatriz), 1,
  'quem recebeu a revisão é avisado no sino (a sócia dona, que fez a retirada, não se avisa)');
select is((select situacao from peticoes, pt where id = da_beatriz), 'REVISAO', 'a petição continua esperando a revisão');

-- Toda tabela com responsável tem quem passe o trabalho de quem saiu. Ficam de fora o
-- atendimento (só inserção; o próximo contato passa pelos retornos) e a falha de automação
-- (sempre com o sócio dono, que não sai).
select is((
  select coalesce(array_agg(distinct c.relname::text order by c.relname::text), '{}')
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not a.attisdropped
     and a.attname in ('responsavel_id', 'prox_responsavel', 'prox_responsavel_id', 'revisor_id')
     and c.relname not in ('atendimentos', 'automacao_execucoes')
     and not exists (select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid
                      where g.tgrelid = 'historico'::regclass and g.tgname like '%passar_de_quem_saiu%'
                        and p.prosrc ~ ('\m' || c.relname || '\M'))),
  '{}'::text[], 'EX-10: toda tabela com responsável tem quem passe o trabalho de quem sai');

-- PA-01: toda função do Portal, chamada por quem não tem área nenhuma, recusa como área não
-- liberada. Ficam de fora as partes comuns (Início, Clientes, Agenda, Conversas, avisos,
-- automações, que conferem a área de cada uma, e o carnê, que recebe a área), as do sócio dono
-- (Escritório, Equipe, WhatsApp, IA, Recebimento) e a própria conta.
create temp table chamadas (funcao text, erro jsonb);
do $$
declare
  f record; v_args text; e jsonb;
  v_pessoa uuid := (select semarea from ids); v_esc uuid := (select rm from ids);
begin
  for f in select p.proname, p.pronargs, p.proargtypes::regtype[] t, p.proargnames n
             from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname like 'portal\_%'
              and p.proname !~ '^portal_(agenda|compromisso|cliente|clientes|importacao|importacoes|conversa|conversas|automacao|automacoes|aviso|avisos|carne|conta|escritorio|exigir_escrita|ia|inicio_resumo|inicio_audiencias|pessoas_escritorio|recebimento|whatsapp|equipe|historico_equipe|convidar|mudar_areas|oab|reenviar_convite|retirar)(_|$)' loop
    v_args := '';
    for i in 1..f.pronargs loop
      v_args := v_args || case when i > 1 then ', ' else '' end
        || case f.n[i] when 'p_pessoa' then quote_literal(v_pessoa) || '::uuid' when 'p_escritorio' then quote_literal(v_esc) || '::uuid'
                       else 'null::' || f.t[i - 1]::text end;
    end loop;
    e := teste.erro(format('select %I(%s)', f.proname, v_args));
    insert into chamadas values (f.proname, e);
  end loop;
end $$;
select ok((select count(*) > 60 from chamadas), 'a conferência passou pelas rotas de área');
select is((select coalesce(array_agg(funcao order by funcao), '{}') from chamadas where coalesce(erro -> 'detalhe' ->> 'motivo', '') <> 'AREA_NAO_LIBERADA'),
  '{}'::text[], 'PA-01: toda rota de área recusa quem não tem a área liberada');
select is((teste.erro($$ select portal_carne_opcoes(rita, rm, null, 'FINANCEIRO') from ids $$)) -> 'detalhe' ->> 'motivo', 'AREA_NAO_LIBERADA',
  'o carnê confere a área que recebe');

select * from finish();
rollback;
