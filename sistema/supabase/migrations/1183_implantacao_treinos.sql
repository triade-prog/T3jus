-- 1183 · Implantação assistida, parte 4: treinos por pessoa, quem acompanha e a situação calculada
-- (F1.45; CO-08). Plano aprovado em docs/design/aprovadas/console-implantacao/PLANO.md (seções
-- 4.2, 4.3, 4.5, 5.1, 5.2 e 7), com a revisão em REVISAO.md, o desenho em NOTAS.md (Registrar
-- treino, Desfazer registro, Trocar quem acompanha) e as decisões da Carol em DC14 (pergunta 6:
-- quem entra no escritório depois da implantação também é treinado, sem custo, na mesma lista).
-- Depende da 1180 e da 1181. Sem tela: as telas são do F1.47; a leitura do Portal (portal_implantacao,
-- com o próprio treino de cada pessoa) é da 1185 (F1.48).
--
--  * implantacao_treinos e implantacao_treino_pessoas: dado do escritório (escritorio_id,
--    proteger_tabela_escritorio, chaves compostas com o escritório, exportadas, guarda de 5 anos).
--    O treino guarda o dia (hoje ou antes: TREINO_NO_FUTURO), a duração (15 a 480 minutos), a forma
--    (VIDEO, PRESENCIAL ou TELEFONE), os temas (as áreas do Portal) e quem deu, que vem sempre da
--    sessão (contexto_pessoa()). Quem participou tem vínculo ativo de função do Portal no mesmo
--    escritório (PESSOA_SEM_VINCULO). Nada se edita: o registro errado se desfaz uma vez, com motivo
--    (desfeito_em e desfeito_por, da sessão); o motivo vai para o histórico interno, porque as
--    tabelas são exportadas. O desfeito fica na lista, riscado, e não conta no treino de ninguém.
--  * O treino liga à implantação aberta ou à concluída (DC14: quem chega depois também é treinado);
--    nunca à cancelada. "X de Y treinadas" é calculado na leitura: Y são as pessoas com vínculo
--    ativo do Portal hoje, X as que têm ao menos um treino não desfeito no escritório. Pessoa nova
--    entra em Y sozinha e volta a contar como sem treino.
--  * implantacoes.responsavel_id (quem acompanha, nulo até alguém escolher): só quem atende o
--    escritório (vínculo ativo) com a função Implantação ou Administração, ainda ativa na equipe
--    T3jus (RESPONSAVEL_SEM_ATRIBUICAO, num gatilho, para valer em qualquer caminho). Muda só com a
--    implantação aberta. Quem sai (desativado, sem a função ou sem a atribuição) deixa de acompanhar:
--    o gatilho implantacoes_passar_de_quem_saiu tira o nome, como nos interessados (EX-10; teste 046).
--  * implantacao_situacao(escritório): o que já aconteceu, lido na hora (sócio entrou, importação
--    concluída, WhatsApp ligado, o convite e o treino de cada pessoa, "X de Y" e os dias até o prazo).
--    Nada é guardado nem marcado à mão.
--  * Console: console_implantacao (a aba; ação console.implantacao.ver, o valor só com
--    console.cobranca.ver), console_implantacao_treino, console_implantacao_treino_desfazer e
--    console_implantacao_responsavel (ação console.implantacao.editar: Administração e Implantação).
--
-- Não recria função que já existe, a não ser implantacao_json (1181), que ganha o responsável.

-- ---------------------------------------------------------------------------------------
-- 1. Quem acompanha

alter table implantacoes add column responsavel_id uuid references pessoas (id) on delete restrict;
comment on column implantacoes.responsavel_id is
  'Quem da equipe T3jus acompanha a implantação: atende o escritório com a função Implantação ou Administração (CO-08)';
create index implantacoes_responsavel_idx on implantacoes (responsavel_id) where responsavel_id is not null;

update inventario_dados
   set o_que = 'A implantação assistida do escritório: número, estado, prazo, valor e condição do dia da abertura, quem da equipe T3jus acompanha, quem concluiu e o resumo'
 where tabela = 'implantacoes';

