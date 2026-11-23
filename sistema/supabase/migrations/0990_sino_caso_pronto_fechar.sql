-- O aviso no sino quando o caso sem levantamento fica pronto para encerrar no financeiro
-- (F3.147; EX-16, EX-17; também EX-01, PT-01, PT-02 e PT-03).
-- Desenho e plano aprovados pela Carol em 23/11/2026, às 10h57 (Bahia), com "ok com as
-- recomendações", em docs/design/aprovadas/portal-sino-caso-encerrado. As cinco respostas:
--   1. recebem todos com a área Financeiro e financeiro.editar, menos quem fez a ação no
--      Financeiro; quem encerra pelo Jurídico também recebe, se tiver o Financeiro;
--   2. não há lembrete no dia do vencimento;
--   3. o aviso sai também quando as parcelas seguem com outro caso (motivo OUTRO_CASO);
--   4. encerrar no financeiro não marca o aviso dos outros como lido;
--   5. o aviso de quando o caso fecha é o item próprio F3.150.
--
-- "Pronto" é a mesma regra do botão "Encerrar no financeiro": caso_acerto(...) -> 'pendencias'
-- vazia (0900), com quatro condições a mais que só restringem (caso_pronto_escopo): o caso está
-- encerrado com resultado, não tem levantamento, tem contrato ligado ativo ou encerrado e ainda
-- não foi encerrado no financeiro.
--
-- Cada vez que o caso fica pronto abre um período em casos_prontos_fechar, e o aviso nasce uma vez
-- por período. O período fecha quando o caso volta a ter pendência (PENDENCIA), quando é encerrado
-- no financeiro (ENCERRADO) ou quando ganha levantamento (FORA). Os períodos se ordenam por
-- `ordem` (identidade), nunca por pronto_em, que é a hora do início da transação.
--
-- Gatilhos em dois tempos:
--   a. na hora, um gatilho comum por tabela anota em t3jus.casos_prontos (configuração local da
--      transação) os casos que podem ter mudado de estado, com o escritório e o motivo. Só anota
--      o caso que está no escopo ou tem período aberto: a importação e as rotinas em massa ficam
--      de fora quase de graça;
--   b. no fim da transação, uma função adiada genérica (caso_pronto_fim) esvazia a anotação e
--      confere todos os casos anotados em ordem de caso_id (sem deadlock entre duas transações
--      que tocam os mesmos casos em ordem trocada). Os eventos seguintes acham a anotação vazia.
-- caso_pronto_fim é security definer, dona dominio: no Postgres 17 o gatilho adiado roda com o
-- papel ativo no commit, que, pela API, é o service_role, sem privilégio nas tabelas. Rodar com
-- o papel que enfileirou o evento só vem no Postgres 18. O fechar_acesso dá execute nela ao
-- service_role; é inofensivo, porque função de gatilho não se chama fora de gatilho.
-- Nada do tempo adiado derruba o commit: a conferência de cada caso fica num bloco de exceção que
-- registra financeiro.caso_pronto_falhou no histórico interno (caso_pronto_registrar) e segue
-- (o aviso nunca impede o recebimento).
--
-- O escritório vem sempre de NEW.escritorio_id/OLD.escritorio_id ou da lista da rotina, nunca do
-- navegador; a conferência sai sem gravar quando o contexto da transação não é o do caso.
-- casos.situacao só tem ANDAMENTO e ENCERRADO (0240) e o contrato não volta de ATIVO nem de
-- ENCERRADO (0200): na prática, FORA só nasce do levantamento. Outra saída do escopo fecha com
-- PENDENCIA e registra financeiro.caso_pronto_fora_sem_levantamento, para aparecer se acontecer.
--
-- Tabela ou coluna nova que entra no caso_acerto ganha o gatilho de anotar e o caso_pronto_fim.

-- ---------------------------------------------------------------------------------------
-- 1. O tipo novo no sino (lê a lista atual do check, como a 0854).
do $$
declare
  v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'CASO_PRONTO_FECHAR') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

-- A regra das 24 horas e o "depois" de cada pessoa.
create index avisos_sino_caso_pronto on avisos_sino (origem_id, pessoa_id, criado_em desc) where tipo = 'CASO_PRONTO_FECHAR';

