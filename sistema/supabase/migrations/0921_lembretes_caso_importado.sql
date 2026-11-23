-- Importar do Astrea e do ADVBOX (F3.56; VA-05): lembretes de contrato e o caso importado, pelo
-- desenho aprovado pela Carol em 23/11/2026 (docs/design/aprovadas/portal-importacao-sobras e a
-- rodada curta portal-importacao-sobras-rodada2), com as 3 recomendações:
-- - R1: quem tem a área Contratos dispensa um lembrete, sempre com o motivo e o nome no histórico;
-- - R2: dispensar se desfaz sem prazo, por "Trazer de volta";
-- - R3: o caso que veio encerrado fica em Encerrados com o selo próprio, fora das contas de ganho,
--   perda e acordo e do acerto até alguém registrar o resultado (salvo se entrar dinheiro do
--   cliente por um levantamento: aí o repasse não some do acerto).
-- Itens do painel: F3.143 (selos e filtro do Jurídico, "Veio da importação"), F3.144 (lista dos
-- lembretes), F3.145 (dispensar) e F3.148 (encerrado importado e "Registrar o resultado").
-- Tudo por troca pontual ou gatilho sobre a 0920 (já publicada): nenhuma imp_* é redefinida.
-- Não há tabela nova: lembrete_contrato e casos já têm escritorio_id e passaram por
-- proteger_tabela_escritorio. O escritório vem sempre de p_escritorio, que a API tira da sessão.

-- ---------------------------------------------------------------------------------------
-- Troca pontual. Falha alto se o trecho não aparecer exatamente uma vez: assim, uma mudança de
-- outra PR não passa em silêncio.

create function t921_trocar(p_funcao regprocedure, p_de text, p_para text) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> 1 then raise exception 'O trecho aparece % vezes em % (esperado 1): %', v_n, p_funcao, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. lembrete_contrato: dispensar e trazer de volta.
-- "Aberto" passa a ser resolvido_em, dispensado_em e desfeito_em vazios. Ao trazer de volta, os
-- campos da dispensa se apagam; o histórico do cliente guarda cada dispensa e cada volta.

alter table lembrete_contrato
  add column dispensado_em    timestamptz,
  add column dispensado_por   uuid references pessoas (id) on delete restrict,
  add column dispensa_motivo  text check (dispensa_motivo in ('JA_NEGOCIADO', 'PERDOADO', 'OUTRO_CONTRATO', 'OUTRO')),
  add column dispensa_detalhe text check (length(btrim(dispensa_detalhe)) between 3 and 140),
  add column trazido_em       timestamptz,
  add column trazido_por      uuid references pessoas (id) on delete restrict,
  -- O lançamento em aberto mais antigo do lembrete, guardado ao importar: depois de 7 dias as
  -- linhas da prévia são apagadas e não daria mais para saber quais lançamentos entraram nele.
  add column mais_antigo      date;
alter table lembrete_contrato add constraint lembrete_contrato_dispensa_check
  check ((dispensado_em is null) = (dispensado_por is null) and (dispensado_em is null) = (dispensa_motivo is null)
         and (dispensado_em is not null or dispensa_detalhe is null)
         and (dispensa_motivo is distinct from 'OUTRO' or dispensa_detalhe is not null)
         and not (dispensado_em is not null and resolvido_em is not null));
alter table lembrete_contrato add constraint lembrete_contrato_trazido_check check ((trazido_em is null) = (trazido_por is null));
drop index lembrete_contrato_aberto;
create index lembrete_contrato_aberto on lembrete_contrato (escritorio_id, cliente_id)
  where resolvido_em is null and desfeito_em is null and dispensado_em is null;
create index lembrete_contrato_escritorio on lembrete_contrato (escritorio_id, criado_em) where desfeito_em is null;

update inventario_dados
   set o_que = 'Lembrete de contrato: valor em aberto no sistema antigo e, quando dispensado, o motivo, o detalhe escrito, quem dispensou ou trouxe de volta e quando'
 where tabela = 'lembrete_contrato';

-- O lembrete dispensado não vira contrato sozinho: ao ser trazido de volta, ele confere.
create or replace function lembrete_contrato_resolver() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update lembrete_contrato set resolvido_em = app_now(), contrato_id = new.id
   where escritorio_id = new.escritorio_id and cliente_id = new.cliente_id and resolvido_em is null and desfeito_em is null
     and dispensado_em is null;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. Caso encerrado não ganha lembrete de contrato (decisão 23). O lançamento do processo que
-- entrou encerrado (pelo número, na linha da prévia) fica no histórico, mas não vira lembrete.
-- Se o financeiro for importado antes dos processos, o caso ainda não existe e o lembrete nasce:
-- o escritório dispensa com o motivo.

