-- Endereço de cobrança do escritório na aba Assinatura (F1.21, CO-06). O boleto registrado do
-- Banco Inter exige o endereço do pagador. Desenho aprovado pela Carol em 22/11/2026
-- (docs/design/aprovadas/cobranca-pdfs, estados 26 a 30):
--
--  * A assinatura guarda o endereço em partes (CEP, rua, número, complemento, bairro, cidade e
--    UF). Ele é opcional: sem ele, a fatura sai só com o Pix. Começa com o endereço da ficha
--    (escritorios.endereco, cidade e UF); a equipe completa o CEP.
--  * Só Administração e Financeiro veem e mudam (o mesmo de e-mail de cobrança e CNPJ): o
--    console_assinatura só devolve o endereço a quem vê os valores.
--  * Erros de campo voltam juntos com os da assinatura: cepCobranca, logradouroCobranca,
--    numeroCobranca, bairroCobranca, cidadeCobranca e ufCobranca.
--  * A fila do meio de pagamento (0693) passa a mandar o endereço junto do pagador.
--  * O rótulo "CNPJ da nota" vira "CNPJ de cobrança" nas telas (pergunta 9); a coluna fica.

alter table assinaturas
  add column end_cep         text check (end_cep ~ '^[0-9]{8}$'),
  add column end_logradouro  text check (length(btrim(end_logradouro)) between 2 and 120),
  add column end_numero      text check (length(btrim(end_numero)) between 1 and 20),
  add column end_complemento text check (length(btrim(end_complemento)) between 1 and 60),
  add column end_bairro      text check (length(btrim(end_bairro)) between 2 and 60),
  add column end_cidade      text check (length(btrim(end_cidade)) between 2 and 60),
  add column end_uf          text check (end_uf is null or uf_brasil(end_uf)),
  add check ((end_cep is null) = (end_logradouro is null) and (end_cep is null) = (end_numero is null)
             and (end_cep is null) = (end_bairro is null) and (end_cep is null) = (end_cidade is null)
             and (end_cep is null) = (end_uf is null) and (end_cep is not null or end_complemento is null));

update inventario_dados
   set o_que = 'A assinatura do escritório: plano, preço, pessoas incluídas, dia, forma de pagamento, e-mail, CNPJ e endereço de cobrança, desconto e o só consulta por atraso'
 where tabela = 'assinaturas';

create function assinatura_endereco_json(a assinaturas) returns jsonb
language sql
stable
set search_path = public
as $$
  select case when a.end_cep is null then null else jsonb_build_object(
    'cep', a.end_cep, 'logradouro', a.end_logradouro, 'numero', a.end_numero, 'complemento', a.end_complemento,
    'bairro', a.end_bairro, 'cidade', a.end_cidade, 'uf', a.end_uf) end
$$;

-- Confere o endereço que a tela mandou. Tudo vazio vale (sem endereço); começou a preencher,
-- os campos obrigatórios precisam estar certos. Devolve {campos, endereco}.
create function assinatura_endereco_dados(p_end jsonb) returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_campos text[] := '{}';
  t text;
  v jsonb := '{}'::jsonb;
  v_cep text;
