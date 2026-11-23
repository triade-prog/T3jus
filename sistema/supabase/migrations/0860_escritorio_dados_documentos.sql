-- 0860 · Dados do escritório para os documentos (PA-07; EX-15, CH-08, CO-02). Desenho aprovado
-- pela Carol em 22/11/2026, 19h26 (docs/design/aprovadas/escritorio-dados-documentos), com as
-- 5 recomendações:
--   1. a sócia dona preenche e muda os dados no Portal (os outros leem); a equipe T3jus continua
--      mudando no Console. Tudo vai para o histórico ('ficha.alterada', com onde e os campos);
--   2. o endereço de cobrança da assinatura é "o mesmo da sede" por padrão;
--   3. o registro da sociedade na OAB passa a ser mudado aqui (Marca e timbrado só mostra);
--   4. sem sociedade, a contratada do contrato padrão é a sócia dona, sem CNPJ;
--   5. Advogados nos documentos fica em Escritório: a sócia dona muda os de todos e cada
--      advogado completa os próprios (as funções de gravar da 0760 já fazem isso).
-- A faixa 0860-0869 é desta frente.
--
-- A sede passa a ser guardada em partes (end_*, os mesmos nomes de assinaturas, 0694). A coluna
-- endereco continua e vira a linha "rua, número, complemento, bairro" montada das partes por um
-- gatilho, para quem já lê a ficha (carnê, recibo, timbrado) seguir funcionando. O texto antigo
-- vai inteiro para a rua, com end_confira: o documento sai com [ENDEREÇO: confira] até alguém
-- salvar (decisão 18: o T3jus não tenta separar o texto sozinho).

alter table escritorios drop constraint escritorios_endereco_check;
alter table escritorios add constraint escritorios_endereco_check check (length(btrim(endereco)) between 2 and 400);

alter table escritorios
  add column tipo            text check (tipo in ('SOCIEDADE', 'SOCIEDADE_INDIVIDUAL', 'SEM_SOCIEDADE')),
  add column razao_social    text check (length(btrim(razao_social)) between 5 and 150),
  add column end_cep         text check (end_cep ~ '^[0-9]{8}$'),
  add column end_logradouro  text check (length(btrim(end_logradouro)) between 2 and 200),
  add column end_numero      text check (length(btrim(end_numero)) between 1 and 20),
  add column end_complemento text check (length(btrim(end_complemento)) between 1 and 60),
  add column end_bairro      text check (length(btrim(end_bairro)) between 2 and 80),
  add column end_confira     boolean not null default false,
  add column telefone        text check (telefone ~ '^[0-9]{10,11}$'),
  add column email           text check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column site            text check (length(site) <= 200 and site ~ '^(https?://)?[^\s/]+\.[^\s]+$'),
  -- Sem sociedade não há razão social, CNPJ nem registro da sociedade.
  add constraint escritorios_sem_sociedade check (
    tipo is distinct from 'SEM_SOCIEDADE' or (razao_social is null and cnpj is null and oab_sociedade_uf is null));

-- A linha da sede, das partes. Só quando alguma parte muda: a ficha antiga do Console
-- (console_editar_ficha, 0060) ainda grava o texto direto.
create function escritorio_linha_sede() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Ficha nova sem as partes (a implantação ainda escreve o texto): fica como veio.
  if tg_op = 'INSERT' and new.end_logradouro is null and new.end_numero is null and new.end_complemento is null and new.end_bairro is null then
    return new;
  end if;
  new.endereco := nullif(concat_ws(', ', nullif(btrim(new.end_logradouro), ''), nullif(btrim(new.end_numero), ''),
                                   nullif(btrim(new.end_complemento), ''), nullif(btrim(new.end_bairro), '')), '');
  return new;
end $$;
create trigger escritorios_linha_sede before insert or update of end_logradouro, end_numero, end_complemento, end_bairro on escritorios
  for each row execute function escritorio_linha_sede();

