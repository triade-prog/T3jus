// Editar a ficha vindo de Gerar documentos (F3.160; AP-01, CH-08): as rotas de ida e de volta, o
// que a ficha lê do endereço e as escolhas de Gerar guardadas na aba do navegador. Sem React, para
// os testes de unidade. Desenho aprovado em docs/design/aprovadas/portal-editar-vindo-de-gerar.
//
// Segurança: a volta nunca leva um caminho nem uma URL. O endereço só traz um tipo fixo
// (de=gerar), o UUID do contrato e valores de listas fixas; o destino é sempre montado aqui.
//
// O que vai para o sessionStorage (só no clique de um link de volta, e só nesta aba), campo a campo:
// - v: a versão do formato (1);
// - em: a hora da gravação, em milissegundos;
// - clienteId: o id do cliente do contrato, para não restaurar se o contrato mudou de cliente;
// - assinadas: as chaves dos documentos que já tinham o assinado ("CONTRATO", "PROCURACAO", "OUTRO:<id>");
// - form: docs (as mesmas chaves), outorgados (ids de advogados e de inscrições), poderes (códigos),
//   outroPoder (o texto livre que a pessoa escreveu para o documento), cidadeData (a cidade do escritório e a data)
//   e, desde a CH-14, area (a área do seletor "Sugestão para", da lista fixa) e mexeu (se a pessoa mexeu nas caixas).
//   Os dois são opcionais e não sobem o v: sem eles, valem a área da sugestão e "não mexeu";
// - aba: o número da aba da prévia;
// - foco: o id fixo do link de onde a pessoa saiu.
// Nenhum nome, CPF ou outro dado do cliente vai junto. As chaves t3jus.gerar.* saem ao ler, ao gerar,
// em "Trocar contrato", ao sair da conta, na sessão vencida e ao trocar de escritório.

import { AREAS_DIREITO, CODIGOS_PODERES, situacaoNoDia, type AreaDireito, type ClienteDoDocumento, type DadosDocumentos, type PoderEspecial } from "@t3jus/domain";
import { chaveModelo, chavesAssinadas, faltasDeQuemAssina, juntar, type FormDocumentos } from "./procuracoes.ts";
import { lerData, type RascunhoCliente } from "./clientes.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A parte da ficha de onde a pessoa veio (D9): o cursor vai para o primeiro campo que falta dela. */
export const PARTES_FICHA = ["rl", "cliente", "pj"] as const;
export type ParteFicha = (typeof PARTES_FICHA)[number];

/** Os links de volta em Gerar, com id fixo para o foco voltar a eles. */
export const IDS_VOLTA = ["volta-quadro", "volta-falta-rl", "volta-falta-cliente", "volta-pj", "volta-fez18", "volta-resultado"] as const;
export type IdVolta = (typeof IDS_VOLTA)[number];

const GERAR = "/contratos/modelos/gerar";

/** Gerar → ficha: o editar (com a parte) ou a janela "agora assina por si" do fez 18 (D6). */
export function rotaFichaDeGerar(clienteId: string, contratoId: string, modo: "editar" | "por-si", campo?: ParteFicha): string {
  const q = new URLSearchParams(modo === "editar" ? { editar: "1" } : { janela: "por-si" });
  q.set("de", "gerar");
  q.set("contrato", contratoId);
  if (modo === "editar" && campo && PARTES_FICHA.includes(campo)) q.set("campo", campo);
  return `/clientes/${clienteId}?${q}`;
}

/**
 * Ficha → Gerar, sempre com o marcador das escolhas. "salva": a ficha foi salva (aviso de salvo);
 * "ficou": a pessoa ficou com a versão que outra pessoa salvou; null: cancelou ou nada mudou.
 */
export function voltaParaGerar(contrato: string, como: "salva" | "ficou" | null): string {
  const c = UUID.test(contrato) ? contrato.toLowerCase() : "";
  if (!c) return GERAR;
  return `${GERAR}?contrato=${c}&escolhas=1${como ? `&ficha=${como}` : ""}`;
}

export interface VoltaDeGerar { contrato: string; campo: ParteFicha | null; janela: boolean }
type Busca = Record<string, string | string[] | undefined>;
const um = (x: string | string[] | undefined) => (typeof x === "string" ? x : null);

