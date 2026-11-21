-- 0653 · A marca do escritório (logo ou nome em letra) também na proposta em Word (F3.92, AP-05).
-- Pergunta 10 do desenho aprovado em docs/design/aprovadas/portal-nao-paga-logo: o logo vai também
-- para a proposta em Word, numa próxima entrega. A marca é a mesma do carnê e do recibo
-- (marca_do_escritorio, 0601): com o logo, ele entra no cabeçalho do .docx no lugar do nome, ou ao
-- lado dele; em uma cor só, sai em preto; sem logo, o cabeçalho segue com o nome em letra.

-- A marca de hoje, para os documentos que a API monta. Toda a equipe do escritório lê, como o
-- logo na tela (GET /v1/escritorio/logos/:id).
create function portal_recebimento_marca(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  return marca_do_escritorio(p_escritorio);
end $$;

call fechar_acesso();
