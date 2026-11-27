-- O caso novo de importação desfeita e o cliente excluído a pedido do titular (F3.185; PT-11, VA-05),
-- pelo plano revisado (project-files t3jus/f3-180/plano.md, seção 5, e revisao.md, M2, M3, m1, m6 e
-- m7) e pela decisão da Carol D1/D2 ("Soltar e renomear o caso").
--
-- A causa. A importação dos processos cria o caso novo com importacao_id e liga o cliente a ele SEM
-- importacao_id (0920: só a ligação a caso que já existia leva a importação). O desfazer dos
-- processos põe o caso novo em Encerrados com encerrado_por = 'IMPORTACAO_DESFEITA' (1118; o caso
-- que já veio encerrado do sistema antigo vira o mesmo, 0920) e apaga só as ligações com
-- importacao_id: a ligação ao caso novo fica. Daí o plano do desfazer dos clientes (0600, com a troca
-- da 1010) conta o cliente como mexido (qualquer ligação), o cliente não é inativado, e a exclusão o
-- recusa com TEM_CONTRATO_OU_PROCESSO (cliente_vinculos_lgpd, 1118: qualquer ligação conta).
--
-- 1. caso_desfeito_da_importacao(cc): a ligação é ao caso novo de uma importação desfeita
--    (ENCERRADO, IMPORTACAO_DESFEITA, do mesmo escritório) e foi feita pela própria importação
--    (sem importacao_id, sem contrato e criada até importado_em). caso_desfeito_solto(cc): isso e
--    ninguém trabalhou nele com o cliente depois (not imp_ligacao_mexida, 1118, pelo catálogo). A
--    ligação feita à mão depois, ou com qualquer sinal de trabalho, continua prendendo. As
--    conferências baratas vêm antes, em plpgsql (a ordem é a do código, e não a que o planejador
--    escolheria num "and"): imp_ligacao_mexida, que percorre o catálogo, só roda para a ligação a
--    caso desfeito.
-- 2. cliente_vinculos_lgpd recriada (corpo da 1118, a versão em vigor; 1130 a 1136 não a mexem): a
--    ligação solta não conta. A regra (d) (pedido de documento, levantamento, requisição e petição
--    com o nome dele) não muda: continua prendendo, também no caso desfeito.
-- 3. O plano do desfazer dos clientes (imp_desfazer_plano_clientes; a imp_desfazer_plano da 0600,
--    renomeada na 0810, com a troca da 1010): troca por conteúdo, no molde da t1010_trocar, do
--    "exists (… caso_clientes …)" do cli por "… and not caso_desfeito_solto(cc))". O desfazer
--    (imp_desfazer_clientes) usa os mexidos do plano: passa a inativar o cliente, sem mudar o corpo.
-- 4. Na exclusão (D2): caso_desfeito_excluido_limpar trava as ligações do cliente ao caso desfeito
--    (caso_desfeito_da_importacao) em ordem de id, apaga-as e, em cada caso que ficou sem nenhum
--    cliente, troca o nome por "Caso de importação desfeita" (caso_desfeito_nome_excluido, 27
--    letras; cabe no check de 3 a 120 da 0240), em ordem de id. Cada caso é travado com FOR NO KEY
--    UPDATE (o mesmo do UPDATE) antes de conferir que ficou sem cliente, numa instrução própria:
--    assim a exclusão espera quem adiciona cliente ao caso pela tela (FOR UPDATE no caso) e vê a
--    ligação que ele confirmou, em vez de trocar o nome de um caso que acabou de ganhar cliente. O
--    FOR NO KEY UPDATE não espera o FOR KEY SHARE da importação que junta outra pessoa ao caso. O
--    DELETE usa só a parte estrutural, sem imp_ligacao_mexida: o BEFORE (cliente_excluido_nao_muda)
--    já recusou quem tinha ligação mexida; o que aparece depois dele, na janela de milissegundos até
--    este gatilho (uma tarefa ou um prazo sem cliente no caso encerrado), não segura a ligação
--    (revisão, m7; a linha com o cliente espera a exclusão pela chave estrangeira e não aparece). O
--    gatilho importacao_casos_apagar_do_excluido roda, pelo nome, logo depois de
--    importacao_apagar_do_excluido (1118), sem depender dele. Se algo mudou, grava
--    cliente.casos_desfeitos_soltos ({ligacoes, casos}, sem dado pessoal), como o
--    cliente.historico_anterior_guardado da 1116. O DELETE não dispara caso_pronto_anotar_saiu (só
--    com contrato, 0990; revisão, m1).
-- 5. levantamento_nasce (BEFORE INSERT em levantamentos; revisão, M3), no molde de contrato_nasce
--    (1130): FOR SHARE no cliente e estado <> 'EXCLUIDO'. levantamento_erros (0280) só pede que a
--    ligação exista, sem trava e sem exigir caso aberto; com a ligação ao caso desfeito apagada pela
--    exclusão, um levantamento registrado no caso desfeito enquanto a exclusão roda nasceria para o
--    excluído. As outras da classe "precisa de caso ou contrato" seguem fechadas: o pedido de
--    documento exige caso aberto (0270), a requisição e o êxito pedem contrato, que prende.
-- 6. Inventário: o destino no pedido do titular de casos e de caso_clientes (até 200 letras, check
--    da 0070). Situação APROVADO, com o ok da Carol.
--
-- A ordem das travas. A exclusão: a trava das automações → o cliente (FOR UPDATE) → as ligações (FOR
-- UPDATE) → os casos (FOR NO KEY UPDATE). Adicionar cliente ao caso (1131): o cliente (FOR SHARE) → o
-- caso (FOR UPDATE): espera a exclusão no cliente, sem ciclo. Cadastrar caso (1131): os clientes
-- antes do caso novo. A importação dos processos: o cliente (FOR SHARE, caso_cliente_nasce) e o caso
-- (FOR KEY SHARE, pela chave). Os editores do caso (0240) seguram só o caso e não pedem o cliente:
-- a exclusão espera por eles, sem ciclo. O registro do levantamento: o cliente (FOR SHARE, aqui)
-- depois das parcelas e dos êxitos do contrato, que um cliente que se pode excluir não tem.
--
-- Os limites (README, "A importação"): o nome do caso desfeito que ainda tem outro cliente ("Paulo
-- e Rita x INSS") fica; a parte contrária e a qualificação dela (0440, 0921) são de outra pessoa e
-- ficam; o número do processo fica (dado público); editar o nome do caso desfeito não conta como
-- trabalho (historico não tem caso_id), e juridico.caso_editado guarda o nome de antes e o de depois
-- para sempre (revisão, m6); a importação que junta outra pessoa ao caso enquanto a exclusão roda
-- não impede a troca do nome (ainda não confirmou).
--
-- Sem migration "sem volta": quem tinha a ligação nunca pôde ser excluído. A contagem só de leitura
-- (project-files t3jus/f3-180/contagem-antes-1134.sql) confere que não há excluído com ligação a
-- caso desfeito e conta quem passa a ser solto.
-- Testes: pgTAP 167 (167_caso_desfeito_cliente_excluido_test.sql) e o bloco 6 do 162; concorrência
-- tests/concorrencia/exclusao-caso-simultaneo.sh (k6 a k9).
-- Ordem da publicação (painel, P27): conferir com list_migrations que a 1118 e a 1131 estão no ar;
-- rodar a contagem; aplicar a 1134. Nada a publicar nas apis nem no Portal (a ficha passa a oferecer
-- "Excluir" em vez de "Arquivar" para quem foi solto, sozinha: vinculosLgpd vem null). Se for preciso
-- voltar: drop trigger importacao_casos_apagar_do_excluido on clientes_escritorio; drop trigger
-- levantamento_nasce on levantamentos; recriar cliente_vinculos_lgpd da 1118 e trocar de volta o
-- trecho de imp_desfazer_plano_clientes.
--
-- Funções recriadas e de onde partem (a versão em vigor de cada uma):
--   cliente_vinculos_lgpd ......... 1118
--   imp_desfazer_plano_clientes ... troca de um trecho (o corpo em vigor é o da 0600 com a troca da 1010)
-- Novas: caso_desfeito_da_importacao, caso_desfeito_solto, caso_desfeito_nome_excluido,
-- caso_desfeito_excluido_limpar, importacao_casos_apagar_do_excluido (gatilho), levantamento_nasce
-- (gatilho). Nenhuma é security definer.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1010_trocar).
create function t1134_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. A ligação ao caso novo de importação desfeita.
create function caso_desfeito_nome_excluido() returns text
language sql immutable
as $$ select 'Caso de importação desfeita'::text $$;

