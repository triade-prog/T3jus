# Portal · Clientes: quem assina pelo cliente menor ou sob curatela (F3.98; AP-01, CH-08, PT-11).
# Parte de três desenhos aprovados, sem mudá-los:
#   - Clientes (clientes.py) e a ficha ligada (ficha_ligada.py), lidos até o começo dos estados;
#   - Procurações e modelos (procuracoes.py, que lê contratos.py, pecas.py e peticoes_css.txt), lido num espaço à parte.
# Peças novas com o prefixo rl-. Uso: python3 responsavel.py <pasta-saida>
import os, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
ARGV0 = list(sys.argv)
_MARCA = '\n# ---------------------------------------------------------------- estados\n'
# 1. Ficha ligada (que já lê clientes.py e juridico.py), até os estados
_fl = open(os.path.join(AQUI, 'ficha_ligada.py'), encoding='utf-8').read()
exec(compile(_fl[:_fl.index(_MARCA)], 'ficha_ligada.py', 'exec'), globals())
# 2. Procurações e modelos, num espaço à parte
_pr = open(os.path.join(AQUI, 'procuracoes.py'), encoding='utf-8').read()
P = {'__name__': 'procuracoes_base', '__file__': os.path.join(AQUI, 'procuracoes.py')}
exec(compile(_pr[:_pr.index(_MARCA)], 'procuracoes.py', 'exec'), P)
sys.argv = ARGV0
import comum

SAIDA = ARGV0[1] if len(ARGV0) > 1 else 'saida'
U = '?estado='
P['U'] = '../portal-procuracoes/procuracoes.html?estado='
P['CIDADE_DATA'] = 'São Paulo, 22 de novembro de 2026'
P['HOJE'] = '22/11/2026'
C, F, FALTA = P['C'], P['F'], P['FALTA']

# ---------------------------------------------------------------- dados fictícios (hoje é 22/11/2026)
CPF_PEDRO, CPF_JOANA = P['CPF_PEDRO'], P['CPF_JOANA']
CPF_JOANA_ERRADO = CPF_JOANA[:-1] + str((int(CPF_JOANA[-1]) + 4) % 10)
CPF_LUCAS, CPF_MARCOS = cpf('502318764'), cpf('214907836')
CPF_SEB, CPF_HELENA = cpf('073415628'), cpf('318260947')
CPF_RAFA, CPF_CLEUSA = cpf('609124853'), cpf('127508394')
END_PEDRO = 'Rua Bresser, 845, apto. 12, Brás, São Paulo, SP, CEP 03017-000'
END_LUCAS = 'Rua Cajuru, 312, Belenzinho, São Paulo, SP, CEP 03057-000'
END_SEB = 'Rua Domingos de Morais, 2.180, apto. 51, Vila Mariana, São Paulo, SP, CEP 04036-000'
END_HELENA = 'Rua Loefgren, 1.415, Vila Clementino, São Paulo, SP, CEP 04040-031'
END_RAFA = 'Rua Itaqueri, 1.020, Mooca, São Paulo, SP, CEP 03187-000'
PROC_CUR = '1004587-22.2025.8.26.0100'
VARA_CUR = '2ª Vara da Família e Sucessões do Foro Central de São Paulo'

PEDRO = dict(nome='Pedro Henrique Alves Souza', tp='PF', desde='19/11/2026', doc='')
SEB = dict(nome='Sebastião Ramos Filho', tp='PF', desde='05/11/2026', doc='')
RAFA = dict(nome='Rafaela Nunes Torres', tp='PF', desde='02/07/2026', doc='')

# ---------------------------------------------------------------- CSS novo (prefixo rl-)
CSS_RL = r"""
/* ==========================================================================
   Clientes · quem assina pelo cliente menor ou sob curatela (prefixo rl-). Só tokens e pares aprovados.
   ========================================================================== */
.rl-cap{grid-column:1/-1;border:0;margin:0;padding:0;min-width:0}
.rl-cap legend{font-weight:500;font-size:14px;margin-bottom:6px;padding:0}
.rl-cap .rl-ops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.rl-cap .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px;margin:0;background:var(--papel)}
.rl-cap .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.rl-cap .rl-aj{font-size:12px;color:var(--texto-2);margin-top:6px}
.rl-painel{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px 20px;padding:16px;border:1px solid var(--vinho);border-radius:var(--raio-g);background:var(--papel);box-shadow:inset 4px 0 0 var(--vinho)}
.rl-painel[hidden]{display:none}
.rl-painel .c6{grid-column:span 6}.rl-painel .c4{grid-column:span 4}.rl-painel .c3{grid-column:span 3}.rl-painel .c2{grid-column:span 2}
.rl-sub{grid-column:1/-1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--divisor)}
.rl-sub:first-child{border-top:0;padding-top:0}
.rl-sub h4{font-family:var(--serifa);font-size:18px;font-weight:600;color:var(--vinho);margin:0}
.rl-sub small{font-size:12px;color:var(--texto-2)}
.rl-calc{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5;color:var(--tinta);align-self:end}
.rl-calc .ico{flex:none;margin-top:1px;color:var(--vinho)}
.rl-calc b{font-weight:600}
.rl-calc.rl-neutro{background:var(--sal-2)}
.rl-mora{grid-column:1/-1}
.rl-mora .opcao{margin:0 -8px}
.rl-arq{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px dashed var(--vinho-4);border-radius:var(--raio);background:#FCF8F5}
.rl-arq.rl-tem{border-style:solid;border-color:var(--borda-folha);background:var(--papel)}
.rl-arq .rl-ic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.rl-arq strong{display:block;font-weight:500;font-size:14px;overflow-wrap:anywhere}
.rl-arq small{display:block;font-size:12px;color:var(--texto-2)}
.rl-termo{border:0;margin:0;padding:0;min-width:0;grid-column:1/-1}
.rl-termo legend{font-weight:500;font-size:13px;margin-bottom:4px;padding:0}
.rl-termo .rl-ops2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.rl-termo .opcao{margin:0 -8px}
.rl-termo .ajuda{font-size:12px;color:var(--texto-2);margin-top:4px}
/* Ficha em leitura */
.rl-quem{display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;align-items:start;padding:0 24px 16px}
.rl-quem .rl-av{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho);font-family:var(--serifa);font-size:19px;font-weight:600}
.rl-quem strong{display:block;font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--vinho);line-height:1.2}
.rl-quem small{display:block;font-size:13px;color:var(--texto-2);margin-top:2px}
.rl-quem .selo{margin-top:8px}
.rl-regra{display:flex;gap:10px;align-items:flex-start;margin:0 24px 18px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.rl-regra .ico{flex:none;margin-top:1px;color:var(--vinho-4)}
.rl-regra b{font-weight:600}
.rl-dl-sep{border-top:1px solid var(--divisor)}
.rl-tempo{list-style:none;margin:0;padding:0 24px 20px;display:grid;gap:0}
.rl-tempo li{display:grid;grid-template-columns:16px minmax(0,1fr);gap:12px;position:relative;padding-bottom:14px}
.rl-tempo li:last-child{padding-bottom:0}
.rl-tempo li::before{content:"";position:absolute;left:7px;top:16px;bottom:0;width:2px;background:var(--sal)}
.rl-tempo li:last-child::before{display:none}
.rl-tempo .rl-pt{width:16px;height:16px;border-radius:50%;border:2px solid var(--vinho-4);background:var(--papel);margin-top:2px}
.rl-tempo li.rl-agora .rl-pt{background:var(--vinho);border-color:var(--vinho)}
.rl-tempo b{display:block;font-weight:500;font-size:14px}
.rl-tempo small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.rl-tempo .rl-quando{font-size:12px;color:var(--vinho-2);font-weight:500;letter-spacing:.02em}
.rl-antes dd{color:var(--texto-2)}
.rl-faixa{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start}
.rl-faixa .aviso-acoes{margin-top:10px}
/* Gerar documentos */
.pr-rep.rl-dois{grid-template-columns:44px minmax(0,1fr)}
.pr-rep .rl-linha{display:block;margin-top:2px}
.pr-rep small{overflow-wrap:anywhere}
.pr-rep.rl-falta{border-color:var(--vinho-3);border-style:dashed}
.rl-assina{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rl-assina>span{display:block}
.pe-ass .rl-fio{display:block;width:min(240px,85%);margin:18px auto 6px;border-top:1px solid var(--tinta)}
.rl-txt-grade .rl-assina{grid-template-columns:1fr}
/* Página de texto */
.rl-txt-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
.rl-txt-grade .pe-papel{font-size:13px}
.rl-txt-nota{display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);font-size:13px;color:var(--texto-2);line-height:1.5;background:var(--papel)}
.rl-txt-nota .ico{flex:none;color:var(--vinho-4)}
.rl-txt-nota b{color:var(--texto);font-weight:500}
.rl-txt-cab{padding:18px 22px 0}
.rl-txt-cab h2{font-size:20px}
.rl-txt-cab p{font-size:12.5px;color:var(--texto-2);margin-top:4px;line-height:1.45}
.rl-txt-grade .pr-painel{padding:12px 16px 18px}
@media (max-width:1200px){.rl-txt-grade{grid-template-columns:1fr}}
@media (max-width:760px){
  .rl-cap .rl-ops{grid-template-columns:1fr}
  .rl-painel{grid-template-columns:1fr;padding:14px 12px}
  .rl-painel .c6,.rl-painel .c4,.rl-painel .c3,.rl-painel .c2{grid-column:1/-1}
  .rl-termo .rl-ops2{grid-template-columns:1fr}
  .rl-quem{padding:0 16px 14px}
  .rl-regra{margin:0 16px 16px}
  .rl-tempo{padding:0 16px 16px}
  .rl-arq{grid-template-columns:40px minmax(0,1fr)}
  .rl-arq .btn{grid-column:1/-1}
  .rl-assina{grid-template-columns:1fr}
  .rl-faixa .aviso-acoes .btn{flex:1 1 100%}
}
"""

