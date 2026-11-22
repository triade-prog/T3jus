# Prepara as capturas do Portal (PNG 2x do capturas.cjs) para o Início v3: WebP, sem retoque.
# Recortes em coordenadas da tela (px CSS); a imagem fica com o dobro, para telas de alta densidade.
# Uso: python3 imagens.py <pasta-png> <pasta-capturas-saida>
import sys, os
from PIL import Image

ent, sai = sys.argv[1], sys.argv[2]
os.makedirs(sai, exist_ok=True)


def abrir(nome):
    return Image.open(os.path.join(ent, 'portal-' + nome + '.png')).convert('RGB')


def salvar(im, nome, q=80):
    im.save(os.path.join(sai, nome + '.webp'), 'WEBP', quality=q, method=6)
    print(nome, im.size)


def recorte(nome, caixa):
    x0, y0, x1, y1 = caixa
    return abrir(nome).crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2))


# Abertura: o Início da sócia (1280 px de largura), 900 px de altura; no celular, a tela do aparelho.
salvar(recorte('inicio-largo-inteira', (0, 0, 1280, 900)), 'abertura-inicio')
salvar(abrir('inicio-celular'), 'abertura-inicio-celular')

# Destaques: só o bloco que conta a história, quase em tamanho real.
salvar(recorte('a-receber-medio-inteira', (272, 300, 1104, 1265)), 'destaque-a-receber')
salvar(recorte('repasses-medio-inteira', (272, 400, 1096, 1240)), 'destaque-repasses')
salvar(recorte('prazos-amplo-inteira', (292, 306, 1020, 1000)), 'destaque-prazos')
salvar(abrir('a-receber-celular-rolada'), 'destaque-a-receber-celular')
salvar(abrir('repasses-celular-rolada'), 'destaque-repasses-celular')
salvar(recorte('prazos-celular-rolada', (0, 0, 390, 520)), 'destaque-prazos-celular')  # termina antes do botão Cumprido, que o Portal corta em 390 px

# Abas por área: a tela inteira (1280 x 800) e a do celular.
for aba, tela in [('comercial', 'proposta-ficha'), ('contratos', 'carne'), ('juridico', 'caso-ficha'), ('financeiro', 'financeiro-resumo')]:
    salvar(abrir(tela + '-largo'), 'aba-' + aba, 78)
    salvar(abrir(tela + '-celular'), 'aba-' + aba + '-celular', 78)

# A caminho: a coluna da conversa do WhatsApp (tela pronta; falta a ligação oficial com a Meta).
salvar(recorte('conversas-largo', (595, 150, 962, 800)), 'a-caminho-conversas')  # só a conversa, para ler em tamanho pequeno
print('imagens ok')
