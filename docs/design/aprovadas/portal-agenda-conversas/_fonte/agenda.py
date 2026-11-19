# Portal · Agenda (EX-06, EX-11, EX-13 [VAL], PD-04, PD-07; PT-03, PT-10, PT-25).
# Reusa a moldura, o CSS e as peças do Portal v1 aprovado (comum.py, sem mudança) e o desenho do Clientes aprovado.
# Peças novas com prefixo ag-. Uso: python3 agenda.py <pasta-saida>
import sys
from extra import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'agenda.html?estado='
FICHA = U + 'compromisso'

TIPOS = {'aud': ('Audiência', 'var(--vinho)'), 'cli': ('Cliente', 'var(--ambar)'),
         'ass': ('Assinatura', 'var(--vinho-2)'), 'int': ('Interno', 'var(--vinho-4)'),
         # Tipo escrito pela equipe (opção "Outro"): todos com a mesma cor; o nome é o que foi escrito
         'per': ('Perícia', 'var(--vinho-3)')}
FIXOS = ['aud', 'cli', 'ass', 'int']
ESCRITOS = []  # tipos escritos em uso no período mostrado (o servidor manda junto)
DIAS = [(16, 'Seg', 'segunda'), (17, 'Ter', 'terça'), (18, 'Qua', 'quarta'), (19, 'Qui', 'quinta'),
        (20, 'Sex', 'sexta'), (21, 'Sáb', 'sábado'), (22, 'Dom', 'domingo')]
HOJE = 18
AGORA = (10, 12)
FERIADOS = {20: 'Consciência Negra', 2: 'Finados'}
NOMES = {'Marina': 'Marina', 'Felipe': 'Felipe', 'Larissa': 'Larissa', 'Gustavo': 'Gustavo', 'Diego': 'Diego', 'Paula': 'Paula'}


def E(d, ini, fim, tipo, tit, mod, onde, quem, lemb='', href=FICHA):
    return dict(d=d, ini=ini, fim=fim, tipo=tipo, tit=tit, mod=mod, onde=onde, quem=quem, lemb=lemb, href=href)


EVS = [
    E(16, '09:00', '10:00', 'int', 'Reunião de sócios', 'presencial', 'Sala de reunião', ['Marina', 'Felipe']),
    E(16, '14:00', '15:00', 'cli', 'Reunião · Benedito Souza Lima', 'presencial', 'Escritório', ['Diego']),
    E(17, '10:00', '10:45', 'cli', 'Retorno · Daniela Rocha Mendes', 'virtual', 'Vídeo', ['Diego']),
    E(17, '15:00', '16:00', 'aud', 'Una · Lima x Padaria Estrela', 'virtual', 'TRT-2', ['Gustavo'], 'feito'),
    E(18, '09:00', '09:45', 'int', 'Revisão semanal de prazos', 'presencial', 'Sala de reunião', ['Equipe toda']),
    E(18, '11:00', '12:00', 'aud', 'Conciliação · Teixeira x Banco Horizonte', 'virtual', 'CEJUSC Pinheiros', ['Marina', 'Larissa'], 'confirmou'),
    E(18, '14:30', '15:30', 'cli', 'Primeira reunião · Irene Castro', 'presencial', 'Escritório', ['Larissa']),
    E(18, '17:00', '17:45', 'ass', 'Contrato · Construtora Vale Alto', 'presencial', 'Escritório', ['Felipe']),
    E(19, '09:30', '10:30', 'cli', 'Retorno · Farmácia Bom Jesus', 'virtual', 'Vídeo', ['Felipe']),
    E(19, '13:30', '15:30', 'aud', 'Instrução · Corrêa x Rota Sul', 'presencial', 'TRT-2, Barra Funda', ['Marina', 'Gustavo'], 'agendado'),
]
NOVO = E(19, '16:00', '17:00', 'aud', 'Conciliação · Mendes x Loja Bela Casa', 'virtual', 'CEJUSC Pinheiros', ['Larissa'], 'agendado')
# Prazos do Jurídico (só para quem tem a área): (título, processo, responsável, quando)
PRAZOS = {18: [('Contestação · Souza x Construtora Atlas', '0812345-67.2026.8.26.0100', 'Felipe Matos', 'Vence hoje'),
               ('Manifestação sobre laudo · Andrade x Unimed', '1004871-20.2025.8.26.0011', 'Larissa Costa', 'Vence hoje')],
          19: [('Recurso ordinário · Pereira x Mercado Bom Preço', '1001022-33.2026.5.02.0045', 'Marina Ribeiro', 'Amanhã')]}

PZ = [PRAZOS]  # prazos que a tela mostra (muda no filtro por pessoa)


def mins(h):
    a, b = h.split(':')
    return int(a) * 60 + int(b)


def passou(e):
    return e['d'] < HOJE or (e['d'] == HOJE and mins(e['fim']) <= AGORA[0] * 60 + AGORA[1])


def quem_txt(q):
    return ', '.join(q)


def mod_html(e, curto=False):
    i = 'video' if e['mod'] == 'virtual' else 'local'
    m = 'Virtual' if e['mod'] == 'virtual' else 'Presencial'
    return f'{ico(i, "ico ico-s")}<span>{m} · {H(e["onde"])}{"" if curto else " · " + quem_txt(e["quem"])}</span>'


def selo_lemb(e):
    l = e['lemb']
    if l == 'confirmou':
        return f'<span class="selo selo-ok">{ico("check")}Cliente confirmou</span>'
    if l == 'feito':
        return f'<span class="selo selo-neutro">{ico("whats")}Lembrete enviado</span>'
    if l == 'agendado':
        return f'<span class="selo selo-implant">{ico("whats")}Lembrete marcado</span>'
    return ''


