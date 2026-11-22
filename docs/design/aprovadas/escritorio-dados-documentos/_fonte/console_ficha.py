# Console › ficha do escritório: Editar ficha com os campos novos e, na aba Assinatura, o endereço de cobrança
# com "O mesmo endereço da sede". Copia SEM MUDANÇA a ficha aprovada (cobranca-pdfs/ficha.html), troca o escritório
# de exemplo (Cedro & Lima) pelo Santana e acrescenta dois estados: ficha:dd-editar e assinatura:dd-mesmo.
# Uso: python3 console_ficha.py <pasta-saida>
import sys, re, os
from esc_elenco import *
from oab import UFS

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
APROV = os.environ.get('APROV', '/home/claude/t3jus/docs/design/aprovadas/')
s = open(APROV + 'cobranca-pdfs/ficha.html', encoding='utf-8').read()
E = SANTANA
H = html.escape


def ico(n, c='ico'):
    return f'<svg class="{c}" aria-hidden="true"><use href="#i-{n}"/></svg>'


def campo(id_, rot, valor='', cls='c3', opc=False, ajuda='', ac='off', im='', tipo='text'):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    a = f' aria-describedby="{id_}-aj"' if ajuda else ''
    a += f' inputmode="{im}"' if im else ''
    aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>' if ajuda else ''
    v = f' value="{H(valor)}"' if valor else ''
    return f'<div class="campo {cls}"><label for="{id_}">{rot}{o}</label><input class="entrada" id="{id_}" name="{id_}" type="{tipo}" autocomplete="{ac}"{v}{a}>{aj}</div>'


def uf_sel(id_, rot, sel, cls, ac=''):
    ops = '<option value="">Escolha</option>' + ''.join(f'<option{" selected" if u == sel else ""}>{u}</option>' for u, _ in UFS)
    a = f' autocomplete="{ac}"' if ac else ''
    return f'<div class="campo {cls}"><label for="{id_}">{rot}</label><select class="entrada" id="{id_}" name="{id_}"{a}>{ops}</select></div>'


x = E['end']
tipos = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="f-tipo" value="{k}"{" checked" if k == E["tipo"] else ""}><span>{TIPOS[k][0]}<small>{TIPOS[k][1]}</small></span></label>'
                for k in ('sociedade', 'individual', 'sem'))
CSS = ('<style>/* Dados do escritório para os documentos (escritorio-dados-documentos) */'
       '.dd-sec{grid-column:1/-1;font-family:var(--sans,Poppins);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2);font-weight:500;margin:8px 0 -6px;padding-top:14px;border-top:1px solid var(--divisor)}'
       '.dd-sec:first-child{border-top:0;padding-top:0;margin-top:0}'
       '.dd-tipos{grid-column:1/-1}.dd-tipos .dd-ops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 16px}'
       '.dd-mesmo{clear:both;margin:0 0 6px}.dd-mesmo-txt{margin:-4px 0 0 34px;font-size:13px;color:var(--texto-2);line-height:1.5;overflow-wrap:anywhere}'
       '.dd-mesmo-txt b{color:var(--texto);font-weight:500}'
       '[data-cob-proprio][hidden],[data-soc][hidden]{display:none!important}'
       '.end-grade .e6{grid-column:span 6}'
       '@media (max-width:760px){.dd-tipos .dd-ops{grid-template-columns:1fr}.dd-mesmo-txt{margin-left:0}}</style>')
SCRIPT = ('<script>document.addEventListener("change",function(e){'
          'if(e.target.id==="as-mesmo"){var m=e.target.checked;document.querySelectorAll("[data-cob-proprio]").forEach(function(x){x.hidden=m});var t=document.getElementById("as-mesmo-txt");if(t)t.hidden=!m}'
          'if(e.target.name==="f-tipo"){var sem=e.target.value==="sem";document.querySelectorAll("[data-soc]").forEach(function(x){x.hidden=sem})}'
          '});</script>')

