# Lista de estados (casos.json, lido pelo fotos.cjs) e o index.html com as capturas. Mesmo jeito do casos.py de
# escritorio-dados-documentos. Uso: python3 casos.py <pasta-saida>
import json, html, os, sys
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
M, C, R, D = 'marca.html?estado=', 'carne.html?estado=', 'recibo.html?estado=', 'docx.html?estado='
SECOES = [
    ('D1 · Escritório › Recebimento › Marca e timbrado', 'A prévia do carnê ganha, embaixo da marca, a linha da identificação da via: razão social em negrito · CNPJ · OAB, em texto corrido. A prévia do recibo passa a mostrar as 4 linhas da folha (pergunta 2). O resto da folha é a de hoje.', [
        ('mt-hoje', M + 'hoje', 'Como a prévia sai hoje', 'O código de hoje: no carnê, só “CNPJ · OAB”; no recibo, o nome curto no lugar da razão social, “CNPJ · OAB” juntos e o endereço antigo. Diferente do papel que sai de verdade desde a F3.133.'),
        ('mt-letra', M + 'letra', 'Nome em letra, sociedade completa', 'Carnê: a razão social em negrito, CNPJ e OAB embaixo da marca. Recibo: a razão social em destaque, CNPJ e OAB, a sede com CEP, telefone, e-mail e site, e o WhatsApp. Em cores e em preto e branco.'),
        ('mt-logo', M + 'logo', 'Com o logo', 'O logo largo do Santana, na caixa um pouco menor da via (decisão 9 do carnê), com a linha embaixo.'),
        ('mt-quadrado', M + 'quadrado', 'Logo e o nome ao lado', 'Logo quase quadrado: o nome curto ao lado do logo, e embaixo a linha da identificação.'),
        ('mt-sem-sociedade', M + 'sem-sociedade', 'Advogada sem sociedade', 'Carol Santana Advocacia: “Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ”. Nunca o CPF.'),
        ('mt-razao-vazia', M + 'razao-vazia', 'Razão social em branco', 'A linha fica só com o CNPJ (o nome curto não se repete). Embaixo da prévia, a linha de aviso com o caminho para completar.'),
        ('mt-tipo-vazio', M + 'tipo-vazio', 'Tipo em branco (escritório migrado)', 'O mesmo papel, com o texto do aviso para quando ainda não se sabe se é sociedade: quem atua sozinha marca “sem sociedade” e o aviso some.'),
        ('mt-sem-advocacia', M + 'sem-advocacia', 'Nome curto sem “Advocacia”', 'Ribeiro & Matos: o “ADVOCACIA” pequeno embaixo do nome em letra, no carnê e no recibo (decisão 4 do carnê).'),
        ('mt-razao-longa', M + 'razao-longa', 'Razão social de 150 letras', 'A linha do carnê em letra um pouco menor; no recibo, a 1ª linha também. A miniatura cresce para baixo, como o papel.'),
        ('mt-razao-longa-logo', M + 'razao-longa-logo', '150 letras e logo', 'O pior caso das miniaturas.'),
        ('mt-leitura', M + 'leitura', 'Só para ler, com o logo', 'Bruna Teixeira (Contratos e Financeiro) vê a marca em uso, com a miniatura do carnê e a linha da identificação.'),
        ('mt-leitura-letra', M + 'leitura-letra', 'Só para ler, nome em letra', 'A mesma leitura com o nome em letra.'),
        ('mt-leitura-sem-sociedade', M + 'leitura-sem-sociedade', 'Só para ler, sem sociedade, com Financeiro', 'Quem tem Financeiro ou Contratos vê o nome completo e a OAB da advogada, que já vão impressos no carnê.'),
        ('mt-leitura-sem-sociedade-sem-area', M + 'leitura-sem-sociedade-sem-area', 'Só para ler, sem sociedade, sem área', 'Paula Nunes, só com as partes comuns: a miniatura sai sem a linha, e uma frase diz que ela existe e quem a vê (pergunta 1 do plano).'),
    ]),
    ('D2 · A janela “Gerar carnê”', 'Uma linha de aviso, no padrão da linha da chave Pix, logo abaixo da descrição. Só na tela: o carnê sai com o nome curto, sem “[falta]”.', [
        ('cn-razao-dona', C + 'razao-dona', 'Razão social em branco, a sócia dona', 'Carol Santana gera o carnê: a linha e o caminho “Completar em Escritório › Dados do escritório”.'),
        ('cn-razao-equipe', C + 'razao-equipe', 'Razão social em branco, a equipe', 'Bruna Teixeira gera o carnê: a mesma linha, com quem completa (Carol Santana, a sócia dona) e “Ver em Escritório › Dados do escritório”, que abre só para ler.'),
        ('cn-tipo-dona', C + 'tipo-dona', 'Tipo em branco, a sócia dona', 'Escritório migrado, sem o tipo: o texto pede para dizer se é sociedade; quem atua sozinha marca “sem sociedade” e o aviso some.'),
        ('cn-tipo-equipe', C + 'tipo-equipe', 'Tipo em branco, a equipe', 'O mesmo texto, com quem completa.'),
        ('cn-sem-pix-equipe', C + 'sem-pix-equipe', 'Sem chave Pix e sem razão social', 'Os dois avisos juntos: o quadro aprovado da chave Pix e, embaixo, a linha.'),
        ('cn-sem-sociedade', C + 'sem-sociedade', 'Advogada sem sociedade', 'Sem aviso: para quem não tem sociedade, a razão social em branco é o normal.'),
        ('cn-completa', C + 'completa', 'Razão social preenchida', 'Sem aviso. A janela é a de hoje.'),
    ]),
    ('D3 · A janela “Registrar recebimento”', 'A mesma linha, embaixo de “Gerar o recibo” e de “Mandar o recibo pelo WhatsApp”. Some quando “Gerar o recibo” é desmarcado (funciona na página).', [
        ('rg-razao-dona', R + 'razao-dona', 'Razão social em branco, a sócia dona', 'A linha embaixo das opções do recibo, com o caminho para completar.'),
        ('rg-razao-equipe', R + 'razao-equipe', 'Razão social em branco, a equipe', 'Com quem completa e o caminho para ver.'),
        ('rg-tipo-equipe', R + 'tipo-equipe', 'Tipo em branco, a equipe', 'O texto do escritório migrado.'),
        ('rg-sem-recibo', R + 'sem-recibo', 'Sem gerar o recibo', '“Gerar o recibo” desmarcado: não há papel, então não há aviso.'),
        ('rg-sem-sociedade', R + 'sem-sociedade', 'Advogada sem sociedade', 'Sem aviso.'),
    ]),
    ('D4 · O alto do .docx (proposta e documentos do modelo padrão)', 'A folha A4 como o Word mostra, com as 4 linhas do timbrado e a medida do cabeçalho. Com as duas propostas: o cabeçalho a 10 mm da borda e a caixa do logo de 92 × 12 mm. O painel mede quanto o cabeçalho ocupa e quanto texto ele empurra em cada página.', [
        ('dx-hoje', D + 'hoje', 'Como sai hoje', '3 linhas, com CNPJ, OAB e sede juntos; cabeçalho a 12,5 mm. Ocupa 15,1 mm: cabe.'),
        ('dx-sem-logo', D + 'sem-logo', 'Sem logo', '4 linhas: 18,5 mm. A 12,5 mm da borda, passaria 1 mm da margem; a 10 mm, cabe.'),
        ('dx-logo', D + 'logo', 'Com logo', 'O logo (92 × 12 mm) e as 4 linhas: 31,8 mm, o texto começa em 41,8 mm (11,8 mm a menos por página).'),
        ('dx-logo-nome', D + 'logo-nome', 'Logo e o nome ao lado', 'O nome curto ao lado do logo e as 4 linhas embaixo (pergunta 4 do plano).'),
        ('dx-sem-sociedade', D + 'sem-sociedade', 'Sem sociedade', 'O nome completo da advogada e “OAB/BA 63.876-S · sem CNPJ”. Cabe.'),
        ('dx-razao-vazia-logo', D + 'razao-vazia-logo', 'Razão social vazia, com logo', 'A 1ª linha seria o nome curto, que o logo já diz: sai. Sem “[falta]”.'),
        ('dx-razao-longa', D + 'razao-longa', '150 letras, sem logo', 'A 1ª linha em 11 pt ocupa 3 linhas: 26,7 mm, o texto começa em 36,7 mm.'),
        ('dx-razao-longa-logo', D + 'razao-longa-logo', '150 letras e logo', 'O pior caso: 39,7 mm, o texto começa em 49,7 mm (19,7 mm a menos, cerca de 3 linhas).'),
        ('dx-endereco-antigo', D + 'endereco-antigo', 'Endereço antigo (o contrato)', 'O cabeçalho leva o texto antigo e a cidade, sem “confira”; a marca [ENDEREÇO: confira] fica no corpo do contrato.'),
    ]),
]


