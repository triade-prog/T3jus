# Fatura mensal do T3jus ao escritório (CO-06, F1.21): o modelo A4, uma página por fatura.
# Meio de pagamento: Inter Empresas, boleto com Pix (Carol, 22/11/2026). Sem nota fiscal por agora.
# Estados por ?estado= (padrao, sem-codigos, sem-endereco, atraso, paga, cancelada, carne, pb).
# Uso: python3 fatura_a4.py <pasta-saida>
import sys
from cob_dados import *
from pecas_pdf import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
ATD = ph('atendimento@exemplo.com.br')


def selo(sit, dias=None):
    if sit == 'avencer':
        return f'<span class="dp-selo dp-selo-avencer">{ico("agenda")}A vencer</span>'
    if sit == 'atraso':
        return f'<span class="dp-selo dp-selo-atraso">{ico("relogio")}Em atraso · {dias} dias</span>'
    if sit == 'paga':
        return f'<span class="dp-selo dp-selo-paga">{ico("check")}Paga</span>'
    return f'<span class="dp-selo dp-selo-cancelada">{ico("x")}Cancelada · não pague</span>'


def itens_tab(itens):
    linhas = ''
    for d, det, v, motivo in itens:
        q = f'<q>{motivo}</q>' if motivo else ''
        linhas += f'<tr><td>{d}<small>{det}</small>{q}</td><td>{R(v)}</td></tr>'
    total = sum(i[2] for i in itens)
    return (f'<section class="dp-sec" aria-label="Itens da fatura"><h3>Itens da fatura <small>Em reais, com os centavos exatos.</small></h3>'
            f'<table class="dp-tab"><thead><tr><th scope="col">Descrição</th><th scope="col">Valor</th></tr></thead>'
            f'<tbody>{linhas}</tbody><tfoot><tr><td>Total</td><td>{R(total)}</td></tr></tfoot></table></section>')


def pix_box(pix, total, rot, validade):
    return (f'<div class="dp-pix">{qr_svg(pix, rot)}<div class="dp-pix-txt">'
            f'<div class="dp-cab-cod"><p>Pix · Banco Inter</p><span class="dp-tag">Código de exemplo</span></div>'
            f'<p>No app do banco, leia o QR Code ou cole o código. Antes de confirmar, veja se aparecem '
            f'<b>{PIX["recebedor"]}</b> e <b>{R(total)}</b>.</p>'
            f'<p class="dp-rot" style="margin-top:.6mm">Pix copia e cola</p><code>{pix}</code>'
            f'<p class="dp-nota-p">{validade} Pago por Pix, a fatura fica paga na hora.</p></div></div>')


def bol_box(linha, barras, venc, extra=''):
    return (f'<div class="dp-bol"><div class="dp-cab-cod"><p>Boleto · Banco Inter (077)</p><span class="dp-tag">Código de exemplo</span></div>'
            f'<p class="dp-linha"><span class="dp-rot">Linha digitável</span><code>{linha}</code></p>'
            f'{barras_svg(barras, "Código de barras do boleto, o mesmo da linha digitável")}'
            f'<p class="dp-nota-p">Vencimento {venc}{extra}. Pago por boleto, a baixa leva até 1 dia útil. '
            f'O boleto completo, do banco, vai junto no e-mail e fica no Portal.</p></div>')


def como_pagar(chave, total, titulo='Como pagar', validade=None, venc=None, extra_bol=''):
    pix, linha, barras = codigos_fatura(chave)
    f = FATURAS[chave]
    venc = venc or f['venc']
    validade = validade or f'Vale até o vencimento, {venc}.'
    return (f'<section class="dp-sec" aria-label="{titulo}"><h3>{titulo} <small>Boleto com Pix do Banco Inter: é uma cobrança só. Pague por um dos dois.</small></h3><div class="dp-pagar">'
            f'{pix_box(pix, total, "QR Code do Pix da fatura " + f["numero"] + ", " + R(total) + " (exemplo)", validade)}'
            f'{bol_box(linha, barras, venc, extra_bol)}</div></section>')


