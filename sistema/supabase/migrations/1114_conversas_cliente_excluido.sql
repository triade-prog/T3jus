-- As conversas do WhatsApp do cliente excluído a pedido do titular (F3.157; PT-11, PA-05), pelo
-- plano revisado (project-files t3jus/f3-157/plano.md e revisao.md, seção 6) e pelas decisões da
-- Carol de 25/11/2026. Hoje a exclusão (portal_cliente_excluir_dados, 0170) só esconde o nome da
-- ficha: conversa_nome cai em nome_contato e no telefone, e a conversa segue em Conversas com o
-- número, o nome de quem escreveu e todas as mensagens.
--
-- A regra (Carol, C1): da conversa fica o esqueleto e sai todo texto. Ficam as datas, o autor de
-- cada mensagem, quem da equipe atendeu, os momentos (a IA passou, assumiu, devolveu, passou para),
-- o motivo como categoria, o responsável, o tipo do aviso, se foi entregue (com o id da Meta), o
-- tipo e o tamanho do anexo, e o resumo do atendimento (que a devolução já copia em atendimentos,
-- decisão de 18/11). Saem o número, o nome e o papel de quem escreveu, o motivo escrito, a nota
-- para a IA, o texto de cada mensagem (vira "Mensagem apagada a pedido do titular"; o momento
-- SISTEMA fica sem texto: a nota da devolução, o recado da passagem), o nome do anexo, os campos do
-- aviso e quem pediu para não receber avisos, a pergunta à IA e o texto dos avisos do sino da
-- conversa.
--
-- Quais conversas (Carol, C3, com os três casos do G2 da revisão):
--   * as ligadas ao cliente e as sem cliente cujo número estava nos contatos dele;
--   * a conversa FICA só se guarda registro de outro cliente não excluído (conversa_de_outro_cliente:
--     execução de automação, compromisso ou aviso com o contrato, o carnê, o pagamento, o pedido, o
--     levantamento ou o compromisso de outro cliente). Caso (a), a mãe de dois clientes com aviso da
--     Bia na conversa: fica e, se estava ligada ao excluído, religa pela regra de sempre
--     (conversa_cliente_do_numero), e os avisos do sino dela trocam o nome antigo pelo de agora.
--     Caso (b), o número só aparece na ficha do outro: apaga e não religa. Caso (c), a conversa sem
--     cliente de um contato do excluído: apaga se não há nada de outro cliente.
-- Na tela (Carol, C2, recomendação "some"): a conversa apagada sai das listas, das contagens e da
-- busca de Conversas, e abrir pelo id responde 404 como conversa que não existe. Nenhuma tela muda.
-- A janela de exclusão ainda não cita as conversas (C4: item pendente F3.190, com desenho).
--
-- O mesmo número escreve de novo: nasce conversa nova, sem ligação com a apagada (o número saiu
-- dela). Nada de hash do número para religar (reversível; continua dado pessoal). A situação do
-- envio que a Meta conta depois (whatsapp_envio_situacao) continua entrando: é metadado de entrega.
--
-- Concorrência (revisão, M2 e M3; tests/concorrencia/exclusao-conversa-simultanea.sh):
--   * a exclusão pega a trava do motor das automações do escritório ANTES do cliente
--     (cliente_para_exclusao) e o motor pega a mesma trava ao entrar em cada escritório
--     (automacoes_rodar): os dois não andam juntos no mesmo escritório, então não há ciclo entre o
--     cliente, as execuções e as conversas;
--   * depois, a ordem é cliente → execuções (por id) → conversas (por id) → mensagens, envios,
--     perguntas e avisos da conversa;
--   * mensagem nova trava a conversa FOR NO KEY UPDATE (conversa_mensagem_nasce), e a pergunta à
--     IA FOR SHARE (ia_pergunta_nasce): quem chega durante a exclusão espera e então vê a conversa
--     apagada (TC404);
--   * o webhook acha a conversa pelo número com FOR NO KEY UPDATE e, no ramo que cria a conversa,
--     trava o cliente ATIVO FOR SHARE: a mensagem que chega durante a exclusão vai para conversa
--     nova, sem cliente;
--   * o aviso do compromisso (compromisso_avisar) lê o cliente FOR SHARE, e o gatilho da remarcação
--     trava o cliente antes das execuções, na mesma ordem da exclusão.
--
-- Fica para outro item: a mídia recebida no Storage (F3.58; o check conversa_mensagens_anexo_guardado
-- recusa anexo com caminho fora do AVISO até ela entrar na fila arquivos_apagar) e o número
-- comparado sem o nono dígito (F3.58; telefone_chave é a identidade até lá).
--
-- Ordem da publicação (README, "Arquivos do cliente excluído"; painel, P20): conferir com
-- list_migrations que a 0970, a 1090, a 1092 e a 1110 estão no ar; esta 1114; a contagem só de
-- leitura (project-files t3jus/f3-157/contagem-antes-1115.sql); com o ok da Carol, a 1115. Nada a
-- publicar no Portal, na api-console nem no Console.
--
-- Funções recriadas e de onde partem (cada uma copiada inteira da versão mais nova, com language,
-- volatilidade, security definer e search_path, e só o que está dito trocado):
--   aviso_sino_do_excluido, aviso_sino_dados_do_excluido,
--   avisos_sino_guardiao, avisos_sino_nasce .......... 1110 (a origem conversas; a conversa que fica)
--   conversa_mensagens_guardiao ........................ 0300 (o ramo de apagar)
--   cliente_para_exclusao .............................. 0460 (a trava do motor antes do cliente)
--   automacoes_rodar ................................... 0340 (a trava do motor por escritório)
--   whatsapp_mensagem_recebida ......................... 0300 (FOR NO KEY UPDATE; o cliente ATIVO)
--   whatsapp_mensagem_do_app ........................... 0330 (idem)
--   compromisso_avisar ................................. 0670 (o cliente FOR SHARE)
--   compromisso_lembrete_mudou ......................... 0670 (o cliente antes das execuções; o excluído)
--   portal_conversas ................................... 0300 (sem a apagada)
--   portal_conversa .................................... 0470 (404)
--   conversa_para_mudar ................................ 0300 (404: assumir, devolver, passar, escrever)
--   conversas_passar_de_quem_saiu ...................... 0300 (em ordem de id)
--   ia_atendimento ..................................... 0330 (404)
--   conversa_ia_nao_soube .............................. 0310 (404)
--   portal_avisos_automaticos .......................... 0360 (sem mensagem nem execução da apagada)
--   compromisso_lembrete_ficha, portal_compromisso ..... 0670 (sem resposta nem link da apagada)
--   portal_conversa_contato, portal_cliente_cadastrar,
--   compromisso_conversa_pedida, compromisso_linha ..... 0870 (404 ou sem a apagada)
-- Novas: mensagem_apagada_texto, pergunta_apagada_texto, telefone_chave, anexo_apagado,
-- conversa_mensagem_cliente, conversa_de_outro_cliente, aviso_sino_dados_religada, conversa_guarda,
-- conversa_mensagem_nasce, ia_pergunta_nasce (gatilhos), conversas_apagar,
-- conversas_apagar_do_excluido (gatilho) e conversas_preencher_excluidos (a 1115 chama). Nenhuma
-- nova é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Os textos fixos e a chave do número.

create function mensagem_apagada_texto() returns text
language sql
immutable
as $$ select 'Mensagem apagada a pedido do titular'::text $$;

create function pergunta_apagada_texto() returns text
language sql
immutable
as $$ select 'Pergunta apagada a pedido do titular'::text $$;

-- A chave para comparar o número da conversa com o da ficha (revisão, M5). Hoje é a identidade
-- (os dois são E.164). A F3.58 põe aqui a regra do nono dígito do celular brasileiro, que a Meta
-- pode mandar sem o 9, e passa a usá-la também em conversa_cliente_do_numero.
create function telefone_chave(p_telefone text) returns text
language sql
immutable
as $$ select p_telefone $$;

-- O anexo da mensagem apagada: fica o tipo e o tamanho; o nome vira "Arquivo apagado" e o caminho
-- sai.
create function anexo_apagado(p_anexo jsonb) returns jsonb
language sql
immutable
as $$
  select case when p_anexo is not null then
    jsonb_strip_nulls(jsonb_build_object('nome', 'Arquivo apagado', 'tipo', p_anexo -> 'tipo', 'bytes', p_anexo -> 'bytes')) end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. As colunas e os checks.

alter table conversas add column apagada_em timestamptz;
alter table conversas alter column telefone drop not null;
alter table conversas add constraint conversas_apagada check (
  (telefone is null) = (apagada_em is not null)
  and (apagada_em is null or (contato_id is null and nome_contato is null and papel_contato is null
                              and motivo_texto is null and nota_ia is null and situacao = 'IA')));