def casos():
    return [{'nome': it[0], 'url': it[1]} for _, _, itens in SECOES for it in itens]


def montar():
    h = lambda s: html.escape(s, quote=True)
    corpo = ''
    for i, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{i}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, url, t, leg in itens:
            figs = ''
            for tam in ('computador', 'celular'):
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Razão social: o que sobrou · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · F3.146 (PA-07) · para aprovação da Carol</p><h1>Razão social: o que sobrou</h1>
<p>O que a F3.133 deixou de fora para o escritório sair igual em todo papel e em toda prévia: a prévia de Marca e timbrado com a razão social (D1), uma linha de aviso quando a razão social está em branco na hora de gerar o carnê (D2) e o recibo (D3), e o alto do .docx da proposta e dos documentos com as 4 linhas do timbrado, medido (D4). Elenco: Santana Advocacia, em Salvador; Ribeiro &amp; Matos para o nome sem “Advocacia”. Cada estado tem computador (1440) e celular (412); clique numa imagem para abrir a página naquele estado. Decisões e perguntas em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">D1 · Marca e timbrado</a><a href="#s2">D2 · Gerar carnê</a><a href="#s3">D3 · Registrar recebimento</a><a href="#s4">D4 · O .docx</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    json.dump(casos(), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar())
    print(len(casos()), 'casos')
