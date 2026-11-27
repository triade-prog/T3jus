-- 1182 · Implantação assistida, parte 3: as linhas na 1ª fatura (F1.44; CO-08, CO-06). Plano
-- aprovado em docs/design/aprovadas/console-implantacao/PLANO.md (regras 4 a 7, seções 4.4, 5.1
-- e 6), com a revisão em REVISAO.md (correções 3, 5, 6, 7 e 19) e as decisões da Carol em DC14.
-- Depende da 1170 (CO-10), da 1180 e da 1181. Sem tela e sem PDF novo: a chave
-- implantacao_na_fatura continua desligada e só liga no PR das telas do Portal (F1.48).
--
--  * fatura_itens aceita IMPLANTACAO (+valor) e ISENCAO (−valor), com implantacao_id e chave
--    composta (escritorio_id, implantacao_id). O texto da isenção fica congelado na descrição do
--    item ("Isenção da implantação · Oferta de lançamento"): o PDF e as telas não buscam nada ao vivo.
--  * As linhas entram só na 1ª fatura do escritório (a da primeira_competencia, quando ainda não há
--    fatura nenhuma) e só com a chave ligada. Saem só em cobranca_emitir, ao fim dos itens do mês:
--    nunca em cobranca_itens_da nem nas parcelas do carnê. O desconto de entrada continua só sobre
--    a mensalidade. Valor 0 não gera linha.
--  * cobranca_emitir é recriada a partir da versão da 1170 (a 1171 não a mudou). Na 1ª fatura, quem
--    ainda não tem implantação ganha uma, por implantacao_abrir(..., na_fatura => true) da 1181: a
--    abertura vale com a chave ligada ou desligada; só as linhas dependem dela. Com o teste do CO-09,
--    cobranca_comecar volta sem emitir enquanto o teste corre: a implantação e as linhas saem na
--    emissão da 1ª fatura, não no Ativo.
--  * Carnê: com a implantação isenta, as duas linhas somam zero e a parcela, o Pix e o boleto não
--    mudam. Com a implantação COBRADA (ainda não faturada), IMPLANTACAO_COBRADA_NO_CARNE: na emissão,
--    ao salvar a assinatura com carnê, ao gerar carnê novo, na troca de carnê e na conclusão (Ativo).
--    Na rotina (sem pessoa no contexto), a 1ª fatura desse escritório não sai: ele é pulado, fica o
--    evento implantacao.carne_recusado (uma vez por dia) e os outros escritórios seguem. O aviso no
--    sino é do F1.46 (1184). cobranca_rotina não é recriada aqui (a 1161 do CO-09 a envolve).
--  * "Faturada" = linha IMPLANTACAO numa fatura não cancelada. Decisão da Carol (DC14): a 1ª fatura
--    cancelada não faz a implantação voltar a cobrar. Não há reemissão (0690, cobranca_emitir_pendentes
--    não emite a competência que já tem fatura, cancelada ou não), e as linhas só entram na 1ª
--    fatura: depois do cancelamento, nenhuma outra fatura as traz.
--  * Os blocos "implantacao" em console_assinatura, portal_plano_faturas e cobranca_documento_json,
--    envolvidas a partir da versão mais nova (0860, 1171 e 1170). O valor só vai para quem vê a
--    cobrança: console.cobranca.ver no Console; no Portal, só o sócio dono chega à função
--    (portal.faturas.ver); o documento só sai por essas duas portas.
--
-- Antes de aplicar fora de ordem: conferir que nenhuma migration pendente recria cobranca_emitir,
-- cobranca_emitir_pendentes, console_assinatura, portal_plano_faturas, cobranca_documento_json ou
-- implantacao_segue_o_estagio; se recriar e for aplicada depois, desfaz esta. As funções envolvidas
-- (console_assinatura, portal_plano_faturas, cobranca_documento_json) seguem o padrão de renomear e
-- envolver, que vale nas duas ordens com outro envoltório (como o da 1161 do CO-09).
-- Teste: pgTAP 192 (e o 092, que continua com os itens exatos com a chave desligada).

-- ---------------------------------------------------------------------------------------
-- 1. Os itens novos da fatura