alter table conversa_mensagens add column apagada_em timestamptz;
alter table conversa_mensagens add constraint conversa_mensagens_apagada check (
  apagada_em is null
  or (envio is distinct from 'NA_FILA'
      and (texto is null or texto = mensagem_apagada_texto())
      and (anexo is null or not anexo ? 'caminho')));

-- Check de alarme para a F3.58: só o AVISO (o carnê e o recibo, que só existem com contrato) guarda
-- o caminho do arquivo. Quando a F3.58 guardar a mídia recebida no Storage, este check recusa, e ela
-- terá de pôr esse caminho na fila arquivos_apagar na exclusão (novo formato no check
-- arquivos_apagar_caminho da 0970 e no caminhoValido da api-console) antes de afrouxar.
do $$
declare v integer;
begin
  select count(*) into v from conversa_mensagens where autor <> 'AVISO' and anexo ? 'caminho';
  if v > 0 then
    raise exception 'Há % mensagem(ns) fora do AVISO com o caminho do arquivo: confira antes da 1114', v;
  end if;
end $$;
alter table conversa_mensagens add constraint conversa_mensagens_anexo_guardado
  check (autor = 'AVISO' or anexo is null or not anexo ? 'caminho');

-- Os avisos do sino de uma conversa (a exclusão os procura pela conversa; o índice da 1110 só
-- cobre as origens clientes, propostas e levantamentos).
create index avisos_sino_origem_conversas on avisos_sino (origem_id) where origem_tabela = 'conversas';

-- ---------------------------------------------------------------------------------------
-- 3. As guardas.

-- A mensagem (corpo da 0300, nunca recriado) com o ramo de apagar, no molde de
-- cliente_documento_guarda (0970): apagar só na hora (apagada_em = app_now()), com a conversa já
-- apagada, com o texto, o anexo e os dados exatamente na forma calculada e todo o resto igual
-- (comparação por to_jsonb: coluna nova entra sozinha na conferência). A mensagem apagada continua
-- podendo mudar só a situação do envio (a Meta conta a entrega depois); DELETE continua recusado.
create or replace function conversa_mensagens_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_envio text[] := array['envio', 'envio_motivo', 'envio_em'];
  v_apagar text[] := array['apagada_em', 'texto', 'anexo', 'dados'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Mensagem não se apaga' using errcode = 'TC023';
  end if;
  if old.apagada_em is null and new.apagada_em is not null then
    if new.apagada_em = app_now()
       and (to_jsonb(new) - v_apagar) = (to_jsonb(old) - v_apagar)
       and new.texto is not distinct from (case when old.autor = 'SISTEMA' or old.texto is null then null else mensagem_apagada_texto() end)
       and new.anexo is not distinct from anexo_apagado(old.anexo)
       and new.dados is not distinct from (old.dados - array['campos', 'quemPediu'])
       and exists (select 1 from conversas c where c.id = old.conversa_id and c.apagada_em is not null) then
      return new;
    end if;
    raise exception 'A mensagem só se apaga com a conversa apagada a pedido do titular' using errcode = 'TC023';
  end if;
  if (to_jsonb(new) - v_envio) is distinct from (to_jsonb(old) - v_envio) then
    raise exception 'Da mensagem só muda a situação do envio' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- A conversa apagada (hoje a tabela não tinha guarda): não se apaga, e não voltam o número, o
-- cliente, o nome, o papel, o motivo escrito nem a nota; apagada_em não muda e a situação fica com a
-- IA. A troca de responsável continua livre (conversas_passar_de_quem_saiu mexe em toda conversa de
-- quem sai). Não confere quem apaga (revisão, m8): diferente da 0970, a conversa sem cliente não tem
-- estado a conferir, e só função do banco escreve (fechar_acesso).
create function conversa_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.apagada_em is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Conversa apagada não se apaga' using errcode = 'TC023';
  end if;
  if (new.telefone, new.cliente_id, new.contato_id, new.nome_contato, new.papel_contato, new.motivo_texto, new.nota_ia, new.apagada_em)
     is distinct from (old.telefone, old.cliente_id, old.contato_id, old.nome_contato, old.papel_contato, old.motivo_texto, old.nota_ia, old.apagada_em)
     or new.situacao <> 'IA' then
    raise exception 'A conversa apagada a pedido do titular não muda' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger conversa_guarda before update or delete on conversas
  for each row execute function conversa_guarda();

-- Mensagem nova só em conversa não apagada. FOR NO KEY UPDATE, e não FOR SHARE como na 0970: todo
-- quem insere mensagem depois faz update conversas set ultima_em, e a troca de FOR SHARE para a
-- trava de escrita daria impasse entre duas mensagens da mesma conversa. A exclusão muda o telefone
-- (chave única) e toma FOR UPDATE, que conflita com esta: quem chega durante a exclusão espera e
-- então não acha a conversa.
create function conversa_mensagem_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from conversas where id = new.conversa_id and apagada_em is null for no key update;
  if not found then
    raise exception 'Conversa não encontrada' using errcode = 'TC404';
  end if;
  if new.apagada_em is not null then
    raise exception 'Mensagem nasce sem apagada_em' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger conversa_mensagem_nasce before insert on conversa_mensagens
  for each row execute function conversa_mensagem_nasce();

-- A pergunta que a IA não soube (revisão, M1): conversa_ia_nao_soube não insere mensagem, então
-- precisa da própria guarda. FOR SHARE basta: ela não atualiza a conversa depois.
create function ia_pergunta_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from conversas where id = new.conversa_id and apagada_em is null for share;
  if not found then
    raise exception 'Conversa não encontrada' using errcode = 'TC404';
  end if;
  return new;
end $$;
create trigger ia_pergunta_nasce before insert on ia_perguntas_sem_resposta
  for each row execute function ia_pergunta_nasce();

-- ---------------------------------------------------------------------------------------
-- 4. O registro de outro cliente na conversa (Carol, C3; revisão, G2). Só o número nos contatos de
-- outro cliente não basta: a conversa fica só se guarda algo dele.

-- O cliente de quem um AVISO fala, pelo que a mensagem guarda em dados (a execução, o compromisso,
-- o carnê, o pagamento, o contrato, a parcela, o pedido de documento ou o levantamento).
create function conversa_mensagem_cliente(m conversa_mensagens) returns uuid
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select x.cliente_id from automacao_execucoes x
      where x.id = (m.dados ->> 'execucao')::uuid and x.escritorio_id = m.escritorio_id),
    (select k.cliente_id from compromissos k
      where k.id = (m.dados ->> 'compromisso')::uuid and k.escritorio_id = m.escritorio_id),
    (select t.cliente_id from carnes a join contratos t on t.id = a.contrato_id
      where a.id = (m.dados ->> 'carne')::uuid and a.escritorio_id = m.escritorio_id),
    (select t.cliente_id from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id join contratos t on t.id = r.contrato_id
      where p.id = (m.dados ->> 'pagamento')::uuid and p.escritorio_id = m.escritorio_id),
    (select t.cliente_id from contratos t
      where t.id = (m.dados ->> 'contrato')::uuid and t.escritorio_id = m.escritorio_id),
    (select t.cliente_id from recebimentos_previstos r join contratos t on t.id = r.contrato_id
      where r.id = (m.dados ->> 'recebimento')::uuid and r.escritorio_id = m.escritorio_id),
    (select d.cliente_id from documento_pedidos d
      where d.id = (m.dados ->> 'pedido')::uuid and d.escritorio_id = m.escritorio_id),
    (select l.cliente_id from levantamentos l
      where l.id = (m.dados ->> 'levantamento')::uuid and l.escritorio_id = m.escritorio_id))
$$;

-- A conversa guarda registro de outro cliente, não excluído, do mesmo escritório: execução de
-- automação, compromisso ou aviso dele. O escritório explícito separa os escritórios também sob o
-- fim_da_guarda da 1115 (revisão, m7).
create function conversa_de_outro_cliente(c conversas, p_cliente uuid) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from (select x.cliente_id from automacao_execucoes x where x.escritorio_id = c.escritorio_id and x.conversa_id = c.id
            union all
            select a.cliente_id from compromissos a where a.escritorio_id = c.escritorio_id and a.conversa_id = c.id
            union all
            select conversa_mensagem_cliente(m) from conversa_mensagens m
             where m.escritorio_id = c.escritorio_id and m.conversa_id = c.id and m.autor = 'AVISO') o
      join clientes_escritorio k on k.id = o.cliente_id and k.escritorio_id = c.escritorio_id
     where k.id is distinct from p_cliente and k.estado <> 'EXCLUIDO')
$$;

-- ---------------------------------------------------------------------------------------
-- 5. Os avisos do sino de origem conversas (revisão, G1): a F3.172 ficou com as origens clientes,
-- propostas e levantamentos; aqui entra a conversa, decidida pela conversa apagada e não pelo
-- cliente (a conversa sem cliente também tem aviso). Funções da 1110 recriadas com um ramo a mais.

