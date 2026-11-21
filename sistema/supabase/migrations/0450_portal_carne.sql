-- Carnê de pagamento dos honorários (FI-23), tela aprovada em docs/design/aprovadas/portal-carne
-- (Carol, 20/11/2026, com as 12 recomendações do NOTAS.md). Decisões:
-- - O escritório guarda a própria chave Pix em Escritório › Recebimento; só a sócia dona muda
--   (pergunta 11). Sem chave, o carnê sai com as instruções de pagamento em texto.
-- - Quem tem a área Financeiro ou Contratos gera o carnê de um contrato: as parcelas que ainda vão
--   vencer, por padrão; a vencida só se alguém escolher, e sai com o Pix sem valor (pergunta 4).
--   Parcela paga ou cancelada não entra. Formato 3 por folha (padrão) ou 1 por folha; capa
--   marcada por padrão (perguntas 1 e 2).
-- - O carnê guarda uma cópia do que imprimiu (vencimento, valor, identificador e a chave Pix).
--   Nada se apaga: gerar de novo cria outro carnê. Quando uma parcela é cancelada ou muda de
--   vencimento ou valor, ou quando a chave Pix muda, o carnê aparece como desatualizado, com o que
--   mudou (pergunta 12). A conta é feita na leitura, comparando a cópia com o que vale hoje.
-- - Gerar o carnê não muda a forma das parcelas (pergunta 6).
-- - O Pix copia e cola (BR Code) é montado na API, da cópia guardada (packages/domain/src/pix.ts).
-- Ficam para depois: o PDF guardado no servidor e o envio pelo WhatsApp, o aviso no sino quando o
-- carnê fica desatualizado, o pedido da chave à sócia dona pelo sino e o logo do escritório.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

-- A chave confere com o tipo. CPF e CNPJ pelo dígito; o resto pela forma (a API normaliza).
create function chave_pix_valida(p_tipo text, p_chave text) returns boolean
language sql immutable
set search_path = public
as $$
  select case p_tipo
    when 'CPF' then p_chave ~ '^[0-9]{11}$' and cpf_valido(p_chave)
    when 'CNPJ' then p_chave ~ '^[0-9]{14}$' and cnpj_valido(p_chave)
    when 'EMAIL' then length(p_chave) <= 77 and p_chave ~ '^[^@\sA-Z]+@[^@\sA-Z]+\.[^@\sA-Z]+$'
    when 'CELULAR' then p_chave ~ '^\+55[1-9][0-9]9[0-9]{8}$'
    when 'ALEATORIA' then p_chave ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    else false end
$$;


create table escritorio_recebimento (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null unique references escritorios (id) on delete restrict,
  pix_tipo        text check (pix_tipo in ('CNPJ', 'CPF', 'EMAIL', 'CELULAR', 'ALEATORIA')),
  pix_chave       text,
  -- Como o banco mostra no app de quem paga: maiúsculas, sem acento (limites do BR Code).
  recebedor_nome  text check (recebedor_nome ~ '^[A-Z0-9 .&/-]{1,25}$'),
  cidade          text check (cidade ~ '^[A-Z0-9 .&/-]{1,15}$'),
  instrucoes      text check (length(btrim(instrucoes)) between 3 and 400),
  atualizado_por  uuid not null references pessoas (id) on delete restrict,
  atualizado_em   timestamptz not null default app_now(),
  versao          integer not null default 1,
  check ((pix_tipo is null) = (pix_chave is null)),
  check (pix_tipo is null or (recebedor_nome is not null and cidade is not null)),
  check (pix_tipo is null or chave_pix_valida(pix_tipo, pix_chave))
);
call proteger_tabela_escritorio('escritorio_recebimento');

