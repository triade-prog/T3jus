-- Baixa de parcela vencida sem receber, com motivo (F3.139; FI-24, FI-25, FI-08, EX-16; também
-- FI-02, FI-04, IN-04, IN-07, PT-02, PT-03). Desenho e plano (v2) aprovados pela Carol em
-- 24/11/2026, às 15h14 (Bahia), em docs/design/aprovadas/portal-baixa-parcela-motivo, com as
-- recomendações das seis perguntas:
--   1. quem tem a área Financeiro e financeiro.editar dá a baixa (e desfaz);
--   2. em Contratos, quem não tem Financeiro vê só "Fora da cobrança, por decisão do Financeiro.":
--      o servidor não manda o motivo, quem fez nem a explicação;
--   3. a renegociada não conta no Contratado (a) e avisa no sino quem tem Contratos, com o
--      combinado (b, tipo BAIXA_RENEGOCIADA), quando quem deu a baixa não tem Contratos;
--   4. a baixa pode levar junto o reembolso das custas que ficariam sem parcela (FI-25);
--   5. para a IA, a parcela baixada é "assunto da equipe", sem valor nem motivo;
--   6. depois de desfazer, a próxima ação fica com quem cuida do contrato, se essa pessoa tem o
--      Financeiro; senão, com quem desfez.
--
-- No T3jus "baixa" sozinha quer dizer recebido (FI-02): todo texto diz "sem receber".
--
-- A baixa é um cancelamento marcado (como a parcela "paga antes do T3jus", 0420): os mais de 30
-- lugares que já filtram cancelado_em is null tiram a parcela de Em atraso, de A receber, da
-- régua, do carnê novo, da Início e das pendências do acerto. O que não vem de graça muda aqui,
-- de forma explícita (seções 4 a 16), cada um com teste no pgTAP 142.
--
-- parcela_baixas é só de inserção. Cada baixa tem uma linha BAIXA da parcela (a que
-- recebimentos_previstos.baixa_id aponta) e, com a caixa das custas marcada, uma linha BAIXA por
-- conta de reembolso (reembolso_conta_id, junto_de = a linha da parcela). Desfazer grava uma
-- linha DESFEITA para cada uma (desfaz_id); nada se apaga.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (o molde da 0990), para mudar só o que
-- precisa em funções que outras frentes também mudam.
create function t1010_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. A tabela.
create table parcela_baixas (
  id                 uuid primary key default gen_random_uuid(),
  ordem              bigint generated always as identity,
  escritorio_id      uuid not null references escritorios (id) on delete restrict,
  parcela_id         uuid not null references recebimentos_previstos (id) on delete restrict,
  tipo               text not null check (tipo in ('BAIXA', 'DESFEITA')),
  motivo             text check (motivo in ('PERDOADA', 'INADIMPLENCIA', 'RENEGOCIADA')),
  explicacao         text not null check (length(btrim(explicacao)) between 3 and 1000),
  -- O que faltava na parcela (ou o valor do reembolso), em centavos.
  valor              bigint not null check (valor between 1 and 10000000000),
  recebido_antes     bigint not null default 0 check (recebido_antes >= 0),
  reembolso_conta_id uuid references contas_pagar (id) on delete restrict,
  junto_de           uuid references parcela_baixas (id) on delete restrict,
  desfaz_id          uuid references parcela_baixas (id) on delete restrict,
  feito_por          uuid not null references pessoas (id) on delete restrict,
  feito_em           timestamptz not null default app_now(),
  check ((tipo = 'BAIXA') = (motivo is not null)),
  check ((tipo = 'DESFEITA') = (desfaz_id is not null)),
  check (tipo = 'BAIXA' or (reembolso_conta_id is null and junto_de is null)),
  check ((reembolso_conta_id is null) = (junto_de is null))
);
create unique index parcela_baixas_desfaz on parcela_baixas (desfaz_id) where desfaz_id is not null;
create index parcela_baixas_parcela on parcela_baixas (escritorio_id, parcela_id, ordem desc);
create index parcela_baixas_conta on parcela_baixas (reembolso_conta_id) where reembolso_conta_id is not null;
call proteger_tabela_escritorio('parcela_baixas');
create trigger parcela_baixas_so_acrescenta before update or delete on parcela_baixas
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('parcela_baixas', true,
  'Baixas sem receber de parcelas vencidas (e do reembolso das custas junto) e os desfazer: motivo, explicação, valor, quem e quando',
  'Tirar de Em atraso, com motivo, a parcela que o escritório não vai receber, e poder voltar atrás (FI-24, FI-25)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- A baixa em vigor da parcela. Só existe com a parcela cancelada.
alter table recebimentos_previstos add column baixa_id uuid references parcela_baixas (id) on delete restrict;
alter table recebimentos_previstos add constraint recebimentos_previstos_baixa_cancelada check (baixa_id is null or cancelado_em is not null);

-- ---------------------------------------------------------------------------------------
-- 2. Peças.

-- A linha de baixa ainda em vigor (não desfeita).
create function parcela_baixa_em_vigor(b parcela_baixas) returns boolean
language sql stable
set search_path = public
as $$ select b.tipo = 'BAIXA' and not exists (select 1 from parcela_baixas d where d.desfaz_id = b.id) $$;

-- O reembolso da conta teve baixa sem receber, em vigor (pergunta 4).
create function conta_reembolso_baixado(p_conta uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from parcela_baixas b where b.reembolso_conta_id = p_conta and b.tipo = 'BAIXA'
                   and not exists (select 1 from parcela_baixas d where d.desfaz_id = b.id))
$$;

-- O mesmo, no fim de um dia (para os relatórios não reescreverem o passado).
create function conta_reembolso_baixado_no_dia(p_conta uuid, p_dia date) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from parcela_baixas b where b.reembolso_conta_id = p_conta and b.tipo = 'BAIXA'
                   and (b.feito_em at time zone 'America/Sao_Paulo')::date <= p_dia
                   and not exists (select 1 from parcela_baixas d where d.desfaz_id = b.id
                                     and (d.feito_em at time zone 'America/Sao_Paulo')::date <= p_dia))
$$;

-- A parcela estava baixada no fim do dia (IN-04, IN-07: desfazer depois não muda um mês passado).
create function parcela_baixada_no_dia(p_parcela uuid, p_dia date) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from parcela_baixas b where b.parcela_id = p_parcela and b.tipo = 'BAIXA' and b.reembolso_conta_id is null
                   and (b.feito_em at time zone 'America/Sao_Paulo')::date <= p_dia
                   and not exists (select 1 from parcela_baixas d where d.desfaz_id = b.id
                                     and (d.feito_em at time zone 'America/Sao_Paulo')::date <= p_dia))
$$;

-- A situação: BAIXADA antes de CANCELADA.
create or replace function parcela_situacao(r recebimentos_previstos, p_recebido bigint) returns text
language sql stable
set search_path = public
as $$
  select case when r.baixa_id is not null then 'BAIXADA'
              when r.cancelado_em is not null then 'CANCELADA'
              when p_recebido >= r.valor then 'PAGA'
              when r.vencimento < hoje_brasilia() then 'VENCIDA'
              when p_recebido > 0 then 'PARCIAL'
              else 'A_VENCER' end
$$;

-- Uma linha de baixa como as telas do Financeiro mostram (com a explicação: só para quem tem o
-- Financeiro, PT-02).
create function parcela_baixa_json(b parcela_baixas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', b.id, 'motivo', b.motivo, 'explicacao', b.explicacao, 'valor', b.valor,
           'recebidoAntes', b.recebido_antes, 'por', pessoa_ref(b.feito_por), 'em', b.feito_em,
           'reembolsos', coalesce((select jsonb_agg(jsonb_build_object('contaId', cp.id, 'descricao', cp.descricao, 'valor', x.valor,
                                                                       'categoria', cp.categoria) order by x.ordem)
                                     from parcela_baixas x join contas_pagar cp on cp.id = x.reembolso_conta_id
                                    where x.junto_de = b.id), '[]'::jsonb),
           'desfeita', (select jsonb_build_object('por', pessoa_ref(d.feito_por), 'em', d.feito_em, 'explicacao', d.explicacao)
                          from parcela_baixas d where d.desfaz_id = b.id))
$$;