-- O aviso fala de cliente já EXCLUIDO (1110) ou de conversa apagada a pedido do titular.
create or replace function aviso_sino_do_excluido(a avisos_sino) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from clientes_escritorio k
                  where k.id = aviso_sino_cliente(a) and k.escritorio_id = a.escritorio_id and k.estado = 'EXCLUIDO')
      or (a.origem_tabela = 'conversas'
          and exists (select 1 from conversas c
                       where c.id = a.origem_id and c.escritorio_id = a.escritorio_id and c.apagada_em is not null))
$$;

-- Os dados do aviso depois da exclusão. Na conversa: saem o contato, o trecho, o recado, o nome do
-- arquivo e o texto, e a conversa vira "Cliente excluído" (o mesmo texto da 0170 e da 1110; o
-- Sino.tsx mostra d.contato ?? d.conversa e cai no motivo ou em "Sem recado."). Ficam o motivo,
-- quem, quantos e o caso. Nas outras origens, o corpo da 1110. Idempotente.
create or replace function aviso_sino_dados_do_excluido(a avisos_sino) returns jsonb
language sql
stable
set search_path = public
as $$
  select case when a.origem_tabela = 'conversas' then
           (a.dados - array['contato', 'trecho', 'recado', 'arquivo', 'texto']) || jsonb_build_object('conversa', 'Cliente excluído')
         else
           (a.dados - case when a.tipo = 'CLIENTE_FEZ_18' then array['em', 'quem'] else '{}'::text[] end)
           || case when a.dados ? 'cliente' then jsonb_build_object('cliente', 'Cliente excluído') else '{}'::jsonb end
           || case when a.dados ? 'servico' then jsonb_build_object('servico', servico_apagado_texto()) else '{}'::jsonb end
         end
$$;

-- A conversa que fica (caso a da C3) e estava ligada ao excluído: o aviso guardava em 'conversa' o
-- nome do cadastro dele; depois de religar, vale o nome que a conversa mostra agora. Nulo quando não
-- se aplica (outra origem, sem a chave, conversa apagada ou de outro escritório).
create function aviso_sino_dados_religada(a avisos_sino) returns jsonb
language sql
stable
set search_path = public
as $$
  select a.dados || jsonb_build_object('conversa', conversa_nome(c))
    from conversas c
   where a.origem_tabela = 'conversas' and a.dados ? 'conversa'
     and c.id = a.origem_id and c.escritorio_id = a.escritorio_id and c.apagada_em is null
     and conversa_nome(c) is not null
$$;

-- O guardião da 1110 com mais um ramo: a troca do nome na conversa que fica, conferida pelos
-- próprios dados (o valor novo é calculado da conversa de agora, não escolhido; nenhuma outra coluna
-- nem chave muda). Quem pede a troca (conversas_apagar) só a pede nos avisos que guardam o nome
-- antigo do excluído. O resto do corpo é o da 1110.
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
    if (to_jsonb(new) - 'dados') = (to_jsonb(old) - 'dados')
       and new.dados is distinct from old.dados
       and new.dados = aviso_sino_dados_religada(old) then
      return new;
    end if;
  end if;
  if tg_op = 'DELETE' or old.lido_em is not null
     or (to_jsonb(new) - 'lido_em') is distinct from (to_jsonb(old) - 'lido_em') then
    raise exception 'Aviso não se muda nem se apaga: só se marca como lido' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- O nascer da 1110 cobre também a conversa apagada (defesa: mensagem nova na apagada já é
-- recusada, então nenhum aviso dela deveria nascer). Sem trava.
create or replace function avisos_sino_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origem_tabela in ('clientes', 'propostas', 'levantamentos', 'conversas') and aviso_sino_do_excluido(new) then
    new.dados := aviso_sino_dados_do_excluido(new);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O núcleo: as conversas de um cliente excluído. Roda na exclusão (no contexto do escritório) e
-- no preenchimento da 1115 (com as marcas). Idempotente: o que já foi apagado não é achado de novo.
-- Devolve só números.
create function conversas_apagar(p_escritorio uuid, p_cliente uuid, p_telefones text[], p_nome text default null)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_tels text[] := coalesce((select array_agg(distinct telefone_chave(t)) from unnest(p_telefones) t where t is not null), '{}');
  e automacao_execucoes;
  c conversas;
  v_msg uuid;
  v_cli uuid;
  v_contato jsonb;
  v_n integer;
  v_conversas integer := 0;
  v_mensagens integer := 0;
  v_fila integer := 0;
  v_ficaram integer := 0;
  v_automacoes integer := 0;
  v_rotulos integer := 0;
  v_perguntas integer := 0;
  v_avisos integer := 0;
begin
  -- A trava do motor das automações do escritório (revisão, M3). Na exclusão ela já veio antes do
  -- cliente (cliente_para_exclusao); aqui vale para a 1115.
  perform pg_advisory_xact_lock(hashtext('automacoes:' || p_escritorio::text));

  -- 1. As execuções em andamento param (a execução escreve na conversa); o rótulo de todas, que
  -- no gatilho CLIENTE é o nome e no COMPROMISSO o título, vira "Cliente excluído".
  for e in select * from automacao_execucoes
            where escritorio_id = p_escritorio and cliente_id = p_cliente and proximo_em is not null
            order by id for update loop
    e.caminho := automacao_caminho_mais(e, 'excluido', 'O cliente foi excluído a pedido do titular');
    perform automacao_encerrar(e, 'FICOU_DE_FORA', 'O cliente foi excluído a pedido do titular.');
    v_automacoes := v_automacoes + 1;
  end loop;
  update automacao_execucoes set rotulo = 'Cliente excluído'
   where escritorio_id = p_escritorio and cliente_id = p_cliente and rotulo is distinct from 'Cliente excluído';
  get diagnostics v_rotulos = row_count;

  -- 2. As conversas: as ligadas ao cliente e as sem cliente com um número dos contatos dele.
  for c in select * from conversas
            where escritorio_id = p_escritorio and apagada_em is null
              and (cliente_id = p_cliente or (cliente_id is null and telefone_chave(telefone) = any (v_tels)))
            order by id for update loop
    -- 3. Com registro de outro cliente, fica (C3, caso a). Ligada ao excluído, religa pela regra de
    -- sempre (o único cliente ATIVO com o número, ou nenhum) e o aviso do sino troca o nome antigo.
    if conversa_de_outro_cliente(c, p_cliente) then
      v_ficaram := v_ficaram + 1;
      if c.cliente_id = p_cliente then
        select x.cliente, x.contato into v_cli, v_contato from conversa_cliente_do_numero(p_escritorio, c.telefone) x;
        update conversas
           set cliente_id = v_cli, contato_id = v_contato ->> 'id', nome_contato = coalesce(v_contato ->> 'nome', nome_contato),
               papel_contato = nullif(btrim(coalesce(v_contato ->> 'papel', '')), '')
         where id = c.id;
        if p_nome is not null then
          perform 1 from avisos_sino a
           where a.escritorio_id = p_escritorio and a.origem_tabela = 'conversas' and a.origem_id = c.id
             and a.dados ->> 'conversa' = p_nome and a.dados is distinct from aviso_sino_dados_religada(a)
           order by a.id for update;
          update avisos_sino a set dados = aviso_sino_dados_religada(a)
           where a.escritorio_id = p_escritorio and a.origem_tabela = 'conversas' and a.origem_id = c.id
             and a.dados ->> 'conversa' = p_nome and a.dados is distinct from aviso_sino_dados_religada(a);
          get diagnostics v_n = row_count;
          v_avisos := v_avisos + v_n;
        end if;
      end if;
      continue;
    end if;

    -- 4. Apaga. A mensagem ainda na fila não sai mais (na ordem da rotina de envio, revisão m3).
    for v_msg in select id from conversa_mensagens where conversa_id = c.id and envio = 'NA_FILA' order by criada_em, id loop
      perform whatsapp_envio_falhou(v_msg, 'O cliente foi excluído a pedido do titular', 'CLIENTE_EXCLUIDO');
      v_fila := v_fila + 1;
    end loop;
    update conversas
       set telefone = null, contato_id = null, nome_contato = null, papel_contato = null, motivo_texto = null, nota_ia = null,
           situacao = 'IA', esperando_desde = null, assumida_por = null, assumida_em = null,
           resolvida_em = coalesce(resolvida_em, app_now()), apagada_em = app_now()
     where id = c.id;
    update conversa_mensagens
       set texto = case when autor = 'SISTEMA' or texto is null then null else mensagem_apagada_texto() end,
           anexo = anexo_apagado(anexo), dados = dados - array['campos', 'quemPediu'], apagada_em = app_now()
     where conversa_id = c.id and apagada_em is null;
    get diagnostics v_n = row_count;
    v_mensagens := v_mensagens + v_n;
    -- A pergunta ainda sem resposta é fila de trabalho e sai (como retornos_cliente na 0190); a que
    -- virou resposta fica com o texto fixo e o elo com a resposta do escritório.
    delete from ia_perguntas_sem_resposta where escritorio_id = p_escritorio and conversa_id = c.id and virou_resposta_id is null;
    get diagnostics v_n = row_count;
    v_perguntas := v_perguntas + v_n;
    update ia_perguntas_sem_resposta set texto = pergunta_apagada_texto()
     where escritorio_id = p_escritorio and conversa_id = c.id and virou_resposta_id is not null and texto <> pergunta_apagada_texto();
    get diagnostics v_n = row_count;
    v_perguntas := v_perguntas + v_n;
    -- Os avisos do sino da conversa, travados em ordem de id antes (como na 1110, revisão m4).
    perform 1 from avisos_sino a
     where a.escritorio_id = p_escritorio and a.origem_tabela = 'conversas' and a.origem_id = c.id
       and a.dados is distinct from aviso_sino_dados_do_excluido(a)
     order by a.id for update;
    update avisos_sino a set dados = aviso_sino_dados_do_excluido(a)
     where a.escritorio_id = p_escritorio and a.origem_tabela = 'conversas' and a.origem_id = c.id
       and a.dados is distinct from aviso_sino_dados_do_excluido(a);
    get diagnostics v_n = row_count;
    v_avisos := v_avisos + v_n;
    v_conversas := v_conversas + 1;
  end loop;

  return jsonb_build_object('conversas', v_conversas, 'mensagens', v_mensagens, 'naFila', v_fila, 'ficaram', v_ficaram,
                            'automacoes', v_automacoes, 'rotulos', v_rotulos, 'perguntas', v_perguntas, 'avisos', v_avisos);
