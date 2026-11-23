// O timbrado do escritório no carnê e no recibo (F3.133, PA-07), desenho aprovado pela Carol em
// 22/11/2026 em docs/design/aprovadas/carne-recibo-razao-social (decisões 1 a 15, com as 4
// recomendações). A regra das 4 linhas é a de escritorio-dados-documentos (decisões 6 a 9 e 13),
// a mesma de `_fonte/rs_dados.py`:
//   1. a razão social; sem sociedade, o nome completo da sócia dona; sem razão social, o nome curto;
//   2. "CNPJ · OAB da sociedade"; sem sociedade, "OAB da sócia dona · sem CNPJ";
//   3. a sede numa linha, com cidade/UF e CEP;
//   4. telefone · e-mail · site do escritório; sem telefone e e-mail, o primeiro contato.
// Nunca sai "[falta]" nem "confira": o papel vai para o cliente (decisão 12). O CPF da sócia dona
// não entra em lugar nenhum. A tela e os dois PDFs do servidor usam estas mesmas funções.
// `linhasTimbrado` (proposta_docx.ts) continua com 3 linhas para o .docx (F3.146).

import { linhaDaSede } from "./escritorio_dados.ts";
import { cnpjFmt, telefoneFmt, type EscritorioDoTimbrado } from "./proposta_docx.ts";

/** O escritório como vai no papel: a cópia guardada no dia (escritorio_timbrado_json, 0890). */
export type EscritorioNoPapel = EscritorioDoTimbrado & {
  whatsapp: string | null;
  /** Só a cópia nova traz: sem ela, o carnê e o recibo saem com o desenho de antes. */
  comTimbrado?: boolean;
};

/** Um pedaço de linha. `inteiro`: CNPJ, OAB, CEP e telefones não quebram no meio (decisão 2). */
export interface Pedaco { texto: string; inteiro?: boolean }
export type LinhaDoPapel = Pedaco[];

/** As 4 linhas do timbrado aprovado. Uma linha sem nada é `[]`. */
export interface LinhasDoTimbrado { nome: string; documento: LinhaDoPapel; sede: LinhaDoPapel; contato: LinhaDoPapel }

const SEP: Pedaco = { texto: " · " };
const cheio = (s: string | null | undefined): s is string => !!s?.trim();
const digitos = (t: string) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

/** Junta os pedaços com " · ", só os que existem. */
function juntar(ps: (Pedaco | null)[]): LinhaDoPapel {
  const out: LinhaDoPapel = [];
  for (const p of ps) {
    if (!p || !p.texto) continue;
    if (out.length) out.push(SEP);
    out.push(p);
  }
  return out;
}

/** O texto corrido da linha (para comparar, para o texto alternativo e para os testes). */
export function textoDaLinha(l: LinhaDoPapel): string {
  return l.map((p) => p.texto).join("");
}

/** A OAB principal da sócia dona (a 0890 manda só ela; vale também para a lista inteira). */
function oabDaDona(e: EscritorioDoTimbrado): string | null {
  const i = e.dona?.inscricoes?.find((x) => x.tipo === "PRINCIPAL") ?? e.dona?.inscricoes?.[0];
  return i?.texto?.trim() || null;
}

/** A sede numa linha só, com o CEP inteiro. Sede incompleta: o que houver, sem "confira". */
function linhaSede(e: EscritorioDoTimbrado): LinhaDoPapel {
  const cep = (e.cep ?? "").replace(/\D/g, "");
  const cepTexto = cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : null;
  const completa = linhaDaSede({
    endereco: e.endereco, cidade: e.cidade, uf: e.uf, cep: e.cep, logradouro: e.logradouro, numero: e.numero,
    complemento: e.complemento, bairro: e.bairro, enderecoConfira: !!e.enderecoConfira,
  });
  if (completa && cepTexto && completa.endsWith(`, ${cepTexto}`)) {
    return [{ texto: `${completa.slice(0, -cepTexto.length)}` }, { texto: cepTexto, inteiro: true }];
  }
  const lugar = [e.cidade?.trim(), e.uf?.trim()].filter(Boolean).join("/");
  const partes = [e.endereco?.trim(), lugar].filter(cheio);
  if (!partes.length && !cepTexto) return [];
  const texto = partes.join(", ");
  return cepTexto ? [{ texto: texto ? `${texto}, ` : "" }, { texto: cepTexto, inteiro: true }].filter((p) => p.texto) : [{ texto }];
}