-- Quem pode acompanhar a implantação do escritório: vínculo ativo de Implantação ou Administração
-- e a mesma função ainda ativa na equipe T3jus, com a pessoa ativa (a regra de
-- pessoas_cobranca_do_escritorio, 0691). Lê com a marca t3jus.lendo_acesso (0210, 0590), porque o
-- gatilho de quem sai roda sem escritório no contexto.
create function implantacao_acompanhantes(p_escritorio uuid)
returns table (pessoa_id uuid, funcoes text[])
language plpgsql stable
set search_path = public
as $$
declare v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  return query
    select v.pessoa_id, array_agg(distinct v.funcao order by v.funcao)
      from vinculos v
      join equipe_funcoes f on f.pessoa_id = v.pessoa_id and f.funcao = v.funcao and f.retirada_em is null
      join equipe_t3 e on e.pessoa_id = v.pessoa_id and e.ativa
     where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('IMPLANTACAO', 'ADMINISTRACAO')
     group by v.pessoa_id
     order by v.pessoa_id;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
end $$;

create function implantacao_pode_acompanhar(p_pessoa uuid, p_escritorio uuid) returns boolean
language plpgsql stable
set search_path = public
as $$
begin
  return p_pessoa is not null and exists (select 1 from implantacao_acompanhantes(p_escritorio) a where a.pessoa_id = p_pessoa);
end $$;

-- A regra vale em qualquer caminho que grava o responsável. Tirar o nome (nulo) sempre pode.
create function implantacao_responsavel_conferir() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsavel_id is not null
     and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id)
     and not implantacao_pode_acompanhar(new.responsavel_id, new.escritorio_id) then
    raise exception 'Só quem atende o escritório com a função Implantação ou Administração acompanha a implantação'
      using errcode = 'TC422',
            detail = jsonb_build_object('motivo', 'RESPONSAVEL_SEM_ATRIBUICAO', 'campos', jsonb_build_array('responsavelId'))::text;
  end if;
  return new;
end $$;
create trigger implantacao_responsavel_conferir before insert or update of responsavel_id on implantacoes
  for each row execute function implantacao_responsavel_conferir();

-- Quem sai da equipe deixa de acompanhar (EX-10): a pessoa desativada, a que perdeu a função ou a
-- que deixou de atender o escritório. Só a implantação aberta muda (a concluída guarda quem
-- acompanhou). Sem escritório no contexto (desativar e rever funções são ações globais), lê e muda
-- com a marca t3jus.implantacao_quem_saiu, ligada só aqui dentro.
create policy quem_saiu_ler on implantacoes for select to dominio
  using (current_setting('t3jus.implantacao_quem_saiu', true) = 'on');
create policy quem_saiu_mudar on implantacoes for update to dominio
  using (current_setting('t3jus.implantacao_quem_saiu', true) = 'on') with check (true);

create function implantacoes_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_quem uuid;
  v_escritorio uuid;
  v_antes text := current_setting('t3jus.implantacao_quem_saiu', true);
  v_acesso text := current_setting('t3jus.lendo_acesso', true);
  r record;
begin
  if new.acao = 'equipe.atribuicao_retirada' then
    perform set_config('t3jus.lendo_acesso', 'on', true);
    select v.pessoa_id, v.escritorio_id into v_quem, v_escritorio from vinculos v where v.id = nullif(new.entidade_id, '')::uuid;
    perform set_config('t3jus.lendo_acesso', coalesce(v_acesso, ''), true);
  else
    v_quem := nullif(new.entidade_id, '')::uuid;
  end if;
  if v_quem is null then return new; end if;
  perform set_config('t3jus.implantacao_quem_saiu', 'on', true);
  for r in select i.id, i.escritorio_id from implantacoes i
            where i.estado = 'ABERTA' and i.responsavel_id = v_quem
              and (v_escritorio is null or i.escritorio_id = v_escritorio)
            order by i.id for update loop
    if not implantacao_pode_acompanhar(v_quem, r.escritorio_id) then
      update implantacoes set responsavel_id = null where id = r.id;
    end if;
  end loop;
  perform set_config('t3jus.implantacao_quem_saiu', coalesce(v_antes, ''), true);
  return new;
