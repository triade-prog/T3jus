# index.html: todos os estados lado a lado (computador e celular), com rótulos. Uso: python3 index_gerar.py <pasta>
import sys, os
S = sys.argv[1] if len(sys.argv) > 1 else '..'
E_ = [
 ('ficha-pdf', '1. Lista com os 3 documentos', 'Cada documento gerado tem “Anexar o assinado” e o grupo Baixar: Word e PDF, com o mesmo peso. O rodapé diz para que serve cada formato.'),
 ('pdf-preparando', '2. PDF sendo preparado', 'O botão PDF do contrato vira “Preparando o PDF” (aria-disabled, o foco fica nele) e uma linha de situação (role=status) diz que baixa sozinho. Word e os outros documentos seguem livres.'),
 ('pdf-erro', '3. Erro ao gerar o PDF', 'Aviso preso ao documento (role=alert): o que aconteceu, o que continua igual (o Word baixa) e o que fazer: Tentar de novo ou salvar como PDF pelo Word. Código PDF_INDISPONIVEL.'),
 ('pdf-modelo-proprio', '4. Modelo próprio com tabela e imagem', 'O contrato vem do modelo do escritório. Um aviso curto diz que o PDF sai num leiaute simples no timbrado, com o mesmo texto, e que tabela e imagem ficam só no Word (pergunta 1).'),
 ('assinado', '5. Contrato assinado anexado', 'Contrato (PDF) e procuração (foto) assinados: a ação é “Baixar o assinado (PDF/foto)”. Word e PDF sem assinatura ficam numa lista que abre, para ninguém mandar o papel errado. A declaração ainda espera o assinado.'),
]
cards = ''
for n, t, d in E_:
    cards += (f'<section class="estado" aria-labelledby="t-{n}"><h2 id="t-{n}">{t}</h2><p>{d}</p><div class="par">'
              f'<figure><a href="contrato-pdf.html?estado={n}"><img src="{n}-computador.webp" alt="{t}, no computador (1440 px)" loading="lazy"></a><figcaption>Computador · 1440 px</figcaption></figure>'
              f'<figure class="cel"><a href="contrato-pdf.html?estado={n}"><img src="{n}-celular.webp" alt="{t}, no celular (390 px)" loading="lazy"></a><figcaption>Celular · 390 px</figcaption></figure>'
              f'</div></section>')
h = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contrato em Word e PDF</title>
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--suave:#5E4A54;--foco:#AC3F6B}}
body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.55 Poppins,system-ui,sans-serif}}
main{{max-width:1500px;margin:0 auto;padding:32px 16px 64px}}
h1{{font:500 40px/1.1 Alegreya,Georgia,serif;color:var(--vinho);margin:0 0 8px}}
h2{{font:500 24px/1.2 Alegreya,Georgia,serif;color:var(--vinho);margin:0 0 4px}}
.lede{{max-width:80ch;color:var(--suave)}}
.estado{{background:#fff;border-radius:10px;padding:20px;margin:24px 0}}
.estado>p{{max-width:90ch;color:var(--suave);margin:0 0 16px}}
.par{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr);gap:20px;align-items:start}}
figure{{margin:0}} img{{width:100%;height:auto;display:block;border:1px solid #E5D8D0;border-radius:6px}}
figcaption{{font-size:12px;color:var(--suave);margin-top:6px}}
a:focus-visible{{outline:3px solid var(--foco);outline-offset:3px}}
a{{color:var(--vinho)}}
@media (max-width:760px){{.par{{grid-template-columns:1fr}} h1{{font-size:32px}}}}
</style></head><body><main>
<p>Contratos › ficha do contrato › aba Documentos</p>
<h1>Contrato em Word e PDF</h1>
<p class="lede">Pedido da Carol: “Dentro de contrato não tem a opção de baixar o PDF ou o doc”. Só mudam as ações de cada documento na aba Documentos aprovada (portal-procuracoes, decisões 18 e 20); o resto da tela é o aprovado. Clique numa imagem para abrir o HTML naquele estado. Leia as decisões e as perguntas em <a href="NOTAS.md">NOTAS.md</a>.</p>
{cards}
</main></body></html>'''
open(os.path.join(S, 'index.html'), 'w', encoding='utf-8').write(h)
print('index ok')