SCRIPT_RL = r"""<script>
/* Desenho: escolher a capacidade mostra o quadro certo (no produto, o formulário faz o mesmo) */
document.addEventListener('change',function(e){
  var r=e.target; if(!r.matches||!r.matches('input[name="cap"]')) return;
  document.querySelectorAll('.rl-painel[data-cap]').forEach(function(p){p.hidden=p.dataset.cap!==r.value});
});
</script>"""


# ---------------------------------------------------------------- peças do formulário
def opr(nome, valor, rot, sub, marcado, id_=None):
    ch = ' checked' if marcado else ''
    i = f' id="{id_}"' if id_ else ''
    return f'<label class="opcao"><input class="marcar" type="radio" name="{nome}" value="{valor}"{i}{ch}><span>{rot}<small>{sub}</small></span></label>'


def capacidade_fs(sel, nome_cli='o cliente'):
    return (f'<div class="cl-sec"><h3>Quem assina</h3><small>Na procuração e no contrato</small></div>'
            f'<fieldset class="rl-cap" aria-describedby="cap-aj"><legend>O cliente assina por si?</legend><div class="rl-ops">'
            + opr('cap', 'plena', 'Sim, assina por si', 'Maior de 18 anos', sel == 'plena', 'cap-plena')
            + opr('cap', 'menor', 'Não: é menor de 18 anos', 'Assina o pai, a mãe ou o tutor', sel == 'menor', 'cap-menor')
            + opr('cap', 'curatela', 'Não: está sob curatela', 'Assina o curador nomeado pelo juiz', sel == 'curatela', 'cap-curatela')
            + f'</div><p class="rl-aj" id="cap-aj">Na dúvida, deixe “Sim”. Dá para mudar depois, na ficha.</p></fieldset>')


def calc_menor(primeiro, idade, nasc16, nasc18):
    if idade is None:
        return (f'<div class="rl-calc rl-neutro c3" role="status" aria-live="polite">{ico("ajuda")}<span>Com a data, o T3jus diz se {primeiro} é representado ou assistido, '
                'e faz a conta de novo a cada documento gerado.</span></div>')
    if idade < 16:
        return (f'<div class="rl-calc c3" role="status" aria-live="polite">{ico("pessoas")}<span><b>{primeiro} tem {idade} anos hoje: é representado.</b> '
                f'Só quem responde por ele assina. Aos 16 anos, em {nasc16}, passa a ser assistido, e os dois assinam.</span></div>')
    return (f'<div class="rl-calc c3" role="status" aria-live="polite">{ico("pessoas")}<span><b>{primeiro} tem {idade} anos hoje: é assistido.</b> '
            f'Ele e quem responde por ele assinam juntos. Aos 18 anos, em {nasc18}, passa a assinar sozinho.</span></div>')


def painel_menor(v, aberto, erros=False, mudou=()):
    """v: dados do menor e do responsável. erros: estado com 3 pontos a acertar."""
    pr = v.get('primeiro', '')
    e_nasc = 'Escreva a data de nascimento de Pedro. É com ela que o T3jus sabe quem assina.' if erros else ''
    e_nome = 'Escreva o nome de quem assina por Pedro. Sem ele, a procuração não tem quem assine.' if erros else ''
    e_cpf = 'Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou deixe em branco por agora.' if erros else ''
    m = lambda k: k in mudou
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Por que pedimos a data de nascimento.</b> Só de quem é menor, e só para saber, no dia de gerar cada documento, '
        f'se ele é representado ou assistido. De quem assina por si, não pedimos (LGPD).</span></div>'
        + campo('m-nasc', 'Data de nascimento', '' if erros else v.get('nasc', ''), 'c3', uso=PROC, im='numeric', erro=e_nasc, ajuda='' if e_nasc else 'dd/mm/aaaa')
        + calc_menor(pr, None if (erros or not v.get('idade')) else v['idade'], v.get('n16', ''), v.get('n18', ''))
        + f'<div class="rl-sub"><h4>Quem assina por {pr}</h4><small>O pai, a mãe ou o tutor. Vai na procuração e no contrato.</small></div>'
        + selecao('m-papel', 'É', ['Mãe', 'Pai', 'Tutora', 'Tutor'], v.get('papel', ''), 'c2', uso=PROC, ajuda='Tutor é quem o juiz nomeou.')
        + campo('m-rl-nome', 'Nome completo', '' if erros else v.get('rl', ''), 'c4', uso=PROC, erro=e_nome, ajuda='' if e_nome else 'Como está no documento.')
        + campo('m-rl-cpf', 'CPF', CPF_JOANA_ERRADO if erros else v.get('rlcpf', ''), 'c2', uso=PROC, im='numeric', erro=e_cpf,
                ajuda='' if e_cpf else 'Conferimos os dígitos.', depois='' if (erros or not v.get('rlcpf', '')) else f'<p class="cl-ok">{ico("check")}Dígitos conferidos</p>')
        + campo('m-rl-rg', 'RG', v.get('rlrg', ''), 'c2', uso=PROC, im='numeric', mudou=m('rlrg'))
        + campo('m-rl-rgo', 'Órgão emissor e UF', v.get('rlrgo', ''), 'c2', ajuda='Ex.: SSP/SP')
        + selecao('m-rl-nac', 'Nacionalidade', ['Brasileira', 'Outra'], v.get('rlnac', ''), 'c2', PROC)
        + selecao('m-rl-civil', 'Estado civil', EST_CIVIL, v.get('rlcivil', ''), 'c2', PROC)
        + campo('m-rl-prof', 'Profissão', v.get('rlprof', ''), 'c2', uso=PROC)
        + f'<div class="rl-mora"><label class="opcao"><input class="marcar" type="checkbox" name="m-mora" checked><span>Mora com {pr}'
          f'<small>O endereço da qualificação vale para os dois (“ambos residentes na…”). Desmarque para escrever outro.</small></span></label></div>'
    )
    h = '' if aberto else ' hidden'
    return f'<div class="rl-painel" data-cap="menor" role="group" aria-label="Menor de 18 anos: data de nascimento e quem assina"{h}>{corpo}</div>'