# ---------------------------------------------------------------- CSS (prefixo ag-)
CSS_AG = r"""
/* Tipo "Outro": campo do tipo escrito, logo abaixo das opções */
.ag-tipos .x-ops-l{grid-template-columns:repeat(3,1fr)}
.ag-outro[hidden]{display:none}
.ag-outro{max-width:320px;margin-top:-6px}
@media (max-width:760px){.ag-tipos .x-ops-l{grid-template-columns:1fr 1fr}.ag-outro{max-width:none}}

/* ===== Cabeçalho da ficha: o da ficha aprovada do Console v1, sem mudança ===== */
""" + CSS_FICHA_CAB + r"""
.ficha-cab .esq .meta .selo-ativo{background:var(--ambar-3);color:var(--vinho)}

/* ==========================================================================
   Portal · Agenda (EX-06, EX-11, EX-13). Prefixo ag- nas peças novas.
   ========================================================================== */
.ag{display:flex;flex-direction:column;gap:24px;min-width:0}
.ag-cab{align-items:flex-end}
.ag-folha{overflow:hidden}
.ag-ferr{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 24px}
.ag-nav{display:flex;align-items:center;gap:6px}
.ag-nav .btn{padding:0 14px}
.ag-nav .ag-q{padding:0;width:44px}
.ag-periodo{font-size:22px;line-height:1.2;margin-left:10px;white-space:nowrap}
.ag-vis{display:flex;padding:3px;border-radius:12px;background:var(--sal-2);margin-left:auto}
.ag-vis a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:9px;color:var(--texto-2);text-decoration:none;font-weight:500}
.ag-vis a:hover{color:var(--vinho)}
.ag-vis a[aria-current]{background:var(--papel);color:var(--vinho);box-shadow:0 1px 3px rgba(42,26,34,.18)}
.ag-pessoa{display:flex;align-items:center;gap:10px}
.ag-pessoa label{font-size:13px;color:var(--texto-2);white-space:nowrap}
.ag-pessoa .entrada{width:auto;min-width:200px}
.ag-leg{padding:0 24px 14px;align-items:center}
.ag-leg i.pz{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.ag-leg i.fer{background:repeating-linear-gradient(135deg,var(--sal) 0 3px,var(--papel) 3px 6px);box-shadow:inset 0 0 0 1px var(--borda-folha)}
.ag-dica{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--texto-2)}
.ag-dica .ico{width:16px;height:16px;color:var(--vinho-4)}
.ag-filtro{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 24px 14px;font-size:13px}
.ag-filtro .selo{height:28px}

/* Semana */
.ag-sem{--hora:60px;--pz:0px;display:grid;grid-template-columns:56px repeat(5,minmax(0,1fr)) repeat(2,minmax(0,.55fr));border-top:1px solid var(--divisor)}
.ag-sem.com-pz{--pz:84px}
.ag-eixo{position:relative;padding-top:calc(64px + var(--pz))}
.ag-eixo ol{list-style:none;margin:0;padding:0;position:relative;height:calc(var(--hora)*11)}
.ag-eixo li{position:absolute;right:8px;transform:translateY(-8px);font-size:11px;color:var(--texto-2);font-variant-numeric:tabular-nums}
.ag-col{border-left:1px solid var(--divisor);min-width:0;display:flex;flex-direction:column}
.ag-col.hoje{background:#FCF8F5}
.ag-dcab{height:64px;display:flex;align-items:center;justify-content:space-between;gap:2px;padding:0 4px 0 8px;border-bottom:1px solid var(--divisor)}
.ag-dlink{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 4px;border-radius:var(--raio);color:var(--texto);text-decoration:none;font-weight:500;font-size:13px;min-width:0}
.ag-dlink:hover{background:var(--sal-2)}
.ag-dlink .disco{--d:34px;--f:18px;--c:transparent}
.hoje .ag-dlink .disco{--c:var(--ambar);color:var(--vinho-escuro)}
.hoje .ag-dlink{color:var(--vinho);font-weight:600}
.ag-criar{width:44px;height:44px;flex:none;display:grid;place-items:center;border:0;border-radius:var(--raio);background:transparent;color:var(--vinho-4);cursor:pointer}
.ag-criar:hover{background:var(--ambar-3);color:var(--vinho)}
.ag-pzs{list-style:none;margin:0;padding:6px;height:var(--pz);display:grid;align-content:start;gap:4px;border-bottom:1px solid var(--divisor);overflow:hidden}
.ag-sem:not(.com-pz) .ag-pzs{display:none}
.ag-pz{display:flex;align-items:center;gap:5px;min-height:34px;padding:0 6px;border-radius:6px;background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3);font-size:11.5px;line-height:1.25;color:var(--tinta);min-width:0}
.ag-pz .ico{width:14px;height:14px;color:var(--vinho-3)}
.ag-pz span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ag-pz b{font-weight:600;color:var(--vinho-3)}
.ag-corpo{position:relative;height:calc(var(--hora)*11);background:repeating-linear-gradient(180deg,var(--divisor) 0 1px,transparent 1px var(--hora))}
.ag-corpo>ol{list-style:none;margin:0;padding:0}
.ag-ev{position:absolute;left:4px;right:4px;min-height:44px}
.ag-ev a{display:flex;flex-direction:column;gap:1px;height:100%;padding:5px 8px 5px 9px;border-left:4px solid var(--t);border-radius:0 8px 8px 0;background:var(--sal-2);color:var(--texto);text-decoration:none;overflow:hidden;font-size:12px;line-height:1.3}
.ag-ev a:hover{background:var(--ambar-3)}
.ag-ev .l1{font-size:11px;font-weight:600;color:var(--vinho-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-ev strong{font-weight:500;font-size:12.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ag-ev small{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--texto-2);white-space:nowrap;overflow:hidden}
.ag-ev small span{overflow:hidden;text-overflow:ellipsis}
.ag-ev small .ico{width:13px;height:13px;color:var(--vinho-4)}
.ag-ev.curto strong{-webkit-line-clamp:1}
.ag-ev small{display:none}
.ag-ev.longo small{display:flex}
.ag-ev.passou a{background:var(--papel);box-shadow:inset 0 0 0 1px var(--divisor)}
.ag-ev.passou .l1,.ag-ev.passou strong{color:var(--texto-2)}
.ag-ev.novo a{background:var(--ambar-3);box-shadow:inset 0 0 0 2px var(--vinho);border-left-color:var(--vinho)}
.ag-ev.fantasma a{background:transparent;border:2px dashed var(--vinho);border-left:4px solid var(--vinho);color:var(--vinho)}
.ag-agora{position:absolute;left:-1px;right:0;height:2px;background:var(--ambar);z-index:2;pointer-events:none}
.ag-agora::before{content:"";position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:var(--ambar)}
.ag-agora span{position:absolute;right:4px;top:-20px;font-size:11px;font-weight:600;color:var(--vinho-3);background:#FCF8F5;padding:0 4px;border-radius:4px}
.ag-feriado{position:absolute;inset:0;background:repeating-linear-gradient(135deg,var(--sal-2) 0 8px,var(--papel) 8px 16px);display:grid;place-items:start center;padding-top:90px}
.ag-feriado p{margin:0 8px;padding:10px 12px;border-radius:var(--raio);background:var(--papel);box-shadow:0 0 0 1px var(--borda-folha);font-size:12px;line-height:1.45;text-align:center;color:var(--texto-2)}
.ag-feriado b{display:block;font-family:var(--serifa);font-size:16px;font-weight:600;color:var(--vinho)}
.ag-pe{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.ag-pe .ico{color:var(--vinho-4);margin-top:1px}

/* Mês */
.ag-mes{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--divisor)}
.ag-mes>.ag-msem{padding:10px 12px;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2);background:var(--sal-2);border-bottom:1px solid var(--divisor)}
.ag-cel{min-height:138px;border-right:1px solid var(--divisor);border-bottom:1px solid var(--divisor);padding:4px 6px 8px;display:flex;flex-direction:column;gap:3px;min-width:0}
.ag-cel:nth-child(7n+7){border-right:0}
.ag-cel.fora{background:var(--sal-2)}
.ag-cel.fora .ag-dlink{color:var(--texto-2);font-weight:400}
.ag-cel.hoje{background:#FCF8F5;box-shadow:inset 0 3px 0 var(--ambar)}
.ag-cel.fer{background:repeating-linear-gradient(135deg,var(--sal-2) 0 8px,var(--papel) 8px 16px)}
.ag-cel .ag-dcab{height:auto;border:0;padding:0}
.ag-cel .ag-dlink .disco{--d:30px;--f:17px}
.ag-cel ul{list-style:none;margin:0;padding:0;display:grid;gap:3px}
.ag-cel li{display:flex;align-items:center;gap:5px;font-size:11.5px;line-height:1.3;min-width:0;padding:2px 4px;border-radius:5px;background:var(--sal-2)}
.ag-cel li i{width:8px;height:8px;border-radius:50%;flex:none;background:var(--t)}
.ag-cel li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ag-cel li b{font-weight:600;font-variant-numeric:tabular-nums}
.ag-cel li.pz{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.ag-cel li.pz .ico{width:13px;height:13px;color:var(--vinho-3)}
.ag-cel li.passou{background:transparent;color:var(--texto-2)}
.ag-cel .mais-n{font-size:11.5px;font-weight:500;color:var(--vinho);padding:0 4px}
.ag-cel .fer-n{font-size:11.5px;font-weight:500;color:var(--texto-2);padding:2px 4px;background:var(--papel);border-radius:5px;align-self:flex-start}

/* Lista (dia e celular) */
.ag-dia{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.ag-col2{display:flex;flex-direction:column;gap:24px;min-width:0}
.ag-ldia{padding:6px 24px 16px;border-top:1px solid var(--divisor)}
.ag-ldia:first-child{border-top:0}
.ag-ldia-t{display:flex;align-items:center;gap:12px;font-size:20px;padding:10px 0 6px}
.ag-ldia-t .disco{--d:40px;--f:20px;--c:var(--sal-2)}
.ag-ldia.hoje .ag-ldia-t .disco{--c:var(--ambar);color:var(--vinho-escuro)}
.ag-ldia-t small{display:block;font-family:var(--sans);font-size:12px;color:var(--texto-2);font-weight:400}
.ag-ldia-t .ag-criar{margin-left:auto}
.ag-pzl{list-style:none;margin:4px 0 8px;padding:0;display:grid;gap:8px}
.ag-pzl li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:10px 12px;border-radius:var(--raio);background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.ag-pzl li>.ico{color:var(--vinho-3)}
.ag-pzl strong{display:block;font-weight:500;font-size:13.5px;line-height:1.35}
.ag-pzl small{display:block;font-size:12px;color:var(--texto-2)}
.ag-pzl .selo{justify-self:end}
.ag-pzl .ver{grid-column:2/-1;justify-self:start;margin:-6px 0 -10px -6px}
.ag-its{list-style:none;margin:0;padding:0}
.ag-it{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;padding:6px 0}
.ag-it time{font-family:var(--serifa);font-size:18px;font-weight:600;color:var(--vinho);font-variant-numeric:lining-nums;padding-top:8px;line-height:1.1}
.ag-it time small{display:block;font-family:var(--sans);font-size:11px;font-weight:400;color:var(--texto-2);margin-top:3px}
.ag-it .cx{position:relative;border-left:4px solid var(--t);background:var(--sal-2);border-radius:0 10px 10px 0;padding:9px 14px;display:grid;gap:3px}
.ag-it .cx:hover{background:var(--ambar-3)}
.ag-it .tipo{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--vinho-2)}
.ag-it .tipo::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--t)}
.ag-it a.t{font-weight:500;color:var(--texto);text-decoration:none;line-height:1.35}
.ag-it a.t::after{content:"";position:absolute;inset:0}
.ag-it a.t:focus-visible{outline:none}
.ag-it .cx:has(a.t:focus-visible){outline:3px solid var(--foco);outline-offset:2px}
.ag-it .cx small{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--texto-2)}
.ag-it .cx small .ico{color:var(--vinho-4)}
.ag-it .cx .selo{justify-self:start;height:24px;font-size:11.5px;margin-top:2px}
.ag-it.passou .cx{background:transparent;box-shadow:inset 0 0 0 1px var(--divisor)}
.ag-it.passou time,.ag-it.passou a.t{color:var(--texto-2)}
.ag-agora-l{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px;font-weight:600;color:var(--vinho-3)}
.ag-agora-l::after{content:"";flex:1;height:2px;background:var(--ambar)}
.ag-agora-l b{width:10px;height:10px;border-radius:50%;background:var(--ambar)}
.ag-livre{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;padding:4px 0}
.ag-livre button{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1.5px dashed var(--vinho-4);border-radius:10px;background:transparent;color:var(--vinho);font:inherit;font-size:13px;font-weight:500;cursor:pointer;text-align:left}
.ag-livre button:hover{background:var(--ambar-3);border-color:var(--vinho-2)}
.ag-livre button span{font-weight:400;color:var(--texto-2)}
.ag-fds{display:flex;align-items:center;gap:10px;padding:10px 24px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.ag-fds .ag-criar{margin-left:auto}
.ag-fer-l{margin:4px 0 10px;padding:12px 14px;border-radius:var(--raio);background:repeating-linear-gradient(135deg,var(--sal-2) 0 8px,var(--papel) 8px 16px);font-size:13px}
.ag-fer-l span{background:var(--papel);padding:2px 6px;border-radius:5px}
.ag-passados>summary{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 24px;cursor:pointer;font-size:13px;font-weight:500;color:var(--vinho);list-style:none;border-bottom:1px solid var(--divisor)}
.ag-passados>summary::-webkit-details-marker{display:none}
.ag-passados>summary .ico{color:var(--vinho-4)}
.ag-passados>summary small{font-weight:400;color:var(--texto-2)}
.ag-passados>summary .ico:last-child{margin-left:auto}

/* Mês no celular */
.ag-mini{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;padding:4px 12px 12px}
.ag-mini .s{font-size:11px;font-weight:500;text-align:center;color:var(--texto-2);padding:6px 0}
.ag-mini a{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;min-height:48px;padding-top:6px;border-radius:10px;color:var(--texto);text-decoration:none;font-weight:500;font-variant-numeric:tabular-nums;font-size:14px}
.ag-mini a.fora{color:var(--texto-2);font-weight:400}
.ag-mini a.fer{background:repeating-linear-gradient(135deg,var(--sal-2) 0 5px,var(--papel) 5px 10px)}
.ag-mini a[aria-current]{background:var(--ambar);color:var(--vinho-escuro);font-weight:600}
.ag-mini a .pts{display:flex;gap:3px;height:6px}
.ag-mini a .pts i{width:6px;height:6px;border-radius:50%;background:var(--t)}
.ag-mini a .pts i.pz{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.ag-mini a[aria-current] .pts i{box-shadow:0 0 0 1px var(--papel)}

/* Lateral */
.ag-lembs{list-style:none;margin:0;padding:0 24px 8px}
.ag-lembs li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;padding:12px 0;border-top:1px solid var(--divisor)}
.ag-lembs li:first-child{border-top:0}
.ag-lembs li>.ico{color:var(--vinho);margin-top:2px}
.ag-lembs strong{display:block;font-weight:500;line-height:1.35}
.ag-lembs small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.ag-lembs .selo{margin-top:6px;height:24px;font-size:11.5px}
.ag-reserva{margin:0 24px 20px;padding:16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:grid;gap:10px;font-size:13px;color:var(--texto-2);line-height:1.5}
.ag-reserva b{color:var(--texto);font-weight:500}
.ag-reserva .selo{justify-self:start}
.ag-reserva .btn{justify-self:start}

/* Ficha do compromisso */
.ag-grade{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.dir .ag-quando{font-size:13px;color:var(--tinta);line-height:1.45}
.dir .ag-quando b{font-weight:600}
.dir .ag-btns{display:flex;gap:10px;flex-wrap:wrap}
.ag-link-sala{display:flex;align-items:center;gap:8px;min-width:0}
.ag-link-sala code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;font-weight:400;color:var(--texto);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ag-por{margin:0 24px 14px;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5;color:var(--tinta)}
.ag-por .ico{color:var(--vinho);margin-top:1px}
.ag-msg{margin:4px 24px 18px;display:grid;gap:6px}
.ag-msg>small{font-size:12px;color:var(--texto-2)}
.ag-balao{background:var(--sal-2);border-radius:14px 4px 14px 14px;padding:12px 14px;font-size:13.5px;line-height:1.5;justify-self:end;max-width:92%}
.ag-balao .de{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:4px}
.ag-balao .de .ico{width:14px;height:14px}
.ag-hist{padding:0 24px 8px}
.ag-pessoas{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px}
.ag-pessoas li{display:flex;align-items:center;gap:12px}
.ag-pessoas strong{display:block;font-weight:500}
.ag-pessoas small{display:block;font-size:12px;color:var(--texto-2)}
.ag-acoes{padding:0 24px 20px;display:grid;gap:10px}
.ag-acoes p{font-size:13px;color:var(--texto-2);line-height:1.5}
.ag-hist-nota{font-size:12px;color:var(--texto-2);padding:0 24px 18px}
.ag-dados .inteira dd{font-weight:400}
.ag-dados dd>a:not(.ver){display:inline-flex;align-items:center;min-height:44px;margin:-10px 0}
.ag-link-sala{flex-wrap:nowrap!important;overflow:hidden}
.ag-dados dd{min-width:0;overflow-wrap:anywhere}
.ag-dados>div{min-width:0}
.ag-dados{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}

/* Vazio */
.ag-vazio{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.ag-passos{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:12px;text-align:left;max-width:52ch}
.ag-passos li{display:flex;gap:12px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--texto)}
.ag-passos .disco{--d:30px;--f:16px}

@media (max-width:760px){
  .ag{gap:16px}
  .ag-cab .btn{width:100%}
  .ag-cab .lede,.ag-cab .sobretitulo{display:none}
  .ag-cab .pt-cab h1,.ag-cab h1{margin-top:0}
  .ag-ferr{padding:14px 16px;gap:10px}
  .ag-nav{width:100%;flex-wrap:wrap}
  .ag-periodo{order:-1;width:100%;margin:0 0 4px;font-size:20px;white-space:normal}
  .ag-nav .btn:not(.ag-q){flex:1}
  .ag-vis{margin-left:0;width:100%}
  .ag-vis a{flex:1;justify-content:center;padding:0 8px}
  .ag-pessoa{width:100%;flex-direction:column;align-items:stretch;gap:6px}
  .ag-pessoa .entrada{width:100%}
  .ag-leg{padding:0 16px 12px}
  .ag-dica{display:none}
  .ag-filtro{padding:0 16px 12px}
  .ag-ldia{padding:6px 16px 14px}
  .ag-pzl li{grid-template-columns:auto minmax(0,1fr)}
  .ag-pzl .selo{grid-column:2;justify-self:start}
  .ag-it{grid-template-columns:48px minmax(0,1fr);gap:10px}
  .ag-livre{grid-template-columns:48px minmax(0,1fr);gap:10px}
  .ag-fds{padding:10px 16px}
  .ag-passados>summary{padding:0 16px}
  .ag-dia,.ag-grade,.ag-vazio{grid-template-columns:minmax(0,1fr);gap:16px}
  .ag-col2{gap:16px}
  .ag-lembs{padding:0 16px 6px}
  .ag-reserva{margin:0 16px 16px}
  .ag-por{margin:0 16px 12px}
  .ag-msg{margin:4px 16px 16px}
  .ag-hist,.ag-hist-nota{padding-left:16px;padding-right:16px}
  .ag-pessoas,.ag-acoes{padding-left:16px;padding-right:16px}
  .ag-acoes .btn{width:100%}
  .dir .ag-btns .btn{flex:1 1 auto}
  .ficha-cab .esq .ident h1{font-size:30px!important}
  .ag-pe{padding:12px 16px 16px}
  .ag-dados{grid-template-columns:minmax(0,1fr)}
}
"""


