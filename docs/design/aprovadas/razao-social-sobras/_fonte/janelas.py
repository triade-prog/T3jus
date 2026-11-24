# D2 · janela "Gerar carnê" e D3 · janela "Registrar recebimento": a linha de aviso de razão social em branco.
# Base: as páginas aprovadas portal-carne/financeiro.html (estado "carne") e portal-recibo-recorrente/financeiro.html
# (estado "rb-quem-pagou"), com o Santana no lugar do Ribeiro & Matos. A janela é montada como está no código de hoje
# (JanelaCarne em Carne.tsx e JanelaRegistrar em Financeiro.tsx, origin/main); o acréscimo é só a linha (linha_aviso).
# Uso: python3 janelas.py <pasta-saida>
import sys, re
from rz_dados import *
from paginas import ICO, ler, template, com_estados, css, titulo_meta, rebatizar, linha_aviso, script_esc

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
DONA = 'Carol Santana'


def trocar_dialog(t, novo):
    a = t.index('<dialog')
    b = t.index('</dialog>', a) + len('</dialog>')
    return t[:a] + novo + t[b:]


def op(nome, marcado, rot, peq, tipo='radio', foco=False, extra=''):
    return (f'<label class="opcao"><input class="marcar" type="{tipo}" name="{nome}"{" checked" if marcado else ""}{" data-foco" if foco else ""}{extra}>'
            f'<span>{rot}<small>{peq}</small></span></label>')


# ------------------------------------------------------------------ D2 · Gerar carnê (JanelaCarne)

def janela_carne(e, dono, sem_pix=False):
    m = razao_em_branco(e)
    p = e['pix']
    aviso_pix = ''
    if sem_pix:
        acao = (f'<a class="btn btn-sec" href="#">{ICO("moeda")}Cadastrar a chave Pix</a>' if dono
                else f'<button class="btn btn-sec" type="button">{ICO("sino")}Pedir a {DONA}</button>')
        texto = ('Sem ela, o carnê sai com as instruções de pagamento em texto. Com a chave, cada parcela ganha o QR e o Pix copia e cola.' if dono
                 else f'Quem cadastra é {DONA}, a sócia dona. Enquanto isso, o carnê sai com as instruções de pagamento em texto.')
        aviso_pix = (f'<div class="aviso aviso-atencao" role="status">{ICO("alerta")}<div><strong class="aviso-titulo">O escritório ainda não tem chave Pix no T3jus.</strong>'
                     f'<p>{texto}</p><div class="aviso-acoes">{acao}</div></div></div>')
    linha = linha_aviso('O carnê', dono, m, curto=e['curto']) if m else ''
    if sem_pix:
        pix = ('<div class="cn-pixbox"><h3>' + ICO('doc') + 'Como pagar (no lugar do Pix)</h3><p>Transferência ou depósito no Banco do Brasil, agência 1234-5, '
               'conta corrente 67890-1. Escreva o identificador da parcela na descrição e mande o comprovante pelo WhatsApp.</p>'
               f'<p class="cn-quem">{ICO("cadeado")}<span>As do escritório, em Escritório › Recebimento.</span></p></div>')
    else:
        quem = (f'<p class="cn-quem">{ICO("lapis")}<span>Mudar em <a href="#">Escritório › Recebimento</a>.</span></p>' if dono
                else f'<p class="cn-quem">{ICO("cadeado")}<span>Só {DONA}, a sócia dona, muda a chave.</span></p>')
        pix = (f'<div class="cn-pixbox"><h3>{ICO("moeda")}Pix do escritório</h3><dl><dt>Chave ({p["tipo"]})</dt><dd>{p["chave_vis"]}</dd>'
               f'<dt>Recebedor</dt><dd>{p["recebedor"]} · {p["cidade"]}</dd></dl>'
               '<p>Cada parcela leva o QR e o Pix copia e cola com o valor e um identificador, como <b class="num">C2026014P04</b>. '
               'O Pix do carnê não dá baixa sozinho: quando o cliente pagar, use Registrar recebimento.</p>' + quem + '</div>')
    mini = {None: 'completa', 'RAZAO': 'razao-vazia', 'TIPO': 'razao-vazia'}[m] if e['tipo'] != 'sem' else 'sem-sociedade'
    alt_mini = ''
    return f'''<dialog class="janela cn-janela" id="janela-carne" aria-labelledby="janela-carne-t" aria-describedby="janela-carne-d" data-abrir>
  <form method="dialog" class="janela-form" novalidate>
  <div class="janela-cabeca"><div><p class="sobretitulo">A receber · C-2026-014</p><h2 id="janela-carne-t">Gerar carnê</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ICO("x")}</button></div>
  <div class="janela-corpo"><div style="display:grid;gap:16px"><p id="janela-carne-d">Hélio Batista Corrêa · Honorários · ação revisional · 6 parcelas.</p>{aviso_pix}{linha}<div class="cn-j"><div class="cn-j-op"><fieldset class="fi-grupo-op"><legend>Parcelas</legend>{op("cn-p", True, "As que ainda vão vencer", "Parcelas 4/6 a 6/6 · 3 parcelas · R$ 2.550,00", foco=True)}{op("cn-p", False, "Escolher as parcelas", "Para incluir uma vencida ou deixar alguma de fora")}</fieldset><div class="cn-dois"><fieldset class="fi-grupo-op"><legend>Formato</legend>{op("cn-f", True, "3 parcelas por folha", "Recomendado. Canhoto e via do cliente lado a lado.")}{op("cn-f", False, "1 parcela por folha", "Maior, para imprimir ou mandar uma por mês. Cada folha já explica como pagar.")}</fieldset><fieldset class="fi-grupo-op"><legend>Capa</legend>{op("cn-c", True, "Incluir a capa", "Todas as parcelas, o total e como pagar.", tipo="checkbox")}</fieldset></div>{pix}</div><aside aria-label="Prévia do carnê"><figure class="cn-mini"><div class="cn-mini-img" aria-hidden="true"><img src="mini-carne-{mini}.webp" alt="" style="display:block;width:100%;height:auto"></div><figcaption><b>2 folhas A4</b>Capa e parcelas 4/6 a 6/6 · R$ 2.550,00{"" if not sem_pix else ". Sem QR: as instruções em texto"}.<br><span style="font-size:12px;color:var(--texto-2)">Prévia da primeira folha.</span></figcaption></figure></aside></div></div></div>
  <div class="janela-pe"><span class="cn-sobre-pe">O carnê fica guardado na ficha, com quem gerou e quando. Na página dele, imprima ou salve em PDF.</span><button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ICO("impressora")}Gerar e imprimir</button></div>
  </form>
</dialog>'''