def painel_curatela(v, aberto):
    pr = v['primeiro']
    tem = bool(v.get('termo'))
    arq = (f'<div class="rl-arq{" rl-tem" if tem else ""}" role="group" aria-labelledby="c-termo-r"><span class="rl-ic" aria-hidden="true">{ico("doc")}</span>'
           + (f'<div><strong id="c-termo-r">termo-curatela-sebastiao.pdf</strong><small>PDF · 2 páginas · 380 KB</small></div>'
              f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar", "ico ico-s")}Trocar arquivo: termo de curatela</button>' if tem else
              f'<div><strong id="c-termo-r">Termo de curatela <span class="opcional">(opcional)</span></strong><small>PDF ou foto, até 10 MB. Fica guardado na ficha, só para o escritório.</small></div>'
              f'<button class="btn btn-sec btn-compacto" type="button">{ico("mais", "ico ico-s")}Escolher arquivo: termo de curatela</button>')
           + '</div>')
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Só o que vai no documento.</b> Quem é o curador e os dados do termo, que vão na qualificação. '
        f'Não pedimos o motivo da curatela, laudo nem data de nascimento (LGPD).</span></div>'
        + f'<div class="rl-sub"><h4>Quem assina por {pr}</h4><small>O curador, como está no termo de curatela</small></div>'
        + selecao('c-papel', 'É', ['Curadora', 'Curador'], v['papel'], 'c2', uso=PROC)
        + campo('c-rl-nome', 'Nome completo', v['rl'], 'c4', uso=PROC, ajuda='Como está no termo de curatela.')
        + campo('c-rl-cpf', 'CPF', v['rlcpf'], 'c2', uso=PROC, im='numeric', ajuda='Conferimos os dígitos.', depois=f'<p class="cl-ok">{ico("check")}Dígitos conferidos</p>')
        + campo('c-rl-rg', 'RG', v['rlrg'], 'c2', uso=PROC, im='numeric')
        + campo('c-rl-rgo', 'Órgão emissor e UF', v['rlrgo'], 'c2', ajuda='Ex.: SSP/SP')
        + selecao('c-rl-nac', 'Nacionalidade', ['Brasileira', 'Outra'], v['rlnac'], 'c2', PROC)
        + selecao('c-rl-civil', 'Estado civil', EST_CIVIL, v['rlcivil'], 'c2', PROC)
        + campo('c-rl-prof', 'Profissão', v['rlprof'], 'c2', uso=PROC)
        + f'<div class="rl-mora"><label class="opcao"><input class="marcar" type="checkbox" name="c-mora"><span>Mora com {pr}'
          f'<small>Desmarcado: escreva abaixo o endereço de quem assina.</small></span></label></div>'
        + campo('c-rl-cep', 'CEP', '04040-031', 'c2', uso=PROC, im='numeric', ac='postal-code')
        + campo('c-rl-end', 'Endereço (rua, número e complemento)', 'Rua Loefgren, 1.415', 'c4', uso=PROC)
        + campo('c-rl-bairro', 'Bairro', 'Vila Clementino', 'c2', uso=PROC)
        + campo('c-rl-cidade', 'Cidade', 'São Paulo', 'c2', uso=PROC)
        + selecao('c-rl-uf', 'UF', UFS, 'SP', 'c2', PROC)
        + f'<div class="rl-sub"><h4>O termo de curatela</h4><small>Vai na qualificação e junto com a procuração</small></div>'
        + f'<fieldset class="rl-termo" aria-describedby="c-modo-aj"><legend>O que diz o termo</legend><div class="rl-ops2">'
        + opr('c-modo', 'rep', 'A curadora assina sozinha', 'Representa. É o mais comum.', True)
        + opr('c-modo', 'ass', 'Os dois assinam', 'Assiste. Quando o termo pede que ele assine junto.', False)
        + f'</div><p class="ajuda" id="c-modo-aj">Está na sentença ou no termo, nos limites da curatela.</p></fieldset>'
        + campo('c-proc', 'Número do processo da curatela', PROC_CUR, 'c3', uso=PROC, opc=True, im='numeric')
        + campo('c-vara', 'Vara e comarca', VARA_CUR, 'c6', uso=PROC, opc=True)
        + f'<div class="c6">{arq}</div>'
    )
    h = '' if aberto else ' hidden'
    return f'<div class="rl-painel" data-cap="curatela" role="group" aria-label="Sob curatela: quem assina e o termo"{h}>{corpo}</div>'


def qualif_menor(v, aberto, pre='q', adolescente=False):
    pr = v['primeiro']
    extra = ''
    if adolescente:
        extra = (selecao(f'{pre}-civil', 'Estado civil', EST_CIVIL, v.get('civil', ''), 'c2', PROC, opc=True)
                 + campo(f'{pre}-prof', 'Profissão', v.get('prof', ''), 'c2', uso=PROC, opc=True, ajuda='Ex.: estudante'))
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Só o que vai para a procuração e o contrato.</b> '
        + ('Para quem tem menos de 16 anos, estado civil e profissão não vão no documento, e o RG é opcional. ' if not adolescente else
           'Para quem tem 16 ou 17 anos, estado civil, profissão e RG são opcionais. ')
        + 'Quem guarda e responde por estes dados é o escritório (LGPD).</span></div>'
        + selecao(f'{pre}-nac', 'Nacionalidade', ['Brasileira', 'Outra'], v.get('nac', ''), 'c2', PROC)
        + extra
        + campo(f'{pre}-rg', 'RG', v.get('rg', ''), 'c2', uso=PROC, opc=True, im='numeric')
        + (campo(f'{pre}-rg-org', 'Órgão emissor e UF', v.get('rgorg', ''), 'c2', opc=True, ajuda='Ex.: SSP/SP') if adolescente else '')
        + campo(f'{pre}-cep', 'CEP', v.get('cep', ''), 'c2', uso=PROC, im='numeric', ac='postal-code', ajuda='Preenche rua, bairro e cidade.')
        + campo(f'{pre}-end', 'Endereço (rua, número e complemento)', v.get('end', ''), 'c4', uso=PROC, ac='street-address')
        + campo(f'{pre}-bairro', 'Bairro', v.get('bairro', ''), 'c2', uso=PROC)
        + campo(f'{pre}-cidade', 'Cidade', v.get('cidade', ''), 'c2', uso=PROC, ac='address-level2')
        + selecao(f'{pre}-uf', 'UF', UFS, v.get('uf', ''), 'c2', PROC)
    )
    sub = (f'Nacionalidade, RG e endereço de {pr}. Pode completar depois.' if not adolescente else
           f'Nacionalidade, estado civil, profissão, RG e endereço de {pr}. Pode completar depois.')
    return qualif_box(corpo, 'Qualificação para procuração e contrato', sub, aberto)


V_PEDRO = dict(primeiro='Pedro', nasc='14/03/2014', idade=12, n16='14/03/2030', n18='14/03/2032', papel='Mãe', rl='Joana Alves Souza', rlcpf=CPF_JOANA,
               rlrg='41.552.318-7', rlrgo='SSP/SP', rlnac='Brasileira', rlcivil='Divorciado(a)', rlprof='Auxiliar administrativa',
               nac='Brasileira', cep='03017-000', end='Rua Bresser, 845, apto. 12', bairro='Brás', cidade='São Paulo', uf='SP')
V_LUCAS = dict(primeiro='Lucas', nasc='03/02/2010', idade=16, n16='03/02/2026', n18='03/02/2028', papel='Pai', rl='Marcos Ferreira Moura', rlcpf=CPF_MARCOS,
               rlrg='27.904.118-3', rlrgo='SSP/SP', rlnac='Brasileira', rlcivil='Casado(a)', rlprof='Eletricista',
               nac='Brasileira', civil='Solteiro(a)', prof='Estudante', rg='58.310.442-9', rgorg='SSP/SP', cep='03057-000', end='Rua Cajuru, 312',
               bairro='Belenzinho', cidade='São Paulo', uf='SP')
V_SEB = dict(primeiro='Sebastião', papel='Curadora', rl='Helena Ramos Castro', rlcpf=CPF_HELENA, rlrg='22.618.405-1', rlrgo='SSP/SP', rlnac='Brasileira',
             rlcivil='Casado(a)', rlprof='Professora', termo=True)
V_VAZIO = dict(primeiro='ele', papel='', rl='', rlcpf='', rlrg='', rlrgo='', rlnac='', rlcivil='', rlprof='')

EXPLICA_RL = (f'<section class="explica campo-ambar" aria-labelledby="t-exr"><p class="sobretitulo">Quem assina</p><h2 id="t-exr">A lei diz quem assina. O T3jus faz a conta.</h2><ul>'
              f'<li>{ico("pessoas")}<span><b>Até 15 anos:</b> representado. Só o pai, a mãe ou o tutor assina, em nome dele.</span></li>'
              f'<li>{ico("pena")}<span><b>16 e 17 anos:</b> assistido. Ele e quem responde por ele assinam juntos.</span></li>'
              f'<li>{ico("balanca")}<span><b>Sob curatela:</b> assina o curador, como diz o termo, e o termo vai junto com a procuração.</span></li>'
              f'<li>{ico("relogio")}<span>A conta é feita pela data de nascimento, no dia de gerar cada documento. Aos 18 anos, a ficha avisa.</span></li>'
              f'<li>{ico("escudo")}<span>A data de nascimento só é pedida de quem é menor, e só para isso (LGPD).</span></li>'
              '</ul></section>')