end $$;
create trigger implantacoes_passar_de_quem_saiu after insert on historico
  for each row when (new.acao in ('equipe.membro_desativado', 'equipe.funcoes_alteradas', 'equipe.atribuicao_retirada'))
  execute function implantacoes_passar_de_quem_saiu();

-- O bloco da implantação (1181) passa a trazer quem acompanha.
create or replace function implantacao_json(i implantacoes) returns jsonb
language sql stable set search_path = public
as $$
  select case when i.id is not null then jsonb_build_object(
    'id', i.id, 'numero', i.numero, 'estado', i.estado, 'abertaEm', i.aberta_em, 'prazoAte', i.prazo_ate,
    'nome', i.nome, 'condicao', i.condicao, 'condicaoTexto', i.condicao_texto,
    'responsavel', (select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = i.responsavel_id),
    'concluidaEm', i.concluida_em, 'concluidaPor', (select nome from pessoas where id = i.concluida_por),
    'resumo', i.resumo, 'canceladaEm', i.cancelada_em, 'versao', i.versao) end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Os treinos (dado do escritório; entram na exportação)

-- As áreas do Portal que o treino pode cobrir (a lista do desenho, NOTAS.md).
create function implantacao_temas() returns text[]
language sql immutable
as $$ select array['INICIO', 'CLIENTES', 'CONVERSAS', 'AGENDA', 'COMERCIAL', 'CONTRATOS', 'FINANCEIRO',
                   'JURIDICO', 'DOCUMENTOS', 'ESCRITORIO'] $$;

create table implantacao_treinos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  implantacao_id  uuid not null,
  dia             date not null,
  duracao_min     integer not null check (duracao_min between 15 and 480),
  forma           text not null check (forma in ('VIDEO', 'PRESENCIAL', 'TELEFONE')),
  temas           text[] not null default '{}'
                  check (temas <@ implantacao_temas() and cardinality(temas) <= 10 and array_position(temas, null) is null),
  -- Quem deu o treino: a pessoa da sessão, nunca o pedido.
  dado_por        uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  -- O registro errado se desfaz uma vez, com motivo (no histórico interno).
  desfeito_em     timestamptz,
  desfeito_por    uuid references pessoas (id) on delete restrict,
  unique (escritorio_id, id),
  foreign key (escritorio_id, implantacao_id) references implantacoes (escritorio_id, id) on delete restrict,
  check ((desfeito_em is null) = (desfeito_por is null))
);
create index implantacao_treinos_implantacao_idx on implantacao_treinos (escritorio_id, implantacao_id, dia desc);
call proteger_tabela_escritorio('implantacao_treinos');
create trigger implantacao_treinos_sem_exclusao before delete on implantacao_treinos
  for each row execute function somente_insercao();

create table implantacao_treino_pessoas (
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  treino_id      uuid not null,
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  primary key (treino_id, pessoa_id),
  foreign key (escritorio_id, treino_id) references implantacao_treinos (escritorio_id, id) on delete restrict
);
create index implantacao_treino_pessoas_pessoa_idx on implantacao_treino_pessoas (escritorio_id, pessoa_id);
call proteger_tabela_escritorio('implantacao_treino_pessoas');
create trigger implantacao_treino_pessoas_so_insercao before update or delete on implantacao_treino_pessoas
  for each row execute function somente_insercao();

