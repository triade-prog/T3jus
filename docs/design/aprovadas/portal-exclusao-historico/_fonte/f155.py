# F3.155 · Janela de exclusão a pedido do titular: a linha nova de "O que é apagado" com os
# arquivos do cliente (documentos pessoais, termo de curatela ou de tutela e o Word das propostas).
# Parte do desenho aprovado em docs/design/aprovadas/portal-clientes-pendencias: executa o
# pendencias.py aprovado (sem mudança, só o caminho do repositório) até antes de montar a página,
# troca só a lista "O que é apagado" e grava exclusao.html com os estados novos.
# Peças novas com prefixo f155-. Uso: python3 f155.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

_src = open(os.path.join(AQUI, 'pendencias.py'), encoding='utf-8').read()
_corte = _src.index('# ---------------------------------------------------------------- página')
NS = {'__name__': 'pendencias_aprovado', '__file__': os.path.join(AQUI, 'pendencias.py')}
_argv = sys.argv
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src[:_corte], 'pendencias.py', 'exec'), NS)
sys.argv = _argv
ico, tpl, janelas, j_excluir, ficha_lgpd, sit_dona = (NS[k] for k in ('ico', 'tpl', 'janelas', 'j_excluir', 'ficha_lgpd', 'sit_dona'))
ficha_pj, situacao_folha = NS['ficha_pj'], NS['situacao_folha']
SOME_APROV, FICA_APROV, SEM_OBRIG_APROV = NS['SOME'], NS['FICA'], NS['SEM_OBRIG']


# ---------------------------------------------------------------- a linha nova
def junta(partes):
    return partes[0] if len(partes) == 1 else ', '.join(partes[:-1]) + ' e ' + partes[-1]


def linha_arquivos(docs=0, termo='', propostas=0, fica_ao_lado=False):
    """docs: documentos pessoais; termo: 'curatela', 'tutela' ou ''; propostas: propostas do cliente.
    Vem do campo arquivosParaApagar da ficha, que só a sócia dona recebe. Sem arquivo, não há linha."""
    partes = []
    if docs:
        partes.append('o documento pessoal' if docs == 1 else f'os {docs} documentos pessoais')
    if termo:
        partes.append(f'o termo de {termo}')
    if propostas:
        partes.append('o arquivo Word da proposta' if propostas == 1 else f'os arquivos Word das {propostas} propostas')
    if not partes:
        return ''
    t = junta(partes)
    t = t[0].upper() + t[1:]
    um = docs + (1 if termo else 0) + propostas == 1
    if fica_ao_lado:  # alternativa B: o que fica vai para "O que fica"
        sub = 'o arquivo é apagado do T3jus' if um else 'os arquivos são apagados do T3jus'
    else:
        sub = ('o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.' if um else
               'os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.')
    return f'<li class="f155-novo">{t}<small>{sub}</small></li>'


def some(qualif, contatos, indicou, n_at, com, prox, resp, arquivos):
    q = ('<li>Nome, CNPJ, o representante e a qualificação<small>endereço da sede e quem assina pela empresa</small></li>' if qualif == 'PJ' else
         '<li>Nome, CPF, RG e a qualificação<small>nacionalidade, estado civil, profissão e endereço</small></li>')
    return (f'<div class="pd-lado pd-some"><h3>{ico("x")}O que é apagado</h3><ul>{q}{arquivos}'
            f'<li>Os 2 contatos<small>{contatos}, com telefones e e-mails</small></li>'
            + (f'<li>Quem indicou<small>{indicou}</small></li>' if indicou else '')
            + f'<li>Com quem se falou, nos {n_at} atendimentos<small>{com}</small></li>'
            f'<li>O próximo contato de {prox}<small>sai também do Início de {resp}</small></li></ul></div>')