def sem_codigos(f, total):
    return (f'<section class="dp-sec" aria-label="Como pagar"><h3>Como pagar</h3><div class="dp-sem"><div>'
            f'<p><b>Os códigos de pagamento ainda não saem nesta fatura.</b> Enquanto a cobrança pelo Banco Inter não está ligada, '
            f'o pagamento é combinado direto com a equipe do T3jus:</p><ol>'
            f'<li><span>Escreva para {ATD} com o número da fatura, <b>{f["numero"]}</b>. A equipe responde com os dados para pagar.</span></li>'
            f'<li><span>Pague <b>{R(total)}</b> até <b>{f["venc"]}</b> e responda com o comprovante.</span></li>'
            f'<li><span>A equipe registra o pagamento. O recibo chega no e-mail de cobrança e a fatura aparece como paga no Portal.</span></li></ol></div>'
            f'<div class="dp-ctt"><span class="dp-rot">Fale com o T3jus</span><b>{ATD}</b>'
            f'<span>Diga: fatura {f["numero"]}, {f["esc"]["nome"]}, {R(total)}.</span></div></div></section>')


def info(f, sit, codigos=True):
    if sit in ('paga', 'cancelada'):
        q = '<p><b>Guarde este documento</b>Ele mostra o que foi cobrado e o que aconteceu com a fatura. Nada é apagado no T3jus.</p>'
    elif not codigos:
        q = ('<p><b>Quando pagar</b>Até o vencimento. A fatura fica paga quando a equipe do T3jus registra o pagamento, '
             'a partir do comprovante.</p>')
    elif sit == 'atraso':
        q = '<p><b>Quando pagar</b>Até 27/11/2026, com os códigos desta 2ª via. Pix fica pago na hora; boleto, em até 1 dia útil.</p>'
    else:
        q = ('<p><b>Quando pagar</b>Até o vencimento. Venceu? Peça a 2ª via, com códigos novos e o mesmo valor, sem multa nem juros.</p>')
    if sit == 'cancelada':
        nf = f'<p><b>Pagou por engano?</b>Escreva para {ATD} com o comprovante: o valor é devolvido.</p>'
    else:
        nf = ('<p><b>Recibo</b>O recibo chega no e-mail de cobrança assim que o pagamento é confirmado e fica no Portal, '
              'em Escritório › Plano e faturas.</p>')
    return (f'<div class="dp-info">{q}{nf}<p><b>Dúvidas</b>Escreva para {ATD}. A fatura também está no Portal, em Escritório.</p></div>')