def form_cliente(nome, tel, mail, doc, cap, vm=None, vc=None, qual='', erros=False, origem=True, botao='Cadastrar cliente', titulo='Dados do cliente',
                 sub='Comece pelo nome e um contato. A qualificação pode ficar para quando for fazer a procuração.', topo='', pe_txt=None, foco_erro=False, ok_doc=True):
    vm = vm or dict(V_VAZIO)
    vc = vc or dict(V_VAZIO)
    r = topo
    if erros:
        r += ('<div class="c6">' + aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.',
                                       '<a href="#m-nasc">Data de nascimento de Pedro</a> · <a href="#m-rl-nome">Nome de quem assina por Pedro</a> · '
                                       '<a href="#m-rl-cpf">CPF de quem assina</a>. O cliente ainda não foi cadastrado. O que você escreveu continua aqui.') + '</div>')
    r += tipo_radios('PF')
    r += f'<div class="cl-sec cl-primeira"><h3>Para começar</h3><small>Só isto é obrigatório</small></div>'
    r += campo('n-nome', 'Nome completo', nome, 'c6', uso=PROC, foco=not erros, ajuda='Como está no documento. Vai na procuração e no contrato.')
    r += campo('n-tel', 'Telefone ou WhatsApp', tel, 'c3', tipo='tel', im='tel',
               ajuda='Para falar com o cliente. Se ele não tem, use o de quem responde por ele.' if cap != 'plena' else 'Para falar com o cliente.')
    r += campo('n-email', 'E-mail', mail, 'c3', tipo='email', opc=True, ajuda='Para falar com o cliente.')
    r += campo('n-doc', 'CPF', doc, 'c3', uso=PROC, opc=True, im='numeric', ajuda='Conferimos os dígitos e avisamos se já houver cliente com este CPF.',
               depois=f'<p class="cl-ok">{ico("check")}Dígitos conferidos</p>' if (doc and ok_doc) else '')
    r += capacidade_fs(cap)
    r += painel_menor(vm, cap == 'menor', erros=erros)
    r += painel_curatela(vc, cap == 'curatela')
    if origem:
        r += f'<div class="cl-sec"><h3>Como chegou ao escritório</h3><small>Origem do contato · área Comercial</small></div>'
        r += selecao('n-origem', 'Origem', ORIGENS, 'Indicação de cliente', 'c3', opc=True, ajuda='Para saber de onde vêm os clientes. Não vai em documento.')
        r += campo('n-indicou', 'Quem indicou', '', 'c3', opc=True, ajuda='Só para indicação.')
    r += qual
    pe_txt = pe_txt or 'Os campos sem “(opcional)” são obrigatórios. Para menor, também a data de nascimento e o nome de quem assina; para curatela, o nome do curador. O cadastro fica no histórico do escritório.'
    r += (f'<div class="form-pe"><span class="esq-pe">{pe_txt}</span>'
          f'<a class="btn btn-fantasma" href="#">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}{botao}</button></div>')
    return (f'<section class="folha" aria-labelledby="t-novo"><div class="folha-cab"><div><h2 id="t-novo">{titulo}</h2>'
            f'<p class="sub">{sub}</p></div></div><form class="form-folha" action="#" novalidate>{r}</form></section>')


def pagina_nova(form_html, lateral=EXPLICA_RL):
    return cab_novo() + f'<div class="cl-grade"><div class="cl-col">{form_html}</div><aside class="cl-col" aria-label="Quem assina pelo cliente">{lateral}</aside></div>'


# ---------------------------------------------------------------- ficha em leitura
def cab_cli(c, dir_html, selo_html):
    h = ficha_cab(c, dir_html)
    return h.replace('<span>cliente desde', selo_html + '<span>cliente desde', 1)


def selo_menor(txt):
    return f'<span class="selo selo-atencao">{ico("pessoas")}{txt}</span>'


def folha(id_, titulo, sub, corpo, acoes='', peq=False):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    st = ' style="font-size:20px"' if peq else ''
    pb = ' style="padding-bottom:8px"' if peq else ''
    return f'<section class="folha" aria-labelledby="{id_}"><div class="folha-cab"{pb}><div><h2 id="{id_}"{st}>{titulo}</h2>{s}</div>{a}</div>{corpo}</section>'


def b_editar(est='editar', rot='Editar'):
    return f'<a class="btn btn-sec" href="{U}{est}">{ico("lapis")}{rot}</a>'


CONF = f'<span class="selo selo-ok">{ico("check")}Dígitos conferidos</span>'
FALTA_DD = f'<dd class="falta cl-falta-dd">Falta<span class="selo selo-atencao">{ico("pena")}pede para a procuração</span></dd>'


def dl(itens):
    out = ''
    for k, v, *inteira in itens:
        cls = ' class="inteira"' if inteira and inteira[0] else ''
        out += f'<div{cls}><dt>{k}</dt>{v if v.startswith("<dd") else "<dd>" + v + "</dd>"}</div>'
    return f'<dl class="dados-ficha">{out}</dl>'


def dados_pedro():
    return folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Pedro Henrique Alves Souza', True),
        ('CPF', f'<span class="num">{CPF_PEDRO}</span>{CONF}'),
        ('Data de nascimento', '14/03/2014 · 12 anos'),
        ('Nacionalidade', 'Brasileira'),
        ('RG', '<dd class="falta">Não tem · opcional para menor</dd>'),
        ('Endereço', 'Rua Bresser, 845, apto. 12, Brás, São Paulo, SP · CEP 03017-000', True),
    ]), acoes=b_editar())


def quem_pedro(falta=False):
    cpf_ = FALTA_DD if falta else f'<dd><span class="num">{CPF_JOANA}</span>{CONF}</dd>'
    rg_ = FALTA_DD if falta else '41.552.318-7 · SSP/SP'
    topo = (f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">JA</span><div><strong>Joana Alves Souza</strong>'
            f'<small>Mãe · assina por Pedro</small><span class="selo selo-implant">Representa · Pedro tem menos de 16 anos</span></div></div>')
    corpo = topo + dl([
        ('CPF', cpf_), ('RG', rg_), ('Nacionalidade', 'Brasileira'), ('Estado civil', 'Divorciada'),
        ('Profissão', 'Auxiliar administrativa'), ('Endereço', 'O mesmo de Pedro (moram juntos)'),
    ]) + (f'<p class="rl-regra">{ico("relogio")}<span>Em <b>14/03/2030</b>, aos 16 anos, Pedro passa a ser assistido: ele e Joana assinam juntos. '
          f'O T3jus muda sozinho, nos documentos gerados a partir dessa data.</span></p>')
    return folha('t-quem', 'Quem assina por Pedro', 'Responsável legal. Vai na procuração e no contrato, e assina por ele.', corpo,
                 acoes=b_editar('editar', 'Mudar').replace('<a ', '<a aria-label="Mudar quem assina por Pedro" ', 1))


def contatos_pedro():
    return (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">1 contato</p></div>'
            f'<div class="acoes"><a class="btn btn-sec" href="{U}editar">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
            f'<li class="contato"><div><strong>Joana Alves Souza</strong><small class="cl-papel">Mãe · quem assina por Pedro</small></div>'
            f'<a href="tel:+5511984723316">{ico("whats")}<span class="num">(11) 98472-3316</span></a><a href="mailto:joana.souza@exemplo.com.br">{ico("envelope")}joana.souza@exemplo.com.br</a></li>'
            f'</ul></section>')


def proc_lista(titulo, num, total, itens, rodape, botao=True):
    li = ''.join(f'<li>{ico("check")}<span>{n}<span class="sr">: preenchido</span></span></li>' if ok
                 else f'<li class="cl-falta">{ico("alerta")}<span><b>{n}</b>: falta</span></li>' for n, ok in itens)
    b = f'<a class="btn btn-sec" href="{U}editar">{ico("lapis")}Completar qualificação</a>' if botao else ''
    return (f'<section class="folha" aria-labelledby="t-proc2"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-proc2" style="font-size:20px">{titulo}</h2></div></div>'
            f'<div class="cl-proc-num"><strong>{num} de {total}</strong><span>dados prontos</span></div><ul class="cl-proc">{li}</ul>'
            f'<div class="cl-folha-acao"><p>{rodape}</p>{b}</div></section>')


def tempo_pedro():
    li = (f'<li class="rl-agora"><span class="rl-pt" aria-hidden="true"></span><div><span class="rl-quando">Hoje até 13/03/2030</span><b>Representado</b><small>Só Joana assina, em nome de Pedro.</small></div></li>'
          f'<li><span class="rl-pt" aria-hidden="true"></span><div><span class="rl-quando">De 14/03/2030, aos 16 anos</span><b>Assistido</b><small>Pedro e Joana assinam juntos.</small></div></li>'
          f'<li><span class="rl-pt" aria-hidden="true"></span><div><span class="rl-quando">De 14/03/2032, aos 18 anos</span><b>Assina por si</b><small>A ficha avisa, e Joana sai dos documentos novos.</small></div></li>')
    return folha('t-tempo', 'Quem assina, ao longo do tempo', '', f'<ol class="rl-tempo" aria-label="Quem assina por Pedro, por idade">{li}</ol>', peq=True)