end $$;

-- Algum número maior que zero.
create function conversas_houve(v jsonb) returns boolean
language sql
immutable
as $$ select exists (select 1 from jsonb_each_text(v) x where x.value ~ '^[0-9]+$' and x.value::integer > 0) $$;

-- ---------------------------------------------------------------------------------------
-- 7. Na exclusão. Pelo nome, roda entre comercial_ e financeiro_ e não depende da ordem (não mexe
-- em propostas, despesas nem na fila de arquivos; os avisos que troca são só os de conversa, que o
-- sino_ da 1110 não toca). Os números vêm de old.contatos, antes de virar '[]'; o nome antigo, de
-- old.nome. Sem evento por conversa: um evento cliente.conversas_apagadas, só com números, quando
-- houve algo (a exclusão já registra o pedido em cliente.dados_excluidos).
create function conversas_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
declare v jsonb;
begin
  v := conversas_apagar(new.escritorio_id, new.id,
         coalesce((select array_agg(k ->> 'telefone') from jsonb_array_elements(old.contatos) k where k ->> 'telefone' is not null), '{}'),
         old.nome);
  if conversas_houve(v) then
    perform historico_do_cliente(new.escritorio_id, new.id, 'cliente.conversas_apagadas', v);
  end if;
  return null;
end $$;
create trigger conversas_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function conversas_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 8. Os clientes excluídos antes desta migration (a 1115 chama). No molde da 1090: liga as marcas
-- fim_da_guarda (para ver as linhas sob o RLS forçado) e aplicando_prazos (a trava do contrato só de
-- consulta) só durante a chamada e as devolve como estavam. Os números já saíram da ficha, então só
-- as conversas ligadas ao cliente são achadas (a sem cliente fica: limite do README). O nome também
-- já saiu: a conversa que fica não troca o nome nos avisos. Devolve
-- {escritório: {clientes, conversas, mensagens, naFila, ficaram, automacoes, rotulos, perguntas,
-- avisos}} só com quem teve algo, e {} quando não há nada. Idempotente.
create function conversas_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v jsonb;
  v_um jsonb;
  v_esc jsonb := '{}'::jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select k.escritorio_id, k.id from clientes_escritorio k
            where k.estado = 'EXCLUIDO' order by k.escritorio_id, k.id loop
    v := conversas_apagar(r.escritorio_id, r.id, '{}', null);
    continue when not conversas_houve(v);
    perform historico_do_cliente(r.escritorio_id, r.id, 'cliente.conversas_apagadas', v || jsonb_build_object('antes', true));
    v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0}'::jsonb);
    v_esc := v_esc || jsonb_build_object(r.escritorio_id::text,
      (select jsonb_object_agg(x.key, coalesce((v_um ->> x.key)::integer, 0) + x.value::integer)
         from jsonb_each_text(v || '{"clientes": 1}'::jsonb) x));
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 9. Funções recriadas (cada uma inteira, a partir da versão mais nova citada no cabeçalho).

-- Mensagem que chega (0300): a busca pelo número com trava e o cliente ATIVO no ramo que cria a conversa.
create or replace function whatsapp_mensagem_recebida(p_escritorio uuid, p_telefone text, p_nome text, p_texto text, p_anexo jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_cli uuid;
  v_contato jsonb;
begin
  perform conversa_entrar_servico(p_escritorio);
  if coalesce(p_telefone, '') !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Telefone inválido', 'telefone'); end if;
  -- F3.157: FOR NO KEY UPDATE; se a exclusão confirma no meio, a releitura não acha o número
  -- (saiu da conversa apagada) e nasce conversa nova.
  select * into c from conversas where escritorio_id = p_escritorio and telefone = p_telefone for no key update;
  if c.id is null then
    select x.cliente, x.contato into v_cli, v_contato from conversa_cliente_do_numero(p_escritorio, p_telefone) x;
    -- F3.157 (revisão, M2): o cliente precisa estar ATIVO quando a conversa nasce. FOR SHARE
    -- espera a exclusão que está em andamento; depois dela, a conversa nasce sem cliente.
    if v_cli is not null then
      perform 1 from clientes_escritorio where id = v_cli and estado = 'ATIVO' for share;
      if not found then v_cli := null; v_contato := null; end if;
    end if;
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (p_escritorio, p_telefone, v_cli, v_contato ->> 'id',
            coalesce(v_contato ->> 'nome', nullif(left(btrim(coalesce(p_nome, '')), 120), '')), nullif(btrim(coalesce(v_contato ->> 'papel', '')), ''))
    returning * into c;
    perform registrar_historico('conversa.aberta', 'conversas', c.id::text, jsonb_build_object('cliente_id', v_cli));
  end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, anexo)
  values (p_escritorio, c.id, 'CLIENTE', nullif(p_texto, ''), p_anexo);
  update conversas set ultima_em = app_now(), resolvida_em = null where id = c.id;
  return c.id;
end $$;

-- Mensagem escrita no app do celular (0330): o mesmo da mensagem que chega.
create or replace function whatsapp_mensagem_do_app(p_escritorio uuid, p_telefone text, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_cli uuid;
  v_contato jsonb;
  v_resp uuid;
  v_razao text;
begin
  perform conversa_entrar_servico(p_escritorio);
  if coalesce(p_telefone, '') !~ '^\+[1-9][0-9]{7,14}$' then perform recusar_campos('Telefone inválido', 'telefone'); end if;
  -- F3.157: FOR NO KEY UPDATE; se a exclusão confirma no meio, a releitura não acha o número
  -- (saiu da conversa apagada) e nasce conversa nova.
  select * into c from conversas where escritorio_id = p_escritorio and telefone = p_telefone for no key update;
  if c.id is null then
    select x.cliente, x.contato into v_cli, v_contato from conversa_cliente_do_numero(p_escritorio, p_telefone) x;
    -- F3.157 (revisão, M2): o cliente precisa estar ATIVO quando a conversa nasce. FOR SHARE
    -- espera a exclusão que está em andamento; depois dela, a conversa nasce sem cliente.
    if v_cli is not null then
      perform 1 from clientes_escritorio where id = v_cli and estado = 'ATIVO' for share;
      if not found then v_cli := null; v_contato := null; end if;
    end if;
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (p_escritorio, p_telefone, v_cli, v_contato ->> 'id', v_contato ->> 'nome', nullif(btrim(coalesce(v_contato ->> 'papel', '')), ''))
    returning * into c;
    perform registrar_historico('conversa.aberta', 'conversas', c.id::text, jsonb_build_object('cliente_id', v_cli, 'pelo_app', true));
  end if;
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto)
  values (p_escritorio, c.id, 'APP', nullif(left(coalesce(p_texto, ''), 4096), ''));
  if c.situacao = 'EQUIPE' then
    update conversas set ultima_em = app_now() where id = c.id;
    return c.id;
  end if;
  if c.responsavel_id is not null and pessoa_do_escritorio(c.responsavel_id, p_escritorio) then
    v_resp := c.responsavel_id;
  else
    select x.pessoa into v_resp from conversa_quem_responde(p_escritorio, c.cliente_id) x;
  end if;
  update conversas set situacao = 'EQUIPE', assumida_por = v_resp, assumida_em = app_now(), esperando_desde = null,
                       responsavel_id = v_resp, responsavel_razao = 'APP_CELULAR', resolvida_em = null, ultima_em = app_now()
   where id = c.id;
  perform conversa_momento(c, 'APP_RESPONDEU', null, jsonb_build_object('para', v_resp));
  perform registrar_historico('conversa.app_respondeu', 'conversas', c.id::text, jsonb_build_object('para', v_resp));
  return c.id;
