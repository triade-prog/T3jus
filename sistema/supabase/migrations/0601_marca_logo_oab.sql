-- 0601 · Logo do escritório no carnê e no recibo, e o registro da sociedade na OAB
-- (F3.81, FI-23; o resto do F3.19, FI-14). Desenho aprovado pela Carol em 21/11/2026:
-- docs/design/aprovadas/portal-nao-paga-logo (parte B, decisões 13 a 27 e perguntas 5 a 9).
-- - Em Escritório › Recebimento, a sócia dona escolhe o que vai no alto do carnê e do recibo: o
--   nome em letra (padrão) ou o logo. O logo chega à API já como PNG; a API confere de novo
--   (corte da margem, tamanho, proporção e contraste com o papel) e guarda o arquivo no
--   armazenamento privado. Nenhum SVG chega a uma página.
-- - Logo que não passa no contraste só vale "em uma cor só, na cor da tinta" (pergunta 7).
-- - Logo quase quadrado: "o logo e o nome ao lado" ou "só o logo" (pergunta 8).
-- - O registro da sociedade na OAB fica no Escritório (pergunta 5): seccional e número, os dois
--   ou nenhum. Aparece depois do CNPJ no carnê e no recibo.
-- - Documentos já emitidos ficam como foram (pergunta 9): o carnê e a cópia do recibo guardam a
--   marca usada no dia. Os logos nunca se apagam (o arquivo fica no histórico).

alter table escritorios add column oab_sociedade_uf text check (oab_sociedade_uf is null or uf_brasil(oab_sociedade_uf));
alter table escritorios add column oab_sociedade_numero text check (oab_sociedade_numero ~ '^[1-9][0-9]{0,5}$');
alter table escritorios add check ((oab_sociedade_uf is null) = (oab_sociedade_numero is null));

-- Cada logo enviado. Só inserção.
create table escritorio_logos (
  id              uuid primary key,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  arquivo         text not null check (arquivo ~ '^[0-9a-f-]{36}/logos/[0-9a-f-]{36}\.png$'),
  nome_original   text not null check (length(btrim(nome_original)) between 1 and 200),
  formato_enviado text not null check (formato_enviado in ('PNG', 'JPG', 'SVG')),
  bytes           integer not null check (bytes between 1 and 1048576),
  largura         integer not null check (largura between 1 and 2400),
  altura          integer not null check (altura between 1 and 2400),
  corte           jsonb not null check (jsonb_typeof(corte) = 'object'),
  contraste_min   numeric(5, 2) not null check (contraste_min between 1 and 21),
  passa           boolean not null,
  enviado_por     uuid not null references pessoas (id) on delete restrict,
  enviado_em      timestamptz not null default app_now(),
  check (arquivo like escritorio_id::text || '/logos/' || id::text || '.png')
);
create index escritorio_logos_escritorio on escritorio_logos (escritorio_id, enviado_em desc);
call proteger_tabela_escritorio('escritorio_logos');
create trigger escritorio_logos_so_acrescenta before update or delete on escritorio_logos
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('escritorio_logos', false,
  'Os logos que o escritório enviou para o carnê e o recibo: o arquivo, o nome, o tamanho, o corte e a conferência de contraste',
  null, null, null, null, null, null, true);

alter table escritorio_recebimento add column marca text not null default 'LETRA' check (marca in ('LETRA', 'LOGO'));
alter table escritorio_recebimento add column logo_id uuid references escritorio_logos (id) on delete restrict;
alter table escritorio_recebimento add column logo_jeito text check (logo_jeito in ('SO_LOGO', 'LOGO_E_NOME'));
alter table escritorio_recebimento add column logo_cor text not null default 'ARQUIVO' check (logo_cor in ('ARQUIVO', 'UMA_COR'));
alter table escritorio_recebimento add check ((marca = 'LOGO') = (logo_id is not null));

-- A cópia da marca em cada carnê (o recibo guarda a dele em recibo_copias.dados).
alter table carnes add column marca jsonb check (marca is null or jsonb_typeof(marca) = 'object');

