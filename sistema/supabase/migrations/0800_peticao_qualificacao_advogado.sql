-- Petições com o nome completo e a qualificação do advogado (F3.106; EX-09 e EX-15).
-- O formulário e a geração da petição passam a ler, no servidor, os dados de Sua conta de cada
-- advogado que pode assinar (pessoa_dados_documento, 0760), como o gerador de documentos já faz
-- (documento_advogados). Com eles, [ADVOGADOS_OAB] e [ADVOGADOS_ASSINATURA] saem com o nome
-- completo, e o campo novo [ADVOGADOS_QUALIFICACAO] sai com a qualificação inteira. O que falta
-- não bloqueia e sai marcado (decisão 3 da Sua conta). 'eu' diz à tela se o link de completar
-- vai para Sua conta ou para a Equipe. Só muda a função; nenhuma tabela nova.

create or replace function peticao_dados(p_pessoa uuid, p_escritorio uuid, c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'caso', jsonb_build_object('id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'vara', c.vara, 'tribunal', c.tribunal,
                               'sistema', c.sistema, 'parteContraria', c.parte_contraria, 'parteContrariaQualificacao', c.parte_contraria_qualificacao,
                               'valorCausa', c.valor_causa, 'responsavel', pessoa_ref(c.responsavel_id)),
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'nome', k.nome, 'tipo', k.tipo, 'papel', cc.papel, 'documento', k.documento, 'nacionalidade', k.nacionalidade,
        'estadoCivil', k.estado_civil, 'profissao', k.profissao, 'rg', k.rg, 'rgOrgao', k.rg_orgao, 'endereco', k.endereco,
        'bairro', k.bairro, 'cidade', k.cidade, 'uf', k.uf, 'cep', k.cep, 'repNome', k.rep_nome, 'repCargo', k.rep_cargo) order by cc.ordem)
        from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
       where cc.caso_id = c.id), '[]'::jsonb),
    'advogados', coalesce((
      select jsonb_agg(jsonb_build_object('pessoaId', p.id, 'nome', p.nome, 'responsavel', p.id = c.responsavel_id,
                                          'socioDono', e_socio_dono(p.id, c.escritorio_id), 'inscricoes', oab_inscricoes(p.id, c.escritorio_id),
                                          'dados', pessoa_dados_json(p.id, c.escritorio_id))
                       order by p.id <> c.responsavel_id, not e_socio_dono(p.id, c.escritorio_id), p.nome)
        from pessoas p
       where peticao_membro(p.id, c.escritorio_id) and peticao_tem_oab(p.id, c.escritorio_id)), '[]'::jsonb),
    'semOab', coalesce((
      select jsonb_agg(pessoa_ref(p.id) order by p.nome)
        from pessoas p
       where peticao_membro(p.id, c.escritorio_id) and not peticao_tem_oab(p.id, c.escritorio_id)
         and 'JURIDICO' = any (areas_da_pessoa(p.id, c.escritorio_id))), '[]'::jsonb),
    'escritorio', (select jsonb_build_object('nome', e.nome, 'endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf) from escritorios e where e.id = c.escritorio_id),
    'hoje', hoje_brasilia(),
    'eu', p_pessoa,
    'revisor', (select pessoa_ref(r.revisor) from peticao_revisor(p_pessoa, c.escritorio_id, c.id) r),
    'semRevisao', (select r.sem_revisao from peticao_revisor(p_pessoa, c.escritorio_id, c.id) r))
$$;

call fechar_acesso();