-- A próxima parcela do cliente em que o reembolso voltaria, sem uma parcela (a que vai ter
-- baixa) e com outra (a que volta no desfazer). Mesma regra de reembolso_proxima_parcela (0640),
-- que pula a parcela já paga.
create function reembolso_parcela_simulada(p_escritorio uuid, p_cliente uuid, p_caso uuid, p_desde date, p_sem uuid, p_com uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', r.id, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                            'contrato', jsonb_build_object('id', ct.id, 'numero', ct.numero))
    from recebimentos_previstos r
    join contratos ct on ct.id = r.contrato_id and ct.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and ct.cliente_id = p_cliente
     and (r.cancelado_em is null or r.id = p_com) and r.id is distinct from p_sem and r.valor is not null and r.vencimento >= p_desde
     and parcela_recebido(r.id) < r.valor
   order by (ct.id = (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.cliente_id = p_cliente)) desc nulls last,
            r.vencimento, r.descricao
   limit 1
$$;

-- O reembolso baixado não volta com parcela nenhuma.
create or replace function conta_parcela_reembolso(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select case when c.reembolso_como = 'PROXIMA_PARCELA' and c.reembolsado_em is null and not conta_reembolso_baixado(c.id) then
    reembolso_proxima_parcela(c.escritorio_id, c.cliente_id, c.caso_id, (c.criado_em at time zone 'America/Sao_Paulo')::date) end
$$;

-- As contas de reembolso que hoje voltam com a parcela, e para onde iriam sem ela.
create function parcela_custas_destino(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('contaId', cp.id, 'descricao', cp.descricao, 'categoria', cp.categoria,
                                               'valor', coalesce(cp.valor_pago, cp.valor),
                                               'depois', reembolso_parcela_simulada(cp.escritorio_id, cp.cliente_id, cp.caso_id,
                                                           (cp.criado_em at time zone 'America/Sao_Paulo')::date, r.id, null))
                            order by cp.criado_em, cp.id), '[]'::jsonb)
    from contas_pagar cp join contratos c on c.id = r.contrato_id
   where cp.escritorio_id = r.escritorio_id and cp.cliente_id = c.cliente_id and cp.reembolso_como = 'PROXIMA_PARCELA'
     and cp.reembolsado_em is null and cp.cancelada_em is null and not conta_reembolso_baixado(cp.id)
     and (conta_parcela_reembolso(cp) ->> 'id')::uuid = r.id
$$;

-- As contas de reembolso que voltariam a ir com a parcela, se a baixa fosse desfeita (sem as
-- que tiveram baixa junto, que também se desfazem).
create function parcela_custas_voltam(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('contaId', cp.id, 'descricao', cp.descricao, 'categoria', cp.categoria,
                                               'valor', coalesce(cp.valor_pago, cp.valor))
                            order by cp.criado_em, cp.id), '[]'::jsonb)
    from contas_pagar cp join contratos c on c.id = r.contrato_id
   where cp.escritorio_id = r.escritorio_id and cp.cliente_id = c.cliente_id and cp.reembolso_como = 'PROXIMA_PARCELA'
     and cp.reembolsado_em is null and cp.cancelada_em is null and not conta_reembolso_baixado(cp.id)
     and (reembolso_parcela_simulada(cp.escritorio_id, cp.cliente_id, cp.caso_id,
            (cp.criado_em at time zone 'America/Sao_Paulo')::date, null, r.id) ->> 'id')::uuid = r.id
$$;

-- Quem tem a área e a ação de editar (para o aviso e para os textos da janela).
create function pessoas_com_area(p_escritorio uuid, p_area text, p_acao text) returns setof uuid
language sql stable
set search_path = public
as $$
  select distinct v.pessoa_id from vinculos v
   where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null
     and p_area = any (areas_da_pessoa(v.pessoa_id, p_escritorio)) and pode(v.pessoa_id, p_escritorio, p_acao)
$$;

-- A parcela na lista e na ficha ganha a baixa em vigor e o último desfazer.
alter function parcela_linha(recebimentos_previstos) rename to parcela_linha_sem_baixa;
create function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select parcela_linha_sem_baixa(r) || jsonb_build_object(
    'baixa', (select parcela_baixa_json(b) from parcela_baixas b where b.id = r.baixa_id),
    'baixaDesfeita', case when r.baixa_id is null then (
      -- Revisão, nota 8: a baixa que se desfez vai junto, para a linha "deu baixa" do histórico de cobrança.
      select jsonb_build_object('por', pessoa_ref(d.feito_por), 'em', d.feito_em, 'explicacao', d.explicacao,
               'baixa', (select jsonb_build_object('motivo', x.motivo, 'por', pessoa_ref(x.feito_por), 'em', x.feito_em)
                           from parcela_baixas x where x.id = d.desfaz_id))
        from parcela_baixas d where d.parcela_id = r.id and d.tipo = 'DESFEITA'
         and exists (select 1 from parcela_baixas b where b.id = d.desfaz_id and b.reembolso_conta_id is null)
       order by d.ordem desc limit 1) end)
$$;

-- Entrar para dar ou desfazer a baixa: área Financeiro, financeiro.editar e Portal que grava.
create function parcela_baixa_entrar(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
end $$;

-- Os casos encerrados que esperam por esta parcela (as pendências do acerto) ou que ficaram
-- prontos para encerrar (sem pendência, ainda sem fechamento).
create function parcela_casos_do_acerto(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', ca.id, 'nome', ca.nome,
                    'pronto', caso_pronto_escopo(r.escritorio_id, ca.id) and jsonb_array_length(a.ac -> 'pendencias') = 0,
                    'espera', exists (select 1 from jsonb_array_elements(a.ac -> 'pendencias') j where j ->> 'parcelaId' = r.id::text),
                    'fechado', (select jsonb_build_object('em', f.fechado_em, 'por', pessoa_ref(f.fechado_por)) from fechamentos_caso f where f.caso_id = ca.id))
                  order by ca.nome), '[]'::jsonb)
    from casos ca
    cross join lateral (select caso_acerto(r.escritorio_id, ca.id) ac) a
   where ca.id in (select * from caso_pronto_casos_do_contrato(r.contrato_id))
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A API.

-- A prévia da janela (dar baixa e desfazer): o que vai acontecer, calculado no servidor agora.
create function portal_financeiro_parcela_baixa_previa(p_pessoa uuid, p_escritorio uuid, p_parcela uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  c contratos;
  v_rec bigint;
  v_resp uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio;
  select * into c from contratos where id = r.contrato_id;
  if r.id is null or r.valor is null or c.estado is null or c.estado not in ('ATIVO', 'ENCERRADO') then
    raise exception 'Parcela não encontrada' using errcode = 'TC404';
  end if;
  v_rec := parcela_recebido(r.id);
  -- Pergunta 6: quem cuida do contrato, se tem o Financeiro; senão, quem desfaz.
  v_resp := case when c.responsavel_id in (select * from pessoas_com_area(p_escritorio, 'FINANCEIRO', 'financeiro.editar'))
                 then c.responsavel_id else p_pessoa end;
  return jsonb_build_object(
    'parcela', parcela_linha(r),
    'recebido', v_rec,
    'falta', greatest(r.valor - v_rec, 0),
    'diasAtraso', greatest(hoje_brasilia() - r.vencimento, 0),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'situacao', c.estado),
    'recibos', coalesce((select jsonb_agg(jsonb_build_object('ano', b.ano, 'numero', b.numero) order by p.recebido_em)
                           from pagamentos_recebidos p join recibos b on b.pagamento_id = p.id where p.parcela_id = r.id), '[]'::jsonb),
    'custas', case when r.baixa_id is null then parcela_custas_destino(r) else '[]'::jsonb end,
    'custasVoltam', case when r.baixa_id is not null then parcela_custas_voltam(r) else '[]'::jsonb end,
    'casos', parcela_casos_do_acerto(r),
    'podeRenegociar', c.estado = 'ATIVO',
    'temContratos', p_pessoa in (select * from pessoas_com_area(p_escritorio, 'CONTRATOS', 'contratos.editar')),
    'quemContratos', coalesce((select jsonb_agg(pessoa_ref(x) order by (select nome from pessoas where id = x))
                                 from pessoas_com_area(p_escritorio, 'CONTRATOS', 'contratos.editar') x), '[]'::jsonb),
    'proximaAcaoCom', pessoa_ref(v_resp),
    -- 10a das notas: o combinado já virou parcelas novas depois da baixa?
    'condicoesMudaramEm', (select min(n.criado_em) from recebimentos_previstos n, parcela_baixas b
                            where b.id = r.baixa_id and n.contrato_id = c.id and n.criado_em > b.feito_em));