alter table fatura_itens drop constraint fatura_itens_tipo_check;
alter table fatura_itens add constraint fatura_itens_tipo_check
  check (tipo in ('MENSALIDADE', 'PESSOA_A_MAIS', 'DESCONTO', 'IMPLANTACAO', 'ISENCAO'));
alter table fatura_itens drop constraint fatura_itens_check1;
alter table fatura_itens add constraint fatura_itens_sinal
  check ((tipo in ('DESCONTO', 'ISENCAO')) = (valor_centavos < 0) or valor_centavos = 0);
alter table fatura_itens add column implantacao_id uuid;
alter table fatura_itens add constraint fatura_itens_implantacao_fkey foreign key (escritorio_id, implantacao_id)
  references implantacoes (escritorio_id, id) on delete restrict;
alter table fatura_itens add constraint fatura_itens_implantacao_so_nos_dela
  check ((implantacao_id is not null) = (tipo in ('IMPLANTACAO', 'ISENCAO')));
create index fatura_itens_implantacao_idx on fatura_itens (implantacao_id) where implantacao_id is not null;
comment on column fatura_itens.implantacao_id is 'A implantação assistida das linhas IMPLANTACAO e ISENCAO da 1ª fatura (CO-08)';

update inventario_dados
   set o_que = 'Itens de cada fatura: mensalidade, pessoas a mais, desconto e o motivo do desconto, e a implantação assistida e a isenção dela'
 where tabela = 'fatura_itens';

-- ---------------------------------------------------------------------------------------
-- 2. Leituras de apoio

-- A implantação do escritório que vale para a cobrança: a última que não foi cancelada (a número 2,
-- depois de uma reabertura). Nula quando não há.
-- As três leituras são plpgsql, e não sql: o plano de uma função sql guardado na transação não é
-- refeito quando o papel muda (security definer dentro de outra chamada), e com o RLS isso leria
-- com o contexto errado.
create function implantacao_do_escritorio(p_escritorio uuid) returns implantacoes
language plpgsql stable
set search_path = public
as $$
declare i implantacoes;
begin
  select * into i from implantacoes where escritorio_id = p_escritorio and estado <> 'CANCELADA' order by numero desc limit 1;
  return i;
end $$;

-- A fatura que levou a implantação: a linha IMPLANTACAO numa fatura não cancelada (plano, regra 5).
create function implantacao_fatura(i implantacoes) returns faturas
language plpgsql stable
set search_path = public
as $$
declare f faturas;
begin
  select x.* into f from fatura_itens it join faturas x on x.id = it.fatura_id
   where it.escritorio_id = i.escritorio_id and it.implantacao_id = i.id and it.tipo = 'IMPLANTACAO' and x.situacao <> 'CANCELADA'
   order by x.competencia limit 1;
  return f;
end $$;

-- A 1ª fatura do escritório ainda não saiu: não há fatura nenhuma, em qualquer situação. A
-- cancelada conta: ela não é emitida de novo e a implantação não volta a cobrar (DC14).
create function implantacao_primeira_pendente(p_escritorio uuid) returns boolean
language plpgsql stable
set search_path = public
as $$
begin
  return not exists (select 1 from faturas where escritorio_id = p_escritorio);
end $$;

-- A implantação vai cobrada no carnê da 1ª fatura: chave ligada, forma Carnê, 1ª fatura ainda por
-- sair e a implantação do escritório COBRADA com valor. Sem implantação nenhuma ainda, vale o que a
-- regra do dia daria na abertura; com só implantações canceladas, nada vai para a fatura.
create function implantacao_cobrada_no_carne(a assinaturas) returns boolean
language plpgsql stable
set search_path = public
as $$
declare i implantacoes;
begin
  if a.id is null or a.forma <> 'CARNE' or not implantacao_na_fatura() or not implantacao_primeira_pendente(a.escritorio_id) then
    return false;
  end if;
  i := implantacao_do_escritorio(a.escritorio_id);
  if i.id is not null then return i.condicao = 'COBRADA' and i.valor_centavos > 0; end if;
  if exists (select 1 from implantacoes where escritorio_id = a.escritorio_id) then return false; end if;
  return (select c.condicao = 'COBRADA' from implantacao_condicao(hoje_brasilia()) c)
         and (select r.valor_centavos > 0 from implantacao_regras r);
