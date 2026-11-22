# Escritório › Recebimento › Marca e timbrado: o registro da sociedade na OAB vira só leitura, com o link
# "Mudar em Dados do escritório". Copia SEM MUDANÇA a página aprovada (portal-nao-paga-logo/escritorio-logo.html),
# troca o escritório de exemplo (Ribeiro & Matos) pelo Santana e acrescenta o estado "oab-leitura", feito do estado
# aprovado "letra" com o bloco do registro trocado. Uso: python3 marca_oab.py <pasta-saida>
import sys, os
from esc_elenco import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
APROV = os.environ.get('APROV', '/home/claude/t3jus/docs/design/aprovadas/')
s = open(APROV + 'portal-nao-paga-logo/escritorio-logo.html', encoding='utf-8').read()
E = SANTANA

i = s.index('<template data-est="letra"')
j = s.index('</template>', i) + len('</template>')
t = s[i:j].replace('data-est="letra"', 'data-est="oab-leitura"', 1)
a = t.index('<div class="lg-bloco"><h3>')
# o bloco do registro é o último lg-bloco antes do fim da folha
b = t.index('</div></div></div></section>', a) + len('</div></div>')
assert 'Registro da sociedade na OAB' in t[a:b] and 'lg-oab-n' in t[a:b]
uf, n = E['oab']
novo = ('<div class="lg-bloco"><h3><svg class="ico" aria-hidden="true"><use href="#i-balanca"/></svg>Registro da sociedade na OAB</h3>'
        f'<div class="mo-oab"><span class="mo-uf" aria-hidden="true">{uf}</span><p><b>OAB/{uf} {num_fmt(n)}</b>Sai no alto do carnê e no timbrado do recibo, depois do CNPJ.</p></div>'
        '<p class="mo-nota"><svg class="ico" aria-hidden="true"><use href="#i-cadeado"/></svg><span>Agora ele mora em Dados do escritório, junto da razão social e do CNPJ, '
        'porque também sai no contrato. Um lugar só, para não ter duas versões. '
        '<a href="escritorio.html?estado=escritorio-editar">Mudar em Dados do escritório</a></span></p></div>')
t = t[:a] + novo + t[b:]
CSS = ('<style>/* Registro na OAB só para ler (escritorio-dados-documentos) */'
       '.mo-oab{display:flex;align-items:center;gap:14px;flex-wrap:wrap}'
       '.mo-uf{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:var(--raio);background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-size:20px;font-weight:500;box-shadow:inset 0 0 0 1px var(--borda-folha)}'
       '.mo-oab p{margin:0;flex:1 1 220px;font-size:13px;color:var(--texto-2);line-height:1.45}'
       '.mo-oab b{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}'
       '.mo-nota{display:flex;gap:10px;align-items:flex-start;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}'
       '.mo-nota .ico{color:var(--vinho);flex:none;margin-top:1px}.mo-nota a{color:var(--vinho);font-weight:500}</style>')
s = s.replace(s[i:j], s[i:j] + '\n' + t, 1)
# Seções do Escritório: entra "Advogados nos documentos"; os links apontam para as telas desta pasta
s = s.replace('<a href="../portal-v1/escritorio.html">Dados do escritório</a>',
              '<a href="escritorio.html?estado=escritorio-completo">Dados do escritório</a><a href="escritorio.html?estado=escritorio-advogados">Advogados nos documentos</a>')
for de, para in [('Ribeiro &amp; Matos', 'Santana Advocacia'), ('Ribeiro & Matos', 'Santana Advocacia'), ('Marina Ribeiro', 'Carol Santana'),
                 ('OAB/SP 31.874', f'OAB/{uf} {num_fmt(n)}'), ('41.276.839/0001-34', E['cnpj']), ('data-quem-ini>M<', 'data-quem-ini>C<'),
                 ("nome:'Carol Santana',ini:'M'", "nome:'Carol Santana',ini:'C'"), ('RIBEIRO E MATOS SOC ADV', 'SANTANA SOC INDIVID ADV'),
                 ('SAO PAULO', 'SALVADOR'), ('Santana Advocacia Sociedade de Advogados', 'Santana Sociedade Individual de Advocacia'), ('(11) 97405-2210', '(71) 99184-5520'),
                 ('<span class="mo" aria-hidden="true">R</span>', '<span class="mo" aria-hidden="true">S</span>'), ('Advocacia · 7 pessoas', 'Advocacia · 5 pessoas')]:
    s = s.replace(de, para)
s = s.replace('</head>', CSS + '</head>', 1)
open(f'{SAIDA}/marca.html', 'w', encoding='utf-8').write(s)
print('marca ok')
