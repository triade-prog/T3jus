# Onde cada PDF nasce: copia SEM MUDANÇA as três páginas aprovadas da cobrança (console-cobranca) e acrescenta,
# antes de </body>, um script curto que só liga os botões que hoje levam a "#" (Baixar a fatura, Recibo, Baixar o recibo,
# Baixar o carnê) aos modelos A4 desta pasta. No Console › fatura, acrescenta "Baixar a fatura (PDF)" em "O que fazer".
# Com &pdf=preparando ou &pdf=erro, mostra os estados aprovados em portal-contrato-pdf (indicador girando, linha
# role=status; aviso de urgência com "Tentar de novo" e o código). Nada do desenho aprovado é redesenhado.
# Uso: python3 ligar.py <pasta-saida>
import sys

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
APROV = '/home/claude/t3jus/docs/design/aprovadas/console-cobranca/'

CSS = ('.pdf-gira{width:16px;height:16px;border-radius:50%;border:2px solid var(--sal);border-top-color:var(--vinho);animation:pdf-gira .9s linear infinite;flex:none}'
       '@keyframes pdf-gira{to{transform:rotate(360deg)}}'
       '@media (prefers-reduced-motion:reduce){.pdf-gira{animation:none;border-top-color:var(--vinho);border-right-color:var(--vinho)}}'
       '.pdf-status{margin:10px 0 0;display:flex;gap:8px;align-items:center;font-size:13px;color:var(--texto-2);flex-basis:100%}'
       '.pdf-status b{color:var(--texto);font-weight:500}'
       '.pdf-erro{margin:10px 0 0;flex-basis:100%}.pdf-erro .aviso{margin:0}.pdf-erro .aviso-acoes{display:flex;gap:8px;flex-wrap:wrap}'
       '.pdf-erro .codigo{margin:6px 0 0;font-size:11px;color:var(--texto-2);letter-spacing:.04em}')