-- "OAB/SP 31.874", ou nulo.
create function oab_sociedade_frase(x escritorios) returns text
language sql immutable
set search_path = public
as $$
  select case when x.oab_sociedade_uf is not null then
    'OAB/' || x.oab_sociedade_uf || ' ' || regexp_replace(x.oab_sociedade_numero, '(\d)(?=(\d{3})+$)', '\1.', 'g') end
$$;

create function logo_json(l escritorio_logos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', l.id, 'nome', l.nome_original, 'formato', l.formato_enviado, 'bytes', l.bytes,
                            'largura', l.largura, 'altura', l.altura, 'corte', l.corte, 'contraste', l.contraste_min, 'passa', l.passa,
                            'enviadoPor', pessoa_ref(l.enviado_por), 'enviadoEm', l.enviado_em)
$$;

-- A marca de hoje, para a cópia do documento: {tipo, logoId, largura, altura, jeito, cor, oab}.
create function marca_do_escritorio(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'tipo', coalesce(e.marca, 'LETRA'),
    'logoId', l.id, 'largura', l.largura, 'altura', l.altura,
    'jeito', case when l.id is not null then coalesce(e.logo_jeito, case when l.largura < 2 * l.altura then 'LOGO_E_NOME' else 'SO_LOGO' end) end,
    'cor', case when l.id is not null then e.logo_cor end,
    'oab', oab_sociedade_frase(x)))
    from escritorios x
    left join escritorio_recebimento e on e.escritorio_id = x.id
    left join escritorio_logos l on l.id = e.logo_id and e.marca = 'LOGO'
   where x.id = p_escritorio
$$;

-- Registrar o logo que a API conferiu e guardou (POST /v1/escritorio/recebimento/logo).
-- Só a sócia dona. Ainda não troca a marca: isso é no Salvar.
create function portal_recebimento_logo_registrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l escritorio_logos;
  v_id uuid := (p_dados ->> 'id')::uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  insert into escritorio_logos (id, escritorio_id, arquivo, nome_original, formato_enviado, bytes, largura, altura, corte, contraste_min, passa, enviado_por)
  values (v_id, p_escritorio, p_escritorio::text || '/logos/' || v_id::text || '.png', left(btrim(p_dados ->> 'nome'), 200),
          p_dados ->> 'formato', (p_dados ->> 'bytes')::integer, (p_dados ->> 'largura')::integer, (p_dados ->> 'altura')::integer,
          coalesce(p_dados -> 'corte', '{}'::jsonb), (p_dados ->> 'contraste')::numeric, (p_dados ->> 'passa')::boolean, p_pessoa)
  returning * into l;
  perform registrar_historico('escritorio.logo_enviado', 'escritorio_logos', l.id::text,
    jsonb_build_object('arquivo', l.nome_original, 'formato', l.formato_enviado, 'largura', l.largura, 'altura', l.altura,
                       'contraste', l.contraste_min, 'passa', l.passa));
  return logo_json(l);
end $$;

-- O caminho do arquivo do logo, para a API devolver o PNG. Só do mesmo escritório; vê quem
-- está no escritório (o carnê, o recibo e a prévia usam).
create function portal_recebimento_logo_arquivo(p_pessoa uuid, p_escritorio uuid, p_logo uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  select arquivo into v from escritorio_logos where id = p_logo and escritorio_id = p_escritorio;
  if v is null then raise exception 'Logo não encontrado' using errcode = 'TC404'; end if;
  return v;
end $$;

create or replace function portal_recebimento(p_pessoa uuid, p_escritorio uuid) returns jsonb
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
    'sugestao', jsonb_build_object('recebedor', x.nome, 'cidade', x.cidade, 'cnpj', x.cnpj),
    'marca', coalesce(e.marca, 'LETRA'), 'logoJeito', e.logo_jeito, 'logoCor', coalesce(e.logo_cor, 'ARQUIVO'),
    'logo', (select logo_json(l) from escritorio_logos l where l.id = e.logo_id),
    'oabUf', x.oab_sociedade_uf, 'oabNumero', x.oab_sociedade_numero, 'oab', oab_sociedade_frase(x));