-- O texto antigo vai para a rua, com "confira" (o gatilho refaz a mesma linha).
alter table escritorios disable trigger user;
update escritorios set end_logradouro = left(btrim(endereco), 200), end_confira = true
 where endereco is not null and length(btrim(endereco)) >= 2;
alter table escritorios enable trigger user;

-- ---------------------------------------------------------------------------------------
-- Leitura.

-- A sócia dona: o vínculo de sócio mais antigo ainda ativo.
create function escritorio_socia_dona(p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  select v.pessoa_id from vinculos v
   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null
   order by v.criado_em, v.id limit 1
$$;

-- Tudo o que os documentos usam do escritório. Com p_com_dona, os dados da sócia dona para a
-- frase "sem sociedade" (só para quem já pode vê-los: ela mesma e o gerador de documentos).
create function escritorio_documentos_json(x escritorios, p_com_dona boolean default false) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'nome', x.nome, 'tipo', x.tipo, 'razaoSocial', x.razao_social, 'cnpj', x.cnpj,
    'oabUf', x.oab_sociedade_uf, 'oabNumero', x.oab_sociedade_numero, 'oab', oab_sociedade_frase(x),
    'cep', x.end_cep, 'logradouro', x.end_logradouro, 'numero', x.end_numero, 'complemento', x.end_complemento,
    'bairro', x.end_bairro, 'cidade', x.cidade, 'uf', x.uf, 'endereco', x.endereco, 'enderecoConfira', x.end_confira,
    'telefone', x.telefone, 'email', x.email, 'site', x.site,
    'dona', (select jsonb_build_object('pessoaId', p.id, 'nome', p.nome,
                                       'dados', case when p_com_dona then pessoa_dados_json(p.id, x.id) end,
                                       'inscricoes', case when p_com_dona then oab_inscricoes(p.id, x.id) end)
               from pessoas p where p.id = escritorio_socia_dona(x.id)))
$$;

-- O endereço do escritório para a frase de quem usa o padrão (0760), agora com o CEP.
create or replace function escritorio_endereco_json(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf, 'cep', e.end_cep, 'confira', e.end_confira)
    from escritorios e where e.id = p_escritorio
$$;

-- O Escritório do Portal traz os dados para os documentos e a versão (para editar).
create or replace function portal_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare x escritorios;
begin
  select * into x from escritorios where id = p_escritorio;
  return escritorio_sem_whatsapp(p_pessoa, p_escritorio) || jsonb_build_object(
    'whatsappLigado', whatsapp_ligado(p_escritorio),
    'versao', x.versao,
    'documentos', escritorio_documentos_json(x, e_socio_dono(p_pessoa, p_escritorio)),
    'dadosMudados', (select jsonb_build_object('em', h.ocorrido_em, 'por', q.nome, 'onde', h.dados ->> 'onde')
                       from historico h left join pessoas q on q.id = h.autor_id
                      where h.escritorio_id = p_escritorio and h.acao = 'ficha.alterada'
                      order by h.id desc limit 1));
end $$;

-- A ficha do Console traz as partes novas.
alter function console_ficha(uuid, uuid) rename to console_ficha_sem_documentos;

