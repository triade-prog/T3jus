-- 1184 · Implantação assistida, parte 5: os avisos no sino do Console (F1.46; CO-08). Plano
-- aprovado em docs/design/aprovadas/console-implantacao/PLANO.md (seção 4.4, a linha da 1184 na
-- seção 5 e o PR 5), com a revisão em REVISAO.md (correção 17: cascade, porque avisos_console não
-- tem escritorio_id e terminar_guarda não o apaga), o desenho em NOTAS.md (item 9: o sino aprovado
-- com textos novos) e as decisões da Carol em DC14 (nos 30 dias, só avisos e troca do prazo; nada
-- passa a Ativo sozinho). Depende da 0590, da 0691 e da 1180 a 1183.
--
--  * avisos_console ganha três tipos e a coluna implantacao_id (references implantacoes on delete
--    cascade: o aviso sai junto quando o fim da guarda apaga a implantação):
--      - IMPLANTACAO_PRAZO, aos 7, 3 e 0 dias do prazo (implantacao_id obrigatório);
--      - IMPLANTACAO_ISENCAO_FIM, 30 dias antes de implantacao_regras.isencao_ate (sem id: a regra
--        é global);
--      - IMPLANTACAO_CARNE_RECUSADO, quando a rotina pula a 1ª fatura de quem tem a implantação
--        cobrada no carnê (o evento implantacao.carne_recusado da 1182), com o id da implantação
--        quando ela já existe.
--  * Quem recebe (implantacao_avisados): quem acompanha (se ainda pode acompanhar) e a
--    Administração que atende o escritório; sem Administração atribuída, toda a Administração
--    ativa, para o aviso não se perder. Sem responsável, só a Administração. O fim da isenção vai
--    para toda a Administração ativa. O sino mostra o aviso de implantação a quem tem
--    console.implantacao.ver e o fim da isenção a quem tem console.implantacao.regras.
--  * implantacao_rotina(): os avisos de prazo e de fim da isenção, uma vez cada. O prazo conta do
--    prazo_ate de agora: mudar o prazo faz os marcos valerem de novo para a data nova, e só o marco
--    do dia sai (prazo trocado para daqui a 2 dias dá o aviso de 3 dias, não o de 7). Passado o
--    prazo, nenhum aviso novo: a ficha mostra o atraso. Um escritório com erro não derruba os outros.
--    Não muda estado nenhum: nada passa a Ativo sozinho (DC14).
--  * O gancho: um job próprio do pg_cron (t3jus-implantacao, 8h de Brasília, a hora do desenho),
--    e não um passo de cobranca_rotina. A 1161 do CO-09 (ainda não mesclada) renomeia
--    cobranca_rotina para cobranca_rotina_sem_teste e põe um envoltório; recriar ou envolver
--    cobranca_rotina aqui dependeria da ordem das duas. O job vale com ou sem a 1161, e o aviso
--    chega também a quem ainda não tem assinatura nem primeira_competencia (cobranca_rotina pula
--    esses escritórios antes de qualquer passo).
--  * O aviso do carnê nasce do evento implantacao.carne_recusado (gatilho em fatura_eventos, como o
--    de fatura em atraso da 0691), seja quem for que chamou cobranca_emitir_pendentes (a rotina
--    diária ou o passo do teste da 1161). Uma vez por escritório e competência (o evento é diário,
--    o aviso não). Um erro no aviso nunca derruba a rotina da cobrança.

-- ---------------------------------------------------------------------------------------
-- 1. Os tipos novos

alter table avisos_console drop constraint avisos_console_tipo_check;
alter table avisos_console add constraint avisos_console_tipo_check
  check (tipo in ('INTERESSADO_NOVO', 'INTERESSADO_ATRIBUIDO', 'INTERESSADO_VENCIDO', 'FATURA_ATRASO',
                  'IMPLANTACAO_PRAZO', 'IMPLANTACAO_ISENCAO_FIM', 'IMPLANTACAO_CARNE_RECUSADO'));
-- A implantação do aviso: sai junto com ela no fim da guarda (revisão, 17).
alter table avisos_console add column implantacao_id uuid references implantacoes (id) on delete cascade;
alter table avisos_console add constraint avisos_console_implantacao check (
  (tipo <> 'IMPLANTACAO_PRAZO' or implantacao_id is not null)
  and (implantacao_id is null or tipo in ('IMPLANTACAO_PRAZO', 'IMPLANTACAO_CARNE_RECUSADO')));
create index avisos_console_implantacao on avisos_console (implantacao_id) where implantacao_id is not null;