end $$;

-- Exclusão (0460): a trava do motor das automações do escritório vem antes do cliente (revisão, M3).
-- O motor cria execução e conversa com a chave do cliente (FOR KEY SHARE, que espera o FOR UPDATE
-- daqui) segurando a trava; pegando a trava antes, a exclusão nunca segura o cliente enquanto
-- espera o motor. Vale para pedir, recusar e arquivar também (esperam a volta do motor, segundos).
create or replace function cliente_para_exclusao(p_escritorio uuid, p_cliente uuid) returns clientes_escritorio
language plpgsql
set search_path = public
as $$
declare c clientes_escritorio;
begin
  perform pg_advisory_xact_lock(hashtext('automacoes:' || p_escritorio::text));
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'EXCLUIDO' then
    perform recusar_motivo('Os dados deste cliente já foram excluídos', 'CLIENTE_EXCLUIDO');
  end if;
  if c.estado = 'ARQUIVADO' then
    perform recusar_motivo('Este cliente já foi arquivado a pedido do titular', 'CLIENTE_ARQUIVADO');
  end if;
  return c;
end $$;

-- A volta do motor (0340): a trava do escritório ao entrar nele (revisão, M3). A volta segura
-- cada trava até o fim; a exclusão do escritório espera, e o motor nunca espera a exclusão.
create or replace function automacoes_rodar() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a automacoes; x record; e automacao_execucoes; v_fora text; v_novas integer := 0; v_andou integer := 0; v_fora_n integer := 0;
  v_esc uuid; v_lista uuid[];
