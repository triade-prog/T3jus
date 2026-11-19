-- Fim do contrato do escritório e saída da pessoa (F0.14, PT-11), com as decisões da Carol de
-- 19/11/2026: 30 dias só de consulta, guarda de 5 anos, reabrir com motivo, só a
-- Administração, e a entrada apagada aos 90 dias sem acesso.
begin;
select plan(50);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as bruno,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Convidado Pendente') as pendente;
create temp table c as select console_criar_escritorio(adm, 'Cedro & Lima', 'Recife', 'PE') as cedro from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select impl, cedro, 'IMPLANTACAO', adm from ids, c;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select socia, cedro, 'SOCIO', adm from ids, c;
select portal_convidar(socia, cedro, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, cedro, paula, 'Paula Nunes', array['COMERCIAL']),
       portal_convidar(socia, cedro, pendente, 'Convidado Pendente', array['JURIDICO']) from ids, c;
update pessoas set senha_criada_em = now() where id in (select socia from ids union select diego from ids union select paula from ids);

create function pg_temp.dados(p_fim date, p_motivo text, p_nome text) returns jsonb language sql as $$
  select jsonb_build_object('fimEm', p_fim, 'motivo', p_motivo, 'nomeConfirmado', p_nome) $$;
create function pg_temp.versao() returns integer language sql as $$
  select versao from clientes where escritorio_id = (select cedro from c) $$;
create function pg_temp.cadastrar() returns jsonb language sql as $$
  select teste.erro($q$ select portal_cliente_cadastrar(diego, cedro, '{"tipo":"PF","nome":"Helena Prado","origem":"SITE","contatos":[{"nome":"Helena","telefone":"+5511988887777","principal":true}]}') from ids, c $q$) $$;

-- ---------------------------------------------------------------------------------------
-- Quem encerra e o que confere.
select is((teste.erro($$ select console_encerrar_contrato(impl, cedro, 1, pg_temp.dados(hoje_brasilia(), 'Distrato', 'Cedro & Lima')) from ids, c $$)) ->> 'codigo',
  'TC401', 'decisão 4: a Implantação não encerra');
select is((teste.erro($$ select console_encerrar_contrato(adm, cedro, 1, pg_temp.dados(hoje_brasilia() - 1, ' ', 'Cedro e Lima')) from ids, c $$))
  -> 'detalhe' -> 'campos', '["fimEm", "motivo", "nomeConfirmado"]'::jsonb, 'data no passado, motivo vazio e nome que não confere');
select is((teste.erro($$ select console_encerrar_contrato(adm, cedro, 99, pg_temp.dados(hoje_brasilia(), 'Distrato', 'cedro & lima')) from ids, c $$)) ->> 'codigo',
  'TC409', 'PT-19: a versão lida confere');

-- Fim marcado para o futuro: até lá, tudo normal.
select is((select console_encerrar_contrato(adm, cedro, pg_temp.versao(), pg_temp.dados(hoje_brasilia() + 10, 'Distrato assinado', 'cedro & lima'))
           -> 'encerramento' ->> 'situacao' from ids, c), 'MARCADO', 'fim no futuro fica marcado');
select is((select estado from clientes where escritorio_id = (select cedro from c)), 'IMPLANTACAO', 'o estágio não muda antes do dia');
select is(pg_temp.cadastrar(), null, 'antes do fim, o Portal funciona normalmente');
select is((select console_ficha(adm, cedro) -> 'encerramento' ->> 'consultaAte' from ids, c), (hoje_brasilia() + 39)::text,
  'decisão 1: 30 dias de consulta a partir do fim');
select is((select console_ficha(adm, cedro) -> 'encerramento' ->> 'guardaAte' from ids, c), ((hoje_brasilia() + 10) + interval '5 years')::date::text,
  'decisão 2: a guarda vai até 5 anos depois do fim');
select is((teste.erro($$ select console_encerrar_contrato(adm, cedro, pg_temp.versao(), pg_temp.dados(hoje_brasilia(), 'De novo', 'Cedro & Lima')) from ids, c $$))
  -> 'detalhe' ->> 'motivo', 'JA_ENCERRADO', 'um fim por vez');
