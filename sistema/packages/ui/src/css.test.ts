// Os arquivos de estilo não podem ter comentário ou chave fora do lugar. Um "/*" perdido num
// merge fez o minificador jogar fora a regra .pa-cab inteira (Próximas audiências sem recuo e
// sem fio no Início), sem erro no build.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = join(import.meta.dirname, "..", "..", "..");
function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name.startsWith(".")) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? arquivos(p) : p.endsWith(".css") ? [p] : [];
  });
}

function problemas(css: string): string[] {
  const achados: string[] = [];
  const linha = (i: number) => css.slice(0, i).split("\n").length;
  let dentro = false;
  let nivel = 0;
  for (let i = 0; i < css.length; i++) {
    if (!dentro && css.startsWith("/*", i)) { dentro = true; i++; continue; }
    if (dentro) { if (css.startsWith("*/", i)) { dentro = false; i++; } continue; }
    if (css.startsWith("*/", i)) achados.push(`"*/" sem abrir na linha ${linha(i)}`);
    if (css[i] === "{") nivel++;
    if (css[i] === "}" && --nivel < 0) { achados.push(`"}" sobrando na linha ${linha(i)}`); nivel = 0; }
  }
  if (dentro) achados.push("comentário sem fechar");
  if (nivel > 0) achados.push(`${nivel} "{" sem fechar`);
  return achados;
}

describe("arquivos de estilo", () => {
  const lista = [...arquivos(join(raiz, "packages")), ...arquivos(join(raiz, "apps"))];
  it("acha os estilos do Portal e do Console", () => {
    expect(lista.some((p) => p.endsWith("portal.css"))).toBe(true);
  });
  it.each(lista.map((p) => [p.slice(raiz.length + 1), p]))("%s fecha comentários e chaves", (_n, p) => {
    expect(problemas(readFileSync(p, "utf8"))).toEqual([]);
  });
});
