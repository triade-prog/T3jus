-- Os avisos do sino do cliente excluído a pedido do titular (F3.172; PT-11), pelo plano revisado
-- (project-files t3jus/f3-172/plano.md e revisao.md). Fecha o achado A2 do plano da F3.159 e o M5
-- da revisão dela: a exclusão (portal_cliente_excluir_dados, 0170) e as limpezas penduradas em
-- clientes_escritorio (0190, 0830, 0970, 1090, 1092) não mexiam em avisos_sino, e o guardião
-- (0390) só deixava mudar o lido. O nome do cliente e o serviço ficavam em avisos_sino.dados.
--
-- O aviso NÃO se apaga (o sino só acrescenta, PT-03): continua no sino e na exportação, com o texto
-- fixo no lugar do que era do cliente.
--
-- 1. Quem cita o cliente. O aviso aponta para um cliente que dá para excluir por três origens:
--    'clientes' (CLIENTE_FEZ_18, 0830), 'propostas' (PEDIDO_CONTRATO e CONTRATO_GERADO, 0532) e
--    'levantamentos' (REPASSE_PASSADO, REPASSE_ATRASADO e REPASSE_PROXIMA_ACAO, 0551 e 0553; o
--    levantamento aponta direto para o cliente, e o desfazer da importação pode soltar o cliente do
--    caso: revisão, M2). As outras origens dependem de contrato ou caso, que impedem a exclusão
--    (0460). Os avisos de 'conversas' ficam para a F3.157 (revisão, M4: D1 = não).
-- 2. A troca (aviso_sino_dados_do_excluido): 'cliente' vira "Cliente excluído" (o mesmo texto que a
--    0170 grava no nome), 'servico' vira servico_apagado_texto() (1090), e no CLIENTE_FEZ_18 saem
--    'em' (o dia dos 18 anos, que dá a data de nascimento) e 'quem' (quem assinava), que a 0830 já
--    apaga do cliente. Só troca a chave que existe. Fica como está: 'parte' do REPASSE_* (o nome de
--    uma destinação; F3.158) e 'condicoes[].sobre' da proposta (texto livre; item próprio, F3.179).
-- 3. Na exclusão (gatilho sino_apagar_do_excluido, entre financeiro_ e z_ pela ordem do nome, sem
--    depender de nenhum dos outros), os avisos do cliente ganham a troca. Sem evento novo:
--    cliente.dados_excluidos (0170) já registra a exclusão, como na 1090.
-- 4. O guardião aceita uma única mudança de dados, conferida pelos próprios dados, no molde de
--    atendimentos_so_anonimizar (0170): o cliente do aviso já está EXCLUIDO (sem volta), no mesmo
--    escritório do aviso, nada além de dados muda, e os dados novos são exatamente os que
--    aviso_sino_dados_do_excluido calcula a partir dos antigos. DELETE continua recusado.
-- 5. Aviso que nasce de cliente já excluído (gatilho avisos_sino_nasce, BEFORE INSERT: cobre
--    aviso_sino e as duas inserções diretas da 0551 e da 0553) nasce com a troca. Neutraliza em vez
--    de recusar, para não derrubar a ação de quem gerou o aviso (revisão, D6). Sem trava no cliente
--    (revisão, M4 e m1): na origem 'propostas' a trava faria deadlock com a exclusão, e nas outras
--    não protege nada.
-- 6. Os clientes já excluídos ficam para a 1111 (avisos_sino_preencher_excluidos).
--
-- Concorrência (plano, seção 4; tests/concorrencia/exclusao-sino-simultaneo.sh). Pedir o contrato
-- segura a linha da proposta e lê o cliente sem trava; a exclusão segura o cliente e depois as
-- propostas (comercial_apagar_do_excluido e o FOR SHARE daqui). Se o pedido vem primeiro, a
-- exclusão espera e o UPDATE dos avisos, numa instrução nova, vê o aviso confirmado; se a exclusão
-- vem primeiro, o pedido espera e lê o cliente já EXCLUIDO. Não há ciclo.
--
-- Ordem da publicação (README, "Arquivos do cliente excluído"; painel, P18): conferir que a 1090
-- está no ar; esta 1110; a contagem só de leitura (project-files t3jus/f3-172/contagem-antes-1111.sql);
-- com o ok da Carol, a 1111. Nada a publicar no Portal, na api-console nem no Console.
--
-- Função recriada e de onde parte:
--   avisos_sino_guardiao ................. 0390 (nunca recriada depois)
-- Novas: aviso_sino_cliente, aviso_sino_do_excluido, aviso_sino_dados_do_excluido,
-- avisos_sino_excluido_limpar, sino_apagar_do_excluido (gatilho), avisos_sino_nasce (gatilho),
-- avisos_sino_preencher_excluidos (a 1111 chama). Nenhuma é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Funções puras.

