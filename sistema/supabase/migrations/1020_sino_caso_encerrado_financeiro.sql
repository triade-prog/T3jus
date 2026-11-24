-- O aviso no sino quando o caso é encerrado no financeiro (F3.150; EX-16, EX-17; também PT-02,
-- sem valor em reais nos dados, e PT-10, nada de um escritório no aviso de outro).
-- Desenho e plano aprovados pela Carol em 24/11/2026, às 11h33 (Bahia), com "aprovado com as
-- recomendações", em docs/design/aprovadas/portal-sino-caso-fechou. As seis respostas:
--   1. quem encerra contratos (grupo A) só recebe quando sobra contrato para encerrar;
--   2. a responsável que já tem o aviso de "pronto" do caso só recebe o aviso novo se algum
--      contrato ficou aberto;
--   3. o aviso vale também para o caso com RPV ou alvará;
--   4. a responsável é avisada quando as parcelas seguem com outro caso;
--   5. voltam as duas frases que prometem o aviso (ficha do cliente e janela de encerrar);
--   6. a Bianca entra na lista de quem encerra contratos, que segue em ordem alfabética.
--
-- Dois papéis: CONTRATOS (área Contratos e contratos.editar, a mesma regra do quemContratos da
-- 0900, agora num lugar só em quem_encerra_contratos) e RESPONSAVEL (casos.responsavel_id, com
-- vínculo ativo). Quem fez o encerramento nunca recebe (aviso_sino).
--
-- Um gatilho só, adiado: caso_fechou_fim, depois de insert em fechamentos_caso. A 0852 grava o
-- fechamento antes de encerrar os contratos junto; no commit, a cadeia já terminou e o aviso lê o
-- estado final. caso_fechou_fim é security definer, dona dominio: no Postgres 17 o gatilho adiado
-- roda com o papel ativo no commit, que, pela API, é o service_role, sem privilégio nas tabelas.
-- Rodar com o papel que enfileirou o evento só vem no Postgres 18. O fechar_acesso dá execute nela
-- ao service_role; é inofensivo, porque função de gatilho não se chama fora de gatilho.
-- Nada do tempo adiado derruba o commit: caso_fechou_avisar fica num bloco de exceção que registra
-- financeiro.caso_fechou_falhou no histórico interno; se até o registro falhar, raise warning deixa
-- a marca no log do Postgres.
--
-- O escritório vem sempre de NEW.escritorio_id, nunca do navegador. Com o contexto da transação
-- em outro escritório, nada é gravado (e fica um warning no log).
-- "Encerrado junto" sai do evento contrato.encerrado_com_caso do histórico (gravado pela 0852),
-- não da data: quem um dia encerrar contratos junto com o caso precisa gravar o mesmo evento.
-- O aviso não é retroativo: esta migration não grava aviso para fechamento antigo.
-- Se um dia houver "reabrir o fechamento", este aviso e o de "pronto" ganham o estado "reaberto".

-- ---------------------------------------------------------------------------------------
-- 1. O tipo novo no sino (lê a lista atual do check, como a 0990) e o índice de "uma vez só".
do $$
declare
  v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'CASO_ENCERRADO_FINANCEIRO') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

create index avisos_sino_caso_fechou on avisos_sino (origem_id, pessoa_id) where tipo = 'CASO_ENCERRADO_FINANCEIRO';

-- ---------------------------------------------------------------------------------------
-- 2. Quem encerra contratos: vínculo SOCIO ou EQUIPE ativo, a área Contratos e contratos.editar.
-- É a regra do quemContratos de caso_acerto_quadro (0900); o pgTAP 137 confere que as duas dão os
-- mesmos nomes. O distinct tira a pessoa com SOCIO e EQUIPE ativos ao mesmo tempo.
create function quem_encerra_contratos(p_escritorio uuid) returns table (pessoa_id uuid, nome text)
language sql stable
set search_path = public
as $$
  select distinct v.pessoa_id, p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
   where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')
     and 'CONTRATOS' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
     and pode(v.pessoa_id, p_escritorio, 'contratos.editar')
$$;