-- Na inserção: quem deu é a sessão, a hora é a do banco, o dia é de hoje ou antes e a implantação
-- não foi cancelada. O que viesse no INSERT para o autor e o desfazer é trocado.
create function implantacao_treino_conferir() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.dado_por := contexto_pessoa();
  if new.dado_por is null then
    raise exception 'O treino precisa de quem deu, da sessão' using errcode = 'TC401';
  end if;
  new.criado_em := app_now();
  new.desfeito_em := null;
  new.desfeito_por := null;
  if new.dia > hoje_brasilia() then
    raise exception 'O treino precisa ser de hoje ou de antes' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'TREINO_NO_FUTURO', 'campos', jsonb_build_array('dia'))::text;
  end if;
  if not exists (select 1 from implantacoes i where i.escritorio_id = new.escritorio_id and i.id = new.implantacao_id
                                               and i.estado in ('ABERTA', 'CONCLUIDA')) then
    perform recusar_motivo('Este escritório não tem implantação em andamento', 'IMPLANTACAO_NAO_ABERTA');
  end if;
  return new;
end $$;
create trigger implantacao_treino_conferir before insert on implantacao_treinos
  for each row execute function implantacao_treino_conferir();

-- Depois: só o desfazer, uma vez, com a hora do banco e a pessoa da sessão.
create function implantacao_treino_so_desfaz() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.id, new.escritorio_id, new.implantacao_id, new.dia, new.duracao_min, new.forma, new.temas, new.dado_por, new.criado_em)
     is distinct from
     (old.id, old.escritorio_id, old.implantacao_id, old.dia, old.duracao_min, old.forma, old.temas, old.dado_por, old.criado_em) then
    raise exception 'O treino não se edita: desfaça o registro, com o motivo' using errcode = 'TC010';
  end if;
  if old.desfeito_em is not null then
    raise exception 'Este registro já foi desfeito' using errcode = 'TC010';
  end if;
  if new.desfeito_em is null then
    raise exception 'O treino só muda para desfeito' using errcode = 'TC010';
  end if;
  new.desfeito_em := app_now();
  new.desfeito_por := contexto_pessoa();
  if new.desfeito_por is null then
    raise exception 'Desfazer precisa de quem desfez, da sessão' using errcode = 'TC401';
  end if;
  return new;
end $$;
create trigger implantacao_treino_so_desfaz before update on implantacao_treinos
  for each row execute function implantacao_treino_so_desfaz();

-- Quem participou: entra só junto com o treino (console_implantacao_treino liga a marca com o id
-- dele) e tem vínculo ativo de função do Portal no mesmo escritório.
create function implantacao_treino_pessoa_conferir() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('t3jus.registrando_treino', true) is distinct from new.treino_id::text then
    raise exception 'Quem participou entra junto com o registro do treino' using errcode = 'TC010';
  end if;
  if not exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
                  where v.pessoa_id = new.pessoa_id and v.escritorio_id = new.escritorio_id and v.revogado_em is null) then
    raise exception 'Só participa quem tem acesso ao Portal do escritório' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PESSOA_SEM_VINCULO', 'campos', jsonb_build_array('pessoas'))::text;
  end if;
  return new;
end $$;
create trigger implantacao_treino_pessoa_conferir before insert on implantacao_treino_pessoas
  for each row execute function implantacao_treino_pessoa_conferir();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('implantacao_treinos', true,
  'Os treinos da implantação assistida: dia, duração, forma, temas, quem da equipe T3jus deu e quem desfez o registro',
  'Treinar todas as pessoas do escritório e medir o tempo de treino da implantação (CO-08)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('implantacao_treino_pessoas', true,
  'Quem do escritório participou de cada treino da implantação assistida',
  'Mostrar quem já foi treinado e quem falta (CO-08)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- 3. Leituras

-- Um treino, com quem participou. Com p_interno (Console), o motivo do desfazer, que está no
-- histórico interno; o Portal (1185) lê sem ele.
create function implantacao_treino_json(t implantacao_treinos, p_interno boolean) returns jsonb
language plpgsql stable
set search_path = public
as $$
begin
  return jsonb_build_object(
    'id', t.id, 'implantacaoId', t.implantacao_id,
    'implantacaoNumero', (select i.numero from implantacoes i where i.escritorio_id = t.escritorio_id and i.id = t.implantacao_id),
    'dia', t.dia, 'duracaoMin', t.duracao_min, 'forma', t.forma, 'temas', to_jsonb(t.temas),
    'dadoPor', (select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = t.dado_por),
    'criadoEm', t.criado_em,
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome, p.id)
                           from implantacao_treino_pessoas tp join pessoas p on p.id = tp.pessoa_id
                          where tp.escritorio_id = t.escritorio_id and tp.treino_id = t.id), '[]'::jsonb),
    'desfeito', case when t.desfeito_em is not null then jsonb_build_object(
      'em', t.desfeito_em,
      'por', (select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = t.desfeito_por))
      || case when p_interno then jsonb_build_object('motivo',
           (select h.dados ->> 'motivo' from historico h
             where h.escritorio_id = t.escritorio_id and h.entidade = 'implantacao_treinos' and h.entidade_id = t.id::text
               and h.acao = 'implantacao.treino_desfeito' order by h.id desc limit 1)) else '{}'::jsonb end end);