end $$;

create or replace function portal_recebimento_salvar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
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
  -- A marca e o registro da sociedade na OAB (F3.81, F3.19).
  v_tem_marca boolean := p_dados ? 'marca';
  v_marca text := coalesce(nullif(p_dados ->> 'marca', ''), 'LETRA');
  v_logo_txt text := nullif(btrim(coalesce(p_dados ->> 'logoId', '')), '');
  v_logo escritorio_logos;
  v_jeito text := nullif(p_dados ->> 'logoJeito', '');
  v_cor text := coalesce(nullif(p_dados ->> 'logoCor', ''), 'ARQUIVO');
  v_tem_oab boolean := p_dados ? 'oabUf' or p_dados ? 'oabNumero';
  v_oab_uf text := nullif(upper(btrim(coalesce(p_dados ->> 'oabUf', ''))), '');
  v_oab_num text := nullif(regexp_replace(coalesce(p_dados ->> 'oabNumero', ''), '[^0-9]', '', 'g'), '');
  v_nao_salvo jsonb;
  x escritorios;
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
  if v_tem_marca then
    if v_marca not in ('LETRA', 'LOGO') then v_campos := v_campos || 'marca'::text; end if;
    if v_jeito is not null and v_jeito not in ('SO_LOGO', 'LOGO_E_NOME') then v_campos := v_campos || 'logoJeito'::text; end if;
    if v_cor not in ('ARQUIVO', 'UMA_COR') then v_campos := v_campos || 'logoCor'::text; end if;
    if v_marca = 'LOGO' and (v_logo_txt is null or v_logo_txt !~ '^[0-9a-f-]{36}$') then v_campos := v_campos || 'logoId'::text; end if;
  end if;
  if v_tem_oab then
    if (v_oab_uf is null) <> (v_oab_num is null) then
      v_campos := v_campos || case when v_oab_uf is null then 'oabUf' else 'oabNumero' end;
    elsif v_oab_uf is not null and not uf_brasil(v_oab_uf) then v_campos := v_campos || 'oabUf'::text;
    elsif v_oab_num is not null and v_oab_num !~ '^[1-9][0-9]{0,5}$' then v_campos := v_campos || 'oabNumero'::text;
    end if;
  end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira os dados do recebimento' using errcode = 'TC422', detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;

  if v_tem_marca and v_marca = 'LOGO' then
    select * into v_logo from escritorio_logos where id = v_logo_txt::uuid and escritorio_id = p_escritorio;
    if v_logo.id is null then raise exception 'Logo não encontrado' using errcode = 'TC404', detail = '{"motivo": "LOGO_DE_OUTRO_ESCRITORIO"}'; end if;
    -- Logo claro demais só vale em uma cor só, na cor da tinta (pergunta 7). O resto se salva.
    if not v_logo.passa and v_cor <> 'UMA_COR' then
      v_nao_salvo := jsonb_build_object('marca', 'LOGO_SEM_CONTRASTE', 'contraste', v_logo.contraste_min);
      v_tem_marca := false;
    end if;
  end if;

  select * into e from escritorio_recebimento where escritorio_id = p_escritorio for update;
  if e.id is null then
    if v_versao <> 0 then raise exception 'Outra pessoa alterou este registro' using errcode = 'TC409', detail = '{"versao": null}'; end if;
    insert into escritorio_recebimento (escritorio_id, pix_tipo, pix_chave, recebedor_nome, cidade, instrucoes, atualizado_por)
    values (p_escritorio, v_tipo, v_chave, v_receb, v_cidade, v_instr, p_pessoa) returning * into e;
    if v_tem_marca then
      update escritorio_recebimento set marca = v_marca, logo_id = case when v_marca = 'LOGO' then v_logo.id end,
             logo_jeito = case when v_marca = 'LOGO' then v_jeito end, logo_cor = case when v_marca = 'LOGO' then v_cor else 'ARQUIVO' end
       where id = e.id returning * into e;
    end if;
    v_trocou := false;
  else
    if e.versao <> v_versao then perform conflito_versao('escritorio_recebimento', e.id); end if;
    v_trocou := e.pix_chave is not null and (e.pix_chave is distinct from v_chave or e.recebedor_nome is distinct from v_receb or e.cidade is distinct from v_cidade);
    update escritorio_recebimento
       set pix_tipo = v_tipo, pix_chave = v_chave, recebedor_nome = v_receb, cidade = v_cidade, instrucoes = v_instr,
           atualizado_por = p_pessoa, atualizado_em = app_now(),
           marca = case when v_tem_marca then v_marca else marca end,
           logo_id = case when v_tem_marca then case when v_marca = 'LOGO' then v_logo.id end else logo_id end,
           logo_jeito = case when v_tem_marca then case when v_marca = 'LOGO' then v_jeito end else logo_jeito end,
           logo_cor = case when v_tem_marca then case when v_marca = 'LOGO' then v_cor else 'ARQUIVO' end else logo_cor end
     where id = e.id returning * into e;
  end if;
  if v_trocou then
    -- Os carnês com a chave antiga, das parcelas que ainda não foram pagas.
    select count(distinct k.id) into v_desat
      from carnes k join carne_parcelas cp on cp.carne_id = k.id join recebimentos_previstos r on r.id = cp.recebimento_id
     where k.escritorio_id = p_escritorio and k.pix_chave is not null and k.pix_chave is distinct from v_chave
       and r.cancelado_em is null and parcela_recebido(r.id) < r.valor;
  end if;
  if v_tem_oab then
    select * into x from escritorios where id = p_escritorio;
    if x.oab_sociedade_uf is distinct from v_oab_uf or x.oab_sociedade_numero is distinct from v_oab_num then
      update escritorios set oab_sociedade_uf = v_oab_uf, oab_sociedade_numero = v_oab_num where id = p_escritorio;
      perform registrar_historico('escritorio.oab_sociedade', 'escritorios', p_escritorio::text,
        jsonb_build_object('uf', v_oab_uf, 'numero', v_oab_num));
    end if;
  end if;
  perform registrar_historico('escritorio.recebimento_salvo', 'escritorio_recebimento', e.id::text,
    jsonb_build_object('pixTipo', v_tipo, 'trocouChave', v_trocou, 'carnesDesatualizados', v_desat,
                       'marca', e.marca, 'logo', case when e.logo_id is not null then (select jsonb_build_object('id', l.id, 'arquivo', l.nome_original,
                         'largura', l.largura, 'altura', l.altura, 'contraste', l.contraste_min) from escritorio_logos l where l.id = e.logo_id) end,
                       'naoSalvo', v_nao_salvo));
  return jsonb_build_object('versao', e.versao, 'desatualizados', v_desat, 'naoSalvo', v_nao_salvo);
