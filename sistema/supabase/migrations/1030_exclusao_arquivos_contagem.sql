-- "O que é apagado" com os arquivos do cliente na janela de exclusão a pedido do titular (F3.155;
-- PT-11), pelo desenho aprovado em docs/design/aprovadas/portal-exclusao-arquivos (Carol,
-- 24/11/2026: a linha vem logo depois da qualificação, só quando há arquivo; "O que fica" não muda;
-- sem lembrete para baixar antes).
--
-- A ficha ganha a chave arquivosParaApagar, com o que a exclusão (0970, cliente_arquivos_apagar)
-- vai apagar, contado:
--   * documentos: os documentos pessoais prontos e não apagados, de qualquer tipo menos os termos.
--     Os substituídos entram: o arquivo existe, fica guardado e sai na exclusão. Por isso o número
--     pode ser maior que o da folha "Documentos pessoais", que conta só os em uso (e os que faltam).
--     Isso é de propósito: não "corrigir" (revisão, M2). Os ENVIANDO não entram: o envio pode não
--     ter terminado e eles não aparecem na ficha; a fila os cobre mesmo assim;
--   * curatela e tutela: se há algum termo pronto e não apagado de cada tipo, em uso ou só guardado.
--     É booleano de propósito: o texto diz "o termo", mesmo com um termo trocado (revisão, M3);
--   * propostas: todas as do cliente, como a fila. O banco não sabe se o Word foi gerado (decisão 6
--     do desenho); a contagem é por proposta, e a fila é por versão do Word.
-- A contagem fica igual ou menor que a fila, nunca maior.
--
-- Quem recebe: só a sócia dona, no cliente que ela pode excluir (ATIVO ou INATIVO, sem contrato nem
-- processo). Com contrato ou processo, a janela é a de arquivar, que não apaga nada. Fora disso a
-- chave não vem (ausente, não null). O estado é indispensável: no ARQUIVADO e no EXCLUIDO,
-- vinculosLgpd também vem null.
--
-- Funções recriadas e de onde partem:
--   portal_cliente ............ 0960 (o embrulho; 0970, 0971, 0990 e 1000 não a recriam)
-- Nova: cliente_arquivos_para_apagar (não é security definer: só o embrulho a chama, depois do
-- entrar_escritorio de portal_cliente_sem_termo).
--
-- Acoplamento: quem mudar cliente_arquivos_apagar (0970) confere esta contagem, e vice-versa.
-- Sem tabela nova nem mudança no inventário: a contagem não é dado pessoal.

-- O que a exclusão a pedido do titular apaga (0970, cliente_arquivos_apagar), contado para a janela.
-- Documentos: prontos e não apagados, de qualquer tipo menos os termos, com os substituídos (o arquivo
-- existe); sem os ENVIANDO (o envio não terminou; a fila os cobre mesmo assim). Termos: há algum, em
-- uso ou guardado. Propostas: todas as do cliente, como a fila (o banco não sabe se o Word foi gerado).
create function cliente_arquivos_para_apagar(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'documentos', count(*) filter (where not tipo_termo_responsavel(d.tipo)),
    'curatela', coalesce(bool_or(d.tipo = 'TERMO_CURATELA'), false),
    'tutela', coalesce(bool_or(d.tipo = 'TERMO_TUTELA'), false),
    'propostas', (select count(*) from propostas p where p.escritorio_id = p_escritorio and p.cliente_id = p_cliente))
    from cliente_documentos d
   where d.escritorio_id = p_escritorio and d.cliente_id = p_cliente and d.situacao = 'PRONTO' and d.apagado_em is null
$$;

-- A ficha: o corpo da 0960, letra por letra, com a contagem no fim.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
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
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO')
     and jsonb_typeof(f -> 'vinculosLgpd') is distinct from 'object' then
    f := f || jsonb_build_object('arquivosParaApagar', cliente_arquivos_para_apagar(p_escritorio, p_cliente));
  end if;
  return f;
end $$;

call fechar_acesso();