end $$;

-- O que já aconteceu, calculado na hora (plano, 4.5). Nada é guardado nem marcado à mão.
create function implantacao_situacao(p_escritorio uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  i implantacoes;
  v_dia_um date := escritorio_dia_um(p_escritorio);
  v_socio jsonb;
  v_importacao jsonb;
  v_whats jsonb;
  v_pessoas jsonb;
  v_total integer;
  v_treinadas integer;
begin
  select * into i from implantacoes where escritorio_id = p_escritorio and estado <> 'CANCELADA' order by numero desc limit 1;

  -- O sócio entrou: o dia 1 (1160) e quem abriu a implantação; nos escritórios de antes da 1160, o
  -- sócio que primeiro criou a senha.
  if v_dia_um is not null then
    v_socio := jsonb_build_object('entrou', true, 'dia', v_dia_um,
      'pessoa', (select jsonb_build_object('id', p.id, 'nome', p.nome)
                   from historico h join pessoas p on p.id = h.autor_id
                  where h.escritorio_id = p_escritorio and h.entidade = 'implantacoes' and h.dados ->> 'evento' = 'IMPLANTACAO_ABERTA'
                    and h.autor_tipo = 'PESSOA'
                    and exists (select 1 from vinculos v where v.pessoa_id = p.id and v.escritorio_id = p_escritorio and v.funcao = 'SOCIO')
                  order by h.id limit 1));
  else
    select jsonb_build_object('entrou', true, 'dia', (p.senha_criada_em at time zone 'America/Sao_Paulo')::date,
                              'pessoa', jsonb_build_object('id', p.id, 'nome', p.nome))
      into v_socio
      from vinculos v join pessoas p on p.id = v.pessoa_id
     where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null and p.senha_criada_em is not null
     order by p.senha_criada_em, p.id limit 1;
    v_socio := coalesce(v_socio, jsonb_build_object('entrou', false, 'dia', null, 'pessoa', null));
  end if;

  select jsonb_build_object('concluida', true, 'em', m.importado_em, 'origem', m.origem, 'oQue', m.o_que)
    into v_importacao
    from importacoes m
   where m.escritorio_id = p_escritorio and m.estado = 'CONCLUIDA' and m.origem in ('PLANILHA', 'ASTREA', 'ADVBOX_PLANILHA')
   order by m.importado_em desc limit 1;

  select jsonb_build_object('ligado', true, 'desde', w.ligado_em)
    into v_whats
    from whatsapp_escritorio w
   where w.escritorio_id = p_escritorio and w.situacao = 'LIGADO'
   order by w.ligado_em desc nulls last limit 1;

  -- As pessoas com vínculo ativo do Portal hoje (quem entra depois aparece sozinho), com o convite
  -- e o último treino não desfeito no escritório (de qualquer implantação dele).
  with gente as (
    select distinct on (v.pessoa_id) v.pessoa_id, v.funcao, v.criado_em as convidada_em
      from vinculos v join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
     where v.escritorio_id = p_escritorio and v.revogado_em is null
     order by v.pessoa_id, (v.funcao = 'SOCIO') desc, v.criado_em
  ), treino as (
    select distinct on (tp.pessoa_id) tp.pessoa_id, t.id, t.dia, t.forma, t.duracao_min
      from implantacao_treino_pessoas tp
      join implantacao_treinos t on t.escritorio_id = tp.escritorio_id and t.id = tp.treino_id and t.desfeito_em is null
     where tp.escritorio_id = p_escritorio
     order by tp.pessoa_id, t.dia desc, t.criado_em desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', p.nome, 'funcao', g.funcao, 'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
           'convite', jsonb_build_object('aceitou', p.senha_criada_em is not null, 'aceitouEm', p.senha_criada_em,
                                         'convidadaEm', g.convidada_em),
           'treino', case when tr.id is not null then jsonb_build_object(
             'treinada', true, 'treinoId', tr.id, 'dia', tr.dia, 'forma', tr.forma, 'duracaoMin', tr.duracao_min)
             else jsonb_build_object('treinada', false) end)
           order by (g.funcao = 'SOCIO') desc, p.nome, p.id), '[]'::jsonb),
         count(*)::int, count(tr.id)::int
    into v_pessoas, v_total, v_treinadas
    from gente g join pessoas p on p.id = g.pessoa_id left join treino tr on tr.pessoa_id = g.pessoa_id;

  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'socioEntrou', v_socio,
    'importacao', coalesce(v_importacao, jsonb_build_object('concluida', false)),
    'whatsapp', coalesce(v_whats, jsonb_build_object('ligado', false)),
    'pessoas', v_pessoas,
    'treinadas', v_treinadas,
    'total', v_total,
    'diasAtePrazo', case when i.estado = 'ABERTA' then i.prazo_ate - hoje_brasilia() end);