end $$;

-- Dar baixa sem receber (POST /v1/escritorio/financeiro/parcelas/:id/baixa).
-- p_dados: { motivo, explicacao, falta (o que a tela mostrou), reembolso (a caixa das custas) }.
create function portal_financeiro_parcela_baixar(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  c contratos;
  k clientes_escritorio;
  b parcela_baixas;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_expl text := btrim(coalesce(p_dados ->> 'explicacao', ''));
  v_falta_tela bigint := json_inteiro(p_dados, 'falta');
  v_reemb boolean := coalesce(p_dados -> 'reembolso' = 'true'::jsonb, false);
  v_rec bigint;
  v_falta bigint;
  v_custas jsonb;
  v_conta jsonb;
  v_n_reemb integer := 0;
  v_ult record;
  v_quem uuid;
  e text[] := '{}';
begin
  perform parcela_baixa_entrar(p_pessoa, p_escritorio);
  -- Sugestão 16 da revisão: a trava no contrato segura o encerramento até a baixa terminar. O
  -- contrato trava antes da parcela, na mesma ordem do encerramento, para não haver impasse.
  select * into c from contratos where id = (select x.contrato_id from recebimentos_previstos x
                                              where x.id = p_parcela and x.escritorio_id = p_escritorio) for share;
  select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio for update;
  if r.id is null or r.valor is null or c.estado is null or c.estado not in ('ATIVO', 'ENCERRADO') then
    raise exception 'Parcela não encontrada' using errcode = 'TC404';
  end if;
  -- Já baixada: a repetição da mesma pessoa, com o mesmo saldo e o mesmo motivo, é sucesso.
  if r.baixa_id is not null then
    select * into b from parcela_baixas where id = r.baixa_id;
    if b.feito_por = p_pessoa and b.motivo is not distinct from v_motivo and b.valor is not distinct from v_falta_tela then
      return parcela_linha(r) || jsonb_build_object('repetida', true, 'casos', parcela_casos_do_acerto(r));
    end if;
    raise exception 'Outra pessoa já deu baixa sem receber nesta parcela' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'PARCELA_JA_BAIXADA', 'por', pessoa_ref(b.feito_por), 'em', b.feito_em)::text;
  end if;
  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;
  v_rec := parcela_recebido(r.id);
  if v_rec >= r.valor then perform recusar_motivo('Esta parcela já está paga', 'PARCELA_JA_PAGA'); end if;
  if r.vencimento >= hoje_brasilia() then perform recusar_motivo('Esta parcela ainda não venceu', 'PARCELA_NAO_VENCIDA'); end if;
  v_falta := r.valor - v_rec;
  if v_falta_tela is not null and v_falta_tela <> v_falta then
    select p.autor_id, p.criado_em, p.valor into v_ult from pagamentos_recebidos p where p.parcela_id = r.id order by p.criado_em desc, p.id desc limit 1;
    raise exception 'Outra pessoa registrou um recebimento nesta parcela' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'PARCELA_MUDOU', 'por', pessoa_ref(v_ult.autor_id), 'em', v_ult.criado_em,
                                  'valor', v_ult.valor, 'faltaAntes', v_falta_tela, 'falta', v_falta)::text;
  end if;
  if v_motivo = 'RENEGOCIADA' and c.estado <> 'ATIVO' then
    raise exception 'O contrato foi encerrado: a renegociação não vale mais' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'RENEGOCIADA_CONTRATO_ENCERRADO')::text;
  end if;
  if v_motivo is null or v_motivo not in ('PERDOADA', 'INADIMPLENCIA', 'RENEGOCIADA') then e := e || 'motivo'::text; end if;
  if length(v_expl) not between 3 and 1000 then e := e || 'explicacao'::text; end if;
  if v_falta_tela is null then e := e || 'falta'::text; end if;
  if v_reemb and v_motivo = 'RENEGOCIADA' then e := e || 'reembolso'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a baixa sem receber', variadic (select array_agg(v order by v) from unnest(e) v)); end if;

  -- As custas: só as que ficam sem parcela depois da baixa podem ir juntas (pergunta 4).
  v_custas := parcela_custas_destino(r);

  insert into parcela_baixas (escritorio_id, parcela_id, tipo, motivo, explicacao, valor, recebido_antes, feito_por)
  values (p_escritorio, r.id, 'BAIXA', v_motivo, v_expl, v_falta, v_rec, p_pessoa) returning * into b;
  if v_reemb then
    for v_conta in select x from jsonb_array_elements(v_custas) x where x -> 'depois' = 'null'::jsonb loop
      insert into parcela_baixas (escritorio_id, parcela_id, tipo, motivo, explicacao, valor, recebido_antes, reembolso_conta_id, junto_de, feito_por)
      values (p_escritorio, r.id, 'BAIXA', v_motivo, v_expl, (v_conta ->> 'valor')::bigint, 0, (v_conta ->> 'contaId')::uuid, b.id, p_pessoa);
      v_n_reemb := v_n_reemb + 1;
    end loop;
  end if;
  -- Texto fixo, sem o motivo (PT-02): é o que sobra de "cancelado" para quem lê o registro.
  update recebimentos_previstos set cancelado_em = app_now(), cancelado_motivo = 'Baixa sem receber', baixa_id = b.id
   where id = r.id returning * into r;

  -- O histórico fica na parcela (entidade recebimentos_previstos), nunca no contrato, que
  -- Contratos mostra a quem não tem o Financeiro. A explicação fica só em parcela_baixas.
  perform registrar_historico('financeiro.parcela_baixada', 'recebimentos_previstos', r.id::text,
    jsonb_build_object('baixa', b.id, 'contrato', c.id, 'parcela', r.descricao, 'motivo', v_motivo, 'valor', v_falta,
                       'recebidoAntes', v_rec, 'reembolsos', v_n_reemb,
                       -- As custas sem outra parcela que ficaram a reembolsar, em A pagar (revisão, nota 5).
                       'custasAReembolsar', (select count(*) from jsonb_array_elements(v_custas) x where x -> 'depois' = 'null'::jsonb) - v_n_reemb));

  -- Pergunta 3b: quem tem Contratos recebe o combinado, se quem deu a baixa não tem Contratos.
  if v_motivo = 'RENEGOCIADA' and p_pessoa not in (select * from pessoas_com_area(p_escritorio, 'CONTRATOS', 'contratos.editar')) then
    select * into k from clientes_escritorio where id = c.cliente_id;
    for v_quem in select * from pessoas_com_area(p_escritorio, 'CONTRATOS', 'contratos.editar') order by 1 loop
      perform aviso_sino(p_escritorio, v_quem, p_pessoa, 'BAIXA_RENEGOCIADA', 'contratos', c.id, jsonb_build_object(
        'quem', (select nome from pessoas where id = p_pessoa),
        'cliente', k.nome, 'contrato', c.numero, 'contratoId', c.id, 'combinado', v_expl));
    end loop;
  end if;
  return parcela_linha(r) || jsonb_build_object('casos', parcela_casos_do_acerto(r), 'reembolsosBaixados', v_n_reemb);
end $$;