def fica(n_at, origem, arquivos=False):
    novo = (f'<li class="f155-novo">Que os arquivos existiram<small>tipo, tamanho e datas de cada um, sem o nome do arquivo</small></li>' if arquivos else '')
    return (f'<div class="pd-lado pd-fica"><h3>{ico("check")}O que fica, sem dado pessoal</h3><ul>'
            f'<li>O registro da exclusão<small>quem fez, quando, como o pedido chegou e o protocolo. Prova que o escritório atendeu o pedido (LGPD, art. 18 e 37).</small></li>{novo}'
            f'<li>Data, canal, quem atendeu e o resumo, nos {n_at} atendimentos<small>sem com quem se falou. O trabalho da equipe e o que foi tratado continuam no histórico.</small>'
            f'<span class="pd-dica">{ico("alerta")}<span>O resumo fica como foi escrito. Resumo de atendimento não deve ter dado pessoal desnecessário, como CPF, endereço ou saúde.</span></span></li>'
            f'<li>A origem, “{origem}”<small>sem quem indicou. Conta no relatório de origem.</small></li></ul></div>')


def sem_obrig(quem, dela='dela'):
    return (f'<p class="pt-comuns">{ico("escudo")}<span><b>Nada aqui precisa ser guardado por lei.</b> {quem} ainda não tem contrato nem processo no T3jus; se tivesse, o pedido seria atendido arquivando, sem apagar. '
            f'Documentos {dela} fora do T3jus (papel, e-mail, pastas) ficam com o escritório, que é o controlador.</span></p>')


def janela_com(some_, fica_=None, sem_=None, troca=()):
    """A janela aprovada, com a lista "O que é apagado" trocada. troca: textos do cliente (nome, gênero)."""
    NS['SOME'] = some_
    NS['FICA'] = fica_ or FICA_APROV
    NS['SEM_OBRIG'] = sem_ or SEM_OBRIG_APROV
    try:
        j = j_excluir(True)
    finally:
        NS['SOME'], NS['FICA'], NS['SEM_OBRIG'] = SOME_APROV, FICA_APROV, SEM_OBRIG_APROV
    for i, (a, b) in enumerate(troca):
        assert i or a in j, a
        j = j.replace(a, b)
    return j


# Antônia (a cliente do desenho aprovado): os mesmos contatos, atendimentos e origem
ANT = dict(qualif='PF', contatos='Joana Prado e a própria cliente', indicou='Rosa Almeida', n_at=3,
           com='Joana Prado e a própria cliente', prox='13/11', resp='Diego Almeida')
FX = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado', aba='ficha')
FICHA_ANT = ficha_lgpd(sit_dona()) + janelas()
# Conferência: sem arquivos, a lista é a aprovada, letra por letra
assert some(arquivos='', **ANT) == SOME_APROV, 'a lista sem arquivos precisa ser igual à aprovada'

T = ''
T += tpl('excluir-arquivos', FICHA_ANT + janela_com(some(arquivos=linha_arquivos(3, 'curatela', 1), **ANT)), **FX)
T += tpl('excluir-um-documento', FICHA_ANT + janela_com(some(arquivos=linha_arquivos(1), **ANT)), **FX)
T += tpl('excluir-sem-arquivos', FICHA_ANT + janela_com(some(arquivos='', **ANT)), **FX)
T += tpl('excluir-alternativa-fica', FICHA_ANT + janela_com(some(arquivos=linha_arquivos(3, 'curatela', 1, fica_ao_lado=True), **ANT),
                                                              fica(3, 'Indicação de cliente', arquivos=True)), **FX)

# Pessoa jurídica: a Construtora Vale Alto (ficha PJ aprovada de Clientes), com 2 propostas e sem documentos
PJ_TROCA = (('Antônia Ferreira Prado', 'Construtora Vale Alto Ltda.'),
            ('A pedido da cliente, os dados pessoais dela são apagados', 'A pedido do cliente, os dados pessoais são apagados'),
            ('A própria cliente', 'O próprio cliente'), ('Alguém em nome dela', 'Alguém em nome do cliente'),
            ('veio da cliente ou de quem fala por ela', 'veio do cliente ou de quem fala por ele'),
            ('escreva o nome da cliente', 'escreva o nome do cliente'))