end $$;

-- A aba Implantação do Console (plano, 4.5 e 8.1). A condição para todos que veem a aba; o valor
-- só com console.cobranca.ver (Administração e Financeiro). Com a implantação aberta e quem pode
-- editar, a lista de quem pode acompanhar (para "Trocar quem acompanha").
create function console_implantacao(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i implantacoes;
  v_valores boolean;
  v_editar boolean;
  v_cliente clientes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.implantacao.ver');
  v_valores := pode(p_pessoa, p_escritorio, 'console.cobranca.ver');
  v_editar := pode(p_pessoa, p_escritorio, 'console.implantacao.editar');
  select * into v_cliente from clientes where escritorio_id = p_escritorio;
  select * into i from implantacoes where escritorio_id = p_escritorio order by numero desc limit 1;
  return jsonb_build_object(
    'podeEditar', v_editar,
    'podeMudarPrazo', pode(p_pessoa, p_escritorio, 'console.implantacao.prazo'),
    'podeConcluir', pode(p_pessoa, p_escritorio, 'console.estagio.mudar'),
    'valores', v_valores,
    'cliente', jsonb_build_object('estado', v_cliente.estado, 'versao', v_cliente.versao),
    'implantacao', case when i.id is not null then implantacao_json(i)
      || jsonb_build_object('descricao', i.descricao)
      || case when v_valores then jsonb_build_object('valorCentavos', i.valor_centavos) else '{}'::jsonb end end,
    'acompanhantes', case when v_editar and i.estado = 'ABERTA' then coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'funcoes', to_jsonb(a.funcoes)) order by p.nome, p.id)
        from implantacao_acompanhantes(p_escritorio) a join pessoas p on p.id = a.pessoa_id), '[]'::jsonb) end,
    'situacao', implantacao_situacao(p_escritorio),
    'treinos', coalesce((select jsonb_agg(implantacao_treino_json(t, true) order by t.dia desc, t.criado_em desc, t.id)
                           from implantacao_treinos t where t.escritorio_id = p_escritorio), '[]'::jsonb),
    'temas', to_jsonb(implantacao_temas()));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Registrar e desfazer o treino