DIR_PEDRO = dir_passo('Gerar os documentos', '<b>C-2026-034 em elaboração desde 20/11.</b><br>Joana assina por Pedro a procuração e o contrato.',
                      f'<a class="btn btn-pri" href="{U}gerar-representado">{ico("doc")}Gerar documentos</a>', 2,
                      contato=('25/11', 'quarta', 'Diego Almeida', 'futuro'))
N_PEDRO = dict(atendimentos=2, propostas=1, contratos=1, casos=0)


def ficha_pedro():
    cab = cab_cli(PEDRO, DIR_PEDRO, selo_menor('Menor · assina a mãe'))
    lat = (proc_lista('Para gerar a procuração', 10, 10,
                      [('Nome, CPF e nascimento de Pedro', 1), ('Nacionalidade e endereço', 1), ('Quem assina: Joana, mãe', 1), ('CPF e RG de Joana', 1),
                       ('Estado civil e profissão de Joana', 1)],
                      'Tudo pronto. Para quem tem menos de 16 anos, estado civil, profissão e RG dele não vão no documento.', botao=False)
           + tempo_pedro() + origem_ant().replace('Rosa Almeida', 'Antônia Ferreira Prado').replace('27/10/2026, por telefone', '19/11/2026, pelo WhatsApp')
           .replace('Paula Nunes', 'Diego Almeida') + situacao_folha().replace('27/10/2026', '19/11/2026'))
    return f'<div class="cl">{cab}{abas_fl(N_PEDRO, estado_base="ficha-menor")}{grade_ficha(dados_pedro() + quem_pedro() + contatos_pedro(), lat)}</div>'


DIR_SEB = dir_passo('Gerar os documentos', '<b>C-2026-037 em elaboração desde 21/11.</b><br>Helena, a curadora, assina por Sebastião.',
                    f'<a class="btn btn-pri" href="{U}gerar-curatela">{ico("doc")}Gerar documentos</a>', 2,
                    contato=('24/11', 'terça', 'Diego Almeida', 'futuro'))


def ficha_seb():
    cab = cab_cli(SEB, DIR_SEB, selo_menor('Sob curatela · assina a curadora'))
    dados = folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Sebastião Ramos Filho', True),
        ('CPF', f'<span class="num">{CPF_SEB}</span>{CONF}'), ('RG', '6.214.873-0 · SSP/SP'),
        ('Nacionalidade', 'Brasileira'), ('Estado civil', 'Viúvo'), ('Profissão', 'Aposentado'),
        ('Endereço', 'Rua Domingos de Morais, 2.180, apto. 51, Vila Mariana, São Paulo, SP · CEP 04036-000', True),
    ]), acoes=b_editar('novo-curatela'))
    topo = (f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">HR</span><div><strong>Helena Ramos Castro</strong>'
            f'<small>Curadora · assina por Sebastião</small><span class="selo selo-implant">Representa · como diz o termo</span></div></div>')
    termo = (f'<div style="padding:0 24px 18px"><div class="rl-arq rl-tem" role="group" aria-labelledby="f-termo"><span class="rl-ic" aria-hidden="true">{ico("doc")}</span>'
             f'<div><strong id="f-termo">Termo de curatela</strong><small>termo-curatela-sebastiao.pdf · 2 páginas · enviado por Paula Nunes em 05/11</small></div>'
             f'<a class="btn btn-sec btn-compacto" href="#">{ico("baixar", "ico ico-s")}Baixar o termo</a></div></div>')
    quem = folha('t-quem', 'Quem assina por Sebastião', 'Curadora nomeada pelo juiz. Vai na procuração e no contrato, e assina por ele.',
                 topo + dl([('CPF', f'<span class="num">{CPF_HELENA}</span>{CONF}'), ('RG', '22.618.405-1 · SSP/SP'), ('Nacionalidade', 'Brasileira'),
                            ('Estado civil', 'Casada'), ('Profissão', 'Professora'),
                            ('Endereço', 'Rua Loefgren, 1.415, Vila Clementino, São Paulo, SP · CEP 04040-031', True),
                            ('Processo da curatela', f'<span class="num">{PROC_CUR}</span>'), ('Vara', VARA_CUR)]) + termo,
                 acoes=b_editar('novo-curatela', 'Mudar').replace('<a ', '<a aria-label="Mudar quem assina por Sebastião" ', 1))
    cts = (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">1 contato</p></div>'
           f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
           f'<li class="contato"><div><strong>Helena Ramos Castro</strong><small class="cl-papel">Filha e curadora</small></div>'
           f'<a href="tel:+5511991827364">{ico("whats")}<span class="num">(11) 99182-7364</span></a><a href="mailto:helena.castro@exemplo.com.br">{ico("envelope")}helena.castro@exemplo.com.br</a></li></ul></section>')
    lat = (proc_lista('Para gerar a procuração', 12, 12,
                      [('Qualificação de Sebastião', 1), ('Quem assina: Helena, curadora', 1), ('CPF, RG, estado civil e profissão de Helena', 1),
                       ('Endereço de Helena', 1), ('Processo e vara da curatela', 1)],
                      'Tudo pronto. Ao gerar, lembre de juntar o termo de curatela à procuração.', botao=False)
           + situacao_folha().replace('27/10/2026', '05/11/2026'))
    return f'<div class="cl">{cab}{abas_fl(N_PEDRO, estado_base="ficha-curatela")}{grade_ficha(dados + quem + cts, lat)}</div>'


DIR_RAFA = dir_passo('Torres x Viação Leste', '<b>Instrução, 4 de 8 · com Larissa Costa.</b><br>Próximo prazo em 02/12.',
                     f'<a class="btn btn-pri" href="#">{ico("balanca")}Ver o caso</a>', 4, contato=None, sobre='Caso em andamento', grande_px=26)


def faixa_18():
    return ('<div class="aviso aviso-atencao rl-faixa" role="status">' + ico('pessoas')
            + '<div><strong class="aviso-titulo">Rafaela fez 18 anos em 19/11/2026. Agora ela assina por si.</strong>'
            '<p>Nos documentos gerados de hoje em diante, ela assina sozinha e a avó, Cleusa, sai. Para isso, a ficha precisa do estado civil e da profissão de Rafaela, '
            'que não eram pedidos. O contrato e a procuração que as duas assinaram continuam guardados. No caso em andamento, '
            'o costume é colher uma procuração nova, assinada só por ela.</p>'
            f'<div class="aviso-acoes"><button class="btn btn-pri" type="button" data-janela="janela-18">{ico("check")}Atualizar a ficha de Rafaela</button>'
            f'<a class="btn btn-sec" href="{U}gerar-fez-18">{ico("doc")}Gerar procuração nova</a></div></div></div>')


def ficha_rafa(janela_aberta=False):
    cab = cab_cli(RAFA, DIR_RAFA, selo_menor('Fez 18 anos em 19/11'))
    dados = folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Rafaela Nunes Torres', True),
        ('CPF', f'<span class="num">{CPF_RAFA}</span>{CONF}'), ('Data de nascimento', '19/11/2008 · 18 anos desde 19/11'),
        ('RG', '52.884.106-2 · SSP/SP'), ('Nacionalidade', 'Brasileira'),
        ('Estado civil', FALTA_DD), ('Profissão', FALTA_DD),
        ('Endereço', 'Rua Itaqueri, 1.020, Mooca, São Paulo, SP · CEP 03187-000', True),
    ]), acoes=b_editar('fez-18-janela'))
    antes = folha('t-antes', 'Quem assinava com Rafaela', 'Até 18/11/2026. Fica guardado, mas não entra nos documentos novos.',
                  f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">CN</span><div><strong>Cleusa Nunes Torres</strong>'
                  f'<small>Avó e tutora · assistiu Rafaela dos 16 aos 17 anos</small><span class="selo selo-neutro">Até 18/11/2026</span></div></div>'
                  + dl([('CPF', f'<span class="num">{CPF_CLEUSA}</span>'), ('Assinou com ela', 'Contrato C-2026-022 e a procuração, em 08/07/2026')]).replace('class="dados-ficha"', 'class="dados-ficha rl-antes"'))
    lat = (proc_lista('Para gerar a procuração', 5, 7,
                      [('Nome completo', 1), ('CPF', 1), ('RG', 1), ('Nacionalidade', 1), ('Endereço', 1), ('Estado civil', 0), ('Profissão', 0)],
                      'Agora Rafaela assina por si: estado civil e profissão passam a ir no documento.')
           .replace(f'href="{U}editar"', 'href="#" data-janela="janela-18"')
           + resumo('P-2026-008 · virou contrato', 'C-2026-022 · ativo desde 08/07', 'Torres x Viação Leste · Instrução').replace('Antônia', 'Rafaela'))
    return (f'<div class="cl">{cab}{abas_fl(dict(atendimentos=6, propostas=1, contratos=1, casos=1), estado_base="ficha-fez-18")}{faixa_18()}'
            f'{grade_ficha(dados + antes, lat)}</div>' + j_18(janela_aberta))