-- Desfazer a baixa (POST /v1/escritorio/financeiro/parcelas/:id/baixa/desfazer). p_dados: { explicacao }.
create function portal_financeiro_parcela_baixa_desfazer(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r recebimentos_previstos;
  c contratos;
  k clientes_escritorio;
  i importacoes;
  b parcela_baixas;
  x parcela_baixas;
  v_expl text := btrim(coalesce(p_dados ->> 'explicacao', ''));
  v_resp uuid;
  v_hoje date := hoje_brasilia();
begin
  perform parcela_baixa_entrar(p_pessoa, p_escritorio);
  select * into r from recebimentos_previstos where id = p_parcela and escritorio_id = p_escritorio for update;
  select * into c from contratos where id = r.contrato_id;
  if r.id is null or r.valor is null or c.estado is null or c.estado = 'ELABORACAO' then
    raise exception 'Parcela não encontrada' using errcode = 'TC404';
  end if;
  if r.baixa_id is null then
    raise exception 'Esta parcela não está baixada' using errcode = 'TC409', detail = jsonb_build_object('motivo', 'PARCELA_NAO_BAIXADA')::text;
  end if;
  select * into i from importacoes where id = c.importacao_id;
  if i.id is not null and i.estado = 'DESFEITA' then
    raise exception 'A importação foi desfeita' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'IMPORTACAO_DESFEITA', 'por', pessoa_ref(i.desfeita_por), 'em', i.desfeita_em)::text;
  end if;
  if c.estado not in ('ATIVO', 'ENCERRADO') then
    raise exception 'O contrato não está vigente' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'CONTRATO_NAO_VIGENTE')::text;
  end if;
  if length(v_expl) not between 3 and 1000 then perform recusar_campos('Escreva por que desfazer', 'explicacao'); end if;

  select * into b from parcela_baixas where id = r.baixa_id;
  insert into parcela_baixas (escritorio_id, parcela_id, tipo, explicacao, valor, recebido_antes, desfaz_id, feito_por)
  values (p_escritorio, r.id, 'DESFEITA', v_expl, b.valor, parcela_recebido(r.id), b.id, p_pessoa);
  -- A baixa das custas que foi junto também se desfaz.
  for x in select pb.* from parcela_baixas pb where pb.junto_de = b.id and parcela_baixa_em_vigor(pb) order by pb.ordem loop
    insert into parcela_baixas (escritorio_id, parcela_id, tipo, explicacao, valor, recebido_antes, desfaz_id, feito_por)
    values (p_escritorio, r.id, 'DESFEITA', v_expl, x.valor, 0, x.id, p_pessoa);
  end loop;
  -- A régua não manda de uma vez os passos que venceram durante a baixa (avisos_desde, 0600).
  update recebimentos_previstos set cancelado_em = null, cancelado_motivo = null, baixa_id = null, avisos_desde = app_now()
   where id = r.id returning * into r;
  -- Alguém cuidando da parcela (nota 14, pergunta 6).
  v_resp := case when c.responsavel_id in (select * from pessoas_com_area(p_escritorio, 'FINANCEIRO', 'financeiro.editar'))
                 then c.responsavel_id else p_pessoa end;
  select * into k from clientes_escritorio where id = c.cliente_id;
  insert into cobranca_eventos (escritorio_id, parcela_id, tipo, texto, prox_data, prox_oque, prox_responsavel_id, autor_id)
  values (p_escritorio, r.id, 'ANOTACAO', left('Baixa sem receber desfeita: ' || v_expl, 1000),
          v_hoje + 1, left('Falar com ' || k.nome, 300), v_resp, p_pessoa);
  perform registrar_historico('financeiro.parcela_baixa_desfeita', 'recebimentos_previstos', r.id::text,
    jsonb_build_object('baixa', b.id, 'contrato', c.id, 'parcela', r.descricao, 'motivo', b.motivo, 'valor', b.valor,
                       'responsavel', v_resp));
  return parcela_linha(r) || jsonb_build_object('proximaAcao', jsonb_build_object('com', pessoa_ref(v_resp), 'data', v_hoje + 1, 'cliente', k.nome),
                                                'casos', parcela_casos_do_acerto(r));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. As outras escritas na parcela baixada: "Registrar recebimento", "Anotar cobrança" e "Foi
-- paga, sim" recusam com PARCELA_BAIXADA (antes de PARCELA_CANCELADA e de JA_VOLTOU).
select t1010_trocar('portal_financeiro_receber_registrar(uuid,uuid,uuid,jsonb)',
  $q$  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;$q$,
  $q$  if r.baixa_id is not null then perform recusar_motivo('Esta parcela teve baixa sem receber', 'PARCELA_BAIXADA'); end if;
  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;$q$);
select t1010_trocar('portal_financeiro_cobranca_anotar(uuid,uuid,uuid,jsonb)',
  $q$  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;$q$,
  $q$  if r.baixa_id is not null then perform recusar_motivo('Esta parcela teve baixa sem receber', 'PARCELA_BAIXADA'); end if;
  if r.cancelado_em is not null then perform recusar_motivo('Esta parcela foi cancelada', 'PARCELA_CANCELADA'); end if;$q$);
select t1010_trocar('portal_pago_antes_foi_paga(uuid,uuid,uuid,jsonb)',
  $q$  if n.cancelado_em is not null then perform recusar_motivo$q$,
  $q$  if n.baixa_id is not null then perform recusar_motivo('Esta parcela teve baixa sem receber', 'PARCELA_BAIXADA'); end if;
  if n.cancelado_em is not null then perform recusar_motivo$q$);

-- ---------------------------------------------------------------------------------------
-- 5. "Não foi paga" (nota 4): a correção baixada continua valendo como correção. A regra "em
-- vigor" passa a "não cancelada ou com baixa" no índice, em JA_MUDADA e em "corrigida".
drop index recebimentos_previstos_correcao;
create unique index recebimentos_previstos_correcao on recebimentos_previstos (corrige_pago_antes_id)
  where corrige_pago_antes_id is not null and (cancelado_em is null or baixa_id is not null);
select t1010_trocar('portal_pago_antes_nao_paga(uuid,uuid,uuid,uuid,jsonb)',
  $q$where corrige_pago_antes_id = r.id and cancelado_em is null;$q$,
  $q$where corrige_pago_antes_id = r.id and (cancelado_em is null or baixa_id is not null);$q$);
select t1010_trocar('portal_contrato_sem_caso(uuid,uuid,uuid)',
  $q$n.corrige_pago_antes_id = r.id and n.cancelado_em is null)$q$,
  $q$n.corrige_pago_antes_id = r.id and (n.cancelado_em is null or n.baixa_id is not null))$q$);

-- Desfazer a importação conta o contrato com parcela baixada como mexido (seção 3, item 18).
select t1010_trocar('imp_desfazer_plano_clientes(importacoes)',
  $q$rp.corrige_pago_antes_id is not null) mexido$q$,
  $q$rp.corrige_pago_antes_id is not null)
                            -- F3.139: parcela com baixa sem receber (ou desfeita) conta como mexida.
                            or exists (select 1 from parcela_baixas pb join recebimentos_previstos rp on rp.id = pb.parcela_id where rp.contrato_id = ct.id) mexido$q$);

-- ---------------------------------------------------------------------------------------
-- 6. O que já entrou na parcela baixada não some (nota 3).

-- As parcelas do acerto para os totais: as não canceladas e as baixadas (as pendências seguem
-- com caso_acerto_parcelas, que só tem as não canceladas).
create function caso_acerto_parcelas_totais(p_escritorio uuid, p_caso uuid) returns setof recebimentos_previstos
language sql stable
set search_path = public
as $$
  with ct as (
    select c.id,
           exists (select 1 from caso_clientes o join casos oc on oc.id = o.caso_id
                    where o.contrato_id = c.id and oc.id <> p_caso and oc.situacao = 'ANDAMENTO') segue
      from contratos c
     where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO')
       and c.id in (select cc.contrato_id from caso_clientes cc
                     where cc.caso_id = p_caso and cc.escritorio_id = p_escritorio and cc.contrato_id is not null)
  )
  select r.*
    from ct join recebimentos_previstos r on r.escritorio_id = p_escritorio and r.contrato_id = ct.id
   where (r.cancelado_em is null or r.baixa_id is not null)
     and case
           when r.exito_id is not null then exists (select 1 from exitos_conferir x where x.id = r.exito_id and x.caso_id = p_caso)
           else not ct.segue
         end
$$;