# ---------------------------------------------------------------- peças
def cab(lede, quem_prazos=True):
    return (f'<div class="pt-cab ag-cab"><div><p class="sobretitulo">Da equipe toda</p><h1>Agenda</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">{lede}</p></div>'
            f'<button class="btn btn-pri" type="button" data-janela="janela-novo">{ico("mais")}Novo compromisso</button></div>')


LEDE = 'Audiências, reuniões com clientes, assinaturas e compromissos internos. Clique num dia para marcar. Os prazos do Jurídico aparecem aqui sozinhos.'
LEDE_SEM = 'Audiências, reuniões com clientes, assinaturas e compromissos internos. Clique num dia para marcar.'


def ferramentas(vis='semana', periodo='16 a 22 de novembro de 2026', pessoa='Toda a equipe', ant='Semana anterior', prox='Próxima semana', voce='Marina Ribeiro (você)'):
    def v(k, rot):
        c = ' aria-current="page"' if k == vis else ''
        return f'<a href="{U}{k}"{c}>{rot}</a>'
    eu = voce.replace(' (você)', '')
    nomes = [eu] + [n for n in ['Marina Ribeiro', 'Bianca Torres', 'Diego Almeida', 'Felipe Matos', 'Gustavo Lima', 'Larissa Costa', 'Paula Nunes'] if n != eu]
    ops = ['Toda a equipe'] + [n + (' (você)' if n == eu else '') for n in nomes]
    sel = ''.join(f'<option{" selected" if o == pessoa else ""}>{H(o)}</option>' for o in ops)
    return (f'<div class="ag-ferr"><div class="ag-nav"><h2 class="ag-periodo">{periodo}</h2>'
            f'<a class="btn btn-sec ag-q" href="#" aria-label="{ant}">{ico("esq")}</a><a class="btn btn-sec" href="{U}{vis}">Hoje</a>'
            f'<a class="btn btn-sec ag-q" href="#" aria-label="{prox}">{ico("dir")}</a></div>'
            f'<nav class="ag-vis" aria-label="Ver por">{v("mes", "Mês")}{v("semana", "Semana")}{v("dia", "Dia")}</nav>'
            f'<div class="ag-pessoa"><label for="ag-pessoa">Mostrar a agenda de</label>'
            f'<select class="entrada" id="ag-pessoa">{sel}</select></div></div>')