-- O cliente de quem o aviso fala, quando a origem aponta direto para um cliente (nulo nas outras
-- origens). Confere o escritório do aviso (revisão, m2): sob o fim_da_guarda o RLS não filtra.
create function aviso_sino_cliente(a avisos_sino) returns uuid
language sql
stable
set search_path = public
as $$
  select case a.origem_tabela
           when 'clientes' then (select k.id from clientes_escritorio k
                                  where k.id = a.origem_id and k.escritorio_id = a.escritorio_id)
           when 'propostas' then (select p.cliente_id from propostas p
                                   where p.id = a.origem_id and p.escritorio_id = a.escritorio_id)
           when 'levantamentos' then (select l.cliente_id from levantamentos l
                                       where l.id = a.origem_id and l.escritorio_id = a.escritorio_id)
         end
$$;

-- O aviso fala de cliente já EXCLUIDO, do mesmo escritório.
create function aviso_sino_do_excluido(a avisos_sino) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from clientes_escritorio k
                  where k.id = aviso_sino_cliente(a) and k.escritorio_id = a.escritorio_id and k.estado = 'EXCLUIDO')
$$;

-- Os dados do aviso depois da exclusão. Só troca a chave que existe. Idempotente: aplicada de novo,
-- devolve o mesmo (não depende de nada que mude com o tempo). Uma chave nova (por exemplo
-- 'condicoes', se a F3.179 decidir) é uma linha a mais.
create function aviso_sino_dados_do_excluido(a avisos_sino) returns jsonb
language sql
stable
set search_path = public
as $$
  select (a.dados - case when a.tipo = 'CLIENTE_FEZ_18' then array['em', 'quem'] else '{}'::text[] end)
         || case when a.dados ? 'cliente' then jsonb_build_object('cliente', 'Cliente excluído') else '{}'::jsonb end
         || case when a.dados ? 'servico' then jsonb_build_object('servico', servico_apagado_texto()) else '{}'::jsonb end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A troca nos avisos de um cliente (a exclusão e a 1111 chamam). Devolve quantos mudaram.
-- Só os avisos que ainda diferem da troca: um UPDATE sem mudança em aviso já lido daria TC023 pelo
-- corpo antigo do guardião (revisão, m3).
create function avisos_sino_excluido_limpar(p_escritorio uuid, p_cliente uuid) returns integer
language plpgsql
set search_path = public
as $$
declare v integer;
begin
  -- Espera quem está pedindo o contrato de uma proposta do cliente agora (plano, seção 4), mesmo
  -- quando comercial_apagar_do_excluido não muda nenhuma proposta.
  perform 1 from propostas where escritorio_id = p_escritorio and cliente_id = p_cliente order by id for share;
  -- Trava os avisos em ordem de id antes de mudar, para reduzir o deadlock com "marcar todos como
  -- lidos" (revisão, m4; o outro lado não ordena, então só reduz).
  perform 1 from avisos_sino a
   where a.escritorio_id = p_escritorio
     and ((a.origem_tabela = 'clientes' and a.origem_id = p_cliente)
       or (a.origem_tabela = 'propostas' and a.origem_id in
             (select id from propostas where escritorio_id = p_escritorio and cliente_id = p_cliente))
       or (a.origem_tabela = 'levantamentos' and a.origem_id in
             (select id from levantamentos where escritorio_id = p_escritorio and cliente_id = p_cliente)))
     and a.dados is distinct from aviso_sino_dados_do_excluido(a)
   order by a.id
   for update;
  -- Uma instrução própria: em READ COMMITTED, ela vê o aviso que acabou de ser confirmado por quem
  -- a trava acima esperou.
  update avisos_sino a set dados = aviso_sino_dados_do_excluido(a)
   where a.escritorio_id = p_escritorio
     and ((a.origem_tabela = 'clientes' and a.origem_id = p_cliente)
       or (a.origem_tabela = 'propostas' and a.origem_id in
             (select id from propostas where escritorio_id = p_escritorio and cliente_id = p_cliente))
       or (a.origem_tabela = 'levantamentos' and a.origem_id in
             (select id from levantamentos where escritorio_id = p_escritorio and cliente_id = p_cliente)))
     and a.dados is distinct from aviso_sino_dados_do_excluido(a);
  get diagnostics v = row_count;
  return v;