end $$;

create or replace function portal_carne_gerar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_dados jsonb) returns jsonb
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
  insert into carnes (escritorio_id, contrato_id, formato, com_capa, pix_tipo, pix_chave, recebedor_nome, cidade, instrucoes, gerado_por, marca)
  values (p_escritorio, c.id, v_formato, v_capa, e.pix_tipo, e.pix_chave, e.recebedor_nome, e.cidade, e.instrucoes, p_pessoa, marca_do_escritorio(p_escritorio))
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

create or replace function portal_carne(p_pessoa uuid, p_escritorio uuid, p_carne uuid, p_area text) returns jsonb
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
    'marca', k.marca,
    'escritorio', jsonb_build_object('nome', x.nome, 'cnpj', x.cnpj, 'endereco', x.endereco, 'cidade', x.cidade, 'uf', x.uf,
                                     'oab', k.marca ->> 'oab',
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

-- O recibo guarda a marca e a OAB do dia na cópia.
create or replace function recibo_montar(p_escritorio uuid, p_recibo uuid, p_pagador jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'numero', jsonb_build_object('ano', b.ano, 'numero', b.numero),
    'marca', marca_do_escritorio(b.escritorio_id),
    'escritorio', jsonb_build_object('nome', x.nome, 'cnpj', x.cnpj, 'endereco', x.endereco, 'cidade', x.cidade, 'uf', x.uf,
                                     'oab', oab_sociedade_frase(x),
                                     'contatos', x.contatos,
                                     'whatsapp', (select w.numero from whatsapp_escritorio w where w.escritorio_id = p_escritorio and w.situacao <> 'DESLIGADO' limit 1)),
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome, 'tipo', k.tipo, 'documento', k.documento),
    'pagador', case when coalesce(p_pagador ->> 'tipo', 'CLIENTE') <> 'CLIENTE' then
                 jsonb_build_object('tipo', p_pagador ->> 'tipo', 'nome', p_pagador ->> 'nome', 'documento', p_pagador ->> 'documento', 'papel', p_pagador ->> 'papel') end,
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'parcela', jsonb_build_object('id', r.id, 'descricao', r.descricao, 'vencimento', r.vencimento, 'ordem', o.ordem, 'total', o.total),
    'valor', p.valor, 'multaJuros', p.multa_juros, 'forma', p.forma, 'pagoEm', p.recebido_em,
    'registradoPor', jsonb_build_object('nome', q.nome, 'oab', oab_frase(q.id, p_escritorio)),
    'registradoEm', p.criado_em, 'pagamentoId', p.id)
    from recibos b
    join pagamentos_recebidos p on p.id = b.pagamento_id
    join recebimentos_previstos r on r.id = p.parcela_id
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
    join escritorios x on x.id = b.escritorio_id
    join pessoas q on q.id = p.autor_id
    left join lateral (select o.ordem, o.total from carne_ordem_parcelas(c.id) o where o.id = r.id) o on true
   where b.id = p_recibo and b.escritorio_id = p_escritorio
