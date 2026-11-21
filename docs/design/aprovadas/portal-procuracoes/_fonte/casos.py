# Lista dos estados (capturas) e o index.html com todas as capturas e a legenda.
# Uso: python3 casos.py <pasta-saida>
# "alto": altura da janela do computador na captura, para as janelas longas aparecerem inteiras.
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'procuracoes.html?estado='

SECOES = [
    ('1. Procurações e modelos', 'A seção que a 1ª rodada aprovou (decisão 24), agora com o que falta anexar em destaque e os modelos numa página própria. CH-08.', [
        ('procuracoes', 'Documentos gerados', 'Busca e filtro pela situação da assinatura: Todos, Falta anexar o assinado e Assinados. O que falta anexar vem primeiro, com filete âmbar, e o aviso no alto lembra que o contrato de Benedito só fica ativo com o assinado. Cada linha: documento e versão, dado marcado, cliente e contrato, quem gerou, assinatura, Anexar o assinado e Baixar. Ao lado, os modelos, os advogados com todas as inscrições e o lugar reservado da assinatura eletrônica.', 0),
        ('procuracoes-vazio', 'Primeiro uso', 'Dois passos: conferir os modelos (já vêm os três padrão do T3jus) e gerar a partir de um contrato, que pode estar em elaboração.', 0),
    ]),
    ('2. Modelos de documento', 'Contrato de honorários, procuração e declaração de hipossuficiência, com o mesmo padrão aprovado nas petições: .docx com campos entre colchetes, padrão T3jus ou do escritório, versões guardadas e conferência na chegada.', [
        ('modelos', 'Os três modelos e os campos aceitos', 'Cada modelo com o selo Do escritório ou Padrão T3jus, versão, quem enviou, campos e usos; Baixar e Trocar (no padrão, Usar o do escritório); as versões anteriores guardadas. Um lugar para outros documentos do escritório (pergunta 1). Ao lado, os campos aceitos por grupo, com os mesmos nomes das petições.', 0),
        ('modelo-enviar', 'Enviar modelo: conferência', 'O arquivo é conferido assim que chega. O campo desconhecido [QUALIFICACAO_CLIENTE] avisa e sugere [CLIENTE_QUALIFICACAO]; a falta de [PODERES_ESPECIAIS] também só avisa. Nada disso bloqueia salvar.', 1500),
        ('modelo-erro', 'Enviar modelo: arquivo bloqueado', 'O .doc antigo bloqueia (como PDF e .docm): o erro fica preso ao arquivo, diz como salvar em .docx e que o padrão continua valendo.', 1100),
    ]),
    ('3. Gerar documentos', 'Uma página só, sem passos, como a aprovada: contrato, documentos, advogados outorgados com as inscrições, poderes especiais e a data. Ao lado, a prévia em papel timbrado com uma aba por documento e as três marcas que não dependem só da cor. Embaixo, o que vai sair e o botão.', [
        ('gerar-escolher', 'Começando por Procurações: escolher o contrato', 'Os contratos sem documentos vêm primeiro. Cliente sem contrato: cria-se o contrato em elaboração (pergunta 4).', 0),
        ('gerar', 'Vindo da ficha do contrato, com dado faltando', 'Benedito, PF. O contrato já vem escolhido. Falta o RG: avisa e não bloqueia, sai [RG: falta]. Felipe entra com as duas inscrições, a principal primeiro. Poderes do art. 105 do CPC e “Outro poder” em texto. A prévia mostra o contrato com as condições de honorário na cláusula 3.', 0),
        ('gerar-pj', 'Cliente pessoa jurídica', 'Farmácia Bom Jesus Ltda.: a sócia-administradora entra como quem assina pela empresa. O contrato já assinado vem desmarcado. A declaração de hipossuficiência avisa que a empresa precisa provar (Súmula 481 do STJ) e sai na versão para pessoa jurídica.', 0),
        ('gerar-menor', 'Cliente menor, representado', 'Pedro, 12 anos, representado pela mãe: ela assina os três em nome dele. A tela explica representado, assistido (16 e 17 anos) e curatela.', 0),
        ('gerar-erro', 'Erro que bloqueia', 'Nenhum documento e nenhum advogado marcados: resumo de erros no topo com links, erro preso a cada grupo, nada gerado. O botão continua ativo.', 0),
        ('gerado', 'Resultado', 'Um .docx por documento e Baixar todos (.zip), que recebe o foco. O RG que saiu marcado, os próximos passos (revisar, imprimir, colher a assinatura, anexar o assinado), a assinatura eletrônica reservada e, ao lado, o que foi usado.', 0),
    ]),
    ('4. Assinados e gerar de novo', 'A aba Documentos da ficha do contrato, no lugar do texto “sendo preparado”. Anexar o contrato assinado é registrar a assinatura: ativa o contrato e manda a programação ao Financeiro (decisão 19 dos Contratos).', [
        ('ficha-documentos', 'Ficha do contrato · aba Documentos', 'Os três documentos na versão 2, cada um com a situação, Anexar o assinado e Baixar, e a versão anterior guardada. O âmbar diz o próximo passo. Ao lado, o que anexar o contrato faz e o lugar da assinatura eletrônica.', 0),
        ('anexar', 'Anexar os assinados (janela)', 'Um arquivo (PDF ou foto) e a data por documento. O bloco do contrato tem filete vinho e diz, antes de anexar, que o contrato fica ativo e a programação vai ao Financeiro. O botão diz o que acontece: Anexar e ativar o contrato.', 1500),
        ('anexar-erro', 'Anexar: erros', 'O .docx gerado no lugar do assinado e uma data depois de hoje: resumo no topo, erro preso ao campo, nada anexado, contrato continua em elaboração.', 1600),
        ('anexado', 'Contrato ativo', 'Depois de anexar: o contrato fica Ativo, o âmbar passa a mostrar o próximo recebimento e cada documento traz Baixar o assinado e Baixar o .docx.', 0),
        ('gerar-novo', 'Gerar de novo (o RG foi completado)', 'O aviso diz que a versão 1 é de hoje, o que mudou na ficha e que a versão 1 fica guardada. As escolhas vêm iguais às da v1. A prévia já mostra o RG.', 0),
    ]),
    ('5. Quem vê', 'A área só aparece para quem a sócia dona liberou (PA-01, PA-02).', [
        ('sem-contratos', 'Larissa, só com Jurídico, por link direto', 'Contratos não aparece no menu nem no Mais. Pelo link, a página diz que a área não está liberada e quem libera. O servidor responde AREA_NAO_LIBERADA.', 0),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for nome, _, _, alto in itens:
        c = {'nome': nome, 'url': U + nome}
        if alto:
            c['alto'] = alto
        casos.append(c)
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def montar(img):
    """img(nome, tam) devolve o src da captura."""
    corpo = ''
    for n, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, t, leg, _ in itens:
            url = U + nome
            figs = ''
            for tam in ['computador', 'celular']:
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{img(nome, tam)}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                      f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
        corpo += '</section>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Procurações e modelos · T3jus</title>
<meta name="description" content="Segunda rodada de Contratos › Procurações e modelos (CH-08, hipótese a validar), em computador e celular, para a Carol aprovar.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:90ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
.hip{{display:inline-block;margin:14px 0 0;padding:8px 14px;border:1.5px dashed #E9AE90;border-radius:10px;color:#fff;font-size:13px}} .hip b{{font-weight:500}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · Contratos · 2ª rodada · para aprovação da Carol</p><h1>Procurações e modelos</h1>
<p class="hip"><b>Hipótese a validar (CH-08).</b> Este desenho é para conversar com os escritórios piloto antes de virar código.</p>
<p>Contrato de honorários, procuração e declaração de hipossuficiência gerados em .docx no timbrado, com os dados do cliente, do contrato e dos advogados (OAB da Equipe). Parte da 1ª rodada aprovada em Contratos e do gerador de petições, já aprovado e programado: modelos do escritório com campos entre colchetes, prévia com marcas, dado faltando que avisa e não bloqueia. Agora entram a página de modelos, a pessoa jurídica, o menor representado, o erro, o resultado, anexar os assinados (o do contrato ativa o contrato), gerar de novo com versões e a aba Documentos da ficha do contrato. A assinatura eletrônica (CH-09) continua só com lugar reservado. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, dados novos no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Documentos</a><a href="#s2">Modelos</a><a href="#s3">Gerar</a><a href="#s4">Assinados</a><a href="#s5">Quem vê</a></nav></header>
<main>{corpo}</main></body></html>
'''


if __name__ == '__main__':
    open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(lambda n, t: f'{n}-{t}.webp'))
    print(len(casos), 'casos')
