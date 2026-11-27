-- 1181 · Implantação assistida, parte 2: abertura, conclusão, cancelamento, reabertura e prazo
-- (F1.43; CO-08, CO-09). Plano aprovado em docs/design/aprovadas/console-implantacao/PLANO.md
-- (seções 2, 3 regras 3 e 7 a 10, e 5.1), com a revisão em REVISAO.md e as decisões da Carol em
-- DC14 (nos 30 dias, só avisos e troca do prazo com motivo; nada passa a Ativo sozinho).
-- Depende da 1160 do CO-09 (testes_gratis, escritorio_dia_um) e da 1180.
--
--  * Abertura no primeiro acesso de um sócio: um gatilho em testes_gratis.primeiro_acesso_em
--    (nulo para preenchido, e também no insert já preenchido, por segurança). A 1160 só grava o
--    primeiro acesso de vínculo SOCIO, uma vez. O dia 1 é escritorio_dia_um, e o prazo conta
--    dele. Nenhum gatilho em sessoes_escritorio e nenhuma troca de escolher_escritorio. Um erro
--    aqui nunca impede o login: vira aviso e a abertura fica para a 1ª fatura.
--  * implantacao_abrir(escritório, sistema, na_fatura): a única porta de abertura. Só abre em
--    Implantação, uma vez por escritório (a reabertura é do gatilho da carteira). Com na_fatura
--    (o PR 3 chama em cobranca_comecar, antes de emitir), também abre o escritório que chega ao
--    Ativo sem que nenhum sócio tenha entrado, e a conclui na hora, porque o Ativo já veio.
--  * O estágio manda na implantação (gatilho em clientes): Ativo conclui a aberta (pela aba
--    Contrato ou por console_implantacao_concluir, que guarda o resumo); Encerrado cancela a
--    aberta no dia do fim (dentro de encerrar_no_dia, com a marca t3jus.mudando_contrato que já
--    existe); Encerrado → Implantação, que só acontece quando o encerramento foi na implantação,
--    abre a número 2 com a regra do dia e o prazo contado da reabertura.
--  * console_implantacao_concluir(p, e, versão do cliente, versão da implantação, resumo): passa
--    a Ativo pelo caminho de console_mudar_estagio (motivo "Implantação concluída").
--  * console_implantacao_prazo(p, e, prazo, motivo, versão): só a Administração; o motivo vai
--    para o histórico interno (a tabela é exportada).
--  * Os escritórios que já existem: os que estão em Implantação e têm sócio que já entrou (dia 1
--    da 1160) ou que já criou a senha abrem na migration, com a regra do dia (isenta). Os outros
--    abrem no primeiro acesso ou na 1ª fatura. Ativo e Encerrado não ganham implantação.
--
-- Nenhum evento vai para planos_eventos (autor_id not null; revisão, 16): a abertura, a conclusão
-- e o cancelamento ficam no histórico pelo guardião (autor da sessão, ou o sistema na rotina) e a
-- troca do prazo no histórico interno, sempre com o autor da sessão.

-- ---------------------------------------------------------------------------------------
-- 1. Leituras e marcas de apoio

-- O estágio da carteira (interna) para quem não é da equipe: o primeiro acesso do sócio. Só
-- dentro de implantacao_estagio, que liga a marca e a desliga ao sair.
create policy lendo_estagio on clientes for select to dominio
  using (current_setting('t3jus.lendo_estagio', true) = 'on');

create function implantacao_estagio(p_escritorio uuid) returns text
language plpgsql
set search_path = public
as $$
declare v text; v_antes text := current_setting('t3jus.lendo_estagio', true);
begin
  perform set_config('t3jus.lendo_estagio', 'on', true);
  select estado into v from clientes where escritorio_id = p_escritorio;
  perform set_config('t3jus.lendo_estagio', coalesce(v_antes, ''), true);
  return v;
end $$;