def legenda(prazos=True, dica=True):
    t = ''.join(f'<span><i style="background:{TIPOS[k][1]}"></i>{TIPOS[k][0]}</span>' for k in FIXOS + ESCRITOS)
    if prazos:
        t += '<span><i class="pz"></i>Prazo do Jurídico</span>'
    t += '<span><i class="fer"></i>Feriado</span>'
    d = f'<span class="ag-dica">{ico("mais")}Use o + do dia para marcar um compromisso</span>' if dica else ''
    return f'<p class="legenda ag-leg">{t}{d}</p>'


def ev_semana(e, cls=''):
    top = (mins(e['ini']) - 8 * 60) * 1  # 60 px por hora = 1 px por minuto
    alt = max(44, mins(e['fim']) - mins(e['ini']) - 2)
    c = 'ag-ev' + (' passou' if passou(e) and not cls else '') + (' curto' if alt < 50 else '') + (' longo' if alt >= 90 else '') + (' ' + cls if cls else '')
    tipo = TIPOS[e['tipo']][0]
    return (f'<li class="{c}" style="--t:{TIPOS[e["tipo"]][1]};top:{top}px;height:{alt}px"><a href="{e["href"]}">'
            f'<span class="l1">{e["ini"]} · {tipo}</span><strong>{H(e["tit"])}</strong><small>{mod_html(e)}</small></a></li>')


def semana_pc(evs, prazos=True, extra=None, extra_cls='novo'):
    eixo = '<div class="ag-eixo" aria-hidden="true"><ol>' + ''.join(f'<li style="top:{(h - 8) * 60}px">{h:02d}:00</li>' for h in range(9, 19)) + '</ol></div>'
    cols = ''
    for d, s, nome in DIAS:
        hoje = d == HOJE
        sr = f'<span class="sr"> de novembro{", hoje" if hoje else ""}</span>'
        dcab = (f'<div class="ag-dcab"><a class="ag-dlink" href="{U}dia">{s}<span class="disco"><span>{d}</span></span>{sr}</a>'
                f'<button class="ag-criar" type="button" data-janela="janela-novo" aria-label="Novo compromisso na {nome}, {d}">{ico("mais")}</button></div>')
        pz = ''
        for t, proc, resp, q in (PZ[0].get(d, []) if prazos else []):
            pz += f'<li class="ag-pz">{ico("balanca")}<span><b>{q}</b> · {H(t)} · {resp.split()[0]}</span></li>'
        pz = f'<ul class="ag-pzs" aria-label="Prazos do dia {d}">{pz}</ul>' if prazos else ''
        lis = ''.join(ev_semana(e) for e in evs if e['d'] == d)
        if extra and extra['d'] == d:
            lis += ev_semana(extra, extra_cls)
        corpo = f'<ol aria-label="Compromissos do dia {d}">{lis}</ol>' if lis else ''
        if d in FERIADOS:
            corpo = f'<div class="ag-feriado"><p><b>Feriado</b>{FERIADOS[d]}. Fórum fechado; prazos não correm.</p></div>'
        agora = f'<div class="ag-agora" style="top:{(AGORA[0] - 8) * 60 + AGORA[1]}px"><span>agora, {AGORA[0]}h{AGORA[1]:02d}</span></div>' if hoje else ''

        if d >= 21:
            dcab = f'<div class="ag-dcab"><a class="ag-dlink" href="{U}dia">{s}<span class="disco"><span>{d}</span></span>{sr}</a></div>'
        cols += (f'<section class="ag-col{" hoje" if hoje else ""}" aria-label="{nome.capitalize()}, {d} de novembro">{dcab}{pz}'
                 f'<div class="ag-corpo">{corpo}{agora}</div></section>')
    return f'<div class="ag-sem so-pc{" com-pz" if prazos else ""}">{eixo}{cols}</div>'


def it(e, cls='', selo=True):
    p = ' passou' if passou(e) and not cls else ''
    s = selo_lemb(e) if selo else ''
    return (f'<li class="ag-it{p}{" " + cls if cls else ""}" style="--t:{TIPOS[e["tipo"]][1]}"><time>{e["ini"]}<small>até {e["fim"]}</small></time>'
            f'<div class="cx"><span class="tipo">{TIPOS[e["tipo"]][0]}</span><a class="t" href="{e["href"]}">{H(e["tit"])}</a>'
            f'<small>{mod_html(e)}</small>{s}</div></li>')


def prazos_lista(d, ver=True):
    r = ''
    for t, proc, resp, q in PZ[0].get(d, []):
        selo = f'<span class="selo selo-urgente">{ico("alerta")}{q}</span>' if q == 'Vence hoje' else f'<span class="selo selo-atencao">{ico("relogio")}{q}</span>'
        v = f'<a class="ver" href="#">Abrir no Jurídico{ico("dir", "ico ico-s")}</a>' if ver else ''
        r += f'<li>{ico("balanca")}<div><strong>{H(t)}</strong><small><span class="num">{proc}</span> · {resp}</small></div>{selo}{v}</li>'
    return f'<ul class="ag-pzl" aria-label="Prazos do Jurídico">{r}</ul>' if r else ''