end $$;

create function implantacao_recusar_carne(a assinaturas) returns void
language plpgsql
set search_path = public
as $$
begin
  if implantacao_cobrada_no_carne(a) then
    perform recusar_motivo('A implantação assistida cobrada vai à vista na 1ª fatura: escolha Pix ou boleto', 'IMPLANTACAO_COBRADA_NO_CARNE');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. As linhas (a única fonte; plano, regra 4)

-- As duas linhas da 1ª fatura, ao fim dos itens do mês. Só na competência da primeira_competencia e
-- com a 1ª fatura ainda por sair. Quem ainda não tem implantação ganha uma aqui (na_fatura, 1181),
-- com a chave ligada ou desligada. Lista vazia com a chave desligada, sem implantação não cancelada
-- ou com valor 0. Cada linha leva o implantacaoId.
create function implantacao_itens(a assinaturas, p_competencia date) returns jsonb
language plpgsql
set search_path = public
as $$
declare i implantacoes;
begin
  if a.primeira_competencia is null or p_competencia <> a.primeira_competencia
     or not implantacao_primeira_pendente(a.escritorio_id) then
    return '[]'::jsonb;
  end if;
  i := implantacao_do_escritorio(a.escritorio_id);
  if i.id is null and not exists (select 1 from implantacoes where escritorio_id = a.escritorio_id) then
    perform implantacao_abrir(a.escritorio_id, contexto_pessoa() is null, true);
    i := implantacao_do_escritorio(a.escritorio_id);
  end if;
  if not implantacao_na_fatura() or i.id is null or i.valor_centavos <= 0 or (implantacao_fatura(i)).id is not null then
    return '[]'::jsonb;
  end if;
  return jsonb_build_array(jsonb_build_object(
      'tipo', 'IMPLANTACAO', 'descricao', i.nome || ' · ' || i.descricao, 'quantidade', 1,
      'valorUnitarioCentavos', i.valor_centavos, 'valorCentavos', i.valor_centavos, 'implantacaoId', i.id))
    || case when i.condicao = 'ISENTA' then jsonb_build_array(jsonb_build_object(
      'tipo', 'ISENCAO', 'descricao', 'Isenção da implantação · ' || i.condicao_texto, 'quantidade', 1,
      'valorUnitarioCentavos', -i.valor_centavos, 'valorCentavos', -i.valor_centavos, 'implantacaoId', i.id))
       else '[]'::jsonb end;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A emissão (corpo da 1170; muda só o que está marcado com CO-08)

create or replace function cobranca_emitir(a assinaturas, p_competencia date, p_avisar boolean default true,
                                           p_sistema boolean default false) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_conta jsonb;
  v_parcela assinatura_carne_parcelas;
  v_carne assinatura_carnes;
  v_venc date := vencimento_de(p_competencia, a.dia_vencimento);
  v_plano text := (select nome from planos where id = a.plano_id);
  v_item jsonb;
  v_ordem integer := 0;
  v_impl jsonb;