-- O evento da transição de quem chamou volta depois de a implantação mudar de estado dentro de
-- um gatilho (o guardião lê o evento da transação).
create function implantacao_transicao_guardar() returns text[]
language sql stable set search_path = public
as $$ select array[coalesce(current_setting('app.transicao_evento', true), ''),
                   coalesce(current_setting('app.transicao_motivo', true), ''),
                   coalesce(current_setting('app.transicao_sistema', true), '')] $$;

create function implantacao_transicao_voltar(p text[]) returns void
language plpgsql set search_path = public
as $$
begin
  perform set_config('app.transicao_evento', p[1], true);
  perform set_config('app.transicao_motivo', p[2], true);
  perform set_config('app.transicao_sistema', p[3], true);
end $$;

-- A rotina da noite (aplicar_prazos → encerrar_no_dia) não tem escritório no contexto: como na
-- carteira e nos vínculos (0210), ela lê e muda a implantação com a marca t3jus.aplicando_prazos.
create policy rotina_prazos_ler on implantacoes for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_mudar on implantacoes for update to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on') with check (true);

create function implantacao_json(i implantacoes) returns jsonb
language sql stable set search_path = public
as $$
  select case when i.id is not null then jsonb_build_object(
    'id', i.id, 'numero', i.numero, 'estado', i.estado, 'abertaEm', i.aberta_em, 'prazoAte', i.prazo_ate,
    'nome', i.nome, 'condicao', i.condicao, 'condicaoTexto', i.condicao_texto,
    'concluidaEm', i.concluida_em, 'concluidaPor', (select nome from pessoas where id = i.concluida_por),
    'resumo', i.resumo, 'canceladaEm', i.cancelada_em, 'versao', i.versao) end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Abrir