def dia_lista(d, evs, prazos=True, livres=False, agora=True, extra=None):
    """Lista do dia: prazos, compromissos, linha de agora e (opcional) horários livres."""
    es = sorted([e for e in evs if e['d'] == d] + ([extra] if extra and extra['d'] == d else []), key=lambda e: mins(e['ini']))
    r = ''
    ag_feito = False
    fim_ant = 8 * 60
    for e in es:
        if agora and d == HOJE and not ag_feito and mins(e['ini']) > AGORA[0] * 60 + AGORA[1]:
            r += f'<li class="ag-agora-l"><b aria-hidden="true"></b>agora, {AGORA[0]}h{AGORA[1]:02d}</li>'
            ag_feito = True
        if livres and mins(e['ini']) - fim_ant >= 90 and mins(e['ini']) > AGORA[0] * 60 + AGORA[1]:
            a, b = fim_ant, mins(e['ini'])
            r += (f'<li class="ag-livre"><span></span><button type="button" data-janela="janela-novo">{ico("mais")}Marcar compromisso '
                  f'<span>livre das {a // 60:02d}:{a % 60:02d} às {b // 60:02d}:{b % 60:02d}</span></button></li>')
        r += it(e, 'novo' if extra is e else '')
        fim_ant = max(fim_ant, mins(e['fim']))
    if livres:
        r += (f'<li class="ag-livre"><span></span><button type="button" data-janela="janela-novo">{ico("mais")}Marcar compromisso '
              f'<span>livre depois das {fim_ant // 60:02d}:{fim_ant % 60:02d}</span></button></li>')
    return (prazos_lista(d) if prazos else '') + f'<ol class="ag-its" aria-label="Compromissos">{r}</ol>'


def dia_secao(d, s, nome, evs, prazos=True, extra=None):
    hoje = d == HOJE
    n_ev = len([e for e in evs if e['d'] == d]) + (1 if extra and extra['d'] == d else 0)
    n_pz = len(PZ[0].get(d, [])) if prazos else 0
    resumo = []
    if hoje:
        resumo.append('hoje')
    if n_pz:
        resumo.append(f'{n_pz} prazo{"s" if n_pz > 1 else ""}')
    resumo.append(f'{n_ev} compromisso{"s" if n_ev != 1 else ""}' if n_ev else 'nada marcado')
    t = (f'<h3 class="ag-ldia-t"><span class="disco"><span>{d}</span></span><span>{nome.capitalize()}<small>{" · ".join(resumo)}</small></span>'
         f'<button class="ag-criar" type="button" data-janela="janela-novo" aria-label="Novo compromisso na {nome}, {d}">{ico("mais")}</button></h3>')
    if d in FERIADOS:
        return (f'<section class="ag-ldia" aria-label="{nome.capitalize()}, {d}"><h3 class="ag-ldia-t"><span class="disco"><span>{d}</span></span><span>{nome.capitalize()}<small>feriado</small></span></h3>'
                f'<p class="ag-fer-l"><span><b>Feriado: {FERIADOS[d]}.</b> Fórum fechado; prazos não correm.</span></p></section>')
    return f'<section class="ag-ldia{" hoje" if hoje else ""}" aria-label="{nome.capitalize()}, {d}">{t}{dia_lista(d, evs, prazos, extra=extra)}</section>'


def semana_cel(evs, prazos=True, extra=None):
    passados = [x for x in DIAS if x[0] < HOJE]
    n = len([e for e in evs if e['d'] < HOJE])
    det = (f'<details class="ag-passados"><summary>{ico("historico")}<span>Segunda e terça já passaram <small>· {n} compromissos</small></span>{ico("baixo", "ico ico-s")}</summary>'
           + ''.join(dia_secao(d, s, nm, evs, prazos) for d, s, nm in passados) + '</details>')
    futuros = ''.join(dia_secao(d, s, nm, evs, prazos, extra) for d, s, nm in DIAS if HOJE <= d <= 20)
    fds = (f'<div class="ag-fds">{ico("agenda")}<span>Sábado, 21, e domingo, 22: nada marcado.</span>'
           f'<button class="ag-criar" type="button" data-janela="janela-novo" aria-label="Novo compromisso no fim de semana">{ico("mais")}</button></div>')
    return f'<div class="so-cel">{det}{futuros}{fds}</div>'


def folha_agenda(miolo, vis='semana', periodo='16 a 22 de novembro de 2026', pessoa='Toda a equipe', prazos=True, filtro='', pe='', voce='Marina Ribeiro (você)', **kw):
    f = f'<div class="ag-filtro" role="status">{filtro}</div>' if filtro else ''
    return (f'<section class="folha ag-folha" aria-labelledby="ag-t"><h2 class="sr" id="ag-t">Calendário</h2>{ferramentas(vis, periodo, pessoa, voce=voce, **kw)}{legenda(prazos)}{f}{miolo}{pe}</section>')


# ---------------------------------------------------------------- mês
MES_EVS = {
    3: [('10:00', 'aud', 'Conciliação · Rocha x Telefônica Sul')], 4: [('14:00', 'cli', 'Primeira reunião · Hélio Corrêa')],
    5: [('09:00', 'int', 'Revisão semanal de prazos'), ('16:00', 'ass', 'Contrato · Hélio Corrêa')],
    9: [('09:00', 'int', 'Reunião de sócios')], 10: [('11:00', 'cli', 'Retorno · Gabriela Teixeira'), ('15:00', 'aud', 'Una · Nobre x Moinho Real')],
    11: [('09:00', 'int', 'Revisão semanal de prazos')], 12: [('14:00', 'aud', 'Instrução · Alves x Metalúrgica Sol'), ('17:00', 'ass', 'Contrato · Irene Castro')],
    13: [('10:00', 'cli', 'Reunião · Construtora Vale Alto')],
    23: [('09:00', 'int', 'Reunião de sócios'), ('15:00', 'cli', 'Retorno · Benedito Souza Lima')],
    24: [('10:30', 'aud', 'Conciliação · Castro x Seguradora Leste')], 25: [('09:00', 'int', 'Revisão semanal de prazos'), ('11:00', 'cli', 'Primeira reunião · Rafaela Moura'), ('14:00', 'ass', 'Acordo · Teixeira x Banco Horizonte'), ('16:30', 'cli', 'Retorno · Irene Castro')],
    26: [('13:30', 'aud', 'Instrução · Lima x Padaria Estrela')], 27: [('10:00', 'cli', 'Reunião · Farmácia Bom Jesus')],
    30: [('09:00', 'int', 'Reunião de sócios')],
}
for e in EVS:
    MES_EVS.setdefault(e['d'], []).append((e['ini'], e['tipo'], e['tit']))
MES_PZ = {k: [p[0] for p in v] for k, v in PRAZOS.items()}
MES_PZ.update({6: ['Réplica · Rocha x Telefônica Sul'], 13: ['Embargos · Nobre x Moinho Real'], 23: ['Réplica · Oliveira x Banco Horizonte'], 27: ['Contrarrazões · Lima x Padaria Estrela']})
DIAS_MES = [(26, 'out'), (27, 'out'), (28, 'out'), (29, 'out'), (30, 'out'), (31, 'out')] + [(d, 'nov') for d in range(1, 31)] + [(d, 'dez') for d in range(1, 7)]
SEM = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
NOME_SEM = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']


def mes_pc(prazos=True):
    r = ''.join(f'<div class="ag-msem" aria-hidden="true">{s}</div>' for s in SEM)
    for i, (d, m) in enumerate(DIAS_MES):
        fora = m != 'nov'
        cls = 'ag-cel' + (' fora' if fora else '') + (' hoje' if (d == HOJE and not fora) else '') + (' fer' if (not fora and d in FERIADOS) else '')
        nm = NOME_SEM[i % 7]
        mes_n = {'out': 'outubro', 'nov': 'novembro', 'dez': 'dezembro'}[m]
        sr = f'<span class="sr"> de {mes_n}{", hoje" if (d == HOJE and not fora) else ""}</span>'
        cabd = (f'<div class="ag-dcab"><a class="ag-dlink" href="{U}dia"><span class="disco"><span>{d}</span></span>{sr}</a>'
                f'<button class="ag-criar" type="button" data-janela="janela-novo" aria-label="Novo compromisso na {nm}, {d} de {mes_n}">{ico("mais")}</button></div>')
        lis = []
        if not fora:
            if d in FERIADOS:
                lis.append(f'<li class="fer-n" style="background:var(--papel)"><span>Feriado · {FERIADOS[d]}</span></li>')
            for p in (MES_PZ.get(d, []) if prazos else []):
                lis.append(f'<li class="pz">{ico("balanca")}<span><span class="sr">Prazo: </span>{H(p)}</span></li>')
            for h, tp, t in sorted(MES_EVS.get(d, [])):
                ps = d < HOJE or (d == HOJE and mins(h) < 600)
                lis.append(f'<li class="{"passou" if ps else ""}" style="--t:{TIPOS[tp][1]}"><i aria-hidden="true"></i><span><span class="sr">{TIPOS[tp][0]}: </span><b>{h}</b> {H(t)}</span></li>')
        mais = ''
        if len(lis) > 4:
            mais = f'<p class="mais-n">e mais {len(lis) - 3}</p>'
            lis = lis[:3]
        r += f'<div class="{cls}">{cabd}<ul>{"".join(lis)}</ul>{mais}</div>'
    return f'<div class="ag-mes so-pc" role="group" aria-label="Novembro de 2026">{r}</div>'