create function console_ficha(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb := console_ficha_sem_documentos(p_pessoa, p_escritorio);
begin
  return jsonb_set(r, '{escritorio}', (r -> 'escritorio')
    || (select escritorio_documentos_json(x) - 'dona' from escritorios x where x.id = p_escritorio));
end $$;

-- ---------------------------------------------------------------------------------------
-- Gravar.

-- Confere e grava os dados do escritório. Recusa com o campo e o código de cada erro (como
-- pessoa_dados_gravar, 0760). No Portal o tipo é obrigatório; no Console, a implantação pode
-- ainda não saber. Os contatos só mudam pelo Console (p_onde = 'CONSOLE' e a chave presente).
create function escritorio_dados_gravar(p_escritorio uuid, p_versao integer, p_dados jsonb, p_onde text) returns integer
language plpgsql
set search_path = public
as $$
#variable_conflict use_variable
declare
  a escritorios;
  n escritorios;
  e jsonb := '{}';
  v_nome text := nullif(regexp_replace(btrim(coalesce(p_dados ->> 'nome', '')), '\s+', ' ', 'g'), '');
  v_tipo text := upper(nullif(btrim(coalesce(p_dados ->> 'tipo', '')), ''));
  v_razao text := nullif(regexp_replace(btrim(coalesce(p_dados ->> 'razaoSocial', '')), '\s+', ' ', 'g'), '');
  v_cnpj text := nullif(regexp_replace(coalesce(p_dados ->> 'cnpj', ''), '\D', '', 'g'), '');
  v_oab_uf text := upper(nullif(btrim(coalesce(p_dados ->> 'oabUf', '')), ''));
  v_oab_num text := nullif(regexp_replace(coalesce(p_dados ->> 'oabNumero', ''), '\D', '', 'g'), '');
  v_cep text := nullif(regexp_replace(coalesce(p_dados ->> 'cep', ''), '\D', '', 'g'), '');
  v_rua text := nullif(regexp_replace(btrim(coalesce(p_dados ->> 'logradouro', '')), '\s+', ' ', 'g'), '');
  v_num text := upper(nullif(btrim(coalesce(p_dados ->> 'numero', '')), ''));
  v_compl text := nullif(btrim(coalesce(p_dados ->> 'complemento', '')), '');
  v_bairro text := nullif(btrim(coalesce(p_dados ->> 'bairro', '')), '');
  v_cidade text := nullif(btrim(coalesce(p_dados ->> 'cidade', '')), '');
  v_uf text := upper(nullif(btrim(coalesce(p_dados ->> 'uf', '')), ''));
  v_tel text := nullif(regexp_replace(coalesce(p_dados ->> 'telefone', ''), '\D', '', 'g'), '');
  v_email text := lower(nullif(btrim(coalesce(p_dados ->> 'email', '')), ''));
  v_site text := lower(nullif(btrim(coalesce(p_dados ->> 'site', '')), ''));
  v_contatos jsonb;
  v_campos text[] := '{}';
begin
  if p_onde not in ('PORTAL', 'CONSOLE') then raise exception 'Origem inválida' using errcode = 'TC422'; end if;
  if p_onde = 'CONSOLE' and p_dados ? 'contatos' then v_contatos := coalesce(p_dados -> 'contatos', '[]'::jsonb); end if;
  if v_num = 'SN' or v_num = 'S N' then v_num := 'S/N'; end if;

  if v_nome is null then e := e || jsonb_build_object('nome', 'NOME_OBRIGATORIO');
  elsif length(v_nome) not between 2 and 120 then e := e || jsonb_build_object('nome', 'NOME_INVALIDO');
  end if;
  if v_tipo is null then
    if p_onde = 'PORTAL' then e := e || jsonb_build_object('tipo', 'TIPO_OBRIGATORIO'); end if;
  elsif v_tipo not in ('SOCIEDADE', 'SOCIEDADE_INDIVIDUAL', 'SEM_SOCIEDADE') then e := e || jsonb_build_object('tipo', 'TIPO_INVALIDO');
  end if;
  if v_tipo = 'SEM_SOCIEDADE' then
    v_razao := null; v_cnpj := null; v_oab_uf := null; v_oab_num := null;
  else
    if v_razao is not null and length(v_razao) not between 5 and 150 then e := e || jsonb_build_object('razaoSocial', 'RAZAO_SOCIAL_INVALIDA'); end if;
    if v_cnpj is not null and (v_cnpj !~ '^[0-9]{14}$' or not cnpj_valido(v_cnpj)) then e := e || jsonb_build_object('cnpj', 'CNPJ_INVALIDO'); end if;
    if (v_oab_uf is null) <> (v_oab_num is null) then
      e := e || jsonb_build_object(case when v_oab_uf is null then 'oabUf' else 'oabNumero' end, 'OAB_INCOMPLETA');
    elsif v_oab_uf is not null and not uf_brasil(v_oab_uf) then e := e || jsonb_build_object('oabUf', 'UF_INVALIDA');
    elsif v_oab_num is not null and v_oab_num !~ '^[1-9][0-9]{0,5}$' then e := e || jsonb_build_object('oabNumero', 'OAB_NUMERO_INVALIDO');
    end if;
  end if;
  if v_cep is not null and v_cep !~ '^[0-9]{8}$' then e := e || jsonb_build_object('cep', 'CEP_INVALIDO'); end if;
  if v_rua is not null and length(v_rua) not between 2 and 200 then e := e || jsonb_build_object('logradouro', 'LOGRADOURO_INVALIDO'); end if;
  if v_rua is not null and v_num is null then e := e || jsonb_build_object('numero', 'NUMERO_OBRIGATORIO');
  elsif v_num is not null and length(v_num) > 20 then e := e || jsonb_build_object('numero', 'NUMERO_INVALIDO');
  end if;
  if v_compl is not null and length(v_compl) > 60 then e := e || jsonb_build_object('complemento', 'COMPLEMENTO_INVALIDO'); end if;
  if v_bairro is not null and length(v_bairro) not between 2 and 80 then e := e || jsonb_build_object('bairro', 'BAIRRO_INVALIDO'); end if;
  if v_cidade is not null and length(v_cidade) not between 2 and 80 then e := e || jsonb_build_object('cidade', 'CIDADE_INVALIDA');
  elsif v_cidade is null and p_onde = 'CONSOLE' then e := e || jsonb_build_object('cidade', 'CIDADE_OBRIGATORIA');
  end if;
  if v_uf is not null and not uf_brasil(v_uf) then e := e || jsonb_build_object('uf', 'UF_INVALIDA');
  elsif v_uf is null and p_onde = 'CONSOLE' then e := e || jsonb_build_object('uf', 'UF_INVALIDA');
  end if;
  if v_tel is not null and v_tel !~ '^[0-9]{10,11}$' then e := e || jsonb_build_object('telefone', 'TELEFONE_INVALIDO'); end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then e := e || jsonb_build_object('email', 'EMAIL_INVALIDO'); end if;
  if v_site is not null and (length(v_site) > 200 or v_site !~ '^(https?://)?[^\s/]+\.[^\s]+$') then e := e || jsonb_build_object('site', 'SITE_INVALIDO'); end if;
  if v_contatos is not null and (jsonb_typeof(v_contatos) <> 'array' or not contatos_validos(v_contatos)) then
    e := e || jsonb_build_object('contatos', 'CONTATOS_INVALIDOS');
  end if;
  if e <> '{}'::jsonb then
    raise exception 'Confira os dados do escritório.' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(e) k), 'motivos', e)::text;
  end if;

  select * into a from escritorios where id = p_escritorio for update;
  if a.id is null then raise exception 'Escritório não encontrado' using errcode = 'TC404'; end if;
  begin
    update escritorios
       set nome = v_nome, tipo = coalesce(v_tipo, a.tipo), razao_social = v_razao, cnpj = v_cnpj,
           oab_sociedade_uf = v_oab_uf, oab_sociedade_numero = v_oab_num,
           end_cep = v_cep, end_logradouro = v_rua, end_numero = v_num, end_complemento = v_compl, end_bairro = v_bairro,
           cidade = v_cidade, uf = v_uf, end_confira = false, telefone = v_tel, email = v_email, site = v_site,
           contatos = coalesce(v_contatos, a.contatos)
     where id = p_escritorio and versao = p_versao
    returning * into n;
  exception
    when unique_violation then
      raise exception 'Este CNPJ já é de outro escritório' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('cnpj'), 'motivos', jsonb_build_object('cnpj', 'CNPJ_EM_USO'))::text;
  end;
  if n.id is null then perform conflito_versao('escritorios', p_escritorio); end if;

  -- Só os nomes dos campos (como na 0060).
  v_campos := array_remove(array[
    case when a.nome is distinct from n.nome then 'nome' end,
    case when a.tipo is distinct from n.tipo then 'tipo' end,
    case when a.razao_social is distinct from n.razao_social then 'razaoSocial' end,
    case when a.cnpj is distinct from n.cnpj then 'cnpj' end,
    case when (a.oab_sociedade_uf, a.oab_sociedade_numero) is distinct from (n.oab_sociedade_uf, n.oab_sociedade_numero) then 'oab' end,
    case when (a.end_cep, a.end_logradouro, a.end_numero, a.end_complemento, a.end_bairro, a.cidade, a.uf, a.end_confira)
              is distinct from (n.end_cep, n.end_logradouro, n.end_numero, n.end_complemento, n.end_bairro, n.cidade, n.uf, n.end_confira)
         then 'endereco' end,
    case when a.telefone is distinct from n.telefone then 'telefone' end,
    case when a.email is distinct from n.email then 'email' end,
    case when a.site is distinct from n.site then 'site' end,
    case when a.contatos is distinct from n.contatos then 'contatos' end], null);
  perform registrar_historico('ficha.alterada', 'escritorio', p_escritorio::text,
    jsonb_build_object('campos', to_jsonb(v_campos), 'onde', p_onde));
  return n.versao;
