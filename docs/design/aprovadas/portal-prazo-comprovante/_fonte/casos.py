# O index.html (capturas com legenda) e o publicar.html (capturas embutidas) do prazo do comprovante.
# Uso: python3 casos.py <pasta-saida> [--publicar]
import json, html, sys, os, base64, io
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
PUBLICAR = '--publicar' in sys.argv
U = 'prazo.html?estado='
ITENS = [
    ('pz-ver', 'Documentos para começar com o prazo', 'Marina, sócia dona. Ao lado da lista por área, a folha nova “Prazo do comprovante”: 90 dias, contados da data do papel, o padrão do T3jus; hoje, 3 dos 41 comprovantes passaram. No item do comprovante, “Vale 90 dias” e “Mudar o prazo”, que abre a folha em edição. O “Como funciona” aponta para a folha.'),
    ('pz-editar', 'Mudar para 60 dias', 'Três opções rápidas (60, 90 e 180) e “Outro prazo”. O efeito aparece antes de salvar: 4 comprovantes passam a ficar com “Mais de 60 dias”, com os nomes e os dias, e o total fica em 7 de 41. A caixa marcada troca também “dos últimos 90 dias” no texto que vai ao cliente, nas 4 listas que dizem o prazo (o número sai da prévia). Embaixo, o que acontece ao salvar.'),
    ('pz-editar-180', 'Mudar para 180 dias', 'O efeito ao contrário: 3 comprovantes voltam a “Em dia”. O pedido de comprovante novo para o caso de Antônia, feito hoje pelo WhatsApp a Joana Prado, filha dela, continua aberto; se o de 02/07 servir, a equipe marca “Já chegou” no caso.'),
    ('pz-erro', 'Erro: fora de 30 a 365', '“Outro prazo” com 400 dias: resumo no topo com link para o campo, o erro preso ao campo e o foco nele. O prazo continua em 90.'),
    ('pz-falha', 'Falha do servidor', 'Nada mudou, nem o prazo nem os selos. A escolha continua na folha, com o código para o suporte.'),
    ('pz-salvo', 'Salvo: 60 dias', 'O aviso diz o que é verdade: os selos mudaram na hora (4 passaram a “Mais de 60 dias”), o texto ao cliente passou a dizer “dos últimos 60 dias” em 4 listas, nenhum pedido saiu e os casos já abertos não mudam. A lista mostra “Vale 60 dias”; a folha diz quem mudou e quando.'),
    ('pz-equipe', 'Larissa, do Jurídico, sem ser dona', 'Só para ler: o prazo e a contagem, sem botão, com “Quem muda é Marina Ribeiro, a sócia dona.” A lista também fica sem Editar e sem mover.'),
    ('pz-equipe-dois', 'Com mais de um sócio dono', 'A regra do “Quem muda”: com dois sócios donos, os dois nomes (“Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos.”), na folha, no item e no pé da lista.'),
    ('pz-zero', 'Nenhum comprovante nas fichas', 'Escritório novo: a folha diz que ainda não há comprovante nas fichas e que o prazo passa a contar no primeiro anexado.'),
    ('pz-zero-editar', 'Mudar sem nenhum comprovante', 'O efeito na versão zero: “Nenhum selo muda agora”, sem lista de nomes.'),
    ('pz-sem-frase', 'Nenhuma lista diz o prazo', 'A caixa de trocar o texto some e no lugar fica a explicação: nenhuma lista diz “dos últimos 90 dias”, então não há texto para trocar.'),
    ('pz-ficha', 'Na ficha do cliente, com 60 dias', 'A folha aprovada “Documentos pessoais” de Antônia: o selo vira “Mais de 60 dias”, e a linha do comprovante diz “O escritório aceita até 60 dias. Mudar o prazo”, que leva à folha do prazo.'),
    ('pz-ficha-equipe', 'A mesma ficha vista por Larissa', 'O mesmo selo, sem o link: “quem muda o prazo é Marina Ribeiro, a sócia dona”.'),
]
json.dump([{'nome': n, 'url': U + n} for n, _, _ in ITENS], open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)
h = lambda s: html.escape(s, quote=True)


def img(nome, tam, pub):
    if not pub:
        return f'{nome}-{tam}.webp'
    from PIL import Image
    im = Image.open(os.path.join(SAIDA, f'{nome}-{tam}.webp'))
    larg = 1100 if tam == 'computador' else 412
    if im.width > larg:
        im = im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=68, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def montar(pub):
    corpo = ''
    for nome, t, leg in ITENS:
        figs = ''
        for tam in ('computador', 'celular'):
            a, f = ('', '') if pub else (f'<a href="{U}{nome}">', '</a>')
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}">{a}<img src="{img(nome, tam, pub)}" alt="{h(t)}, {tam}." loading="lazy">{f}'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        ab = (f'<p class="abrir">Na pasta: <code>{U}{nome}</code></p>' if pub else f'<p class="abrir">Abrir: <a href="{U}{nome}">{U}{nome}</a></p>')
        corpo += f'<article>{figs}<div class="leg"><p class="est">{nome}</p><h3>{h(t)}</h3><p>{h(leg)}</p>{ab}</div></article>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prazo do comprovante</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px;line-height:1.1}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90!important;margin:0 0 6px!important}}
main{{padding:24px 48px 64px;max-width:1700px}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere;color:var(--tinta-2)}} .abrir a{{color:var(--vinho);font-weight:500}}
.est{{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#87335B;margin:0 0 4px!important}}
code{{font-size:12px;background:var(--sal);padding:1px 5px;border-radius:4px}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}} h1{{font-size:32px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Prazo do comprovante de residência</h1>
<p>Item F3.134 do painel, ideia AP-08. A sócia dona muda quanto tempo o comprovante de residência vale (padrão de 90 dias, de 30 a 365). O campo fica em Jurídico › Casos e processos › Documentos para começar, ao lado da lista por área, e a ficha do cliente leva até ele. Base: o desenho aprovado da jornada (portal-jornada-fechamento), com o mesmo elenco e o mesmo dia (quarta, 18/11/2026). Dados fictícios.</p>
<p>{"Capturas embutidas, em tamanho reduzido. Os HTML de cada estado estão na pasta do desenho." if pub else "Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado."} As decisões, o que o código precisa e as perguntas estão em NOTAS.md.</p></header>
<main>{corpo}</main></body></html>
'''


open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(False))
if PUBLICAR:
    open(os.path.join(SAIDA, 'publicar.html'), 'w', encoding='utf-8').write(montar(True))
print(len(ITENS), 'casos')
