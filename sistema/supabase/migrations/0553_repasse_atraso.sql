-- 0553 · Atraso do repasse (F3.46, FI-05). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados pz-repasses, pz-anotar,
-- pz-anotado, pz-ficha e pz-anotar-erros).
-- - Atrasado é estado, não alarme: a parte pendente que passou do prazo fica atrasada até ser feita.
-- - Anotar o atraso: o motivo e a próxima ação (quando, com quem e o que fazer). O prazo não muda.
--   Só se acrescenta; a anotação mais nova é a que vale, e todas ficam no histórico.
-- - O sino avisa quem cuida no primeiro dia de atraso e lembra a pessoa da próxima ação no dia.
-- - A lista de Repasses ganha o número "Atrasados" e diz quem é você, para o filtro "Os meus".

create table repasse_atraso_anotacoes (
  id                  uuid primary key default gen_random_uuid(),
  escritorio_id       uuid not null references escritorios (id) on delete restrict,
  destinacao_id       uuid not null references destinacoes (id) on delete restrict,
  motivo              text not null check (motivo in ('DOCUMENTO', 'SEM_RESPOSTA', 'DECISAO', 'OUTRO')),
  texto               text check (length(btrim(texto)) between 1 and 300),
  proxima_acao_em     date not null,
  proxima_acao_com    uuid not null references pessoas (id) on delete restrict,
  proxima_acao_o_que  text not null check (length(btrim(proxima_acao_o_que)) between 3 and 160),
  criado_por          uuid not null references pessoas (id) on delete restrict,
  criado_em           timestamptz not null default app_now(),
  check (motivo <> 'OUTRO' or texto is not null)
);
create index repasse_atraso_destinacao on repasse_atraso_anotacoes (destinacao_id, criado_em desc);
create index repasse_atraso_dia on repasse_atraso_anotacoes (escritorio_id, proxima_acao_em);
call proteger_tabela_escritorio('repasse_atraso_anotacoes');