begin
  -- Os escritórios com WhatsApp: a política rotina_automacoes_ler deixa a rotina ver só esta
  -- lista; depois cada escritório entra pelo contexto.
  perform limpar_contexto();
  perform set_config('t3jus.rodando_automacoes', 'on', true);
  select coalesce(array_agg(w.escritorio_id order by w.escritorio_id), '{}') into v_lista from whatsapp_escritorio w;
  perform set_config('t3jus.rodando_automacoes', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    perform pg_advisory_xact_lock(hashtext('automacoes:' || v_esc::text));
    continue when not whatsapp_ligado(v_esc);
    perform automacoes_garantir(v_esc);
    for a in select * from automacoes where escritorio_id = v_esc and situacao in ('LIGADA', 'EM_APROVACAO') and versao_ligada is not null loop
      for x in select * from automacao_candidatos(a) loop
        continue when x.cliente_id is null;
        v_fora := automacao_fica_de_fora(a, x.cliente_id, x.origem_id);
        insert into automacao_execucoes (escritorio_id, automacao_id, versao_numero, cliente_id, origem, origem_id, rotulo, caminho,
                                         situacao, motivo, passo_id, proximo_em, terminada_em)
        values (v_esc, a.id, a.versao_ligada, x.cliente_id, x.origem, x.origem_id, x.rotulo, '[]'::jsonb,
                case when v_fora is null then 'AGENDADA' else 'FICOU_DE_FORA' end, v_fora,
                case when v_fora is null then (automacao_fluxo_valendo(a) #>> '{passos,0,id}') end,
                case when v_fora is null then app_now() end,
                case when v_fora is not null then app_now() end)
        on conflict (automacao_id, origem_id) do nothing;
        if v_fora is null then v_novas := v_novas + 1; else v_fora_n := v_fora_n + 1; end if;
      end loop;
    end loop;
    for e in select ex.* from automacao_execucoes ex join automacoes au on au.id = ex.automacao_id
              where ex.escritorio_id = v_esc and ex.proximo_em is not null
                and (ex.proximo_em <= app_now() or automacao_pagou(ex, au)
                     or (automacao_passo(automacao_fluxo_da_execucao(ex), ex.passo_id) ->> 'tipo' = 'RAMOS' and automacao_respondeu(ex)))
              order by ex.proximo_em limit 500 loop
      perform automacao_andar(e.id);
      v_andou := v_andou + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return jsonb_build_object('entraram', v_novas, 'ficaramDeFora', v_fora_n, 'andaram', v_andou);
end $$;

-- O aviso do compromisso (0670): o cliente FOR SHARE (revisão, M2). O aviso que chega durante a
-- exclusão espera e vê o cliente EXCLUIDO.
create or replace function compromisso_avisar(c compromissos, p_chave text, p_nome text, p_dados jsonb default '{}') returns jsonb
language plpgsql
set search_path = public
as $$
declare k clientes_escritorio; ct jsonb; s clientes_sem_avisos; v_texto text; v_campos jsonb; v_conv uuid; v_id uuid;
begin
  if not whatsapp_ligado(c.escritorio_id) then return jsonb_build_object('motivo', 'O WhatsApp do escritório não estava ligado.'); end if;
  select * into k from clientes_escritorio where id = c.cliente_id and escritorio_id = c.escritorio_id for share;
  if k.id is null or k.estado = 'EXCLUIDO' then return jsonb_build_object('motivo', 'O cliente não está mais em Clientes.'); end if;
  select * into s from clientes_sem_avisos where cliente_id = k.id and retirado_em is null and tipo = 'TODOS';
  if s.id is not null then
    return jsonb_build_object('motivo', 'Pediu para não receber avisos em ' || to_char(automacao_local(s.pedido_em), 'DD/MM/YYYY') || '.');
  end if;
  ct := contato_principal(k.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then
    return jsonb_build_object('motivo', 'Sem WhatsApp no contato principal da ficha.');
  end if;
  perform whatsapp_avisos_garantir(c.escritorio_id, 'NAO_ENVIADO');
  select w.texto into v_texto from whatsapp_avisos w where w.escritorio_id = c.escritorio_id and w.chave = p_chave;
  v_campos := jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                                 'nome do escritório', (select x.nome from escritorios x where x.id = c.escritorio_id)) || compromisso_campos(c);
  v_texto := automacao_preencher(v_texto, v_campos);
  if v_texto is null then return jsonb_build_object('motivo', 'Falta um dado para completar o texto do aviso.'); end if;
  v_conv := carne_conversa(c.escritorio_id, k, ct);
  insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
  values (c.escritorio_id, v_conv, 'AVISO', v_texto, p_nome, 'NA_FILA',
          jsonb_build_object('compromisso', c.id, 'aviso', p_chave, 'campos', v_campos) || coalesce(p_dados, '{}'))
  returning id into v_id;
  update conversas set ultima_em = app_now() where id = v_conv;
  return jsonb_build_object('mensagem', v_id);
end $$;

-- A remarcação do compromisso (0670): o cliente antes das execuções, na ordem da exclusão (cliente,
-- depois execuções), para o compromisso_avisar não pedir o cliente segurando a execução; e o
-- lembrete do cliente excluído não recomeça.
create or replace function compromisso_lembrete_mudou() returns trigger
language plpgsql
set search_path = public
as $$
declare e automacao_execucoes; a automacoes; v_motivo text; v_aviso jsonb; v_primeiro text;
begin
  if (new.inicio, new.estado, new.lembrete_cliente, new.cliente_id, new.tipo)
     is not distinct from (old.inicio, old.estado, old.lembrete_cliente, old.cliente_id, old.tipo) then
    return new;
  end if;
  perform 1 from clientes_escritorio where id in (old.cliente_id, new.cliente_id) order by id for share;
  for e in select x.* from automacao_execucoes x join automacoes y on y.id = x.automacao_id
            where x.escritorio_id = new.escritorio_id and x.origem_id = new.id and y.gatilho = 'LEMBRETE_AUDIENCIA' for update of x loop
    select * into a from automacoes where id = e.automacao_id;
    v_motivo := case when new.estado <> 'MARCADO' then 'O compromisso foi cancelado.'
                     when not new.lembrete_cliente or new.cliente_id is null then 'O lembrete ao cliente foi desmarcado.'
                     when new.tipo = 'INTERNO' then 'O compromisso virou interno.'
                     when (select k.estado from clientes_escritorio k where k.id = new.cliente_id) = 'EXCLUIDO'
                       then 'O cliente foi excluído a pedido do titular.'
                     when new.inicio <= app_now() + interval '30 minutes' then 'O compromisso foi remarcado para agora ou para antes.'
                     when a.situacao = 'DESLIGADA' or a.versao_ligada is null then 'A automação está desligada.' end;
    if v_motivo is not null then
      if e.proximo_em is not null then
        e.caminho := automacao_caminho_mais(e, 'compromisso', v_motivo);
        perform automacao_encerrar(e, 'FICOU_DE_FORA', v_motivo);
      end if;
      continue;
    end if;
    if new.inicio is not distinct from old.inicio and new.cliente_id is not distinct from old.cliente_id
       and (old.lembrete_cliente or e.proximo_em is not null) then
      continue;
    end if;
    -- Recomeça para a nova data. Se um lembrete da data antiga já saiu e o de 1 dia antes da
    -- nova data ainda demora, o cliente recebe agora o lembrete com a nova data.
    v_aviso := null;
    if e.ultima_msg_em is not null and new.inicio is distinct from old.inicio and new.cliente_id is not distinct from old.cliente_id
       and compromisso_lembrete_em(new.inicio) > app_now() then
      v_aviso := compromisso_avisar(new, 'LEMBRETE_AUDIENCIA', 'Lembrete · nova data', jsonb_build_object('execucao', e.id));
    end if;
    v_primeiro := automacao_fluxo_valendo(a) #>> '{passos,0,id}';
    update automacao_execucoes
       set versao_numero = a.versao_ligada, cliente_id = new.cliente_id, situacao = 'AGENDADA', motivo = null, responsavel_id = null,
           conversa_id = case when new.cliente_id is distinct from old.cliente_id then null else conversa_id end,
           terminada_em = null, ramo = null, ultima_msg_em = null, passo_id = v_primeiro,
           proximo_em = greatest(app_now(), compromisso_lembrete_em(new.inicio)),
           rotulo = left(new.titulo || ' · ' || to_char(automacao_local(new.inicio), 'DD/MM HH24:MI'), 160),
           caminho = automacao_caminho_mais(e, 'remarcado',
             case when new.inicio is distinct from old.inicio then 'Remarcado para ' || to_char(automacao_local(new.inicio), 'DD/MM, "às" HH24:MI')
                  when new.cliente_id is distinct from old.cliente_id then 'O cliente do compromisso mudou'
                  else 'Lembrete marcado de novo' end
             || case when v_aviso ? 'mensagem' then '; lembrete com a nova data enviado'
                     when v_aviso ? 'motivo' then '; o lembrete com a nova data não saiu: ' || lower(left(v_aviso ->> 'motivo', 1)) || substr(v_aviso ->> 'motivo', 2)
                     else '' end)
     where id = e.id;
  end loop;
  return new;
end $$;

-- Mensagens (0300): a conversa apagada sai da contagem, do dia, da lista e da busca.
create or replace function portal_conversas(p_pessoa uuid, p_escritorio uuid, p_filtro text default 'PRECISA', p_busca text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
  v_dig text;
  v_hoje timestamptz := inicio_do_dia(hoje_brasilia());
  w whatsapp_escritorio;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if coalesce(p_filtro, '') not in ('PRECISA', 'EQUIPE', 'IA', 'RESOLVIDAS') then perform recusar_campos('Filtro inválido', 'mostrar'); end if;
  if v_busca is not null and length(v_busca) > 80 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_dig := nullif(regexp_replace(coalesce(v_busca, ''), '[^0-9]', '', 'g'), '');
  select * into w from whatsapp_escritorio where escritorio_id = p_escritorio;
  return jsonb_build_object(
    'whatsapp', jsonb_build_object(
      'situacao', coalesce(w.situacao, 'NAO_LIGADO'), 'numero', w.numero,
      'quemLiga', (select pessoa_ref(v.pessoa_id) from vinculos v
                    where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1)),
    'eu', p_pessoa,
    'contagem', (select jsonb_build_object(
                   'precisa', count(*) filter (where situacao = 'PRECISA'),
                   'equipe', count(*) filter (where situacao = 'EQUIPE'),
                   'ia', count(*) filter (where situacao = 'IA' and resolvida_em is null),
                   'resolvidas', count(*) filter (where situacao = 'IA' and resolvida_em >= v_hoje))
                   from conversas where escritorio_id = p_escritorio and apagada_em is null),
    -- O dia até agora, para a tela sem conversa aberta.
    'hoje', jsonb_build_object(
      'resolvidas', (select count(*) from conversas where escritorio_id = p_escritorio and apagada_em is null
                                                                     and situacao = 'IA' and resolvida_em >= v_hoje),
      'respondidas', (select count(distinct m.conversa_id) from conversa_mensagens m
                       where m.escritorio_id = p_escritorio and m.evento = 'DEVOLVEU' and m.criada_em >= v_hoje and m.apagada_em is null),
      'avisos', (select count(*) from conversa_mensagens m
                  where m.escritorio_id = p_escritorio and m.autor = 'AVISO' and m.criada_em >= v_hoje and m.apagada_em is null)),
    'conversas', coalesce((
      select jsonb_agg(conversa_linha(c) order by
                         case when c.situacao = 'PRECISA' then c.esperando_desde end, c.ultima_em desc)
        from conversas c
       where c.escritorio_id = p_escritorio and c.apagada_em is null
         and case when v_busca is not null then
                    conversa_nome(c) ilike '%' || v_busca || '%' or c.nome_contato ilike '%' || v_busca || '%'
                    or (v_dig is not null and length(v_dig) >= 4 and regexp_replace(c.telefone, '[^0-9]', '', 'g') like '%' || v_dig || '%')
                  when p_filtro = 'PRECISA' then c.situacao = 'PRECISA'
                  when p_filtro = 'EQUIPE' then c.situacao = 'EQUIPE'
                  when p_filtro = 'IA' then c.situacao = 'IA' and c.resolvida_em is null
                  else c.situacao = 'IA' and c.resolvida_em >= v_hoje end), '[]'::jsonb));
end $$;

-- A conversa aberta (0470): a apagada responde 404, como a que não existe.
create or replace function portal_conversa(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  v_juridico boolean;
  v_caso jsonb;
  v_contato jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio and apagada_em is null;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  if v_juridico and c.cliente_id is not null then
    select jsonb_build_object('id', k.id, 'nome', k.nome, 'etapa', e.nome, 'responsavel', pessoa_ref(k.responsavel_id)) into v_caso
      from casos k join caso_clientes cc on cc.caso_id = k.id join etapas e on e.id = k.etapa_id
     where k.escritorio_id = p_escritorio and cc.cliente_id = c.cliente_id and k.situacao = 'ANDAMENTO'
     order by k.etapa_desde desc limit 1;
  end if;
  if c.cliente_id is not null and c.contato_id is not null then
    select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
     where x.id = c.cliente_id and k ->> 'id' = c.contato_id;
  end if;
  return conversa_linha(c) || jsonb_build_object(
    'versao', c.versao, 'motivoTexto', c.motivo_texto, 'responsavelRazao', c.responsavel_razao, 'assumidaEm', c.assumida_em,
    'notaIa', c.nota_ia, 'eu', p_pessoa, 'whatsappLigado', whatsapp_ligado(p_escritorio),
    'principal', coalesce((v_contato ->> 'principal')::boolean, false),
    'juridico', v_juridico,
    'contatoId', c.contato_id,
    'avisos', conversa_avisos(c),
    'mensagens', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', m.id, 'autor', m.autor, 'pessoa', pessoa_ref(m.pessoa_id), 'evento', m.evento,
               'para', case when m.evento in ('IA_PASSOU', 'PASSOU', 'RESPONSAVEL_SAIU', 'APP_RESPONDEU') then pessoa_ref((m.dados ->> 'para')::uuid) end,
               'de', case when m.evento in ('ASSUMIU', 'PASSOU', 'RESPONSAVEL_SAIU') then pessoa_ref((m.dados ->> 'de')::uuid) end,
               'razao', m.dados ->> 'razao', 'motivo', m.dados ->> 'motivo',
               'tipoAvisos', case when m.evento like 'SEM_AVISOS_%' then m.dados ->> 'tipo' end,
               'quemPediu', case when m.evento like 'SEM_AVISOS_%' then m.dados ->> 'quemPediu' end,
               'texto', m.texto, 'anexo', m.anexo, 'avisoTipo', m.aviso_tipo, 'envio', m.envio, 'envioMotivo', m.envio_motivo,
               'em', m.criada_em)) order by m.criada_em, m.id)
        from conversa_mensagens m where m.conversa_id = c.id), '[]'::jsonb),
    'contexto', jsonb_build_object(
      'proxContato', case when c.cliente_id is not null then prox_contato(c.cliente_id) end,
      'caso', v_caso,
      'compromisso', (select jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'tipoEscrito', a.tipo_escrito,
                                                'inicio', a.inicio, 'modalidade', a.modalidade, 'local', a.local)
                        from compromissos a
                       where a.escritorio_id = p_escritorio and a.cliente_id = c.cliente_id and a.estado = 'MARCADO' and a.fim > app_now()
                       order by a.inicio limit 1)));