def folha(chave='cedro', sit='avencer', codigos=True, com_end=True):
    f = FATURAS[chave]
    e = f['esc']
    total = sum(i[2] for i in f['itens'])
    parc = f.get('parcela')
    num = f'Nº <b>{f["numero"]}</b> · competência {f["comp"]}' + (f' · parcela {parc} de 12' if parc else '')
    rot_val, venc_txt, faixa, val_cls = 'Total a pagar', f'Vence em <strong>{f["venc"]}</strong>', '', ''
    if sit == 'atraso':
        rot_val, venc_txt = 'Total em aberto', f'Venceu em <strong>{f["venc"]}</strong>'
        faixa = (f'<p class="dp-faixa dp-faixa-urg" role="note">{ico("relogio")}<span><b>Esta fatura venceu em {f["venc"]}, há 41 dias.</b> '
                 f'Se já pagou, desconsidere e mande o comprovante para {ATD}. '
                 f'A fatura de novembro de 2026 (R$ 190,00, venceu em 10/11/2026) também está em aberto e tem o próprio documento.</span></p>')
    elif sit == 'paga':
        rot_val, venc_txt = 'Total pago', 'Paga em <strong>20/11/2026</strong>'
        faixa = (f'<p class="dp-faixa dp-faixa-paga" role="note">{ico("check")}<span><b>Fatura paga em 20/11/2026, por Pix fora da cobrança.</b> '
                 f'O pagamento foi registrado pela equipe do T3jus com o comprovante do escritório. O recibo nº {f["numero"]} foi para o e-mail de cobrança e está no Portal.</span></p>')
    elif sit == 'cancelada':
        rot_val, venc_txt = 'Valor cancelado', 'Nada a pagar'
        val_cls = ' style="text-decoration:line-through;text-decoration-thickness:.4mm"'
        faixa = (f'<p class="dp-faixa dp-faixa-canc" role="note">{ico("x")}<span><b>Fatura cancelada em 20/11/2026. Não vale para pagamento: não pague.</b> '
                 f'Nada foi cobrado. O Pix e o boleto dela deixaram de valer; se alguém pagar por engano, o valor é devolvido.</span></p>')
    elif parc:
        faixa = (f'<p class="dp-faixa dp-faixa-info" role="note">{ico("doc")}<span><b>Parcela {parc} de 12 do carnê 2026/2027.</b> '
                 f'O Pix e o boleto abaixo são os mesmos da parcela {parc} do carnê que o escritório recebeu em 15/09/2026. '
                 f'Pague por um deles, uma vez só.</span></p>')
    topo = (f'<div class="dp-topo"><div class="dp-titulo"><p class="dp-rot">Fatura da assinatura do T3jus</p>'
            f'<h2>Fatura{selo(sit, 41)}</h2><p class="dp-num">{num}</p></div>'
            f'<div class="dp-valor"><span class="dp-rot">{rot_val}</span><b{val_cls}>{R(total)}</b>'
            f'<span class="dp-venc">{venc_txt}</span><span class="dp-exemplo">Valores de exemplo</span></div></div>')
    forma_dd = (f['forma'] + ('<small>Banco Inter</small>' if 'Pix' in f['forma'] else '')) if codigos else 'Boleto com Pix<small>ainda não ligado</small>'
    if not com_end:
        forma_dd = 'Só Pix<small>falta o endereço para o boleto</small>'
    end = (f'{e["end"]}' if com_end else '<span style="font-style:italic;font-weight:400">não informado: o boleto não saiu</span>')
    dados = (f'<dl class="dp-dados"><div class="dp-l2"><dt>Pagador</dt><dd>{e["nome"]}<small>CNPJ {e["cnpj"]}</small></dd></div>'
             f'<div class="dp-l2"><dt>E-mail de cobrança</dt><dd>{e["email"]}<small>com cópia para {e["copia"]}, {e["copia_papel"]}</small></dd></div>'
             f'<div class="dp-l2"><dt>Endereço de cobrança</dt><dd style="font-weight:400">{end}</dd></div>'
             f'<div><dt>Plano</dt><dd>{f["plano"]}<small>emitida em {f["emitida"]}</small></dd></div><div><dt>Forma</dt><dd>{forma_dd}</dd></div></dl>')
    if sit == 'paga':
        pagar = (f'<section class="dp-sec dp-carimbo-w" aria-label="Pagamento"><h3>Pagamento</h3><dl class="dp-dados" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
                 f'<div><dt>Pago em</dt><dd>20/11/2026</dd></div><div><dt>Forma</dt><dd>Pix fora da cobrança<small>registrado à mão</small></dd></div>'
                 f'<div><dt>Recibo</dt><dd>nº {f["numero"]}<small>no Portal e no e-mail</small></dd></div></dl>'
                 f'<p class="dp-carimbo" aria-hidden="true"><b>{ico("check")}Paga</b><span>em 20/11/2026 · os códigos não valem mais</span></p></section>')
    elif sit == 'cancelada':
        pagar = (f'<section class="dp-sec dp-carimbo-w" aria-label="Como pagar"><h3>Como pagar</h3>'
                 f'<p class="dp-sem" style="display:block">Esta fatura foi cancelada. <b>Não há nada a pagar</b>, e por isso '
                 f'o Pix e o boleto não aparecem aqui. Se tiver dúvida, escreva para {ATD}.</p>'
                 f'<p class="dp-carimbo canc" aria-hidden="true"><b>{ico("x")}Cancelada</b><span>em 20/11/2026 · não pague</span></p></section>')
    elif not codigos:
        pagar = sem_codigos(f, total)
    elif not com_end:
        pix, _, _ = codigos_fatura(chave)
        pagar = (f'<section class="dp-sec" aria-label="Como pagar"><h3>Como pagar <small>Esta fatura saiu só com Pix.</small></h3><div class="dp-pagar">'
                 f'{pix_box(pix, total, "QR Code do Pix da fatura " + f["numero"] + ", " + R(total) + " (exemplo)", "Vale até o vencimento, " + f["venc"] + ".")}'
                 f'<p class="dp-faixa dp-faixa-info" style="margin-top:0">{ico("alerta")}<span><b>O boleto não saiu porque falta o endereço de cobrança do escritório,</b> '
                 f'que o banco exige para registrar o boleto. Pague pelo Pix acima. Se preferir boleto, mande o endereço completo, com CEP, para {ATD}: '
                 f'a equipe atualiza e manda a fatura de novo, com o boleto.</span></p></div></section>')
    elif sit == 'atraso':
        pagar = como_pagar(chave, total, 'Como pagar: 2ª via de 20/11/2026', 'Vale até 27/11/2026.', '27/11/2026')
    else:
        pagar = como_pagar(chave, total)
    pe = (f'<p class="dp-pe"><span>Fatura nº {f["numero"]} · emitida em {f["emitida"]}'
          f'{" · 2ª via em 20/11/2026" if sit == "atraso" else ""} · enviada por {ph("cobranca@exemplo.com.br")}</span>'
          f'<span class="dp-t3">{SIMB}T3jus · Sistema jurídico</span></p>')
    return (f'<article class="dp-folha dp-doc" aria-label="Fatura nº {f["numero"]}, {e["nome"]}">{timbre()}{topo}{faixa}{dados}'
            f'{itens_tab(f["itens"])}{pagar}{info(f, sit, codigos)}{pe}</article>')