begin
  -- CO-08: na 1ª fatura, abre a implantação de quem ainda não tem e junta as linhas dela (com a
  -- chave ligada). A implantação cobrada não vai no carnê: recusa antes de gerar o carnê.
  v_impl := implantacao_itens(a, p_competencia);
  if a.forma = 'CARNE' then perform implantacao_recusar_carne(a); end if;

  if a.forma = 'CARNE' then
    select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
     where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
       and p.situacao = 'A_VENCER' and p.fatura_id is null
     order by c.gerado_em desc limit 1;
    if v_parcela.id is null then
      perform cobranca_gerar_carne(a, p_competencia, p_sistema);
      select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
       where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
         and p.situacao = 'A_VENCER' and p.fatura_id is null
       order by c.gerado_em desc limit 1;
    end if;
    select * into v_carne from assinatura_carnes where id = v_parcela.carne_id;
    v_venc := v_parcela.vencimento;
    v_conta := jsonb_build_object('pessoas', v_parcela.pessoas, 'totalCentavos', v_parcela.valor_centavos,
      'itens', (select jsonb_agg(case when o = 1 then i || jsonb_build_object(
                    'descricao', 'Parcela ' || v_parcela.numero || ' de ' || v_carne.parcelas || ' do carnê ' || v_carne.numero
                                 || ' · plano ' || v_plano || ' · ' || mes_por_extenso(p_competencia)) else i end order by o)
                  from jsonb_array_elements(v_parcela.itens) with ordinality t(i, o)));
  else
    v_conta := cobranca_itens_da(a, p_competencia);
    v_conta := jsonb_set(v_conta, '{itens}', (select jsonb_agg(case when i ->> 'tipo' = 'DESCONTO'
                                                                    then i || jsonb_build_object('motivo', a.desconto_motivo) else i end order by o)
                                                from jsonb_array_elements(v_conta -> 'itens') with ordinality t(i, o)));
  end if;

  -- CO-08: as linhas da implantação vão ao fim e entram no total (a isenta soma zero).
  if jsonb_array_length(v_impl) > 0 then
    v_conta := jsonb_set(v_conta, '{itens}', (v_conta -> 'itens') || v_impl);
    v_conta := jsonb_set(v_conta, '{totalCentavos}', to_jsonb((v_conta ->> 'totalCentavos')::int
                 + (select sum((x ->> 'valorCentavos')::int) from jsonb_array_elements(v_impl) x)::int));
  end if;

  insert into faturas (escritorio_id, assinatura_id, competencia, vencimento, plano_nome, forma, pessoas_ativas, total_centavos,
                       carne_parcela_id, pix_copia_cola, linha_boleto)
  values (a.escritorio_id, a.id, p_competencia, v_venc, v_plano, a.forma, (v_conta ->> 'pessoas')::int, (v_conta ->> 'totalCentavos')::int,
          v_parcela.id, v_parcela.pix_copia_cola, v_parcela.linha_boleto)
  returning id into v_id;
  for v_item in select * from jsonb_array_elements(v_conta -> 'itens') loop
    v_ordem := v_ordem + 1;
    insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos, motivo,
                              implantacao_id)
    values (a.escritorio_id, v_id, v_ordem, v_item ->> 'tipo', v_item ->> 'descricao', (v_item ->> 'quantidade')::int,
            (v_item ->> 'valorUnitarioCentavos')::int, (v_item ->> 'valorCentavos')::int,
            case when v_item ->> 'tipo' = 'DESCONTO' then nullif(btrim(v_item ->> 'motivo'), '') end,
            (v_item ->> 'implantacaoId')::uuid);
  end loop;
  -- A soma dos itens é o total, conferida aqui (desenho, "Para quem for programar").
  if (select sum(valor_centavos) from fatura_itens where fatura_id = v_id) <> (v_conta ->> 'totalCentavos')::int
     and (v_conta ->> 'totalCentavos')::int > 0 then
    raise exception 'A soma dos itens não fecha com o total da fatura' using errcode = 'TC422';
  end if;
  if v_parcela.id is not null then
    update assinatura_carne_parcelas set fatura_id = v_id where id = v_parcela.id;
  end if;
  perform cobranca_evento(a.id, v_id, 'fatura.emitida', jsonb_build_object(
    'competencia', p_competencia, 'vencimento', v_venc, 'totalCentavos', (v_conta ->> 'totalCentavos')::int,
    'pessoas', (v_conta ->> 'pessoas')::int, 'parcela', v_parcela.numero,
    'implantacao', case when jsonb_array_length(v_impl) > 0 then jsonb_build_object(
      'id', v_impl -> 0 ->> 'implantacaoId', 'valorCentavos', (v_impl -> 0 ->> 'valorCentavos')::int,
      'isenta', jsonb_array_length(v_impl) = 2) end), p_sistema);
  if p_avisar and contrato_situacao(a.escritorio_id) in ('ABERTO', 'MARCADO') then
    perform cobranca_enfileirar(v_id, 'EMITIDA');
  end if;
  return v_id;
end $$;

