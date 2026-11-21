# Portal · Relatórios do sócio: RPV e precatório a caminho na lista "à parte" do Falta receber (F3.72, IN-05).
# Importa o relatorios.py aprovado (copiado sem mudança), que monta a página com os 12 estados aprovados,
# e acrescenta a Visão geral com a lista à parte separada em "já entrou" e "a caminho". Uso: python3 relatorios_pend.py <pasta>
import sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import relatorios as RL
from comum import tpl, ico
from pend import injetar

R = RL.R
FIN = 'financeiro.html?estado='
JA = [('Benedito Souza Lima', 'RPV de 17/11 · honorários a transferir depois do repasse a ele', 6469.97)]
CAM = [('Eduardo Nascimento', 'RPV · estimada para janeiro de 2027', 4860, ''),
       ('Irene Castro', 'RPV complementar · era outubro de 2026', 1890, 'passou'),
       ('Hélio Batista Corrêa', 'Precatório · estimado até dezembro de 2027', 21300, '')]
TOT_JA = sum(x[2] for x in JA)
TOT_CAM = sum(x[2] for x in CAM)
TOT = round(TOT_JA + TOT_CAM, 2)


def folha_falta_pend():
    orig = RL.folha_falta()
    i = orig.index('<div class="re-aparte-f">')
    j = orig.index('</div>', orig.index('re-pe', i)) + 6
    ja = ''.join(f'<li><span><b>{n.split(" ")[0]} · já entrou</b><small>{d}</small></span><span class="fi-v num">{R(v)}</span></li>' for n, d, v in JA)
    cam = ''.join(f'<li{" class=re-passou" if s else ""}><span><b>{n.split(" ")[0]}</b><small>{d}</small>'
                  + (f'<span class="selo selo-urgente">{ico("alerta")}Passou da data estimada</span>' if s else '')
                  + f'</span><span class="fi-v num">{R(v)}</span></li>' for n, d, v, s in CAM)
    novo = (f'<div class="re-aparte-f"><p>{ico("balanca")}À parte · não soma acima</p>'
            f'<p class="re-grupo">Já entrou, falta transferir ao escritório</p><ul>{ja}</ul>'
            f'<p class="re-grupo">A caminho, com data estimada</p><ul>{cam}</ul>'
            f'<p class="re-pe"><span>Parte do escritório em RPV e precatório</span><b class="num">{R(TOT)}</b></p>'
            f'<p class="re-nota">{ico("agenda")}<span>O que passou da data estimada continua aqui, marcado, até alguém mudar a data ou registrar que entrou. <a href="{FIN}rv-caminho">Ver em Repasses</a></span></p></div>')
    return orig[:i] + novo + orig[j:]


def visao_pend():
    v = RL.visao()
    v = v.replace(RL.folha_falta(), folha_falta_pend(), 1)
    v = v.replace(f'Mais <b>{R(RL.RPV_TOTAL)}</b> de RPV e precatório, à parte: só a parte do escritório, com data estimada.',
                  f'Mais <b>{R(TOT)}</b> de RPV e precatório, à parte: {R(TOT_JA)} que já entrou e {R(TOT_CAM)} a caminho, só a parte do escritório.', 1)
    assert folha_falta_pend()[:40] in v
    return v


CSS = r"""
.re-aparte-f li .selo{display:inline-flex;margin-top:4px;height:22px;font-size:11px}
.re-aparte-f li.re-passou{box-shadow:inset 3px 0 0 var(--vinho-3);padding-left:8px}
.re-aparte-f>p.re-nota{text-transform:none;letter-spacing:0;font-weight:400;background:var(--papel);border-top:1px solid var(--divisor)}
.re-aparte-f>p.re-grupo{background:var(--papel);border-top:1px solid var(--divisor);padding:8px 14px 4px;margin:0!important}
.re-nota{display:flex;gap:8px;align-items:flex-start;font-size:12px!important;line-height:1.5;color:var(--texto-2)}
.re-nota .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.re-nota a{font-weight:500;display:inline-flex;align-items:center;min-height:24px}
"""

T = tpl('re-visao', visao_pend(), area='financeiro', secao='Relatórios', atual='financeiro', trilha='Financeiro|Relatórios', titulo='Relatórios')
out = injetar(RL.out, T, CSS, padrao='re-visao')
open(os.path.join(SAIDA, 'relatorios.html'), 'w', encoding='utf-8').write(out)
print('relatorios ok, à parte', R(TOT))