select is((select console_reabrir_contrato(adm, cedro, pg_temp.versao(), 'Cliente desistiu do distrato') ->> 'estagio' from ids, c),
  'IMPLANTACAO', 'desmarcar o fim que não chegou');
select is((select console_ficha(adm, cedro) -> 'encerramento' from ids, c), 'null'::jsonb, 'desmarcado, a ficha não tem fim');
select is((select count(*)::int from historico where acao in ('contrato.encerramento_marcado', 'contrato.encerramento_desmarcado') and interno),
  2, 'CO-04: marcar e desmarcar ficam no histórico interno');

-- ---------------------------------------------------------------------------------------
-- Encerrado hoje: Portal só de consulta (decisão 1).
select is((select console_encerrar_contrato(adm, cedro, pg_temp.versao(), pg_temp.dados(hoje_brasilia(), 'Distrato assinado', 'Cedro & Lima'))
           -> 'encerramento' ->> 'situacao' from ids, c), 'CONSULTA', 'fim hoje: só consulta');
select is((select estado from clientes where escritorio_id = (select cedro from c)), 'ENCERRADO', 'o estágio vira Encerrado');
select is((select h.dados ->> 'motivo' from historico h where h.acao = 'estado.mudou' and h.dados ->> 'para' = 'ENCERRADO'),
  'Distrato assinado', 'o motivo fica no histórico');