end = (f'<fieldset class="end-grupo" aria-describedby="f-end-aj"><legend>Endereço da sede</legend>'
       f'<p class="ajuda" id="f-end-aj">Sai no contrato, na procuração, nas petições e no timbrado. É o padrão do endereço de cobrança e do endereço profissional dos advogados.</p><div class="end-grade">'
       + campo('f-cep', 'CEP', x['cep'], 'e2', ac='postal-code', im='numeric', ajuda='Só números ou com hífen.')
       + campo('f-rua', 'Rua, avenida ou travessa', x['rua'], 'e4', ac='address-line1')
       + campo('f-num', 'Número', x['num'], 'e1', ajuda='Sem número: S/N.')
       + campo('f-comp', 'Complemento', x['comp'], 'e2', opc=True, ac='address-line2')
       + campo('f-bairro', 'Bairro', x['bairro'], 'e3', ac='address-level3')
       + campo('f-cidade', 'Cidade', x['cidade'], 'e4', ac='address-level2')
       + uf_sel('f-uf', 'UF', x['uf'], 'e2', 'address-level1') + '</div></fieldset>')
CONTATOS = [('Carol Santana', 'Sócia dona', '(71) 99184-5520', f'carolina@{DOMINIO}'), ('Júlia Andrade', 'Recepção', '(71) 3352-4180', f'julia@{DOMINIO}')]
cont = ''.join(f'''<div class="contato-edit" role="group" aria-label="Contato {i}: {n}">
      <div class="campo"><label for="ct{i}-nome">Nome</label><input class="entrada" id="ct{i}-nome" value="{n}" autocomplete="off"></div>
      <div class="campo"><label for="ct{i}-papel">Papel</label><input class="entrada" id="ct{i}-papel" value="{p}" autocomplete="off"></div>
      <div class="campo"><label for="ct{i}-tel">Telefone</label><input class="entrada" id="ct{i}-tel" type="tel" value="{t}" autocomplete="off"></div>
      <div class="campo"><label for="ct{i}-email">E-mail</label><input class="entrada" id="ct{i}-email" type="email" value="{m}" autocomplete="off"></div>
      <button class="remover" type="button" aria-label="Remover o contato {n}">{ico("x")}</button>
    </div>''' for i, (n, p, t, m) in enumerate(CONTATOS, 1))

EDITAR = f'''<template data-est="ficha:dd-editar" data-cab="ativo" data-sem-alerta>
<div class="grade"><div class="col"><section class="folha" aria-labelledby="t-editar">
      <div class="folha-cab"><div><h2 id="t-editar">Editar ficha</h2><p class="sub">Os campos sem “(opcional)” são obrigatórios. O que ficar em branco sai marcado nos documentos do escritório.</p></div></div>
      <form class="form-folha" action="#" novalidate>
        <h3 class="dd-sec">Quem é o escritório</h3>
        {campo('f-nome', 'Nome no T3jus', E['nome'], 'c6', ac='organization', ajuda='O nome curto, do Console, do Portal e das conversas. Não sai nos documentos.')}
        <fieldset class="grupo-opcoes dd-tipos"><legend>Tipo</legend><div class="dd-ops">{tipos}</div></fieldset>
        <div data-soc style="display:contents">
        {campo('f-razao', 'Razão social', E['razao'], 'c6', opc=True, ajuda='Como no registro da OAB e no CNPJ. Sai em maiúsculas no contrato.')}
        {campo('f-cnpj', 'CNPJ', E['cnpj'], 'c2', opc=True, im='numeric', ajuda='Conferimos os dígitos ao salvar.')}
        {uf_sel('f-oabuf', 'Registro na OAB: seccional', E['oab'][0], 'c2')}
        {campo('f-oabn', 'Registro na OAB: número', E['oab'][1], 'c2', im='numeric', ajuda='O da sociedade; em branco se não houver.')}
        </div>
        <h3 class="dd-sec">Onde fica</h3>
        {end}
        <h3 class="dd-sec">Como falar com o escritório</h3>
        {campo('f-tel', 'Telefone do escritório', E['tel'], 'c3', opc=True, tipo='tel', ac='off', im='tel', ajuda='Vai no timbrado do recibo e do carnê.')}
        {campo('f-email', 'E-mail do escritório', E['email'], 'c3', opc=True, tipo='email', ajuda='Vai no timbrado; nas petições, se o modelo pedir.')}
        {campo('f-site', 'Site', E['site'], 'c6', opc=True, ajuda='Só no timbrado do recibo.')}
        <fieldset class="contatos-edit"><legend>Contatos<small>Com quem a equipe T3jus fala. Até 10. Não saem nos documentos.</small></legend>
          {cont}
          <div><button class="btn btn-fantasma" type="button">{ico("mais")}Adicionar contato</button></div>
        </fieldset>
        <div class="form-pe"><p class="esq-pe">Vale para os próximos documentos; os já gerados não mudam.</p><a class="btn btn-fantasma" href="?aba=ficha">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Salvar ficha</button></div>
      </form>
    </section></div><aside class="col" aria-label="Contexto do escritório"><section class="explica campo-ambar" aria-labelledby="t-ex"><p class="sobretitulo">Editando</p><h2 id="t-ex">A ficha é do escritório.</h2>
      <ul><li>{ico("escudo")}<span>A sócia dona vê estes dados no Portal e também pode mudá-los, em Escritório › Dados do escritório. A última mudança vale.</span></li>
      <li>{ico("doc")}<span>Razão social, CNPJ, registro na OAB e sede saem no contrato, na procuração, nas petições e no timbrado.</span></li>
      <li>{ico("historico")}<span>Cada mudança vai para o histórico, com seu nome, onde foi feita (Console ou Portal) e os campos alterados.</span></li>
      <li>{ico("pessoas")}<span>Se outra pessoa salvar antes, avisamos e você escolhe qual versão fica.</span></li></ul></section></aside></div>
</template>
'''