-- A parte estrutural: o caso é o novo de uma importação desfeita e a ligação é da própria importação.
create function caso_desfeito_da_importacao(cc caso_clientes) returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  s casos;
  v_importado timestamptz;
begin
  if cc.importacao_id is not null or cc.contrato_id is not null then
    return false;
  end if;
  select * into s from casos where id = cc.caso_id and escritorio_id = cc.escritorio_id;
  if s.id is null or s.importacao_id is null or s.situacao <> 'ENCERRADO' or s.encerrado_por is distinct from 'IMPORTACAO_DESFEITA' then
    return false;
  end if;
  select importado_em into v_importado from importacoes where id = s.importacao_id and escritorio_id = cc.escritorio_id;
  return v_importado is not null and cc.criado_em <= v_importado;
end $$;

-- E ninguém trabalhou nele com o cliente depois da importação.
create function caso_desfeito_solto(cc caso_clientes) returns boolean
language plpgsql
stable
set search_path = public
as $$
declare i importacoes;
begin
  if not caso_desfeito_da_importacao(cc) then
    return false;
  end if;
  select im.* into i from importacoes im join casos s on s.importacao_id = im.id where s.id = cc.caso_id;
  return not imp_ligacao_mexida(cc, i);
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. O contrato e o processo que impedem a exclusão (corpo da 1118): a ligação solta não conta.
create or replace function cliente_vinculos_lgpd(p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.contratos is null and x.processos is null then null
              else jsonb_build_object('contratos', coalesce(x.contratos, '[]'::jsonb), 'processos', coalesce(x.processos, '[]'::jsonb)) end
    from (select (select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero) order by c.criado_em)
                    from contratos c where c.cliente_id = p_cliente) contratos,
                 (select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'numeroCnj', s.numero_cnj) order by s.criado_em, s.id)
                    from casos s
                   where s.escritorio_id = e.esc
                     -- F3.185: a ligação ao caso novo de importação desfeita, sem trabalho, não prende.
                     and (exists (select 1 from caso_clientes cc where cc.caso_id = s.id and cc.cliente_id = p_cliente and not caso_desfeito_solto(cc))
                          or s.id in (select d.caso_id from documento_pedidos d where d.escritorio_id = e.esc and d.cliente_id = p_cliente)
                          or s.id in (select l.caso_id from levantamentos l where l.escritorio_id = e.esc and l.cliente_id = p_cliente)
                          or s.id in (select q.caso_id from requisicoes_a_caminho q where q.escritorio_id = e.esc and q.cliente_id = p_cliente)
                          or s.id in (select p.caso_id from peticao_versoes pv join peticoes p on p.id = pv.peticao_id
                                       where pv.escritorio_id = e.esc and pv.escolhas -> 'partes' ? p_cliente::text))) processos
            from (select (select k.escritorio_id from clientes_escritorio k where k.id = p_cliente) esc) e) x