JS = r"""
<script>/* Ligar os PDFs (desenho cobranca-pdfs): só troca destinos de links e, com &pdf=, mostra preparando ou erro */
(function(){
var q=new URLSearchParams(location.search),arq=location.pathname.split('/').pop(),est=q.get('estado')||'',pdf=q.get('pdf')||'';
var st=document.createElement('style');st.textContent=%CSS%;document.head.appendChild(st);
function ico(n,c){return '<svg class="'+(c||'ico')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function txt(a){return (a.childNodes.length?[].map.call(a.childNodes,function(n){return n.nodeType===3?n.textContent:''}).join(''):a.textContent).trim()}
function liga(rotulo,href){[].forEach.call(document.querySelectorAll('a.btn'),function(a){if(txt(a)===rotulo&&a.getAttribute('href')==='#'){a.setAttribute('href',href)}})}
var FAT={'ver':'padrao','lembrete':'padrao','atraso':'atraso','carne':'carne','cancelada':'cancelada','paga':'paga'};
function go(){
  if(arq==='cobranca.html'&&q.get('aba')==='fatura'){
    var e=FAT[est]||'padrao',box=document.querySelector('.cb-acoes');
    if(box&&!box.querySelector('[data-pdf-fatura]')){
      var a=document.createElement('a');a.className='btn btn-sec';a.href='fatura-a4.html?estado='+e;a.setAttribute('data-pdf-fatura','');
      a.innerHTML=ico('baixar')+'Baixar a fatura (PDF)';
      var ref=[].filter.call(box.children,function(x){return /Mandar lembrete|Baixar o recibo/.test(x.textContent)})[0];
      if(ref)ref.after(a);else box.prepend(a);
    }
    liga('Baixar o recibo','recibo-a4.html?estado=manual');
    liga('Baixar o carnê (PDF)','carne-a4.html?estado=hoje');
  }
  if(arq==='ficha.html'){liga('Baixar o carnê (PDF)','carne-a4.html?estado=hoje')}
  if(arq==='portal-escritorio.html'){
    liga('Baixar a fatura','fatura-a4.html?estado=padrao');liga('Recibo','recibo-a4.html?estado=padrao');
    liga('Baixar o carnê','carne-a4.html?estado=hoje');liga('Baixar o carnê (PDF)','carne-a4.html?estado=hoje');
  }
  if(!pdf)return;
  var alvo,qual,cod,linha;
  if(arq==='portal-escritorio.html'){alvo=[].filter.call(document.querySelectorAll('a.btn'),function(a){return txt(a)==='Baixar a fatura'})[0];qual='a fatura de dezembro';cod='FATURA_PDF_INDISPONIVEL';
    linha='Nada mudou na fatura, e o botão Pagar continua funcionando. Tente de novo em instantes; se não sair, escreva para atendimento@exemplo.com.br.'}
  else{alvo=[].filter.call(document.querySelectorAll('.cb-carne-acoes a.btn'),function(a){return /Baixar o carnê/.test(txt(a))})[0];qual='o carnê 2026/2027';cod='CARNE_PDF_INDISPONIVEL';
    linha='Nada mudou no carnê nem nas faturas. Tente de novo em instantes; se não sair, passe o código abaixo ao time técnico.'}
  if(!alvo)return;
  var cx=alvo.parentNode;
  if(pdf==='preparando'){
    var b=document.createElement('button');b.type='button';b.className=alvo.className;b.setAttribute('aria-disabled','true');b.setAttribute('aria-describedby','pdf-st');
    b.innerHTML='<span class="pdf-gira" aria-hidden="true"></span>Preparando o PDF<span class="sr">: '+qual+'</span>';alvo.replaceWith(b);
    cx.insertAdjacentHTML('beforeend','<p class="pdf-status" id="pdf-st" role="status">'+ico('relogio','ico ico-s')+'<span><b>Preparando o PDF d'+(qual[0]==='a'?'a ':'o ')+qual.slice(2)+'.</b> Leva alguns segundos; o arquivo baixa sozinho. Pode continuar na tela.</span></p>');
  }else if(pdf==='erro'){
    cx.insertAdjacentHTML('beforeend','<div class="pdf-erro"><div class="aviso aviso-urgencia" role="alert">'+ico('alerta')+'<div><strong class="aviso-titulo">Não deu para preparar o PDF d'+(qual[0]==='a'?'a ':'o ')+qual.slice(2)+'.</strong><p>'+linha+'</p><div class="aviso-acoes"><button class="btn btn-sec btn-compacto" type="button">'+ico('reenviar','ico ico-s')+'Tentar de novo<span class="sr">: PDF d'+(qual[0]==='a'?'a ':'o ')+qual.slice(2)+'</span></button></div></div></div><p class="codigo">'+cod+'</p></div>');
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(go,0)});else setTimeout(go,0);
})();
</script>
"""


# ---------- Endereço de cobrança na aba Assinatura (pedido da Carol, 22/11/2026) ----------
# O boleto registrado do Banco Inter exige o endereço do pagador. Parte dos estados aprovados 27 (cb-em-dia),
# 30 (cb-editar) e 31 (cb-editar-erros), que ficam como estão a não ser pelo bloco do endereço acrescentado em
# 27 e 30. Estados novos: cb-sem-endereco e cb-editar-endereco-erros. Tudo com .so-fin: Implantação e Suporte
# não veem o endereço; só Administração e Financeiro editam (a página de editar já é só delas).
UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split()

CSS_END = ('.end-grupo{grid-column:1/-1;border:0;margin:0;padding:14px 16px 16px;min-width:0;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--sal-2)}'
           '.end-grupo legend{float:left;width:100%;padding:0;margin:0 0 2px;font-size:var(--fs-pequeno,14px);font-weight:var(--peso-medio,500);color:var(--texto)}'
           '.end-grupo>.ajuda{clear:both;margin:0 0 12px;font-size:12px;color:var(--texto-2)}'
           '.end-grade{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 16px}'
           '.end-grade .e1{grid-column:span 1}.end-grade .e2{grid-column:span 2}.end-grade .e3{grid-column:span 3}.end-grade .e4{grid-column:span 4}'
           '.end-falta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.end-falta .cb-peq{flex-basis:100%}'
           '.end-falta a{font-weight:500;color:var(--vinho);display:inline-flex;align-items:center;gap:4px;min-height:24px}'
           '@media (max-width:760px){.end-grade{grid-template-columns:1fr}.end-grade>*{grid-column:1/-1!important}.end-grupo{padding:12px}}')