create table carnes (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  contrato_id     uuid not null references contratos (id) on delete restrict,
  formato         text not null check (formato in ('TRES', 'UM')),
  com_capa        boolean not null,
  -- A chave usada (cópia do momento); nula quando o carnê saiu com as instruções em texto.
  pix_tipo        text check (pix_tipo in ('CNPJ', 'CPF', 'EMAIL', 'CELULAR', 'ALEATORIA')),
  pix_chave       text,
  recebedor_nome  text,
  cidade          text,
  instrucoes      text,
  gerado_por      uuid not null references pessoas (id) on delete restrict,
  gerado_em       timestamptz not null default app_now(),
  check ((pix_tipo is null) = (pix_chave is null))
);
create index carnes_contrato on carnes (escritorio_id, contrato_id, gerado_em desc);
call proteger_tabela_escritorio('carnes');

create table carne_parcelas (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  carne_id        uuid not null references carnes (id) on delete restrict,
  recebimento_id  uuid not null references recebimentos_previstos (id) on delete restrict,
  -- Cópia do momento: o que foi impresso.
  ordem           integer not null check (ordem between 1 and 999),
  total           integer not null check (total between 1 and 999),
  vencimento      date not null,
  valor           bigint not null check (valor between 1 and 10000000000),
  txid            text not null check (txid ~ '^[A-Za-z0-9]{1,25}$'),
  sem_valor       boolean not null,
  unique (carne_id, recebimento_id)
);
create index carne_parcelas_carne on carne_parcelas (escritorio_id, carne_id, vencimento);
call proteger_tabela_escritorio('carne_parcelas');

-- O carnê e as parcelas dele só se acrescentam.
create function carne_so_acrescenta() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'O carnê não se muda nem se apaga: gere outro' using errcode = 'TC023';
end $$;
create trigger carnes_so_acrescenta before update or delete on carnes
  for each row execute function carne_so_acrescenta();
