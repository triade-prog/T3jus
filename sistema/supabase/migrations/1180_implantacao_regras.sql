-- 1180 · Implantação assistida, parte 1: a regra global e a implantação congelada por escritório
-- (F1.42; CO-08). Plano aprovado em docs/design/aprovadas/console-implantacao/PLANO.md (seções 3,
-- 4, 5 e 7), com a revisão em REVISAO.md no mesmo lugar e as decisões da Carol de 27/11/2026 em
-- DC14: R$ 1.490,00; grátis nos 6 primeiros meses, contados de uma data de lançamento que a
-- Administração grava (sem data, a implantação fica isenta); fatura cancelada não volta a cobrar;
-- nos 30 dias, só avisos e troca de prazo; quando cobrar, à vista na 1ª fatura; quem chega depois
-- é treinado sem custo.
--
--  * implantacao_regras: uma linha só, como planos_regras. O valor, a condição padrão (ISENTA ou
--    COBRADA), a data de corte da isenção (isencao_ate, separada da condição: nula = isenta sem
--    data de fim), o texto público da isenção e o prazo (30 dias). Só a Administração muda
--    (console.implantacao.regras); cada mudança vai para planos_eventos com o autor.
--  * implantacao_condicao(dia): a condição e o texto do dia, pela regra.
--  * implantacoes: dado do escritório (escritorio_id, proteger_tabela_escritorio, exportada). O
--    nome, a descrição, o valor e a condição são copiados da regra na abertura, por gatilho, e não
--    mudam mais: mudar a regra vale só para as implantações que abrirem depois. O estado passa
--    pelo guardião também no INSERT (nasce ABERTA, com definir_transicao). Quem conclui vem
--    sempre da sessão (contexto_pessoa()), nunca do pedido.
--  * A chave implantacao_na_fatura, desligada: as linhas na 1ª fatura são do PR 3 (1182) e só
--    ligam com as telas do Portal (PR 7).
--
-- Fica para as próximas migrations: a abertura no primeiro acesso do sócio, a conclusão, o
-- cancelamento e a reabertura (1181), as linhas na fatura (1182), os treinos (1183), os avisos
-- (1184) e o Portal (1185). Esta migration não depende da 1160 do CO-09 (testes_gratis).

-- ---------------------------------------------------------------------------------------
-- 1. Quem pode o quê (plano, seção 7). Concluir usa console.estagio.mudar, que já existe.

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.implantacao.ver'),
  ('IMPLANTACAO',   'console.implantacao.ver'),
  ('FINANCEIRO',    'console.implantacao.ver'),
  ('SUPORTE',       'console.implantacao.ver'),
  ('ADMINISTRACAO', 'console.implantacao.editar'),
  ('IMPLANTACAO',   'console.implantacao.editar'),
  ('ADMINISTRACAO', 'console.implantacao.prazo'),
  ('ADMINISTRACAO', 'console.implantacao.regras'),
  ('SOCIO',         'portal.implantacao.ver');

insert into configuracoes (chave, valor, descricao) values
  ('implantacao_na_fatura', 'false',
   'Põe as linhas da implantação assistida na 1ª fatura (CO-08). Liga junto com as telas');

create function implantacao_na_fatura() returns boolean
language sql stable set search_path = public
as $$ select coalesce(configuracao('implantacao_na_fatura') = 'true'::jsonb, false) $$;

-- ---------------------------------------------------------------------------------------
-- 2. A regra global (não é dado de escritório).

create table implantacao_regras (
  id               boolean primary key default true check (id),
  nome             text not null check (length(btrim(nome)) between 2 and 60),
  descricao        text not null check (length(btrim(descricao)) between 1 and 120),
  valor_centavos   integer not null check (valor_centavos between 0 and 10000000),
  condicao_padrao  text not null check (condicao_padrao in ('ISENTA', 'COBRADA')),
  -- Só vale com ISENTA: até este dia (inclusive) a implantação que abre é isenta; nula, sem fim.
  isencao_ate      date,
  -- Público: vai na linha da isenção da fatura ("Isenção da implantação · Oferta de lançamento").
  isencao_texto    text not null check (length(btrim(isencao_texto)) between 1 and 60),
  prazo_dias       integer not null check (prazo_dias between 1 and 90),
  alterado_em      timestamptz,
  alterado_por     uuid references pessoas (id) on delete restrict,
  versao           integer not null default 1
);
call proteger_tabela_global('implantacao_regras',
  'A regra da implantação assistida (valor, condição, data de corte e prazo), única para todos os escritórios');
