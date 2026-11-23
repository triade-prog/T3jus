# O CSS real do Portal (sistema/packages/ui/src/portal.css, na origin/main), lido na hora de gerar:
# as peças que estes desenhos mostram (Marca e timbrado e a linha da chave Pix) entram nas páginas
# por último, para valer o que está no código e não o que estava no desenho antigo.
import os, re
from rz_dados import REPO

_css = open(os.path.join(REPO, 'sistema/packages/ui/src/portal.css'), encoding='utf-8').read()


def _bloco(ini, fim):
    i = _css.index(ini)
    j = _css.index(fim, i)
    return _css[i:j]


def _linhas(prefixos):
    return '\n'.join(l for l in _css.splitlines() if l.startswith(prefixos))


# Marca e timbrado: do comentário da seção até o timbrado do carnê e do recibo (F3.133)
MARCA = _bloco('/* Escritório › Recebimento · Marca e timbrado (F3.81', '/* Timbrado aprovado no carnê e no recibo')
# o @media de 760 px da Marca e timbrado (o primeiro depois do bloco que tem .lg-prev)
_m = _css.index('  .lg-prev{grid-template-columns:1fr}')
MARCA_CEL = _css[_css.rindex('@media (max-width:760px){', 0, _m):_css.index('\n}\n', _m) + 3]
OAB_LER = _linhas(('.lg-oab-ler',))
CHAVE = _linhas(('.cn-chave',))

TUDO = ('\n/* ===== CSS real do Portal (portal.css, origin/main), sem mudança ===== */\n'
        + MARCA + MARCA_CEL + OAB_LER + '\n' + CHAVE + '\n')

if __name__ == '__main__':
    print(len(TUDO))
    print(MARCA_CEL)