update inventario_dados
   set o_que = 'Avisos do sino da equipe T3jus: interessado (nome, trecho), fatura em atraso, prazo da implantação (quem acompanha e quem falta treinar) e quando foi lido',
       prazo = 'O mesmo do interessado ou da implantação',
       no_fim = 'Apagado junto com o interessado ou com a implantação (no fim da guarda)'
 where tabela = 'avisos_console';

-- ---------------------------------------------------------------------------------------
-- 2. Quem recebe

-- Toda a Administração ativa da equipe T3jus.
create function implantacao_administracao() returns setof uuid
language plpgsql stable
set search_path = public
as $$
declare v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  return query
    select distinct f.pessoa_id from equipe_funcoes f join equipe_t3 e on e.pessoa_id = f.pessoa_id and e.ativa
     where f.funcao = 'ADMINISTRACAO' and f.retirada_em is null
     order by 1;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
end $$;

-- Quem acompanha (se ainda pode) e a Administração que atende o escritório; sem Administração
-- atribuída, toda a Administração ativa.
create function implantacao_avisados(p_escritorio uuid, p_responsavel uuid) returns uuid[]
language plpgsql stable
set search_path = public
as $$
declare v_adm uuid[]; v_resp uuid[] := '{}';
begin
  select coalesce(array_agg(a.pessoa_id order by a.pessoa_id), '{}') into v_adm
    from implantacao_acompanhantes(p_escritorio) a where 'ADMINISTRACAO' = any (a.funcoes);
  if cardinality(v_adm) = 0 then
    select coalesce(array_agg(x order by x), '{}') into v_adm from implantacao_administracao() x;
  end if;
  if implantacao_pode_acompanhar(p_responsavel, p_escritorio) then v_resp := array[p_responsavel]; end if;
  return (select coalesce(array_agg(distinct x order by x), '{}') from unnest(v_resp || v_adm) x);
end $$;

create function implantacao_aviso(p_tipo text, p_implantacao uuid, p_pessoas uuid[], p_dados jsonb) returns integer
language plpgsql
set search_path = public
as $$
declare v_n integer;
begin
  insert into avisos_console (pessoa_id, tipo, implantacao_id, dados)
  select x, p_tipo, p_implantacao, jsonb_strip_nulls(p_dados) from unnest(p_pessoas) x where x is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O prazo e o fim da isenção, pela rotina

-- O marco do dia: 7, 3 ou 0 dias até o prazo (o menor que ainda cabe). Fora disso, nulo.
create function implantacao_marco(p_dias integer) returns integer
language sql immutable
as $$ select case when p_dias = 0 then 0 when p_dias between 1 and 3 then 3 when p_dias between 4 and 7 then 7 end $$;

-- O aviso de prazo de uma implantação aberta (no contexto do escritório). Uma vez por marco e por
-- prazo: o prazo mudado vale de novo. Devolve quantos avisos saíram.
create function implantacao_avisar_prazo(i implantacoes) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_dias integer := i.prazo_ate - hoje_brasilia();
  v_marco integer := implantacao_marco(v_dias);
  s jsonb;
  v_nome text;
  v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  if i.id is null or i.estado <> 'ABERTA' or v_marco is null then return 0; end if;
  if exists (select 1 from avisos_console a where a.implantacao_id = i.id and a.tipo = 'IMPLANTACAO_PRAZO'
                and a.dados ->> 'dias' = v_marco::text and a.dados ->> 'prazo' = i.prazo_ate::text) then
    return 0;
  end if;
  s := implantacao_situacao(i.escritorio_id);
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select nome into v_nome from escritorios where id = i.escritorio_id;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return implantacao_aviso('IMPLANTACAO_PRAZO', i.id, implantacao_avisados(i.escritorio_id, i.responsavel_id),
    jsonb_build_object(
      'escritorio', v_nome, 'escritorioId', i.escritorio_id, 'numero', i.numero,
      'prazo', i.prazo_ate, 'dias', v_marco,
      'treinadas', (s ->> 'treinadas')::int, 'total', (s ->> 'total')::int,
      -- Quem falta treinar (o desenho: "Faltam Tiago Ramos e Diego Alves").
      'faltam', (select jsonb_agg(p ->> 'nome' order by o) from jsonb_array_elements(s -> 'pessoas') with ordinality t(p, o)
                  where not (p -> 'treino' ->> 'treinada')::boolean),
      'responsavel', (select nome from pessoas where id = i.responsavel_id)));
end $$;