$$;
-- "Dados do escritório" mostra o registro da sociedade na OAB.
create or replace function portal_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  return (
    select jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cnpj', e.cnpj, 'cidade', e.cidade, 'uf', e.uf, 'endereco', e.endereco,
      'oabSociedade', oab_sociedade_frase(e),
      'contatos', e.contatos, 'dono', v_dono, 'pessoa', (select nome from pessoas where id = p_pessoa), 'areas', to_jsonb(areas_da_pessoa(p_pessoa, p_escritorio)),
      'socios', (select coalesce(jsonb_agg(p.nome order by v.criado_em), '[]'::jsonb)
                   from vinculos v join pessoas p on p.id = v.pessoa_id
                  where v.escritorio_id = e.id and v.funcao = 'SOCIO' and v.revogado_em is null),
      'pessoas', (select count(distinct v.pessoa_id) from vinculos v join funcoes f on f.codigo = v.funcao
                   where v.escritorio_id = e.id and f.sistema = 'PORTAL' and v.revogado_em is null),
      'ultimaExportacao', case when v_dono then
                            (select jsonb_build_object('em', h.ocorrido_em, 'por', q.nome)
                               from historico h left join pessoas q on q.id = h.autor_id
                              where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                              order by h.id desc limit 1) end,
      -- Toda a equipe vê se os dados já foram baixados no fim (o aviso diz), mas não quem baixou.
      'encerramento', case when situacao_do_contrato(e.contrato_fim_em) = 'CONSULTA'
                           then datas_do_contrato(e.contrato_fim_em, e.acesso_fechado_em) || jsonb_build_object(
                             'exportadoEm', (select max(h.ocorrido_em) from historico h
                                              where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                                                and h.ocorrido_em >= inicio_do_dia(e.contrato_fim_em))) end,
      'conversasEsperando', (select count(*) from conversas c where c.escritorio_id = e.id and c.situacao = 'PRECISA'))
      from escritorios e where e.id = p_escritorio);
end $$;


call fechar_acesso();