-- O que falta emitir (corpo da 0690). CO-08: a rotina (sem pessoa no contexto: a diária e o
-- passo do teste da 1161 do CO-09, que chama cobranca_comecar) não emite a 1ª fatura de quem tem a
-- implantação cobrada no carnê: pula o escritório e deixa o evento implantacao.carne_recusado,
-- uma vez por dia, para a recusa não travar os outros. Quem está numa tela recebe a recusa da
-- emissão (IMPLANTACAO_COBRADA_NO_CARNE). O aviso no sino é do F1.46.
create or replace function cobranca_emitir_pendentes(p_assinatura uuid, p_sistema boolean default true) returns integer
language plpgsql
set search_path = public
as $$
declare
  a assinaturas;
  v_comp date;
  v_n integer := 0;
  v_dias integer := configuracao_int('cobranca_emitir_dias_antes');
begin
  select * into a from assinaturas where id = p_assinatura;
  if a.primeira_competencia is null or contrato_situacao(a.escritorio_id) not in ('ABERTO', 'MARCADO') then
    return 0;
  end if;
  if contexto_pessoa() is null and implantacao_cobrada_no_carne(a) then
    if not exists (select 1 from fatura_eventos e where e.assinatura_id = a.id and e.acao = 'implantacao.carne_recusado'
                      and (e.ocorrido_em at time zone 'America/Sao_Paulo')::date = hoje_brasilia()) then
      perform cobranca_evento(a.id, null, 'implantacao.carne_recusado', jsonb_build_object(
        'competencia', a.primeira_competencia, 'motivo', 'IMPLANTACAO_COBRADA_NO_CARNE'), true);
    end if;
    return 0;
  end if;
  v_comp := a.primeira_competencia;
  loop
    exit when v_comp <> a.primeira_competencia and vencimento_de(v_comp, a.dia_vencimento) - v_dias > hoje_brasilia();
    exit when v_comp > competencia_de(hoje_brasilia()) + interval '2 months';
    if not exists (select 1 from faturas f where f.escritorio_id = a.escritorio_id and f.competencia = v_comp) then
      perform cobranca_emitir(a, v_comp, true, p_sistema);
      v_n := v_n + 1;
    end if;
    v_comp := (v_comp + interval '1 month')::date;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. As recusas do carnê com a implantação cobrada, nos caminhos que levam à emissão

-- Salvar a assinatura com carnê (preparar, editar e o carnê novo, que sobe a versão por um update
-- de forma): todo update que passa pela forma e toda assinatura nova.
create function implantacao_carne_na_assinatura() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform implantacao_recusar_carne(new);
  return null;
end $$;
create trigger implantacao_carne_na_assinatura after insert or update of forma on assinaturas
  for each row when (new.forma = 'CARNE')
  execute function implantacao_carne_na_assinatura();

-- Gerar um carnê (o carnê novo, a troca do carnê pelo plano, pelo dia, pelo desconto ou pelas
-- parcelas, e a ida para o carnê já com a cobrança começada).
create function implantacao_carne_ao_gerar() returns trigger
language plpgsql
set search_path = public
as $$
declare a assinaturas;
begin
  select * into a from assinaturas where id = new.assinatura_id;
  perform implantacao_recusar_carne(a);
  return new;
end $$;
create trigger implantacao_carne_ao_gerar before insert on assinatura_carnes
  for each row execute function implantacao_carne_ao_gerar();

-- A conclusão (Ativo), pela aba Implantação ou pela aba Contrato: corpo da 1181, com a recusa antes
-- de concluir. Com o teste do CO-09 a 1ª fatura sai depois; a recusa vale aqui também.
create or replace function implantacao_segue_o_estagio() returns trigger
language plpgsql
set search_path = public
as $$
declare v_tr text[]; a assinaturas;
begin
  if new.estado = 'ATIVO' then
    select * into a from assinaturas where escritorio_id = new.escritorio_id;
    perform implantacao_recusar_carne(a);
    perform implantacao_concluir_aberta(new.escritorio_id);
  elsif new.estado = 'ENCERRADO' then
    if exists (select 1 from implantacoes where escritorio_id = new.escritorio_id and estado = 'ABERTA') then
      v_tr := implantacao_transicao_guardar();
      perform definir_transicao('IMPLANTACAO_CANCELADA', 'Fim do contrato', contexto_pessoa() is null);
      update implantacoes set estado = 'CANCELADA' where escritorio_id = new.escritorio_id and estado = 'ABERTA';
      perform implantacao_transicao_voltar(v_tr);
    end if;
  elsif new.estado = 'IMPLANTACAO' and old.estado = 'ENCERRADO'
        and exists (select 1 from implantacoes where escritorio_id = new.escritorio_id and estado = 'CANCELADA') then
    -- O encerramento foi na implantação: abre a seguinte, com a regra do dia e o prazo de hoje.
    perform implantacao_inserir(new.escritorio_id, hoje_brasilia(), 'Retomada do contrato', false);
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O bloco "implantacao" nas leituras (plano, 5.1 e 6)

