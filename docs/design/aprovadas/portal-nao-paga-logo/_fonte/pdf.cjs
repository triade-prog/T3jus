// PDF real do carnê e do recibo com o logo (estado "largo"), pelo Chromium, como o "Salvar como PDF" do navegador.
// Confere o número de páginas A4. Uso: node pdf.cjs <pasta-saida>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [arq, saida] of [['carne-logo-a4.html', 'carne-exemplo.pdf'], ['recibo-logo-a4.html', 'recibo-exemplo.pdf']]) {
    await p.goto('file://' + path.join(dir, arq) + '?estado=largo');
    await p.evaluate(() => document.fonts.ready);
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: path.join(dir, saida), format: 'A4', printBackground: true, preferCSSPageSize: true });
    const n = (fs.readFileSync(path.join(dir, saida), 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(saida, n, 'página(s) A4');
    await p.emulateMedia({ media: 'screen' });
  }
  await b.close();
})();