_sit_pj = situacao_folha().replace('Ativo desde 27/10/2026', 'Ativo desde 14/08/2026').replace('janela-inativar', 'janela-inativar-pj')
_fpj = ficha_pj()
assert _sit_pj in _fpj
_fpj = _fpj.replace(_sit_pj, sit_dona().replace('Ativo desde 27/10/2026', 'Ativo desde 14/08/2026')
                    .replace('Se a cliente pedir para apagar os dados dela', 'Se o cliente pedir para apagar os dados'))
PJ = dict(qualif='PJ', contatos='Ricardo Vale e Sônia Martins', indicou='Paulo Serra, contador', n_at=5,
          com='Ricardo Vale e Sônia Martins', prox='25/11', resp='Felipe Matos')
T += tpl('excluir-pj-propostas', _fpj + janelas() + janela_com(some(arquivos=linha_arquivos(0, '', 2), **PJ),
                                                                 fica(5, 'Indicação de advogado ou parceiro'),
                                                                 sem_obrig('A Construtora Vale Alto'), PJ_TROCA),
         atual='clientes', trilha='Clientes|Construtora Vale Alto Ltda.', titulo='Construtora Vale Alto Ltda.', aba='ficha')

# Menor sob tutela: a ficha aprovada com outro nome (só a janela está em revisão)
MEN_TROCA = (('Antônia Ferreira Prado', 'Laura Prado Nogueira'), ('Antônia', 'Laura'))
MEN = dict(qualif='PF', contatos='Joana Prado, a tutora, e a própria cliente', indicou='', n_at=2,
           com='Joana Prado', prox='26/11', resp='Diego Almeida')
_fmen = (ficha_lgpd(sit_dona()).replace('Filha · acompanha o caso', 'Avó e tutora · acompanha o caso')
         .replace('Antônia Ferreira Prado', 'Laura Prado Nogueira').replace('Antônia', 'Laura'))
T += tpl('excluir-tutela', _fmen + janelas() + janela_com(some(arquivos=linha_arquivos(2, 'tutela'), **MEN),
                                                            fica(2, 'Passou no escritório'), sem_obrig('Laura'), MEN_TROCA),
         atual='clientes', trilha='Clientes|Laura Prado Nogueira', titulo='Laura Prado Nogueira', aba='ficha')

# Anotação de desenho (não vai para o produto): contorno tracejado em âmbar na linha nova
CSS_F155 = r"""
/* F3.155 · anotação só do desenho: a linha nova leva contorno tracejado em âmbar. No produto, a linha é igual às outras. */
.f155-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
"""

# ---------------------------------------------------------------- página (a montagem aprovada, gravando exclusao.html)
NS['T'] = T
_pag = _src[_corte:]
_pag = _pag.replace("'{\"estado\":\"inicio\",\"atual\":\"inicio\"}'", "'{\"estado\":\"excluir-arquivos\",\"atual\":\"clientes\"}'")
_pag = _pag.replace("CSS_PD + '\\n</style>'", "CSS_PD + '\\n' + CSS_F155 + '\\n</style>'")
_pag = _pag.replace("os.path.join(SAIDA, 'pendencias.html')", "os.path.join(SAIDA, 'exclusao.html')")
_pag = _pag.replace("print('pendencias ok'", "print('exclusao ok'")
assert 'CSS_F155' in _pag and 'exclusao.html' in _pag and 'excluir-arquivos' in _pag
NS['CSS_F155'] = CSS_F155
exec(compile(_pag, 'pendencias.py (página)', 'exec'), NS)
# Os links que iam para outras telas do desenho aprovado ficam neste desenho
_arq = os.path.join(SAIDA, 'exclusao.html')
_h = open(_arq, encoding='utf-8').read()
_h = _h.replace('pendencias.html?estado=', 'exclusao.html?estado=').replace(NS['CLIENTES_APROV'], 'exclusao.html')
open(_arq, 'w', encoding='utf-8').write(_h)
