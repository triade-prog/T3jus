-- 0040 · Revogar vínculo (F0.7; PT-21)
-- Revogado não age mais em lugar nenhum (pode, sessão escolhida, lista de escritórios), e a
-- autoria antiga fica no histórico. A revogação segue a versão lida (PT-19).
--
-- Padrão de toda função da API daqui em diante: recebe a pessoa e o escritório que a
-- sessão validou no servidor, entra no escritório para a ação e só então lê ou altera.
-- Quem pode revogar entra em funcao_acoes com a tela de pessoas autorizadas (passo 2, DC8).

create function revogar_vinculo(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid, p_versao integer) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'vinculos.revogar');

  update vinculos set revogado_em = app_now(), revogado_por = p_pessoa
   where id = p_vinculo and versao = p_versao and revogado_em is null
  returning versao into v_versao;
  if v_versao is null then
    perform conflito_versao('vinculos', p_vinculo);
  end if;
  perform registrar_historico('vinculo.revogado', 'vinculo', p_vinculo::text, '{}'::jsonb);
  return v_versao;
end $$;

call fechar_acesso();