end $$;

-- Assumir, devolver, passar e escrever (0300): 404 na apagada.
create or replace function conversa_para_mudar(p_escritorio uuid, p_conversa uuid) returns conversas
language plpgsql
set search_path = public
as $$
declare c conversas;
begin
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio and apagada_em is null;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  return c;
end $$;

-- O contato da conversa para o cadastro (0870): 404 na apagada.
create or replace function portal_conversa_contato(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio and apagada_em is null;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  return jsonb_build_object('id', c.id, 'nome', c.nome_contato, 'telefone', c.telefone,
    'clienteId', (select k.id from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'responsavel', pessoa_ref(c.responsavel_id));
end $$;

-- O atendimento da IA (0330): 404 na apagada (o serviço não chama, mas fica fechado).
create or replace function ia_atendimento(p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cv conversas;
  c ia_config;
  v_contato jsonb;
begin
  perform conversa_entrar_servico(p_escritorio);
  select * into cv from conversas where id = p_conversa and escritorio_id = p_escritorio and apagada_em is null;
  if cv.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  c := ia_config_garantir(p_escritorio);
  if cv.cliente_id is not null and cv.contato_id is not null then
    select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
     where x.id = cv.cliente_id and k ->> 'id' = cv.contato_id;
  end if;
  return jsonb_build_object(
    'conversa', jsonb_build_object('id', cv.id, 'situacao', cv.situacao, 'versao', cv.versao,
                                   'nome', cv.nome_contato, 'notaIa', cv.nota_ia,
                                   -- Já houve resposta de pessoa desde a última devolução para a IA?
                                   'pessoaRespondeu', exists (
                                     select 1 from conversa_mensagens m
                                      where m.conversa_id = cv.id and m.autor in ('EQUIPE', 'APP')
                                        and m.criada_em > coalesce((select max(d.criada_em) from conversa_mensagens d
                                                                     where d.conversa_id = cv.id and d.evento = 'DEVOLVEU'), '-infinity'))),
    'iaSituacao', c.situacao,
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object('autor', m.autor, 'texto', m.texto,
                                                               'anexo', m.anexo is not null, 'em', m.criada_em) order by m.criada_em, m.id)
                             from (select * from conversa_mensagens m
                                    where m.conversa_id = cv.id and m.autor in ('CLIENTE', 'IA', 'EQUIPE', 'AVISO', 'APP')
                                    order by m.criada_em desc, m.id desc limit 20) m), '[]'::jsonb),
    'contexto', ia_contexto_json(p_escritorio, cv.cliente_id, v_contato));
end $$;

-- A pergunta que a IA não soube (0310): 404 na apagada (a guarda ia_pergunta_nasce cobre a corrida).
create or replace function conversa_ia_nao_soube(p_escritorio uuid, p_conversa uuid, p_texto text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform conversa_entrar_servico(p_escritorio);
  if not exists (select 1 from conversas where id = p_conversa and escritorio_id = p_escritorio and apagada_em is null) then
    raise exception 'Conversa não encontrada' using errcode = 'TC404';
  end if;
  insert into ia_perguntas_sem_resposta (escritorio_id, conversa_id, texto) values (p_escritorio, p_conversa, left(btrim(p_texto), 600))
  returning id into v_id;
  return v_id;
end $$;

-- Quem sai da equipe (0300): em ordem de id, a mesma da exclusão (revisão, m9).
create or replace function conversas_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
  c conversas;
begin
  if v_de is null or v_para is null then return new; end if;
  for c in select * from conversas where escritorio_id = new.escritorio_id and responsavel_id = v_de order by id loop
    update conversas set responsavel_id = v_para, responsavel_razao = 'SAIU_DA_EQUIPE',
                         situacao = case when situacao = 'EQUIPE' then 'PRECISA' else situacao end,
                         esperando_desde = case when situacao = 'EQUIPE' then app_now() else esperando_desde end,
                         assumida_por = null, assumida_em = null
     where id = c.id;
    if c.situacao <> 'IA' then
      perform conversa_momento(c, 'RESPONSAVEL_SAIU', null, jsonb_build_object('de', v_de, 'para', v_para));
    end if;
  end loop;
  return new;
end $$;

-- Avisos automáticos (0360): sem a mensagem da conversa apagada e sem a execução que falhou nela
-- (sem isso a linha mostraria "Para null").
create or replace function portal_avisos_automaticos(p_pessoa uuid, p_escritorio uuid, p_gatilho text default null, p_limite integer default 20,
                                          p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_desde timestamptz := app_now() - interval '7 days'; v_itens jsonb; v_total integer; v_falhas integer; v_tipos jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if p_gatilho is not null and automacao_area(p_gatilho) is null then perform recusar_campos('Tipo inválido', 'tipo'); end if;
  if coalesce(p_limite, 0) not between 1 and 100 or coalesce(p_pular, -1) < 0 then perform recusar_campos('Página inválida', 'limite'); end if;
  with lista as materialized (
    select l j, (l ->> 'em')::timestamptz em, l ->> 'gatilho' gatilho, l ->> 'situacao' = 'NAO_ENTREGUE' falha
      from (
        select aviso_automatico_linha(m, e, a) l
          from conversa_mensagens m
          join automacao_execucoes e on e.id = (m.dados ->> 'execucao')::uuid
          join automacoes a on a.id = e.automacao_id
         where m.escritorio_id = p_escritorio and m.autor = 'AVISO' and m.criada_em >= v_desde and m.apagada_em is null
           and automacao_visivel(p_pessoa, p_escritorio, a)
        union all
        select aviso_automatico_linha(null, e, a)
          from automacao_execucoes e join automacoes a on a.id = e.automacao_id
         where e.escritorio_id = p_escritorio and e.situacao = 'FALHOU' and e.terminada_em >= v_desde
           and not exists (select 1 from conversas v where v.id = e.conversa_id and v.apagada_em is not null)
           and automacao_visivel(p_pessoa, p_escritorio, a)
           and not exists (select 1 from conversa_mensagens m where m.conversa_id = e.conversa_id and m.dados ->> 'execucao' = e.id::text)) x),
  filtrada as (select * from lista where p_gatilho is null or gatilho = p_gatilho)
  select (select coalesce(jsonb_object_agg(g, n), '{}'::jsonb) from (select gatilho g, count(*) n from lista group by gatilho) t),
         (select count(*) from filtrada), (select count(*) from filtrada where falha),
         (select coalesce(jsonb_agg(y.j order by y.falha desc, y.em desc), '[]'::jsonb)
            from (select * from filtrada order by falha desc, em desc limit p_limite offset p_pular) y)
    into v_tipos, v_total, v_falhas, v_itens;
  return jsonb_build_object('itens', v_itens, 'total', v_total, 'naoEntregues', v_falhas, 'porTipo', v_tipos,
                            'socioDono', (select pessoa_ref(automacao_socio_dono(p_escritorio))),
                            'dono', e_socio_dono(p_pessoa, p_escritorio));
end $$;

-- O lembrete na ficha do compromisso (0670): a resposta e o link ignoram a conversa apagada (sem
-- isso a ficha diria "Cliente respondeu: Mensagem apagada...").
create or replace function compromisso_lembrete_ficha(c compromissos) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  e automacao_execucoes; k clientes_escritorio; ct jsonb; v_h integer := compromisso_lembrete_horas_antes(c.escritorio_id);
  v_msgs jsonb; v_primeira timestamptz; v_conv uuid; v_previa text;
begin
  select x.* into e from automacao_execucoes x join automacoes y on y.id = x.automacao_id
   where x.escritorio_id = c.escritorio_id and x.origem_id = c.id and y.gatilho = 'LEMBRETE_AUDIENCIA'
   order by x.iniciada_em desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'nome', m.aviso_tipo, 'em', m.criada_em, 'envio', m.envio,
                                               'envioEm', m.envio_em, 'envioMotivo', m.envio_motivo, 'texto', m.texto) order by m.criada_em), '[]'::jsonb),
         min(m.criada_em), (array_agg(m.conversa_id order by m.criada_em desc))[1]
    into v_msgs, v_primeira, v_conv
    from conversa_mensagens m
   where m.escritorio_id = c.escritorio_id and m.autor = 'AVISO'
     and ((e.id is not null and m.dados ->> 'execucao' = e.id::text)
          or (m.dados ->> 'compromisso' = c.id::text and m.dados ->> 'aviso' = 'LEMBRETE_AUDIENCIA'));
  if v_conv is not null and not exists (select 1 from conversas v where v.id = v_conv and v.apagada_em is null) then
    v_conv := null;
  end if;
  select * into k from clientes_escritorio where id = c.cliente_id and estado <> 'EXCLUIDO';
  ct := contato_principal(k.contatos);
  if k.id is not null then
    v_previa := automacao_preencher(
      coalesce((select w.texto from whatsapp_avisos w where w.escritorio_id = c.escritorio_id and w.chave = 'LEMBRETE_AUDIENCIA'),
               'Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembrete: {compromisso}, no dia {data}, às {hora}. Local: {local}. Responda CONFIRMO, ou escreva se tiver alguma dúvida.'),
      jsonb_build_object('nome', split_part(btrim(coalesce(ct ->> 'nome', k.nome)), ' ', 1),
                         'nome do escritório', (select x.nome from escritorios x where x.id = c.escritorio_id)) || compromisso_campos(c));
  end if;
  return jsonb_build_object(
    'umDia', compromisso_lembrete_em(c.inicio),
    'horasAntes', v_h,
    'antes', compromisso_lembrete_horas(c.inicio, v_h),
    'situacao', e.situacao, 'motivo', e.motivo, 'proximoEm', e.proximo_em,
    'automacaoLigada', exists (select 1 from automacoes a where a.escritorio_id = c.escritorio_id and a.pronta_chave = 'LEMBRETE_AUDIENCIA'
                                                           and a.situacao in ('LIGADA', 'EM_APROVACAO') and a.versao_ligada is not null)
                       or not exists (select 1 from automacoes a where a.escritorio_id = c.escritorio_id and a.pronta_chave = 'LEMBRETE_AUDIENCIA'),
    'mensagens', v_msgs,
    'conversaId', coalesce(v_conv, (select v.id from conversas v where v.id = e.conversa_id and v.apagada_em is null)),
    -- A primeira resposta do cliente depois do primeiro lembrete.
    'resposta', (select jsonb_build_object('em', m.criada_em, 'texto', left(m.texto, 300)) from conversa_mensagens m
                  where v_conv is not null and m.conversa_id = v_conv and m.autor = 'CLIENTE' and m.criada_em > v_primeira and m.texto is not null
                  order by m.criada_em limit 1),
    'previa', v_previa);
