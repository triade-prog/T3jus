-- A explicação da baixa sem receber do cliente excluído a pedido do titular (F3.193; PT-11, FI-24,
-- PT-03), pelo plano revisado (project-files t3jus/f3-180/plano.md, seção 3, e revisao.md, m4 e m9).
-- Decisão da Carol D5: fazer a limpeza, mesmo sendo defesa.
--
-- A causa. parcela_baixas.explicacao (1010) é texto livre de 3 a 1.000 letras, gravado na baixa (a
-- linha da parcela e a linha das custas juntas copiam o mesmo texto) e no desfazer. Nenhum gatilho da
-- exclusão olhava parcela_baixas, e o guardião (financeiro_so_acrescenta, 0220) recusa todo UPDATE.
--
-- Onde isso acontece de verdade. A parcela é sempre de contrato (recebimentos_previstos.contrato_id é
-- obrigatório, 0200), e cliente_vinculos_lgpd (1118) recusa a exclusão de quem tem contrato de
-- qualquer situação. Hoje, uma baixa só fica com cliente excluído por três portas: a corrida da F3.180
-- (fechada pela 1130), um contrato que entrou antes da 1130, ou uma regra futura que solte o contrato
-- (por exemplo, a F3.195). A limpeza é defesa: barata e no molde de sempre.
--
-- 1. baixa_explicacao_excluido(): o texto fixo "Explicação apagada a pedido do titular" (38 letras,
--    cabe no check de 3 a 1.000).
-- 2. parcela_baixa_do_excluido(b): a parcela da baixa é de contrato cujo cliente está EXCLUIDO, tudo
--    no mesmo escritório da baixa (sob fim_da_guarda o RLS não filtra; como aviso_sino_cliente, 1110).
-- 3. O guardião parcela_baixas_guarda troca o financeiro_so_acrescenta SÓ nesta tabela. Aceita um
--    UPDATE só quando nenhuma outra coluna muda (comparação por to_jsonb: coluna nova entra sozinha na
--    conferência), a explicação nova é o texto fixo, a antiga é diferente e o cliente da parcela está
--    EXCLUIDO (sem volta). O resto, e todo DELETE, cai na mesma mensagem de antes (TC023). Molde:
--    cliente_documento_guarda (0970) e avisos_sino_guardiao (1110). O guardião novo nasce antes de o
--    antigo sair (revisão, m4): se a cópia no SQL Editor parar no meio, a tabela não fica sem guarda.
--    terminar_guarda (0540) desliga os gatilhos do usuário; o fim da guarda não muda.
-- 4. Na exclusão: parcela_baixas_excluido_limpar trava as baixas das parcelas dos contratos do cliente
--    em ordem de id e, numa instrução própria, troca a explicação (BAIXA, DESFEITA e a linha das custas
--    juntas) que ainda difere do texto fixo. O gatilho financeiro_baixas_apagar_do_excluido, pelo
--    nome, roda logo depois de financeiro_apagar_do_excluido (1092) e não depende dele. Sem evento
--    novo: cliente.dados_excluidos (0170) já registra a exclusão, como na 1090.
-- 5. Os já excluídos: parcela_baixas_preencher_excluidos() (a 1133 só a chama e não tem volta), no
--    molde de avisos_sino_preencher_excluidos (1110).
-- 6. Inventário: muda só o destino no pedido do titular (texto da 1010); a situação continua
--    APROVADO, com o ok da Carol antes do merge.
--
-- O que fica (README, "Arquivos do cliente excluído"):
--   - as cópias da explicação, todas do mundo do contrato, que hoje prende o cliente:
--     cobranca_eventos.texto ("Baixa sem receber desfeita: …", 1010; a tabela também só acrescenta) e
--     o aviso BAIXA_RENEGOCIADA (dados.combinado e dados.cliente, origem contratos, que a 1110 não
--     cobre). As anotações de cobrança inteiras têm texto livre e também não são limpas. Se um dia o
--     contrato deixar de prender (F3.195), isso tudo entra junto;
--   - a linha das custas juntas de outro cliente: a baixa é da parcela do contrato de A, a despesa
--     reembolsável pode ser de B; a explicação é a de A, e a linha de A já é trocada com a de A;
--   - o nome de alguém citado na explicação de outro cliente (o limite R2 de sempre: não se procura
--     pelo nome).
--
-- Testes: pgTAP 166 (166_baixas_cliente_excluido_test.sql). Sem roteiro de concorrência: para haver
-- baixa a limpar o cliente teria contrato, e aí a exclusão é recusada; a corrida que abriria a porta
-- é a da F3.180 (exclusao-contrato-simultaneo.sh).
-- Ordem da publicação (painel, P24): depois da 1130 e da 1131; a contagem só de leitura (project-files
-- t3jus/f3-180/contagem-antes-1133.sql); com o ok da Carol, a 1133. Se for preciso voltar:
-- drop trigger financeiro_baixas_apagar_do_excluido on clientes_escritorio (o guardião novo pode ficar).
--
-- Novas: baixa_explicacao_excluido, parcela_baixa_do_excluido, parcela_baixas_guarda (gatilho),
-- parcela_baixas_excluido_limpar, financeiro_baixas_apagar_do_excluido (gatilho),
-- parcela_baixas_preencher_excluidos (a 1133 chama). Nenhuma é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Funções puras.
create function baixa_explicacao_excluido() returns text
language sql
immutable
as $$ select 'Explicação apagada a pedido do titular'::text $$;

