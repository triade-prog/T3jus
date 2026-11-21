-- A IA reconhece o pedido de não receber avisos (F3.83; PA-03). Desenho aprovado em
-- docs/design/aprovadas/portal-pendencias-pequenas (pergunta 4): a IA passa a conversa para a
-- equipe com o motivo "Pedido para não receber avisos". Ela não registra nada sozinha: quem
-- registra é uma pessoa, pelo atalho "Não receber avisos" da conversa, que já abre preenchido
-- com a mensagem do cliente, quem escreve e "Pelo WhatsApp".

alter table conversas drop constraint conversas_motivo_check;
alter table conversas add constraint conversas_motivo_check
  check (motivo in ('PROPOSTA_ACORDO', 'DOCUMENTO_NOVO', 'CLIENTE_NOVO', 'VALOR', 'ESTRATEGIA', 'RECLAMACAO', 'PEDIU_PESSOA', 'OUTRO',
                    'URGENCIA', 'NAO_SOUBE', 'IA_DESLIGADA', 'PALAVRA', 'REGRA_FIXA', 'SEM_AVISOS'));

call fechar_acesso();