$$;

-- ---------------------------------------------------------------------------------------
-- 3. O plano do desfazer dos clientes: a ligação solta não faz o cliente mexido.
select t1134_trocar('imp_desfazer_plano_clientes(importacoes)',
  $q$or exists (select 1 from caso_clientes cc where cc.cliente_id = c.id)$q$,
  $q$or exists (select 1 from caso_clientes cc where cc.cliente_id = c.id and not caso_desfeito_solto(cc))$q$);

drop function t1134_trocar(regprocedure, text, text, integer);

-- ---------------------------------------------------------------------------------------
-- 4. Na exclusão: a ligação sai, e o caso que fica sem cliente perde o nome. Devolve {ligacoes, casos}.
create function caso_desfeito_excluido_limpar(p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ligs uuid[];
  v_casos uuid[];
  v_caso uuid;
  v_n integer := 0;
begin
  select coalesce(array_agg(x.id order by x.id), '{}'), coalesce(array_agg(distinct x.caso_id), '{}') into v_ligs, v_casos
    from (select cc.id, cc.caso_id from caso_clientes cc
           where cc.escritorio_id = p_escritorio and cc.cliente_id = p_cliente and caso_desfeito_da_importacao(cc)
           order by cc.id for update) x;
  if cardinality(v_ligs) = 0 then
    return jsonb_build_object('ligacoes', 0, 'casos', 0);
  end if;
  delete from caso_clientes where id = any (v_ligs);
  foreach v_caso in array (select array_agg(c order by c) from unnest(v_casos) c) loop
    -- O caso primeiro (FOR NO KEY UPDATE, o mesmo do UPDATE): espera quem adiciona cliente pela tela
    -- (que segura o caso com FOR UPDATE) e, numa instrução nova, vê a ligação que ele confirmou. Não
    -- espera o FOR KEY SHARE da importação que junta outra pessoa ao caso (limite no README).
    perform 1 from casos where id = v_caso and escritorio_id = p_escritorio for no key update;
    update casos s set nome = caso_desfeito_nome_excluido()
     where s.id = v_caso and s.escritorio_id = p_escritorio and s.nome <> caso_desfeito_nome_excluido()
       and not exists (select 1 from caso_clientes cc where cc.caso_id = s.id);
    if found then v_n := v_n + 1; end if;
  end loop;
  return jsonb_build_object('ligacoes', cardinality(v_ligs), 'casos', v_n);
end $$;

create function importacao_casos_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
declare v jsonb;
begin
  v := caso_desfeito_excluido_limpar(new.escritorio_id, new.id);
  if (v ->> 'ligacoes')::integer > 0 then
    perform historico_do_cliente(new.escritorio_id, new.id, 'cliente.casos_desfeitos_soltos', v);
  end if;
  return null;
end $$;
-- Pelo nome, roda logo depois de importacao_apagar_do_excluido (1118) e antes de
-- sino_apagar_do_excluido e z_cliente_excluido_arquivos, sem depender de nenhum.
create trigger importacao_casos_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function importacao_casos_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 5. O levantamento novo de cliente excluído (revisão, M3), no molde de contrato_nasce (1130).
create function levantamento_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from clientes_escritorio where id = new.cliente_id and escritorio_id = new.escritorio_id and estado <> 'EXCLUIDO' for share;
  if not found then
    perform recusar_motivo('O cliente foi excluído a pedido do titular', 'CLIENTE_EXCLUIDO');
  end if;
  return new;
end $$;
create trigger levantamento_nasce before insert on levantamentos
  for each row execute function levantamento_nasce();

-- ---------------------------------------------------------------------------------------
-- 6. Inventário (PT-11): o destino no pedido do titular (textos da 0240).
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, o caso de importação desfeita que fica sem cliente passa a se chamar "Caso de importação desfeita"'
 where tabela = 'casos';
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, sai a ligação ao caso de importação desfeita em que ninguém trabalhou'
 where tabela = 'caso_clientes';

call fechar_acesso();
