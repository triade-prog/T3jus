# Monta o inicio.html da v3 a partir do modelo (inicio.tpl.html): põe os ícones de traço do site
# (sistema/apps/site/src/components/Icones.astro, sem mudança) e os quatro painéis das abas.
# Uso: python3 inicio_v3.py <pasta-saida>
import sys, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
sai = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, '..')
ICONES = '/home/claude/t3jus/sistema/apps/site/src/components/Icones.astro'

icones = open(ICONES, encoding='utf-8').read()
icones = re.sub(r'^---.*?---\s*', '', icones, flags=re.S).strip()

CHECK = '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>'
PAINEIS = [
    dict(id='comercial', img='aba-comercial', titulo='A proposta sai no timbrado e, aceita, vira contrato.',
         texto='Cada contato tem origem, retorno e responsável. A proposta guarda a situação e as condições de honorário, sem redigitar nada depois.',
         itens=['Atendimentos com o retorno de cada um e o funil do escritório',
                'Proposta em Word no timbrado, com a marca do escritório',
                'Aceita, gera o contrato com as mesmas condições'],
         legenda='Comercial › Propostas › a ficha de uma proposta em negociação.',
         alt='Ficha da proposta P-2026-016, Divórcio consensual, para Gabriela Teixeira, com dados fictícios: em negociação, honorário parcelado de R$ 4.000,00 em 4 parcelas, e o retorno marcado para hoje, 18/11: responder à contraproposta, em que a cliente pediu 5 parcelas, com Marina Ribeiro.'),
    dict(id='contratos', img='aba-contratos', titulo='Do contrato saem as parcelas, e das parcelas, o carnê.',
         texto='Fixo, parcelado, mensal, êxito e percentual recorrente no mesmo contrato. As datas e os valores vêm dele, e o carnê sai pronto para imprimir.',
         itens=['Contrato, procuração e declaração no timbrado, em Word e PDF',
                'Carnê com o QR do Pix do próprio escritório, sem boleto nem intermediário',
                'Assinatura registrada com o arquivo assinado anexado'],
         legenda='A janela Gerar carnê, na ficha do contrato.',
         alt='Janela Gerar carnê do contrato C-2026-014, de Hélio Batista Corrêa, com dados fictícios: as 3 parcelas que ainda vão vencer, 3 parcelas por folha, com capa, o Pix do escritório (chave CNPJ) e a prévia das 2 folhas A4 com o QR de cada parcela.'),
    dict(id='juridico', img='aba-juridico', titulo='Cada caso com a sua etapa, os prazos e quem cuida.',
         texto='Casos com vários clientes, etapas definidas pelo escritório, prazos e tarefas com responsável e os documentos que faltam. A agenda junta audiências e prazos da equipe toda.',
         itens=['Etapas do jeito do escritório, com a próxima à vista',
                'Petições a partir dos modelos do escritório, em Word',
                'Agenda da equipe com audiências, reuniões e prazos'],
         legenda='Jurídico › Casos e processos › a ficha de um caso.',
         alt='Ficha do caso Pereira x Mercado Bom Preço, trabalhista, com dados fictícios: etapa 5 de 8, Sentença, desde 07/11, com a próxima etapa, Recurso; abaixo, os dados do processo no TRT-2 e as petições do caso.'),
    dict(id='financeiro', img='aba-financeiro', titulo='O mês do escritório ao lado do dinheiro de terceiros, sem somar.',
         texto='O que entrou, o que venceu, o que entra nos próximos 7 dias e o que é do cliente, cada um no seu lugar. O contador recebe a planilha e os comprovantes do mês.',
         itens=['Previsto contra realizado, com a meta do mês',
                'A pagar, caixa e reembolso de custas ligado ao caso',
                'Exportação para o contador, com os comprovantes em .zip'],
         legenda='Financeiro › Resumo, na quarta-feira, 18 de novembro.',
         alt='Resumo do Financeiro, com dados fictícios: R$ 31.240,00 recebidos em novembro, de R$ 48.300,00 previstos (65%), R$ 7.050,00 vencidos e R$ 8.000,00 que entram em 7 dias; ao lado, R$ 30.284,96 de terceiros na conta, que não são do escritório.'),
]


def painel(p, primeiro):
    itens = ''.join(f'<li>{CHECK}{t}</li>' for t in p['itens'])
    return f'''<div class="painel" role="tabpanel" id="p-{p['id']}" aria-labelledby="a-{p['id']}" tabindex="0"{'' if primeiro else ' hidden'}>
    <div class="p-texto"><div><h3>{p['titulo']}</h3><p>{p['texto']}</p></div><ul class="p-lista">{itens}</ul></div>
    <figure class="p-tela"><div class="janela"><div class="barra" aria-hidden="true"><i></i><i></i><i></i><span><svg class="ico"><use href="#i-cadeado"/></svg>app.t3jus.pro</span></div><picture><source media="(max-width: 760px)" srcset="capturas/{p['img']}-celular.webp" width="780" height="1688"><img src="capturas/{p['img']}.webp" width="2560" height="1600" loading="lazy" alt="{p['alt']}"></picture></div><figcaption class="p-legenda">{p['legenda']} Tela real, dados fictícios.</figcaption></figure>
  </div>'''


html = open(os.path.join(AQUI, 'inicio.tpl.html'), encoding='utf-8').read()
html = html.replace('<!--ICONES-->', icones)
html = html.replace('<!--PAINEIS-->', '\n  '.join(painel(p, i == 0) for i, p in enumerate(PAINEIS)))
open(os.path.join(sai, 'inicio.html'), 'w', encoding='utf-8').write(html)
print('inicio.html ok', len(html))