create trigger carne_parcelas_so_acrescenta before update or delete on carne_parcelas
  for each row execute function carne_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('escritorio_recebimento', false,
  'Como o escritório recebe: chave Pix, nome do recebedor e cidade como o banco mostra, e as instruções de pagamento',
  null, null, null, null, null, null, true),
 ('carnes', false, 'Carnês de pagamento gerados para os contratos: formato, capa, a chave usada, quem gerou e quando', null, null, null, null, null, null, true),
 ('carne_parcelas', false, 'Parcelas de cada carnê como foram impressas: ordem, vencimento, valor e identificador', null, null, null, null, null, null, true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Gerar e ver o carnê: quem tem a área Financeiro ou Contratos (a que a tela pediu).
create function carne_entrar(p_pessoa uuid, p_escritorio uuid, p_area text, p_escrita boolean) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_area = 'FINANCEIRO' then
    perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
    perform entrar_escritorio(p_pessoa, p_escritorio, case when p_escrita then 'financeiro.editar' else 'financeiro.ver' end);
  elsif p_area = 'CONTRATOS' then
    perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
    perform entrar_escritorio(p_pessoa, p_escritorio, case when p_escrita then 'contratos.editar' else 'contratos.ver' end);
  else
    perform recusar_campos('Área inválida', 'area');
  end if;
  if p_escrita then perform portal_exigir_escrita(p_pessoa, p_escritorio); end if;
end $$;

-- As parcelas do contrato que contam para "4 de 6": com valor e não canceladas, por vencimento.
create function carne_ordem_parcelas(p_contrato uuid)
returns table (id uuid, ordem integer, total integer)
language sql stable
set search_path = public
as $$
  select r.id, (row_number() over (order by r.vencimento, r.criado_em, r.id))::integer,
         (count(*) over ())::integer
    from recebimentos_previstos r
   where r.contrato_id = p_contrato and r.valor is not null and r.cancelado_em is null
$$;

-- O que mudou desde o carnê: parcela cancelada, vencimento ou valor diferente, chave trocada.
create function carne_mudancas(k carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(m order by m ->> 'ordem'), '[]'::jsonb) from (
    select jsonb_build_object('tipo', 'CANCELADA', 'parcela', r.descricao, 'era', null, 'agora', null, 'ordem', lpad(cp.ordem::text, 3, '0') || 'a') m
      from carne_parcelas cp join recebimentos_previstos r on r.id = cp.recebimento_id
     where cp.carne_id = k.id and r.cancelado_em is not null
    union all
    select jsonb_build_object('tipo', 'VENCIMENTO', 'parcela', r.descricao, 'era', cp.vencimento, 'agora', r.vencimento, 'ordem', lpad(cp.ordem::text, 3, '0') || 'b')
      from carne_parcelas cp join recebimentos_previstos r on r.id = cp.recebimento_id
     where cp.carne_id = k.id and r.cancelado_em is null and r.vencimento <> cp.vencimento
    union all
    select jsonb_build_object('tipo', 'VALOR', 'parcela', r.descricao, 'era', cp.valor, 'agora', r.valor, 'ordem', lpad(cp.ordem::text, 3, '0') || 'c')
      from carne_parcelas cp join recebimentos_previstos r on r.id = cp.recebimento_id
     where cp.carne_id = k.id and r.cancelado_em is null and r.valor is distinct from cp.valor
    union all
    select jsonb_build_object('tipo', 'CHAVE_PIX', 'parcela', null, 'era', k.pix_tipo, 'agora', e.pix_tipo, 'ordem', '000')
      from (select 1) x left join escritorio_recebimento e on e.escritorio_id = k.escritorio_id
     where k.pix_chave is not null and (e.pix_chave is distinct from k.pix_chave or e.recebedor_nome is distinct from k.recebedor_nome
                                        or e.cidade is distinct from k.cidade)
  ) t
$$;

create function carne_linha(k carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', k.id, 'formato', k.formato, 'capa', k.com_capa, 'geradoPor', pessoa_ref(k.gerado_por), 'geradoEm', k.gerado_em,
    'comPix', k.pix_chave is not null,
    'parcelas', coalesce((select jsonb_agg(jsonb_build_object('descricao', r.descricao, 'ordem', cp.ordem, 'total', cp.total,
                                                              'vencimento', cp.vencimento, 'valor', cp.valor, 'semValor', cp.sem_valor)
                                           order by cp.vencimento, cp.ordem)
                            from carne_parcelas cp join recebimentos_previstos r on r.id = cp.recebimento_id where cp.carne_id = k.id), '[]'::jsonb),
    'mudancas', (select coalesce(jsonb_agg(m - 'ordem'), '[]'::jsonb) from jsonb_array_elements(carne_mudancas(k)) m))
$$;

create function recebimento_json(e escritorio_recebimento) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('pixTipo', e.pix_tipo, 'pixChave', e.pix_chave, 'recebedor', e.recebedor_nome, 'cidade', e.cidade,
                            'instrucoes', e.instrucoes)
$$;

-- ---------------------------------------------------------------------------------------
-- Escritório › Recebimento.

create function portal_recebimento(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare e escritorio_recebimento; x escritorios;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  select * into e from escritorio_recebimento where escritorio_id = p_escritorio;
  select * into x from escritorios where id = p_escritorio;
  return recebimento_json(e) || jsonb_build_object(
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'socioDono', pessoa_ref(peticao_socio_dono(p_escritorio)),
    'versao', coalesce(e.versao, 0),
    'atualizadoPor', case when e.id is not null then pessoa_ref(e.atualizado_por) end,
    'atualizadoEm', e.atualizado_em,
    'sugestao', jsonb_build_object('recebedor', x.nome, 'cidade', x.cidade, 'cnpj', x.cnpj));
end $$;

-- Salvar (só a sócia dona). A API manda a chave já normalizada e o nome e a cidade em
-- maiúsculas sem acento; aqui se confere de novo. Versão 0: ainda não existe.
create function portal_recebimento_salvar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e escritorio_recebimento;
  v_versao integer := json_inteiro(p_dados, 'versao');
  v_tipo text := nullif(btrim(coalesce(p_dados ->> 'pixTipo', '')), '');
  v_chave text := nullif(btrim(coalesce(p_dados ->> 'pixChave', '')), '');
  v_receb text := nullif(btrim(coalesce(p_dados ->> 'recebedor', '')), '');
  v_cidade text := nullif(btrim(coalesce(p_dados ->> 'cidade', '')), '');
  v_instr text := nullif(btrim(coalesce(p_dados ->> 'instrucoes', '')), '');
  v_campos text[] := '{}';
  v_trocou boolean;
  v_desat integer := 0;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if v_tipo is not null and v_tipo not in ('CNPJ', 'CPF', 'EMAIL', 'CELULAR', 'ALEATORIA') then v_campos := v_campos || 'pixTipo'::text; end if;
  if (v_tipo is null) <> (v_chave is null) or (v_tipo is not null and not chave_pix_valida(v_tipo, v_chave)) then v_campos := v_campos || 'pixChave'::text; end if;
  if v_tipo is not null and (v_receb is null or v_receb !~ '^[A-Z0-9 .&/-]{1,25}$') then v_campos := v_campos || 'recebedor'::text; end if;
  if v_receb is not null and v_receb !~ '^[A-Z0-9 .&/-]{1,25}$' and not ('recebedor' = any (v_campos)) then v_campos := v_campos || 'recebedor'::text; end if;
  if v_tipo is not null and (v_cidade is null or v_cidade !~ '^[A-Z0-9 .&/-]{1,15}$') then v_campos := v_campos || 'cidade'::text; end if;
  if v_cidade is not null and v_cidade !~ '^[A-Z0-9 .&/-]{1,15}$' and not ('cidade' = any (v_campos)) then v_campos := v_campos || 'cidade'::text; end if;
  if v_instr is not null and length(v_instr) not between 3 and 400 then v_campos := v_campos || 'instrucoes'::text; end if;
  if v_versao is null or v_versao < 0 then v_campos := v_campos || 'versao'::text; end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira os dados do recebimento' using errcode = 'TC422', detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;

  select * into e from escritorio_recebimento where escritorio_id = p_escritorio for update;
  if e.id is null then
    if v_versao <> 0 then raise exception 'Outra pessoa alterou este registro' using errcode = 'TC409', detail = '{"versao": null}'; end if;
    insert into escritorio_recebimento (escritorio_id, pix_tipo, pix_chave, recebedor_nome, cidade, instrucoes, atualizado_por)
    values (p_escritorio, v_tipo, v_chave, v_receb, v_cidade, v_instr, p_pessoa) returning * into e;
    v_trocou := false;
  else
    if e.versao <> v_versao then perform conflito_versao('escritorio_recebimento', e.id); end if;
    v_trocou := e.pix_chave is not null and (e.pix_chave is distinct from v_chave or e.recebedor_nome is distinct from v_receb or e.cidade is distinct from v_cidade);
    update escritorio_recebimento
       set pix_tipo = v_tipo, pix_chave = v_chave, recebedor_nome = v_receb, cidade = v_cidade, instrucoes = v_instr,
           atualizado_por = p_pessoa, atualizado_em = app_now()
     where id = e.id returning * into e;
  end if;
  if v_trocou then
    -- Os carnês com a chave antiga, das parcelas que ainda não foram pagas.
    select count(distinct k.id) into v_desat
      from carnes k join carne_parcelas cp on cp.carne_id = k.id join recebimentos_previstos r on r.id = cp.recebimento_id
     where k.escritorio_id = p_escritorio and k.pix_chave is not null and k.pix_chave is distinct from v_chave
       and r.cancelado_em is null and parcela_recebido(r.id) < r.valor;
  end if;
  perform registrar_historico('escritorio.recebimento_salvo', 'escritorio_recebimento', e.id::text,
    jsonb_build_object('pixTipo', v_tipo, 'trocouChave', v_trocou, 'carnesDesatualizados', v_desat));
  return jsonb_build_object('versao', e.versao, 'desatualizados', v_desat);
end $$;

-- ---------------------------------------------------------------------------------------
-- Carnê.

create function carne_contrato(p_escritorio uuid, p_contrato uuid) returns contratos
language plpgsql
set search_path = public
as $$
declare c contratos;
begin
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'ELABORACAO' then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  return c;
end $$;

-- O que a janela "Gerar carnê" precisa: as parcelas, a chave em uso e os carnês já gerados.
create function portal_carne_opcoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c contratos; e escritorio_recebimento;
begin
  perform carne_entrar(p_pessoa, p_escritorio, p_area, false);
  c := carne_contrato(p_escritorio, p_contrato);
  select * into e from escritorio_recebimento where escritorio_id = p_escritorio;
  return jsonb_build_object(
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto, 'situacao', c.estado),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
    'parcelas', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'descricao', r.descricao, 'ordem', o.ordem, 'total', o.total,
                                          'vencimento', r.vencimento, 'valor', r.valor, 'situacao', parcela_situacao(r, x.rec),
                                          'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id))
                       order by o.ordem)
        from carne_ordem_parcelas(c.id) o join recebimentos_previstos r on r.id = o.id
        cross join lateral (select parcela_recebido(r.id) rec) x), '[]'::jsonb),
    'recebimento', recebimento_json(e),
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'socioDono', pessoa_ref(peticao_socio_dono(p_escritorio)),
    'carnes', coalesce((select jsonb_agg(carne_linha(k) order by k.gerado_em desc, k.id)
                          from carnes k where k.contrato_id = c.id and k.escritorio_id = p_escritorio), '[]'::jsonb));