create function lancamento_de_encerrado_importado(h historico_financeiro_anterior) returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from importacao_linhas l
      join casos c on c.escritorio_id = h.escritorio_id and c.encerrado_por = 'IMPORTADO_ENCERRADO'
                  and c.numero_cnj = nullif(regexp_replace(coalesce((l.bruto || l.correcoes) ->> 'numero', ''), '[^0-9]', '', 'g'), '')
     where l.importacao_id = h.importacao_id and l.numero = h.linha)
$$;

select t921_trocar('imp_importar_financeiro(importacoes,uuid)',
  $q$  insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, caso_id, valor_em_aberto_centavos, lancamentos)
  select i.escritorio_id, i.id, h.cliente_id, h.caso_id, sum(h.valor_centavos), count(*)
    from historico_financeiro_anterior h
   where h.importacao_id = i.id and h.situacao = 'EM_ABERTO'
   group by h.cliente_id, h.caso_id;$q$,
  $q$  insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, caso_id, valor_em_aberto_centavos, lancamentos, mais_antigo)
  select i.escritorio_id, i.id, h.cliente_id, h.caso_id, sum(h.valor_centavos), count(*), min(h.data)
    from historico_financeiro_anterior h
   where h.importacao_id = i.id and h.situacao = 'EM_ABERTO'
     and not lancamento_de_encerrado_importado(h)
   group by h.cliente_id, h.caso_id;$q$);

-- Os lembretes que já existem: o mais antigo, com a mesma regra enquanto as linhas existem.
update lembrete_contrato l set mais_antigo = (
  select min(h.data) from historico_financeiro_anterior h
   where h.importacao_id = l.importacao_id and h.cliente_id = l.cliente_id and h.caso_id is not distinct from l.caso_id
     and h.situacao = 'EM_ABERTO' and not lancamento_de_encerrado_importado(h));

-- ---------------------------------------------------------------------------------------
-- 3. A origem do caso importado (a linha "Veio da importação"). Os dados existem só ao importar:
-- as linhas da prévia somem 7 dias depois. A data do arquivamento e o registro do ADVBOX nascem
-- vazios: falta conferir num backup real se essas colunas existem (item pendente F3.149).

alter table casos
  add column etapa_origem        text check (length(btrim(etapa_origem)) between 1 and 120),
  add column linha_origem        integer check (linha_origem between 2 and 10001),
  add column aba_origem          text check (length(btrim(aba_origem)) between 1 and 60),
  add column registro_origem     text check (length(btrim(registro_origem)) between 1 and 40),
  add column arquivado_origem_em date;
alter table casos add constraint casos_origem_check
  check (importacao_id is not null or (etapa_origem is null and linha_origem is null and aba_origem is null
                                       and registro_origem is null and arquivado_origem_em is null));

update inventario_dados
   set o_que = 'Casos e processos: nome, área, parte contrária e qualificação, número, tribunal, vara, valor da causa, etapa, responsável e a origem do caso importado'
 where tabela = 'casos';

-- Quando a linha da prévia vira caso, o caso guarda de onde veio. Só o caso criado por esta
-- importação (não o caso que já existia e ganhou um cliente), e a primeira linha decide.
create function casos_origem_da_linha() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.caso_id is null or not exists (select 1 from importacoes where id = new.importacao_id and o_que = 'CASOS') then return new; end if;
  update casos c set linha_origem = coalesce(c.linha_origem, new.numero),
                     etapa_origem = coalesce(c.etapa_origem, nullif(left(btrim(coalesce(new.norm -> 'caso' ->> 'etapa_antiga', '')), 120), '')),
                     aba_origem = coalesce(c.aba_origem, (select nullif(left(btrim(i.abas -> coalesce(i.aba, 0) ->> 'nome'), 60), '')
                                                            from importacoes i where i.id = new.importacao_id))
   where c.id = new.caso_id and c.importacao_id = new.importacao_id;
  return new;
end $$;
create trigger importacao_linhas_origem_do_caso after update of situacao on importacao_linhas
  for each row when (new.situacao = 'IMPORTADA' and old.situacao is distinct from 'IMPORTADA' and new.caso_id is not null)
  execute function casos_origem_da_linha();

-- Os casos já importados: a etapa antiga sai do motivo da primeira mudança; a linha, das linhas
-- que ainda existem; a aba, do nome da aba dos processos no backup.
update casos c set etapa_origem = left(substring(m.motivo from '\(etapa lá: (.*)\)\.$'), 120)
  from caso_etapa_mudancas m
 where c.importacao_id is not null and m.caso_id = c.id and m.de_etapa_id is null
   and substring(m.motivo from '\(etapa lá: (.*)\)\.$') is not null;