end $$;

-- Sem ele, a exclusão leria todos os avisos do escritório.
create index avisos_sino_origem on avisos_sino (origem_tabela, origem_id)
  where origem_tabela in ('clientes', 'propostas', 'levantamentos');

-- ---------------------------------------------------------------------------------------
-- 3. Na exclusão. Pelo nome, roda depois de financeiro_apagar_do_excluido e antes de
-- z_cliente_excluido_arquivos, sem depender de nenhum dos dois (lê o estado do cliente, não a
-- proposta já trocada).
create function sino_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform avisos_sino_excluido_limpar(new.escritorio_id, new.id);
  return null;
end $$;
create trigger sino_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function sino_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 4. O guardião: corpo da 0390 com um ramo antes. O ramo vem antes porque o corpo antigo recusa
-- tudo quando o aviso já foi lido, e o lido também guarda o nome.
-- Por que não abre brecha (revisão, m3): não há marca de sessão que alguém possa ligar; o valor novo
-- não é livre, é a função aplicada ao antigo; vale só com o cliente EXCLUIDO (sem volta) e do mesmo
-- escritório do aviso; nenhuma outra coluna muda na mesma instrução (lido_em, pessoa_id, tipo,
-- origem). Com a marca de lido feita ao mesmo tempo, o Postgres reavalia a troca sobre a versão nova
-- e o guardião compara com essa mesma versão: passa. Trocar de novo não muda nada e cai no corpo
-- antigo. fim_da_guarda não muda: terminar_guarda desliga os gatilhos do usuário (0540).
create or replace function avisos_sino_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'dados') = (to_jsonb(old) - 'dados')
       and new.dados is distinct from old.dados
       and aviso_sino_do_excluido(old)
       and new.dados = aviso_sino_dados_do_excluido(old) then
      return new;
    end if;
  end if;
  if tg_op = 'DELETE' or old.lido_em is not null
     or (to_jsonb(new) - 'lido_em') is distinct from (to_jsonb(old) - 'lido_em') then
    raise exception 'Aviso não se muda nem se apaga: só se marca como lido' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. O aviso que nasce de cliente já excluído nasce com a troca. Sem trava (revisão, M4 e m1).
create function avisos_sino_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origem_tabela in ('clientes', 'propostas', 'levantamentos') and aviso_sino_do_excluido(new) then
    new.dados := aviso_sino_dados_do_excluido(new);
  end if;
  return new;
end $$;
create trigger avisos_sino_nasce before insert on avisos_sino
  for each row execute function avisos_sino_nasce();

-- ---------------------------------------------------------------------------------------
-- 6. Os clientes excluídos antes desta migration (a 1111 chama). No molde da 1090: liga as marcas
-- fim_da_guarda (para ver as linhas sob o RLS forçado) e aplicando_prazos (a trava do contrato só
-- de consulta, contrato_aceita_escrita da 0690; revisão, M1) só durante a chamada e as devolve como
-- estavam. Devolve {escritório: {clientes, avisos}} só com quem teve aviso trocado, e {} quando não
-- há nada. Idempotente: chamada de novo, não acha nada.
create function avisos_sino_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v_n integer;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select k.escritorio_id, k.id from clientes_escritorio k
            where k.estado = 'EXCLUIDO' order by k.escritorio_id, k.id loop
    v_n := avisos_sino_excluido_limpar(r.escritorio_id, r.id);
    if v_n > 0 then
      v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0, "avisos": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'avisos', (v_um ->> 'avisos')::integer + v_n));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. Inventário (PT-11): muda só o destino no pedido do titular. Texto da 0390 com a troca; a
-- situação continua APROVADO, com o ok da Carol antes do merge.
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, o nome do cliente e o serviço no aviso viram texto fixo, e saem a data dos 18 anos e quem assinava'
 where tabela = 'avisos_sino';

call fechar_acesso();