select ok((select revogado_em is not null from vinculos where pessoa_id = (select pendente from ids)), 'o convite pendente é cancelado');
select ok((select revogado_em is null from vinculos where pessoa_id = (select diego from ids)), 'quem já entrou continua, só para consulta');
select is(pg_temp.cadastrar() -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO', 'nos 30 dias, nada se escreve no Portal');
select is((teste.erro($$ select portal_mudar_areas(socia, cedro, (select id from vinculos where pessoa_id = diego), array['JURIDICO']) from ids, c $$))
  -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO', 'nem na equipe');
select is((teste.erro($$ select portal_exigir_escrita(socia, cedro) from ids, c $$)) -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO',
  'a API confere antes de criar a conta de um convite');
select lives_ok($$ select portal_clientes(diego, cedro) from ids, c $$, 'mas a consulta continua');
select ok((select exportar_escritorio(socia, cedro) is not null from ids, c), 'PT-15: e a exportação também');
select is((select portal_escritorio(socia, cedro) -> 'encerramento' ->> 'acessoFechaEm' from ids, c), (hoje_brasilia() + 30)::text,
  'o Portal recebe o dia em que o acesso fecha');
select ok((select portal_escritorio(socia, cedro) -> 'encerramento' -> 'motivo' is null from ids, c), 'sem o motivo, que é da equipe T3jus');
select is((teste.erro($$ select console_editar_ficha(adm, cedro, (select versao from escritorios where id = cedro), 'Cedro', 'Recife', 'PE', null, null, '[]'::jsonb) from ids, c $$))
  -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO', 'a ficha do Console fica só para consulta');
select is((teste.erro($$ select console_mudar_estagio(adm, cedro, pg_temp.versao(), 'ATIVO', 'Voltar') from ids, c $$))
  -> 'detalhe' ->> 'motivo', 'CONTRATO_ENCERRADO', 'só o Reabrir tira do Encerrado');
select is((select encerramento ->> 'situacao' from ids, console_carteira(adm) where nome = 'Cedro & Lima'), 'CONSULTA',
  'a carteira traz as datas, para o filtro Encerrados');

-- ---------------------------------------------------------------------------------------
-- Fim dos 30 dias: o acesso fecha, mesmo antes da rotina.
select ajustar_relogio(interval '30 days');
select is((teste.erro($$ select portal_clientes(diego, cedro) from ids, c $$)) ->> 'codigo', 'TC401', 'o Portal fecha');
select is((select count(*)::int from ids, meus_escritorios(diego)), 0, 'o escritório sai da lista de quem entra');
select ok((select encerramento ->> 'situacao' = 'FECHADO' from ids, escritorios_para_escolher(diego)), 'a escolha mostra o escritório fechado, com as datas');
select is((teste.erro($$ select escolher_escritorio(diego, gen_random_uuid(), cedro) from ids, c $$)) ->> 'codigo', 'TC401', 'e não deixa entrar');
select ok(acesso_portal((select diego from ids)), 'a pessoa ainda entra, para ver que o acesso terminou');
select ok((select console_ficha(adm, cedro) is not null from ids, c), 'o Console continua lendo');
select is((select (aplicar_prazos() -> 'contratos' ->> 'acessos_fechados')::int), 1, 'a rotina registra o acesso fechado');
select ok((select acesso_fechado_em is not null from escritorios where id = (select cedro from c)), 'com a data');
select is((select saida_da_pessoa(diego) ->> 'entradaApagaEm' from ids), (hoje_brasilia() + 90)::text,
  'decisão 5: a data em que a entrada some aparece antes');

-- Reabrir dentro da guarda devolve o acesso (decisão 3).
select is((teste.erro($$ select console_reabrir_contrato(adm, cedro, pg_temp.versao(), ' ') from ids, c $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'reabrir pede o motivo');
select is((select console_reabrir_contrato(adm, cedro, pg_temp.versao(), 'Voltou a contratar') ->> 'estagio' from ids, c), 'IMPLANTACAO',
  'reaberto, volta ao estágio de antes');
select lives_ok($$ select portal_clientes(diego, cedro) from ids, c $$, 'e o Portal abre de novo');
select is((select saida_da_pessoa(diego) from ids), null, 'quem voltou a ter acesso não tem data de saída');

-- ---------------------------------------------------------------------------------------
-- Saída da pessoa: 90 dias sem acesso apagam a entrada (decisão 5).
select portal_retirar(socia, cedro, v.id, v.versao, socia) from ids, c, vinculos v where v.pessoa_id = paula;
select is((select jsonb_agg(x ->> 'nome') from ids, c, jsonb_array_elements(portal_equipe_retiradas(socia, cedro)) x), '["Paula Nunes", "Convidado Pendente"]'::jsonb,
  'a Equipe mostra quem foi retirado, do mais recente ao mais antigo');
select console_desativar_membro(adm, bruno) from ids;
select ok((select saida ->> 'entradaApagaEm' is not null from ids, console_equipe(adm) where nome = 'Bruno Saraiva'), 'a Equipe T3jus mostra a data também');
select ajustar_relogio(interval '30 days' + interval '91 days');
create temp table r as select aplicar_prazos() as j;
select is((select (j -> 'contratos' ->> 'entradas_apagadas')::int from r), 3, 'Paula, o convite cancelado e Bruno perdem a entrada');
select is((select count(*)::int from auth.users where id in (select paula from ids union select bruno from ids)), 0, 'a entrada sai do Auth');
select ok((select entrada_apagada_em is not null and nome = 'Paula Nunes' from pessoas where id = (select paula from ids)),
  'o nome fica, como autor no histórico');
select ok((select count(*) = 1 from auth.users where id = (select diego from ids)), 'quem tem acesso não perde nada');
select is((teste.erro($$ select console_cadastrar_membro(adm, bruno, 'Bruno Saraiva', array['SUPORTE']) from ids $$)) -> 'detalhe' ->> 'motivo',
  'ENTRADA_APAGADA', 'reativar quem perdeu a entrada é um convite novo');
select ok((select saida ->> 'entradaApagadaEm' is not null from ids, console_equipe(adm) where nome = 'Bruno Saraiva'),
  'a Equipe T3jus mostra que a entrada foi apagada');

-- Depois da guarda de 5 anos, não reabre mais.
select console_encerrar_contrato(adm, cedro, pg_temp.versao(), pg_temp.dados(hoje_brasilia(), 'Fim', 'Cedro & Lima')) from ids, c;
select ajustar_relogio(interval '123 days' + interval '5 years');
select ok((select (console_ficha(adm, cedro) -> 'encerramento' ->> 'guardaAte')::date <= hoje_brasilia() from ids, c), 'a guarda terminou');
select is((teste.erro($$ select console_reabrir_contrato(adm, cedro, pg_temp.versao(), 'Voltou') from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'PRAZO_TERMINOU', 'decisão 3: reabrir só enquanto os dados existem');

select * from finish();
rollback;
