-- 1100 · O êxito com baixa sem receber na divisão do alvará (F3.174; FI-24, FI-05, FI-25).
-- Plano (v2, seção A) e desenho (D38) aprovados pela Carol em 26/11/2026, às 18h44 (Bahia), em
-- docs/design/aprovadas/portal-exito-baixado-alvara, com as respostas:
--   A1. não registrar os honorários com o êxito baixado: a janela pede "Desfazer a baixa antes de
--       dividir" (na mesma transação do registrar) ou "Manter a baixa e tirar os honorários" (fica
--       no histórico do repasse). Com a baixa renegociada, só desfazer;
--   A2. sim: as custas que tiveram baixa junto voltam e entram na divisão como reembolso.
--
-- O que muda:
--   - a divisão proposta traz exitoBaixado (exito_parcelas_baixadas), com a baixa inteira;
--   - o registrar trava as parcelas do êxito do cliente no caso, confere a corrida
--     (exitoBaixadoVisto, EXITO_MUDOU), desfaz a baixa pedida (desfazerBaixa) chamando o desfazer
--     que já existe, e só então chama o corpo. Com o êxito ainda baixado, recusa os honorários
--     (EXITO_BAIXADO); sem eles, grava financeiro.levantamento_exito_mantido, sem a explicação.
--     A recusa em qualquer passo desfaz tudo, inclusive o desfazer da baixa;
--   - a ficha do repasse mostra quem deu a baixa mantida (o histórico guarda só o id).
-- Nenhuma tabela, coluna ou gatilho novo. As funções que outras frentes também mudam são achadas
-- pelo conteúdo e trocadas por trecho exato (como a 1010), porque em produção elas podem ter
-- entrado em outra ordem.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1010_trocar).
create function t1100_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- A única função do public cujo corpo tem o trecho (senão, para a migration).
create function t1100_achar(p_trecho text) returns regprocedure
language plpgsql
as $$
declare
  v_oids oid[] := array(select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and strpos(p.prosrc, p_trecho) > 0);
begin
  if cardinality(v_oids) <> 1 then
    raise exception 'O trecho aparece em % funções (esperada 1): %', cardinality(v_oids), left(p_trecho, 80);
  end if;
  return v_oids[1]::regprocedure;
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. As parcelas do êxito do cliente no caso com baixa sem receber em vigor. O recorte é o de
-- exito_parcelas_abertas (0651), sem a importação desfeita. A explicação vai junto porque só quem
-- tem a área Financeiro abre a divisão (PT-02).
create function exito_parcelas_baixadas(p_escritorio uuid, p_caso uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'parcelaId', r.id, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
           'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'estado', c.estado),
           'baixa', parcela_baixa_json(b))
         order by r.vencimento, r.id), '[]'::jsonb)
    from recebimentos_previstos r
    join exitos_conferir x on x.id = r.exito_id
    join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
    join parcela_baixas b on b.id = r.baixa_id
    left join importacoes i on i.id = c.importacao_id
   where r.escritorio_id = p_escritorio and x.caso_id = p_caso and x.cliente_id = p_cliente
     and r.baixa_id is not null and r.valor is not null
     and (i.id is null or i.estado <> 'DESFEITA')
$$;

-- A última baixa ou desfazer de parcela (sem as custas) do êxito do cliente no caso: o detalhe da
-- recusa EXITO_MUDOU (quem e quando).
create function exito_ultima_mudanca(p_escritorio uuid, p_caso uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('motivo', 'EXITO_MUDOU') || coalesce((
    select jsonb_build_object('tipo', b.tipo, 'por', pessoa_ref(b.feito_por), 'em', b.feito_em, 'parcelaId', b.parcela_id)
      from parcela_baixas b
      join recebimentos_previstos r on r.id = b.parcela_id
      join exitos_conferir x on x.id = r.exito_id
     where b.escritorio_id = p_escritorio and x.caso_id = p_caso and x.cliente_id = p_cliente
       and b.reembolso_conta_id is null
       and not exists (select 1 from parcela_baixas a where a.id = b.desfaz_id and a.reembolso_conta_id is not null)
     order by b.ordem desc limit 1), '{}'::jsonb)
$$;

-- O que a ficha do repasse mostra de um evento: na baixa mantida, quem deu a baixa (o histórico
-- guarda só o id, PT-03).
create function levantamento_historico_dados(p_acao text, p_dados jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select case when p_acao = 'financeiro.levantamento_exito_mantido' and jsonb_typeof(p_dados -> 'baixas') = 'array' then
    p_dados || jsonb_build_object('baixas', (
      select coalesce(jsonb_agg(b || jsonb_build_object('por', (select pessoa_ref(p.id) from pessoas p where p.id::text = b ->> 'por'))
                                order by o), '[]'::jsonb)
        from jsonb_array_elements(p_dados -> 'baixas') with ordinality t(b, o)))
  else p_dados end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. A divisão proposta traz o êxito baixado (decisão 2). Quem já chama a proposta lê só linhas.
select t1100_trocar('repasse_proposta(uuid,uuid,uuid,bigint)',
  $q$from exito_parcelas_abertas(p_escritorio, p_caso, p_cliente) e))$q$,
  $q$from exito_parcelas_abertas(p_escritorio, p_caso, p_cliente) e),
    -- F3.174: o êxito com baixa sem receber, para a escolha da janela de registrar.
    'exitoBaixado', exito_parcelas_baixadas(p_escritorio, p_caso, p_cliente))$q$);

