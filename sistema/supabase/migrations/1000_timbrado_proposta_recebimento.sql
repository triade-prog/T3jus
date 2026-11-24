-- 1000 · O timbrado de 4 linhas na proposta em .docx e na prévia de Marca e timbrado (F3.146; PA-07).
-- Plano e desenho aprovados pela Carol em 23/11/2026, 10h57 (Bahia), com todas as recomendações
-- (docs/design/aprovadas/razao-social-sobras, PLANO.md seções 5 e 12, NOTAS.md decisão 7).
-- A faixa 1000-1009 é desta frente. Sem tabela nova e sem dado novo guardado: nada muda em
-- inventario_dados.
--
-- O que se expõe, nos dois casos, é o que já vai impresso no carnê e no recibo
-- (escritorio_timbrado_json, 0890): sem sociedade, o nome completo e a OAB principal da sócia
-- dona; nunca CPF, RG, estado civil ou nacionalidade.
--   - Proposta: função própria, só para a rota do .docx (api-portal/proposta_docx.ts), para quem
--     tem a área Comercial e pode ver propostas. portal_proposta não muda: a ficha da proposta,
--     que vai inteira ao navegador, não ganha nada.
--   - Marca e timbrado: portal_recebimento abre para toda a equipe (escritorio.ver). A chave
--     `timbrado` vem só para quem tem Financeiro ou Contratos, ou é a sócia dona (o mesmo público
--     da prévia do carnê na 0890); para os outros, nula, e a prévia "só para ler" mostra a linha
--     sem o nome (opção a da pergunta 1 do plano).
--
-- As duas funções são plpgsql, e não sql: escritorio_timbrado_json lê pessoa_dados_json, que
-- depende do app.escritorio_id posto pelo entrar_*, e o acesso precisa ser conferido antes.

create function portal_proposta_timbrado(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  return escritorio_timbrado_json(p_escritorio);
end $$;

alter function portal_recebimento(uuid, uuid) rename to recebimento_sem_timbrado;
create function portal_recebimento(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := recebimento_sem_timbrado(p_pessoa, p_escritorio);
  v_areas text[] := areas_da_pessoa(p_pessoa, p_escritorio);
begin
  -- recebimento_sem_timbrado já conferiu o acesso (escritorio.ver) e pôs o escritório no contexto.
  return v || jsonb_build_object('timbrado',
    case when e_socio_dono(p_pessoa, p_escritorio) or 'FINANCEIRO' = any (v_areas) or 'CONTRATOS' = any (v_areas)
         then escritorio_timbrado_json(p_escritorio) end);
end $$;

call fechar_acesso();