ICO = lambda n, c='ico': f'<svg class="{c}" aria-hidden="true"><use href="#i-{n}"/></svg>'

DD_END = ('<div class="inteira so-fin"><dt>Endereço de cobrança</dt><dd>Rua da Aurora, 295, sala 1102 · Boa Vista · Recife, PE · CEP 50050-000 '
          '<span class="cb-peq">vai no boleto como endereço do pagador · o mesmo da ficha</span></dd></div>')
DD_SEM = ('<div class="inteira so-fin"><dt>Endereço de cobrança</dt><dd class="end-falta"><span class="selo selo-atencao">' + ICO('alerta', 'ico ico-s') +
          'Falta o endereço</span><a href="?aba=assinatura&amp;estado=cb-editar">Preencher o endereço' + ICO('dir', 'ico ico-s') + '</a>'
          '<span class="cb-peq">Sem ele o boleto não sai, só o Pix. A ficha tem a rua, mas não tem o CEP.</span></dd></div>')
AVISO_SEM = ('<div class="so-fin" style="padding:0 24px 16px"><div class="aviso aviso-atencao " role="status">' + ICO('alerta') +
             '<div><strong class="aviso-titulo">Falta o endereço: sem ele o boleto não sai, só o Pix.</strong>'
             '<p>O Banco Inter só registra o boleto com o endereço do pagador. Até preencher, a fatura de janeiro vai só com o Pix.</p>'
             '<div class="aviso-acoes" style="margin-top:10px"><a class="btn btn-sec btn-compacto" href="?aba=assinatura&amp;estado=cb-editar">' + ICO('lapis', 'ico ico-s') +
             'Preencher o endereço</a></div></div></div></div>')

def campo(cls, id_, rot, val, ac, extra='', erro='', ajuda='', opc=False, sel=False, foco=False):
    desc = ' '.join(x for x in ((id_ + '-erro') if erro else '', (id_ + '-ajuda') if ajuda else '') if x)
    at = (f' aria-describedby="{desc}"' if desc else '') + (' aria-invalid="true"' if erro else '') + (' data-foco' if foco else '')
    lab = rot + (' <span class="opcional">(opcional)</span>' if opc else '')
    if sel:
        ops = '<option value="">Escolha</option>' + ''.join(f'<option{" selected" if u == val else ""}>{u}</option>' for u in UFS)
        ent = f'<select class="entrada" id="{id_}" name="{id_}" autocomplete="{ac}"{at}>{ops}</select>'
    else:
        ent = f'<input class="entrada" id="{id_}" name="{id_}" type="text" value="{val}" autocomplete="{ac}"{extra}{at}>'
    em = (f'<p class="erro-msg" id="{id_}-erro">' + ICO('alerta', 'ico ico-s') + erro + '</p>') if erro else ''
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    return f'<div class="campo {cls}"><label for="{id_}">{lab}</label>{ent}{em}{aj}</div>'

