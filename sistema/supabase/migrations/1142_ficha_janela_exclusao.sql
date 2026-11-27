-- A ficha do cliente com o que a janela de exclusão (e a de arquivar) precisa saber a mais (F3.181,
-- F3.186, F3.190, a C9 e as linhas da F3.179 e da F3.193; PT-11), pelo plano revisado (project-files
-- t3jus/f3-181-190/plano.md, seção 6, e revisao.md, M2, M5 e M7). Desenho aprovado em
-- docs/design/aprovadas/portal-exclusao-contratos-conversas (NOTAS.md, "O campo que o servidor
-- devolve"). O outro cadastro com o mesmo CPF (F3.188, mesmoDocumento) fica para a próxima entrega.
--
-- 1. cliente_assina_por_outro(p_escritorio, p_cliente) (C9 = A; revisão, M7): os outros clientes do
--    escritório, não excluídos, em que o CPF dele aparece como quem assina: mãe, pai, tutora, tutor,
--    curadora ou curador (rl_documento), quem assina pela empresa (rep_documento) ou quem assinava
--    até os 18 (clientes_quem_assinava.documento). O papel já vem em texto, e "feminino" diz o gênero
--    de quem assina quando o papel o mostra (null pela empresa). Esses dados ficam na ficha do outro,
--    porque servem ao contrato dele; a janela só avisa. Sem índice: roda só para a dona, na ficha do
--    cliente que ela pode excluir (revisão, M7, o EXPLAIN decide).
-- 2. cliente_bases_de_condicao(p_escritorio, p_cliente) (F3.179, D3; revisão, M2): os números das
--    propostas do cliente com o "sobre" de uma condição ÊXITO ou RECORRENTE, o que
--    comercial_apagar_do_excluido (1135) troca por "Base apagada a pedido do titular".
-- 3. cliente_baixas_com_explicacao(p_escritorio, p_cliente) (F3.193): quantas linhas de baixa das
--    parcelas dos contratos do cliente têm a explicação que parcela_baixas_excluido_limpar (1132)
--    troca. Hoje é sempre 0 na janela de excluir, porque o contrato prende o cliente; a linha existe
--    para o dia em que não prender (F3.195).
-- 4. portal_cliente: corpo da 1116, letra por letra, com as chaves novas nas mesmas condições de
--    arquivosParaApagar (só a sócia dona, cliente ATIVO ou INATIVO sem contrato nem processo):
--    saiDeContratos ({pedidos, lembretes}, 1140), conversasParaApagar (1141), assinaPorOutro,
--    basesDeCondicao e baixasComExplicacao. Com contrato ou processo (a janela de arquivar), vem só
--    saiDeContratos com os pedidos e lembretes null: o arquivar também tira o pedido de Contratos
--    (C2 = A; revisão, M5), mas o lembrete do arquivado fica na lista (R7). Fora disso, as chaves
--    não vêm. A api-portal passa a ficha adiante sem filtrar.

-- ---------------------------------------------------------------------------------------
-- 1. C9: em quem ele assina.
create function cliente_assina_por_outro(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with eu as (
    select k.documento d from clientes_escritorio k
     where k.id = p_cliente and k.escritorio_id = p_escritorio and k.tipo = 'PF' and k.documento is not null),
  x as (
    select o.id, o.nome, o.tipo,
           case o.rl_papel when 'MAE' then 'como mãe e responsável legal' when 'PAI' then 'como pai e responsável legal'
                           when 'TUTORA' then 'como tutora' when 'TUTOR' then 'como tutor'
                           when 'CURADORA' then 'como curadora' when 'CURADOR' then 'como curador' end papel,
           o.rl_papel in ('MAE', 'TUTORA', 'CURADORA') feminino, 1 ordem
      from clientes_escritorio o, eu
     where o.escritorio_id = p_escritorio and o.id <> p_cliente and o.estado <> 'EXCLUIDO' and regexp_replace(o.rl_documento, '[^0-9]', '', 'g') = eu.d
    union all
    select o.id, o.nome, o.tipo, 'pela empresa', null::boolean, 2
      from clientes_escritorio o, eu
     where o.escritorio_id = p_escritorio and o.id <> p_cliente and o.estado <> 'EXCLUIDO' and regexp_replace(o.rep_documento, '[^0-9]', '', 'g') = eu.d
    union all
    select o.id, o.nome, o.tipo, 'assinava até os 18', q.papel in ('MAE', 'TUTORA'), 3
      from clientes_quem_assinava q join clientes_escritorio o on o.id = q.cliente_id and o.escritorio_id = q.escritorio_id, eu
     where q.escritorio_id = p_escritorio and o.id <> p_cliente and o.estado <> 'EXCLUIDO' and regexp_replace(q.documento, '[^0-9]', '', 'g') = eu.d),
  um as (select distinct on (id) * from x order by id, ordem)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'tipo', tipo, 'papel', papel, 'feminino', feminino)
                            order by nome, id), '[]'::jsonb)
    from um
