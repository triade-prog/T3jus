# Dados fictícios do D43, coerentes entre Console, Portal e PDFs. Hoje: sexta-feira, 27/11/2026.
VALOR = 149000            # R$ 1.490,00 (provisório)
MENSAL = 49900            # plano Escritório, preço aprovado pela Carol em 27/11/2026
DESC = 9980               # desconto de entrada, 20% da mensalidade (CO-10)
TOTAL_ISENTA = MENSAL - DESC              # 399,20
TOTAL_COBRADA = MENSAL - DESC + VALOR     # 1.889,20

ESC = 'Cedro &amp; Lima Advocacia'
ESC_C = 'Cedro &amp; Lima'
DESCR = 'treino de toda a equipe e acompanhamento por 30 dias'
ISENCAO_TXT = 'Oferta de lançamento'

# Pessoas com acesso ao Portal (6). (iniciais, nome, papel, convite, convite_det, treino, treino_det, treinada)
PESSOAS = [
    ('RL', 'Renata Lima', 'Sócia dona · vê tudo', 'Aceitou', 'entrou em 16/11/2026', 'Treinada', '18/11 · vídeo, 1h30', True),
    ('PC', 'Paulo Cedro', 'Sócio · vê tudo', 'Aceitou', 'entrou em 16/11/2026', 'Treinado', '18/11 · vídeo, 1h30', True),
    ('JP', 'Juliana Prado', 'Advogada · Jurídico e Contratos', 'Aceitou', 'entrou em 17/11/2026', 'Treinada', '24/11 · presencial, 2h', True),
    ('JF', 'Joana Freitas', 'Secretária · partes comuns', 'Aceitou', 'entrou em 17/11/2026', 'Treinada', '24/11 · presencial, 2h', True),
    ('TR', 'Tiago Ramos', 'Advogado · Jurídico', 'Aceitou', 'entrou em 25/11/2026', 'Sem treino', 'o registro de 24/11 foi desfeito', False),
    ('DA', 'Diego Alves', 'Estagiário · Jurídico', 'Ainda não entrou', 'convidado em 25/11/2026', 'Sem treino', 'o treino fica para depois do primeiro acesso', False),
]

# Treinos (o desfeito fica na lista, riscado)
TREINOS = [
    dict(dia='24', mes='nov', data='24/11/2026', forma='Presencial', ico='presencial', dur='2h', pessoas='Juliana Prado e Joana Freitas',
         temas=['Agenda', 'Conversas', 'Jurídico', 'Documentos'], por='Rafael Teles', onde='no escritório, Rua da Aurora'),
    dict(dia='24', mes='nov', data='24/11/2026', forma='Telefone', ico='telefone', dur='15 min', pessoas='Tiago Ramos',
         temas=['Jurídico'], por='Rafael Teles', desfeito=('Rafael Teles', '25/11/2026', 'Registrei por engano: a ligação caiu antes de começar. O treino do Tiago fica para a semana que vem.')),
    dict(dia='18', mes='nov', data='18/11/2026', forma='Vídeo', ico='treino', dur='1h30', pessoas='Renata Lima e Paulo Cedro',
         temas=['Clientes', 'Contratos', 'Financeiro', 'Escritório e equipe'], por='Rafael Teles', onde='por videochamada'),
]

TEMAS = ['Início', 'Clientes', 'Conversas', 'Agenda', 'Comercial', 'Contratos', 'Financeiro', 'Jurídico', 'Documentos', 'Escritório e equipe']