update casos c set linha_origem = x.numero
  from (select distinct on (l.caso_id) l.caso_id, l.numero, l.importacao_id from importacao_linhas l
         where l.situacao = 'IMPORTADA' and l.caso_id is not null order by l.caso_id, l.numero) x
 where x.caso_id = c.id and x.importacao_id = c.importacao_id;
update casos c set aba_origem = left(x.nome, 60)
  from (select f.id, (select s ->> 'nome' from jsonb_array_elements(coalesce(p.abas_sistema, '[]'::jsonb)) s
                       where s ->> 'destino' = 'CASOS' limit 1) nome
          from importacoes f join importacoes p on p.id = f.pai_id where f.o_que = 'CASOS') x
 where c.importacao_id = x.id and x.nome is not null and length(btrim(x.nome)) > 0;

-- ---------------------------------------------------------------------------------------
-- 4. Peças de leitura dos lembretes. Sem security definer: só as funções de entrada as chamam.

create function lembrete_situacao(l lembrete_contrato) returns text
language sql immutable
as $$ select case when l.resolvido_em is not null then 'CONTRATO' when l.dispensado_em is not null then 'DISPENSADO' else 'ABERTO' end $$;

-- O contrato ativo do cliente que já existia quando o lembrete nasceu (a linha da Vale Alto: o
-- gatilho só resolve com contrato novo).
create function lembrete_contrato_ativo(l lembrete_contrato) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', c.id, 'numero', c.numero) from contratos c
   where c.escritorio_id = l.escritorio_id and c.cliente_id = l.cliente_id and c.estado = 'ATIVO' and c.criado_em < l.criado_em
   order by c.criado_em limit 1
$$;

create function lembrete_linha(l lembrete_contrato) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id, 'situacao', lembrete_situacao(l), 'valor', l.valor_em_aberto_centavos, 'lancamentos', l.lancamentos,
    'maisAntigo', l.mais_antigo,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = l.cliente_id),
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'responsavel', pessoa_ref(c.responsavel_id)) from casos c where c.id = l.caso_id),
    'contratoAtivo', case when lembrete_situacao(l) = 'ABERTO' then lembrete_contrato_ativo(l) end,
    'contrato', case when l.resolvido_em is not null then (
        select jsonb_build_object('id', c.id, 'numero', c.numero, 'em', c.criado_em, 'por', pessoa_ref(c.criado_por))
          from contratos c where c.id = l.contrato_id) end,
    'dispensa', case when l.dispensado_em is not null then jsonb_build_object(
        'motivo', l.dispensa_motivo, 'detalhe', l.dispensa_detalhe, 'em', l.dispensado_em, 'por', pessoa_ref(l.dispensado_por)) end,
    'importacaoId', l.importacao_id,
    'origem', (select i.origem from importacoes i where i.id = l.importacao_id))
$$;