def mes_cel(prazos=True):
    r = ''.join(f'<span class="s" aria-hidden="true">{s[0] if s != "Sáb" else "S"}</span>' for s in SEM)
    for i, (d, m) in enumerate(DIAS_MES):
        fora = m != 'nov'
        pts = ''
        n = 0
        if not fora:
            tipos = []
            for _, tp, _ in sorted(MES_EVS.get(d, [])):
                if tp not in tipos:
                    tipos.append(tp)
            pts = ''.join(f'<i style="--t:{TIPOS[tp][1]}"></i>' for tp in tipos[:3])
            if prazos and MES_PZ.get(d):
                pts += '<i class="pz"></i>'
            n = len(MES_EVS.get(d, [])) + (len(MES_PZ.get(d, [])) if prazos else 0)
        mes_n = {'out': 'outubro', 'nov': 'novembro', 'dez': 'dezembro'}[m]
        extra = f', {n} {"itens" if n != 1 else "item"}' if n else ''
        fer = f', feriado' if (not fora and d in FERIADOS) else ''
        cur = ' aria-current="date"' if (d == HOJE and not fora) else ''
        cls = ' class="fora"' if fora else (' class="fer"' if d in FERIADOS else '')
        r += f'<a href="{U}dia"{cls}{cur} aria-label="{d} de {mes_n}{fer}{extra}">{d}<span class="pts" aria-hidden="true">{pts}</span></a>'
    return f'<div class="so-cel"><div class="ag-mini" role="group" aria-label="Novembro de 2026">{r}</div>{dia_secao(18, "Qua", "quarta", EVS, prazos)}</div>'


# ---------------------------------------------------------------- janelas
CLIENTES = ['Daniela Rocha Mendes', 'Antônia Ferreira Prado', 'Benedito Souza Lima', 'Construtora Vale Alto Ltda.', 'Gabriela Teixeira', 'Hélio Batista Corrêa', 'Irene Castro', 'Sem cliente (compromisso interno)']


def j_novo(abrir=False, erros=False, outro=None):
    """outro: None (padrão), 'cheio' (Outro com o tipo escrito) ou 'vazio' (Outro sem o tipo: erro)"""
    if outro:
        resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O compromisso ainda não foi marcado.') if outro == 'vazio' else ''
        tit, sel_tipo, sel_mod = 'Perícia médica · Andrade x Unimed', 'out', 'p'
        cli, proc, resp = 'Irene Castro', 'Nenhum', 'Larissa Costa'
    else:
        resumo = aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'O compromisso ainda não foi marcado.') if erros else ''
        tit, sel_tipo, sel_mod = ('' if erros else 'Conciliação · Mendes x Loja Bela Casa'), 'aud', 'v'
        cli, proc, resp = 'Daniela Rocha Mendes', '0021987-11.2026.8.26.0011 · Mendes x Loja Bela Casa', 'Larissa Costa'
    campo_outro = campo('nv-outro', 'Qual tipo', 'Perícia' if outro == 'cheio' else '', cls='ag-outro', foco=outro == 'vazio',
                        ajuda='' if outro == 'vazio' else 'Escreva com poucas palavras. Ex.: Perícia, Diligência. Aparece com esse nome na agenda e na legenda.',
                        erro='Escreva qual é o tipo, por exemplo Perícia ou Diligência.' if outro == 'vazio' else '',
                        extra='' if outro else ' disabled').replace('<div class="campo ag-outro">', f'<div class="campo ag-outro" data-outro{"" if outro else " hidden"}>', 1)
    if sel_mod == 'p':
        onde = campo('nv-local', 'Endereço', 'IMESC · Rua Maria Paula, 172, São Paulo', ajuda='Vai no lembrete ao cliente, com o mapa.')
        lemb = marcar('nv-lemb', 'Lembrar Irene pelo WhatsApp', '1 dia antes, no mesmo horário, e 2 horas antes, com o endereço. Vai para o contato principal da ficha: Irene, (11) 97412-0538.', True)
        nota = 'Nos tipos que não são audiência, o lembrete vem desmarcado. Larissa marcou porque a cliente precisa ir à perícia.'
    else:
        onde = campo('nv-link', 'Link da sala', '' if erros else 'https://teams.microsoft.com/l/meetup-join/19%3a8f2c…', tipo='url',
                     ajuda='' if erros else 'Vai no lembrete ao cliente e no botão “Entrar na sala”.',
                     erro='Cole o link da sala virtual, ou marque Presencial.' if erros else '')
        lemb = marcar('nv-lemb', 'Lembrar Daniela pelo WhatsApp', '1 dia antes, no mesmo horário, e 2 horas antes, com o link da sala. Vai para o contato principal da ficha: Daniela, (11) 98830-2417.', True)
        nota = 'Em audiência de conciliação, faltar sem justificativa pode gerar multa (CPC, art. 334, § 8º). Por isso o lembrete já vem marcado nas audiências.'
    corpo = (resumo
             + opcoes_radio('nv-tipo', 'Tipo', [('aud', 'Audiência', ''), ('cli', 'Reunião com cliente', ''), ('ass', 'Assinatura', ''), ('int', 'Interno', ''), ('out', 'Outro', '')], sel_tipo, cls='ag-tipos')
             + campo_outro
             + campo('nv-tit', 'O que é', tit, foco=not outro or outro == 'cheio', ajuda='' if erros else 'Aparece assim na agenda. Ex.: Conciliação · Mendes x Loja Bela Casa',
                     erro='Escreva o que é o compromisso, mesmo que curto.' if erros else '')
             + '<div class="x-tres">' + campo('nv-data', 'Dia', '19/11/2026', im='numeric', ajuda='quinta-feira')
             + campo('nv-ini', 'Começa', '16:00', im='numeric')
             + campo('nv-fim', 'Termina', '15:00' if erros else '17:00', im='numeric',
                     erro='Termina antes de começar. Confira as horas.' if erros else '') + '</div>'
             + opcoes_radio('nv-mod', 'Onde', [('p', 'Presencial', ''), ('v', 'Virtual, com link da sala', '')], sel_mod)
             + onde
             + '<div class="x-dois">' + selecao('nv-cli', 'Cliente', CLIENTES, cli, ajuda='Da lista de Clientes.')
             + selecao('nv-proc', 'Processo', ['Nenhum', '0021987-11.2026.8.26.0011 · Mendes x Loja Bela Casa'], proc, opc=True, ajuda='Do Jurídico. Só aparece para quem tem a área.') + '</div>'
             + '<div class="x-dois">' + selecao('nv-resp', 'Responsável', EQUIPE, resp, ajuda='Quem responde pelo compromisso.')
             + selecao('nv-mais', 'Também vai', ['Ninguém mais'] + EQUIPE, 'Ninguém mais', opc=True) + '</div>'
             + '<fieldset class="x-grupo"><legend>Lembrete ao cliente</legend>'
             + lemb
             + f'<p class="x-pe-nota">{ico("balanca")}<span>{nota}</span></p>'
             + '</fieldset>'
             + area_texto('nv-obs', 'Observações', '', opc=True, ajuda='Só a equipe vê. Não vai para o cliente.'))
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Marcar compromisso</button>')
    return janela('janela-novo', 'Quinta, 19 de novembro', 'Novo compromisso',
                  'Fica na agenda de quem vai, com seu nome e a hora, no histórico.', corpo, pe, abrir=abrir or erros or bool(outro)).replace('class="janela"', 'class="janela x-larga"', 1)