# Aba Assinatura: o editar aprovado (cb-editar), com o grupo do endereço trocado
i = s.index('data-est="assinatura:cb-editar"')
i = s.rfind('<template', 0, i)
j = s.index('</template>', i) + len('</template>')
cb = s[i:j].replace('data-est="assinatura:cb-editar"', 'data-est="assinatura:dd-mesmo"')
a = cb.index('<fieldset class="end-grupo so-fin"')
b = cb.index('</fieldset>', a) + len('</fieldset>')
grupo = cb[a:b]
grade = grupo[grupo.index('<div class="end-grade">'):grupo.rindex('</fieldset>')]
for de, para in [('50050-000', x['cep']), ('"Rua da Aurora"', f'"{x["rua"]}"'), ('value="295"', f'value="{x["num"]}"'), ('sala 1102', x['comp']),
                 ('Boa Vista', x['bairro']), ('Recife', x['cidade']), ('<option selected>PE</option>', '<option>PE</option>'), ('<option>BA</option>', '<option selected>BA</option>')]:
    grade = grade.replace(de, para)
novo = (f'<fieldset class="end-grupo so-fin" aria-describedby="as-end-ajuda"><legend>Endereço de cobrança</legend>'
        f'<p class="ajuda" id="as-end-ajuda">Vai no boleto como endereço do pagador; sem ele, o Banco Inter não registra o boleto e a fatura sai só com o Pix.</p>'
        f'<div class="dd-mesmo"><label class="opcao"><input class="marcar" type="checkbox" id="as-mesmo" checked aria-describedby="as-mesmo-txt"><span>O mesmo endereço da sede<small>Muda junto se a sede mudar, na ficha ou no Portal.</small></span></label>'
        f'<p class="dd-mesmo-txt" id="as-mesmo-txt"><b>{end_linha(E, nw=False)}</b> · da ficha do escritório</p></div>'
        f'<div data-cob-proprio hidden>{grade}</div></fieldset>')
cb = cb[:a] + novo + cb[b:]

# Troca do escritório de exemplo (Cedro & Lima, Recife) pelo Santana (Salvador)
for de, para in [('Cedro &amp; Lima Advocacia', E['nome']), ('Cedro &amp; Lima', E['nome']), ('Cedro e Lima', E['nome']), ('Cedro & Lima', E['nome']),
                 ('Recife, PE', 'Salvador, BA'), ('22.914.870/0001-09', E['cnpj']), ('financeiro@cedrolima.exemplo.com.br', f'financeiro@{DOMINIO}')]:
    s = s.replace(de, para)
    cb = cb.replace(de, para)
s = s.replace('<script>\n(function(){\n  var q=new URLSearchParams', EDITAR + cb + '\n<script>\n(function(){\n  var q=new URLSearchParams', 1)
assert 'dd-mesmo' in s and 'dd-editar' in s
s = s.replace('</head>', CSS + '</head>', 1).replace('</body>', SCRIPT + '</body>', 1)
open(f'{SAIDA}/console-ficha.html', 'w', encoding='utf-8').write(s)
print('console-ficha ok')