-- {id, numero, estado, nome, descricao, condicao, condicaoTexto, naFatura (a chave), faturada,
--  faturaId, faturaNumero, faturaCompetencia, naPrimeiraFatura (as linhas ainda vão na 1ª fatura)}
-- e, só com p_valor, valorCentavos. Nulo sem implantação. A cancelada aparece como cancelada.
create function implantacao_cobranca_json(p_escritorio uuid, p_valor boolean) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare i implantacoes; f faturas;
begin
  i := implantacao_do_escritorio(p_escritorio);
  if i.id is null then
    select * into i from implantacoes where escritorio_id = p_escritorio order by numero desc limit 1;
  end if;
  if i.id is null then return null; end if;
  f := implantacao_fatura(i);
  return jsonb_build_object(
    'id', i.id, 'numero', i.numero, 'estado', i.estado, 'nome', i.nome, 'descricao', i.descricao,
    'condicao', i.condicao, 'condicaoTexto', i.condicao_texto,
    'naFatura', implantacao_na_fatura(),
    'faturada', f.id is not null, 'faturaId', f.id, 'faturaNumero', f.numero, 'faturaCompetencia', f.competencia,
    'naPrimeiraFatura', implantacao_na_fatura() and f.id is null and i.estado <> 'CANCELADA' and i.valor_centavos > 0
                        and implantacao_primeira_pendente(p_escritorio))
    || case when p_valor then jsonb_build_object('valorCentavos', i.valor_centavos) else '{}'::jsonb end;
end $$;

-- A aba Assinatura (envolve a da 0860): a condição para quem vê a ficha; o valor só para quem vê
-- os valores (Administração e Financeiro; console-cobranca/NOTAS.md:146).
alter function console_assinatura(uuid, uuid) rename to console_assinatura_sem_implantacao;

create function console_assinatura(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb := console_assinatura_sem_implantacao(p_pessoa, p_escritorio);
begin
  return r || jsonb_build_object('implantacao',
    implantacao_cobranca_json(p_escritorio, coalesce((r ->> 'valores')::boolean, false)));
end $$;

-- Plano e faturas do Portal (envolve a da 1171). Só o sócio dono chega aqui (portal.faturas.ver).
alter function portal_plano_faturas(uuid, uuid) rename to portal_plano_faturas_sem_implantacao;

create function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb := portal_plano_faturas_sem_implantacao(p_pessoa, p_escritorio);
begin
  return r || jsonb_build_object('implantacao', implantacao_cobranca_json(p_escritorio, true));
end $$;

-- O documento da fatura e do recibo (envolve a da 1170): a implantação das linhas desta fatura,
-- como estava na emissão. Só sai pelo Console (console.cobranca.ver) e pelo sócio dono no Portal.
alter function cobranca_documento_json(faturas) rename to cobranca_documento_json_sem_implantacao;

create function cobranca_documento_json(f faturas) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare i implantacoes;
begin
  select m.* into i from fatura_itens it join implantacoes m on m.escritorio_id = it.escritorio_id and m.id = it.implantacao_id
   where it.fatura_id = f.id and it.tipo = 'IMPLANTACAO' limit 1;
  return cobranca_documento_json_sem_implantacao(f) || jsonb_build_object('implantacao',
    case when i.id is not null then jsonb_build_object(
      'nome', i.nome, 'descricao', i.descricao, 'condicao', i.condicao, 'condicaoTexto', i.condicao_texto,
      'valorCentavos', i.valor_centavos) end);
end $$;

call fechar_acesso();