def j_18(abrir=False):
    corpo = (f'<p class="pt-comuns">{ico("historico")}<span>Cleusa sai de “Quem assina” e fica no histórico da ficha, com a data. Nada é apagado. '
             f'Os documentos gerados antes continuam como estavam.</span></p>'
             + '<div class="cl-dois">' + selecao('j18-civil', 'Estado civil de Rafaela', EST_CIVIL, '', 'c3').replace('<select ', '<select data-foco ', 1) + campo('j18-prof', 'Profissão', '', 'c3', ajuda='Ex.: estudante, atendente') + '</div>'
             + f'<p class="ajuda">Se Rafaela não pode assinar sozinha por outro motivo (curatela), não salve aqui: <a href="{U}novo-curatela">marque “Está sob curatela” na ficha</a>.</p>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Agora não</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar: Rafaela assina por si</button>')
    return janela('janela-18', 'Rafaela Nunes Torres', 'Rafaela agora assina por si',
                  'Ela fez 18 anos em 19/11/2026. Complete o que passa a ir no documento.', corpo, pe, abrir=abrir)


# ---------------------------------------------------------------- editar Pedro (vindo de Gerar documentos)
def editar_pedro():
    topo = ('<div class="c6">' + aviso('info', 'Você veio de Gerar documentos.', 'Ao salvar, volta para lá, com a prévia já com os dados novos.', icone='seta') + '</div>')
    vm = dict(V_PEDRO)
    r = topo
    r += campo('e-nome', 'Nome completo', 'Pedro Henrique Alves Souza', 'c4', uso=PROC, foco=True)
    r += campo('e-doc', 'CPF', CPF_PEDRO, 'c2', uso=PROC, im='numeric', ajuda='Dígitos conferidos.')
    r += campo('e-email', 'E-mail', '', 'c3', tipo='email', opc=True, ajuda='Para falar com o cliente.')
    r += selecao('e-origem', 'Origem', ORIGENS, 'Indicação de cliente', 'c3', opc=True, ajuda='Não vai em documento.')
    r += capacidade_fs('menor')
    r += painel_menor(vm, True, mudou=('rlrg',))
    r += painel_curatela(dict(V_VAZIO, primeiro='Pedro'), False)
    r += qualif_menor(vm, False, pre='eq')
    r += ('<fieldset class="contatos-edit"><legend>Contatos<small>Até 10. Cada um precisa de telefone ou e-mail. O principal é quem o escritório procura primeiro.</small></legend>'
          + contato_edit(1, 'Joana Alves Souza', 'Mãe · quem assina por Pedro', '(11) 98472-3316', 'joana.souza@exemplo.com.br', True)
          + f'<div><button class="btn btn-fantasma" type="button">{ico("mais")}Adicionar contato</button></div></fieldset>')
    r += (f'<div class="form-pe"><span class="esq-pe">Cada mudança vai para o histórico do escritório, com seu nome e os campos alterados.</span>'
          f'<a class="btn btn-fantasma" href="{U}gerar-falta">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Salvar e voltar</button></div>')
    f_ = (f'<section class="folha" aria-labelledby="t-editar"><div class="folha-cab"><div><h2 id="t-editar">Editar ficha</h2>'
          f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><form class="form-folha" action="#" novalidate>{r}</form></section>')
    d = DIR_PEDRO.replace(f'<a class="btn btn-pri" href="{U}gerar-representado">{ico("doc")}Gerar documentos</a>', '')
    cab = cab_cli(PEDRO, d, selo_menor('Menor · assina a mãe'))
    return f'<div class="cl">{cab}{abas_fl(N_PEDRO, estado_base="ficha-menor")}{grade_ficha(f_, EXPLICA_EDIT)}</div>'


# ---------------------------------------------------------------- textos dos documentos (marcados como na prévia aprovada)
def qual_pedro(falta=False):
    cpf_j = FALTA('CPF DE QUEM ASSINA') if falta else f'<{C}>inscrita no CPF sob o nº {CPF_JOANA}</mark>'
    rg_j = FALTA('RG DE QUEM ASSINA') if falta else f'<{C}>portadora do RG nº 41.552.318-7 SSP/SP</mark>'
    return (f'<{C}>PEDRO HENRIQUE ALVES SOUZA</mark>, <{C}>brasileiro, menor impúbere, nascido em 14/03/2014, inscrito no CPF sob o nº {CPF_PEDRO}</mark>, '
            f'neste ato representado por sua <{C}>mãe</mark>, <{C}>JOANA ALVES SOUZA, brasileira, divorciada, auxiliar administrativa</mark>, {rg_j}, {cpf_j}, '
            f'ambos residentes na <{C}>{END_PEDRO}</mark>')


def qual_lucas():
    return (f'<{C}>LUCAS FERREIRA MOURA</mark>, <{C}>brasileiro, solteiro, estudante, menor púbere, nascido em 03/02/2010, portador do RG nº 58.310.442-9 SSP/SP, '
            f'inscrito no CPF sob o nº {CPF_LUCAS}</mark>, neste ato assistido por seu <{C}>pai</mark>, <{C}>MARCOS FERREIRA MOURA, brasileiro, casado, eletricista, '
            f'portador do RG nº 27.904.118-3 SSP/SP, inscrito no CPF sob o nº {CPF_MARCOS}</mark>, ambos residentes na <{C}>{END_LUCAS}</mark>')


def qual_seb():
    return (f'<{C}>SEBASTIÃO RAMOS FILHO</mark>, <{C}>brasileiro, viúvo, aposentado, portador do RG nº 6.214.873-0 SSP/SP, inscrito no CPF sob o nº {CPF_SEB}</mark>, '
            f'residente na <{C}>{END_SEB}</mark>, neste ato representado por sua <{C}>curadora</mark>, <{C}>HELENA RAMOS CASTRO, brasileira, casada, professora, '
            f'portadora do RG nº 22.618.405-1 SSP/SP, inscrita no CPF sob o nº {CPF_HELENA}</mark>, residente na <{C}>{END_HELENA}</mark>, '
            f'nomeada nos autos da ação de curatela nº <{C}>{PROC_CUR}</mark>, da <{C}>{VARA_CUR}</mark>, conforme termo de curatela anexo')


def qual_rafa():
    return (f'<{C}>RAFAELA NUNES TORRES</mark>, <{C}>brasileira</mark>, {FALTA("ESTADO CIVIL")}, {FALTA("PROFISSÃO")}, '
            f'portadora do <{C}>RG nº 52.884.106-2 SSP/SP</mark>, inscrita no CPF sob o nº <{C}>{CPF_RAFA}</mark>, residente na <{C}>{END_RAFA}</mark>')


FIO = '<span class="rl-fio" aria-hidden="true"></span>'


def ass(*linhas, falta=None):
    """Bloco de assinatura na prévia: o fio (no .docx, a linha de sublinhados) e os nomes marcados como dado do cadastro."""
    f = ('<br>' + FALTA(falta)) if falta else ''
    return f'{FIO}<{C}>' + '<br>'.join(linhas) + f'</mark>{f}'


ASS_PEDRO = ass('PEDRO HENRIQUE ALVES SOUZA', 'representado por sua mãe, JOANA ALVES SOUZA', f'CPF {CPF_JOANA}')
ASS_PEDRO_F = ass('PEDRO HENRIQUE ALVES SOUZA', 'representado por sua mãe, JOANA ALVES SOUZA', falta='CPF DE QUEM ASSINA')
ASS_SEB = ass('SEBASTIÃO RAMOS FILHO', 'representado por sua curadora, HELENA RAMOS CASTRO', f'CPF {CPF_HELENA}')
ASS_RAFA = ass('RAFAELA NUNES TORRES', f'CPF {CPF_RAFA}')
# Assistido: duas linhas de assinatura, lado a lado (no celular e na coluna estreita, uma embaixo da outra)
ASS_LUCAS = ('<span class="rl-assina"><span>' + ass('LUCAS FERREIRA MOURA', f'CPF {CPF_LUCAS}') + '</span><span>'
             + ass('MARCOS FERREIRA MOURA', 'pai, que o assiste', f'CPF {CPF_MARCOS}') + '</span></span>')
ASSX = 'ASSINATURA-DO-CLIENTE'


def com_ass(papel, a):
    return papel.replace(f'<{C}>{ASSX}</mark>', a)


def papel_contrato_min(num, qual, assina, nota='Continua com a contratada, as condições e as cláusulas do escritório (v2).'):
    return (f'<div class="pe-papel">{P["timbre"]()}<h3>CONTRATO DE HONORÁRIOS</h3><p style="text-align:center;margin-top:-8px">nº <{C}>{num}</mark></p>'
            f'<p><b>CONTRATANTE:</b> {qual}.</p><p class="pe-mais">{ico("doc")}<span>{nota}</span></p>'
            f'<p><{F}>{P["CIDADE_DATA"]}</mark>.</p><p class="pe-ass">{assina}</p></div>')


# ---------------------------------------------------------------- Gerar documentos (página aprovada de Procurações, com o quadro de quem assina)
def quadro(primeiro, ini, nome, linha, acao=True, falta=False, dois=None):
    b = (f'<a class="btn btn-sec btn-compacto" href="{U}editar">{ico("lapis", "ico ico-s")}Mudar na ficha</a>' if acao else '')
    cls = ' rl-falta' if falta else ''
    extra = ''
    if dois:
        extra = f'<small class="rl-linha">{dois}</small>'
    return (f'<div class="c6"><p style="font-weight:500;margin-bottom:6px" id="gd-rep-r">Quem assina por {primeiro}</p><div class="pr-rep{cls}" role="group" aria-labelledby="gd-rep-r">'
            f'<span class="pe-ci" aria-hidden="true">{ico("pessoas")}</span><div><b>{nome}</b><small>{linha}</small>{extra}</div>{b}</div></div>')


ADV_PS = [('Marina Ribeiro', 'Responsável pelo contrato', True, None), ('Larissa Costa', 'Advogada no contrato', True, None), ('Felipe Matos', 'Não está no contrato', False, None)]
POD_PS = ['Receber e dar quitação', 'Firmar acordo (transigir)', 'Substabelecer']


def gerar_representado(falta=False):
    if falta:
        q = quadro('Pedro', 'JA', 'Joana Alves Souza', 'Mãe · da ficha do cliente', falta=True,
                   dois='Faltam o CPF e o RG dela')
        av = ('<div class="c6">' + aviso('atencao', 'Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana.',
                                         'Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. '
                                         'Ou complete a ficha antes: ao salvar, você volta para cá.', icone='pena',
                                         acoes=f'<a class="btn btn-sec" href="{U}editar">{ico("lapis")}Completar na ficha</a>') + '</div>')
    else:
        q = quadro('Pedro', 'JA', 'Joana Alves Souza', f'Mãe · CPF {CPF_JOANA} · da ficha do cliente')
        av = ('<div class="c6">' + aviso('info', 'Pedro tem 12 anos hoje: ele é representado.',
                                         'Só Joana assina, em nome dele, os três documentos. Em 14/03/2030, aos 16 anos, ele passa a ser assistido, e os dois assinam. '
                                         'O T3jus faz a conta pela data de nascimento, no dia de gerar.', icone='pessoas') + '</div>')
    r = (P['contrato_card']('PS', 'Pedro Henrique Alves Souza', 'C-2026-034 · Alimentos · em elaboração')
         + q + av + P['documentos_fs'](contrato_sub='Contratante: Pedro, representado por Joana. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.')
         + P['outorgados_fs'](ADV_PS) + P['poderes_fs'](POD_PS) + P['data_campo']())
    a = ASS_PEDRO_F if falta else ASS_PEDRO
    nf = 2 if falta else 0
    pain = [
        ('c', 'Contrato', nf, papel_contrato_min('C-2026-034', qual_pedro(falta), a)),
        ('p', 'Procuração', nf, com_ass(P['papel_procuracao'](qual_pedro(falta), ['Marina Ribeiro', 'Larissa Costa'], POD_PS, assina=ASSX), a)),
        ('d', 'Declaração', nf, com_ass(P['papel_declaracao'](qual_pedro(falta), assina=ASSX), a)),
    ]
    if falta:
        pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.',
                           '2 dados saem marcados em cada um: o CPF e o RG de Joana. Cada geração fica registrada, com quem gerou e quando.', 'Gerar 3 documentos')
    else:
        pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', 'Nenhum dado faltando. Em todos, Joana assina por Pedro.', 'Gerar 3 documentos')
    return P['pagina_gerar'](r, P['previa'](pain, 'p'), pe)


