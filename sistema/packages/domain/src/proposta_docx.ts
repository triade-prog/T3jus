// A proposta em .docx no timbrado do escritório (AP-05, F3.6), tela aprovada em
// docs/design/aprovadas/portal-comercial-contratos (decisão 4: o T3jus gera o arquivo e o
// escritório envia como já envia; "Baixar a proposta (.docx)" na ficha da proposta).
// O arquivo tem o serviço, o que está incluído, as condições de honorário e a validade.

import type { FichaProposta } from "./comercial.ts";
import type { ParagrafoDocx } from "./docx.ts";
import { dataBr, leituraCondicao, TIPOS_HONORARIO } from "./honorarios.ts";
import { dataPorExtenso } from "./peticoes.ts";

export interface EscritorioDoTimbrado {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  contatos?: { telefone?: string | null; email?: string | null }[];
}

const cnpjFmt = (d: string) =>
  /^\d{14}$/.test(d) ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;

function telefoneFmt(t: string): string {
  const d = t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/** As linhas do timbrado: o nome; CNPJ e endereço; telefone e e-mail. Só o que existe. */
export function linhasTimbrado(e: EscritorioDoTimbrado): string[] {
  const lugar = [e.endereco?.trim(), [e.cidade?.trim(), e.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  const doc = [e.cnpj ? `CNPJ ${cnpjFmt(e.cnpj)}` : "", lugar].filter(Boolean).join(" · ");
  const c = e.contatos?.find((x) => x.telefone || x.email);
  const contato = c ? [c.telefone ? telefoneFmt(c.telefone) : "", c.email ?? ""].filter(Boolean).join(" · ") : "";
  return [e.nome, doc, contato].filter(Boolean);
}

/** "proposta-p-2026-014-gabriela-teixeira.docx" */
export function nomeArquivoProposta(p: Pick<FichaProposta, "numero" | "cliente">): string {
  const s = `proposta-${p.numero}-${p.cliente.nome}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
  return `${s}.docx`;
}

/** Os parágrafos da proposta. `hoje` vem do relógio da aplicação (aaaa-mm-dd). */
export function paragrafosProposta(p: FichaProposta, e: EscritorioDoTimbrado, hoje: string): ParagrafoDocx[] {
  const out: ParagrafoDocx[] = [
    { texto: "PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS", estilo: "titulo" },
    { texto: `Proposta ${p.numero}`, estilo: "direita" },
    { texto: `A ${p.cliente.nome},`, estilo: "enderecamento" },
    { texto: `Apresentamos a proposta de ${e.nome} para o serviço abaixo. Ela vale como base para o contrato de honorários, que será assinado se a proposta for aceita.` },
    { texto: "Serviço", estilo: "titulo" },
    { texto: p.servico },
  ];
  if (p.escopo?.trim()) {
    out.push({ texto: "O que está incluído", estilo: "titulo" });
    for (const l of p.escopo.split(/\n+/).map((x) => x.trim()).filter(Boolean)) out.push({ texto: l });
  }
  out.push({ texto: "Honorários", estilo: "titulo" });
  if (!p.condicoes.length) out.push({ texto: "[HONORÁRIOS: falta]" });
  p.condicoes.forEach((c, i) => {
    const l = leituraCondicao(c);
    const n = p.condicoes.length > 1 ? `${i + 1}. ` : "";
    out.push({ texto: `${n}${TIPOS_HONORARIO[c.tipo].nome}: ${[l.valor, l.complemento].filter(Boolean).join(" ")}. ${l.detalhe}` });
  });
  out.push({ texto: "Custas, perícias e despesas do processo não estão incluídas nos honorários, salvo se escrito acima." });
  out.push({ texto: "Validade", estilo: "titulo" });
  out.push({ texto: p.validaAte ? `Esta proposta vale até ${dataBr(p.validaAte)}.` : "Esta proposta vale por 15 dias a partir da data abaixo." });
  out.push({ texto: `${e.cidade?.trim() || "[CIDADE: falta]"}, ${dataPorExtenso(hoje)}.`, estilo: "direita" });
  out.push({ texto: `_______________________________________\n${p.responsavel.nome}\n${e.nome}`, estilo: "assinatura" });
  return out;
}