create function lembretes_totais(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with t as (select lembrete_situacao(l) s, l.valor_em_aberto_centavos v, l.cliente_id from lembrete_contrato l
              where l.escritorio_id = p_escritorio and l.desfeito_em is null)
  select jsonb_build_object(
    'totais', jsonb_build_object(
      'abertos', jsonb_build_object('n', (select count(*) from t where s = 'ABERTO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'ABERTO')),
      'contrato', jsonb_build_object('n', (select count(*) from t where s = 'CONTRATO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'CONTRATO')),
      'dispensados', jsonb_build_object('n', (select count(*) from t where s = 'DISPENSADO'), 'valor', (select coalesce(sum(v), 0) from t where s = 'DISPENSADO'))),
    'clientesAbertos', (select count(distinct cliente_id) from t where s = 'ABERTO'))
$$;

-- O lembrete do escritório, travado para mudar.
create function lembrete_para_mudar(p_escritorio uuid, p_lembrete uuid) returns lembrete_contrato
language plpgsql
set search_path = public
as $$
declare
  l lembrete_contrato;
begin
  select * into l from lembrete_contrato where id = p_lembrete and escritorio_id = p_escritorio for update;
  if l.id is null or l.desfeito_em is not null then raise exception 'Lembrete não encontrado' using errcode = 'TC404'; end if;
  return l;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Dispensar (R1): quem tem a área Contratos, com o motivo. O detalhe com menos de 3
-- caracteres (depois de tirar os espaços) conta como vazio, a mesma regra da tela.

create function portal_lembrete_dispensar(p_pessoa uuid, p_escritorio uuid, p_lembrete uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l lembrete_contrato;
  c contratos;
  v_motivo text;
  v_det text;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  l := lembrete_para_mudar(p_escritorio, p_lembrete);
  if l.resolvido_em is not null then
    select * into c from contratos where id = l.contrato_id;
    raise exception 'O lembrete já virou contrato' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'JA_RESOLVIDO', 'contrato', jsonb_build_object('id', c.id, 'numero', c.numero),
                                  'por', pessoa_ref(c.criado_por), 'em', c.criado_em)::text;
  end if;
  if l.dispensado_em is not null then
    raise exception 'O lembrete já foi dispensado' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'JA_DISPENSADO', 'por', pessoa_ref(l.dispensado_por), 'em', l.dispensado_em)::text;
  end if;
  v_motivo := case when jsonb_typeof(p_dados) = 'object' then p_dados ->> 'motivo' end;
  v_det := case when jsonb_typeof(p_dados) = 'object' then btrim(coalesce(p_dados ->> 'detalhe', '')) end;
  if length(coalesce(v_det, '')) < 3 then v_det := null; end if;
  if v_motivo is null or v_motivo not in ('JA_NEGOCIADO', 'PERDOADO', 'OUTRO_CONTRATO', 'OUTRO') then e := e || 'motivo'::text; end if;
  if length(v_det) > 140 or (v_motivo = 'OUTRO' and v_det is null) then e := e || 'detalhe'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Escolha o motivo' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'MOTIVO_OBRIGATORIO', 'campos', to_jsonb(e))::text;
  end if;
  update lembrete_contrato set dispensado_em = app_now(), dispensado_por = p_pessoa, dispensa_motivo = v_motivo, dispensa_detalhe = v_det,
         trazido_em = null, trazido_por = null
   where id = l.id returning * into l;
  perform registrar_historico('cliente.lembrete_dispensado', 'cliente', l.cliente_id::text,
    jsonb_build_object('lembrete', l.id, 'motivo', v_motivo, 'detalhe', v_det, 'valor', l.valor_em_aberto_centavos,
                       'caso', l.caso_id, 'importacao', l.importacao_id));
  return jsonb_build_object('lembrete', lembrete_linha(l)) || lembretes_totais(p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Trazer de volta (R2), sem prazo. Se um contrato do cliente nasceu enquanto o lembrete estava
-- dispensado, ele volta já resolvido (decisão 18). A trava no cliente espera o contrato que está
-- sendo criado (o insert segura a chave do cliente), para ele não passar despercebido.

create function portal_lembrete_trazer(p_pessoa uuid, p_escritorio uuid, p_lembrete uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l lembrete_contrato;
  c contratos;
  v_antes lembrete_contrato;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  l := lembrete_para_mudar(p_escritorio, p_lembrete);
  if l.dispensado_em is null then perform recusar_motivo_409('O lembrete não está dispensado', 'NAO_DISPENSADO'); end if;
  v_antes := l;
  perform 1 from clientes_escritorio where id = l.cliente_id for update;
  -- Um contrato posterior ao lembrete que não o resolveu só pode ter nascido enquanto ele estava dispensado.
  select * into c from contratos
   where escritorio_id = p_escritorio and cliente_id = l.cliente_id and criado_em >= l.criado_em
   order by criado_em, numero limit 1;
  update lembrete_contrato set dispensado_em = null, dispensado_por = null, dispensa_motivo = null, dispensa_detalhe = null,
         trazido_em = app_now(), trazido_por = p_pessoa,
         resolvido_em = case when c.id is not null then c.criado_em end, contrato_id = c.id
   where id = l.id returning * into l;
  perform registrar_historico('cliente.lembrete_trazido', 'cliente', l.cliente_id::text,
    jsonb_build_object('lembrete', l.id, 'motivoAntes', v_antes.dispensa_motivo, 'detalheAntes', v_antes.dispensa_detalhe,
                       'dispensadoPor', v_antes.dispensado_por, 'dispensadoEm', v_antes.dispensado_em, 'virouContrato', c.id));
  return jsonb_build_object('lembrete', lembrete_linha(l)) || lembretes_totais(p_escritorio);
end $$;

-- O conflito com motivo (TC409), para a tela dizer o que houve.
create function recusar_motivo_409(p_mensagem text, p_motivo text) returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception '%', p_mensagem using errcode = 'TC409', detail = jsonb_build_object('motivo', p_motivo)::text;
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. A lista em Contratos › Contratos › Lembretes de contrato, a faixa da lista de Contratos.

create function portal_contratos_lembretes(p_pessoa uuid, p_escritorio uuid, p_situacao text default 'ABERTO', p_q text default null,
                                           p_ordem text default null, p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sit text;
  v_q text;
  v_ordem text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  v_sit := coalesce(p_situacao, 'ABERTO');
  if v_sit not in ('ABERTO', 'CONTRATO', 'DISPENSADO') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  if length(coalesce(p_q, '')) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  if p_ordem is not null and p_ordem not in ('VALOR', 'ANTIGO', 'NOME') then perform recusar_campos('Ordem desconhecida', 'ordem'); end if;
  if coalesce(p_pular, 0) not between 0 and 10000 then perform recusar_campos('Página inválida', 'pular'); end if;
  v_q := nullif(sem_acento(btrim(coalesce(p_q, ''))), '');
  v_ordem := case when v_sit = 'ABERTO' then coalesce(p_ordem, 'VALOR') end;
  return jsonb_build_object('hoje', hoje_brasilia(), 'situacao', v_sit, 'ordem', v_ordem, 'q', nullif(btrim(coalesce(p_q, '')), ''), 'pular', coalesce(p_pular, 0))
    || lembretes_totais(p_escritorio) || (
    with f as (
      select l.* from lembrete_contrato l join clientes_escritorio k on k.id = l.cliente_id
        left join casos c on c.id = l.caso_id
       where l.escritorio_id = p_escritorio and l.desfeito_em is null and lembrete_situacao(l) = v_sit
         and (v_q is null or sem_acento(k.nome) like '%' || v_q || '%' or sem_acento(coalesce(c.nome, '')) like '%' || v_q || '%'))
    select jsonb_build_object(
      'total', (select count(*) from f),
      'valor', (select coalesce(sum(valor_em_aberto_centavos), 0) from f),
      'lembretes', coalesce((select jsonb_agg(lembrete_linha(p.x) order by p.o) from (
          select f::lembrete_contrato x,
                 row_number() over (order by
                   case when v_ordem = 'VALOR' then f.valor_em_aberto_centavos end desc nulls last,
                   case when v_ordem = 'ANTIGO' then f.mais_antigo end asc nulls last,
                   case when v_sit = 'CONTRATO' then f.resolvido_em end desc nulls last,
                   case when v_sit = 'DISPENSADO' then f.dispensado_em end desc nulls last,
                   (select sem_acento(k.nome) from clientes_escritorio k where k.id = f.cliente_id), f.id) o
            from f order by o offset coalesce(p_pular, 0) limit 25) p), '[]'::jsonb),
      -- "De onde vieram": cada importação do financeiro, não desfeita, que criou lembretes.
      'importacoes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'origem', i.origem, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por),
                                                                  'lembretes', x.n, 'valor', x.v) order by i.importado_em desc)
                                 from importacoes i join (select importacao_id, count(*) n, sum(valor_em_aberto_centavos) v from lembrete_contrato
                                                           where escritorio_id = p_escritorio group by importacao_id) x on x.importacao_id = i.id
                                where i.escritorio_id = p_escritorio and i.estado = 'CONCLUIDA'), '[]'::jsonb)));
end $$;

create function portal_contratos_lembretes_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  select im.* into i from importacoes im
   where im.id in (select l.importacao_id from lembrete_contrato l
                    where l.escritorio_id = p_escritorio and l.desfeito_em is null and lembrete_situacao(l) = 'ABERTO')
   order by im.importado_em desc limit 1;
  return jsonb_build_object(
    'clientes', (lembretes_totais(p_escritorio) ->> 'clientesAbertos')::integer,
    'abertos', (lembretes_totais(p_escritorio) -> 'totais' -> 'abertos' ->> 'n')::integer,
    'valor', (lembretes_totais(p_escritorio) -> 'totais' -> 'abertos' ->> 'valor')::bigint,
    'origem', i.origem, 'importadoEm', i.importado_em);
end $$;

-- ---------------------------------------------------------------------------------------
-- 8. A ficha do cliente: o lembrete dispensado sai da lista e fica uma linha discreta.

create or replace function portal_cliente_anterior(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['FINANCEIRO', 'CONTRATOS']) then return jsonb_build_object('anterior', null); end if;
  if not exists (select 1 from historico_financeiro_anterior where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null) then
    return jsonb_build_object('anterior', null);
  end if;
  return jsonb_build_object('anterior', jsonb_build_object(
    'origem', (select h.origem from historico_financeiro_anterior h where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente and h.desfeito_em is null limit 1),
    'importacao', (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em)
                     from importacoes i where i.id = (select h.importacao_id from historico_financeiro_anterior h
                                                       where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente and h.desfeito_em is null
                                                       order by h.criado_em desc limit 1)),
    'lembretes', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'valor', l.valor_em_aberto_centavos, 'lancamentos', l.lancamentos,
                                                               'caso', case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end,
                                                               'contratoAtivo', lembrete_contrato_ativo(l))
                                            order by l.criado_em), '[]'::jsonb)
                    from lembrete_contrato l left join casos c on c.id = l.caso_id
                   where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and l.resolvido_em is null and l.desfeito_em is null
                     and l.dispensado_em is null),
    'dispensados', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'valor', l.valor_em_aberto_centavos,
                                                                 'caso', case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end,
                                                                 'motivo', l.dispensa_motivo, 'detalhe', l.dispensa_detalhe,
                                                                 'em', l.dispensado_em, 'por', pessoa_ref(l.dispensado_por))
                                              order by l.dispensado_em desc), '[]'::jsonb)
                      from lembrete_contrato l left join casos c on c.id = l.caso_id
                     where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and l.dispensado_em is not null and l.desfeito_em is null),
    'pago', (select coalesce(sum(valor_centavos), 0) from historico_financeiro_anterior
              where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null and situacao = 'PAGO'),
    'lancamentos', (select coalesce(jsonb_agg(jsonb_build_object('data', h.data, 'descricao', h.descricao, 'valor', h.valor_centavos,
                                                                 'situacao', h.situacao, 'caso', c.nome)
                                              order by h.data desc nulls last, h.linha), '[]'::jsonb)
                      from (select * from historico_financeiro_anterior
                             where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null
                             order by data desc nulls last, linha limit 50) h
                      left join casos c on c.id = h.caso_id),
    'total', (select count(*) from historico_financeiro_anterior where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null)));