-- ---------------------------------------------------------------------------------------
-- 2. Os períodos em que o caso esteve pronto para encerrar.
create table casos_prontos_fechar (
  id             uuid primary key default gen_random_uuid(),
  ordem          bigint generated always as identity,
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null references casos (id) on delete restrict,
  pronto_em      timestamptz not null default app_now(),
  motivo         text not null check (motivo in ('PAGAMENTO', 'REEMBOLSO', 'EXITO', 'CONTRATO_ENCERRADO', 'CASO_ENCERRADO', 'OUTRO_CASO', 'ROTINA')),
  saiu_em        timestamptz,
  saiu_por       text check (saiu_por in ('PENDENCIA', 'ENCERRADO', 'FORA')),
  check ((saiu_em is null) = (saiu_por is null))
);
create unique index casos_prontos_fechar_aberto on casos_prontos_fechar (caso_id) where saiu_em is null;
create index casos_prontos_fechar_caso on casos_prontos_fechar (caso_id, ordem desc);
call proteger_tabela_escritorio('casos_prontos_fechar');

-- O período não se apaga nem se muda: só se fecha, uma vez.
create function casos_prontos_fechar_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.saiu_em is not null
     or (to_jsonb(new) - 'saiu_em' - 'saiu_por') is distinct from (to_jsonb(old) - 'saiu_em' - 'saiu_por') then
    raise exception 'Período de caso pronto não se muda nem se apaga: só se fecha, uma vez' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger casos_prontos_fechar_guardiao before update or delete on casos_prontos_fechar
  for each row execute function casos_prontos_fechar_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('casos_prontos_fechar', true,
  'Quando o caso encerrado ficou pronto para encerrar no financeiro, o que o deixou pronto e quando deixou de estar',
  'Avisar uma vez quem tem o Financeiro e mostrar no aviso o que aconteceu depois (EX-16, EX-17)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório', 'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- 3. As regras. Sem security definer: só se chamam de dentro da conferência, da rotina e das
-- leituras do sino.

-- O caso pode ficar pronto (as regras 1 a 4 do plano aprovado, sem caso_acerto).
create function caso_pronto_escopo(p_escritorio uuid, p_caso uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from casos ca
     where ca.id = p_caso and ca.escritorio_id = p_escritorio
       and ca.situacao = 'ENCERRADO' and coalesce(ca.encerrado_por, 'RESULTADO') = 'RESULTADO'
       and not exists (select 1 from levantamentos l where l.caso_id = ca.id)
       and exists (select 1 from caso_clientes cc join contratos c on c.id = cc.contrato_id
                    where cc.caso_id = ca.id and c.estado in ('ATIVO', 'ENCERRADO'))
       and not exists (select 1 from fechamentos_caso f where f.caso_id = ca.id))
$$;

-- A regra inteira, escrita num lugar só (para ler e para os testes). A conferência não a chama:
-- ela lê o acerto uma vez e reaproveita o resultado.
create function caso_pronto_fechar(p_escritorio uuid, p_caso uuid) returns boolean
language sql stable
set search_path = public
as $$
  select case when caso_pronto_escopo(p_escritorio, p_caso)
              then jsonb_array_length(caso_acerto(p_escritorio, p_caso) -> 'pendencias') = 0
              else false end
$$;

-- Os dados do aviso, sem valor em reais (PT-02).
create function caso_pronto_dados(p_escritorio uuid, p_caso uuid, p_periodo uuid, p_denovo boolean, p_motivos jsonb, p_acerto jsonb)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'caso', ca.nome,
    'clientes', (select jsonb_agg(x.nome order by x.ordem) from (
                   select k.nome, cc.ordem from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                    where cc.caso_id = p_caso order by cc.ordem limit 2) x),
    'maisClientes', nullif(greatest((select count(*) from caso_clientes cc where cc.caso_id = p_caso) - 2, 0), 0),
    'contratoId', ct.id,
    'contrato', ct.numero,
    'parcelas', (p_acerto -> 'parcelas' ->> 'total')::int,
    'motivo', p_motivos ->> 'motivo',
    'exito', p_motivos ->> 'exito',
    'contratoEncerrado', p_motivos ->> 'contratoEncerrado',
    'outroCaso', p_motivos ->> 'outroCaso',
    'contratoSegue', p_motivos ->> 'contratoSegue',
    -- A descrição da conta é escrita à mão: vai cortada e nunca com valor.
    'reembolso', case when (p_motivos ->> 'reembolso') !~ '(R\$|\d+,\d{2})' then left(p_motivos ->> 'reembolso', 80) end,
    'denovo', case when p_denovo then true end,
    'periodoId', p_periodo,
    'quem', (select p.nome from pessoas p where p.id = (p_motivos ->> 'autor')::uuid))
    from casos ca
    left join lateral (
      select c.id, c.numero from caso_clientes cc join contratos c on c.id = cc.contrato_id
       where cc.caso_id = ca.id and c.estado in ('ATIVO', 'ENCERRADO')
       order by c.numero limit 1) ct on true
   where ca.id = p_caso and ca.escritorio_id = p_escritorio