s = rebatizar(ler('portal-carne/financeiro.html'))
_, _, BASE = template(s, 'carne')


def est_carne(nome, e, dono, sem_pix=False):
    t = BASE.replace('data-est="carne"', f'data-est="{nome}"', 1)
    t = re.sub(r' data-quem="[^"]*"', '', t, count=1)
    attrs = f' data-quem="{"socio" if dono else "financeiro"}"' + (f' data-esc="{e["curto"]}"' if e['curto'] != 'Santana Advocacia' else '')
    t = t.replace(f'data-est="{nome}"', f'data-est="{nome}"{attrs}', 1)
    return trocar_dialog(t, janela_carne(e, dono, sem_pix))


ESTADOS_CN = [
    est_carne('razao-dona', VAZIA, True),
    est_carne('razao-equipe', VAZIA, False),
    est_carne('tipo-dona', MIGRADO, True),
    est_carne('tipo-equipe', MIGRADO, False),
    est_carne('sem-pix-equipe', VAZIA, False, sem_pix=True),
    est_carne('sem-sociedade', SEM, True),
    est_carne('completa', COMPLETA, False),
]
out = com_estados(s, ESTADOS_CN, 'razao-dona')
out = script_esc(css(out))
out = titulo_meta(out, 'Gerar carnê · Santana Advocacia · T3jus',
                  'Janela Gerar carnê com a linha de aviso de razão social em branco (F3.146, D2).')
open(f'{SAIDA}/carne.html', 'w', encoding='utf-8').write(out)
print('carne ok', len(ESTADOS_CN))


# ------------------------------------------------------------------ D3 · Registrar recebimento (JanelaRegistrar)