begin
  if p_end is null or jsonb_typeof(p_end) <> 'object' then return jsonb_build_object('campos', '[]'::jsonb, 'endereco', null); end if;
  foreach t in array array['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] loop
    v := v || jsonb_build_object(t, nullif(btrim(coalesce(p_end ->> t, '')), ''));
  end loop;
  if (select bool_and(value = 'null'::jsonb) from jsonb_each(v)) then
    return jsonb_build_object('campos', '[]'::jsonb, 'endereco', null);
  end if;
  v_cep := regexp_replace(coalesce(v ->> 'cep', ''), '[^0-9]', '', 'g');
  if v_cep !~ '^[0-9]{8}$' or coalesce(v ->> 'cep', '') !~ '^[0-9]{5}-?[0-9]{3}$' then v_campos := v_campos || 'cepCobranca'::text; end if;
  if length(coalesce(v ->> 'logradouro', '')) not between 2 and 120 then v_campos := v_campos || 'logradouroCobranca'::text; end if;
  if length(coalesce(v ->> 'numero', '')) not between 1 and 20 then v_campos := v_campos || 'numeroCobranca'::text; end if;
  if length(coalesce(v ->> 'complemento', 'ok')) > 60 then v_campos := v_campos || 'complementoCobranca'::text; end if;
  if length(coalesce(v ->> 'bairro', '')) not between 2 and 60 then v_campos := v_campos || 'bairroCobranca'::text; end if;
  if length(coalesce(v ->> 'cidade', '')) not between 2 and 60 then v_campos := v_campos || 'cidadeCobranca'::text; end if;
  if not uf_brasil(coalesce(upper(v ->> 'uf'), '')) then v_campos := v_campos || 'ufCobranca'::text; end if;
  return jsonb_build_object('campos', to_jsonb(v_campos),
    'endereco', v || jsonb_build_object('cep', v_cep, 'uf', upper(v ->> 'uf')));
end $$;

-- Salvar a assinatura com o endereço: a função aprovada (0690) continua fazendo tudo o que fazia;
-- esta confere o endereço, junta os erros de campo dos dois e grava o endereço na mesma transação.
alter function console_assinatura_salvar(uuid, uuid, integer, jsonb) rename to console_assinatura_salvar_sem_endereco;

create function console_assinatura_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb := assinatura_endereco_dados(p_dados -> 'endereco');
  v jsonb;
  v_detalhe jsonb;
  v_antes jsonb;
  a assinaturas;
begin
  begin
    v := console_assinatura_salvar_sem_endereco(p_pessoa, p_escritorio, p_versao, p_dados);
  exception when sqlstate 'TC422' then
    get stacked diagnostics v_detalhe = pg_exception_detail;
    begin v_detalhe := v_detalhe::jsonb; exception when others then v_detalhe := null; end;
    if v_detalhe ? 'campos' and jsonb_array_length(e -> 'campos') > 0 and not v_detalhe ? 'motivo' then
      raise exception 'Confira a assinatura' using errcode = 'TC422',
        detail = jsonb_build_object('campos', (v_detalhe -> 'campos') || (e -> 'campos'))::text;
    end if;
    raise;
  end;
  if jsonb_array_length(e -> 'campos') > 0 then
    raise exception 'Confira o endereço de cobrança' using errcode = 'TC422', detail = jsonb_build_object('campos', e -> 'campos')::text;
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  v_antes := assinatura_endereco_json(a);
  -- Tela antiga, sem o campo: o endereço fica como está.
  if p_dados ? 'endereco' and coalesce(v_antes, 'null'::jsonb) is distinct from coalesce(e -> 'endereco', 'null'::jsonb) then
    perform cobranca_marcar(true);
    update assinaturas
       set end_cep = e -> 'endereco' ->> 'cep', end_logradouro = e -> 'endereco' ->> 'logradouro', end_numero = e -> 'endereco' ->> 'numero',
           end_complemento = e -> 'endereco' ->> 'complemento', end_bairro = e -> 'endereco' ->> 'bairro',
           end_cidade = e -> 'endereco' ->> 'cidade', end_uf = e -> 'endereco' ->> 'uf'
     where id = a.id;
    -- O endereço é dado da empresa, mas fica fora do histórico como o e-mail: só a marca de que mudou.
    perform cobranca_evento(a.id, null, 'assinatura.alterada', jsonb_build_object('enderecoCobranca', true));
    perform cobranca_marcar(false);
  end if;
  return v || jsonb_build_object('versao', (select versao from assinaturas where id = a.id));
end $$;

-- A aba Assinatura: a função aprovada (0690) e, para quem vê os valores, o endereço e a
-- sugestão vinda da ficha.
alter function console_assinatura(uuid, uuid) rename to console_assinatura_sem_endereco;

create function console_assinatura(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := console_assinatura_sem_endereco(p_pessoa, p_escritorio);
  a assinaturas;
  x escritorios;
begin
  if not coalesce((r ->> 'valores')::boolean, false) then return r; end if;
  select * into x from escritorios where id = p_escritorio;
  r := r || jsonb_build_object('enderecoSugerido', jsonb_strip_nulls(jsonb_build_object(
    'logradouro', x.endereco, 'cidade', x.cidade, 'uf', x.uf)),
    'fichaTemEndereco', x.endereco is not null);
  if r -> 'assinatura' = 'null'::jsonb then return r; end if;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  return jsonb_set(r, '{assinatura,enderecoCobranca}', coalesce(assinatura_endereco_json(a), 'null'::jsonb));
end $$;

-- A fila do meio de pagamento manda o endereço junto do pagador (o Inter pede para o boleto).
create or replace function rotina_cobranca_codigos_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meio text := meio_pagamento_ligado();
  v_lim integer := greatest(least(p_limite, 50), 1);
  r record;
  v_lista jsonb;
  v_saida jsonb := '[]'::jsonb;
begin
  if v_meio is null then return '[]'::jsonb; end if;
  perform limpar_contexto();
  perform set_config('t3jus.rotina_pagamento', 'on', true);
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_lista from (
    (select 'EMITIR_FATURA' as acao, f.id, f.escritorio_id as e, f.vencimento as ordem from faturas f
      where f.situacao = 'A_VENCER' and f.carne_parcela_id is null
        and (f.pagamento_id is null or (f.pagamento_provedor = v_meio and f.pix_copia_cola is null and f.linha_boleto is null))
      order by f.vencimento limit v_lim)
    union all
    (select 'EMITIR_PARCELA', p.id, p.escritorio_id, p.vencimento from assinatura_carne_parcelas p
       join assinatura_carnes c on c.id = p.carne_id
      where p.situacao = 'A_VENCER' and c.substituido_em is null
        and (p.pagamento_id is null or (p.pagamento_provedor = v_meio and p.pix_copia_cola is null and p.linha_boleto is null))
      order by p.vencimento limit v_lim)
    union all
    (select 'CANCELAR_FATURA', f.id, f.escritorio_id, f.vencimento from faturas f
      where f.situacao = 'CANCELADA' and f.pagamento_id is not null and f.pagamento_cancelado_em is null
        and f.pagamento_provedor = v_meio limit v_lim)
    union all
    (select 'CANCELAR_PARCELA', p.id, p.escritorio_id, p.vencimento from assinatura_carne_parcelas p
      where p.situacao = 'CANCELADA' and p.pagamento_id is not null and p.pagamento_cancelado_em is null
        and p.pagamento_provedor = v_meio limit v_lim)
    order by ordem limit v_lim) x;
  perform set_config('t3jus.rotina_pagamento', '', true);

  for r in select * from jsonb_to_recordset(v_lista) as y(acao text, id uuid, e uuid) loop
    perform entrar_escritorio_servico(r.e);
    v_saida := v_saida || (
      select jsonb_build_object(
        'acao', r.acao, 'id', r.id, 'provedor', v_meio,
        'pagamentoId', coalesce(f.pagamento_id, p.pagamento_id),
        'valorCentavos', coalesce(f.total_centavos, p.valor_centavos),
        'vencimento', coalesce(f.vencimento, p.vencimento),
        'descricao', case when f.id is not null then 'T3jus · fatura de ' || mes_por_extenso(f.competencia)
                          else 'T3jus · parcela ' || p.numero || ' de ' || c.parcelas || ' do carnê ' || c.numero
                               || ' · ' || mes_por_extenso(p.competencia) end,
        'pagador', jsonb_build_object('nome', es.nome, 'cnpj', a.cnpj_nota, 'email', a.email_cobranca,
                                      'endereco', assinatura_endereco_json(a)))
        from (select 1) um
        left join faturas f on r.acao like '%FATURA' and f.id = r.id
        left join assinatura_carne_parcelas p on r.acao like '%PARCELA' and p.id = r.id
        left join assinatura_carnes c on c.id = p.carne_id
        join assinaturas a on a.id = coalesce(f.assinatura_id, c.assinatura_id)
        join escritorios es on es.id = a.escritorio_id);
  end loop;
  perform limpar_contexto();
  return v_saida;
end $$;

call fechar_acesso();