$$;

-- Quem recebe: todo sócio (todo sócio é dono e tem as quatro áreas) e a equipe com a área
-- Financeiro liberada. O pode(…, 'financeiro.editar') fica como defesa. Quem fez a ação no
-- Financeiro fica de fora (autorFora); quem encerrou pelo Jurídico, não. Regra das 24 horas: não
-- grava para quem já tem aviso deste caso não lido e de menos de 24 horas.
create function caso_pronto_avisar(p_escritorio uuid, p_caso uuid, p_dados jsonb, p_motivos jsonb) returns void
language plpgsql
set search_path = public
as $$
declare
  d uuid;
  v_autor uuid := case when coalesce((p_motivos ->> 'autorFora')::boolean, false) then (p_motivos ->> 'autor')::uuid end;
begin
  for d in select distinct v.pessoa_id from vinculos v
            where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null
              and 'FINANCEIRO' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
              and pode(v.pessoa_id, p_escritorio, 'financeiro.editar')
            order by v.pessoa_id loop
    if exists (select 1 from avisos_sino s
                where s.tipo = 'CASO_PRONTO_FECHAR' and s.origem_id = p_caso and s.pessoa_id = d
                  and s.lido_em is null and s.criado_em > app_now() - interval '24 hours') then
      continue;
    end if;
    perform aviso_sino(p_escritorio, d, v_autor, 'CASO_PRONTO_FECHAR', 'casos', p_caso, p_dados);
  end loop;
end $$;

-- O histórico interno da conferência. registrar_historico_interno só grava com o contexto da
-- equipe T3jus (0060) e lê de volta a linha (returning), que o escritório não vê; a conferência
-- roda no contexto do escritório. Esta política deixa o domínio gravar, como interno e no
-- escritório do contexto, só os dois eventos da conferência, e só enquanto caso_pronto_registrar
-- liga a marca (o mesmo molde de rotina_prazos_inserir, 0210). Os dados nunca levam nome.
create policy caso_pronto_historico on historico for insert to dominio
  with check (current_setting('t3jus.caso_pronto_historico', true) = 'on' and interno
              and acao in ('financeiro.caso_pronto_falhou', 'financeiro.caso_pronto_fora_sem_levantamento')
              and escritorio_id is not distinct from contexto_escritorio());

