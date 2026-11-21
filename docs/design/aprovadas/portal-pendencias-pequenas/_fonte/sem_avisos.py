# Portal · Clientes › ficha: "não receber avisos" (F3.63, PA-03; PT-03, PT-10, PA-01).
# Parte da ficha aprovada do Clientes (clientes.py, sem mudança) e acrescenta só:
#   1. a folha "Avisos automáticos" logo abaixo de Contatos;
#   2. o selo "Sem avisos ..." no cabeçalho vinho, ao lado de "Ativo";
#   3. as janelas de registrar e de retirar o pedido.
# Peças novas com prefixo sa-. Uso: python3 sem_avisos.py <pasta-saida>
import sys
from base import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'sem-avisos.html?estado='

CSS_SA = r"""
/* ==========================================================================
   Ficha do cliente · Avisos automáticos (prefixo sa-)
   ========================================================================== */
.sa-corpo{padding:0 24px 20px;display:grid;gap:14px}
.sa-linha{display:flex;align-items:flex-start;gap:12px;font-size:13.5px;line-height:1.5}
.sa-linha>.ico{flex:none;margin-top:1px;color:var(--vinho-4)}
.sa-linha b{font-weight:600;color:var(--texto)}
.sa-linha span{color:var(--texto-2)}
.sa-fora{display:grid;gap:12px;padding:14px 16px 14px 18px;border-radius:var(--raio);background:var(--ambar-3);box-shadow:inset 3px 0 0 var(--vinho)}
.sa-fora-tit{display:flex;align-items:flex-start;gap:12px}
.sa-fora-tit .ico{flex:none;color:var(--vinho);margin-top:2px}
.sa-fora-tit strong{display:block;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);line-height:1.25}
.sa-fora-tit small{display:block;font-size:13px;color:var(--tinta);line-height:1.45;margin-top:2px}
.sa-dl{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 18px;padding-left:36px}
.sa-dl dt{font-size:12px;color:var(--tinta)}
.sa-dl dd{margin:0;font-size:13.5px;font-weight:500;color:var(--tinta);line-height:1.4}
.sa-dl dd small{display:block;font-weight:400;font-size:12px}
.sa-continua{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;color:var(--texto-2)}
.sa-continua .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}
.sa-continua b{color:var(--texto);font-weight:500}
.sa-acoes{display:flex;gap:10px;flex-wrap:wrap}
.sa-hist{border-top:1px solid var(--divisor);margin:0 -24px;padding:0 24px}
.sa-hist summary{display:flex;align-items:center;gap:8px;min-height:48px;cursor:pointer;font-weight:500;color:var(--vinho);list-style:none}
.sa-hist summary::-webkit-details-marker{display:none}
.sa-hist summary .ico{width:16px;height:16px;transition:transform .15s}
.sa-hist[open] summary .ico-abre{transform:rotate(180deg)}
.sa-hist summary .q{font-size:12px;color:var(--texto-2);font-weight:400}
.sa-ev{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:0}
.sa-ev li{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.sa-ev li:first-child{border-top:0}
.sa-ev time{color:var(--texto-2);font-variant-numeric:tabular-nums}
.sa-ev b{font-weight:600}
.sa-ev small{display:block;color:var(--texto-2);font-size:12px}
.meta .sa-selo{background:var(--ambar-2);color:var(--tinta)}
.meta .sa-selo .ico{width:14px;height:14px}
/* Janela: rádios em cartão (padrão do Clientes) e o campo de "outra pessoa" logo abaixo */
.sa-j .x-ops-l{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.sa-j .x-ops .opcao small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4;margin-top:2px}
.sa-j .x-ops.sa-tipo .x-ops-l{grid-template-columns:1fr 1fr}
.sa-j .x-ops.erro .opcao{border-color:var(--vinho-3)}
.sa-j .x-ops.sa-como .x-ops-l{grid-template-columns:repeat(4,minmax(0,1fr))}
.sa-corpo>.sa-hist:last-child{margin-bottom:-20px}
.sa-j .sa-dois{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
@media (max-width:760px){
  .sa-corpo{padding:0 16px 16px}
  .sa-dl{grid-template-columns:1fr;padding-left:0}
  .sa-acoes .btn{flex:1 1 100%}
  .sa-hist{margin:0 -16px;padding:0 16px}
  .sa-ev li{grid-template-columns:1fr;gap:2px}
  .sa-j .x-ops.sa-tipo .x-ops-l,.sa-j .x-ops-l{grid-template-columns:1fr}
  .sa-j .x-ops.sa-como .x-ops-l{grid-template-columns:1fr 1fr}
  .sa-corpo>.sa-hist:last-child{margin-bottom:-16px}
  .sa-j .sa-dois{grid-template-columns:1fr}
}
"""