def janela_registrar(e, dono, recibo=True):
    m = razao_em_branco(e)
    linha = linha_aviso('O recibo', dono, m, curto=e['curto']) if m else ''
    if linha and not recibo:
        linha = linha.replace('<p class="cn-chave rz-linha">', '<p class="cn-chave rz-linha" hidden>', 1)
    whats = (op('rg-whats', True, 'Mandar o recibo pelo WhatsApp', 'Vai em PDF para o contato principal do cliente, pelo número do escritório.', tipo='checkbox')
             if recibo else '')
    return f'''<dialog class="janela fi-larga" id="j-registrar" aria-labelledby="j-registrar-t" aria-describedby="j-registrar-d" data-abrir>
  <form method="dialog" class="janela-form" novalidate>
  <div class="janela-cabeca"><div><p class="sobretitulo">A receber</p><h2 id="j-registrar-t">Registrar recebimento</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ICO("x")}</button></div>
  <div class="janela-corpo"><div style="display:grid;gap:16px"><p id="j-registrar-d">Baixa a parcela e gera o recibo.</p><div class="fi-alvo">{ICO("carteira")}<div><strong>Hélio Batista Corrêa · parcela 3/6</strong><small>Ação revisional · venceu em 25/10/2026 · Pix</small></div><span class="fi-v num">R$ 850,00</span></div><div class="fi-dois"><div class="campo"><label for="rg-valor">Valor recebido</label><input class="entrada" id="rg-valor" type="text" inputmode="decimal" autocomplete="off" value="850,00" data-foco aria-describedby="rg-valor-aj"><p class="ajuda" id="rg-valor-aj">Falta receber nesta parcela: R$ 850,00.</p></div><div class="campo"><label for="rg-data">Dia em que o dinheiro entrou</label><input class="entrada" id="rg-data" type="text" inputmode="numeric" autocomplete="off" value="23/11/2026" aria-describedby="rg-data-aj"><p class="ajuda" id="rg-data-aj">dd/mm/aaaa</p></div></div><p class="fi-ref">{ICO("check")}<span>Este recebimento baixa a <b>parcela de outubro de 2026</b>, mesmo pago em novembro. No caixa, ele entra no dia em que o dinheiro entrou.</span></p><div class="fi-dois"><div class="campo"><label for="rg-forma">Forma de pagamento</label><select class="entrada" id="rg-forma"><option selected>Pix</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option></select></div><div class="campo"><label for="rg-multa">Multa e juros <span class="opcional">(opcional)</span></label><input class="entrada" id="rg-multa" type="text" inputmode="decimal" autocomplete="off" aria-describedby="rg-multa-aj"><p class="ajuda" id="rg-multa-aj">O que o cliente pagou a mais pelo atraso. Deixe em branco se não cobrou.</p></div></div><p class="fi-caixa-fixa">{ICO("coluna")}<span>Entra no caixa <b>do escritório</b>: é honorário. Valores de terceiros se registram em Repasses.</span></p><fieldset class="fi-grupo-op"><legend>Quem pagou</legend>{op("rg-pagou", True, "Hélio Batista Corrêa, o cliente", "O padrão. O recibo sai no nome dele.")}{op("rg-pagou", False, "O contato principal do cliente", "O recibo diz que o contato pagou, em favor do cliente. O nome vem do cadastro.")}{op("rg-pagou", False, "Outra pessoa ou empresa", "Escreva o nome e o CPF ou CNPJ de quem pagou.")}</fieldset>{op("rg-recibo", recibo, "Gerar o recibo", "O recibo ganha o número seguinte do escritório.", tipo="checkbox", extra=" data-rz-recibo")}<div data-rz-com-recibo{"" if recibo else " hidden"}>{whats}</div>{linha}</div></div>
  <div class="janela-pe"><button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ICO("check")}Registrar recebimento</button></div>
  </form>
</dialog>'''


s = rebatizar(ler('portal-recibo-recorrente/financeiro.html'))
_, _, BASE_RG = template(s, 'rb-quem-pagou')


def est_rg(nome, e, dono, recibo=True):
    t = BASE_RG.replace('data-est="rb-quem-pagou"', f'data-est="{nome}"', 1)
    t = re.sub(r' data-quem="[^"]*"', '', t, count=1)
    attrs = f' data-quem="{"socio" if dono else "financeiro"}"' + (f' data-esc="{e["curto"]}"' if e['curto'] != 'Santana Advocacia' else '')
    t = t.replace(f'data-est="{nome}"', f'data-est="{nome}"{attrs}', 1)
    return trocar_dialog(t, janela_registrar(e, dono, recibo))


ESTADOS_RG = [
    est_rg('razao-dona', VAZIA, True),
    est_rg('razao-equipe', VAZIA, False),
    est_rg('tipo-equipe', MIGRADO, False),
    est_rg('sem-recibo', VAZIA, False, recibo=False),
    est_rg('sem-sociedade', SEM, False),
]
# Na página: desmarcar "Gerar o recibo" tira o WhatsApp e a linha (como no código); marcar de novo, volta.
JS = '''<script>
document.addEventListener('change',function(e){var c=e.target.closest('[data-rz-recibo]');if(!c)return;var d=c.closest('.janela-corpo');
d.querySelectorAll('[data-rz-com-recibo]').forEach(function(x){x.hidden=!c.checked});d.querySelectorAll('.rz-linha').forEach(function(x){x.hidden=!c.checked})});
</script>'''
out = com_estados(s, ESTADOS_RG, 'razao-dona')
out = script_esc(css(out)).replace('</body>', JS + '\n</body>', 1)
out = titulo_meta(out, 'Registrar recebimento · Santana Advocacia · T3jus',
                  'Janela Registrar recebimento com a linha de aviso de razão social em branco (F3.146, D3).')
open(f'{SAIDA}/recibo.html', 'w', encoding='utf-8').write(out)
print('recibo ok', len(ESTADOS_RG))