ESTADOS = [
    ('padrao', 'Padrão', 'Cedro & Lima, dezembro: boleto com Pix do Banco Inter', folha(), ''),
    ('sem-codigos', 'Sem códigos (hoje)', 'Meio de pagamento ainda não escolhido', folha(codigos=False),
     '<b>Como sai hoje.</b> Até a cobrança pelo Banco Inter ficar ligada, a fatura não tem Pix nem boleto. No lugar, o caminho que já funciona: '
     'escrever para o T3jus, pagar e mandar o comprovante. Nada promete baixa automática.'),
    ('sem-endereco', 'Sem endereço', 'Cedro & Lima sem endereço de cobrança: só Pix', folha(com_end=False),
     '<b>Sem endereço de cobrança.</b> O boleto registrado do Banco Inter exige o endereço do pagador. Sem ele, a fatura sai só com o Pix e diz por quê, '
     'com o caminho para receber o boleto. No Console, a aba Assinatura mostra "Falta o endereço".'),
    ('atraso', 'Em atraso', 'Bacuri, outubro: 2ª via com 41 dias de atraso', folha('bacuri', 'atraso'),
     '<b>Em atraso.</b> A 2ª via sai com códigos novos e o mesmo valor, sem multa nem juros, e lembra a outra fatura em aberto. O tom é o da régua aprovada: '
     '"se já pagou, desconsidere".'),
    ('paga', 'Paga', 'Cedro & Lima, paga em 20/11 (registro à mão)', folha(sit='paga'),
     '<b>Paga.</b> Baixar a fatura depois de paga mostra a data e a forma, o carimbo "Paga" e nenhum código, para ninguém pagar de novo.'),
    ('cancelada', 'Cancelada', 'Cedro & Lima, cancelada em 20/11', folha(sit='cancelada'),
     '<b>Cancelada.</b> O valor aparece riscado, o carimbo diz "não pague" e o Pix e o boleto não saem. O motivo, que é interno, não vai no documento.'),
    ('carne', 'Parcela de carnê', 'Pequi, dezembro: parcela 3 de 12', folha('pequi'),
     '<b>Parcela de carnê.</b> A fatura do mês diz de que carnê e de que parcela ela é. Os códigos são exatamente os da parcela 3 no carnê.'),
    ('pb', 'Preto e branco', 'Como sai numa impressora comum', folha(),
     '<b>Prévia em preto e branco.</b> Tudo o que informa está em texto escuro ou em linha. O QR e o código de barras são pretos no branco.'),
]

open(f'{SAIDA}/fatura-a4.html', 'w', encoding='utf-8').write(pagina(
    'fatura-a4.html', 'Fatura do T3jus · modelo A4',
    'Modelo da fatura mensal que o T3jus manda ao escritório, em A4: itens, total, vencimento e como pagar com Pix ou boleto.',
    'Prévia da fatura', 'Modelo A4 da fatura mensal ao escritório', ESTADOS))
print('fatura-a4 ok', len(ESTADOS), 'estados')