def gerar_assistido():
    q = quadro('Lucas', 'MF', 'Lucas e Marcos Ferreira Moura', f'Lucas assina, assistido pelo pai, Marcos · CPF {CPF_MARCOS} · da ficha do cliente')
    av = ('<div class="c6">' + aviso('info', 'Lucas tem 16 anos hoje: ele é assistido.',
                                     'Os dois assinam os três documentos: Lucas e o pai, Marcos, que o assiste. Em 03/02/2028, aos 18 anos, Lucas passa a assinar sozinho.',
                                     icone='pessoas') + '</div>')
    r = (P['contrato_card']('LM', 'Lucas Ferreira Moura', 'C-2026-036 · Indenização por acidente de trânsito · em elaboração')
         + q + av + P['documentos_fs'](contrato_sub='Contratante: Lucas, assistido por Marcos. Com o objeto, a condição de honorário e as cláusulas do escritório.')
         + P['outorgados_fs']([('Felipe Matos', 'Responsável pelo contrato', True, None), ('Marina Ribeiro', 'Não está no contrato', False, None), ('Larissa Costa', 'Não está no contrato', False, None)])
         + P['poderes_fs'](['Receber e dar quitação', 'Firmar acordo (transigir)']) + P['data_campo']())
    pain = [
        ('c', 'Contrato', 0, papel_contrato_min('C-2026-036', qual_lucas(), ASS_LUCAS)),
        ('p', 'Procuração', 0, com_ass(P['papel_procuracao'](qual_lucas(), ['Felipe Matos'], ['Receber e dar quitação', 'Firmar acordo (transigir)'], assina=ASSX), ASS_LUCAS)),
        ('d', 'Declaração', 0, com_ass(P['papel_declaracao'](qual_lucas(), assina=ASSX), ASS_LUCAS)),
    ]
    pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', 'Nenhum dado faltando. Em todos, Lucas e Marcos assinam.', 'Gerar 3 documentos')
    return P['pagina_gerar'](r, P['previa'](pain, 'p'), pe)


def gerar_curatela():
    q = quadro('Sebastião', 'HR', 'Helena Ramos Castro', f'Curadora · CPF {CPF_HELENA} · da ficha do cliente', dois=f'Termo de curatela na ficha · processo {PROC_CUR}')
    av = ('<div class="c6">' + aviso('info', 'Sebastião está sob curatela: Helena assina por ele.',
                                     'Ela assina sozinha os três documentos, como diz o termo. A qualificação cita o processo da curatela. '
                                     'Junte uma cópia do termo à procuração: ele está na ficha, para baixar.', icone='balanca',
                                     acoes=f'<a class="btn btn-sec" href="#">{ico("baixar")}Baixar o termo</a>') + '</div>')
    r = (P['contrato_card']('SR', 'Sebastião Ramos Filho', 'C-2026-037 · Revisão da aposentadoria · em elaboração')
         + q + av + P['documentos_fs'](contrato_sub='Contratante: Sebastião, representado por Helena. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.')
         + P['outorgados_fs']([('Marina Ribeiro', 'Responsável pelo contrato', True, None), ('Felipe Matos', 'Não está no contrato', False, None), ('Larissa Costa', 'Não está no contrato', False, None)])
         + P['poderes_fs'](POD_PS, P['OUTRO_BEN']) + P['data_campo']())
    pain = [
        ('c', 'Contrato', 0, papel_contrato_min('C-2026-037', qual_seb(), ASS_SEB)),
        ('p', 'Procuração', 0, com_ass(P['papel_procuracao'](qual_seb(), ['Marina Ribeiro'], POD_PS, P['OUTRO_BEN'], assina=ASSX), ASS_SEB)),
        ('d', 'Declaração', 0, com_ass(P['papel_declaracao'](qual_seb(), assina=ASSX), ASS_SEB)),
    ]
    pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', 'Nenhum dado faltando. Em todos, Helena assina por Sebastião. Junte o termo de curatela à procuração.',
                       'Gerar 3 documentos')
    return P['pagina_gerar'](r, P['previa'](pain, 'p'), pe)


