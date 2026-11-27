// Capturas (PNG com deviceScaleFactor 2, depois WebP) e conferência: contraste do texto (WCAG 1.4.3: 4,5:1, ou 3:1 no texto grande),
// alvos menores que 44 px (mesmas exceções das aprovadas), rolagem lateral e erros de script.
// É o fotos_cb.cjs do console-cobranca, sem o axe-core (não está instalado aqui): o contraste é medido por uma conferência própria,
// que compõe as cores de fundo do elemento até a raiz. Fundos com imagem ou gradiente ficam como "a ver" (não reprovam).
// Uso: node fotos_tg.cjs <pasta-saida> [filtro] [--sem-fotos]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
const filtro = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : '';
const semFotos = process.argv.includes('--sem-fotos');
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos_tg.json'), 'utf8'));

function contraste() {
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const mix = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function fundo(el) {
    const camadas = []; let e = el, imagem = false;
    while (e && e.nodeType === 1) {
      const st = getComputedStyle(e);
      if (st.backgroundImage && st.backgroundImage !== 'none') imagem = true;
      const c = parse(st.backgroundColor); if (c && c.a > 0) { camadas.push(c); if (c.a >= 1) break; }
      if (e.tagName === 'DIALOG' && e.open) { if (!camadas.length || camadas[camadas.length - 1].a < 1) camadas.push({ r: 255, g: 255, b: 255, a: 1 }); break; }
      e = e.parentElement;
    }
    let f = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = camadas.length - 1; i >= 0; i--) f = mix(camadas[i], f);
    return { f, imagem };
  }
  const raiz = document.querySelector('dialog[open]') || document.body;
  const ruins = [], aver = [];
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const vistos = new Set();
  while (w.nextNode()) {
    const t = w.currentNode; if (!t.textContent.trim()) continue;
    const el = t.parentElement; if (!el || vistos.has(el)) continue; vistos.add(el);
    if (el.closest('svg,template,script,style,.sr,.sr-only,.visualmente-oculto,[aria-hidden=true]')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') continue;
    if (r.width <= 1 && r.height <= 1) continue;
    let op = 1, e = el; while (e && e.nodeType === 1) { op *= Number(getComputedStyle(e).opacity); e = e.parentElement; }
    if (op === 0) continue;
    if (el.closest('[disabled],[aria-disabled=true]')) continue; // componente desativado: fora da 1.4.3
    let c = parse(st.color); if (!c) continue;
    const { f, imagem } = fundo(el);
    c = mix({ ...c, a: c.a * op }, f);
    const k = razao(c, f);
    const px = parseFloat(st.fontSize), peso = parseInt(st.fontWeight) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const min = grande ? 3 : 4.5;
    if (k + 0.005 < min) (imagem ? aver : ruins).push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} ${k.toFixed(2)}:1 "${t.textContent.trim().slice(0, 28)}"`);
  }
  return { ruins, aver };
}

(async () => {
  const browser = await chromium.launch();
  const res = [];
  for (const c of casos) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 412, height: 915 };
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Bahia' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      const [arq, qs] = c.url.split('?');
      await page.goto('file://' + path.join(dir, arq) + (qs ? '?' + qs : ''));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const temJanela = await page.evaluate(() => !!document.querySelector('dialog[open]'));
      const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const pequenos = await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false; // o rótulo inteiro é o alvo
          if (e.closest('.trilha') || e.closest('p') && e.tagName === 'A') return false; // link dentro de texto (exceção da WCAG 2.5.8)
          if (e.matches('.cartao a.c-nome, .cb-cartao a.cb-c-nome')) return false; // o ::after do link cobre o cartão inteiro
          if (e.matches('input.sr')) return false; // campo de arquivo escondido: o alvo é o rótulo
          if (e.matches('.contato a, .esc a, .cb-esc a')) return false; // links de texto das tabelas (nome), com 24 px ou mais (WCAG 2.5.8)
          if (e.closest('.email') && e.closest('td') && e.tagName === 'A' && !e.style.minHeight) return false; // link de texto do e-mail
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const ct = await page.evaluate(contraste);
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (!semFotos) {
        if (tam === 'celular' && !temJanela) {
          const h = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: vp.width, height: h });
          await page.waitForTimeout(150);
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
        } else {
          await page.screenshot({ path: png, fullPage: !temJanela });
        }
      }
      res.push({ nome: c.nome, tam, rolagem, contraste: ct.ruins, contraste_a_ver: ct.aver, erros, pequenos });
      console.log(`${c.nome} ${tam} rolagem=${rolagem} contraste=${ct.ruins.length} aver=${ct.aver.length} pequenos=${pequenos.length}${ct.ruins.length ? '\n   ' + ct.ruins.join('\n   ') : ''}${ct.aver.length ? '\n   a ver: ' + ct.aver.join(' ; ') : ''}${pequenos.length ? '\n   alvos: ' + pequenos.join(' ; ') : ''}${erros.length ? '\n   JS: ' + erros.join(' ') : ''}`);
      await ctx.close();
    }
  }
  if (!filtro) fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify(res, null, 1));
  await browser.close();
})();