-- O aviso de fim da isenção: da data de corte menos 30 dias até ela, uma vez por data de corte,
-- para toda a Administração. Só com a regra ISENTA e uma data.
create function implantacao_avisar_isencao() returns integer
language plpgsql
set search_path = public
as $$
declare r implantacao_regras; v_dias integer;
begin
  select * into r from implantacao_regras;
  if r.condicao_padrao <> 'ISENTA' or r.isencao_ate is null then return 0; end if;
  v_dias := r.isencao_ate - hoje_brasilia();
  if v_dias not between 0 and 30 then return 0; end if;
  if exists (select 1 from avisos_console a where a.tipo = 'IMPLANTACAO_ISENCAO_FIM' and a.dados ->> 'isencaoAte' = r.isencao_ate::text) then
    return 0;
  end if;
  return implantacao_aviso('IMPLANTACAO_ISENCAO_FIM', null, (select coalesce(array_agg(x), '{}') from implantacao_administracao() x),
    jsonb_build_object('isencaoAte', r.isencao_ate, 'dias', v_dias, 'cobradaDesde', r.isencao_ate + 1,
                       'valorCentavos', r.valor_centavos));
end $$;

create function implantacao_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid;
  i implantacoes;
  v_lista uuid[];
  v_prazo integer := 0;
  v_falhas integer := 0;
  v_isencao integer;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios where guarda_terminada_em is null;
  perform set_config('t3jus.lendo_acesso', '', true);
  foreach e in array v_lista loop
    begin
      perform entrar_escritorio_servico(e);
      select * into i from implantacoes where escritorio_id = e and estado = 'ABERTA';
      if i.id is not null then v_prazo := v_prazo + implantacao_avisar_prazo(i); end if;
    exception when others then
      v_falhas := v_falhas + 1;
      raise warning 'Implantação: aviso de prazo do escritório % não saiu (%)', e, sqlerrm;
    end;
    i := null;
  end loop;
  perform limpar_contexto();
  v_isencao := implantacao_avisar_isencao();
  return jsonb_build_object('prazo', v_prazo, 'isencao', v_isencao, 'falhas', v_falhas);
end $$;

-- Todo dia às 8h de Brasília (11h UTC), onde o pg_cron existe: um job próprio (veja o cabeçalho).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-implantacao', '0 11 * * *', 'select public.implantacao_rotina()');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O escritório que a rotina pulou (carnê com a implantação cobrada, 1182)

create function avisos_console_do_carne_recusado() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i implantacoes;
  v_nome text;
  v_comp text := new.dados ->> 'competencia';
  v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  begin
    if exists (select 1 from avisos_console a where a.tipo = 'IMPLANTACAO_CARNE_RECUSADO'
                  and a.dados ->> 'escritorioId' = new.escritorio_id::text
                  and a.dados ->> 'competencia' is not distinct from v_comp) then
      return null;
    end if;
    i := implantacao_do_escritorio(new.escritorio_id);
    perform set_config('t3jus.lendo_acesso', 'on', true);
    select nome into v_nome from escritorios where id = new.escritorio_id;
    perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
    perform implantacao_aviso('IMPLANTACAO_CARNE_RECUSADO', i.id, implantacao_avisados(new.escritorio_id, i.responsavel_id),
      jsonb_build_object('escritorio', v_nome, 'escritorioId', new.escritorio_id, 'competencia', v_comp,
                         'dia', (new.ocorrido_em at time zone 'America/Sao_Paulo')::date,
                         'responsavel', (select nome from pessoas where id = i.responsavel_id)));
  exception when others then
    perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
    raise warning 'Implantação: aviso do carnê recusado não saiu (%)', sqlerrm;
  end;
  return null;
end $$;
create trigger avisos_console_do_carne_recusado after insert on fatura_eventos
  for each row when (new.acao = 'implantacao.carne_recusado')
  execute function avisos_console_do_carne_recusado();

-- ---------------------------------------------------------------------------------------
-- 5. A leitura do sino: os avisos de implantação só enquanto a pessoa vê a implantação (e o fim
-- da isenção, enquanto muda a regra), como os de interessado e de fatura (0691). A resposta diz
-- também se a pessoa vê a implantação, para o sino vazio dizer o que chega ali.

create or replace function aviso_console_visivel(p_tipo text) returns boolean
language sql stable
set search_path = public
as $$
  select case when p_tipo like 'INTERESSADO_%' then pode_global('console.interessados.ver')
              when p_tipo like 'FATURA_%' then pode_global('console.cobranca.ver')
              when p_tipo = 'IMPLANTACAO_ISENCAO_FIM' then pode_global('console.implantacao.regras')
              when p_tipo like 'IMPLANTACAO_%' then pode_global('console.implantacao.ver')
              else true end
$$;

alter function console_avisos(uuid) rename to console_avisos_sem_implantacao;

create function console_avisos(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb := console_avisos_sem_implantacao(p_pessoa);
begin
  return r || jsonb_build_object('veImplantacao', pode_global('console.implantacao.ver'),
                                 'veRegraImplantacao', pode_global('console.implantacao.regras'));
end $$;

call fechar_acesso();
