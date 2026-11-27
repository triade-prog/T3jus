// Capturas (PNG com deviceScaleFactor 2, depois WebP) e conferência de acessibilidade.
// É o fotos_cb.cjs da cobrança aprovada, com uma diferença: nesta máquina não há axe-core e o pedido foi não instalar nada.
// No lugar do axe, uma conferência própria, rodada na página (WCAG 2.2 AA), com as regras que mais pegam em telas assim:
//   contraste de texto (1.4.3), nome acessível de botão, link e campo (4.1.2, 1.3.1), ids repetidos e referências
//   aria quebradas, rolagem lateral (1.4.10) e alvos menores que 44 px (2.5.8, com as exceções aprovadas).
// Uso: node fotos_im.cjs <pasta-saida> [filtro] [--sem-fotos]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
const filtro = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : '';
const semFotos = process.argv.includes('--sem-fotos');
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos_im.json'), 'utf8'));

function conferir() {
  const out = [];
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const raiz = document.querySelector('dialog[open]:not(.si-painel)') || document;
  // ids repetidos
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
  const rep = Object.keys(ids).filter(k => ids[k] > 1); if (rep.length) out.push('id repetido: ' + rep.slice(0, 5).join(', '));
  // referências aria
  document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]').forEach(e => {
    ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(a => { const v = e.getAttribute(a); if (!v) return; v.split(/\s+/).forEach(id => { if (id && !document.getElementById(id)) out.push(a + ' sem alvo: ' + id); }); });
  });
  // nome acessível
  const nome = e => (e.getAttribute('aria-label') || '') + (e.getAttribute('aria-labelledby') ? 'x' : '') + (e.textContent || '').trim() + (e.title || '');
  raiz.querySelectorAll('button,a[href],[role=button]').forEach(e => { if (vis(e) && !nome(e)) out.push('sem nome: ' + e.outerHTML.slice(0, 80)); });
  raiz.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(e => {
    if (!vis(e)) return;
    const ok = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.closest('label');
    if (!ok) out.push('campo sem rótulo: ' + (e.id || e.name));
  });
  // contraste
  const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const fundo = e => {
    const pilha = []; let n = e;
    while (n && n.nodeType === 1) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage) === false) {} const c = rgb(s.backgroundColor); if (c && c.a > 0) { pilha.push(c); if (c.a >= 1) break; } if (s.backgroundImage && s.backgroundImage !== 'none' && /url\(/.test(s.backgroundImage) && !pilha.length) { /* padrão do campo: mede pela cor de fundo */ } n = n.parentElement; }
    let c = { r: 255, g: 255, b: 255, a: 1 }; for (let i = pilha.length - 1; i >= 0; i--) c = mix(pilha[i], c); return c;
  };
  let ruins = [];
  const walker = document.createTreeWalker(raiz === document ? document.body : raiz, NodeFilter.SHOW_TEXT);
  let t; const vistos = new Set();
  while ((t = walker.nextNode())) {
    if (!t.textContent.trim()) continue; const e = t.parentElement; if (!e || vistos.has(e)) continue; vistos.add(e);
    if (!vis(e) || e.closest('[aria-hidden="true"]') || e.closest('.sr') || e.closest('template')) continue;
    const s = getComputedStyle(e); if (parseFloat(s.opacity) === 0) continue;
    const fg0 = rgb(s.color); if (!fg0) continue; const bg = fundo(e); const fg = mix(fg0, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const px = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700; const grande = px >= 24 || (bold && px >= 18.66);
    if (ratio < (grande ? 3 : 4.5) && !e.closest('input:disabled,button[aria-disabled=true]') && !e.matches('input:disabled + span, input:disabled ~ span *')) ruins.push(t.textContent.trim().slice(0, 30) + ' ' + ratio.toFixed(2));
  }
  if (ruins.length) out.push('contraste: ' + ruins.slice(0, 6).join(' | '));
  return [...new Set(out)];
}

(async () => {
  const browser = await chromium.launch();
  const res = [];
  for (const c of casos) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 412, height: 915 };
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      const [arq, qs] = c.url.split('?');
      await page.goto('file://' + path.join(dir, arq) + (qs ? '?' + qs : ''));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const temJanela = await page.evaluate(() => !!document.querySelector('dialog.janela[open]') || (!!document.querySelector('dialog.si-painel[open]') && matchMedia('(max-width:760px)').matches));
      const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const pequenos = await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false;
          if (e.closest('.trilha') || e.closest('p') && e.tagName === 'A' || e.closest('li') && e.tagName === 'A' && e.closest('.im-conta-l')) return false;
          if (e.matches('.cartao a.c-nome, .cb-cartao a.cb-c-nome, .si-link')) return false;
          if (e.matches('input.sr')) return false;
          if (e.matches('.contato a, .esc a, .cb-esc a, .dp-var a')) return false;
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (!semFotos) {
        if (tam === 'celular' && !temJanela) {
          const h = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: vp.width, height: Math.min(h, 7800) });
          await page.waitForTimeout(150);
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
        } else if (temJanela) {
          const sobra = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('dialog[open], dialog[open] *')].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map(e => e.scrollHeight - e.clientHeight)));
          await page.setViewportSize({ width: vp.width, height: vp.height + sobra + 40 });
          await page.waitForTimeout(200);
          await page.evaluate(() => document.querySelectorAll('dialog[open], dialog[open] *').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }));
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
          await page.waitForTimeout(150);
        } else {
          await page.screenshot({ path: png, fullPage: true });
        }
      }
      const viol = await page.evaluate(conferir);
      res.push({ nome: c.nome, tam, rolagem, viol, erros, pequenos });
      console.log(`${c.nome} ${tam} rolagem=${rolagem} conf=${viol.length} pequenos=${pequenos.length}${viol.length ? '\n   ' + viol.join('\n   ') : ''}${pequenos.length ? '\n   alvos: ' + pequenos.join(' ; ') : ''}${erros.length ? '\n   JS: ' + erros.join(' ') : ''}`);
      await ctx.close();
    }
  }
  if (!filtro) fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify(res, null, 1));
  await browser.close();
})();