create trigger controle_versao before update on implantacao_regras for each row execute function controle_versao();
create trigger implantacao_regras_sem_exclusao before delete on implantacao_regras
  for each row execute function somente_insercao();
-- O valor de R$ 1.490,00 (DC14) é configuração: a Administração muda em Cobrança › Planos.
-- Nasce isenta e sem data de corte: nenhum escritório sai cobrado (revisão, correção 4).
insert into implantacao_regras (nome, descricao, valor_centavos, condicao_padrao, isencao_ate, isencao_texto, prazo_dias)
values ('Implantação assistida', 'treino de toda a equipe e acompanhamento por 30 dias', 149000, 'ISENTA', null,
        'Oferta de lançamento', 30);

-- A condição do dia (plano, regra 1): COBRADA cobra sempre; ISENTA é isenta até isencao_ate
-- (inclusive) ou sem fim, se a data for nula. O texto só existe na isenta.
create function implantacao_condicao(p_dia date) returns table (condicao text, texto text)
language sql stable
set search_path = public
as $$
  select c, case when c = 'ISENTA' then r.isencao_texto end
    from implantacao_regras r,
         lateral (select case when r.condicao_padrao = 'ISENTA' and (r.isencao_ate is null or p_dia <= r.isencao_ate)
                              then 'ISENTA' else 'COBRADA' end as c) x
$$;

create function implantacao_regra_json(r implantacao_regras) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'nome', r.nome, 'descricao', r.descricao, 'valorCentavos', r.valor_centavos,
    'condicaoPadrao', r.condicao_padrao, 'isencaoAte', r.isencao_ate, 'isencaoTexto', r.isencao_texto,
    'prazoDias', r.prazo_dias, 'versao', r.versao, 'alteradoEm', r.alterado_em,
    'alteradoPor', (select p.nome from pessoas p where p.id = r.alterado_por))
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A implantação de cada escritório (dado do escritório; entra na exportação).

create table implantacoes (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  numero          integer not null check (numero >= 1),
  estado          text not null default 'ABERTA' check (estado in ('ABERTA', 'CONCLUIDA', 'CANCELADA')),
  aberta_em       date not null,
  prazo_ate       date not null,
  -- Copiados da regra na abertura (congelados). condicao_texto é o texto público da fatura.
  nome            text not null check (length(btrim(nome)) between 2 and 60),
  descricao       text not null check (length(btrim(descricao)) between 1 and 120),
  valor_centavos  integer not null check (valor_centavos between 0 and 10000000),
  condicao        text not null check (condicao in ('ISENTA', 'COBRADA')),
  condicao_texto  text check (length(btrim(condicao_texto)) between 1 and 60),
  -- Quem acompanha (responsavel_id) entra na 1183, junto com a regra de quem pode ser, a rota e
  -- a passagem de quem sai da equipe (teste 046, EX-10).
  concluida_em    timestamptz,
  concluida_por   uuid references pessoas (id) on delete restrict,
  -- O resumo da conclusão, que os sócios leem no Portal.
  resumo          text check (length(btrim(resumo)) between 1 and 2000),
  -- O motivo do cancelamento fica no histórico do encerramento do contrato.
  cancelada_em    timestamptz,
  criado_em       timestamptz not null default app_now(),
  versao          integer not null default 1,
  -- As tabelas filhas (treinos, itens da fatura, avisos) apontam com o escritório junto.
  unique (escritorio_id, id),
  unique (escritorio_id, numero),
  check (prazo_ate >= aberta_em),
  check ((condicao = 'ISENTA') = (condicao_texto is not null)),
  check ((estado = 'CONCLUIDA') = (concluida_em is not null)),
  check (concluida_por is null or concluida_em is not null),
  check (resumo is null or estado = 'CONCLUIDA'),
  check ((estado = 'CANCELADA') = (cancelada_em is not null))
);
-- Uma aberta por escritório: a abertura pelo primeiro acesso e pela 1ª fatura não colidem.
create unique index implantacoes_uma_aberta on implantacoes (escritorio_id) where estado = 'ABERTA';
call proteger_tabela_escritorio('implantacoes');
call ligar_guardiao('implantacoes');
insert into estados_iniciais (tabela, estado) values ('implantacoes', 'ABERTA');
insert into transicoes_permitidas (tabela, de, para) values
  ('implantacoes', 'ABERTA', 'CONCLUIDA'),
  ('implantacoes', 'ABERTA', 'CANCELADA');