ABRE = ico('baixo', 'ico ico-abre')


def hist(itens, aberto=False):
    li = ''.join(f'<li><time>{q}</time><div><b>{t}</b><small>{s}</small></div></li>' for q, t, s in itens)
    o = ' open' if aberto else ''
    return (f'<details class="sa-hist"{o}><summary>{ico("historico", "ico ico-s")}Histórico do pedido <span class="q">({len(itens)})</span>{ABRE}</summary>'
            f'<ol class="sa-ev">{li}</ol></details>')


AUTOS = 'Cobrança de parcela, lembrete de audiência, aviso de etapa e prestação de contas'


def folha_recebe(janela_id, extra_hist=None, desde=''):
    t = (f'Recebe os avisos automáticos desde {desde}, quando o pedido foi retirado.' if desde else 'Recebe os avisos automáticos.')
    h = hist(extra_hist, aberto=True) if extra_hist else ''
    return (f'<section class="folha" aria-labelledby="t-sa"><div class="folha-cab"><div><h2 id="t-sa">Avisos automáticos</h2>'
            f'<p class="sub">O que sai sozinho pelo WhatsApp do escritório.</p></div></div>'
            f'<div class="sa-corpo"><p class="sa-linha">{ico("sino")}<span><b>{t}</b> {AUTOS}, os que estiverem ligados. '
            f'Se o cliente ou um contato pedir para não receber, registre aqui.</span></p>'
            f'<div class="sa-acoes"><button class="btn btn-sec" type="button" data-janela="{janela_id}">{ico("sino-mudo")}Registrar pedido para não receber</button></div>'
            f'{h}</div></section>')


def folha_fora(tipo, desde, quem, quem_sub, como, reg, reg_sub, h_itens, retirar='janela-retirar', mudar='janela-mudar'):
    if tipo == 'COBRANCA':
        tit = f'Fora dos avisos de cobrança desde {desde}'
        sub = 'Não recebe aviso de parcela a vencer nem de parcela atrasada.'
        cont = (f'<p class="sa-continua">{ico("check")}<span><b>Continua recebendo:</b> lembrete de audiência, aviso de etapa do caso e prestação de contas. '
                f'Mensagens que a equipe escreve na conversa também continuam.</span></p>')
    else:
        tit = f'Fora de todos os avisos automáticos desde {desde}'
        sub = 'Nada sai sozinho para este cliente: nem cobrança, nem lembrete, nem aviso de etapa.'
        cont = (f'<p class="sa-continua">{ico("conversas")}<span><b>Continua:</b> as mensagens que a equipe escreve na conversa.</span></p>')
    return (f'<section class="folha" aria-labelledby="t-sa"><div class="folha-cab"><div><h2 id="t-sa">Avisos automáticos</h2>'
            f'<p class="sub">O que sai sozinho pelo WhatsApp do escritório.</p></div></div>'
            f'<div class="sa-corpo"><div class="sa-fora"><p class="sa-fora-tit">{ico("sino-mudo")}<span><strong>{tit}</strong><small>{sub}</small></span></p>'
            f'<dl class="sa-dl"><div><dt>Quem pediu</dt><dd>{quem}<small>{quem_sub}</small></dd></div>'
            f'<div><dt>Como pediu</dt><dd>{como}</dd></div>'
            f'<div><dt>Registrado por</dt><dd>{reg}<small>{reg_sub}</small></dd></div></dl></div>'
            f'{cont}'
            f'<div class="sa-acoes"><button class="btn btn-sec" type="button" data-janela="{mudar}">{ico("lapis")}Mudar o pedido</button>'
            f'<button class="btn btn-sec" type="button" data-janela="{retirar}">{ico("sino-volta")}Retirar o pedido</button></div>'
            f'{hist(h_itens)}</div></section>')


