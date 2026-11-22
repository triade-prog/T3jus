-- Os dados de cada advogado para os documentos (EX-15, desenho aprovado em
-- docs/design/aprovadas/portal-conta-dados, 22/11/2026). Decisões da Carol:
--   1. a própria pessoa (em Sua conta) e a sócia dona (na ficha da pessoa, na Equipe) mudam os
--      dados; a última mudança vale e fica no histórico, só com os nomes dos campos;
--   2. o endereço profissional padrão é o do escritório;
--   3. dado faltando não bloqueia: o documento sai com a marca, como no cliente;
--   4. a OAB continua só na Equipe (oab_inscricao, 0430).
-- Por escritório, e não na pessoa: a mesma pessoa pode estar em dois escritórios, com outro
-- endereço e outro e-mail profissional. A pessoa e o escritório vêm sempre da sessão.

create table pessoa_dados_documento (
  id                      uuid primary key default gen_random_uuid(),
  escritorio_id           uuid not null references escritorios (id) on delete restrict,
  pessoa_id               uuid not null references pessoas (id) on delete restrict,
  nome_completo           text not null check (length(btrim(nome_completo)) between 5 and 120 and nome_completo !~ '[0-9]'),
  tratamento              text check (tratamento in ('ADVOGADA', 'ADVOGADO')),
  nacionalidade           text check (length(btrim(nacionalidade)) between 2 and 60),
  estado_civil            text check (estado_civil in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO')),
  cpf                     text check (cpf is null or cpf_valido(cpf)),
  rg                      text check (length(btrim(rg)) between 3 and 20),
  rg_orgao                text check (length(btrim(rg_orgao)) between 2 and 20),
  endereco_do_escritorio  boolean not null default true,
  cep                     text check (cep ~ '^[0-9]{8}$'),
  endereco                text check (length(btrim(endereco)) between 3 and 200),
  bairro                  text check (length(btrim(bairro)) between 2 and 80),
  cidade                  text check (length(btrim(cidade)) between 2 and 80),
  uf                      text check (uf is null or uf_brasil(uf)),
  email_profissional      text check (length(email_profissional) <= 254 and email_profissional ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefone_profissional   text check (telefone_profissional ~ '^[0-9]{10,11}$'),
  criado_em               timestamptz not null default app_now(),
  atualizado_em           timestamptz not null default app_now(),
  atualizado_por          uuid not null references pessoas (id) on delete restrict,
  versao                  integer not null default 1,
  -- Com o endereço do escritório, o próprio não é guardado; sem ele, cidade e UF são obrigatórias.
  check (case when endereco_do_escritorio then (cep, endereco, bairro, cidade, uf) is not distinct from (null, null, null, null, null)
              else cidade is not null and uf is not null end)
);
create unique index pessoa_dados_documento_unica on pessoa_dados_documento (escritorio_id, pessoa_id);
call proteger_tabela_escritorio('pessoa_dados_documento');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('pessoa_dados_documento', true,
  'Qualificação de quem assina pelo escritório: nome completo, tratamento, nacionalidade, estado civil, CPF, RG, endereço, e-mail e telefone profissionais',
  'Qualificar os advogados no contrato de honorários, na procuração e nas petições que o escritório gera (EX-15)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Os dados como a tela e os documentos usam. Sem linha, nasce do nome do convite, com o
-- endereço do escritório (decisão 2) e versão 0 (o primeiro salvar cria a linha).
create function pessoa_dados_json(p_alvo uuid, p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
        'nomeCompleto', d.nome_completo, 'tratamento', d.tratamento, 'nacionalidade', d.nacionalidade,
        'estadoCivil', d.estado_civil, 'cpf', d.cpf, 'rg', d.rg, 'rgOrgao', d.rg_orgao,
        'enderecoDoEscritorio', d.endereco_do_escritorio, 'cep', d.cep, 'endereco', d.endereco, 'bairro', d.bairro,
        'cidade', d.cidade, 'uf', d.uf, 'emailProfissional', d.email_profissional, 'telefoneProfissional', d.telefone_profissional,
        'atualizadoEm', d.atualizado_em, 'atualizadoPor', pessoa_ref(d.atualizado_por), 'versao', d.versao)
       from pessoa_dados_documento d where d.pessoa_id = p_alvo and d.escritorio_id = p_escritorio),
    (select jsonb_build_object(
        'nomeCompleto', p.nome, 'tratamento', null, 'nacionalidade', null, 'estadoCivil', null, 'cpf', null, 'rg', null,
        'rgOrgao', null, 'enderecoDoEscritorio', true, 'cep', null, 'endereco', null, 'bairro', null, 'cidade', null, 'uf', null,
        'emailProfissional', null, 'telefoneProfissional', null, 'atualizadoEm', null, 'atualizadoPor', null, 'versao', 0)
       from pessoas p where p.id = p_alvo))
$$;

-- O endereço do escritório, para a frase de quem usa o padrão.
create function escritorio_endereco_json(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf) from escritorios e where e.id = p_escritorio
$$;

-- As últimas mudanças dos dados de uma pessoa (lateral da ficha na Equipe).
create function pessoa_dados_mudancas(p_alvo uuid, p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x order by hid desc), '[]'::jsonb) from (
    select h.id hid, jsonb_build_object('em', h.ocorrido_em, 'por', pessoa_ref(h.autor_id), 'onde', h.dados ->> 'onde', 'campos', h.dados -> 'campos') x
      from historico h
     where h.escritorio_id = p_escritorio and not h.interno and h.acao = 'equipe.dados_documento_mudados'
       and h.dados ->> 'pessoa_id' = p_alvo::text
     order by h.id desc limit 5) t
