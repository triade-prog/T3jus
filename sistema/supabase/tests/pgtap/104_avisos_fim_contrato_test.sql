-- Avisos por e-mail do fim do contrato (F0.16, PT-11): a sócia dona recebe um no dia do fim,
-- com o prazo para baixar os dados, e outro 3 dias antes de o acesso fechar.
begin;
select plan(21);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Joana Pequi') as socia2;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Pequi Advocacia', 'Teresina', 'PI') as pequi from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por) select socia, cedro, 'SOCIO', adm from ids, c;
update pessoas set senha_criada_em = now() where id = (select socia from ids);

create function pg_temp.encerrar(p_esc uuid, p_fim date, p_nome text) returns jsonb language sql as $$
  select console_encerrar_contrato((select adm from ids), p_esc, (select versao from clientes where escritorio_id = p_esc),
    jsonb_build_object('fimEm', p_fim, 'motivo', 'Distrato assinado', 'nomeConfirmado', p_nome)) $$;
create function pg_temp.fila() returns text language sql as $$
  select coalesce(string_agg(tipo || ':' || case when enviado_em is not null then 'enviado' when descartado_em is not null then 'descartado' else 'fila' end,
                             ',' order by criado_em, tipo), '')
    from contrato_avisos where escritorio_id = (select cedro from c) $$;

-- Com o fim no futuro, nada sai.
select pg_temp.encerrar(cedro, hoje_brasilia() + 10, 'Cedro & Lima') from c;
select is((select contrato_avisos_do_escritorio(cedro) from c), 0, 'PT-11: fim marcado no futuro não manda aviso');
select is((contrato_avisos_rotina() ->> 'enfileirados')::int, 0, 'nem a rotina das 8h');

-- No dia do fim: o aviso vai para a fila, uma vez só.
select ajustar_relogio(interval '10 days');
select is((contrato_avisos_rotina() ->> 'enfileirados')::int, 1, 'PT-11: no dia do fim, a rotina põe o aviso na fila');
select is((contrato_avisos_rotina() ->> 'enfileirados')::int, 0, 'o mesmo aviso não entra duas vezes');
select is(pg_temp.fila(), 'FIM:fila', 'é o aviso do fim');

create temp table p1 as select rotina_contrato_avisos_pendentes(20) as j;
select is((select jsonb_array_length(j) from p1), 1, 'a rota recebe um aviso');
select is((select j -> 0 ->> 'paraPessoaId' from p1), (select socia::text from ids), 'para a sócia dona');
select is((select j -> 0 ->> 'socio' from p1), 'Renata Cedro', 'com o nome dela');
select is((select j -> 0 ->> 'escritorio' from p1), 'Cedro & Lima', 'e o do escritório');
select is((select j -> 0 ->> 'consultaAte' from p1), (hoje_brasilia() + 29)::text, 'com o último dia para baixar os dados');
select is((select (j -> 0 ->> 'diasParaFechar')::int from p1), 30, 'e quantos dias faltam para o acesso fechar');

-- Falhou: continua na fila. Saiu: vai ao histórico, só para a equipe.
select rotina_contrato_aviso_registrar((select (j -> 0 ->> 'id')::uuid from p1), false, 'Resend respondeu 500');
select is((select tentativas || '|' || ultimo_erro from contrato_avisos), '1|Resend respondeu 500', 'a falha conta a tentativa e guarda o erro');
select rotina_contrato_aviso_registrar((select (j -> 0 ->> 'id')::uuid from p1), true);
select is(pg_temp.fila(), 'FIM:enviado', 'o aviso saiu');
select is((select jsonb_array_length(rotina_contrato_avisos_pendentes(20))), 0, 'e não sai de novo');
select is((select dados ->> 'tipo' || '|' || (dados ->> 'pessoa_id') || '|' || (dados ->> 'consulta_ate') || '|' || interno::text || '|' || autor_tipo::text
             from historico where acao = 'contrato.aviso_enviado'),
  'FIM|' || (select socia from ids) || '|' || (hoje_brasilia() + 29) || '|true|SISTEMA', 'PT-11: o histórico guarda o envio, "Só equipe", pelo sistema');

-- 3 dias antes de o acesso fechar: o segundo aviso.
select ajustar_relogio(interval '10 days' + interval '26 days');
select is((contrato_avisos_rotina() ->> 'enfileirados')::int, 0, 'quatro dias antes, ainda não');
select ajustar_relogio(interval '10 days' + interval '27 days');
select is((contrato_avisos_rotina() ->> 'enfileirados')::int, 1, 'PT-11: 3 dias antes de o acesso fechar, sai o segundo aviso');
select is((select (rotina_contrato_avisos_pendentes(20) -> 0 ->> 'diasParaFechar')::int), 3, 'faltam 3 dias');

-- Reaberto antes de sair: o aviso sai da fila sem ir.
select console_reabrir_contrato(adm, cedro, (select versao from clientes where escritorio_id = cedro), 'Voltou a assinar') from ids, c;
select is((select jsonb_array_length(rotina_contrato_avisos_pendentes(20))), 0, 'contrato reaberto: o aviso não vai');
select is(pg_temp.fila(), 'FIM:enviado,FECHA_EM_3:descartado', 'e fica marcado como descartado');

-- Sem sócia dona, não há para quem mandar.
select ajustar_relogio(interval '0 days');
select pg_temp.encerrar(pequi, hoje_brasilia(), 'Pequi Advocacia') from c;
select contrato_avisos_do_escritorio(pequi) from c;
select is((select jsonb_array_length(rotina_contrato_avisos_pendentes(20))), 0, 'sem sócio dono, o aviso sai da fila');
-- (Joana não tem vínculo: o escritório Pequi não tem sócio.)

select * from finish();
rollback;