end $$;

-- Gerar: só parcelas deste contrato, com valor, nem pagas nem canceladas. A vencida sai sem valor.
create function portal_carne_gerar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area text := p_dados ->> 'area';
  v_formato text := coalesce(p_dados ->> 'formato', 'TRES');
  v_capa boolean := coalesce((p_dados ->> 'capa')::boolean, true);
  v_ids uuid[];
  c contratos;
  e escritorio_recebimento;
  v_carne uuid;
  v_n integer;
  v_hoje date := hoje_brasilia();
  r record;
begin
  perform carne_entrar(p_pessoa, p_escritorio, v_area, true);
  c := carne_contrato(p_escritorio, p_contrato);
  if c.estado <> 'ATIVO' then
    raise exception 'O contrato não está vigente' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'CONTRATO_NAO_VIGENTE')::text;
  end if;
  if v_formato not in ('TRES', 'UM') then perform recusar_campos('Formato inválido', 'formato'); end if;
  if jsonb_typeof(p_dados -> 'parcelas') is distinct from 'array' then perform recusar_campos('Escolha as parcelas', 'parcelas'); end if;
  select coalesce(array_agg(distinct (v)::uuid), '{}') into v_ids from jsonb_array_elements_text(p_dados -> 'parcelas') v;
  if cardinality(v_ids) = 0 then
    raise exception 'Escolha ao menos uma parcela' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SEM_PARCELAS')::text;
  end if;
  -- Cada parcela pedida precisa ser deste contrato e estar aberta.
  for r in select x.id, rp.id rid, rp.cancelado_em, rp.valor, parcela_recebido(rp.id) rec
             from unnest(v_ids) x(id) left join recebimentos_previstos rp on rp.id = x.id and rp.contrato_id = c.id and rp.escritorio_id = p_escritorio loop
    if r.rid is null or r.valor is null then raise exception 'Parcela não encontrada' using errcode = 'TC404'; end if;
    if r.cancelado_em is not null then
      raise exception 'Uma parcela foi cancelada' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'PARCELA_CANCELADA')::text;
    end if;
    if r.rec >= r.valor then
      raise exception 'Uma parcela já foi paga' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'PARCELA_PAGA')::text;
    end if;
  end loop;

  select * into e from escritorio_recebimento where escritorio_id = p_escritorio;
  insert into carnes (escritorio_id, contrato_id, formato, com_capa, pix_tipo, pix_chave, recebedor_nome, cidade, instrucoes, gerado_por)
  values (p_escritorio, c.id, v_formato, v_capa, e.pix_tipo, e.pix_chave, e.recebedor_nome, e.cidade, e.instrucoes, p_pessoa)
  returning id into v_carne;
  insert into carne_parcelas (escritorio_id, carne_id, recebimento_id, ordem, total, vencimento, valor, txid, sem_valor)
  select p_escritorio, v_carne, rp.id, o.ordem, o.total, rp.vencimento, rp.valor,
         'C' || regexp_replace(c.numero, '[^0-9]', '', 'g') || 'P' || lpad(o.ordem::text, 2, '0'),
         rp.vencimento < v_hoje
    from carne_ordem_parcelas(c.id) o join recebimentos_previstos rp on rp.id = o.id
   where rp.id = any (v_ids);
  get diagnostics v_n = row_count;
  perform registrar_historico('financeiro.carne_gerado', 'carnes', v_carne::text,
    jsonb_build_object('contrato', c.id, 'parcelas', v_n, 'formato', v_formato, 'capa', v_capa, 'comPix', e.pix_chave is not null));
  return jsonb_build_object('id', v_carne, 'parcelas', v_n);