/** As 4 linhas do timbrado. `site: false` tira o site (o carnê, decisão 11). */
export function timbradoDoEscritorio(e: EscritorioDoTimbrado, o: { site?: boolean } = {}): LinhasDoTimbrado {
  const sem = e.tipo === "SEM_SOCIEDADE";
  const nome = sem
    ? e.dona?.dados?.nomeCompleto?.trim() || e.dona?.nome?.trim() || e.nome.trim()
    : e.razaoSocial?.trim() || e.nome.trim();
  let documento: LinhaDoPapel;
  if (sem) {
    const oab = oabDaDona(e);
    documento = oab ? [{ texto: oab, inteiro: true }, SEP, { texto: "sem CNPJ" }] : [{ texto: "sem CNPJ" }];
  } else {
    documento = juntar([e.cnpj ? { texto: `CNPJ ${cnpjFmt(e.cnpj)}`, inteiro: true } : null, cheio(e.oab) ? { texto: e.oab.trim(), inteiro: true } : null]);
  }
  const c = e.telefone || e.email ? { telefone: e.telefone, email: e.email } : e.contatos?.find((x) => x.telefone || x.email);
  const contato = juntar([
    c?.telefone ? { texto: telefoneFmt(c.telefone), inteiro: true } : null,
    c?.email ? { texto: c.email, inteiro: true } : null,
    o.site !== false && (e.telefone || e.email) && cheio(e.site) ? { texto: e.site.trim(), inteiro: true } : null,
  ]);
  return { nome, documento, sede: linhaSede(e), contato };
}

/** Tira marcação, acentos, maiúsculas e pontuação; "&" vale "e" (decisão 3). */
function normalizar(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "e").replace(/&/g, "e")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

/** A 1ª linha é igual à marca e não se repete (decisão 3). */
export function mesmoNome(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}

/** O "Advocacia" pequeno embaixo do nome em letra, só quando o nome curto não diz isso (decisão 4). */
export function subMarcaAdvocacia(nomeCurto: string): string | null {
  return /advoca|advoga/.test(normalizar(nomeCurto)) ? null : "Advocacia";
}

/** Acima disso, a letra da identificação fica um pouco menor (decisão 13). */
export const LIMITE_RAZAO_LONGA = 90;
export function razaoLonga(nome: string): boolean {
  return nome.trim().length > LIMITE_RAZAO_LONGA;
}

/** A linha da via do carnê, embaixo da marca: **razão social** · CNPJ · OAB (decisão 8). */
export function identificacaoDoCarne(e: EscritorioNoPapel): { nome: string | null; documento: LinhaDoPapel } | null {
  const t = timbradoDoEscritorio(e, { site: false });
  const nome = mesmoNome(t.nome, e.nome) ? null : t.nome;
  if (!nome && !t.documento.length) return null;
  return { nome, documento: t.documento };
}

/** O WhatsApp numa 5ª linha, só quando é diferente do telefone que já saiu (decisão 5, pergunta 4). */
function linhaWhatsapp(e: EscritorioNoPapel, contato: LinhaDoPapel): LinhaDoPapel | null {
  if (!e.whatsapp) return null;
  const w = digitos(e.whatsapp);
  if (contato.some((p) => p.inteiro && digitos(p.texto) === w)) return null;
  return [{ texto: "WhatsApp " }, { texto: telefoneFmt(e.whatsapp), inteiro: true }];
}

/** O bloco da direita do recibo: a 1ª linha em destaque (se não for igual à marca) e as outras. */
export function linhasDoTimbreRecibo(e: EscritorioNoPapel): { destaque: string | null; linhas: LinhaDoPapel[] } {
  const t = timbradoDoEscritorio(e);
  const linhas = [t.documento, t.sede, t.contato].filter((l) => l.length);
  const w = linhaWhatsapp(e, t.contato);
  if (w) linhas.push(w);
  return { destaque: mesmoNome(t.nome, e.nome) ? null : t.nome, linhas };
}

/** Quem assina o recibo (decisão 6): a razão social com "CNPJ · OAB"; sem sociedade, a sócia dona
 *  com a OAB dela (sem CPF); sem razão social, o nome curto com o CNPJ. */
export function assinaturaDoRecibo(e: EscritorioNoPapel): { nome: string; documento: LinhaDoPapel | null } {
  const t = timbradoDoEscritorio(e);
  if (e.tipo === "SEM_SOCIEDADE") {
    const oab = oabDaDona(e);
    return { nome: t.nome, documento: oab ? [{ texto: oab, inteiro: true }] : null };
  }
  return { nome: t.nome, documento: t.documento.length ? t.documento : null };
}

/** O campo "Escritório" da capa do carnê (decisões 10 e 11): o nome em negrito e as linhas, sem o site. */
export function camposDoEscritorioNaCapa(e: EscritorioNoPapel): { nome: string | null; linhas: LinhaDoPapel[] } {
  const t = timbradoDoEscritorio(e, { site: false });
  return { nome: mesmoNome(t.nome, e.nome) ? null : t.nome, linhas: [t.documento, t.sede, t.contato].filter((l) => l.length) };
}