end $$;

-- ---------------------------------------------------------------------------------------
-- 9. Jurídico: a linha do caso diz de onde veio e se o acerto foi feito ("Como encerrou").

-- O mesmo critério de "pendente" do resumo do acerto (caso_resumo_acerto).
create function caso_acerto_linha(c casos) returns text
language sql stable
set search_path = public
as $$
  select case when c.situacao <> 'ENCERRADO' or coalesce(c.encerrado_por, 'RESULTADO') <> 'RESULTADO' then null
              when exists (select 1 from fechamentos_caso f where f.caso_id = c.id) then 'FEITO'
              when exists (select 1 from levantamentos l where l.caso_id = c.id)
                or exists (select 1 from caso_clientes cc join contratos k on k.id = cc.contrato_id
                            where cc.caso_id = c.id and k.estado in ('ATIVO', 'ENCERRADO'))
                or exists (select 1 from exitos_conferir x where x.caso_id = c.id and x.situacao = 'PARA_CONFERIR') then 'PENDENTE' end
$$;

select t921_trocar('caso_linha(casos)',
  $q$'encerradoPor', c.encerrado_por,$q$,
  $q$'encerradoPor', c.encerrado_por,
    'origem', (select jsonb_build_object('sistema', i.origem, 'arquivadoEm', c.arquivado_origem_em, 'importadoEm', i.importado_em,
                                         'desfeitaEm', i.desfeita_em)
                 from importacoes i where i.id = c.importacao_id),
    'acerto', caso_acerto_linha(c),$q$);