/** O que a ficha aceita do endereço: só de=gerar com o UUID do contrato; o resto abre a ficha normal. */
export function lerVoltaDeGerar(q: Busca): VoltaDeGerar | null {
  if (um(q.de) !== "gerar") return null;
  const c = um(q.contrato);
  if (!c || !UUID.test(c)) return null;
  const campo = um(q.campo);
  return { contrato: c.toLowerCase(), campo: PARTES_FICHA.find((p) => p === campo) ?? null, janela: um(q.janela) === "por-si" };
}

export interface RetornoEmGerar { escolhas: boolean; ficha: "salva" | "ficou" | null }

/** O que Gerar aceita do endereço na volta: o marcador das escolhas e como a ficha ficou. */
export function lerRetornoEmGerar(q: Busca): RetornoEmGerar {
  const f = um(q.ficha);
  return { escolhas: um(q.escolhas) === "1", ficha: f === "salva" || f === "ficou" ? f : null };
}

// ------------------------------------------------------------------------- as escolhas guardadas

export const PREFIXO_ESCOLHAS = "t3jus.gerar.";
export const chaveEscolhas = (contrato: string) => `${PREFIXO_ESCOLHAS}${contrato}`;
/** Cinto de segurança: escolhas com mais de 2 horas não voltam (a regra principal é o marcador). */
export const VALIDADE_ESCOLHAS_MS = 2 * 60 * 60 * 1000;

export interface EscolhasGuardadas {
  v: 1;
  em: number;
  clienteId: string;
  assinadas: string[];
  form: FormDocumentos;
  aba: number;
  foco: IdVolta | null;
}

export function montarEscolhas(d: DadosDocumentos, form: FormDocumentos, aba: number, foco: IdVolta, agora = Date.now()): EscolhasGuardadas {
  return { v: 1, em: agora, clienteId: d.cliente.id, assinadas: [...chavesAssinadas(d)], form, aba, foco };
}

const texto = (x: unknown, max: number) => (typeof x === "string" && x.length <= max ? x : null);

/**
 * As escolhas passam pelos dados de agora (revisão, ajuste 5): só modelos que existem, tirando o que
 * ficou assinado depois de a pessoa sair (o que já era assinado e ela marcou de novo fica); só
 * advogados e inscrições que existem; poderes da lista; textos dentro do limite do formulário.
 */
export function filtrarFormDocumentos(form: FormDocumentos, d: DadosDocumentos, assinadasAntes: readonly string[]): FormDocumentos {
  const disponiveis = new Set(d.modelos.map(chaveModelo));
  const agora = chavesAssinadas(d);
  const antes = new Set(assinadasAntes);
  const docs = form.docs.filter((k, i, l) => disponiveis.has(k) && l.indexOf(k) === i && !(agora.has(k) && !antes.has(k)));
  const outorgados: Record<string, string[]> = {};
  for (const a of d.advogados) {
    const ids = form.outorgados[a.pessoaId];
    if (!Array.isArray(ids)) continue;
    const ok = ids.filter((i, n, l) => a.inscricoes.some((x) => x.id === i) && l.indexOf(i) === n);
    if (ok.length) outorgados[a.pessoaId] = ok;
  }
  return {
    docs,
    outorgados,
    poderes: CODIGOS_PODERES.filter((p) => form.poderes.includes(p)),
    outroPoder: form.outroPoder,
    cidadeData: form.cidadeData,
    // CH-14: a área só da lista fixa; sem ela (escolhas de antes), a da sugestão de agora.
    area: areaValida(form.area) ?? d.sugestao?.area ?? null,
    mexeu: form.mexeu === true,
  };
}

/** A área guardada, só se for uma da lista fixa (CH-14). */
function areaValida(a: unknown): AreaDireito | null {
  return typeof a === "string" && Object.hasOwn(AREAS_DIREITO, a) ? (a as AreaDireito) : null;
}