-- O acerto: os totais com as baixadas, as pendências sem elas e sem o reembolso baixado, e o
-- que teve baixa sem receber (para a janela de encerrar e o quadro).
create or replace function caso_acerto(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ps as (
    select r.*, parcela_recebido(r.id) rec, k.nome cliente, k.id cliente_ref
      from caso_acerto_parcelas(p_escritorio, p_caso) r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
  ), pt as (
    select r.*, parcela_recebido(r.id) rec, k.nome cliente, b.motivo baixa_motivo, b.valor baixa_valor, b.feito_por baixa_por, b.feito_em baixa_em
      from caso_acerto_parcelas_totais(p_escritorio, p_caso) r
      join contratos c on c.id = r.contrato_id
      join clientes_escritorio k on k.id = c.cliente_id
      left join parcela_baixas b on b.id = r.baixa_id
  ), dest as (
    select d.*, l.tipo, l.entrou_em from destinacoes d join levantamentos l on l.id = d.levantamento_id
     where l.caso_id = p_caso and l.escritorio_id = p_escritorio
  ), contas as (
    select cp.*, conta_parcela_reembolso(cp) parcela, k.nome cliente
      from contas_pagar cp left join clientes_escritorio k on k.id = cp.cliente_id
     where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.reembolsado_em is null and cp.cancelada_em is null
       -- F3.139 (pergunta 4): o reembolso que teve baixa sem receber não pende.
       and not conta_reembolso_baixado(cp.id)
       -- o que já está numa divisão de alvará pende lá, como repasse
       and not exists (select 1 from destinacoes d where d.conta_id = cp.id and d.dispensado_em is null)
  ), pend as (
    -- quando: a data de "Pronto para encerrar depois de …"; acao: pede algo agora (nada de espera).
    select 1 ordem, d.prazo dia, null::date quando, true acao, null::jsonb espera,
           jsonb_build_object('tipo', 'REPASSE', 'para', d.para, 'nome', d.nome, 'valor', d.valor, 'prazo', d.prazo,
                              'levantamentoId', d.levantamento_id) j
      from dest d where d.feito_em is null and d.dispensado_em is null
    union all
    select 2, x.previsto_em, null, true, null,
           jsonb_build_object('tipo', 'EXITO', 'nome', k.nome || ' · êxito para conferir', 'valor', x.calculado,
                              'vencimento', x.previsto_em, 'exitoId', x.id, 'contratoId', x.contrato_id, 'cliente', k.nome)
      from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id
     where x.caso_id = p_caso and x.escritorio_id = p_escritorio and x.situacao = 'PARA_CONFERIR'
    union all
    select 3, p.vencimento, p.vencimento, p.vencimento < hoje_brasilia(),
           jsonb_build_object('vencimento', p.vencimento, 'descricao', p.descricao, 'cliente', p.cliente, 'exito', p.origem = 'ENCERRAMENTO'),
           jsonb_build_object('tipo', 'PARCELA', 'nome', p.cliente || ' · ' || p.descricao, 'valor', p.valor - p.rec,
                              'vencimento', p.vencimento, 'contratoId', p.contrato_id, 'parcelaId', p.id, 'descricao', p.descricao,
                              'cliente', p.cliente, 'clienteId', p.cliente_ref, 'exito', p.origem = 'ENCERRAMENTO')
      from ps p where p.valor is not null and p.rec < p.valor
    union all
    select 4, p.vencimento, null, true, null,
           jsonb_build_object('tipo', 'PARCELA_SEM_VALOR', 'nome', p.cliente || ' · ' || p.descricao, 'valor', null,
                              'vencimento', p.vencimento, 'contratoId', p.contrato_id, 'parcelaId', p.id, 'descricao', p.descricao,
                              'cliente', p.cliente, 'clienteId', p.cliente_ref, 'exito', p.origem = 'ENCERRAMENTO')
      from ps p where p.valor is null
    union all
    -- Ajuste 7: a data do reembolso é a da parcela que o leva, nunca a da conta (que já passou).
    select 5, cp.vencimento, (cp.parcela ->> 'vencimento')::date,
           cp.parcela is null or (cp.parcela ->> 'vencimento')::date < hoje_brasilia(),
           case when cp.parcela is not null then
             jsonb_build_object('vencimento', cp.parcela ->> 'vencimento', 'descricao', cp.parcela ->> 'descricao', 'cliente', cp.cliente, 'exito', false) end,
           jsonb_build_object('tipo', 'REEMBOLSO', 'nome', cp.descricao, 'valor', coalesce(cp.valor_pago, cp.valor), 'contaId', cp.id,
                              'categoria', cp.categoria, 'cliente', cp.cliente, 'clienteId', cp.cliente_id,
                              'parcela', case when cp.parcela is not null then jsonb_build_object('id', cp.parcela ->> 'id',
                                'descricao', cp.parcela ->> 'descricao', 'vencimento', cp.parcela ->> 'vencimento', 'contrato', cp.parcela -> 'contrato') end)
      from contas cp
  )
  select jsonb_build_object(
    'casoId', p_caso,
    'entrou', (select coalesce(sum(l.valor), 0) from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio),
    'destinadoPago', (select coalesce(sum(valor), 0) from dest where feito_em is not null),
    'faltaPagar', (select coalesce(sum(valor), 0) from dest where feito_em is null and dispensado_em is null),
    'parcelas', jsonb_build_object(
      'total', (select count(*) from pt),
      'pagas', (select count(*) from pt where valor is not null and rec >= valor),
      'baixadas', (select count(*) from pt where baixa_id is not null),
      'ultima', (select max(p2.recebido_em) from pagamentos_recebidos p2 join pt on pt.id = p2.parcela_id),
      'falta', (select coalesce(sum(valor - rec), 0) from pt where baixa_id is null and valor is not null and rec < valor)),
    -- F3.139: o que teve baixa sem receber (a renegociada fica de fora do número, pergunta 3a).
    'baixado', jsonb_build_object(
      'valor', (select coalesce(sum(baixa_valor), 0) from pt where baixa_motivo in ('PERDOADA', 'INADIMPLENCIA')),
      'renegociado', (select coalesce(sum(baixa_valor), 0) from pt where baixa_motivo = 'RENEGOCIADA'),
      'parcelas', coalesce((select jsonb_agg(jsonb_build_object('parcelaId', pt.id, 'descricao', pt.descricao, 'cliente', pt.cliente,
                                                                'contratoId', pt.contrato_id, 'motivo', pt.baixa_motivo, 'valor', pt.baixa_valor,
                                                                'por', pessoa_ref(pt.baixa_por), 'em', pt.baixa_em) order by pt.vencimento, pt.descricao)
                              from pt where pt.baixa_id is not null), '[]'::jsonb),
      'reembolsos', coalesce((select jsonb_agg(jsonb_build_object('contaId', cp.id, 'descricao', cp.descricao, 'categoria', cp.categoria,
                                                                  'valor', coalesce(cp.valor_pago, cp.valor)) order by cp.criado_em, cp.id)
                                from contas_pagar cp
                               where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.cancelada_em is null
                                 and cp.reembolsado_em is null and conta_reembolso_baixado(cp.id)), '[]'::jsonb)),
    'prestacoesPendentes', (select count(*) from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio and l.prestacao_em is null),
    'pendencias', coalesce((select jsonb_agg(j order by ordem, dia nulls last) from pend), '[]'::jsonb),
    'falta', (select coalesce(sum((j ->> 'valor')::bigint), 0) from pend),
    -- Pergunta 1: só espera (nada pede ação agora) dá a data; vale a maior.
    'aVencer', (select case when bool_or(acao) then null else (array_agg(espera order by quando desc))[1] end from pend),
    'fechado', (select jsonb_build_object('em', f.fechado_em, 'por', pessoa_ref(f.fechado_por)) from fechamentos_caso f where f.caso_id = p_caso))
$$;

-- O quadro da folha: recebido com as baixadas, "pagas" e "falta" sem elas, e cada baixa do contrato.
create or replace function caso_acerto_quadro(p_escritorio uuid, p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with ps as (
    select r.id, r.contrato_id, r.valor, r.descricao, r.vencimento, r.baixa_id, parcela_recebido(r.id) rec
      from caso_acerto_parcelas_totais(p_escritorio, p_caso) r
  ), ct as (
    select c.*, k.nome cliente_nome,
           coalesce((select jsonb_agg(jsonb_build_object('id', oc.id, 'nome', oc.nome) order by oc.nome)
                       from caso_clientes o join casos oc on oc.id = o.caso_id
                      where o.contrato_id = c.id and oc.id <> p_caso and oc.situacao = 'ANDAMENTO'), '[]'::jsonb) segue,
           (select h.autor_id from historico h
             where h.entidade = 'contratos' and h.entidade_id = c.id::text and h.escritorio_id = p_escritorio and h.acao = 'contrato.encerrado'
             order by h.ocorrido_em desc, h.id desc limit 1) encerrou
      from contratos c join clientes_escritorio k on k.id = c.cliente_id
     where c.escritorio_id = p_escritorio and c.estado <> 'ELABORACAO'
       and c.id in (select cc.contrato_id from caso_clientes cc where cc.caso_id = p_caso and cc.contrato_id is not null)
  )
  select jsonb_build_object(
    'caso', (select jsonb_build_object('id', ca.id, 'nome', ca.nome, 'resultado', ca.resultado, 'encerradoEm', ca.encerrado_em,
               'encerradoPor', (select pessoa_ref(m.por) from caso_etapa_mudancas m where m.caso_id = ca.id and m.resultado is not null
                                 order by m.ordem desc limit 1),
               'encerradoPorImportacao', ca.importacao_id is not null
                                         and not exists (select 1 from caso_etapa_mudancas m where m.caso_id = ca.id and m.resultado is not null))
               from casos ca where ca.id = p_caso and ca.escritorio_id = p_escritorio),
    'exitos', coalesce((select jsonb_agg(jsonb_build_object('cliente', jsonb_build_object('id', k.id, 'nome', k.nome), 'contratoId', x.contrato_id,
                  'situacao', x.situacao, 'calculado', x.calculado, 'valorLancado', x.valor_lancado, 'vencimento', x.vencimento,
                  'percentual', x.percentual, 'conferidoPor', pessoa_ref(x.conferido_por), 'conferidoEm', x.conferido_em,
                  'motivoNaoCobrar', x.motivo_nao_cobrar, 'explicacao', x.explicacao) order by k.nome)
                from exitos_conferir x join clientes_escritorio k on k.id = x.cliente_id
               where x.caso_id = p_caso and x.escritorio_id = p_escritorio), '[]'::jsonb),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero,
                  'cliente', jsonb_build_object('id', c.cliente_id, 'nome', c.cliente_nome), 'situacao', c.estado,
                  'encerradoEm', c.encerrado_em, 'encerradoPor', pessoa_ref(c.encerrou),
                  'comCaso', exists (select 1 from historico h where h.entidade = 'contratos' and h.entidade_id = c.id::text
                                       and h.escritorio_id = p_escritorio and h.acao = 'contrato.encerrado_com_caso'),
                  'exitoPercentual', (select json_inteiro(hc.params, 'percentual') from honorario_condicoes hc
                                       where hc.escritorio_id = p_escritorio and hc.dono_tipo = 'CONTRATO' and hc.dono_id = c.id and hc.tipo = 'EXITO'),
                  'parcelas', jsonb_build_object('total', (select count(*) from ps where ps.contrato_id = c.id),
                                                 'pagas', (select count(*) from ps where ps.contrato_id = c.id and ps.valor is not null and ps.rec >= ps.valor),
                                                 'baixadas', (select count(*) from ps where ps.contrato_id = c.id and ps.baixa_id is not null)),
                  'recebido', (select coalesce(sum(ps.rec), 0) from ps where ps.contrato_id = c.id),
                  'falta', (select coalesce(sum(ps.valor - ps.rec), 0) from ps where ps.contrato_id = c.id and ps.baixa_id is null
                              and ps.valor is not null and ps.rec < ps.valor),
                  'ultimaRecebidaEm', (select max(pg.recebido_em) from pagamentos_recebidos pg join ps on ps.id = pg.parcela_id where ps.contrato_id = c.id),
                  -- F3.139: "parcela 6/6 baixada sem receber (inadimplência), por Marina em 18/11".
                  'baixas', coalesce((select jsonb_agg(jsonb_build_object('descricao', ps.descricao, 'motivo', b.motivo, 'valor', b.valor,
                                                                          'por', pessoa_ref(b.feito_por), 'em', b.feito_em) order by ps.vencimento, ps.descricao)
                                        from ps join parcela_baixas b on b.id = ps.baixa_id where ps.contrato_id = c.id), '[]'::jsonb),
                  'seguePor', c.segue) order by c.numero)
                from ct c), '[]'::jsonb),
    'reembolsos', (select jsonb_build_object('adiantado', coalesce(sum(coalesce(cp.valor_pago, cp.valor)), 0),
                                             'reembolsado', coalesce(sum(coalesce(cp.valor_pago, cp.valor)) filter (where cp.reembolsado_em is not null), 0),
                                             'baixado', coalesce(sum(coalesce(cp.valor_pago, cp.valor))
                                                                   filter (where cp.reembolsado_em is null and conta_reembolso_baixado(cp.id)), 0))
                     from contas_pagar cp
                    where cp.escritorio_id = p_escritorio and cp.caso_id = p_caso and cp.cliente_id is not null and cp.cancelada_em is null),
    'recebidoNoCaso', (select coalesce(sum(rec), 0) from ps),
    'contratosNoRecebido', (select count(*) from ct c where c.estado in ('ATIVO', 'ENCERRADO')
                              and (jsonb_array_length(c.segue) = 0 or exists (select 1 from ps where ps.contrato_id = c.id))),
    'contratosJaEncerrados', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero,
                  'cliente', jsonb_build_object('id', c.cliente_id, 'nome', c.cliente_nome), 'encerradoEm', c.encerrado_em,
                  'encerradoPor', pessoa_ref(c.encerrou)) order by c.numero)
                from ct c where c.estado = 'ENCERRADO'), '[]'::jsonb),
    'quemContratos', coalesce((select jsonb_agg(p.nome order by p.nome)
                from vinculos v join pessoas p on p.id = v.pessoa_id
               where v.escritorio_id = p_escritorio and v.revogado_em is null and v.funcao in ('SOCIO', 'EQUIPE')
                 and 'CONTRATOS' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))
                 and pode(v.pessoa_id, p_escritorio, 'contratos.editar')), '[]'::jsonb),
    'comLevantamento', exists (select 1 from levantamentos l where l.caso_id = p_caso and l.escritorio_id = p_escritorio))