def selo_cab(texto):
    return f'<span class="selo sa-selo">{ico("sino-mudo")}{texto}</span>'


def com_selo(cab, texto):
    return cab.replace('<span>cliente desde', selo_cab(texto) + '<span>cliente desde', 1)


# ---------------------------------------------------------------- janelas
COMO = [('WHATSAPP', 'Pelo WhatsApp', 'Na conversa'), ('TELEFONE', 'Por telefone', ''), ('PRESENCIAL', 'Pessoalmente', ''), ('EMAIL', 'Por e-mail', '')]


def j_pedido(id_, cliente, curto, quem_ops, quem_sel, como_sel, tipo_sel='COBRANCA', erros=False, abrir=False, mudar=False, atual=''):
    resumo = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', f'O pedido ainda não foi registrado.') if erros else ''
    tipos = [('COBRANCA', 'Só os avisos de cobrança', 'Parcela a vencer e parcela atrasada. Lembretes de audiência e avisos de etapa continuam.'),
             ('TODOS', 'Todos os avisos automáticos', 'Cobrança, lembrete de audiência, aviso de etapa e prestação de contas. Nada sai sozinho.')]
    f_tipo = opcoes_radio(f'{id_}-tipo', 'O que não quer receber', tipos, tipo_sel, cls='sa-tipo')
    f_quem = opcoes_radio(f'{id_}-quem', 'Quem pediu', quem_ops, quem_sel)
    outra = ''
    if quem_sel == 'OUTRA':
        outra = campo(f'{id_}-outra', 'Nome de quem pediu e o que é do cliente', '', 'c6', foco=erros,
                      ajuda='' if erros else 'Ex.: Marta Corrêa, esposa.',
                      erro='Escreva o nome de quem pediu e o que a pessoa é do cliente.' if erros else '')
    f_como = opcoes_radio(f'{id_}-como', 'Como pediu', COMO, como_sel, cls='sa-como')
    f_data = campo(f'{id_}-data', 'Quando pediu', '20/11/2026' if erros else '18/11/2026', 'c3', im='numeric',
                   ajuda='' if erros else 'dd/mm/aaaa. Se o pedido chegou antes e só agora está sendo registrado, ponha o dia em que chegou.',
                   erro='A data não pode ser depois de hoje (18/11/2026).' if erros else '')
    nota = (f'<p class="pt-comuns">{ico("historico")}<span>Fica registrado com seu nome e a hora. Mensagens escritas pela equipe na conversa continuam saindo. '
            f'Para voltar a receber, use “Retirar o pedido” na ficha: nada é apagado.</span></p>')
    if mudar:
        nota = (f'<p class="pt-comuns">{ico("historico")}<span>O pedido atual ({atual}) fica no histórico, e o novo passa a valer agora. '
                f'Fica registrado com seu nome e a hora.</span></p>')
    corpo = resumo + f_tipo + f_quem + outra + f_como + f_data + nota
    titulo = 'Mudar o pedido de avisos' if mudar else 'Não receber avisos automáticos'
    desc = (f'Use quando {curto} ou um contato pedir outra coisa: por exemplo, parar também os lembretes.' if mudar
            else f'Registre o pedido feito {"pela" if curto.startswith("a ") else "pelo"} {curto[2:]} ou por um contato. Vale para todas as automações do escritório, a partir de agora.')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}{"Salvar o novo pedido" if mudar else "Registrar pedido"}</button>')
    j = janela(id_, cliente, titulo, desc, corpo, pe, abrir=abrir or erros)
    return j.replace('class="janela"', 'class="janela x-larga sa-j"', 1)


