-- 0533 · Recibo em PDF de cada recebimento (FI-14, F3.19).
-- Desenho aprovado pela Carol em 21/11/2026: docs/design/aprovadas/portal-recibo-recorrente
-- (estados rb-, decisões 1.1 a 1.10 e as perguntas 1 e 2).
-- - O recibo é do escritório: timbrado com o nome, o CNPJ, o endereço e os contatos; assina o
--   escritório (sem imagem de assinatura); o CPF ou CNPJ do cliente vai completo.
-- - O papel mostra o que valia no registro: a cópia se guarda junto do número e não se reescreve.
--   Recibo antigo, sem cópia, é montado com os dados de hoje.
-- - "Quem pagou": o cliente (padrão), o contato principal ou outra pessoa ou empresa. Quando não
--   é o cliente, o recibo diz que o dinheiro veio dela, em favor do cliente.
-- - O PDF sai da impressão do navegador, na página /recibos/:id do Portal.
-- A função de registrar continua a de 0220: a rota chama o invólucro daqui, na mesma transação.

create table recibo_copias (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  recibo_id      uuid not null unique references recibos (id) on delete restrict,
  pagador_tipo   text not null default 'CLIENTE' check (pagador_tipo in ('CLIENTE', 'CONTATO', 'OUTRO')),
  pagador_nome   text check (length(btrim(pagador_nome)) between 2 and 160),
  pagador_doc    text check (pagador_doc is null or cpf_valido(pagador_doc) or cnpj_valido(pagador_doc)),
  pagador_papel  text check (length(btrim(pagador_papel)) between 1 and 60),
  dados          jsonb not null check (jsonb_typeof(dados) = 'object'),
  criado_em      timestamptz not null default app_now(),
  check ((pagador_tipo = 'CLIENTE') = (pagador_nome is null))
);
call proteger_tabela_escritorio('recibo_copias');
create trigger recibo_copias_so_acrescenta before update or delete on recibo_copias
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('recibo_copias', true,
  'O que foi no papel de cada recibo: escritório, cliente, quem pagou (nome e CPF ou CNPJ), contrato, parcela, valor, forma e quem registrou',
  'Mostrar e imprimir o recibo como ele foi emitido (FI-14)',
  'Execução de contrato e cumprimento de obrigação legal (LGPD, art. 7º, II e V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- O que vai no papel de um recibo, com os dados de agora.
create function recibo_montar(p_escritorio uuid, p_recibo uuid, p_pagador jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'numero', jsonb_build_object('ano', b.ano, 'numero', b.numero),
    'escritorio', jsonb_build_object('nome', x.nome, 'cnpj', x.cnpj, 'endereco', x.endereco, 'cidade', x.cidade, 'uf', x.uf,
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

-- Confere "Quem pagou": {tipo, nome, documento, papel}. Devolve o pagador limpo.
create function recibo_pagador(p_escritorio uuid, p_parcela uuid, p jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_tipo text := coalesce(nullif(p ->> 'tipo', ''), 'CLIENTE');
  v_nome text := nullif(btrim(coalesce(p ->> 'nome', '')), '');
  v_doc text := nullif(regexp_replace(coalesce(p ->> 'documento', ''), '\D', '', 'g'), '');
  v_papel text := nullif(btrim(coalesce(p ->> 'papel', '')), '');
  v_contato jsonb;
  e jsonb := '{}';
begin
  if p is null or jsonb_typeof(p) = 'null' or v_tipo = 'CLIENTE' then return jsonb_build_object('tipo', 'CLIENTE'); end if;
  if v_tipo not in ('CONTATO', 'OUTRO') then perform recusar_campos('Quem pagou não é válido', 'pagador.tipo'); end if;
  if v_tipo = 'CONTATO' then
    select c into v_contato from recebimentos_previstos r join contratos k on k.id = r.contrato_id
      join clientes_escritorio l on l.id = k.cliente_id, jsonb_array_elements(l.contatos) c
     where r.id = p_parcela and r.escritorio_id = p_escritorio and (c ->> 'principal')::boolean limit 1;
    v_nome := coalesce(v_nome, v_contato ->> 'nome');
    v_papel := coalesce(v_papel, nullif(v_contato ->> 'papel', ''));
  end if;
  if v_nome is null or length(v_nome) not between 2 and 160 then e := e || jsonb_build_object('pagador.nome', 'PAGADOR_NOME_OBRIGATORIO'); end if;
  if v_tipo = 'OUTRO' and v_doc is null then e := e || jsonb_build_object('pagador.documento', 'PAGADOR_DOC_INVALIDO');
  elsif v_doc is not null and not (cpf_valido(v_doc) or cnpj_valido(v_doc)) then e := e || jsonb_build_object('pagador.documento', 'PAGADOR_DOC_INVALIDO');
  end if;
  if e <> '{}' then
    raise exception 'Confira quem pagou' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k order by k) from jsonb_object_keys(e) k), 'motivos', e)::text;
  end if;
  return jsonb_build_object('tipo', v_tipo, 'nome', v_nome, 'documento', v_doc, 'papel', left(v_papel, 60));
end $$;

-- Registrar recebimento com "Quem pagou" e a cópia do recibo
-- (POST /v1/escritorio/financeiro/parcelas/:id/recebimentos).
create function portal_financeiro_receber_registrar_recibo(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_pag jsonb;
  v_recibo uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  v_pag := recibo_pagador(p_escritorio, p_parcela, p_dados -> 'pagador');
  r := portal_financeiro_receber_registrar(p_pessoa, p_escritorio, p_parcela, p_dados - 'pagador');
  select b.id into v_recibo from recibos b where b.pagamento_id = (r ->> 'id')::uuid;
  if v_recibo is not null then
    insert into recibo_copias (escritorio_id, recibo_id, pagador_tipo, pagador_nome, pagador_doc, pagador_papel, dados)
    values (p_escritorio, v_recibo, v_pag ->> 'tipo', v_pag ->> 'nome', v_pag ->> 'documento', v_pag ->> 'papel',
            recibo_montar(p_escritorio, v_recibo, v_pag));
  end if;
  return r;
end $$;

-- O recibo de um recebimento, para a página de imprimir (GET /v1/escritorio/recibos/:pagamento).
-- Abre quem tem a área Financeiro ou a área Contratos (todo recibo é de um contrato).
create function portal_recibo(p_pessoa uuid, p_escritorio uuid, p_pagamento uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recibo uuid;
  v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['FINANCEIRO', 'CONTRATOS']) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  select b.id into v_recibo from recibos b where b.pagamento_id = p_pagamento and b.escritorio_id = p_escritorio;
  if v_recibo is null then raise exception 'Recibo não encontrado' using errcode = 'TC404'; end if;
  select dados into v from recibo_copias where recibo_id = v_recibo;
  return coalesce(v, recibo_montar(p_escritorio, v_recibo, null));
end $$;

call fechar_acesso();