-- A lista: o filtro "Como encerrou" e a página de 25 nos Encerrados (o backup pode trazer
-- milhares de arquivados). Os Encerrados vêm do mais recente para o mais antigo.
drop function portal_juridico_casos(uuid, uuid, text, text, uuid, uuid);
create function portal_juridico_casos(p_pessoa uuid, p_escritorio uuid, p_situacao text default 'ANDAMENTO', p_q text default null,
                                      p_responsavel uuid default null, p_etapa uuid default null, p_como text default null,
                                      p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_dig text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g');
  v_enc boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_situacao, '') not in ('ANDAMENTO', 'ENCERRADO') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  if p_como is not null and (p_como not in ('RESULTADO', 'IMPORTADO', 'DESFEITA') or p_situacao <> 'ENCERRADO') then
    perform recusar_campos('Confira o filtro', 'como');
  end if;
  if coalesce(p_pular, 0) not between 0 and 10000 then perform recusar_campos('Página inválida', 'pular'); end if;
  v_enc := p_situacao = 'ENCERRADO';
  perform etapas_garantir(p_escritorio);
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'etapas', etapas_lista(p_escritorio),
    'totais', jsonb_build_object(
      'andamento', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ANDAMENTO'),
      'encerrados', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO'),
      'prazoHoje', (select count(distinct p.caso_id) from prazos p where p.escritorio_id = p_escritorio and p.cumprido_em is null and p.data_final = hoje_brasilia())),
    -- Como os encerrados encerraram (a contagem do alto), fora de "totais", que já tem forma fixa.
    'como', jsonb_build_object(
        'resultado', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO' and coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'),
        'importados', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO' and encerrado_por = 'IMPORTADO_ENCERRADO'),
        'desfeitos', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO' and encerrado_por = 'IMPORTACAO_DESFEITA')),
      'origensImportados', coalesce((select jsonb_agg(distinct i.origem) from casos c join importacoes i on i.id = c.importacao_id
                                      where c.escritorio_id = p_escritorio and c.encerrado_por = 'IMPORTADO_ENCERRADO'), '[]'::jsonb),
    'responsaveis', coalesce((select jsonb_agg(pessoa_ref(r) order by (pessoa_ref(r) ->> 'nome'))
                                from (select distinct responsavel_id r from casos where escritorio_id = p_escritorio) s), '[]'::jsonb),
    'souDono', e_socio_dono(p_pessoa, p_escritorio),
    'pular', case when v_enc then coalesce(p_pular, 0) end)
    || (with f as (
          select c.* from casos c
           where c.escritorio_id = p_escritorio and c.situacao = p_situacao
             and (p_responsavel is null or c.responsavel_id = p_responsavel)
             and (p_etapa is null or c.etapa_id = p_etapa)
             and (p_como is null
                  or (p_como = 'RESULTADO' and coalesce(c.encerrado_por, 'RESULTADO') = 'RESULTADO')
                  or (p_como = 'IMPORTADO' and c.encerrado_por = 'IMPORTADO_ENCERRADO')
                  or (p_como = 'DESFEITA' and c.encerrado_por = 'IMPORTACAO_DESFEITA'))
             and (v_q is null
                  or sem_acento(c.nome) like '%' || sem_acento(v_q) || '%'
                  or sem_acento(c.parte_contraria) like '%' || sem_acento(v_q) || '%'
                  or (length(v_dig) >= 4 and c.numero_cnj like '%' || v_dig || '%')
                  or exists (select 1 from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                              where cc.caso_id = c.id and sem_acento(k.nome) like '%' || sem_acento(v_q) || '%')))
        select jsonb_build_object(
          'total', (select count(*) from f),
          'casos', case when v_enc then
              coalesce((select jsonb_agg(caso_linha(p.c) order by p.o) from (
                  select f::casos c, row_number() over (order by coalesce(f.arquivado_origem_em, (f.encerrado_em at time zone 'America/Sao_Paulo')::date) desc nulls last,
                                                                 f.encerrado_em desc nulls last, f.nome, f.id) o
                    from f order by o offset coalesce(p_pular, 0) limit 25) p), '[]'::jsonb)
            else
              coalesce((select jsonb_agg(caso_linha(f::casos) order by
                         (select min(p.data_final) from prazos p where p.caso_id = f.id and p.cumprido_em is null) nulls last, f.nome) from f), '[]'::jsonb)
            end));
