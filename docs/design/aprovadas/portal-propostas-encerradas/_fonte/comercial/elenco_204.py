# F3.204 · o que a troca de nomes da F3.181 (nomes_181.py) deixa passar nas páginas de Funil, Atendimentos e Início:
# o primeiro nome e as iniciais da sócia dona e de Felipe (Contratos), que viram Paula Reis e Bianca Torres.
# "Marina" seguido de "Alves" ou "A." é a cliente deste desenho e fica. Uso: elenco_204.trocar(html), depois do nomes_181.
import re


def trocar(h):
    h = re.sub(r'Marina(?! Alves| A\.)', 'Paula', h)
    h = h.replace('Felipe', 'Bianca')
    for a, b in (('>MR<', '>PR<'), ('>FM<', '>BT<'), ('>DA<', '>DM<')):
        h = h.replace(a, b)
    return h