create trigger implantacoes_sem_exclusao before delete on implantacoes
  for each row execute function somente_insercao();

-- Na abertura, o que vale é a regra do dia: o que veio no INSERT para o nome, a descrição, o
-- valor e a condição é trocado pelo da regra. O número é o próximo do escritório (2 na
-- reabertura) e o prazo, se não veio, conta do dia da abertura.
create function implantacao_congelar() returns trigger
language plpgsql
set search_path = public
as $$
declare
  r implantacao_regras;
  v_condicao text;
  v_texto text;
begin
  select * into r from implantacao_regras;
  new.aberta_em := coalesce(new.aberta_em, hoje_brasilia());
  select c.condicao, c.texto into v_condicao, v_texto from implantacao_condicao(new.aberta_em) c;
  new.nome := r.nome;
  new.descricao := r.descricao;
  new.valor_centavos := r.valor_centavos;
  new.condicao := v_condicao;
  new.condicao_texto := v_texto;
  new.prazo_ate := coalesce(new.prazo_ate, new.aberta_em + r.prazo_dias);
  new.numero := coalesce(new.numero,
    (select coalesce(max(i.numero), 0) + 1 from implantacoes i where i.escritorio_id = new.escritorio_id));
  new.concluida_em := null;
  new.concluida_por := null;
  new.resumo := null;
  new.cancelada_em := null;
  new.criado_em := app_now();
  return new;
end $$;
create trigger implantacao_congelar before insert on implantacoes
  for each row execute function implantacao_congelar();

-- Depois da abertura, o congelado não muda. Enquanto ABERTA, muda o prazo (e, da 1183, o responsável);
-- concluir e cancelar passam pelo guardião, com a hora do banco e o autor da sessão. Concluída ou
-- cancelada, nada mais muda.
create function implantacao_so_muda_o_permitido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.id, new.escritorio_id, new.numero, new.aberta_em, new.nome, new.descricao, new.valor_centavos,
      new.condicao, new.condicao_texto, new.criado_em)
     is distinct from
     (old.id, old.escritorio_id, old.numero, old.aberta_em, old.nome, old.descricao, old.valor_centavos,
      old.condicao, old.condicao_texto, old.criado_em) then
    raise exception 'A implantação guarda a condição do dia em que abriu' using errcode = 'TC010';
  end if;
  if old.estado <> 'ABERTA' then
    raise exception 'A implantação % não muda mais', lower(old.estado) using errcode = 'TC010';
  end if;
  if new.estado = 'CONCLUIDA' then
    new.concluida_em := app_now();
    new.concluida_por := contexto_pessoa();
    new.cancelada_em := null;
  elsif new.estado = 'CANCELADA' then
    new.cancelada_em := app_now();
    new.concluida_em := null;
    new.concluida_por := null;
    new.resumo := null;
  else
    if new.concluida_em is not null or new.concluida_por is not null or new.resumo is not null or new.cancelada_em is not null then
      raise exception 'Concluir e cancelar mudam o estado da implantação' using errcode = 'TC010';
    end if;
  end if;
  return new;
end $$;
create trigger implantacao_so_muda_o_permitido before update on implantacoes
  for each row execute function implantacao_so_muda_o_permitido();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('implantacao_regras', false, 'A regra da implantação assistida: valor, condição padrão, data de corte da isenção, texto e prazo',
  null, null, null, null, null, null, false),
 ('implantacoes', true,
  'A implantação assistida do escritório: número, estado, prazo, valor e condição do dia da abertura, quem concluiu e o resumo',
  'Treinar a equipe do escritório e acompanhar o uso no prazo combinado (CO-08)',
  'Execução de contrato (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- 4. A regra no Console (Cobrança › Planos): Administração e Financeiro leem; só a
--    Administração muda. O histórico é o de planos_eventos com a ação implantacao.regra_mudou.

create function console_implantacao_regras(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r implantacao_regras; v_condicao text; v_texto text;
begin
  perform entrar_console(p_pessoa, 'console.cobranca.ver');
  select * into r from implantacao_regras;
  select c.condicao, c.texto into v_condicao, v_texto from implantacao_condicao(hoje_brasilia()) c;
  return jsonb_build_object(
    'podeEditar', pode_global('console.implantacao.regras'),
    'regra', implantacao_regra_json(r),
    -- O que vale para a implantação que abrir hoje.
    'hoje', jsonb_build_object('dia', hoje_brasilia(), 'condicao', v_condicao, 'condicaoTexto', v_texto),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'em', e.ocorrido_em, 'autor', q.nome,
                                                               'antes', e.dados -> 'antes', 'depois', e.dados -> 'depois')
                                            order by e.id desc)
                             from (select * from planos_eventos where acao = 'implantacao.regra_mudou' order by id desc limit 50) e
                             join pessoas q on q.id = e.autor_id), '[]'::jsonb));