def j_cancelar(abrir=False):
    corpo = (area_texto('cc-mot', 'Motivo', '', foco=True, ajuda='Ex.: redesignada pelo juízo; acordo fechado antes da audiência.')
             + marcar('cc-avisar', 'Avisar Gabriela pelo WhatsApp', 'Mensagem: “A audiência de 18/11, às 11h, foi cancelada. O escritório avisa a nova data.”', True)
             + f'<p class="pt-comuns">{ico("historico")}<span>Nada é apagado: o compromisso fica na agenda, riscado, com o motivo, e no histórico. O lembrete que ainda não saiu é cancelado.</span></p>')
    pe = '<button class="btn btn-fantasma" type="button" data-fechar>Voltar</button><button class="btn btn-perigo" type="submit">Cancelar a audiência</button>'
    return janela('janela-cancelar', 'Agenda · Ribeiro &amp; Matos', 'Cancelar a conciliação de hoje?',
                  'Teixeira x Banco Horizonte, quarta, 18/11, às 11:00.', corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- telas
def tela_semana(evs=EVS, prazos=True, extra=None, extra_cls='novo', pessoa='Toda a equipe', filtro='', pe='', lede=LEDE, voce='Marina Ribeiro (você)'):
    miolo = semana_pc(evs, prazos, extra, extra_cls) + semana_cel(evs, prazos, extra)
    return f'<div class="ag">{cab(lede)}{folha_agenda(miolo, "semana", pessoa=pessoa, prazos=prazos, filtro=filtro, pe=pe, voce=voce)}</div>'


def lembretes_hoje():
    return (f'<section class="folha" aria-labelledby="t-lemb"><div class="folha-cab"><div><h2 id="t-lemb">{ico("whats")}Lembretes aos clientes</h2>'
            f'<p class="sub">Pelo WhatsApp do escritório, hoje e amanhã</p></div></div><ul class="ag-lembs">'
            f'<li>{ico("check")}<div><strong>Gabriela Teixeira · conciliação às 11:00</strong><small>Lembrete de 1 dia antes enviado ontem; ela respondeu “Confirmo”. O de 2 horas antes saiu às 09:00, com o link da sala.</small><span class="selo selo-ok">{ico("check")}Confirmou</span></div></li>'
            f'<li>{ico("relogio")}<div><strong>Hélio Batista Corrêa · instrução amanhã, 13:30</strong><small>O lembrete de 1 dia antes sai hoje às 13:30 para Marta Corrêa, a esposa, que é o contato principal.</small><span class="selo selo-implant">{ico("whats")}Sai às 13:30</span></div></li>'
            f'</ul><p class="ag-hist-nota">As respostas dos clientes chegam em <a href="conversas.html?estado=resolvida">Conversas</a>.</p></section>')


RESERVA_SYNC = (f'<section class="folha" aria-labelledby="t-sync"><div class="folha-cab"><div><h2 id="t-sync">{ico("sincronia")}Google Agenda e Outlook</h2></div></div>'
                f'<div class="ag-reserva"><span class="selo selo-neutro">Em estudo</span><span>Ver esta agenda no <b>Google Agenda</b> ou no <b>Outlook</b> ainda não existe. '
                f'Estamos perguntando aos escritórios-piloto se isso faz falta antes de fazer.</span>'
                f'<a class="btn btn-sec" href="#">{ico("conversas")}Contar como vocês usam</a></div></section>')


def tela_dia():
    principal = (f'<section class="folha ag-folha" aria-labelledby="ag-t"><h2 class="sr" id="ag-t">Calendário</h2>{ferramentas("dia", "Quarta, 18 de novembro de 2026", ant="Dia anterior", prox="Próximo dia")}{legenda(True, False)}'
                 f'<section class="ag-ldia hoje" aria-label="Quarta, 18"><h3 class="ag-ldia-t"><span class="disco"><span>18</span></span><span>Hoje<small>2 prazos · 4 compromissos</small></span></h3>'
                 f'{dia_lista(18, EVS, True, livres=True)}</section></section>')
    return f'<div class="ag">{cab(LEDE)}<div class="ag-dia"><div class="ag-col2">{principal}</div><aside class="ag-col2" aria-label="Lembretes e agenda externa">{lembretes_hoje()}{RESERVA_SYNC}</aside></div></div>'


def tela_mes():
    miolo = mes_pc() + mes_cel()
    return f'<div class="ag">{cab(LEDE)}{folha_agenda(miolo, "mes", "Novembro de 2026", ant="Mês anterior", prox="Próximo mês")}</div>'


def tela_compromisso(toast_=''):
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-sala"><p class="sobretitulo" id="t-sala">Sala virtual</p>'
         f'<p class="grande">11:00<small>começa em 48 minutos</small></p>'
         f'<p class="ag-quando"><b>Microsoft Teams</b>, do CEJUSC de Pinheiros. Entre 10 minutos antes.</p>'
         f'<div class="ag-btns"><a class="btn btn-pri" href="#">{ico("video")}Entrar na sala</a><button class="btn btn-sec" type="button">{ico("copiar")}Copiar o link</button></div></section>')
    cabh = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="{U}semana">{ico("esq", "ico ico-s")}Agenda</a>'
            f'<div class="ident"><div><p class="sobretitulo">Audiência · conciliação</p><h1>Teixeira x Banco Horizonte</h1>'
            f'<p class="meta"><span class="selo selo-ativo">Hoje</span><span>quarta, 18/11, das 11:00 às 12:00</span><span class="sep" aria-hidden="true"></span><span>Virtual</span></p></div></div></div>{d}</div>')
    dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Compromisso</h2><p class="sub">Marcado por Larissa Costa em 03/11/2026</p></div>'
             f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("lapis")}Editar ou remarcar</a></div></div>'
             f'<dl class="dados-ficha ag-dados">'
             f'<div><dt>Quando</dt><dd>Quarta, 18/11/2026 · 11:00 às 12:00</dd></div>'
             f'<div><dt>Onde</dt><dd>{ico("video", "ico ico-s")}Virtual · CEJUSC Pinheiros</dd></div>'
             f'<div class="inteira"><dt>Link da sala</dt><dd class="ag-link-sala"><code>https://teams.microsoft.com/l/meetup-join/19%3ameeting_YjQ1…</code></dd></div>'
             f'<div><dt>Cliente</dt><dd><a href="../portal-clientes/clientes.html?estado=lista">Gabriela Teixeira</a></dd></div>'
             f'<div><dt>Parte contrária</dt><dd>Banco Horizonte S.A.</dd></div>'
             f'<div class="inteira"><dt>Processo</dt><dd><span class="num">1009876-54.2026.8.26.0011</span> · 3ª Vara Cível de Pinheiros <a class="ver" href="#">Abrir no Jurídico{ico("dir", "ico ico-s")}</a></dd></div>'
             f'<div><dt>Responsável</dt><dd>Marina Ribeiro</dd></div><div><dt>Também vai</dt><dd>Larissa Costa</dd></div>'
             f'<div class="inteira"><dt>Observações da equipe</dt><dd>Gabriela autorizou acordo a partir de R$ 6.500,00. Levar a planilha de cálculo atualizada.</dd></div>'
             f'</dl></section>')
    lemb = (f'<section class="folha" aria-labelledby="t-lemb2"><div class="folha-cab"><div><h2 id="t-lemb2">{ico("whats")}Lembrete à cliente</h2>'
            f'<p class="sub">Para Gabriela Teixeira, <span class="num">(11) 99602-7735</span>, contato principal da ficha</p></div>'
            f'<div class="acoes"><span class="selo selo-ok">{ico("check")}Confirmou presença</span></div></div>'
            f'<p class="ag-por">{ico("balanca")}<span><b>Por que lembrar.</b> Na audiência de conciliação, faltar sem justificativa é ato atentatório à dignidade da justiça e pode gerar multa de até 2% do valor da causa ou da vantagem pretendida (CPC, art. 334, § 8º).</span></p>'
            f'<div class="ag-hist">' + '<div class="eventos-dia"><ol class="eventos">'
            f'<li><time>17/11 11:00</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete de 1 dia antes enviado <span class="selo selo-neutro">Lido</span></p><small>Pelo WhatsApp do escritório</small></div></li>'
            f'<li><time>17/11 11:26</time><span class="pto forte" aria-hidden="true"></span><div><p>Gabriela respondeu: “Confirmo, estarei lá.”</p><small>A IA registrou a confirmação</small></div></li>'
            f'<li><time>18/11 09:00</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete de 2 horas antes enviado, com o link da sala <span class="selo selo-neutro">Entregue</span></p></div></li>'
            f'</ol></div></div>'
            f'<div class="ag-msg"><small>Mensagem enviada em 17/11, às 11:00</small><p class="ag-balao"><span class="de">{ico("whats")}Ribeiro &amp; Matos</span>'
            f'Olá, Gabriela. Aqui é do escritório Ribeiro &amp; Matos. Sua audiência de conciliação é amanhã, quarta, 18/11, às 11h, por vídeo. '
            f'O link chega aqui 2 horas antes. Entre 10 minutos antes, com um documento com foto. Faltar sem justificativa pode gerar multa. Responda CONFIRMO, ou escreva se tiver dúvida.</p>'
            f'<a class="ver" href="conversas.html?estado=resolvida" style="justify-self:start">Ver a conversa com Gabriela{ico("dir", "ico ico-s")}</a></div></section>')
    quem = (f'<section class="folha" aria-labelledby="t-quem"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-quem" style="font-size:20px">Na agenda de</h2></div></div>'
            f'<ul class="ag-pessoas"><li><span class="av-p forte" aria-hidden="true">MR</span><div><strong>Marina Ribeiro</strong><small>Responsável</small></div></li>'
            f'<li><span class="av-p" aria-hidden="true">LC</span><div><strong>Larissa Costa</strong><small>Também vai</small></div></li></ul></section>')
    hist = (f'<section class="folha" aria-labelledby="t-hc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-hc" style="font-size:20px">Histórico</h2></div></div>'
            f'<div class="ag-hist"><div class="eventos-dia"><ol class="eventos">'
            f'<li><time>03/11 09:12</time><span class="pto" aria-hidden="true"></span><div><p><b>Larissa Costa</b> marcou</p><small>Para 18/11, às 14:00, pela intimação de 31/10</small></div></li>'
            f'<li><time>10/11 16:40</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Larissa Costa</b> remarcou</p><small>De 14:00 para 11:00. Motivo: redesignação publicada em 10/11</small></div></li>'
            f'</ol></div></div><p class="ag-hist-nota">Nada aqui é apagado. Remarcar e cancelar pedem motivo.</p></section>')
    acoes = (f'<section class="folha" aria-labelledby="t-ac"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ac" style="font-size:20px">Cancelar</h2></div></div>'
             f'<div class="ag-acoes"><p>Cancelar pede o motivo e pode avisar a cliente pelo WhatsApp. O compromisso continua na agenda, riscado.</p>'
             f'<button class="btn btn-perigo" type="button" data-janela="janela-cancelar">{ico("x")}Cancelar compromisso</button></div></section>')
    return f'<div class="ag">{cabh}<div class="ag-grade"><div class="ag-col2">{dados}{lemb}</div><aside class="ag-col2" aria-label="Contexto do compromisso">{quem}{hist}{acoes}</aside></div></div>{toast_}'