-- Insere a implantação nova com o escritório e o autor do contexto. Um escritório por vez
-- (advisory lock): dois acessos ao mesmo tempo dão uma implantação só, e o de trás volta sem erro
-- e sem evento no histórico.
create function implantacao_inserir(p_escritorio uuid, p_desde date, p_motivo text, p_sistema boolean) returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid; v_tr text[] := implantacao_transicao_guardar();
begin
  perform pg_advisory_xact_lock(hashtextextended('implantacao:' || p_escritorio::text, 0));
  if exists (select 1 from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA') then return null; end if;
  perform definir_transicao('IMPLANTACAO_ABERTA', p_motivo, p_sistema or contexto_pessoa() is null);
  insert into implantacoes (escritorio_id, aberta_em) values (p_escritorio, coalesce(p_desde, hoje_brasilia()))
  on conflict do nothing
  returning id into v_id;
  perform implantacao_transicao_voltar(v_tr);
  return v_id;
end $$;

-- Conclui a aberta, com o resumo que console_implantacao_concluir deixou na transação.
create function implantacao_concluir_aberta(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
declare v_tr text[] := implantacao_transicao_guardar();
begin
  if not exists (select 1 from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA') then return; end if;
  perform definir_transicao('IMPLANTACAO_CONCLUIDA', 'Ativo', contexto_pessoa() is null);
  update implantacoes set estado = 'CONCLUIDA', resumo = nullif(current_setting('t3jus.implantacao_resumo', true), '')
   where escritorio_id = p_escritorio and estado = 'ABERTA';
  perform implantacao_transicao_voltar(v_tr);
end $$;

-- A porta de abertura (plano, 5.1). Devolve a implantação aberta (a que já havia ou a nova), ou
-- nulo quando não abre: estágio Encerrado, escritório que já teve implantação, ou Ativo fora da
-- 1ª fatura. O prazo conta do dia 1 (primeiro acesso de um sócio) e, sem ele, do dia de hoje.
create function implantacao_abrir(p_escritorio uuid, p_sistema boolean default false, p_na_fatura boolean default false)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_estagio text := implantacao_estagio(p_escritorio);
  v_id uuid;
begin
  if v_estagio is null or v_estagio not in ('IMPLANTACAO', 'ATIVO') then return null; end if;
  if v_estagio = 'ATIVO' and not p_na_fatura then return null; end if;
  select id into v_id from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA';
  if v_id is null and not exists (select 1 from implantacoes where escritorio_id = p_escritorio) then
    v_id := implantacao_inserir(p_escritorio, escritorio_dia_um(p_escritorio),
                                case when p_na_fatura then 'Primeira fatura' else 'Primeiro acesso de um sócio' end, p_sistema);
    if v_id is null then
      select id into v_id from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA';
    end if;
    if v_estagio = 'ATIVO' then perform implantacao_concluir_aberta(p_escritorio); end if;
  end if;
  return v_id;
end $$;

-- O gatilho do primeiro acesso. Nunca derruba o login: o erro vira aviso, e a abertura fica para
-- a 1ª fatura.
create function implantacao_ao_primeiro_acesso() returns trigger
language plpgsql
set search_path = public
as $$
begin
  begin
    perform implantacao_abrir(new.escritorio_id, true);
  exception when others then
    raise warning 'Implantação: não abriu no primeiro acesso (%)', sqlerrm;
  end;
  return null;
end $$;
create trigger implantacao_ao_primeiro_acesso after update of primeiro_acesso_em on testes_gratis
  for each row when (old.primeiro_acesso_em is null and new.primeiro_acesso_em is not null)
  execute function implantacao_ao_primeiro_acesso();
create trigger implantacao_ao_primeiro_acesso_insert after insert on testes_gratis
  for each row when (new.primeiro_acesso_em is not null)
  execute function implantacao_ao_primeiro_acesso();

-- ---------------------------------------------------------------------------------------
-- 3. O estágio manda na implantação

create function implantacao_segue_o_estagio() returns trigger
language plpgsql
set search_path = public
as $$
declare v_tr text[];
begin
  if new.estado = 'ATIVO' then
    perform implantacao_concluir_aberta(new.escritorio_id);
  elsif new.estado = 'ENCERRADO' then
    if exists (select 1 from implantacoes where escritorio_id = new.escritorio_id and estado = 'ABERTA') then
      v_tr := implantacao_transicao_guardar();
      perform definir_transicao('IMPLANTACAO_CANCELADA', 'Fim do contrato', contexto_pessoa() is null);
      update implantacoes set estado = 'CANCELADA' where escritorio_id = new.escritorio_id and estado = 'ABERTA';
      perform implantacao_transicao_voltar(v_tr);
    end if;
  elsif new.estado = 'IMPLANTACAO' and old.estado = 'ENCERRADO'
        and exists (select 1 from implantacoes where escritorio_id = new.escritorio_id and estado = 'CANCELADA') then
    -- O encerramento foi na implantação: abre a seguinte, com a regra do dia e o prazo de hoje.
    perform implantacao_inserir(new.escritorio_id, hoje_brasilia(), 'Retomada do contrato', false);
  end if;
  return null;
end $$;
create trigger implantacao_segue_o_estagio after update of estado on clientes
  for each row when (old.estado is distinct from new.estado)
  execute function implantacao_segue_o_estagio();

-- ---------------------------------------------------------------------------------------
-- 4. O Console: concluir e mudar o prazo

-- Concluir = passar a Ativo (plano, regra 7). As duas versões: a da carteira, que
-- console_mudar_estagio confere, e a da implantação, conferida aqui. O resumo (até 2.000
-- caracteres, opcional) fica na implantação, e o sócio o lê no Portal.
create function console_implantacao_concluir(p_pessoa uuid, p_escritorio uuid, p_versao_cliente integer,
                                             p_versao_implantacao integer, p_resumo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i implantacoes;
  v_resumo text := nullif(btrim(coalesce(p_resumo, '')), '');
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.estagio.mudar');
  select * into i from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA' for update;
  if i.id is null then
    perform recusar_motivo('Este escritório não tem implantação em andamento', 'IMPLANTACAO_NAO_ABERTA');
  end if;
  if length(v_resumo) > 2000 then perform recusar_campos('O resumo vai até 2.000 caracteres', 'resumo'); end if;
  if p_versao_implantacao is null or i.versao <> p_versao_implantacao then perform conflito_versao('implantacoes', i.id); end if;
  perform set_config('t3jus.implantacao_resumo', coalesce(v_resumo, ''), true);
  v_versao := console_mudar_estagio(p_pessoa, p_escritorio, p_versao_cliente, 'ATIVO', 'Implantação concluída');
  perform set_config('t3jus.implantacao_resumo', '', true);
  select * into i from implantacoes where id = i.id;
  if i.estado <> 'CONCLUIDA' then
    raise exception 'A implantação não foi concluída com o Ativo' using errcode = 'TC010';
  end if;
  return jsonb_build_object('versaoCliente', v_versao, 'implantacao', implantacao_json(i));
end $$;

-- Mudar o prazo (só a Administração), com motivo no histórico interno. O prazo novo não fica
-- antes da abertura nem antes de hoje, e vai até um ano depois da abertura.
create function console_implantacao_prazo(p_pessoa uuid, p_escritorio uuid, p_prazo_ate date, p_motivo text, p_versao integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i implantacoes; v_motivo text; v_antes date;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.implantacao.prazo');
  select * into i from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA' for update;
  if i.id is null then
    perform recusar_motivo('Este escritório não tem implantação em andamento', 'IMPLANTACAO_NAO_ABERTA');
  end if;
  v_motivo := motivo_valido(p_motivo);
  if p_prazo_ate is null or p_prazo_ate = i.prazo_ate or p_prazo_ate < greatest(i.aberta_em, hoje_brasilia())
     or p_prazo_ate > i.aberta_em + 365 then
    raise exception 'Escolha um prazo diferente do de agora, a partir de hoje e até um ano depois da abertura' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PRAZO_INVALIDO', 'campos', jsonb_build_array('prazoAte'))::text;
  end if;
  if p_versao is null or i.versao <> p_versao then perform conflito_versao('implantacoes', i.id); end if;
  v_antes := i.prazo_ate;
  update implantacoes set prazo_ate = p_prazo_ate where id = i.id returning * into i;
  perform registrar_historico_interno('implantacao.prazo_mudou', 'implantacoes', i.id::text,
    jsonb_build_object('motivo', v_motivo, 'de', v_antes, 'para', i.prazo_ate));
  return jsonb_build_object('versao', i.versao, 'implantacao', implantacao_json(i));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Os escritórios que já existem (plano, regra 10)

-- Abre a implantação dos que estão em Implantação e têm sócio que já entrou (dia 1 da 1160) ou
-- que já criou a senha. Sem dia 1, o prazo conta de hoje. Pode rodar de novo: quem já teve
-- implantação fica como está. Devolve quantos desses ficam com a implantação aberta.
create function implantacao_abrir_antigos() returns integer
language plpgsql
set search_path = public
as $$
declare
  v_ids uuid[];
  v_id uuid;
  v_n integer := 0;
  v_estagio text := current_setting('t3jus.lendo_estagio', true);
  v_acesso text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_estagio', 'on', true);
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select coalesce(array_agg(cl.escritorio_id order by cl.escritorio_id), '{}') into v_ids
    from clientes cl
   where cl.estado = 'IMPLANTACAO'
     and (escritorio_dia_um(cl.escritorio_id) is not null
          or exists (select 1 from vinculos v join pessoas p on p.id = v.pessoa_id
                      where v.escritorio_id = cl.escritorio_id and v.funcao = 'SOCIO' and v.revogado_em is null
                        and p.senha_criada_em is not null));
  perform set_config('t3jus.lendo_estagio', coalesce(v_estagio, ''), true);
  perform set_config('t3jus.lendo_acesso', coalesce(v_acesso, ''), true);
  -- Cada escritório no próprio contexto, sem pessoa (o sistema é o autor), como cobranca_rotina.
  foreach v_id in array v_ids loop
    perform entrar_escritorio_servico(v_id);
    if implantacao_abrir(v_id, true) is not null then v_n := v_n + 1; end if;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

call fechar_acesso();

-- Depois de fechar_acesso (as funções já são do domínio): como o domínio, que é quem tem as
-- políticas (as marcas de leitura e o contexto do escritório), para valer igual com ou sem
-- BYPASSRLS no papel que aplica a migration.
set role dominio;
select implantacao_abrir_antigos() as implantacoes_abertas;
reset role;