$$;

-- A ficha do caso (Jurídico): o recebido dos contratos com as baixadas, e a baixada não falta.
select t1010_trocar('caso_resumo_acerto(uuid,uuid,uuid)',
  $q$(select q.valor, parcela_recebido(q.id) rec from caso_acerto_parcelas(p_escritorio, p_caso) q where q.contrato_id = c.id) r$q$,
  $q$(select case when q.baixa_id is null then q.valor else parcela_recebido(q.id) end valor, parcela_recebido(q.id) rec
                                  from caso_acerto_parcelas_totais(p_escritorio, p_caso) q where q.contrato_id = c.id) r$q$);
select t1010_trocar('caso_resumo_acerto(uuid,uuid,uuid)',
  $q$join caso_acerto_parcelas(p_escritorio, p_caso) q on q.id = pg.parcela_id$q$,
  $q$join caso_acerto_parcelas_totais(p_escritorio, p_caso) q on q.id = pg.parcela_id$q$);

-- A receber: "Recebido no mês" sai do dinheiro que entrou no mês, também nas parcelas baixadas.
select t1010_trocar('portal_financeiro_receber(uuid,uuid,text,text,uuid,text)',
  $q$    ), abertas as ($q$,
  $q$    ), ps_mes as (
      select r.*, parcela_recebido(r.id) rec, c.responsavel_id, k.nome cliente_nome, c.numero, c.objeto
        from recebimentos_previstos r
        join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
        join clientes_escritorio k on k.id = c.cliente_id
       where r.escritorio_id = p_escritorio and (r.cancelado_em is null or r.baixa_id is not null) and r.valor is not null
    ), abertas as ($q$);
select t1010_trocar('portal_financeiro_receber(uuid,uuid,text,text,uuid,text)',
  $q$        from ps where exists (select 1 from pagamentos_recebidos p where p.parcela_id = ps.id and p.recebido_em >= v_mes)$q$,
  $q$        from ps_mes ps where exists (select 1 from pagamentos_recebidos p where p.parcela_id = ps.id and p.recebido_em >= v_mes)$q$);

-- ---------------------------------------------------------------------------------------
-- 7. A ficha do contrato no Financeiro: "Contratado" conta Perdoada e Inadimplência (e, da
-- renegociada, só o que entrou: pergunta 3a); entram "Baixado sem receber" e "Renegociado".
alter function portal_financeiro_contrato(uuid, uuid, uuid) rename to portal_financeiro_contrato_sem_baixa;
create function portal_financeiro_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := portal_financeiro_contrato_sem_baixa(p_pessoa, p_escritorio, p_contrato);
  v_baixado bigint;
  v_reneg bigint;
  v_reneg_rec bigint;
