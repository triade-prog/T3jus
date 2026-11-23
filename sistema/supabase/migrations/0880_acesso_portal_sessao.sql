-- 0880 · Portal mais rápido no servidor (F3.136, PT-27). Plano revisado em 22/11/2026
-- (project-files t3jus/desempenho/plano-f3-136.md).
--
-- Toda chamada da api-portal conferia o acesso (acesso_portal) e depois buscava o escritório
-- da sessão (escritorio_da_sessao): duas viagens em fila até o banco. acesso_portal_sessao faz as
-- duas numa só, chamando as próprias funções (a regra continua num lugar só e não muda):
-- o acesso é conferido a cada chamada, como manda a PT-21. Só acrescenta; a api-portal de
-- antes continua funcionando com esta migration aplicada.
-- A faixa 0880-0889 é desta frente.

create or replace function acesso_portal_sessao(p_pessoa uuid, p_sessao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acesso boolean;
  v_escritorio uuid;
begin
  v_acesso := coalesce(acesso_portal(p_pessoa), false);
  if v_acesso and p_sessao is not null then
    v_escritorio := escritorio_da_sessao(p_pessoa, p_sessao);
  end if;
  return jsonb_build_object('acesso', v_acesso, 'escritorio', v_escritorio);
end $$;

call fechar_acesso();