end $$;

-- A ficha do compromisso (0670): o aviso de cancelamento sem o link da conversa apagada (revisão, m4).
create or replace function portal_compromisso(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c compromissos;
  v_juridico boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  select * into c from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  return compromisso_linha(c) || jsonb_build_object(
    'linkSala', c.link_sala, 'observacoes', c.observacoes, 'versao', c.versao, 'criadoEm', c.criado_em,
    'criadoPor', pessoa_ref(c.criado_por),
    'juridico', v_juridico,
    -- O caso só vai para quem tem o Jurídico; quem não tem sabe apenas que há um (para não apagá-lo sem querer).
    'caso', case when v_juridico and c.caso_id is not null then compromisso_caso_ref(c.caso_id) end,
    'temCaso', c.caso_id is not null,
    'contatoCliente', (select contato_principal(k.contatos) from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'whatsappLigado', whatsapp_ligado(p_escritorio),
    'lembretes', case when c.cliente_id is not null then compromisso_lembrete_ficha(c) end,
    'cancelamento', case when c.estado = 'CANCELADO' then jsonb_build_object(
      'em', c.cancelado_em, 'por', pessoa_ref(c.cancelado_por), 'motivo', c.motivo_cancelamento, 'avisar', c.avisar_cancelamento,
      'aviso', case when c.avisar_cancelamento then jsonb_build_object(
        'motivo', c.aviso_cancelamento_motivo,
        'mensagem', (select jsonb_build_object('id', m.id, 'em', m.criada_em, 'envio', m.envio, 'envioMotivo', m.envio_motivo,
                                               'texto', m.texto,
                                               'conversaId', (select v.id from conversas v where v.id = m.conversa_id and v.apagada_em is null))
                       from conversa_mensagens m where m.id = c.aviso_cancelamento_id)) end) end,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', p.nome, 'dados', h.dados) order by h.id)
        from historico h left join pessoas p on p.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'compromissos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

-- O cadastro pela conversa (0870): 404 na apagada, que não se liga à ficha nova (revisão, m4).
create or replace function portal_cliente_cadastrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversa uuid;
  c conversas;
  r jsonb;
  v_cli uuid;
  v_contato jsonb;
  v_compromissos integer;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' or nullif(p_dados ->> 'conversaId', '') is null then
    return portal_cliente_cadastrar_sem_conversa(p_pessoa, p_escritorio, case when jsonb_typeof(p_dados) = 'object' then p_dados - 'conversaId' else p_dados end);
  end if;
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  begin
    v_conversa := (p_dados ->> 'conversaId')::uuid;
  exception when others then perform recusar_campos('Confira a conversa', 'conversaId');
  end;
  select * into c from conversas where id = v_conversa and escritorio_id = p_escritorio and apagada_em is null for update;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  if c.cliente_id is not null and exists (select 1 from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO') then
    perform recusar_motivo('Esta conversa já está ligada a um cliente', 'CONVERSA_JA_LIGADA');
  end if;

  r := portal_cliente_cadastrar_sem_conversa(p_pessoa, p_escritorio, p_dados - 'conversaId');
  v_cli := (r ->> 'id')::uuid;
  -- Quem escreve é o contato da ficha nova com o número da conversa, quando houver.
  select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
   where x.id = v_cli and k ->> 'telefone' = c.telefone limit 1;
  update conversas
     set cliente_id = v_cli, contato_id = v_contato ->> 'id',
         nome_contato = coalesce(v_contato ->> 'nome', nome_contato),
         papel_contato = case when v_contato is null then papel_contato else nullif(btrim(coalesce(v_contato ->> 'papel', '')), '') end
   where id = c.id;
  -- A primeira reunião marcada com a conversa passa para a ficha (e o lembrete começa).
  update compromissos set cliente_id = v_cli
   where escritorio_id = p_escritorio and conversa_id = c.id and cliente_id is null;
  get diagnostics v_compromissos = row_count;
  perform registrar_historico('cliente.da_conversa', 'cliente', v_cli::text,
    jsonb_build_object('conversa', c.id, 'compromissos', v_compromissos));
  return r || jsonb_build_object('conversaId', c.id);
end $$;

-- A reunião com a conversa (0870): a apagada não serve.
create or replace function compromisso_conversa_pedida(p_escritorio uuid, p_dados jsonb) returns conversas
language plpgsql
set search_path = public
as $$
declare
  c conversas;
  v_id uuid;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' or nullif(p_dados ->> 'conversaId', '') is null then return null; end if;
  begin
    v_id := (p_dados ->> 'conversaId')::uuid;
  exception when others then perform recusar_campos('Confira a conversa', 'conversaId');
  end;
  select * into c from conversas where id = v_id and escritorio_id = p_escritorio and apagada_em is null;
  if c.id is null then perform recusar_campos('Esta conversa não é deste escritório', 'conversaId'); end if;
  return c;
end $$;

-- A Agenda (0870): o compromisso marcado pela conversa apagada fica sem a conversa.
create or replace function compromisso_linha(c compromissos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'tipo', c.tipo, 'tipoEscrito', c.tipo_escrito, 'titulo', c.titulo, 'inicio', c.inicio, 'fim', c.fim,
    'modalidade', c.modalidade, 'local', c.local, 'situacao', c.estado, 'lembrete', c.lembrete_cliente,
    'responsavel', pessoa_ref(c.responsavel_id),
    'tambemVai', coalesce((select jsonb_agg(pessoa_ref(t) order by o) from unnest(c.tambem_vai) with ordinality u(t, o)), '[]'::jsonb),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
    'conversa', (select jsonb_build_object('id', v.id, 'nome', coalesce(v.nome_contato, v.telefone), 'telefone', v.telefone)
                   from conversas v where v.id = c.conversa_id and c.cliente_id is null and v.apagada_em is null))
$$;

-- ---------------------------------------------------------------------------------------
-- 10. Inventário (PT-11): muda só o destino no pedido do titular, com até 200 letras (revisão, M4).
-- A situação continua APROVADO, com o ok da Carol antes do merge.
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, saem número, nome, papel, motivo escrito e nota, salvo se há registro de outro cliente; ficam as datas, a situação e quem atendeu'
 where tabela = 'conversas';
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, o texto vira “Mensagem apagada a pedido do titular” e do anexo ficam o tipo e o tamanho; ficam o autor, as datas e o envio'
 where tabela = 'conversa_mensagens';
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, a pergunta ainda sem resposta sai, e a que virou resposta fica com um texto fixo'
 where tabela = 'ia_perguntas_sem_resposta';
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, a execução em andamento para e o rótulo vira “Cliente excluído”'
 where tabela = 'automacao_execucoes';
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, o nome do cliente e o serviço viram texto fixo, saem a data dos 18 anos e quem assinava, e o texto da conversa apagada'
 where tabela = 'avisos_sino';

call fechar_acesso();
