// Trava do relógio dos testes de tela (F3.164): h(), d(), agora e os dias de console-dados.ts contam
// a partir de AGORA, um instante fixo. Um arquivo de tela que os usa e não fixa o relógio do
// navegador compara dados de 24/11/2026 com a hora real e volta a falhar pela hora ou pela data. O
// mesmo vale para quem calcula datas com Date.now() ou new Date() sem fixar o relógio.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = join(import.meta.dirname, "e2e");
const DO_RELOGIO = new Set(["h", "d", "agora", "AGORA", "diaIso", "diaBr", "hojeAs"]);
// Usa o relógio real de propósito até a correção do foco (F3.176).
const RELOGIO_REAL = new Set(["console-suporte.spec.ts"]);

/** Os nomes que o arquivo importa de um arquivo de dados ("./x.ts"). */
function importados(texto: string, de: string) {
  const nomes = new Set<string>();
  for (const m of texto.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)"/g)) {
    if (m[2] !== de) continue;
    for (const n of m[1]!.split(",")) if (n.trim()) nomes.add(n.trim().split(/\s+as\s+/)[0]!);
  }
  return nomes;
}

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith(".ts"));
const texto = (f: string) => readFileSync(join(PASTA, f), "utf8");
// Arquivos de dados que usam o relógio fixo (por exemplo, portal-tabelas-toque-dados.ts usa h()).
const dadosComRelogio = new Set(
  arquivos.filter((f) => !f.endsWith(".spec.ts") && f !== "console-dados.ts" && [...importados(texto(f), "console-dados.ts")].some((n) => DO_RELOGIO.has(n))),
);

describe("relógio dos testes de tela (F3.164)", () => {
  const specs = arquivos.filter((f) => f.endsWith(".spec.ts") && !RELOGIO_REAL.has(f));
  it.each(specs)("%s: quem usa o relógio fixo de console-dados.ts fixa o do navegador", (f) => {
    const t = texto(f);
    const usa = [...importados(t, "console-dados.ts")].some((n) => DO_RELOGIO.has(n)) || [...dadosComRelogio].some((dados) => importados(t, dados).size > 0)
      || /Date\.now\(\)|new Date\(\)/.test(t);
    if (!usa) return;
    expect(/fixarRelogio\(|clock\.setFixedTime\(|clock\.install\(/.test(t), `${f} usa h(), d(), agora ou o relógio real e não chama fixarRelogio`).toBe(true);
  });

  it("o arquivo que fica no relógio real não importa o relógio fixo", () => {
    for (const f of RELOGIO_REAL) expect([...importados(texto(f), "console-dados.ts")].filter((n) => DO_RELOGIO.has(n))).toEqual([]);
  });
});
