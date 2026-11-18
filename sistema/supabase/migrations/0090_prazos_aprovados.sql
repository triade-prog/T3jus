-- 0090 · Prazos do inventário aprovados pela Carol em 17/11/2026, às 23h16 de Brasília (PT-11).
-- Os nove prazos propostos na 0070 viram APROVADO sem mudança de texto. A partir daqui, a
-- rotina noturna (0080) aplica o que já sabe aplicar. Mudar um prazo é com uma migration nova.

update inventario_dados set situacao = 'APROVADO' where dado_pessoal and situacao = 'PROPOSTA';