def bloco_end(erros=False):
    cep, num = ('50050-00', '') if erros else ('50050-000', '295')
    return ('<fieldset class="end-grupo so-fin" aria-describedby="as-end-ajuda"><legend>Endereço de cobrança</legend>'
            '<p class="ajuda" id="as-end-ajuda">Vai no boleto como endereço do pagador; sem ele, o Banco Inter não registra o boleto e a fatura sai só com o Pix. Veio da ficha do escritório: mude só se a cobrança é em outro endereço.</p>'
            '<div class="end-grade">'
            + campo('e2', 'as-cep', 'CEP', cep, 'postal-code', ' inputmode="numeric"',
                    erro='O CEP tem 8 números; aqui há 7. Confira, como em 50050-000.' if erros else '', ajuda='Só números ou com hífen.', foco=erros)
            + campo('e4', 'as-logr', 'Rua, avenida ou travessa', 'Rua da Aurora', 'address-line1')
            + campo('e1', 'as-num', 'Número', num, 'off', erro='Escreva o número. Se não houver, escreva S/N.' if erros else '')
            + campo('e2', 'as-compl', 'Complemento', 'sala 1102', 'address-line2', opc=True)
            + campo('e3', 'as-bairro', 'Bairro', 'Boa Vista', 'address-level3')
            + campo('e4', 'as-cid', 'Cidade', 'Recife', 'address-level2')
            + campo('e2', 'as-uf', 'UF', 'PE', 'address-level1', sel=True)
            + '</div></fieldset>')

def tpl(s, est):
    i = s.index(f'<template data-est="assinatura:{est}"'); j = s.index('</template>', i) + len('</template>')
    return i, j

def endereco(s):
    # 27 com o endereço
    i, j = tpl(s, 'cb-em-dia'); t = s[i:j]
    a = '<div class="so-fin"><dt>CNPJ da nota</dt>'
    assert t.count(a) == 1
    t27 = t.replace(a, DD_END + a)
    # novo: sem endereço (cópia do 27)
    sem = t.replace(a, DD_SEM + a).replace('data-est="assinatura:cb-em-dia"', 'data-est="assinatura:cb-sem-endereco"')
    b = '<dd>Pix <span class="cb-peq">o boleto vai junto, como alternativa</span></dd>'
    assert b in sem
    sem = sem.replace(b, '<dd>Só Pix por enquanto <span class="cb-peq">o boleto volta quando o endereço estiver preenchido</span></dd>')
    c = '</div></div><dl class="dados-ficha">'
    assert sem.count(c) == 1, sem.count(c)
    sem = sem.replace(c, '</div></div>' + AVISO_SEM + '<dl class="dados-ficha">')
    s = s[:i] + t27 + s[j:]
    # 30 com o bloco do endereço depois do CNPJ
    i, j = tpl(s, 'cb-editar'); t = s[i:j]
    k = t.index('<p class="ajuda" id="as-cnpj-ajuda">'); k = t.index('</div>', k) + len('</div>')
    t30 = t[:k] + bloco_end() + t[k:]
    # novo: erros de endereço (cópia do 30 com o resumo do 31)
    er = t[:k] + bloco_end(True) + t[k:]
    er = er.replace('data-est="assinatura:cb-editar"', 'data-est="assinatura:cb-editar-endereco-erros"')
    d = '</div></div><div class="form-folha">'
    assert er.count(d) == 1, er.count(d)
    er = er.replace(d, '</div></div><div style="padding:0 24px 16px"><div class="aviso aviso-urgencia " role="alert">' + ICO('alerta') +
                    '<div><strong class="aviso-titulo">Falta acertar 2 pontos do endereço, marcados abaixo.</strong><p>Nada foi salvo.</p></div></div></div><div class="form-folha">')
    s = s[:i] + t30 + s[j:]
    i, j = tpl(s, 'cb-editar-erros')
    s = s[:j] + sem + er + s[j:]
    h = s.index('</head>')
    return s[:h] + '<style>/* endereço de cobrança (desenho cobranca-pdfs) */' + CSS_END + '</style>' + s[h:]

import json
js = JS.replace('%CSS%', json.dumps(CSS))
for nome in ('cobranca.html', 'ficha.html', 'portal-escritorio.html'):
    s = open(APROV + nome, encoding='utf-8').read()
    if nome == 'ficha.html':
        s = endereco(s)
    i = s.rindex('</body>')
    open(f'{SAIDA}/{nome}', 'w', encoding='utf-8').write(s[:i] + js + s[i:])
print('ligar ok: cobranca.html, ficha.html, portal-escritorio.html')