-- ---------------------------------------------------------------------------------------
-- 3. O registrar (decisão 6): o embrulho da 0651, achado pelo conteúdo.
select t1100_trocar(t1100_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  v jsonb := financeiro_levantamento_registrar_sem_exito(p_pessoa, p_escritorio, p_dados);$q$,
  $q$  v jsonb;
  -- F3.174: o êxito com baixa sem receber.
  v_caso uuid;
  v_cliente uuid;
  v_baixadas jsonb := '[]'::jsonb;
  v_visto jsonb := p_dados -> 'exitoBaixadoVisto';
  v_desf jsonb := p_dados -> 'desfazerBaixa';
  v_desf_id uuid;
  v_desf_parcela uuid;
  v_desf_baixa jsonb;
  v_desfeita jsonb;$q$);

select t1100_trocar(t1100_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$begin
  select * into l from levantamentos where id = (v ->> 'id')::uuid;$q$,
  $q$begin
  -- F3.174, passo 2: antes do corpo, com o contexto do escritório (o RLS só mostra a linha depois).
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  if v_visto is not null and jsonb_typeof(v_visto) <> 'array' then
    perform recusar_campos('Confira o êxito da divisão.', 'exitoBaixadoVisto');
  end if;
  if v_desf is not null and jsonb_typeof(v_desf) not in ('object', 'null') then
    perform recusar_campos('Confira o êxito da divisão.', 'desfazerBaixa');
  end if;
  begin
    v_caso := (p_dados ->> 'casoId')::uuid;
    v_cliente := (p_dados ->> 'clienteId')::uuid;
  exception when invalid_text_representation then
    v_caso := null;
    v_cliente := null;
  end;
  if v_caso is not null and v_cliente is not null then
    -- A mesma linha que a baixa e o desfazer travam (1010): a corrida termina numa ordem só.
    perform 1 from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id
     where r.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
     order by r.id for update of r;
    v_baixadas := exito_parcelas_baixadas(p_escritorio, v_caso, v_cliente);
    -- A corrida: o que a tela viu precisa ser o que está em vigor agora. Sem o campo (cliente
    -- antigo), o passo é pulado.
    if jsonb_typeof(v_visto) = 'array'
       and (select coalesce(array_agg(distinct lower(t) order by lower(t)), '{}') from jsonb_array_elements_text(v_visto) t)
           is distinct from (select coalesce(array_agg(distinct b -> 'baixa' ->> 'id' order by b -> 'baixa' ->> 'id'), '{}')
                               from jsonb_array_elements(v_baixadas) b) then
      raise exception 'O êxito deste cliente mudou enquanto você dividia' using errcode = 'TC409',
        detail = exito_ultima_mudanca(p_escritorio, v_caso, v_cliente)::text;
    end if;
    -- O desfazer pedido, pelo desfazer que já existe, com todas as conferências dele.
    if jsonb_typeof(v_desf) = 'object' then
      begin
        v_desf_id := (v_desf ->> 'baixaId')::uuid;
      exception when invalid_text_representation then
        v_desf_id := null;
      end;
      select (b ->> 'parcelaId')::uuid, b -> 'baixa' into v_desf_parcela, v_desf_baixa
        from jsonb_array_elements(v_baixadas) b where b -> 'baixa' ->> 'id' = v_desf_id::text;
      if v_desf_parcela is null then
        raise exception 'O êxito deste cliente mudou enquanto você dividia' using errcode = 'TC409',
          detail = exito_ultima_mudanca(p_escritorio, v_caso, v_cliente)::text;
      end if;
      v_desfeita := portal_financeiro_parcela_baixa_desfazer(p_pessoa, p_escritorio, v_desf_parcela,
                      jsonb_build_object('explicacao', v_desf ->> 'explicacao'));
    end if;
  end if;

  -- Passo 3: o corpo, depois do desfazer (as custas que foram juntas já não estão baixadas
  -- quando ele confere as linhas de reembolso: pergunta A2).
  v := financeiro_levantamento_registrar_sem_exito(p_pessoa, p_escritorio, p_dados - 'exitoBaixadoVisto' - 'desfazerBaixa');
  select * into l from levantamentos where id = (v ->> 'id')::uuid;

  -- Passo 4: a rede. Com o êxito ainda baixado, nenhuma parte de honorários (também a mandada à
  -- mão). A renegociada só se desfaz (pergunta A1, b): não registra sem desfazer.
  v_baixadas := exito_parcelas_baixadas(p_escritorio, l.caso_id, l.cliente_id);
  if jsonb_array_length(v_baixadas) > 0
     and (exists (select 1 from destinacoes x where x.levantamento_id = l.id and x.para = 'HONORARIOS' and x.valor > 0)
          or exists (select 1 from jsonb_array_elements(v_baixadas) b where b -> 'baixa' ->> 'motivo' = 'RENEGOCIADA')) then
    raise exception 'O êxito deste cliente está com baixa sem receber' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'EXITO_BAIXADO',
                 'baixas', (select jsonb_agg(b -> 'baixa' ->> 'id') from jsonb_array_elements(v_baixadas) b),
                 'renegociada', exists (select 1 from jsonb_array_elements(v_baixadas) b where b -> 'baixa' ->> 'motivo' = 'RENEGOCIADA'))::text;
  end if;

  -- Passo 5: o rastro, sem a explicação da baixa (PT-02) e sem nome (o histórico guarda o id).
  if jsonb_array_length(v_baixadas) > 0 then
    perform registrar_historico('financeiro.levantamento_exito_mantido', 'levantamentos', l.id::text,
      jsonb_build_object('tipo', l.tipo, 'baixas', (
        select jsonb_agg(jsonb_build_object('baixa', b -> 'baixa' ->> 'id', 'parcela', b ->> 'parcelaId', 'descricao', b ->> 'descricao',
                                            'motivo', b -> 'baixa' ->> 'motivo', 'valor', (b -> 'baixa' ->> 'valor')::bigint,
                                            'por', b -> 'baixa' -> 'por' ->> 'id', 'em', b -> 'baixa' ->> 'em'))
          from jsonb_array_elements(v_baixadas) b)));
  end if;
  if v_desfeita is not null then
    perform registrar_historico('financeiro.levantamento_exito_desfeito', 'levantamentos', l.id::text,
      jsonb_build_object('tipo', l.tipo, 'baixaDesfeita', jsonb_build_object('baixa', v_desf_id, 'parcela', v_desf_parcela,
                         'motivo', v_desf_baixa ->> 'motivo', 'valor', (v_desf_baixa ->> 'valor')::bigint,
                         'reembolsos', jsonb_array_length(coalesce(v_desf_baixa -> 'reembolsos', '[]'::jsonb)))));
  end if;$q$);

-- O registrar devolve a baixa desfeita, para o aviso da tela.
select t1100_trocar(t1100_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  return v || jsonb_build_object('exitoBaixado', v_baixas);$q$,
  $q$  return v || jsonb_build_object('exitoBaixado', v_baixas, 'baixaDesfeita', v_desfeita is not null);$q$);

-- ---------------------------------------------------------------------------------------
-- 4. A ficha do repasse (o corpo da 0280, achado pelo conteúdo): o histórico com quem deu a baixa mantida.
select t1100_trocar(t1100_achar($q$h.entidade = 'levantamentos' and h.entidade_id = l.id::text$q$),
  $q$'por', pessoa_ref(h.autor_id), 'dados', h.dados)$q$,
  $q$'por', pessoa_ref(h.autor_id), 'dados', levantamento_historico_dados(h.acao, h.dados))$q$);

drop function t1100_trocar(regprocedure, text, text, integer);
drop function t1100_achar(text);

call fechar_acesso();