-- A baixa é de parcela de contrato de cliente EXCLUIDO, tudo no escritório da baixa.
create function parcela_baixa_do_excluido(b parcela_baixas) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from recebimentos_previstos r
                   join contratos c on c.id = r.contrato_id and c.escritorio_id = b.escritorio_id
                   join clientes_escritorio k on k.id = c.cliente_id and k.escritorio_id = b.escritorio_id
                  where r.id = b.parcela_id and r.escritorio_id = b.escritorio_id and k.estado = 'EXCLUIDO')
$$;

-- ---------------------------------------------------------------------------------------
-- 2. O guardião: nasce antes de o antigo sair (revisão, m4).
create function parcela_baixas_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'explicacao') = (to_jsonb(old) - 'explicacao')
     and new.explicacao = baixa_explicacao_excluido()
     and old.explicacao <> new.explicacao
     and parcela_baixa_do_excluido(old) then
    return new;
  end if;
  raise exception 'Registro do financeiro não se muda nem se apaga' using errcode = 'TC023';
end $$;
create trigger parcela_baixas_guarda before update or delete on parcela_baixas
  for each row execute function parcela_baixas_guarda();
drop trigger if exists parcela_baixas_so_acrescenta on parcela_baixas;

-- ---------------------------------------------------------------------------------------
-- 3. A troca nas baixas de um cliente (a exclusão e a 1133 chamam). Devolve quantas mudaram.
create function parcela_baixas_excluido_limpar(p_escritorio uuid, p_cliente uuid) returns integer
language plpgsql
set search_path = public
as $$
declare v integer;
begin
  perform 1 from parcela_baixas b
   where b.escritorio_id = p_escritorio
     and b.parcela_id in (select r.id from recebimentos_previstos r join contratos c on c.id = r.contrato_id
                           where r.escritorio_id = p_escritorio and c.escritorio_id = p_escritorio and c.cliente_id = p_cliente)
     and b.explicacao <> baixa_explicacao_excluido()
   order by b.id
   for update;
  -- Uma instrução própria: em READ COMMITTED, ela vê a baixa confirmada por quem a trava acima esperou.
  update parcela_baixas b set explicacao = baixa_explicacao_excluido()
   where b.escritorio_id = p_escritorio
     and b.parcela_id in (select r.id from recebimentos_previstos r join contratos c on c.id = r.contrato_id
                           where r.escritorio_id = p_escritorio and c.escritorio_id = p_escritorio and c.cliente_id = p_cliente)
     and b.explicacao <> baixa_explicacao_excluido();
  get diagnostics v = row_count;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Na exclusão. Pelo nome, roda logo depois de financeiro_apagar_do_excluido, sem depender dele.
create function financeiro_baixas_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform parcela_baixas_excluido_limpar(new.escritorio_id, new.id);
  return null;
end $$;
create trigger financeiro_baixas_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function financeiro_baixas_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 5. Os clientes excluídos antes desta migration (a 1133 chama). No molde da 1110: as marcas
-- fim_da_guarda (para ver as linhas sob o RLS forçado) e aplicando_prazos (a trava do contrato só de
-- consulta, 0690) só durante a chamada, devolvidas como estavam. Devolve {escritório: {clientes,
-- baixas}} só com quem teve baixa trocada, e {} quando não há nada. Idempotente.
create function parcela_baixas_preencher_excluidos() returns jsonb
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
    v_n := parcela_baixas_excluido_limpar(r.escritorio_id, r.id);
    if v_n > 0 then
      v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0, "baixas": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'baixas', (v_um ->> 'baixas')::integer + v_n));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Inventário (PT-11): texto da 1010 com o destino no pedido do titular.
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, a explicação vira texto fixo'
 where tabela = 'parcela_baixas';

call fechar_acesso();