end $$;

-- Mudar a regra (só Administração). Os campos voltam todos juntos (valor, condicao, isencaoAte,
-- isencaoTexto, prazoDias, nome, descricao); a versão é a que a tela leu. Vale só para as
-- implantações que abrirem depois: as abertas guardam a condição do dia em que abriram.
create function console_implantacao_regras_salvar(p_pessoa uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r implantacao_regras;
  n implantacao_regras;
  v_campos text[] := '{}';
  v_nome text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_descricao text := btrim(coalesce(p_dados ->> 'descricao', ''));
  v_texto text := btrim(coalesce(p_dados ->> 'isencaoTexto', ''));
  v_condicao text := p_dados ->> 'condicaoPadrao';
  v_valor integer;
  v_prazo integer;
  v_ate date;
begin
  perform entrar_console(p_pessoa, 'console.implantacao.regras');
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then perform recusar_campos('Confira a regra', 'regra'); end if;
  begin v_valor := (p_dados ->> 'valorCentavos')::int; exception when others then v_valor := null; end;
  begin v_prazo := (p_dados ->> 'prazoDias')::int; exception when others then v_prazo := null; end;
  begin
    v_ate := case when p_dados ->> 'isencaoAte' ~ '^\d{4}-\d{2}-\d{2}$' then (p_dados ->> 'isencaoAte')::date end;
  exception when others then v_ate := null; end;
  if length(v_nome) not between 2 and 60 then v_campos := v_campos || 'nome'::text; end if;
  if length(v_descricao) not between 1 and 120 then v_campos := v_campos || 'descricao'::text; end if;
  if v_valor is null or v_valor not between 0 and 10000000 then v_campos := v_campos || 'valor'::text; end if;
  if v_condicao is null or v_condicao not in ('ISENTA', 'COBRADA') then v_campos := v_campos || 'condicao'::text; end if;
  if p_dados ? 'isencaoAte' and jsonb_typeof(p_dados -> 'isencaoAte') <> 'null' and v_ate is null then
    v_campos := v_campos || 'isencaoAte'::text;
  end if;
  if length(v_texto) not between 1 and 60 then v_campos := v_campos || 'isencaoTexto'::text; end if;
  if v_prazo is null or v_prazo not between 1 and 90 then v_campos := v_campos || 'prazoDias'::text; end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira a regra da implantação' using errcode = 'TC422',
      detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;

  select * into r from implantacao_regras for update;
  if r.versao <> p_versao then
    raise exception 'Outra pessoa alterou este registro' using errcode = 'TC409',
      detail = jsonb_build_object('versao', r.versao, 'atual', implantacao_regra_json(r))::text;
  end if;
  if (r.nome, r.descricao, r.valor_centavos, r.condicao_padrao, r.isencao_ate, r.isencao_texto, r.prazo_dias)
     is not distinct from (v_nome, v_descricao, v_valor, v_condicao, v_ate, v_texto, v_prazo) then
    return jsonb_build_object('versao', r.versao, 'mudou', false);
  end if;
  update implantacao_regras
     set nome = v_nome, descricao = v_descricao, valor_centavos = v_valor, condicao_padrao = v_condicao,
         isencao_ate = v_ate, isencao_texto = v_texto, prazo_dias = v_prazo,
         alterado_em = app_now(), alterado_por = contexto_pessoa()
   returning * into n;
  insert into planos_eventos (plano_id, autor_id, acao, dados)
  values (null, contexto_pessoa(), 'implantacao.regra_mudou', jsonb_build_object(
    'antes', implantacao_regra_json(r) - 'versao' - 'alteradoEm' - 'alteradoPor',
    'depois', implantacao_regra_json(n) - 'versao' - 'alteradoEm' - 'alteradoPor'));
  return jsonb_build_object('versao', n.versao, 'mudou', true);
end $$;

call fechar_acesso();