def j_retirar(abrir=False):
    quem = [('ANT', 'Antônia Ferreira Prado', 'A própria cliente'), ('JOANA', 'Joana Prado', 'Filha · contato principal'), ('OUTRA', 'Outra pessoa', 'Escreva o nome')]
    corpo = (opcoes_radio('rt-quem', 'Quem pediu para voltar a receber', quem, 'JOANA')
             + opcoes_radio('rt-como', 'Como pediu', COMO, 'TELEFONE', cls='sa-como')
             + f'<p class="pt-comuns">{ico("historico")}<span>O pedido de 03/11 continua no histórico da ficha, com quem pediu e quem registrou. '
               f'As automações de cobrança voltam a incluir Antônia na próxima vez que rodarem; nada é enviado agora.</span></p>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("sino-volta")}Voltar a receber</button>')
    j = janela('janela-retirar', 'Antônia Ferreira Prado', 'Antônia volta a receber os avisos de cobrança?',
               'Retire o pedido só quando a cliente ou um contato dela pedir. Fica registrado quem pediu e quem retirou.', corpo, pe, abrir=abrir)
    return j.replace('class="janela"', 'class="janela x-larga sa-j"', 1)


QUEM_ANT = [('ANT', 'Antônia Ferreira Prado', 'A própria cliente'), ('JOANA', 'Joana Prado', 'Filha · contato principal'), ('OUTRA', 'Outra pessoa', 'Escreva o nome')]
QUEM_CV = [('RICARDO', 'Ricardo Vale', 'Sócio-administrador · principal'), ('SONIA', 'Sônia Martins', 'Financeiro'), ('OUTRA', 'Outra pessoa', 'Escreva o nome')]


def j_mudar_ant(abrir=False):
    return j_pedido('janela-mudar', 'Antônia Ferreira Prado', 'a cliente', QUEM_ANT, 'JOANA', 'WHATSAPP', tipo_sel='TODOS', abrir=abrir, mudar=True,
                    atual='só cobrança, desde 03/11')


# ---------------------------------------------------------------- fichas
H_ANT = [('03/11/2026 · 14h22', 'Pediu para não receber avisos de cobrança',
          'Joana Prado (filha), pelo WhatsApp. Registrado por Diego Almeida, na conversa.')]


def folha_ant_fora():
    return folha_fora('COBRANCA', '03/11/2026', 'Joana Prado', 'Filha · contato principal', 'Pelo WhatsApp',
                      'Diego Almeida', 'Na conversa, 03/11 às 14h22', H_ANT)


def ficha_ant_sa(folha, selo=True, toast_='', janelas_=''):
    d = dir_prox('13/11', 'vencido há 5 dias', 'Ligar para Joana sobre a carta do INSS', 'Diego Almeida')
    cab = ficha_cab(dict(ANT, doc=''), d)
    if selo:
        cab = com_selo(cab, 'Sem avisos de cobrança')
    corpo = grade_ficha(dados_ant() + contatos_ant() + folha, proc_ant() + origem_ant() + RESERVA + situacao_folha())
    return f'<div class="cl">{cab}{abas("ficha", 3)}{corpo}</div>' + toast_ + janelas() + janelas_


def ficha_ant_sem_comercial(folha):
    base = ficha_sem_comercial()
    base = com_selo(base, 'Sem avisos de cobrança')
    return base.replace('</ul></section></div><aside class="cl-col"', '</ul></section>' + folha + '</div><aside class="cl-col"', 1)