def tela_vazio():
    passos = (f'<ol class="ag-passos">'
              f'<li><span class="disco"><span>1</span></span><span>Use o <b>+</b> de um dia, ou “Novo compromisso”, para marcar uma audiência, uma reunião com cliente, uma assinatura ou algo interno.</span></li>'
              f'<li><span class="disco"><span>2</span></span><span>Nas audiências, o lembrete ao cliente pelo WhatsApp já vem marcado: 1 dia antes e 2 horas antes.</span></li>'
              f'<li><span class="disco"><span>3</span></span><span>Os prazos cadastrados no Jurídico aparecem aqui sozinhos, para quem tem a área.</span></li></ol>')
    e = estado('A agenda do escritório começa aqui', 'Ainda não há nada marcado. A agenda é uma só para a equipe toda; cada pessoa pode ver só a sua.', 'agenda',
               acoes=f'<button class="btn btn-pri" type="button" data-janela="janela-novo">{ico("mais")}Marcar o primeiro compromisso</button>', h='h3')
    e = e.replace('<div class="acoes">', passos + '<div class="acoes">')
    return f'<div class="ag">{cab(LEDE)}<div class="ag-vazio"><div class="ag-col2">{e}</div><aside class="ag-col2" aria-label="Agenda externa">{RESERVA_SYNC}</aside></div></div>'


B = dict(atual='agenda', trilha='Agenda', titulo='Agenda')
T = ''
T += tpl('semana', tela_semana() + j_novo(), **B)
T += tpl('mes', tela_mes() + j_novo(), **B)
T += tpl('dia', tela_dia() + j_novo(), **B)
FELIPE = [e for e in EVS if 'Felipe' in e['quem'] or 'Equipe toda' in e['quem']]
PZ[0] = {18: [PRAZOS[18][0]]}
T_p = (tela_semana(FELIPE, pessoa='Felipe Matos',
                               filtro=f'<span>Mostrando só a agenda de <b>Felipe Matos</b>: 4 compromissos e 1 prazo nesta semana.</span><a class="btn btn-fantasma" href="{U}semana">{ico("x")}Ver a equipe toda</a>') + j_novo())
PZ[0] = PRAZOS
T += tpl('pessoa', T_p, **B)
T += tpl('sem-juridico', tela_semana(prazos=False, lede=LEDE_SEM, voce='Paula Nunes (você)',
                                     pe=f'<p class="ag-pe">{ico("cadeado")}<span>Os prazos processuais ficam na área Jurídico, que não está liberada para você. Quem libera é Marina Ribeiro, a sócia dona.</span></p>') + j_novo(), quem='sem-area', **B)
T += tpl('compromisso', tela_compromisso() + j_cancelar(), atual='agenda', trilha='Agenda|Conciliação · Teixeira x Banco Horizonte', titulo='Conciliação · Teixeira x Banco Horizonte')
T += tpl('novo', tela_semana(extra=NOVO, extra_cls='fantasma') + j_novo(abrir=True), **B)
T += tpl('novo-erros', tela_semana(extra=NOVO, extra_cls='fantasma') + j_novo(erros=True), **B)
NOVO_OUTRO = E(19, '16:00', '17:00', 'per', 'Perícia médica · Andrade x Unimed', 'presencial', 'IMESC', ['Larissa'], 'agendado')
ESCRITOS[:] = ['per']
T += tpl('novo-outro', tela_semana(extra=NOVO_OUTRO, extra_cls='fantasma') + j_novo(outro='cheio'), **B)
T += tpl('marcado-outro', tela_semana(extra=NOVO_OUTRO, extra_cls='novo') + j_novo()
         + toast('Perícia marcada para quinta, 19/11, às 16:00.', 'Está na agenda de Larissa Costa com o tipo “Perícia”, que agora aparece na legenda. O lembrete a Irene sai na quarta, às 16:00, e na quinta, às 14:00.'), **B)
ESCRITOS[:] = []
T += tpl('novo-outro-erro', tela_semana(extra=NOVO, extra_cls='fantasma') + j_novo(outro='vazio'), **B)
T += tpl('marcado', tela_semana(extra=NOVO, extra_cls='novo') + j_novo()
         + toast('Conciliação marcada para quinta, 19/11, às 16:00.', 'Está na agenda de Larissa Costa. O lembrete a Daniela sai na quarta, às 16:00, e na quinta, às 14:00.'), **B)
T += tpl('cancelar', tela_compromisso() + j_cancelar(abrir=True), atual='agenda', trilha='Agenda|Conciliação · Teixeira x Banco Horizonte', titulo='Conciliação · Teixeira x Banco Horizonte')
T += tpl('vazio', tela_vazio() + j_novo(), **B)

out = pagina('Agenda', 'Agenda do escritório no Portal: audiências e compromissos por mês, semana e dia, com lembrete ao cliente pelo WhatsApp.',
             '{"estado":"semana","atual":"agenda"}', '', T)
out = finalizar(out, CSS_AG)
# "Outro": o campo do tipo escrito aparece só com a opção marcada
out = out.replace('</body>', '''<script>
document.addEventListener('change',function(ev){
  var r=ev.target; if(!r.matches('input[name="nv-tipo"]')) return;
  var c=r.closest('form,.janela').querySelector('[data-outro]'); if(!c) return;
  var on=r.value==='out'; c.hidden=!on; var i=c.querySelector('input'); i.disabled=!on; if(on) i.focus();
});
</script>
</body>''', 1)
open(f'{SAIDA}/agenda.html', 'w', encoding='utf-8').write(out)
print('agenda ok', T.count('<template data-est='), 'estados')