/** As escolhas guardadas, conferidas (revisão, ajustes 5 e 7). Qualquer coisa fora do formato: null. */
export function escolhasGuardadasValidas(bruto: unknown, d: DadosDocumentos, agora = Date.now()): { form: FormDocumentos; aba: number; foco: IdVolta | null } | null {
  if (!bruto || typeof bruto !== "object") return null;
  const x = bruto as Partial<Record<keyof EscolhasGuardadas, unknown>>;
  if (x.v !== 1) return null;
  if (typeof x.em !== "number" || !Number.isFinite(x.em) || x.em > agora + 60_000 || agora - x.em > VALIDADE_ESCOLHAS_MS) return null;
  if (x.clienteId !== d.cliente.id) return null;
  if (!Array.isArray(x.assinadas) || !x.assinadas.every((k) => typeof k === "string")) return null;
  const f = x.form as Partial<Record<keyof FormDocumentos, unknown>> | undefined;
  if (!f || typeof f !== "object") return null;
  if (!Array.isArray(f.docs) || !f.docs.every((k) => typeof k === "string")) return null;
  if (!f.outorgados || typeof f.outorgados !== "object" || Array.isArray(f.outorgados)) return null;
  const outorgados: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(f.outorgados as Record<string, unknown>)) {
    if (!Array.isArray(v) || !v.every((i) => typeof i === "string")) return null;
    outorgados[k] = v as string[];
  }
  if (!Array.isArray(f.poderes) || !f.poderes.every((p) => typeof p === "string")) return null;
  const outroPoder = texto(f.outroPoder, 300);
  const cidadeData = texto(f.cidadeData, 120);
  if (outroPoder === null || cidadeData === null) return null;
  // CH-14: area e mexeu são opcionais; fora do formato, contam como ausentes (área da sugestão, não mexeu).
  const form = filtrarFormDocumentos({
    docs: f.docs as string[], outorgados, poderes: f.poderes as PoderEspecial[], outroPoder, cidadeData,
    area: areaValida(f.area), mexeu: f.mexeu === true,
  }, d, x.assinadas as string[]);
  const aba = typeof x.aba === "number" && Number.isInteger(x.aba) && x.aba >= 0 && x.aba < Math.max(1, form.docs.length) ? x.aba : 0;
  const foco = IDS_VOLTA.find((i) => i === x.foco) ?? null;
  return { form, aba, foco };
}

/** O sessionStorage da aba, ou null quando o navegador o bloqueia (modo privado, armazenamento desligado). */
function armazenamento(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Grava as escolhas no clique de um link de volta. Falhar não impede a ida. */
export function guardarEscolhas(contrato: string, e: EscolhasGuardadas): void {
  try {
    armazenamento()?.setItem(chaveEscolhas(contrato), JSON.stringify(e));
  } catch {
    // Sem armazenamento, a volta abre Gerar com o padrão.
  }
}

/** Lê e apaga as escolhas do contrato. JSON quebrado ou armazenamento bloqueado: null. */
export function lerEscolhasGuardadas(contrato: string): unknown {
  const s = armazenamento();
  if (!s) return null;
  try {
    const bruto = s.getItem(chaveEscolhas(contrato));
    s.removeItem(chaveEscolhas(contrato));
    return bruto ? (JSON.parse(bruto) as unknown) : null;
  } catch {
    return null;
  }
}

/** Apaga uma chave (ao gerar, em "Trocar contrato") ou todas as t3jus.gerar.* (sair, sessão vencida, trocar de escritório). */
export function limparEscolhasGuardadas(contrato?: string): void {
  const s = armazenamento();
  if (!s) return;
  try {
    if (contrato) return s.removeItem(chaveEscolhas(contrato));
    const chaves: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIXO_ESCOLHAS)) chaves.push(k);
    }
    for (const k of chaves) s.removeItem(k);
  } catch {
    // Nada a fazer.
  }
}

// ------------------------------------------------------------------------- textos

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
/** Na pessoa física, o primeiro nome; na empresa, o nome inteiro (revisão, ajuste 11). */
export const nomeNaVolta = (c: Pick<ClienteDoDocumento, "nome" | "tipo">) => (c.tipo === "PJ" ? c.nome.trim() : primeiroNome(c.nome));

/** "Ficha de Pedro salva." / "Ficha de Farmácia Bom Jesus Ltda. salva." (D8). */
export const tituloFichaSalva = (c: Pick<ClienteDoDocumento, "nome" | "tipo">) => `Ficha de ${nomeNaVolta(c)} salva.`;

/** "CPF e RG de Joana", para o nome acessível de "Completar na ficha". */
export function semArtigos(l: readonly string[]): string {
  return juntar(l.map((x) => x.replace(/^(o|a|os|as) /, "")));
}

/** O nome acessível do "Completar na ficha" do aviso de quem assina: ": CPF e RG de Joana". */
export function completarQuemAssina(c: ClienteDoDocumento): string {
  const r = c.rlNome?.trim() ? primeiroNome(c.rlNome) : "quem assina";
  return `: ${semArtigos(faltasDeQuemAssina(c).map((x) => x.curta))} de ${r}`;
}