def ficha_pj_sa(folha, selo='', toast_='', janelas_=''):
    base = ficha_pj()
    if selo:
        base = com_selo(base, selo)
    base = base.replace('</ul></section></div><aside class="cl-col"', '</ul></section>' + folha + '</div><aside class="cl-col"', 1)
    jan = (janelas().replace('id="janela-inativar"', 'id="janela-inativar-pj"').replace('janela-inativar-t', 'janela-inativar-pj-t')
           .replace('janela-inativar-d', 'janela-inativar-pj-d'))
    return base + toast_ + jan + janelas_


def j_cv(abrir=False, erros=False):
    return j_pedido('janela-pedido', 'Construtora Vale Alto Ltda.', 'o cliente', QUEM_CV, 'OUTRA' if erros else 'SONIA', 'TELEFONE',
                    erros=erros, abrir=abrir)


# ---------------------------------------------------------------- estados
F = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado', aba='ficha')
FP = dict(atual='clientes', trilha='Clientes|Construtora Vale Alto Ltda.', titulo='Construtora Vale Alto Ltda.', aba='ficha')

T = ''
T += tpl('ficha', ficha_ant_sa(folha_ant_fora(), janelas_=j_retirar() + j_mudar_ant()), **F)
T += tpl('mudar', ficha_ant_sa(folha_ant_fora(), janelas_=j_retirar() + j_mudar_ant(abrir=True)), **F)
T += tpl('retirar', ficha_ant_sa(folha_ant_fora(), janelas_=j_retirar(abrir=True) + j_mudar_ant()), **F)
H_RET = [('18/11/2026 · 10h12', 'Pedido retirado: voltou a receber os avisos de cobrança',
          'Joana Prado (filha), por telefone. Registrado por Marina Ribeiro.')] + H_ANT
T += tpl('retirado', ficha_ant_sa(folha_recebe('janela-pedido-ant', H_RET, desde='18/11/2026'), selo=False,
                                  toast_=toast('Pedido retirado.', 'Antônia volta a receber os avisos de cobrança. O pedido de 03/11 ficou no histórico.'),
                                  janelas_=j_pedido('janela-pedido-ant', 'Antônia Ferreira Prado', 'a cliente', QUEM_ANT, 'JOANA', 'WHATSAPP')), **F)
T += tpl('recebe', ficha_pj_sa(folha_recebe('janela-pedido'), janelas_=j_cv()), **FP)
T += tpl('marcar', ficha_pj_sa(folha_recebe('janela-pedido'), janelas_=j_cv(abrir=True)), **FP)
T += tpl('marcar-erros', ficha_pj_sa(folha_recebe('janela-pedido'), janelas_=j_cv(erros=True)), **FP)
H_CV = [('18/11/2026 · 10h12', 'Pediu para não receber avisos de cobrança',
         'Sônia Martins (Financeiro), por telefone. Registrado por Marina Ribeiro, na ficha.')]
T += tpl('marcado', ficha_pj_sa(folha_fora('COBRANCA', '18/11/2026', 'Sônia Martins', 'Financeiro', 'Por telefone', 'Marina Ribeiro (você)',
                                           'Na ficha, hoje às 10h12', H_CV, retirar='janela-retirar-cv', mudar='janela-mudar-cv'),
                                selo='Sem avisos de cobrança',
                                toast_=toast('Pedido registrado.', 'A Construtora Vale Alto não recebe mais avisos de cobrança. Lembretes e avisos de etapa continuam.')), **FP)
T += tpl('sem-comercial', ficha_ant_sem_comercial(folha_ant_fora()) + j_retirar() + j_mudar_ant(), quem='juridico', **F)

out = pagina('Clientes', 'Ficha do cliente no Portal: registrar e retirar o pedido de não receber avisos automáticos.',
             '{"estado":"ficha","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
out = finalizar_sas(out, CSS_SA)
open(f'{SAIDA}/sem-avisos.html', 'w', encoding='utf-8').write(out)
print('sem-avisos ok', T.count('<template data-est='), 'estados')