-- Os campos voltam juntos (o desenho mostra o resumo dos erros): dia (de hoje ou antes:
-- TREINO_NO_FUTURO), duracaoMin (15 a 480), forma, pessoas (ao menos uma, todas com acesso ao
-- Portal do escritório: PESSOA_SEM_VINCULO) e temas (da lista). O treino liga à implantação do
-- escritório que não foi cancelada: a aberta ou, para quem chegou depois, a concluída (DC14).
create function console_implantacao_treino(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i implantacoes;
  t implantacao_treinos;
  v_campos text[] := '{}';
  v_motivo text;
  v_dia date;
  v_duracao integer;
  v_forma text := p_dados ->> 'forma';
  v_pessoas uuid[];
  v_temas text[];
  v_sem_vinculo uuid[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.implantacao.editar');
  select * into i from implantacoes where escritorio_id = p_escritorio and estado <> 'CANCELADA' order by numero desc limit 1;
  if i.id is null then
    perform recusar_motivo('Este escritório não tem implantação em andamento', 'IMPLANTACAO_NAO_ABERTA');
  end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then perform recusar_campos('Confira o treino', 'treino'); end if;

  begin
    v_dia := case when p_dados ->> 'dia' ~ '^\d{4}-\d{2}-\d{2}$' then (p_dados ->> 'dia')::date end;
  exception when others then v_dia := null; end;
  begin
    v_duracao := case when jsonb_typeof(p_dados -> 'duracaoMin') = 'number' then (p_dados ->> 'duracaoMin')::int end;
  exception when others then v_duracao := null; end;
  begin
    select coalesce(array_agg(distinct x::uuid), '{}') into v_pessoas
      from jsonb_array_elements_text(case when jsonb_typeof(p_dados -> 'pessoas') = 'array' then p_dados -> 'pessoas' else '[]' end) x;
  exception when others then v_pessoas := null; end;
  select coalesce(array_agg(distinct x order by x), '{}') into v_temas
    from jsonb_array_elements_text(case when jsonb_typeof(p_dados -> 'temas') = 'array' then p_dados -> 'temas' else '[]' end) x;

  if v_dia is null then
    v_campos := v_campos || 'dia'::text;
  elsif v_dia > hoje_brasilia() then
    v_campos := v_campos || 'dia'::text;
    v_motivo := 'TREINO_NO_FUTURO';
  end if;
  if v_duracao is null or v_duracao not between 15 and 480 then v_campos := v_campos || 'duracaoMin'::text; end if;
  if v_forma is null or v_forma not in ('VIDEO', 'PRESENCIAL', 'TELEFONE') then v_campos := v_campos || 'forma'::text; end if;
  if v_pessoas is null or cardinality(v_pessoas) = 0 or cardinality(v_pessoas) > 100 then
    v_campos := v_campos || 'pessoas'::text;
  else
    select coalesce(array_agg(x order by x), '{}') into v_sem_vinculo
      from unnest(v_pessoas) x
     where not exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
                        where v.pessoa_id = x and v.escritorio_id = p_escritorio and v.revogado_em is null);
    if cardinality(v_sem_vinculo) > 0 then
      v_campos := v_campos || 'pessoas'::text;
      v_motivo := coalesce(v_motivo, 'PESSOA_SEM_VINCULO');
    end if;
  end if;
  if jsonb_typeof(coalesce(p_dados -> 'temas', '[]')) <> 'array' or not (v_temas <@ implantacao_temas()) then
    v_campos := v_campos || 'temas'::text;
  end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira o treino' using errcode = 'TC422',
      detail = jsonb_strip_nulls(jsonb_build_object('campos', to_jsonb(v_campos), 'motivo', v_motivo,
                                                    'pessoasSemVinculo', case when cardinality(v_sem_vinculo) > 0 then to_jsonb(v_sem_vinculo) end))::text;
  end if;

  insert into implantacao_treinos (escritorio_id, implantacao_id, dia, duracao_min, forma, temas, dado_por)
  values (p_escritorio, i.id, v_dia, v_duracao, v_forma, v_temas, p_pessoa)
  returning * into t;
  perform set_config('t3jus.registrando_treino', t.id::text, true);
  insert into implantacao_treino_pessoas (escritorio_id, treino_id, pessoa_id)
  select p_escritorio, t.id, x from unnest(v_pessoas) x order by x;
  perform set_config('t3jus.registrando_treino', '', true);
  perform registrar_historico_interno('implantacao.treino_registrado', 'implantacao_treinos', t.id::text,
    jsonb_build_object('implantacao_id', i.id, 'dia', t.dia, 'duracao_min', t.duracao_min, 'forma', t.forma,
                       'pessoas', to_jsonb(v_pessoas)));
  return jsonb_build_object('treino', implantacao_treino_json(t, true), 'situacao', implantacao_situacao(p_escritorio));
end $$;

-- Desfazer o registro, uma vez, com motivo (MOTIVO_OBRIGATORIO, até 300 caracteres). O registro
-- fica, riscado; o motivo vai para o histórico interno (a tabela é exportada). O treino de outro
-- escritório não aparece (o RLS), e a resposta é a de registro não encontrado.
create function console_implantacao_treino_desfazer(p_pessoa uuid, p_escritorio uuid, p_treino uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare t implantacao_treinos; v_motivo text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.implantacao.editar');
  select * into t from implantacao_treinos where id = p_treino and escritorio_id = p_escritorio for update;
  if t.id is null then raise exception 'Treino não encontrado' using errcode = 'TC404'; end if;
  if t.desfeito_em is not null then
    perform recusar_motivo_409('Este registro já foi desfeito', 'TREINO_JA_DESFEITO');
  end if;
  v_motivo := motivo_valido(p_motivo);
  update implantacao_treinos set desfeito_em = app_now() where id = t.id returning * into t;
  perform registrar_historico_interno('implantacao.treino_desfeito', 'implantacao_treinos', t.id::text,
    jsonb_build_object('motivo', v_motivo, 'implantacao_id', t.implantacao_id));
  return jsonb_build_object('treino', implantacao_treino_json(t, true), 'situacao', implantacao_situacao(p_escritorio));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Trocar quem acompanha

-- Só com a implantação aberta (IMPLANTACAO_NAO_ABERTA) e a versão lida; a pessoa precisa atender o
-- escritório com Implantação ou Administração (RESPONSAVEL_SEM_ATRIBUICAO, pelo gatilho). A troca
-- vai para o histórico interno, só com os ids.
create function console_implantacao_responsavel(p_pessoa uuid, p_escritorio uuid, p_responsavel uuid, p_versao integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i implantacoes; v_antes uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.implantacao.editar');
  select * into i from implantacoes where escritorio_id = p_escritorio and estado = 'ABERTA' for update;
  if i.id is null then
    perform recusar_motivo('Este escritório não tem implantação em andamento', 'IMPLANTACAO_NAO_ABERTA');
  end if;
  if p_responsavel is null then perform recusar_campos('Escolha quem acompanha', 'responsavelId'); end if;
  if p_versao is null or i.versao <> p_versao then perform conflito_versao('implantacoes', i.id); end if;
  if i.responsavel_id is not distinct from p_responsavel then
    return jsonb_build_object('versao', i.versao, 'mudou', false, 'implantacao', implantacao_json(i));
  end if;
  v_antes := i.responsavel_id;
  update implantacoes set responsavel_id = p_responsavel where id = i.id returning * into i;
  perform registrar_historico_interno('implantacao.responsavel_trocado', 'implantacoes', i.id::text,
    jsonb_build_object('de', v_antes, 'para', p_responsavel));
  return jsonb_build_object('versao', i.versao, 'mudou', true, 'implantacao', implantacao_json(i));
end $$;

call fechar_acesso();