end $$;

-- A ficha: de onde o caso veio, os lembretes dos clientes (só para quem vê valores) e se dá
-- para registrar o resultado.
alter function portal_juridico_caso(uuid, uuid, uuid) rename to juridico_caso_sem_origem;
create function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := juridico_caso_sem_origem(p_pessoa, p_escritorio, p_caso);
  c casos;
  i importacoes;
  v_areas text[] := areas_da_pessoa(p_pessoa, p_escritorio);
  v_reg record;
begin
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio;
  select * into i from importacoes where id = c.importacao_id;
  select h.ocorrido_em em, pessoa_ref(h.autor_id) por into v_reg from historico h
   where h.escritorio_id = p_escritorio and h.entidade = 'casos' and h.entidade_id = c.id::text and h.acao = 'juridico.resultado_registrado'
   order by h.ocorrido_em desc, h.id desc limit 1;
  return r || jsonb_build_object(
    'origem', case when i.id is not null then jsonb_build_object(
        'importacaoId', i.id, 'sistema', i.origem, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por), 'desfeitaEm', i.desfeita_em,
        'etapaOrigem', c.etapa_origem, 'linhaOrigem', c.linha_origem, 'abaOrigem', c.aba_origem, 'registroOrigem', c.registro_origem,
        'arquivadoEm', c.arquivado_origem_em,
        'veioEncerrado', coalesce(c.encerrado_por = 'IMPORTADO_ENCERRADO', false) or v_reg.em is not null,
        'etapaLigada', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from caso_etapa_mudancas m join etapas e on e.id = m.para_etapa_id
                         where m.caso_id = c.id order by m.ordem limit 1)) end,
    'resultadoRegistrado', case when v_reg.em is not null then jsonb_build_object('em', v_reg.em, 'por', v_reg.por) end,
    'lembretes', case when v_areas && array['CONTRATOS', 'FINANCEIRO'] then coalesce((
        select jsonb_agg(jsonb_build_object('clienteId', x.cliente_id, 'valor', x.v, 'sistema', x.origem) order by x.cliente_id)
          from (select l.cliente_id, sum(l.valor_em_aberto_centavos) v, min(im.origem) origem
                  from lembrete_contrato l join importacoes im on im.id = l.importacao_id
                 where l.escritorio_id = p_escritorio and l.cliente_id in (select cc.cliente_id from caso_clientes cc where cc.caso_id = c.id)
                   and l.resolvido_em is null and l.desfeito_em is null and l.dispensado_em is null
                 group by l.cliente_id) x), '[]'::jsonb) end,
    'podeRegistrarResultado', coalesce(c.encerrado_por = 'IMPORTADO_ENCERRADO', false) and 'JURIDICO' = any (v_areas)
                              and pode(p_pessoa, p_escritorio, 'juridico.editar'));
