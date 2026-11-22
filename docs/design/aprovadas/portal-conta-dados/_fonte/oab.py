# OAB na Equipe: dados fictícios, formato e peças comuns às duas páginas (equipe e contratos).
# O número fica guardado só com dígitos (1 a 6); a letra, quando a carteira tem, é um campo à parte.

UFS = [
    ('AC', 'Acre'), ('AL', 'Alagoas'), ('AM', 'Amazonas'), ('AP', 'Amapá'), ('BA', 'Bahia'), ('CE', 'Ceará'),
    ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'), ('GO', 'Goiás'), ('MA', 'Maranhão'), ('MG', 'Minas Gerais'),
    ('MS', 'Mato Grosso do Sul'), ('MT', 'Mato Grosso'), ('PA', 'Pará'), ('PB', 'Paraíba'), ('PE', 'Pernambuco'),
    ('PI', 'Piauí'), ('PR', 'Paraná'), ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'), ('RO', 'Rondônia'),
    ('RR', 'Roraima'), ('RS', 'Rio Grande do Sul'), ('SC', 'Santa Catarina'), ('SE', 'Sergipe'), ('SP', 'São Paulo'),
    ('TO', 'Tocantins'),
]
assert len(UFS) == 27
UF_NOME = dict(UFS)


def uf_rotulo(uf):
    return f'{uf} · {UF_NOME[uf]}'


def num_fmt(n):
    """'287104' -> '287.104'; '4512' -> '4.512'."""
    n = str(int(n))
    return f'{int(n):,}'.replace(',', '.')


def oab_txt(uf, num, letra=''):
    return f'OAB/{uf} {num_fmt(num)}{"-" + letra if letra else ""}'


def oab_doc(uf, num, letra=''):
    """Como sai no documento: OAB/SP nº 287.104."""
    return f'OAB/{uf} nº {num_fmt(num)}{"-" + letra if letra else ""}'


# (uf, número só com dígitos, letra, tipo). A principal vem primeiro.
INSCRICOES = {
    'Marina Ribeiro': [('SP', '214538', '', 'principal')],
    'Felipe Matos': [('SP', '287104', '', 'principal'), ('RJ', '245880', 'S', 'suplementar')],
    'Larissa Costa': [('SP', '401226', '', 'principal')],
    'Renata Lopes': [('SP', '498310', '', 'principal')],
}


def oab_curta(nome):
    """Linha curta da lista: 'OAB/SP 287.104 · OAB/RJ 245.880-S'."""
    return ' · '.join(oab_txt(u, n, l) for u, n, l, _ in INSCRICOES.get(nome, []))


def oab_frase(nome):
    """Como vai no contrato e na procuração: 'OAB/SP nº 287.104 e OAB/RJ nº 245.880-S'."""
    ins = [oab_doc(u, n, l) for u, n, l, _ in INSCRICOES.get(nome, [])]
    if len(ins) <= 1:
        return ins[0] if ins else ''
    return ', '.join(ins[:-1]) + ' e ' + ins[-1]


def frase_de(ins):
    """Frase de uma lista de inscrições (uf, número, letra, ...), na ordem dada."""
    t = [oab_doc(i[0], i[1], i[2]) for i in ins]
    if len(t) <= 1:
        return t[0] if t else ''
    return ', '.join(t[:-1]) + ' e ' + t[-1]


# ---------------------------------------------------------------- Sua conta (decisão 1 da Carol, 19/11/2026)
# A Equipe continua só da sócia dona. Cada pessoa confere a própria OAB em "Sua conta":
# no computador, o nome no pé do trilho vira link; no celular, um item novo no grupo "Sua conta" do Mais.
def com_conta(out, ico):
    quem = '<div class="quem"><span class="av" aria-hidden="true" data-quem-ini>M</span><span><strong data-quem-nome>Marina Ribeiro</strong><small data-quem-papel>Sócia dona</small></span></div>'
    assert quem in out
    out = out.replace(quem, quem.replace('<div class="quem">', '<a class="quem oe-quem" href="conta.html" data-nav="conta">')
                      .replace('</span></div>', '<span class="sr">, sua conta e sua OAB</span></span></a>'))
    item = '<ul class="pt-ml">\n      <li><a class="pt-mi" href="#">' + ico('trocar')
    assert item in out
    novo = (f'<ul class="pt-ml">\n      <li><a class="pt-mi" href="conta.html" data-nav="conta">{ico("balanca")}Seus dados e sua OAB{ico("dir", "ico ico-s pt-ir")}</a></li>'
            f'\n      <li><a class="pt-mi" href="#">' + ico('trocar'))
    out = out.replace(item, novo, 1)
    css = ('\n/* Sua conta: o nome no pé do trilho vira link */\n'
           'a.oe-quem{color:inherit;text-decoration:none;border-radius:8px;min-height:44px;padding:8px 12px;margin-top:6px;position:relative}'
           'a.oe-quem:hover{background:rgba(135,51,91,.55)}'
           'a.oe-quem[aria-current]{background:var(--vinho-2);box-shadow:inset 0 0 0 1px rgba(242,205,179,.18)}'
           'a.oe-quem[aria-current]::before{content:"";position:absolute;left:-14px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--ambar)}\n')
    return out.replace('</style>', css + '</style>', 1)