end $$;

-- Os dados para imprimir. A API monta o Pix de cada parcela da cópia guardada.
create function portal_carne(p_pessoa uuid, p_escritorio uuid, p_carne uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k carnes; c contratos; x escritorios;
begin
  perform carne_entrar(p_pessoa, p_escritorio, p_area, false);
  select * into k from carnes where id = p_carne and escritorio_id = p_escritorio;
  if k.id is null then raise exception 'Carnê não encontrado' using errcode = 'TC404'; end if;
  select * into c from contratos where id = k.contrato_id;
  select * into x from escritorios where id = p_escritorio;
  return jsonb_build_object(
    'id', k.id, 'formato', k.formato, 'capa', k.com_capa, 'geradoEm', k.gerado_em,
    'escritorio', jsonb_build_object('nome', x.nome, 'cnpj', x.cnpj, 'endereco', x.endereco, 'cidade', x.cidade, 'uf', x.uf,
                                     'whatsapp', (select w.numero from whatsapp_escritorio w where w.escritorio_id = p_escritorio and w.situacao <> 'DESLIGADO' limit 1)),
    'cliente', (select jsonb_build_object('nome', kl.nome, 'documento', kl.documento, 'tipo', kl.tipo) from clientes_escritorio kl where kl.id = c.cliente_id),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'pix', case when k.pix_chave is not null then jsonb_build_object('tipo', k.pix_tipo, 'chave', k.pix_chave, 'recebedor', k.recebedor_nome, 'cidade', k.cidade) end,
    'instrucoes', k.instrucoes,
    'parcelas', coalesce((select jsonb_agg(jsonb_build_object('descricao', r.descricao, 'ordem', cp.ordem, 'total', cp.total, 'vencimento', cp.vencimento,
                                                              'valor', cp.valor, 'semValor', cp.sem_valor, 'txid', cp.txid)
                                           order by cp.vencimento, cp.ordem)
                            from carne_parcelas cp join recebimentos_previstos r on r.id = cp.recebimento_id where cp.carne_id = k.id), '[]'::jsonb),
    'mudancas', (select coalesce(jsonb_agg(m - 'ordem'), '[]'::jsonb) from jsonb_array_elements(carne_mudancas(k)) m));
end $$;

call fechar_acesso();