begin
  select coalesce(sum(b.valor) filter (where b.motivo in ('PERDOADA', 'INADIMPLENCIA')), 0),
         coalesce(sum(b.valor) filter (where b.motivo = 'RENEGOCIADA'), 0),
         coalesce(sum(b.recebido_antes) filter (where b.motivo = 'RENEGOCIADA'), 0)
    into v_baixado, v_reneg, v_reneg_rec
    from recebimentos_previstos r join parcela_baixas b on b.id = r.baixa_id
   where r.contrato_id = p_contrato and r.escritorio_id = p_escritorio;
  return v || jsonb_build_object('totais', (v -> 'totais') || jsonb_build_object(
    'contratado', (v #>> '{totais,contratado}')::bigint
                  + (select coalesce(sum(r.valor), 0) from recebimentos_previstos r join parcela_baixas b on b.id = r.baixa_id
                      where r.contrato_id = p_contrato and r.escritorio_id = p_escritorio and b.motivo in ('PERDOADA', 'INADIMPLENCIA'))
                  + v_reneg_rec,
    'baixado', v_baixado,
    'renegociado', v_reneg));
end $$;

select t1010_trocar('relatorio_contratado(uuid,date,date)',
  $q$   where r.vencimento between p_de and p_ate$q$,
  $q$   where r.vencimento between p_de and p_ate
  union all
  -- F3.139 (pergunta 3a): a baixada por Perdoada ou Inadimplência continua contratada; da
  -- renegociada, só o que tinha entrado.
  select r.contrato_id, c.cliente_id, relatorio_area(relatorio_caso_do_contrato(c.id)), c.responsavel_id,
         case when b.motivo = 'RENEGOCIADA' then b.recebido_antes else r.valor end
    from recebimentos_previstos r join parcela_baixas b on b.id = r.baixa_id
    join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
   where r.escritorio_id = p_escritorio and r.vencimento between p_de and p_ate
     and (b.motivo <> 'RENEGOCIADA' or b.recebido_antes > 0)$q$);

-- ---------------------------------------------------------------------------------------
-- 8. A régua de WhatsApp (nota 1): "Pagou" é só dinheiro recebido; a parcela cancelada (baixa sem
-- receber ou condição mudada) encerra a execução como FICOU_DE_FORA, sem mandar nada.
create or replace function automacao_pagou(e automacao_execucoes, a automacoes) returns boolean
language sql stable
set search_path = public
as $$
  select (a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER')
          and exists (select 1 from recebimentos_previstos r
                       where r.id = e.origem_id and r.valor is not null and parcela_recebido(r.id) >= r.valor))
      or (a.gatilho = 'DOCUMENTO_PENDENTE' and e.documentos is not null
          and not exists (select 1 from documento_pedidos d join casos c on c.id = d.caso_id
                           where d.id = any (e.documentos) and d.chegou_em is null and c.situacao = 'ANDAMENTO'))
$$;

create function automacao_parcela_fora(e automacao_execucoes, a automacoes) returns text
language sql stable
set search_path = public
as $$
  select case when r.baixa_id is not null then 'A parcela teve baixa sem receber.' else 'A parcela foi cancelada no contrato.' end
    from recebimentos_previstos r
   where a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') and r.id = e.origem_id and r.cancelado_em is not null
     and parcela_recebido(r.id) < coalesce(r.valor, 1)
$$;

select t1010_trocar('automacao_andar(uuid)',
  $q$  v_fluxo := automacao_fluxo_da_execucao(e);
  -- O que faz sair:$q$,
  $q$  -- F3.139: a parcela que saiu da cobrança sem pagar não recebe mais nada e nunca vai ao "Pagou".
  if automacao_parcela_fora(e, a) is not null then
    perform automacao_encerrar(e, 'FICOU_DE_FORA', automacao_parcela_fora(e, a));
    return 'FICOU_DE_FORA';
  end if;
  v_fluxo := automacao_fluxo_da_execucao(e);
  -- O que faz sair:$q$);

-- ---------------------------------------------------------------------------------------
-- 9. O sino do caso pronto (0990): o motivo BAIXA, com quem e a parcela.
alter table casos_prontos_fechar drop constraint casos_prontos_fechar_motivo_check;
alter table casos_prontos_fechar add constraint casos_prontos_fechar_motivo_check
  check (motivo in ('PAGAMENTO', 'REEMBOLSO', 'EXITO', 'BAIXA', 'CONTRATO_ENCERRADO', 'CASO_ENCERRADO', 'OUTRO_CASO', 'ROTINA'));
select t1010_trocar('caso_pronto_anotar(uuid,uuid,jsonb)',
  $q$array['PAGAMENTO', 'REEMBOLSO', 'EXITO', 'CONTRATO_ENCERRADO'$q$,
  $q$array['PAGAMENTO', 'REEMBOLSO', 'EXITO', 'BAIXA', 'CONTRATO_ENCERRADO'$q$);
select t1010_trocar('caso_pronto_dados(uuid,uuid,uuid,boolean,jsonb,jsonb)',
  $q$    'quem', (select p.nome from pessoas p where p.id = (p_motivos ->> 'autor')::uuid))$q$,
  $q$    'quem', (select p.nome from pessoas p where p.id = (p_motivos ->> 'autor')::uuid),
    'parcela', p_motivos ->> 'parcela',
    'clienteParcela', p_motivos ->> 'clienteParcela')$q$);
-- A baixa não é "contrato encerrado": quem anota é o gatilho de parcela_baixas.
select t1010_trocar('caso_pronto_anotar_parcelas()',
  $q$new.cancelado_em is not null and old.cancelado_em is null and c.estado = 'ENCERRADO' then$q$,
  $q$new.cancelado_em is not null and old.cancelado_em is null and new.baixa_id is null and c.estado = 'ENCERRADO' then$q$);

create function caso_pronto_anotar_baixas() returns trigger
language plpgsql
set search_path = public
as $$
declare
  r recebimentos_previstos;
  v_anot jsonb;
  v uuid;
  v_caso uuid;
begin
  select * into r from recebimentos_previstos where id = new.parcela_id;
  if new.tipo = 'BAIXA' then
    v_anot := jsonb_build_object('motivo', 'BAIXA', 'parcela', r.descricao, 'autorFora', true,
      'clienteParcela', (select k.nome from contratos c join clientes_escritorio k on k.id = c.cliente_id where c.id = r.contrato_id));
  else
    v_anot := '{"motivo": "ROTINA", "autorFora": true}'::jsonb;
  end if;
  for v in select * from caso_pronto_casos_do_contrato(r.contrato_id) loop
    perform caso_pronto_anotar(new.escritorio_id, v, v_anot);
  end loop;
  -- O reembolso baixado (ou desfeito) mexe no caso da conta.
  select cp.caso_id into v_caso from contas_pagar cp
   where cp.id = coalesce(new.reembolso_conta_id, (select d.reembolso_conta_id from parcela_baixas d where d.id = new.desfaz_id));
  if v_caso is not null then perform caso_pronto_anotar(new.escritorio_id, v_caso, v_anot); end if;
  return null;
end $$;
create trigger caso_pronto_anotar after insert on parcela_baixas
  for each row execute function caso_pronto_anotar_baixas();
create constraint trigger caso_pronto_fim after insert on parcela_baixas
  deferrable initially deferred for each row execute function caso_pronto_fim();

-- O aviso a Contratos com o combinado (pergunta 3b): o tipo novo no sino.
do $$
declare
  v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'BAIXA_RENEGOCIADA') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

-- ---------------------------------------------------------------------------------------
-- 10. O carnê (nota 7): a mudança e o aviso dizem "teve baixa sem receber" e "voltou para A
-- receber"; a parcela baixada continua contando no "x de 6".
select t1010_trocar('carne_mudancas(carnes)',
  $q$jsonb_build_object('tipo', 'CANCELADA', 'parcela'$q$,
  $q$jsonb_build_object('tipo', case when r.baixa_id is not null then 'BAIXADA' else 'CANCELADA' end, 'parcela'$q$);
select t1010_trocar('avisos_sino_parcela_do_carne()',
  $q$    case when new.cancelado_em is not null and old.cancelado_em is null then 'CANCELADA'$q$,
  $q$    case when new.baixa_id is not null and old.baixa_id is null then 'BAIXADA'
         when new.baixa_id is null and old.baixa_id is not null then 'BAIXA_DESFEITA'
         when new.cancelado_em is not null and old.cancelado_em is null then 'CANCELADA'$q$);
-- Revisão do código, nota 1 (pergunta 2, PT-02): no aviso do carnê, quem deu ou desfez a baixa só vai
-- a quem tem o Financeiro; o responsável sem o Financeiro lê só "a parcela teve baixa sem receber".
select t1010_trocar('carne_avisar_desatualizado(carnes,uuid,text,text)',
  $q$        'gerou', v_pessoa = k.gerado_por));$q$,
  $q$        'gerou', v_pessoa = k.gerado_por)
        - case when p_motivo in ('BAIXADA', 'BAIXA_DESFEITA')
                    and v_pessoa not in (select * from pessoas_com_area(k.escritorio_id, 'FINANCEIRO', 'financeiro.editar'))
               then 'quem' else '' end);$q$);