create function caso_pronto_registrar(p_acao text, p_caso uuid, p_dados jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('t3jus.caso_pronto_historico', 'on', true);
  insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  values (app_now(), contexto_escritorio(), case when contexto_pessoa() is null then 'SISTEMA' else 'PESSOA' end::tipo_autor,
          contexto_pessoa(), p_acao, 'casos', p_caso::text, p_dados, true);
  perform set_config('t3jus.caso_pronto_historico', 'off', true);
exception when others then
  perform set_config('t3jus.caso_pronto_historico', 'off', true);
  raise;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A conferência de um caso. p_motivos é a anotação do caso (o escritório, o motivo, o autor e
-- os campos do motivo). Tudo num bloco de exceção: o pagamento nunca cai por causa do aviso.
create function caso_pronto_conferir(p_escritorio uuid, p_caso uuid, p_motivos jsonb) returns void
language plpgsql
set search_path = public
as $$
declare
  v_aberto casos_prontos_fechar;
  v_escopo boolean;
  v_acerto jsonb;
  v_pronto boolean := false;
  v_saida text;
  v_periodo uuid;
  v_denovo boolean;
begin
  begin
    -- 1. Contexto: com o escritório errado, o acerto viria vazio. Sai sem gravar; a rotina refaz.
    if p_escritorio is null or contexto_escritorio() is distinct from p_escritorio then return; end if;
    if not exists (select 1 from casos where id = p_caso and escritorio_id = p_escritorio) then return; end if;
    -- 2. Uma conferência por caso de cada vez, antes de ler.
    perform pg_advisory_xact_lock(hashtextextended('t3jus.caso_pronto:' || p_caso::text, 0));
    -- 3 e 4. O período aberto e o filtro barato, sem caso_acerto.
    select * into v_aberto from casos_prontos_fechar where caso_id = p_caso and saiu_em is null;
    v_escopo := caso_pronto_escopo(p_escritorio, p_caso);
    if v_aberto.id is null and not v_escopo then return; end if;
    -- 5. O acerto, uma vez.
    if v_escopo then
      v_acerto := caso_acerto(p_escritorio, p_caso);
      v_pronto := jsonb_array_length(v_acerto -> 'pendencias') = 0;
    end if;
    -- 6. Com período aberto: fecha, ou segue como está. Nenhum aviso sai ao fechar.
    if v_aberto.id is not null then
      if exists (select 1 from fechamentos_caso f where f.caso_id = p_caso) then
        v_saida := 'ENCERRADO';
      elsif exists (select 1 from levantamentos l where l.caso_id = p_caso) then
        v_saida := 'FORA';
      elsif not v_escopo then
        v_saida := 'PENDENCIA';
        perform caso_pronto_registrar('financeiro.caso_pronto_fora_sem_levantamento', p_caso,
          jsonb_build_object('periodo', v_aberto.id));
      elsif not v_pronto then
        v_saida := 'PENDENCIA';
      end if;
      if v_saida is not null then
        update casos_prontos_fechar set saiu_em = app_now(), saiu_por = v_saida where id = v_aberto.id;
      end if;
      return;
    end if;
    if not v_pronto then return; end if;
    -- 7. Pronto e sem período aberto: abre o período e avisa.
    insert into casos_prontos_fechar (escritorio_id, caso_id, motivo)
    values (p_escritorio, p_caso, coalesce(p_motivos ->> 'motivo', 'ROTINA'))
    on conflict (caso_id) where saiu_em is null do nothing
    returning id into v_periodo;
    if v_periodo is null then return; end if;
    v_denovo := exists (select 1 from casos_prontos_fechar where caso_id = p_caso and id <> v_periodo);
    perform caso_pronto_avisar(p_escritorio, p_caso,
      caso_pronto_dados(p_escritorio, p_caso, v_periodo, v_denovo, p_motivos, v_acerto), p_motivos);
  exception when others then
    begin
      perform caso_pronto_registrar('financeiro.caso_pronto_falhou', p_caso,
        jsonb_build_object('erro', left(sqlerrm, 200), 'codigo', sqlstate));
    exception when others then null;
    end;
  end;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Os gatilhos em dois tempos.

-- (a) Anotar: grava o caso na anotação da transação, se ele pode mudar de estado. Fica o motivo
-- de maior prioridade, com os campos dele.
create function caso_pronto_anotar(p_escritorio uuid, p_caso uuid, p_anotacao jsonb) returns void
language plpgsql
set search_path = public
as $$
declare
  v_obj jsonb := coalesce(nullif(current_setting('t3jus.casos_prontos', true), ''), '{}')::jsonb;
  v_atual jsonb;
  v_ordem constant text[] := array['PAGAMENTO', 'REEMBOLSO', 'EXITO', 'CONTRATO_ENCERRADO', 'CASO_ENCERRADO', 'OUTRO_CASO', 'ROTINA'];
begin
  if p_escritorio is null or p_caso is null then return; end if;
  v_atual := v_obj -> p_caso::text;
  if v_atual is not null
     and array_position(v_ordem, v_atual ->> 'motivo') <= array_position(v_ordem, p_anotacao ->> 'motivo') then
    return;
  end if;
  if v_atual is null
     and not caso_pronto_escopo(p_escritorio, p_caso)
     and not exists (select 1 from casos_prontos_fechar where caso_id = p_caso and saiu_em is null) then
    return;
  end if;
  perform set_config('t3jus.casos_prontos',
    (v_obj || jsonb_build_object(p_caso::text,
      jsonb_strip_nulls(p_anotacao || jsonb_build_object('escritorio', p_escritorio, 'autor', contexto_pessoa()))))::text, true);
end $$;

-- Os casos encerrados ligados a um contrato (pelo índice caso_clientes_contrato).
create function caso_pronto_casos_do_contrato(p_contrato uuid) returns setof uuid
language sql stable
set search_path = public
as $$
  select distinct cc.caso_id from caso_clientes cc join casos ca on ca.id = cc.caso_id
   where cc.contrato_id = p_contrato and ca.situacao = 'ENCERRADO'
$$;

-- Os encerrados sem fechamento que dividem algum contrato com o caso (sem ele).
create function caso_pronto_casos_vizinhos(p_caso uuid) returns setof uuid
language sql stable
set search_path = public
as $$
  select distinct o.caso_id from caso_clientes cc
    join caso_clientes o on o.contrato_id = cc.contrato_id and o.caso_id <> p_caso
    join casos ca on ca.id = o.caso_id
   where cc.caso_id = p_caso and cc.contrato_id is not null and ca.situacao = 'ENCERRADO'
     and not exists (select 1 from fechamentos_caso f where f.caso_id = o.caso_id)
$$;

create function caso_pronto_anotar_pagamentos() returns trigger
language plpgsql
set search_path = public
as $$
declare
  r recebimentos_previstos;
  v_caso_exito uuid;
  v uuid;
begin
  select * into r from recebimentos_previstos where id = new.parcela_id;
  if r.id is null then return null; end if;
  if r.exito_id is not null then select caso_id into v_caso_exito from exitos_conferir where id = r.exito_id; end if;
  for v in select * from caso_pronto_casos_do_contrato(r.contrato_id) loop
    perform caso_pronto_anotar(new.escritorio_id, v,
      case when v = v_caso_exito then '{"motivo": "EXITO", "exito": "PAGO", "autorFora": true}'::jsonb
           else '{"motivo": "PAGAMENTO", "autorFora": true}'::jsonb end);
  end loop;
  return null;
end $$;

create function caso_pronto_anotar_parcelas() returns trigger
language plpgsql
set search_path = public
as $$
declare
  c contratos;
  v uuid;
  v_anot jsonb := '{"motivo": "ROTINA", "autorFora": true}';
begin
  select * into c from contratos where id = new.contrato_id;
  if tg_op = 'UPDATE' and new.cancelado_em is not null and old.cancelado_em is null and c.estado = 'ENCERRADO' then
    v_anot := jsonb_build_object('motivo', 'CONTRATO_ENCERRADO', 'contratoEncerrado', c.numero, 'autorFora', true);
  end if;
  for v in select * from caso_pronto_casos_do_contrato(new.contrato_id) loop
    perform caso_pronto_anotar(new.escritorio_id, v, v_anot);
  end loop;
  return null;
end $$;

create function caso_pronto_anotar_contratos() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v uuid;
  v_anot jsonb := case when new.estado = 'ENCERRADO'
                       then jsonb_build_object('motivo', 'CONTRATO_ENCERRADO', 'contratoEncerrado', new.numero, 'autorFora', true)
                       else '{"motivo": "ROTINA", "autorFora": true}'::jsonb end;
begin
  for v in select * from caso_pronto_casos_do_contrato(new.id) loop
    perform caso_pronto_anotar(new.escritorio_id, v, v_anot);
  end loop;
  return null;
end $$;

create function caso_pronto_anotar_exitos() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform caso_pronto_anotar(new.escritorio_id, new.caso_id,
    case when new.situacao = 'NAO_COBRADO' then '{"motivo": "EXITO", "exito": "NAO_COBRADO", "autorFora": true}'::jsonb
         else '{"motivo": "ROTINA", "autorFora": true}'::jsonb end);
  return null;
end $$;

create function caso_pronto_anotar_contas() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.reembolsado_em is not null and old.reembolsado_em is null then
    perform caso_pronto_anotar(new.escritorio_id, new.caso_id,
      jsonb_build_object('motivo', 'REEMBOLSO', 'reembolso', new.descricao, 'autorFora', true));
  else
    perform caso_pronto_anotar(new.escritorio_id, new.caso_id, '{"motivo": "ROTINA", "autorFora": true}');
  end if;
  if tg_op = 'UPDATE' and old.caso_id is distinct from new.caso_id then
    perform caso_pronto_anotar(old.escritorio_id, old.caso_id, '{"motivo": "ROTINA", "autorFora": true}');
  end if;
  return null;
end $$;

create function caso_pronto_anotar_levantamentos() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform caso_pronto_anotar(new.escritorio_id, new.caso_id, '{"motivo": "ROTINA", "autorFora": true}');
  return null;
end $$;

create function caso_pronto_anotar_casos() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v uuid;
begin
  -- O caso: passou a ENCERRADO, ou só o encerrado_por mudou ("Registrar o resultado", 0921).
  perform caso_pronto_anotar(new.escritorio_id, new.id,
    case when new.situacao = 'ENCERRADO' and old.situacao is distinct from 'ENCERRADO'
         then '{"motivo": "CASO_ENCERRADO", "autorFora": false}'::jsonb
         else '{"motivo": "ROTINA", "autorFora": false}'::jsonb end);
  for v in select * from caso_pronto_casos_vizinhos(new.id) order by 1 loop
    perform caso_pronto_anotar(new.escritorio_id, v, '{"motivo": "ROTINA", "autorFora": false}');
  end loop;
  return null;
end $$;

create function caso_pronto_anotar_caso_clientes() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_linha caso_clientes := case when tg_op = 'DELETE' then old else new end;
  v_caso casos;
  v_contrato contratos;
  v_contratos uuid[];
  v uuid;
  v_ganhou boolean;
begin
  select * into v_caso from casos where id = v_linha.caso_id;
  perform caso_pronto_anotar(v_linha.escritorio_id, v_linha.caso_id, '{"motivo": "ROTINA", "autorFora": false}');
  v_contratos := array_remove(array[case when tg_op <> 'DELETE' then new.contrato_id end,
                                    case when tg_op <> 'INSERT' then old.contrato_id end], null);
  -- O caso da linha está em andamento e ganhou o contrato: as parcelas que faltam seguem com ele.
  v_ganhou := tg_op <> 'DELETE' and new.contrato_id is not null and v_caso.situacao = 'ANDAMENTO';
  if v_ganhou then select * into v_contrato from contratos where id = new.contrato_id; end if;
  for v in select distinct x from unnest(v_contratos) c, caso_pronto_casos_do_contrato(c) x
            where x <> v_linha.caso_id order by 1 loop
    perform caso_pronto_anotar(v_linha.escritorio_id, v,
      case when v_ganhou and exists (select 1 from caso_clientes o where o.caso_id = v and o.contrato_id = new.contrato_id)
           then jsonb_build_object('motivo', 'OUTRO_CASO', 'outroCaso', v_caso.nome, 'contratoSegue', v_contrato.numero, 'autorFora', false)
           else '{"motivo": "ROTINA", "autorFora": false}'::jsonb end);
  end loop;
  return null;
end $$;

create function caso_pronto_anotar_fechamentos() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform caso_pronto_anotar(new.escritorio_id, new.caso_id, '{"motivo": "ROTINA", "autorFora": true}');
  return null;
end $$;

-- (b) Conferir, no fim. O primeiro evento adiado confere todos os casos anotados, em ordem de
-- caso_id; os seguintes acham a anotação vazia e saem na primeira linha.
create function caso_pronto_fim() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obj jsonb := nullif(nullif(current_setting('t3jus.casos_prontos', true), ''), '{}')::jsonb;
  k text;
begin
  if v_obj is null or v_obj = '{}'::jsonb then return null; end if;
  perform set_config('t3jus.casos_prontos', '{}', true);
  for k in select key from jsonb_object_keys(v_obj) key order by key::uuid loop
    perform caso_pronto_conferir((v_obj -> k ->> 'escritorio')::uuid, k::uuid, v_obj -> k);
  end loop;
  return null;
end $$;

-- Os gatilhos. O de anotar e o adiado da mesma tabela têm o mesmo "when": a fila do commit não
-- cresce com update que não muda nada.
create trigger caso_pronto_anotar after insert on pagamentos_recebidos
  for each row execute function caso_pronto_anotar_pagamentos();
create constraint trigger caso_pronto_fim after insert on pagamentos_recebidos
  deferrable initially deferred for each row execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on recebimentos_previstos
  for each row execute function caso_pronto_anotar_parcelas();
create constraint trigger caso_pronto_fim after insert on recebimentos_previstos
  deferrable initially deferred for each row execute function caso_pronto_fim();
create trigger caso_pronto_anotar_mudou after update on recebimentos_previstos
  for each row when (old.cancelado_em is distinct from new.cancelado_em or old.valor is distinct from new.valor)
  execute function caso_pronto_anotar_parcelas();
create constraint trigger caso_pronto_fim_mudou after update on recebimentos_previstos
  deferrable initially deferred
  for each row when (old.cancelado_em is distinct from new.cancelado_em or old.valor is distinct from new.valor)
  execute function caso_pronto_fim();

create trigger caso_pronto_anotar_mudou after update on contratos
  for each row when (old.estado is distinct from new.estado) execute function caso_pronto_anotar_contratos();
create constraint trigger caso_pronto_fim_mudou after update on contratos
  deferrable initially deferred
  for each row when (old.estado is distinct from new.estado) execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on exitos_conferir
  for each row execute function caso_pronto_anotar_exitos();
create constraint trigger caso_pronto_fim after insert on exitos_conferir
  deferrable initially deferred for each row execute function caso_pronto_fim();
create trigger caso_pronto_anotar_mudou after update on exitos_conferir
  for each row when (old.situacao is distinct from new.situacao) execute function caso_pronto_anotar_exitos();
create constraint trigger caso_pronto_fim_mudou after update on exitos_conferir
  deferrable initially deferred
  for each row when (old.situacao is distinct from new.situacao) execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on contas_pagar
  for each row when (new.caso_id is not null) execute function caso_pronto_anotar_contas();
create constraint trigger caso_pronto_fim after insert on contas_pagar
  deferrable initially deferred
  for each row when (new.caso_id is not null) execute function caso_pronto_fim();
create trigger caso_pronto_anotar_mudou after update on contas_pagar
  for each row when ((old.reembolsado_em is distinct from new.reembolsado_em or old.cancelada_em is distinct from new.cancelada_em
                      or old.caso_id is distinct from new.caso_id) and (old.caso_id is not null or new.caso_id is not null))
  execute function caso_pronto_anotar_contas();
create constraint trigger caso_pronto_fim_mudou after update on contas_pagar
  deferrable initially deferred
  for each row when ((old.reembolsado_em is distinct from new.reembolsado_em or old.cancelada_em is distinct from new.cancelada_em
                      or old.caso_id is distinct from new.caso_id) and (old.caso_id is not null or new.caso_id is not null))
  execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on levantamentos
  for each row execute function caso_pronto_anotar_levantamentos();
create constraint trigger caso_pronto_fim after insert on levantamentos
  deferrable initially deferred for each row execute function caso_pronto_fim();

create trigger caso_pronto_anotar_mudou after update on casos
  for each row when (old.situacao is distinct from new.situacao or old.encerrado_por is distinct from new.encerrado_por)
  execute function caso_pronto_anotar_casos();
create constraint trigger caso_pronto_fim_mudou after update on casos
  deferrable initially deferred
  for each row when (old.situacao is distinct from new.situacao or old.encerrado_por is distinct from new.encerrado_por)
  execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on caso_clientes
  for each row when (new.contrato_id is not null) execute function caso_pronto_anotar_caso_clientes();
create constraint trigger caso_pronto_fim after insert on caso_clientes
  deferrable initially deferred
  for each row when (new.contrato_id is not null) execute function caso_pronto_fim();
create trigger caso_pronto_anotar_mudou after update on caso_clientes
  for each row when (old.contrato_id is distinct from new.contrato_id) execute function caso_pronto_anotar_caso_clientes();
create constraint trigger caso_pronto_fim_mudou after update on caso_clientes
  deferrable initially deferred
  for each row when (old.contrato_id is distinct from new.contrato_id) execute function caso_pronto_fim();
create trigger caso_pronto_anotar_saiu after delete on caso_clientes
  for each row when (old.contrato_id is not null) execute function caso_pronto_anotar_caso_clientes();
create constraint trigger caso_pronto_fim_saiu after delete on caso_clientes
  deferrable initially deferred
  for each row when (old.contrato_id is not null) execute function caso_pronto_fim();

create trigger caso_pronto_anotar after insert on fechamentos_caso
  for each row execute function caso_pronto_anotar_fechamentos();
create constraint trigger caso_pronto_fim after insert on fechamentos_caso
  deferrable initially deferred for each row execute function caso_pronto_fim();

-- ---------------------------------------------------------------------------------------
-- 6. A rotina diária, às 7h de Brasília: a rede para o que nenhum gatilho viu (a parcela que
-- passou do dia sem pagamento não muda o acerto, mas um gatilho esquecido sim).
create policy rotina_casos_prontos_ler on escritorios for select
  using (current_setting('t3jus.casos_prontos_rotina', true) = 'on');

create function avisar_casos_prontos_fechar() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lista uuid[];
  v_esc uuid;
  v_caso uuid;
  v_antes bigint;
  v_n integer := 0;
begin
  perform limpar_contexto();
  perform set_config('t3jus.casos_prontos_rotina', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.casos_prontos_rotina', 'off', true);
  foreach v_esc in array v_lista loop
    begin
      perform entrar_escritorio_servico(v_esc);
      if contrato_situacao(v_esc) in ('CONSULTA', 'FECHADO') then continue; end if;
      select coalesce(max(ordem), 0) into v_antes from casos_prontos_fechar where escritorio_id = v_esc;
      -- Cada caso já tem o próprio bloco de exceção, dentro da conferência.
      for v_caso in
        select ca.id from casos ca
         where ca.escritorio_id = v_esc and ca.situacao = 'ENCERRADO' and coalesce(ca.encerrado_por, 'RESULTADO') = 'RESULTADO'
           and not exists (select 1 from fechamentos_caso f where f.caso_id = ca.id)
           and not exists (select 1 from levantamentos l where l.caso_id = ca.id)
        union
        select p.caso_id from casos_prontos_fechar p where p.escritorio_id = v_esc and p.saiu_em is null
        order by 1
      loop
        perform caso_pronto_conferir(v_esc, v_caso,
          jsonb_build_object('escritorio', v_esc, 'motivo', 'ROTINA', 'autorFora', true));
      end loop;
      v_n := v_n + (select count(*) from casos_prontos_fechar where escritorio_id = v_esc and ordem > v_antes);
    exception when others then
      null; -- um escritório com erro não derruba os outros; a rotina refaz no dia seguinte.
    end;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-casos-prontos-fechar', '0 10 * * *', 'select public.avisar_casos_prontos_fechar()');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. O "agora" do aviso: o que aconteceu com o caso depois. Só buscas por índice; nunca chama
-- caso_acerto. Vale a primeira que bater:
--   1. o caso foi encerrado no financeiro: encerrado, com quando e quem;
--   2. a mesma pessoa tem aviso de um período mais novo do caso: depois ("Aviso antigo");
--   3. o período de referência fechou com PENDENCIA (pendente) ou com FORA (fora).
-- O período de referência é o do aviso, ou o mais novo do caso quando há um mais novo que a
-- pessoa não recebeu (a regra das 24 horas a segurou): aberto, sem "agora".
create function caso_pronto_agora(p_caso uuid, p_periodo uuid, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with p as (select * from casos_prontos_fechar where id = p_periodo and caso_id = p_caso),
  novo as (select n.saiu_por from casos_prontos_fechar n, p where n.caso_id = p_caso and n.ordem > p.ordem
            order by n.ordem desc limit 1),
  f as (select fechado_em, fechado_por from fechamentos_caso where caso_id = p_caso)
  select case
    when exists (select 1 from f)
      then (select jsonb_build_object('encerrado', jsonb_build_object('em', f.fechado_em, 'por', pessoa_ref(f.fechado_por))) from f)
    when exists (select 1 from avisos_sino s join casos_prontos_fechar n on n.id = (s.dados ->> 'periodoId')::uuid, p
                  where s.tipo = 'CASO_PRONTO_FECHAR' and s.origem_id = p_caso and s.pessoa_id = p_pessoa and n.ordem > p.ordem)
      then '{"depois": true}'::jsonb
    when (case when exists (select 1 from novo) then (select saiu_por from novo) else (select saiu_por from p) end) = 'PENDENCIA'
      then '{"pendente": true}'::jsonb
    when (case when exists (select 1 from novo) then (select saiu_por from novo) else (select saiu_por from p) end) = 'FORA'
      then '{"fora": true}'::jsonb
  end
$$;

create or replace function aviso_sino_linha(a avisos_sino) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', a.id, 'tipo', a.tipo, 'dados', a.dados, 'origem', a.origem_tabela, 'origemId', a.origem_id,
                            'em', a.criado_em, 'lido', a.lido_em is not null)
      || case when a.tipo = 'CASO_PRONTO_FECHAR'
              then coalesce((select jsonb_build_object('agora', g)
                               from caso_pronto_agora(a.origem_id, (a.dados ->> 'periodoId')::uuid, a.pessoa_id) g
                              where g is not null), '{}'::jsonb)
              else '{}'::jsonb end
$$;

-- ---------------------------------------------------------------------------------------
-- 8. A folha do contrato pela regra da 0921: o caso que veio encerrado da importação só entra
-- com levantamento (o repasse não some); sem levantamento, fica fora até registrar o resultado.
create function t990_trocar(p_funcao regprocedure, p_de text, p_para text) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> 1 then raise exception 'O trecho aparece % vezes em % (esperado 1): %', v_n, p_funcao, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

select t990_trocar('portal_financeiro_contrato_fechamentos(uuid,uuid,uuid)',
  $q$and ca.encerrado_por is distinct from 'IMPORTACAO_DESFEITA'$q$,
  $q$and (coalesce(ca.encerrado_por, 'RESULTADO') = 'RESULTADO'
                   or (ca.encerrado_por = 'IMPORTADO_ENCERRADO' and exists (select 1 from levantamentos lv where lv.caso_id = ca.id)))$q$);

drop function t990_trocar(regprocedure, text, text);

call fechar_acesso();