$$;

-- Confere e grava. Recusa com o campo e o código de cada erro, para a tela prender a mensagem.
create function pessoa_dados_gravar(p_autor uuid, p_escritorio uuid, p_alvo uuid, p_versao integer, p_dados jsonb, p_onde text)
returns jsonb
language plpgsql
set search_path = public
as $$
#variable_conflict use_variable
declare
  a pessoa_dados_documento;
  n pessoa_dados_documento;
  t text;
  e jsonb := '{}';
  v_nome text := nullif(regexp_replace(btrim(coalesce(p_dados ->> 'nomeCompleto', '')), '\s+', ' ', 'g'), '');
  v_trat text := upper(nullif(btrim(coalesce(p_dados ->> 'tratamento', '')), ''));
  v_nac text := nullif(btrim(coalesce(p_dados ->> 'nacionalidade', '')), '');
  v_civil text := upper(nullif(btrim(coalesce(p_dados ->> 'estadoCivil', '')), ''));
  v_cpf text := nullif(regexp_replace(coalesce(p_dados ->> 'cpf', ''), '\D', '', 'g'), '');
  v_rg text := nullif(btrim(coalesce(p_dados ->> 'rg', '')), '');
  v_org text := upper(nullif(btrim(coalesce(p_dados ->> 'rgOrgao', '')), ''));
  v_do_esc boolean := coalesce((p_dados ->> 'enderecoDoEscritorio')::boolean, true);
  v_cep text := nullif(regexp_replace(coalesce(p_dados ->> 'cep', ''), '\D', '', 'g'), '');
  v_end text := nullif(btrim(coalesce(p_dados ->> 'endereco', '')), '');
  v_bairro text := nullif(btrim(coalesce(p_dados ->> 'bairro', '')), '');
  v_cidade text := nullif(btrim(coalesce(p_dados ->> 'cidade', '')), '');
  v_uf text := upper(nullif(btrim(coalesce(p_dados ->> 'uf', '')), ''));
  v_email text := lower(nullif(btrim(coalesce(p_dados ->> 'emailProfissional', '')), ''));
  v_tel text := nullif(regexp_replace(coalesce(p_dados ->> 'telefoneProfissional', ''), '\D', '', 'g'), '');
  v_campos text[] := '{}';