end $$;

-- ---------------------------------------------------------------------------------------
-- 10. Registrar o resultado do caso que veio encerrado (R3). A etapa e a data do encerramento
-- ficam; nenhum aviso vai ao cliente e não nasce êxito (o caso não tem contrato). A partir daqui
-- o caso entra no acerto, no próximo passo e nos relatórios.

create function portal_juridico_caso_resultado(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_res text;
  v_motivo text;
  v_versao integer;
  e text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  if c.encerrado_por is distinct from 'IMPORTADO_ENCERRADO' then perform recusar_motivo('Este caso já tem resultado', 'CASO_COM_RESULTADO'); end if;
  v_res := case when jsonb_typeof(p_dados) = 'object' then nullif(p_dados ->> 'resultado', '') end;
  v_motivo := case when jsonb_typeof(p_dados) = 'object' then nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '') end;
  if coalesce(v_res, '') not in ('GANHO', 'PERDA', 'ACORDO') then e := e || 'resultado'::text; end if;
  if v_motivo is null or length(v_motivo) not between 3 and 1000 then e := e || 'motivo'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Confira o resultado' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', case when 'resultado' = any (e) then 'RESULTADO_OBRIGATORIO' else 'MOTIVO_OBRIGATORIO' end,
                                  'campos', (select jsonb_agg(distinct v order by v) from unnest(e) v))::text;
  end if;
  if c.versao <> p_versao then perform conflito_versao('casos', c.id); end if;
  update casos set resultado = v_res, encerrado_por = 'RESULTADO' where id = c.id returning versao into v_versao;
  insert into caso_etapa_mudancas (escritorio_id, caso_id, de_etapa_id, para_etapa_id, motivo, resultado, por)
  values (p_escritorio, c.id, c.etapa_id, c.etapa_id, v_motivo, v_res, p_pessoa);
  perform registrar_historico('juridico.resultado_registrado', 'casos', c.id::text,
    jsonb_build_object('resultado', v_res, 'motivo', v_motivo, 'antes', 'IMPORTADO_ENCERRADO'));
  return jsonb_build_object('id', c.id, 'versao', v_versao, 'resultado', v_res);
end $$;

-- ---------------------------------------------------------------------------------------
-- 11. O encerrado importado com dinheiro do cliente entrando (um levantamento) volta ao acerto:
-- o repasse não pode sumir da ficha nem do próximo passo. Sem levantamento, fica fora.

select t921_trocar('caso_resumo_acerto(uuid,uuid,uuid)',
  $q$coalesce(ca.encerrado_por, 'RESULTADO') <> 'RESULTADO'$q$,
  $q$(coalesce(ca.encerrado_por, 'RESULTADO') <> 'RESULTADO'
       and not (ca.encerrado_por = 'IMPORTADO_ENCERRADO' and exists (select 1 from levantamentos lv where lv.caso_id = ca.id)))$q$);
select t921_trocar('cliente_passo_sem_docs(uuid,uuid,uuid)',
  $q$and coalesce(c.encerrado_por, 'RESULTADO') = 'RESULTADO'$q$,
  $q$and (coalesce(c.encerrado_por, 'RESULTADO') = 'RESULTADO'
                      or (c.encerrado_por = 'IMPORTADO_ENCERRADO' and exists (select 1 from levantamentos lv where lv.caso_id = c.id)))$q$);

-- "Cliente atendido" do caso que veio encerrado e teve o resultado registrado (decisão 2): o
-- passo diz de que sistema o caso veio, para a tela não dizer "encerrado no escritório".
select t921_trocar('cliente_fechamento(uuid,uuid,uuid,boolean)',
  $q$'caso', jsonb_build_object('id', ca.id, 'nome', ca.nome, 'resultado', ca.resultado, 'encerradoEm', ca.encerrado_em),$q$,
  $q$'caso', jsonb_build_object('id', ca.id, 'nome', ca.nome, 'resultado', ca.resultado, 'encerradoEm', ca.encerrado_em,
                                'veioEncerradoDe', case when ca.importacao_id is not null and exists (
                                    select 1 from historico h where h.escritorio_id = p_escritorio and h.entidade = 'casos'
                                       and h.entidade_id = ca.id::text and h.acao = 'juridico.resultado_registrado')
                                  then (select i.origem from importacoes i where i.id = ca.importacao_id) end),$q$);

drop function t921_trocar(regprocedure, text, text);

call fechar_acesso();
