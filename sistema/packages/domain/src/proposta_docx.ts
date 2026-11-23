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
  /** O registro da sociedade na OAB, "OAB/SP 31.874" (F3.19). */
  oab?: string | null;
  contatos?: { telefone?: string | null; email?: string | null }[] | null;
  /** PA-07 (0860): a razão social, a sede em partes e o contato do próprio escritório. */
  razaoSocial?: string | null;
  tipo?: "SOCIEDADE" | "SOCIEDADE_INDIVIDUAL" | "SEM_SOCIEDADE" | null;
  cep?: string | null;
  /** A sede em partes (0860), para a linha da sede do timbrado (timbrado.ts). */
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  enderecoConfira?: boolean | null;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  /** Sem sociedade, o timbrado leva a sócia dona: o nome completo e a OAB principal. */
  dona?: { nome: string; dados?: { nomeCompleto?: string | null } | null; inscricoes?: { texto: string; tipo?: string }[] | null } | null;
}

/** "47318552000106" → "47.318.552/0001-06". */
export const cnpjFmt = (d: string) =>
  /^\d{14}$/.test(d) ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;

/** "7133524180" ou "+5571991874402" → "(71) 3352-4180" ou "(71) 99187-4402". */
export function telefoneFmt(t: string): string {
  const d = t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/** As linhas do timbrado: o nome; CNPJ e endereço; telefone e e-mail. Só o que existe. */
export function linhasTimbrado(e: EscritorioDoTimbrado): string[] {
  const cep = (e.cep ?? "").replace(/\D/g, "");
  const lugar = [e.endereco?.trim(), [e.cidade?.trim(), e.uf].filter(Boolean).join("/"), cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : ""]
    .filter(Boolean).join(" · ");
  const sem = e.tipo === "SEM_SOCIEDADE";
  const oabDona = sem ? (e.dona?.inscricoes?.find((i) => i.tipo === "PRINCIPAL") ?? e.dona?.inscricoes?.[0])?.texto ?? "" : "";
  const doc = (sem ? [oabDona, lugar] : [e.cnpj ? `CNPJ ${cnpjFmt(e.cnpj)}` : "", e.oab ?? "", lugar]).filter(Boolean).join(" · ");
  // O telefone e o e-mail do escritório; sem eles, o primeiro contato, como antes (decisão 9).
  const c = e.telefone || e.email ? { telefone: e.telefone, email: e.email } : e.contatos?.find((x) => x.telefone || x.email);
  const contato = [c?.telefone ? telefoneFmt(c.telefone) : "", c?.email ?? "", e.site ?? ""].filter(Boolean).join(" · ");
  const nome = sem ? e.dona?.dados?.nomeCompleto?.trim() || e.nome : e.razaoSocial?.trim() || e.nome;
  return [nome, doc, contato].filter(Boolean);
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