begin
  if p_onde not in ('CONTA', 'EQUIPE') then raise exception 'Origem inválida' using errcode = 'TC422'; end if;
  if v_nome is null then e := e || jsonb_build_object('nomeCompleto', 'NOME_COMPLETO_OBRIGATORIO');
  elsif length(v_nome) not between 5 and 120 or v_nome ~ '[0-9]' then e := e || jsonb_build_object('nomeCompleto', 'NOME_COMPLETO_INVALIDO');
  end if;
  if v_trat is not null and v_trat not in ('ADVOGADA', 'ADVOGADO') then e := e || jsonb_build_object('tratamento', 'TRATAMENTO_INVALIDO'); end if;
  if v_nac is not null and length(v_nac) not between 2 and 60 then e := e || jsonb_build_object('nacionalidade', 'NACIONALIDADE_INVALIDA'); end if;
  if v_civil is not null and v_civil not in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO') then
    e := e || jsonb_build_object('estadoCivil', 'ESTADO_CIVIL_INVALIDO');
  end if;
  if v_cpf is not null and not cpf_valido(v_cpf) then e := e || jsonb_build_object('cpf', 'CPF_INVALIDO'); end if;
  if v_rg is not null and length(v_rg) not between 3 and 20 then e := e || jsonb_build_object('rg', 'RG_INVALIDO'); end if;
  if v_org is not null and length(v_org) not between 2 and 20 then e := e || jsonb_build_object('rgOrgao', 'RG_ORGAO_INVALIDO'); end if;
  if v_do_esc then
    v_cep := null; v_end := null; v_bairro := null; v_cidade := null; v_uf := null;
  else
    if v_cep is not null and v_cep !~ '^[0-9]{8}$' then e := e || jsonb_build_object('cep', 'CEP_INVALIDO'); end if;
    if v_end is not null and length(v_end) not between 3 and 200 then e := e || jsonb_build_object('endereco', 'ENDERECO_INVALIDO'); end if;
    if v_bairro is not null and length(v_bairro) not between 2 and 80 then e := e || jsonb_build_object('bairro', 'BAIRRO_INVALIDO'); end if;
    if v_cidade is null then e := e || jsonb_build_object('cidade', 'ENDERECO_INCOMPLETO');
    elsif length(v_cidade) not between 2 and 80 then e := e || jsonb_build_object('cidade', 'CIDADE_INVALIDA');
    end if;
    if v_uf is null then e := e || jsonb_build_object('uf', 'ENDERECO_INCOMPLETO');
    elsif not uf_brasil(v_uf) then e := e || jsonb_build_object('uf', 'UF_INVALIDA');
    end if;
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    e := e || jsonb_build_object('emailProfissional', 'EMAIL_INVALIDO');
  end if;
  if v_tel is not null and v_tel !~ '^[0-9]{10,11}$' then e := e || jsonb_build_object('telefoneProfissional', 'TELEFONE_INVALIDO'); end if;
  if e <> '{}'::jsonb then
    raise exception 'Confira os dados para os documentos.' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(e) k), 'motivos', e)::text;
  end if;

  select * into a from pessoa_dados_documento where pessoa_id = p_alvo and escritorio_id = p_escritorio for update;
  if a.id is null then
    if coalesce(p_versao, 0) <> 0 then
      raise exception 'Os dados mudaram enquanto você editava' using errcode = 'TC409',
        detail = jsonb_build_object('versao', 0, 'atual', pessoa_dados_json(p_alvo, p_escritorio))::text;
    end if;
    insert into pessoa_dados_documento (escritorio_id, pessoa_id, nome_completo, tratamento, nacionalidade, estado_civil, cpf, rg, rg_orgao,
                                        endereco_do_escritorio, cep, endereco, bairro, cidade, uf, email_profissional, telefone_profissional, atualizado_por)
    values (p_escritorio, p_alvo, v_nome, v_trat, v_nac, v_civil, v_cpf, v_rg, v_org, v_do_esc, v_cep, v_end, v_bairro, v_cidade, v_uf,
            v_email, v_tel, p_autor)
    returning * into n;
    -- Antes da primeira linha, o nome completo era o do convite.
    select (select nome from pessoas where id = p_alvo) into t;
    a.nome_completo := t;
    a.endereco_do_escritorio := true;
  else
    if a.versao <> p_versao then perform conflito_versao('pessoa_dados_documento', a.id); end if;
    update pessoa_dados_documento
       set nome_completo = v_nome, tratamento = v_trat, nacionalidade = v_nac, estado_civil = v_civil, cpf = v_cpf, rg = v_rg,
           rg_orgao = v_org, endereco_do_escritorio = v_do_esc, cep = v_cep, endereco = v_end, bairro = v_bairro, cidade = v_cidade,
           uf = v_uf, email_profissional = v_email, telefone_profissional = v_tel, atualizado_em = app_now(), atualizado_por = p_autor
     where id = a.id returning * into n;
  end if;

  -- Só os nomes dos campos que mudaram (nunca os valores de CPF e RG).
  if a.nome_completo is distinct from n.nome_completo then v_campos := v_campos || 'NOME_COMPLETO'::text; end if;
  if a.tratamento is distinct from n.tratamento then v_campos := v_campos || 'TRATAMENTO'::text; end if;
  if a.nacionalidade is distinct from n.nacionalidade then v_campos := v_campos || 'NACIONALIDADE'::text; end if;
  if a.estado_civil is distinct from n.estado_civil then v_campos := v_campos || 'ESTADO_CIVIL'::text; end if;
  if a.cpf is distinct from n.cpf then v_campos := v_campos || 'CPF'::text; end if;
  if (a.rg, a.rg_orgao) is distinct from (n.rg, n.rg_orgao) then v_campos := v_campos || 'RG'::text; end if;
  if (a.endereco_do_escritorio, a.cep, a.endereco, a.bairro, a.cidade, a.uf)
     is distinct from (n.endereco_do_escritorio, n.cep, n.endereco, n.bairro, n.cidade, n.uf) then v_campos := v_campos || 'ENDERECO'::text; end if;
  if a.email_profissional is distinct from n.email_profissional then v_campos := v_campos || 'EMAIL_PROFISSIONAL'::text; end if;
  if a.telefone_profissional is distinct from n.telefone_profissional then v_campos := v_campos || 'TELEFONE_PROFISSIONAL'::text; end if;
  if cardinality(v_campos) > 0 then
    perform registrar_historico('equipe.dados_documento_mudados', 'pessoa_dados_documento', n.id::text,
      jsonb_build_object('pessoa_id', p_alvo, 'onde', p_onde, 'campos', to_jsonb(v_campos)));
  end if;
  return pessoa_dados_json(p_alvo, p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- API do Portal.

-- Sua conta: só a pessoa da sessão (sem pessoa na rota).
create function portal_conta_dados(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform equipe_alvo(p_pessoa, p_escritorio);
  return pessoa_dados_json(p_pessoa, p_escritorio);
end $$;

create function portal_conta_dados_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform equipe_alvo(p_pessoa, p_escritorio);
  return pessoa_dados_gravar(p_pessoa, p_escritorio, p_pessoa, p_versao, p_dados, 'CONTA');
end $$;

-- Na Equipe: só a sócia dona (decisão 1).
create function portal_equipe_pessoa_dados(p_pessoa uuid, p_escritorio uuid, p_alvo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  perform equipe_alvo(p_alvo, p_escritorio);
  return pessoa_dados_json(p_alvo, p_escritorio) || jsonb_build_object('mudancas', pessoa_dados_mudancas(p_alvo, p_escritorio));
end $$;

create function portal_equipe_pessoa_dados_salvar(p_pessoa uuid, p_escritorio uuid, p_alvo uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform equipe_alvo(p_alvo, p_escritorio);
  -- Em dois passos: a função estável só enxerga o histórico novo num comando seguinte.
  r := pessoa_dados_gravar(p_pessoa, p_escritorio, p_alvo, p_versao, p_dados, 'EQUIPE');
  return r || jsonb_build_object('mudancas', pessoa_dados_mudancas(p_alvo, p_escritorio));
end $$;

-- Sua conta e a ficha da pessoa passam a trazer os dados e o endereço do escritório.
create or replace function portal_conta(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v vinculos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v := equipe_alvo(p_pessoa, p_escritorio);
  return (select jsonb_build_object(
      'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO', 'desde', v.criado_em,
      'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
      'oab', oab_inscricoes(p.id, p_escritorio), 'frase', oab_frase(p.id, p_escritorio),
      'contratos', (select coalesce(jsonb_agg(x || jsonb_build_object('inscricoes', oab_frase(p.id, p_escritorio))), '[]'::jsonb)
                      from jsonb_array_elements(oab_contratos_da_pessoa(p.id, p_escritorio)) x),
      'socios', (select coalesce(jsonb_agg(q.nome order by s.criado_em), '[]'::jsonb)
                   from vinculos s join pessoas q on q.id = s.pessoa_id
                  where s.escritorio_id = p_escritorio and s.funcao = 'SOCIO' and s.revogado_em is null),
      'dados', pessoa_dados_json(p.id, p_escritorio),
      'escritorio', escritorio_endereco_json(p_escritorio))
    from pessoas p where p.id = p_pessoa);
end $$;

create or replace function portal_equipe_pessoa(p_pessoa uuid, p_escritorio uuid, p_alvo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v vinculos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  v := equipe_alvo(p_alvo, p_escritorio);
  return (select jsonb_build_object(
      'vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO',
      'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)), 'desde', v.criado_em, 'versao', v.versao,
      'senhaCriadaEm', p.senha_criada_em, 'conviteEnviadoEm', convite_enviado_em(v.id),
      'oab', oab_inscricoes(p.id, p_escritorio), 'frase', oab_frase(p.id, p_escritorio),
      'contratos', oab_contratos_da_pessoa(p.id, p_escritorio),
      'dados', pessoa_dados_json(p.id, p_escritorio) || jsonb_build_object('mudancas', pessoa_dados_mudancas(p.id, p_escritorio)),
      'escritorio', escritorio_endereco_json(p_escritorio))
    from pessoas p where p.id = p_alvo);
end $$;

-- O gerador de documentos lê, no servidor, os dados de cada advogado (decisão 3: não bloqueia).
create or replace function documento_advogados(p_escritorio uuid, c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'pessoaId', p.id, 'nome', p.nome, 'noContrato', ca.pessoa_id is not null, 'responsavel', p.id = c.responsavel_id,
           'inscricoes', oab_inscricoes(p.id, p_escritorio),
           'escolhidas', case when ca.pessoa_id is not null then to_jsonb(contrato_inscricoes_valem(p_escritorio, c.id, p.id))
                              else (select coalesce(jsonb_agg(i.id), '[]'::jsonb) from oab_inscricao i
                                     where i.pessoa_id = p.id and i.escritorio_id = p_escritorio and i.removido_em is null) end,
           'dados', pessoa_dados_json(p.id, p_escritorio))
         order by ca.pessoa_id is null, p.id <> c.responsavel_id, p.nome), '[]'::jsonb)
    from pessoas p
    left join contrato_advogados ca on ca.contrato_id = c.id and ca.pessoa_id = p.id
   where peticao_membro(p.id, p_escritorio) and peticao_tem_oab(p.id, p_escritorio)
$$;

-- O histórico da equipe mostra as mudanças dos dados para os documentos.
create or replace function portal_historico_equipe(p_pessoa uuid, p_escritorio uuid, p_antes bigint default null, p_limite integer default 50)
returns table (id bigint, ocorrido_em timestamptz, autor_id uuid, autor_nome text, acao text, entidade_id text,
               dados jsonb, pessoa_nome text, para_nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return query
    select h.id, h.ocorrido_em, h.autor_id, a.nome, h.acao, h.entidade_id, h.dados, m.nome, t.nome
      from historico h
      left join pessoas a on a.id = h.autor_id
      left join pessoas m on m.id = (h.dados ->> 'pessoa_id')::uuid
      left join pessoas t on t.id = (h.dados ->> 'passou_para')::uuid
     where h.escritorio_id = p_escritorio and not h.interno
       and h.acao in ('equipe.convidada', 'equipe.areas_mudadas', 'equipe.convite_reenviado', 'equipe.convite_cancelado',
                      'equipe.retirada', 'socio.convidado', 'socio.convite_reenviado', 'escritorio.exportado',
                      'suporte.link_senha', 'suporte.desconectou', 'suporte.tirou_autenticador',
                      'equipe.oab_incluida', 'equipe.oab_mudada', 'equipe.oab_removida', 'equipe.dados_documento_mudados')
       and (p_antes is null or h.id < p_antes)
     order by h.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

call fechar_acesso();