$$;

-- ---------------------------------------------------------------------------------------
-- 2. F3.179: as propostas cujo "sobre" vira texto fixo.
create function cliente_bases_de_condicao(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(p.numero order by p.numero), '[]'::jsonb)
    from propostas p
   where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente
     and exists (select 1 from honorario_condicoes h
                  where h.escritorio_id = p_escritorio and h.dono_tipo = 'PROPOSTA' and h.dono_id = p.id
                    and h.params is distinct from condicao_do_excluido(h.tipo, h.params))
$$;

-- ---------------------------------------------------------------------------------------
-- 3. F3.193: as explicações da baixa sem receber que viram texto fixo.
create function cliente_baixas_com_explicacao(p_escritorio uuid, p_cliente uuid) returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer from parcela_baixas b
   where b.escritorio_id = p_escritorio
     and b.parcela_id in (select r.id from recebimentos_previstos r join contratos c on c.id = r.contrato_id
                           where r.escritorio_id = p_escritorio and c.escritorio_id = p_escritorio and c.cliente_id = p_cliente)
     and b.explicacao <> baixa_explicacao_excluido()
$$;

-- ---------------------------------------------------------------------------------------
-- 4. A ficha: corpo da 1116, letra por letra, com as chaves novas no fim.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
  v_hist jsonb;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  v_tutela := cliente_termo_tutela_linha(p_escritorio, p_cliente);
  if v_tutela is null and c.tipo = 'PF' and c.capacidade = 'MENOR' and c.rl_papel in ('TUTORA', 'TUTOR')
     and cliente_assina(c) ->> 'situacao' = 'FEZ_18' then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
  end if;
  f := f || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, p_cliente), 'termoTutela', v_tutela);
  -- Só a tutora ou o tutor que assinava ganha a chave "termo", e só quando há termo guardado;
  -- sem termo, "Quem assinava" sai como antes (o 112 confere o objeto inteiro).
  if jsonb_typeof(f -> 'quemAssinava') = 'object' and f -> 'quemAssinava' ->> 'papel' in ('TUTORA', 'TUTOR') then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
    if v_tutela is not null then
      f := jsonb_set(f, '{quemAssinava,termo}', v_tutela);
    end if;
  end if;
  -- F3.155: só a sócia dona, no cliente que ela pode excluir (ativo ou inativo, sem contrato nem
  -- processo; com eles a janela é a de arquivar e nada se apaga). Sem isso, a chave não vem.
  -- F3.156: arquivosQueFicam, com as mesmas regras de quem recebe.
  -- F3.177: arquivosQueFicam.historico, só quando há lançamento do sistema antigo que fica.
  -- F3.181, F3.186, F3.190, C9, F3.179 e F3.193 (1142): saiDeContratos, conversasParaApagar,
  -- assinaPorOutro, basesDeCondicao e baixasComExplicacao, nas mesmas regras. Na janela de arquivar
  -- (com contrato ou processo), só saiDeContratos, sem os lembretes.
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO')
     and jsonb_typeof(f -> 'vinculosLgpd') is distinct from 'object' then
    v_hist := cliente_historico_anterior_que_fica(p_escritorio, p_cliente);
    f := f || jsonb_build_object('arquivosParaApagar', cliente_arquivos_para_apagar(p_escritorio, p_cliente),
                                 'arquivosQueFicam', cliente_arquivos_que_ficam(p_escritorio, p_cliente)
                                   || case when (v_hist ->> 'lancamentos')::integer > 0 then jsonb_build_object('historico', v_hist)
                                           else '{}'::jsonb end);
    f := f || jsonb_build_object(
      'saiDeContratos', jsonb_build_object('pedidos', cliente_pedidos_contrato_que_saem(p_escritorio, p_cliente),
                                           'lembretes', cliente_lembretes_que_saem(p_escritorio, p_cliente)),
      'conversasParaApagar', cliente_conversas_para_apagar(p_escritorio, p_cliente),
      'assinaPorOutro', cliente_assina_por_outro(p_escritorio, p_cliente),
      'basesDeCondicao', cliente_bases_de_condicao(p_escritorio, p_cliente),
      'baixasComExplicacao', cliente_baixas_com_explicacao(p_escritorio, p_cliente));
  elsif (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO') then
    f := f || jsonb_build_object(
      'saiDeContratos', jsonb_build_object('pedidos', cliente_pedidos_contrato_que_saem(p_escritorio, p_cliente), 'lembretes', null));
  end if;
  return f;
end $$;

call fechar_acesso();