select t1010_trocar('carne_ordem_parcelas(uuid)',
  $q$r.valor is not null and r.cancelado_em is null$q$,
  $q$r.valor is not null and (r.cancelado_em is null or r.baixa_id is not null)$q$);

-- ---------------------------------------------------------------------------------------
-- 11. Os relatórios (nota 11): a parcela não está aberta nos dias em que estava baixada, lidos de
-- parcela_baixas, e um desfazer depois não reescreve um mês passado.
select t1010_trocar('relatorio_abertas(uuid,date)',
  $q$       and (r.cancelado_em is null or (r.cancelado_em at time zone 'America/Sao_Paulo')::date > p_dia)$q$,
  $q$       and (r.cancelado_em is null or r.baixa_id is not null or (r.cancelado_em at time zone 'America/Sao_Paulo')::date > p_dia)
       and not parcela_baixada_no_dia(r.id, p_dia)$q$);
select t1010_trocar('relatorio_adiantadas(uuid,date,date)',
  $q$     and (c.reembolsado_em is null or c.reembolsado_em > p_ate)$q$,
  $q$     and (c.reembolsado_em is null or c.reembolsado_em > p_ate)
     and not conta_reembolso_baixado_no_dia(c.id, p_ate)$q$);

-- ---------------------------------------------------------------------------------------
-- 12. O reembolso baixado (pergunta 4) sai do "a reembolsar" de A pagar, da divisão do alvará e
-- da conta. Na conta, a situação mostra a baixa com o motivo e quem fez.
select t1010_trocar('portal_financeiro_pagar(uuid,uuid,text)',
  $q$cliente_id is not null and reembolsado_em is null and cancelada_em is null)),$q$,
  $q$cliente_id is not null and reembolsado_em is null and cancelada_em is null and not conta_reembolso_baixado(id))),$q$);
select t1010_trocar('portal_financeiro_pagar(uuid,uuid,text)',
  $q$c.reembolsado_em is null and c.cancelada_em is null), '[]'::jsonb),$q$,
  $q$c.reembolsado_em is null and c.cancelada_em is null and not conta_reembolso_baixado(c.id)), '[]'::jsonb),$q$);
select t1010_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$              and cp.reembolsado_em is null$q$,
  $q$              and cp.reembolsado_em is null and not conta_reembolso_baixado(cp.id)$q$);
select t1010_trocar('financeiro_levantamento_registrar_base(uuid,uuid,jsonb)',
  $q$and cliente_id = l.cliente_id and reembolsado_em is null) then$q$,
  $q$and cliente_id = l.cliente_id and reembolsado_em is null and not conta_reembolso_baixado(id)) then$q$);

alter function conta_linha(contas_pagar) rename to conta_linha_sem_baixa;
create function conta_linha(c contas_pagar) returns jsonb
language sql stable
set search_path = public
as $$
  select conta_linha_sem_baixa(c) || jsonb_build_object('reembolsoBaixado', (
    select jsonb_build_object('motivo', b.motivo, 'por', pessoa_ref(b.feito_por), 'em', b.feito_em,
                              'parcela', (select r.descricao from recebimentos_previstos r where r.id = b.parcela_id))
      from parcela_baixas b where b.reembolso_conta_id = c.id and parcela_baixa_em_vigor(b) order by b.ordem desc limit 1))
$$;

-- ---------------------------------------------------------------------------------------
-- 13. A divisão do alvará (nota 13): confere de novo depois de travar a parcela e pula a que
-- mudou (paga, cancelada ou com baixa sem receber).
select t1010_trocar('portal_financeiro_levantamento_registrar(uuid,uuid,jsonb)',
  $q$      perform 1 from recebimentos_previstos where id = e.id for update;
      v_parte := least(v_resta, e.falta);$q$,
  $q$      perform 1 from recebimentos_previstos where id = e.id for update;
      continue when not exists (select 1 from recebimentos_previstos x where x.id = e.id and x.cancelado_em is null
                                   and x.valor is not null and parcela_recebido(x.id) < x.valor);
      v_parte := least(v_resta, (select x.valor - parcela_recebido(x.id) from recebimentos_previstos x where x.id = e.id));$q$);
select t1010_trocar('portal_financeiro_levantamento_registrar(uuid,uuid,jsonb)',
  $q$'paga', v_parte >= e.falta)$q$,
  $q$'paga', parcela_recebido(e.id) >= (select x.valor from recebimentos_previstos x where x.id = e.id))$q$);

-- ---------------------------------------------------------------------------------------
-- 14. Contratos › contrato › Recebimentos (nota 2, pergunta 2): quem tem o Financeiro vê a baixa
-- (o selo vem da situação BAIXADA); quem não tem vê só "fora da cobrança", sem o "cancelado".
alter function portal_contrato(uuid, uuid, uuid) rename to portal_contrato_sem_baixa;
create function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := portal_contrato_sem_baixa(p_pessoa, p_escritorio, p_contrato);
  v_fin boolean := coalesce((v ->> 'financeiro')::boolean, false);
begin
  if not exists (select 1 from recebimentos_previstos r where r.contrato_id = p_contrato and r.escritorio_id = p_escritorio and r.baixa_id is not null) then
    return v;
  end if;
  return v || jsonb_build_object('recebimentos', coalesce((
    select jsonb_agg(case when r.baixa_id is null then l
                          when v_fin then l || jsonb_build_object('baixa', (select jsonb_build_object('motivo', b.motivo, 'explicacao', b.explicacao,
                                                                                'valor', b.valor, 'por', pessoa_ref(b.feito_por), 'em', b.feito_em)
                                                                              from parcela_baixas b where b.id = r.baixa_id))
                          else (l - 'cancelado') || jsonb_build_object('foraDaCobranca', true) end
                     order by o)
      from jsonb_array_elements(v -> 'recebimentos') with ordinality t(l, o)
      join recebimentos_previstos r on r.id = (l ->> 'id')::uuid), '[]'::jsonb));
end $$;

-- "De onde veio" da ficha do contrato no Financeiro mostra a baixa e o desfazer.
select t1010_trocar('contrato_fechamento_origem(uuid,uuid,uuid)',
  $q$        and h.acao = 'financeiro.recebimento'$q$,
  $q$        and h.acao in ('financeiro.recebimento', 'financeiro.parcela_baixada', 'financeiro.parcela_baixa_desfeita')$q$);
-- Revisão, nota 5: o texto da baixa e do desfazer. A explicação do desfazer vem de parcela_baixas
-- (o histórico não a guarda), e a próxima ação diz com quem ficou.
select t1010_trocar('contrato_fechamento_origem(uuid,uuid,uuid)',
  $q$             'explicacao', u.dados ->> 'explicacao',$q$,
  $q$             'explicacao', case when u.acao = 'financeiro.parcela_baixa_desfeita'
                                then (select x.explicacao from parcela_baixas x
                                       where x.escritorio_id = p_escritorio and x.tipo = 'DESFEITA' and x.desfaz_id::text = u.dados ->> 'baixa')
                                else u.dados ->> 'explicacao' end,
             'reembolsos', u.dados -> 'reembolsos',
             'custasAReembolsar', u.dados -> 'custasAReembolsar',
             'com', case when u.acao = 'financeiro.parcela_baixa_desfeita'
                         then (select p.nome from pessoas p where p.id::text = u.dados ->> 'responsavel') end,$q$);

-- ---------------------------------------------------------------------------------------
-- 15. A IA do escritório (pergunta 5): a parcela baixada é "assunto da equipe", sem valor nem
-- motivo; com ela, a IA não diz ao cliente que nada está em aberto e passa para uma pessoa.
select t1010_trocar('ia_contexto_json(uuid,uuid,jsonb)',
  $q$         where x.situacao in ('VENCIDA', 'PARCIAL', 'A_VENCER')), '[]'::jsonb));$q$,
  $q$         where x.situacao in ('VENCIDA', 'PARCIAL', 'A_VENCER')), '[]'::jsonb));
      v_dados := v_dados || jsonb_build_object('parcelasComEquipe', (
        select count(*) from recebimentos_previstos r join contratos k on k.id = r.contrato_id
         where r.escritorio_id = p_escritorio and k.cliente_id = v_cli.id and r.baixa_id is not null));$q$);

drop function t1010_trocar(regprocedure, text, text, integer);

call fechar_acesso();