end $$;

-- Portal: só a sócia dona (recomendação 1).
create function portal_escritorio_dados_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  perform so_socio_dono(p_pessoa, p_escritorio);
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform escritorio_dados_gravar(p_escritorio, p_versao, p_dados, 'PORTAL');
  return portal_escritorio(p_pessoa, p_escritorio);
end $$;

-- Console: a mesma conferência, com os contatos. Ficha encerrada não muda.
create function console_ficha_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.ficha.editar');
  perform exigir_contrato_aberto_console(p_escritorio);
  return escritorio_dados_gravar(p_escritorio, p_versao, p_dados, 'CONSOLE');
end $$;

-- ---------------------------------------------------------------------------------------
-- Advogados nos documentos (pergunta 5): todos da equipe veem a lista; os dados completos só
-- de si e, para a sócia dona, de todos. Dos outros, só o que falta (os códigos), nunca CPF e RG.

create function pessoa_dados_faltas(p_alvo uuid, p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with d as (select * from pessoa_dados_documento where pessoa_id = p_alvo and escritorio_id = p_escritorio),
       x as (select * from escritorios where id = p_escritorio)
  select to_jsonb(array_remove(array[
    case when coalesce((select nome_completo from d), '') = '' then 'NOME_COMPLETO' end,
    case when (select tratamento from d) is null then 'TRATAMENTO' end,
    case when coalesce((select nacionalidade from d), '') = '' then 'NACIONALIDADE' end,
    case when (select estado_civil from d) is null then 'ESTADO_CIVIL' end,
    case when (select cpf from d) is null then 'CPF' end,
    case when coalesce((select rg from d), '') = '' or coalesce((select rg_orgao from d), '') = '' then 'RG' end,
    case when coalesce((select endereco_do_escritorio from d), true)
           then case when (select endereco from x) is null then 'ENDERECO' end
         else case when (select cidade from d) is null or (select uf from d) is null then 'ENDERECO' end end,
    case when not peticao_tem_oab(p_alvo, p_escritorio) then 'OAB' end], null))
$$;

create function portal_escritorio_advogados(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  return jsonb_build_object(
    'dono', v_dono,
    'eu', p_pessoa,
    'socios', (select coalesce(jsonb_agg(q.nome order by s.criado_em), '[]'::jsonb)
                 from vinculos s join pessoas q on q.id = s.pessoa_id
                where s.escritorio_id = p_escritorio and s.funcao = 'SOCIO' and s.revogado_em is null),
    'escritorio', escritorio_endereco_json(p_escritorio),
    'advogados', coalesce((
      select jsonb_agg(jsonb_build_object(
               'pessoaId', p.id, 'nome', p.nome, 'socioDono', e_socio_dono(p.id, p_escritorio),
               'inscricoes', oab_inscricoes(p.id, p_escritorio), 'frase', oab_frase(p.id, p_escritorio),
               'faltas', pessoa_dados_faltas(p.id, p_escritorio),
               'dados', case when v_dono or p.id = p_pessoa then pessoa_dados_json(p.id, p_escritorio) end)
             order by p.id <> p_pessoa, not e_socio_dono(p.id, p_escritorio), p.nome)
        from pessoas p
       where peticao_membro(p.id, p_escritorio) and peticao_tem_oab(p.id, p_escritorio)), '[]'::jsonb),
    'semOab', coalesce((
      select jsonb_agg(jsonb_build_object('pessoaId', p.id, 'nome', p.nome) order by p.nome)
        from pessoas p
       where peticao_membro(p.id, p_escritorio) and not peticao_tem_oab(p.id, p_escritorio)), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- Documentos e petições leem a sede em partes, o tipo e a sócia dona.

alter function documento_dados(uuid, uuid, contratos) rename to documento_dados_sem_sede;

create function documento_dados(p_pessoa uuid, p_escritorio uuid, c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select d || jsonb_build_object('escritorio', (d -> 'escritorio')
              || (select escritorio_documentos_json(x, true) from escritorios x where x.id = p_escritorio))
    from (select documento_dados_sem_sede(p_pessoa, p_escritorio, c) d) t
$$;

alter function peticao_dados(uuid, uuid, casos) rename to peticao_dados_sem_sede;

create function peticao_dados(p_pessoa uuid, p_escritorio uuid, c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select d || jsonb_build_object('escritorio', (d -> 'escritorio')
              || (select escritorio_documentos_json(x) - 'dona' from escritorios x where x.id = c.escritorio_id))
    from (select peticao_dados_sem_sede(p_pessoa, p_escritorio, c) d) t
$$;

-- ---------------------------------------------------------------------------------------
-- Endereço de cobrança "o mesmo da sede" (recomendação 2).

alter table assinaturas add column end_mesmo_da_sede boolean not null default true;
-- Quem já escreveu um endereço de cobrança continua com ele.
alter table assinaturas disable trigger user;
update assinaturas set end_mesmo_da_sede = false where end_cep is not null;
alter table assinaturas enable trigger user;

-- O endereço que vale para o pagador: o da assinatura ou, "o mesmo da sede", o da ficha
-- completa (sem ele, o boleto não sai, como antes sem endereço).
create or replace function assinatura_endereco_json(a assinaturas) returns jsonb
language sql
stable
set search_path = public
as $$
  select case
    -- O endereço escrito na assinatura vale primeiro (a tela antiga ainda grava sem a caixa).
    when a.end_cep is not null then jsonb_build_object('cep', a.end_cep, 'logradouro', a.end_logradouro, 'numero', a.end_numero,
                                                        'complemento', a.end_complemento, 'bairro', a.end_bairro, 'cidade', a.end_cidade, 'uf', a.end_uf)
    when a.end_mesmo_da_sede then (
      select case when x.end_cep is not null and x.end_logradouro is not null and x.end_numero is not null and x.end_bairro is not null
                       and x.cidade is not null and x.uf is not null and not x.end_confira
                  then jsonb_build_object('cep', x.end_cep, 'logradouro', x.end_logradouro, 'numero', x.end_numero,
                                          'complemento', x.end_complemento, 'bairro', left(x.end_bairro, 60),
                                          'cidade', left(x.cidade, 60), 'uf', x.uf) end
        from escritorios x where x.id = a.escritorio_id) end
$$;

alter function console_assinatura(uuid, uuid) rename to console_assinatura_sem_sede;

create function console_assinatura(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := console_assinatura_sem_sede(p_pessoa, p_escritorio);
  x escritorios;
begin
  if not coalesce((r ->> 'valores')::boolean, false) then return r; end if;
  select * into x from escritorios where id = p_escritorio;
  r := r || jsonb_build_object('sede', jsonb_build_object(
    'cep', x.end_cep, 'logradouro', x.end_logradouro, 'numero', x.end_numero, 'complemento', x.end_complemento,
    'bairro', x.end_bairro, 'cidade', x.cidade, 'uf', x.uf, 'confira', x.end_confira));
  if r -> 'assinatura' = 'null'::jsonb then return r; end if;
  return jsonb_set(r, '{assinatura,mesmoDaSede}',
    to_jsonb(coalesce((select a.end_mesmo_da_sede from assinaturas a where a.escritorio_id = p_escritorio), true)));
end $$;

alter function console_assinatura_salvar(uuid, uuid, integer, jsonb) rename to console_assinatura_salvar_sem_sede;

-- Com "mesmoDaSede": a assinatura não guarda endereço e o pagador usa a sede. Sem a chave (tela
-- antiga), tudo fica como era.
create function console_assinatura_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mesmo boolean := case when p_dados ? 'mesmoDaSede' then coalesce((p_dados ->> 'mesmoDaSede')::boolean, true) end;
  e jsonb;
  v jsonb;
  a assinaturas;
begin
  if v_mesmo is null then return console_assinatura_salvar_sem_sede(p_pessoa, p_escritorio, p_versao, p_dados); end if;
  if v_mesmo then
    v := console_assinatura_salvar_sem_sede(p_pessoa, p_escritorio, p_versao, p_dados - 'endereco');
  else
    v := console_assinatura_salvar_sem_sede(p_pessoa, p_escritorio, p_versao, p_dados);
    e := assinatura_endereco_dados(p_dados -> 'endereco');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then return v; end if;
  if v_mesmo is distinct from a.end_mesmo_da_sede
     or (not v_mesmo and (a.end_cep, a.end_logradouro, a.end_numero, a.end_complemento, a.end_bairro, a.end_cidade, a.end_uf)
          is distinct from (e -> 'endereco' ->> 'cep', e -> 'endereco' ->> 'logradouro', e -> 'endereco' ->> 'numero',
                            e -> 'endereco' ->> 'complemento', e -> 'endereco' ->> 'bairro', e -> 'endereco' ->> 'cidade', e -> 'endereco' ->> 'uf'))
     or (v_mesmo and a.end_cep is not null) then
    perform cobranca_marcar(true);
    update assinaturas
       set end_mesmo_da_sede = v_mesmo,
           end_cep = case when v_mesmo then null else e -> 'endereco' ->> 'cep' end,
           end_logradouro = case when v_mesmo then null else e -> 'endereco' ->> 'logradouro' end,
           end_numero = case when v_mesmo then null else e -> 'endereco' ->> 'numero' end,
           end_complemento = case when v_mesmo then null else e -> 'endereco' ->> 'complemento' end,
           end_bairro = case when v_mesmo then null else e -> 'endereco' ->> 'bairro' end,
           end_cidade = case when v_mesmo then null else e -> 'endereco' ->> 'cidade' end,
           end_uf = case when v_mesmo then null else e -> 'endereco' ->> 'uf' end
     where id = a.id;
    perform cobranca_evento(a.id, null, 'assinatura.alterada', jsonb_build_object('enderecoCobranca', true, 'mesmoDaSede', v_mesmo));
    perform cobranca_marcar(false);
  end if;
  return v || jsonb_build_object('versao', (select versao from assinaturas where id = a.id));
end $$;

-- ---------------------------------------------------------------------------------------
-- Fim da guarda (F0.15): a ficha limpa leva também as partes novas e o registro na OAB.

alter function terminar_guarda(uuid) rename to terminar_guarda_sem_sede;

create function terminar_guarda(p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare r jsonb := terminar_guarda_sem_sede(p_escritorio);
begin
  alter table escritorios disable trigger user;
  update escritorios
     set tipo = null, razao_social = null, end_cep = null, end_logradouro = null, end_numero = null, end_complemento = null,
         end_bairro = null, end_confira = false, telefone = null, email = null, site = null,
         oab_sociedade_uf = null, oab_sociedade_numero = null, endereco = null
   where id = p_escritorio;
  alter table escritorios enable trigger user;
  return r;
end $$;

call fechar_acesso();