// ------------------------------------------------------------------------- a ficha no editar (D9)

type CampoDaFicha = Exclude<keyof RascunhoCliente, "tipo" | "contatos" | "principal" | "rlMoraJunto">;
export interface FaltaNaFicha { campo: CampoDaFicha; curta: string }

const vazio = (s: string) => !s.trim();

/**
 * O que falta na parte da ficha de onde a pessoa veio, na ordem do formulário (D9). É a mesma conta
 * de Gerar (faltasNoDocumento e faltasDoResponsavel), campo a campo, para o selo "Falta" e o cursor.
 */
export function faltasDaParte(r: RascunhoCliente, parte: ParteFicha, hoje: string): FaltaNaFicha[] {
  const f: FaltaNaFicha[] = [];
  const add = (campo: CampoDaFicha, curta: string) => { if (vazio(r[campo])) f.push({ campo, curta }); };
  if (parte === "pj" || (parte === "cliente" && r.tipo === "PJ")) {
    if (parte === "cliente") {
      add("documento", "o CNPJ");
      add("endereco", "o endereço");
    }
    add("repNome", parte === "pj" ? "o nome" : "quem assina");
    add("repCargo", "o cargo");
    add("repDocumento", parte === "pj" ? "o CPF" : "o CPF de quem assina");
    return f;
  }
  const cap = r.capacidade;
  if (parte === "rl") {
    if (r.tipo !== "PF" || (cap !== "MENOR" && cap !== "CURATELA")) return f;
    add("rlNome", "o nome");
    add("rlDocumento", "o CPF");
    add("rlRg", "o RG");
    add("rlNacionalidade", "a nacionalidade");
    add("rlEstadoCivil", "o estado civil");
    add("rlProfissao", "a profissão");
    if (!r.rlMoraJunto) add("rlEndereco", "o endereço");
    return f;
  }
  const sit = cap === "MENOR" ? situacaoNoDia("MENOR", lerData(r.nascimento), hoje).situacao : null;
  const menor = cap === "MENOR" && sit !== "FEZ_18";
  add("documento", "o CPF");
  if (menor) add("nascimento", "a data de nascimento");
  add("nacionalidade", "a nacionalidade");
  if (!menor) {
    add("estadoCivil", "o estado civil");
    add("profissao", "a profissão");
    add("rg", "o RG");
  }
  add("endereco", "o endereço");
  return f;
}

/** O campo que recebe o cursor ao abrir: o primeiro que falta da parte, senão o primeiro dela (D9). */
export function campoDoCursor(r: RascunhoCliente, parte: ParteFicha | null, hoje: string): CampoDaFicha {
  if (!parte) return "nome";
  const f = faltasDaParte(r, parte, hoje)[0];
  if (f) return f.campo;
  if (parte === "pj") return "repNome";
  if (parte === "rl" && r.tipo === "PF" && (r.capacidade === "MENOR" || r.capacidade === "CURATELA")) return "rlNome";
  return "nome";
}

/** "no CPF", "na nacionalidade", "em quem assina". */
const noCampo = (curta: string) => (curta.startsWith("o ") ? `no ${curta.slice(2)}` : curta.startsWith("a ") ? `na ${curta.slice(2)}` : `em ${curta}`);

/** O texto do aviso "Você veio de Gerar documentos." no editar (D9). */
export function textoVeioDeGerar(r: RascunhoCliente, parte: ParteFicha | null, hoje: string): string {
  const depois = "Ao salvar, você volta para lá, com a prévia já com os dados novos.";
  if (parte === "pj" && r.tipo === "PJ") return `O cursor já está em “Quem assina pela empresa”. ${depois}`;
  const f = parte ? faltasDaParte(r, parte, hoje) : [];
  if (!f.length) return "Ao salvar, volta para lá, com a prévia já com os dados novos.";
  const de = parte === "rl" ? (r.rlNome.trim() ? primeiroNome(r.rlNome) : "quem assina") : r.tipo === "PJ" ? r.nome.trim() : primeiroNome(r.nome);
  return `${f.length === 1 ? "Falta" : "Faltam"} ${juntar(f.map((x) => x.curta))} de ${de}: o cursor já está ${noCampo(f[0]!.curta)}. ${depois}`;
}