create function repasse_atraso_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'A anotação do atraso não muda nem se apaga: anote de novo' using errcode = 'TC023';
end $$;
create trigger repasse_atraso_guardiao before update or delete on repasse_atraso_anotacoes
  for each row execute function repasse_atraso_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('repasse_atraso_anotacoes', true, 'Por que um repasse passou do prazo e a próxima ação: quando, com quem e o que fazer',
  'Não deixar dinheiro de terceiros parado sem dono (FI-05)', 'Execução de contrato (LGPD, art. 7º, V) e obrigação legal (art. 7º, II)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- A anotação mais nova de uma parte, para a tela.
create function repasse_atraso_json(a repasse_atraso_anotacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', a.id, 'motivo', a.motivo, 'texto', a.texto, 'proximaEm', a.proxima_acao_em,
                            'proximaCom', pessoa_ref(a.proxima_acao_com), 'oQue', a.proxima_acao_o_que,
                            'em', a.criado_em, 'por', pessoa_ref(a.criado_por))
$$;

-- A linha da parte ganha a anotação do atraso (a mais nova), quando há.
create or replace function destinacao_linha(d destinacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id, 'para', d.para, 'nome', d.nome, 'regra', d.regra, 'valor', d.valor, 'prazo', d.prazo,
    'escritorio', destinacao_do_escritorio(d.para),
    'situacao', case when d.feito_em is not null then 'FEITO' when d.dispensado_em is not null then 'DISPENSADO' else 'PENDENTE' end,
    'feitoEm', d.feito_em, 'feitoPor', case when d.feito_por is not null then pessoa_ref(d.feito_por) end,
    'dispensa', case when d.dispensado_em is not null then jsonb_build_object('motivo', d.dispensa_motivo, 'em', d.dispensado_em, 'por', pessoa_ref(d.dispensado_por)) end,
    'contaId', d.conta_id,
    'atraso', (select repasse_atraso_json(a) from repasse_atraso_anotacoes a where a.destinacao_id = d.id
                order by a.criado_em desc, a.id desc limit 1))
$$;

-- Anotar o atraso de uma parte pendente que passou do prazo.
create function portal_financeiro_destinacao_atraso(p_pessoa uuid, p_escritorio uuid, p_destinacao uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d destinacoes;
  a repasse_atraso_anotacoes;
  e text[] := '{}';
  v_hoje date := hoje_brasilia();
  v_motivo text := p_dados ->> 'motivo';
  v_texto text := nullif(btrim(coalesce(p_dados ->> 'texto', '')), '');
  v_o_que text := nullif(btrim(coalesce(p_dados ->> 'oQue', '')), '');
  v_em date;
  v_com uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into d from destinacoes where id = p_destinacao and escritorio_id = p_escritorio for update;
  if d.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  if d.feito_em is not null or d.dispensado_em is not null then
    perform recusar_motivo('Este repasse já foi feito ou dispensado.', 'REPASSE_JA_FEITO');
  end if;
  if d.prazo >= v_hoje then
    perform recusar_motivo('Este repasse ainda está no prazo.', 'REPASSE_NO_PRAZO');
  end if;
  begin
    v_em := (p_dados ->> 'proximaEm')::date;
  exception when others then v_em := null;
  end;
  begin
    v_com := (p_dados ->> 'proximaComId')::uuid;
  exception when others then v_com := null;
  end;
  if v_motivo is null or v_motivo not in ('DOCUMENTO', 'SEM_RESPOSTA', 'DECISAO', 'OUTRO') then e := e || 'motivo'::text; end if;
  if (v_motivo = 'OUTRO' and v_texto is null) or char_length(coalesce(v_texto, '')) > 300 then e := e || 'texto'::text; end if;
  if v_em is null or v_em < v_hoje then e := e || 'proximaEm'::text; end if;
  if v_com is null or not pode_cuidar_repasse(v_com, p_escritorio) then e := e || 'proximaComId'::text; end if;
  if v_o_que is null or char_length(v_o_que) not between 3 and 160 then e := e || 'oQue'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a anotação.', variadic e); end if;

  insert into repasse_atraso_anotacoes (escritorio_id, destinacao_id, motivo, texto, proxima_acao_em, proxima_acao_com, proxima_acao_o_que, criado_por)
  values (p_escritorio, d.id, v_motivo, v_texto, v_em, v_com, v_o_que, p_pessoa)
  returning * into a;
  perform registrar_historico('financeiro.repasse_atraso', 'levantamentos', d.levantamento_id::text,
    jsonb_strip_nulls(jsonb_build_object('destinacao', d.id, 'parte', d.nome, 'motivo', v_motivo, 'texto', v_texto,
                                         'proximaEm', v_em, 'com', v_com, 'oQue', v_o_que)));
  -- Outra pessoa que vai fazer a próxima ação hoje fica sabendo já; nos outros dias, a rotina lembra.
  if v_em = v_hoje and v_com <> p_pessoa then perform repasse_lembrar_proxima_acao(a); end if;
  return destinacao_linha(d);
end $$;

-- O aviso da próxima ação, uma vez por anotação.
create function repasse_lembrar_proxima_acao(a repasse_atraso_anotacoes) returns boolean
language plpgsql
set search_path = public
as $$
declare
  d destinacoes;
  l levantamentos;
begin
  if exists (select 1 from avisos_sino s where s.tipo = 'REPASSE_PROXIMA_ACAO' and s.escritorio_id = a.escritorio_id
               and s.dados ->> 'anotacao' = a.id::text) then
    return false;
  end if;
  select * into d from destinacoes where id = a.destinacao_id;
  select * into l from levantamentos where id = d.levantamento_id;
  insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
  values (a.escritorio_id, a.proxima_acao_com, 'REPASSE_PROXIMA_ACAO',
          jsonb_strip_nulls(jsonb_build_object('anotacao', a.id, 'destinacao', d.id, 'parte', d.nome,
            'cliente', (select nome from clientes_escritorio where id = l.cliente_id), 'oQue', a.proxima_acao_o_que,
            'prazo', d.prazo, 'valor', d.valor)),
          'levantamentos', l.id);
  return true;
end $$;
create index avisos_sino_repasse_anotacao on avisos_sino ((dados ->> 'anotacao')) where tipo = 'REPASSE_PROXIMA_ACAO';
create index avisos_sino_repasse_atrasado on avisos_sino ((dados ->> 'destinacao')) where tipo = 'REPASSE_ATRASADO';

-- A rotina vê a lista de escritórios só enquanto roda; depois cada escritório entra pelo contexto.
create policy rotina_repasses_ler on escritorios for select
  using (current_setting('t3jus.lembrando_repasses', true) = 'on');

-- Todo dia: o aviso a quem cuida de cada parte que passou do prazo (uma vez por parte) e o lembrete
-- da próxima ação que chegou (uma vez por anotação, a mais nova de cada parte ainda pendente).
create function lembrar_repasses() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer := 0;
  v_esc uuid;
  v_lista uuid[];
  v_hoje date := hoje_brasilia();
  r record;
  a repasse_atraso_anotacoes;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lembrando_repasses', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lembrando_repasses', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    for r in
      select d.id, d.nome, d.prazo, d.valor, l.id levantamento, l.responsavel_id, k.nome cliente
        from destinacoes d join levantamentos l on l.id = d.levantamento_id
        join clientes_escritorio k on k.id = l.cliente_id
       where d.escritorio_id = v_esc and d.feito_em is null and d.dispensado_em is null and d.prazo < v_hoje
         and not exists (select 1 from avisos_sino s where s.tipo = 'REPASSE_ATRASADO' and s.escritorio_id = v_esc
                           and s.dados ->> 'destinacao' = d.id::text)
    loop
      perform aviso_sino(v_esc, r.responsavel_id, null, 'REPASSE_ATRASADO', 'levantamentos', r.levantamento,
        jsonb_build_object('destinacao', r.id, 'parte', r.nome, 'cliente', r.cliente, 'prazo', r.prazo, 'valor', r.valor));
      v_n := v_n + 1;
    end loop;
    for a in
      select distinct on (x.destinacao_id) x.*
        from repasse_atraso_anotacoes x join destinacoes d on d.id = x.destinacao_id
       where x.escritorio_id = v_esc and d.feito_em is null and d.dispensado_em is null
       order by x.destinacao_id, x.criado_em desc, x.id desc
    loop
      if a.proxima_acao_em <= v_hoje and repasse_lembrar_proxima_acao(a) then v_n := v_n + 1; end if;
    end loop;
  end loop;
  perform limpar_contexto();
  return v_n;
end $$;

-- Todo dia às 7h de Brasília (10h UTC), onde o pg_cron existe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-repasses', '0 10 * * *', 'select public.lembrar_repasses()');
  end if;
end $$;

-- A página de Repasses ganha quem é você (para "Os meus") e os atrasados.
alter function portal_financeiro_repasses(uuid, uuid) rename to financeiro_repasses_base;
create function portal_financeiro_repasses(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_repasses_base(p_pessoa, p_escritorio);
  v_hoje date := hoje_brasilia();
begin
  return v || jsonb_build_object(
    'eu', p_pessoa,
    'podeEditar', pode(p_pessoa, p_escritorio, 'financeiro.editar'),
    'podemCuidar', repasse_quem_pode_cuidar(p_escritorio),
    'totais', (v -> 'totais') || (select jsonb_build_object(
        'atrasados', coalesce(sum(d.valor), 0),
        'repassesAtrasados', count(distinct d.levantamento_id),
        'semMotivo', count(*) filter (where not exists (select 1 from repasse_atraso_anotacoes a where a.destinacao_id = d.id)))
      from destinacoes d
      where d.escritorio_id = p_escritorio and d.feito_em is null and d.dispensado_em is null and d.prazo < v_hoje));
end $$;

-- A ficha do repasse ganha quem pode cuidar, quem é o do contrato e se você pode trocar.
alter function portal_financeiro_repasse(uuid, uuid, uuid) rename to financeiro_repasse_base;
create function portal_financeiro_repasse(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_repasse_base(p_pessoa, p_escritorio, p_levantamento);
  l levantamentos;
begin
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio;
  return v || jsonb_build_object(
    'eu', p_pessoa,
    'podeEditar', pode(p_pessoa, p_escritorio, 'financeiro.editar'),
    'prazoDias', prazo_repasse_dias(),
    'doContrato', pessoa_ref(levantamento_responsavel_padrao(l.caso_id, l.cliente_id)),
    'podemCuidar', repasse_quem_pode_cuidar(p_escritorio));
end $$;

call fechar_acesso();