def gerar_fez_18():
    av = ('<div class="c6">' + aviso('atencao', 'Rafaela fez 18 anos em 19/11/2026: agora ela assina sozinha.',
                                     'A avó, Cleusa, que assinava com ela, não entra mais. Faltam 2 dados de Rafaela, que antes não iam no documento: o estado civil e a profissão. '
                                     'Dá para gerar assim: saem marcados, para completar no Word. Ou complete a ficha antes.', icone='pessoas',
                                     acoes=f'<a class="btn btn-sec" href="{U}fez-18-janela">{ico("lapis")}Completar na ficha</a>') + '</div>')
    r = (P['contrato_card']('RT', 'Rafaela Nunes Torres', 'C-2026-022 · Torres x Viação Leste · ativo desde 08/07/2026')
         + av + P['documentos_fs'](marcados=('p',), contrato_sub='Já assinado em 08/07/2026, por Rafaela e pela avó. Gere de novo só se o contrato mudou.')
         + P['outorgados_fs']([('Larissa Costa', 'Responsável pelo contrato', True, None), ('Marina Ribeiro', 'Advogada no contrato', True, None), ('Felipe Matos', 'Não está no contrato', False, None)])
         + P['poderes_fs'](POD_PS) + P['data_campo']())
    pain = [
        ('c', 'Contrato', None, ''),
        ('p', 'Procuração', 2, com_ass(P['papel_procuracao'](qual_rafa(), ['Larissa Costa', 'Marina Ribeiro'], POD_PS, assina=ASSX), ASS_RAFA)),
        ('d', 'Declaração', None, ''),
    ]
    pe = P['pe_gerar']('<b>Vai sair 1 arquivo .docx</b>: a procuração, assinada só por Rafaela.', '2 dados saem marcados: o estado civil e a profissão de Rafaela.', 'Gerar a procuração')
    return P['pagina_gerar'](r, P['previa'](pain, 'p'), pe)


# ---------------------------------------------------------------- página de referência: o texto nos três casos
def pagina_textos():
    def bloco(id_, titulo, sub, papel):
        return (f'<section class="folha" aria-labelledby="{id_}"><div class="rl-txt-cab"><h2 id="{id_}">{titulo}</h2><p>{sub}</p></div>'
                f'<div class="pr-painel"><div class="pe-papel-folha">{papel}</div></div></section>')
    proc = lambda q, quem, a, out=None: com_ass(P['papel_procuracao'](q, quem, POD_PS, assina=ASSX), a).replace('Modelo padrão do T3jus. O texto que não está marcado é do modelo e não muda.',
                                                                                               'O texto marcado vem da ficha; o resto é do modelo.')
    nota = (f'<p class="rl-txt-nota">{ico("ajuda")}<span><b>Página de referência, não é tela do sistema.</b> O texto que sai em [CLIENTE_QUALIFICACAO] e em [CLIENTE_ASSINATURA] '
            f'nos três casos, para a Carol e a advogada parceira revisarem. O contrato usa a mesma qualificação depois de “CONTRATANTE:” e o mesmo bloco de assinatura.</span></p>')
    g = ('<div class="rl-txt-grade">'
         + bloco('t-tx1', 'Até 15 anos: representado', 'Pedro, 12 anos. “Menor impúbere”; só a mãe assina. Os dois moram juntos: “ambos residentes”.',
                 proc(qual_pedro(), ['Marina Ribeiro', 'Larissa Costa'], ASS_PEDRO))
         + bloco('t-tx2', '16 e 17 anos: assistido', 'Lucas, 16 anos. “Menor púbere”; ele e o pai assinam, cada um na sua linha.',
                 proc(qual_lucas(), ['Felipe Matos'], ASS_LUCAS))
         + bloco('t-tx3', 'Sob curatela', 'Sebastião, 74 anos. A curadora assina, com o processo e a vara do termo. Endereços diferentes, cada um com o seu.',
                 proc(qual_seb(), ['Marina Ribeiro'], ASS_SEB))
         + '</div>')
    cab = P['cab_pr']('O que sai no documento', lede='A qualificação e a assinatura do cliente menor ou sob curatela, na procuração e no contrato.',
                      voltar=(f'{U}gerar-representado', 'Gerar documentos'), sobre='Procurações e modelos')
    return f'<div class="hn">{cab}{nota}{g}</div>'


# ---------------------------------------------------------------- estados
T = ''
ESTADOS = []


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


NV = dict(atual='clientes', trilha='Clientes|Novo cliente', titulo='Novo cliente')
FP = dict(atual='clientes', trilha='Clientes|Pedro Henrique Alves Souza', titulo='Pedro Henrique Alves Souza', aba='ficha')
GE = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar documentos', titulo='Gerar documentos')

Q_PEDRO = qualif_menor(V_PEDRO, True)
add('novo-menor', pagina_nova(form_cliente('Pedro Henrique Alves Souza', '(11) 98472-3316', '', CPF_PEDRO, 'menor', vm=V_PEDRO, qual=Q_PEDRO)),
    'Novo cliente menor (até 15 anos)', **NV)
add('novo-assistido', pagina_nova(form_cliente('Lucas Ferreira Moura', '(11) 97730-1846', '', CPF_LUCAS, 'menor', vm=V_LUCAS, qual=qualif_menor(V_LUCAS, True, adolescente=True))),
    'Novo cliente de 16 anos (assistido)', **NV)
add('novo-curatela', pagina_nova(form_cliente('Sebastião Ramos Filho', '(11) 99182-7364', '', CPF_SEB, 'curatela', vc=V_SEB,
                                             qual=qualif_pf(dict(nac='Brasileira', civil='Viúvo(a)', prof='Aposentado', rg='6.214.873-0', rgorg='SSP/SP', cep='04036-000',
                                                                 end='Rua Domingos de Morais, 2.180, apto. 51', bairro='Vila Mariana', cidade='São Paulo', uf='SP'), False,
                                                            resumo_falta='7 de 7 dados de Sebastião'))),
    'Novo cliente sob curatela', **NV)
add('novo-erros', pagina_nova(form_cliente('Pedro Henrique Alves Souza', '(11) 98472-3316', '', CPF_PEDRO, 'menor', vm=V_PEDRO, qual=qualif_menor(V_PEDRO, False), erros=True)),
    'Erros: falta a data, falta quem assina, CPF inválido', **NV)
add('editar', editar_pedro(), 'Editar: vindo de Gerar documentos', **FP)
add('ficha-menor', ficha_pedro() + j_registrar() + j_inativar(), 'Ficha: Pedro, representado pela mãe', **FP)
add('ficha-curatela', ficha_seb() + j_registrar() + j_inativar(), 'Ficha: Sebastião, sob curatela',
    atual='clientes', trilha='Clientes|Sebastião Ramos Filho', titulo='Sebastião Ramos Filho', aba='ficha')
FR = dict(atual='clientes', trilha='Clientes|Rafaela Nunes Torres', titulo='Rafaela Nunes Torres', aba='ficha')
add('ficha-fez-18', ficha_rafa(), 'Ficha: Rafaela fez 18 anos', **FR)
add('fez-18-janela', ficha_rafa(True), 'Janela: Rafaela agora assina por si', **FR)
add('gerar-representado', gerar_representado(), 'Gerar: representado (Pedro, 12)', **GE)
add('gerar-assistido', gerar_assistido(), 'Gerar: assistido (Lucas, 16)', **GE)
add('gerar-curatela', gerar_curatela(), 'Gerar: curatela (Sebastião)', **GE)
add('gerar-falta', gerar_representado(falta=True), 'Gerar: faltam o CPF e o RG de Joana', **GE)
add('gerar-fez-18', gerar_fez_18(), 'Gerar: Rafaela fez 18 anos', **GE)
add('textos', pagina_textos(), 'O texto nos três casos (referência)',
    area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|O que sai no documento', titulo='O que sai no documento')

GRUPOS = [('Ficha: cadastrar e editar', ['novo-menor', 'novo-assistido', 'novo-curatela', 'novo-erros', 'editar']),
          ('Ficha em leitura', ['ficha-menor', 'ficha-curatela', 'ficha-fez-18', 'fez-18-janela']),
          ('Gerar documentos', ['gerar-representado', 'gerar-assistido', 'gerar-curatela', 'gerar-falta', 'gerar-fez-18']),
          ('O texto', ['textos'])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

URL = {'Contratos': '../portal-comercial-contratos/contratos.html?estado=contratos', 'Honorários': '../portal-comercial-contratos/contratos.html?estado=honorarios',
       'Procurações e modelos': '../portal-procuracoes/procuracoes.html?estado=procuracoes'}
out = pagina('Quem assina pelo cliente', 'Clientes: quem assina pelo cliente menor ou sob curatela, na ficha, em Gerar documentos e no texto da procuração e do contrato.',
             '{"estado":"novo-menor","atual":"clientes"}', '', T, P['barras']('contratos', URL))
CSS_P = P['CSS_FICHA'] + P['CSS_HN'] + P['CSS'] + P['CSS_PE'] + P['CSS_PR']
out = out.replace('</style>', CSS_P + '\n' + CSS_CL + '\n' + CSS_FL + '\n' + CSS_RL + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', P['SCRIPT_ABAS'] + '\n' + SCRIPT_RL + '\n</body>', 1)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('responsavel-legal ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