-- ---------------------------------------------------------------------------------------
-- 3. Os dados do aviso, iguais para os dois papéis (o papel e quemContratos entram depois).
-- Sem valor em reais (PT-02). Lista vazia vira null, e o jsonb_strip_nulls de aviso_sino a tira.
-- p_abertos e p_seguem vêm de caso_fechou_avisar: os dois papéis veem a mesma fotografia.
create function caso_fechou_dados(p_escritorio uuid, p_caso uuid, p_autor uuid, p_fechado_em timestamptz, p_abertos jsonb, p_seguem jsonb)
returns jsonb
language sql stable
set search_path = public
as $$
  with lig as (
    select c.id, c.numero, c.estado, k.nome cliente,
           exists (select 1 from historico h
                    where h.entidade = 'contratos' and h.entidade_id = c.id::text and h.escritorio_id = p_escritorio
                      and h.acao = 'contrato.encerrado_com_caso' and h.dados ->> 'caso' = p_caso::text) junto
      from contratos c join clientes_escritorio k on k.id = c.cliente_id
     where c.escritorio_id = p_escritorio
       and c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id is not null)
  ), primeiro as (
    select k.id, k.nome from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
     where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio order by cc.ordem limit 1
  )
  select jsonb_build_object(
    'caso', (select ca.nome from casos ca where ca.id = p_caso and ca.escritorio_id = p_escritorio),
    'quem', (select p.nome from pessoas p where p.id = p_autor),
    'clienteId', (select id from primeiro),
    'cliente', (select nome from primeiro),
    'abertos', nullif(p_abertos, '[]'::jsonb),
    'juntos', (select jsonb_agg(jsonb_build_object('numero', l.numero, 'cliente', l.cliente) order by l.numero)
                 from lig l where l.estado = 'ENCERRADO' and l.junto),
    'jaEncerrados', (select jsonb_agg(jsonb_build_object('numero', l.numero, 'cliente', l.cliente) order by l.numero)
                       from lig l where l.estado = 'ENCERRADO' and not l.junto),
    'seguem', nullif(p_seguem, '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------------------------
-- 4. O histórico interno das falhas (o molde de caso_pronto_registrar, 0990), com a marca própria.
create policy caso_fechou_historico on historico for insert to dominio
  with check (current_setting('t3jus.caso_fechou_historico', true) = 'on' and interno
              and acao = 'financeiro.caso_fechou_falhou'
              and escritorio_id is not distinct from contexto_escritorio());

create function caso_fechou_registrar(p_acao text, p_caso uuid, p_dados jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('t3jus.caso_fechou_historico', 'on', true);
  insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
  values (app_now(), contexto_escritorio(), case when contexto_pessoa() is null then 'SISTEMA' else 'PESSOA' end::tipo_autor,
          contexto_pessoa(), p_acao, 'casos', p_caso::text, p_dados, true);
  perform set_config('t3jus.caso_fechou_historico', 'off', true);
exception when others then
  perform set_config('t3jus.caso_fechou_historico', 'off', true);
  raise;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Quem recebe. Sem security definer: herda o dominio da função adiada. Tudo num bloco de
-- exceção: o encerramento e a cadeia nunca caem por causa do aviso.
create function caso_fechou_avisar(p_escritorio uuid, p_caso uuid, p_autor uuid, p_fechado_em timestamptz) returns void
language plpgsql
set search_path = public
as $$
declare
  v_abertos jsonb;
  v_seguem jsonb;
  v_resp uuid;
  v_tem_abertos boolean;
  v_terminou boolean;
  v_base jsonb;
  d uuid;
begin
  begin
    if p_escritorio is null or contexto_escritorio() is distinct from p_escritorio then
      raise warning 'caso_fechou_avisar: contexto % diferente do escritório % do caso %', contexto_escritorio(), p_escritorio, p_caso;
      return;
    end if;
    select ca.responsavel_id into v_resp from casos ca where ca.id = p_caso and ca.escritorio_id = p_escritorio;
    if not found then return; end if;

    -- Uma fotografia só, para os dois papéis.
    select coalesce(jsonb_agg(jsonb_build_object('id', e ->> 'id', 'numero', e ->> 'numero', 'cliente', e -> 'cliente' ->> 'nome',
                                                 'clienteId', e -> 'cliente' ->> 'id') order by e ->> 'numero'), '[]'::jsonb)
      into v_abertos from jsonb_array_elements(caso_contratos_encerraveis(p_escritorio, p_caso)) e;
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'cliente', k.nome,
             'outroCaso', (select o.nome from caso_clientes oc join casos o on o.id = oc.caso_id
                            where oc.contrato_id = c.id and o.id <> p_caso and o.situacao = 'ANDAMENTO' and o.escritorio_id = p_escritorio
                            order by o.nome limit 1)) order by c.numero), '[]'::jsonb)
      into v_seguem
      from contratos c join clientes_escritorio k on k.id = c.cliente_id
     where c.escritorio_id = p_escritorio and c.estado = 'ATIVO'
       and c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id is not null)
       and exists (select 1 from caso_clientes oc join casos o on o.id = oc.caso_id
                    where oc.contrato_id = c.id and o.id <> p_caso and o.situacao = 'ANDAMENTO');
    v_tem_abertos := jsonb_array_length(v_abertos) > 0;
    v_terminou := not v_tem_abertos and jsonb_array_length(v_seguem) = 0;
    v_base := caso_fechou_dados(p_escritorio, p_caso, p_autor, p_fechado_em, v_abertos, v_seguem);

    -- Grupo A (resposta 1): só quando sobrou contrato para encerrar.
    if v_tem_abertos then
      for d in select q.pessoa_id from quem_encerra_contratos(p_escritorio) q order by q.pessoa_id loop
        if not exists (select 1 from avisos_sino s where s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and s.origem_id = p_caso and s.pessoa_id = d) then
          perform aviso_sino(p_escritorio, d, p_autor, 'CASO_ENCERRADO_FINANCEIRO', 'casos', p_caso, v_base || '{"papel": "CONTRATOS"}');
        end if;
      end loop;
    end if;

    -- Grupo B: a responsável, com vínculo ativo; quem também é do grupo A recebe só o aviso que
    -- pede a ação; com o caso terminado, quem já tem o aviso de "pronto" dos últimos 30 dias não
    -- recebe (resposta 2; o contrato que segue com outro caso fica aberto, resposta 4).
    if v_resp is not null
       and exists (select 1 from vinculos v where v.pessoa_id = v_resp and v.escritorio_id = p_escritorio
                     and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE'))
       and not (v_tem_abertos and exists (select 1 from quem_encerra_contratos(p_escritorio) q where q.pessoa_id = v_resp))
       and not (v_terminou and exists (select 1 from avisos_sino s where s.tipo = 'CASO_PRONTO_FECHAR' and s.origem_id = p_caso
                                         and s.pessoa_id = v_resp and s.criado_em > app_now() - interval '30 days'))
       and not exists (select 1 from avisos_sino s where s.tipo = 'CASO_ENCERRADO_FINANCEIRO' and s.origem_id = p_caso and s.pessoa_id = v_resp)
    then
      perform aviso_sino(p_escritorio, v_resp, p_autor, 'CASO_ENCERRADO_FINANCEIRO', 'casos', p_caso,
        v_base || jsonb_build_object('papel', 'RESPONSAVEL', 'quemContratos',
          case when v_tem_abertos then (select jsonb_agg(q.nome order by q.nome) from quem_encerra_contratos(p_escritorio) q) end));
    end if;
  exception when others then
    begin
      perform caso_fechou_registrar('financeiro.caso_fechou_falhou', p_caso, jsonb_build_object('erro', left(sqlerrm, 200), 'codigo', sqlstate));
    exception when others then
      raise warning 'caso_fechou_avisar: registro falhou: % (%)', sqlerrm, sqlstate;
    end;
  end;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O gatilho: um só, adiado, no fim da transação (depois da cadeia da 0852).
create function caso_fechou_fim() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform caso_fechou_avisar(new.escritorio_id, new.caso_id, new.fechado_por, new.fechado_em);
  return null;
end $$;

create constraint trigger caso_fechou_fim after insert on fechamentos_caso
  deferrable initially deferred for each row execute function caso_fechou_fim();

-- ---------------------------------------------------------------------------------------
-- 7. O "agora" do aviso: o que aconteceu com os contratos que ficaram abertos. Só buscas por
-- índice, sempre no escritório do aviso; nunca chama caso_acerto. Cada contrato de dados.abertos
-- fica numa de três classes: ainda ativo sem outro caso (abertos), encerrado (saiu, com quem e
-- "voce") ou ativo com outro caso em andamento (seguem). Nenhuma mudança dá null. Sempre que há
-- "agora", abertos traz todos os que continuam ativos sem outro caso, e só falta quando nenhum
-- sobrou (a tela conta com isso). encerrados só quando todos foram encerrados; o "por" dele é
-- null quando foram pessoas diferentes.
create function caso_fechou_agora(a avisos_sino) returns jsonb
language sql stable
set search_path = public
as $$
  with st as (
    select c.id, c.numero, c.estado, c.encerrado_em,
           (select h.autor_id from historico h
             where h.entidade = 'contratos' and h.entidade_id = c.id::text and h.escritorio_id = a.escritorio_id and h.acao = 'contrato.encerrado'
             order by h.ocorrido_em desc, h.id desc limit 1) autor,
           (select o.nome from caso_clientes oc join casos o on o.id = oc.caso_id
             where oc.contrato_id = c.id and o.id <> a.origem_id and o.situacao = 'ANDAMENTO' and o.escritorio_id = a.escritorio_id
             order by o.nome limit 1) outro
      from jsonb_array_elements(coalesce(a.dados -> 'abertos', '[]'::jsonb)) e
      join contratos c on c.id = (e ->> 'id')::uuid and c.escritorio_id = a.escritorio_id
  ), enc as (select * from st where estado = 'ENCERRADO')
  select case when exists (select 1 from st where estado = 'ENCERRADO' or (estado = 'ATIVO' and outro is not null)) then
    (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(jsonb_build_object(
      'abertos', (select jsonb_agg(jsonb_build_object('id', s.id, 'numero', s.numero) order by s.numero) from st s
                   where s.estado = 'ATIVO' and s.outro is null),
      'saiu', (select jsonb_agg(jsonb_build_object('numero', s.numero, 'em', s.encerrado_em, 'por', pessoa_ref(s.autor),
                                                   'voce', s.autor is not distinct from a.pessoa_id) order by s.numero) from enc s),
      'seguem', (select jsonb_agg(jsonb_build_object('id', s.id, 'numero', s.numero, 'outroCaso', s.outro) order by s.numero) from st s
                  where s.estado = 'ATIVO' and s.outro is not null),
      'encerrados', case when (select count(*) from enc) = jsonb_array_length(a.dados -> 'abertos') then
        (select jsonb_build_object('em', max(s.encerrado_em),
                  'por', case when count(distinct s.autor) = 1 and count(s.autor) = count(*) then pessoa_ref(min(s.autor::text)::uuid) end,
                  'voce', count(distinct s.autor) = 1 and count(s.autor) = count(*) and min(s.autor::text)::uuid = a.pessoa_id)
           from enc s) end)) x(k, v)
      where v <> 'null'::jsonb)
  end
$$;

-- ---------------------------------------------------------------------------------------
-- 8. A linha do sino com o ramo novo. O ramo do CASO_PRONTO_FECHAR é o da 0990, sem mudança.
create or replace function aviso_sino_linha(a avisos_sino) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', a.id, 'tipo', a.tipo, 'dados', a.dados, 'origem', a.origem_tabela, 'origemId', a.origem_id,
                            'em', a.criado_em, 'lido', a.lido_em is not null)
      || case a.tipo
           when 'CASO_PRONTO_FECHAR'
             then coalesce((select jsonb_build_object('agora', g)
                              from caso_pronto_agora(a.origem_id, (a.dados ->> 'periodoId')::uuid, a.pessoa_id) g
                             where g is not null), '{}'::jsonb)
           when 'CASO_ENCERRADO_FINANCEIRO'
             then coalesce((select jsonb_build_object('agoraFechou', g) from caso_fechou_agora(a) g where g is not null), '{}'::jsonb)
           else '{}'::jsonb end
$$;

call fechar_acesso();
