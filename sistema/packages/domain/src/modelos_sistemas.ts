// Os modelos dos outros sistemas (F3.56, VA-05), desenho aprovado em
// docs/design/aprovadas/portal-importacao-sistemas (Carol, 21/11/2026). O Astrea não publica as
// abas e colunas do backup, nem o ADVBOX as do relatório de clientes: os nomes abaixo são os do
// desenho (novembro de 2026), com sinônimos, e precisam ser conferidos com o backup real de um
// piloto. Um nome que não está aqui não é erro: a aba ou a coluna fica "não reconhecida" e a pessoa
// escolhe, e a ligação pelo nome (imp_sugerir, no banco) continua valendo.
// Não é dado de escritório: é configuração versionada no código.

import { z } from "zod";
import { CAMPO_TIPO_CONTATO, type AbaLida, type CampoImportacao, type DestinoAba, type TipoContato } from "./importacao.ts";

/** A chave de um nome: minúsculas, sem acento, sem pontuação nas pontas, espaços simples. */
export function chaveDeNome(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();
}

type Sinonimos = Partial<Record<CampoImportacao, string[]>>;

interface ModeloAba {
  destino: DestinoAba;
  nomes: string[];
  colunas?: Sinonimos;
}

interface Modelo {
  versao: string;
  abas: ModeloAba[];
}

/** Colunas de cadastro que os dois sistemas têm com nomes parecidos. */
const QUALIFICACAO: Sinonimos = {
  documento: ["cpf/cnpj", "cpf cnpj", "cpf ou cnpj", "cpf", "cnpj", "documento", "cpf/cnpj do cliente"],
  email: ["e mail", "email", "e mail principal", "email principal"],
  telefone: ["celular", "telefone", "telefone celular", "whatsapp", "fone", "telefone principal", "celular principal"],
  nacionalidade: ["nacionalidade"],
  estado_civil: ["estado civil"],
  profissao: ["profissao", "ocupacao"],
  rg: ["rg", "identidade", "documento de identidade"],
  rg_orgao: ["orgao emissor", "orgao expedidor", "emissor do rg"],
  cep: ["cep"],
  endereco: ["endereco", "logradouro", "rua"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio"],
  uf: ["uf", "estado"],
};

export const MODELO_ASTREA: Modelo = {
  versao: "astrea-2026-11",
  abas: [
    {
      destino: "CLIENTES",
      nomes: ["contatos", "contato", "clientes e contatos", "pessoas"],
      colunas: {
        nome: ["nome", "nome completo", "nome/razao social", "nome ou razao social", "razao social"],
        [CAMPO_TIPO_CONTATO]: ["tipo", "tipo de contato", "tipo do contato", "classificacao", "categoria"],
        ...QUALIFICACAO,
      },
    },
    { destino: "CASOS", nomes: ["processos", "processos e casos", "casos", "acoes"] },
    { destino: "FINANCEIRO", nomes: ["lancamentos", "financeiro", "lancamentos financeiros"] },
    { destino: "TAREFAS", nomes: ["tarefas", "atividades"] },
    { destino: "AGENDA", nomes: ["agenda", "compromissos", "prazos", "audiencias"] },
    { destino: "PUBLICACOES", nomes: ["publicacoes", "intimacoes", "andamentos"] },
  ],
};

/** O relatório de clientes que o ADVBOX exporta em planilha (uma aba). */
export const MODELO_ADVBOX_CLIENTES: Modelo = {
  versao: "advbox-2026-11",
  abas: [{
    destino: "CLIENTES",
    nomes: [],
    colunas: {
      nome: ["nome", "cliente", "nome do cliente", "nome/razao social", "razao social"],
      origem: ["origem", "origem do cliente", "como conheceu"],
      ...QUALIFICACAO,
    },
  }],
};

export type OrigemSistema = "ASTREA" | "ADVBOX_PLANILHA";
export const MODELOS: Record<OrigemSistema, Modelo> = { ASTREA: MODELO_ASTREA, ADVBOX_PLANILHA: MODELO_ADVBOX_CLIENTES };

/** As abas que ficam de fora sem nem chegar ao T3jus (decisão 7): tarefas, agenda e publicações. */
export const DESTINOS_NAO_LIDOS: readonly DestinoAba[] = ["TAREFAS", "AGENDA", "PUBLICACOES"];
/**
 * As abas que entram nesta versão. Processos (casos) e lançamentos (histórico financeiro) vêm nas
 * próximas entregas do F3.56; até lá, ficam de fora e não são lidas.
 */
export const DESTINOS_IMPORTAVEIS: readonly DestinoAba[] = ["CLIENTES"];

/** O destino de uma aba pelo nome, ou nulo se o modelo não a conhece. */
export function destinoDaAba(origem: OrigemSistema, nome: string): DestinoAba | null {
  const k = chaveDeNome(nome);
  return MODELOS[origem].abas.find((a) => a.nomes.includes(k))?.destino ?? null;
}

/** A ligação de cada coluna pelo modelo (índice -> campo), sem repetir campo. */
export function ligarPeloModelo(origem: OrigemSistema, destino: DestinoAba, colunas: readonly string[]): Record<string, CampoImportacao> {
  const sinonimos = MODELOS[origem].abas.find((a) => a.destino === destino)?.colunas ?? {};
  const r: Record<string, CampoImportacao> = {};
  const usado = new Set<CampoImportacao>();
  colunas.forEach((nome, i) => {
    const k = chaveDeNome(nome);
    const campo = (Object.entries(sinonimos) as [CampoImportacao, string[]][]).find(([c, ns]) => !usado.has(c) && ns.includes(k))?.[0];
    if (campo) {
      r[String(i)] = campo;
      usado.add(campo);
    }
  });
  return r;
}

/** A sugestão para cada valor do tipo de contato (a pessoa confirma no passo 2). */
export function sugerirTipoContato(valor: string): TipoContato {
  const k = chaveDeNome(valor);
  if (/^clientes?\b|^cliente /.test(k) || k === "cliente") return "CLIENTE";
  if (/contrari|adverso|^reu\b|^re\b|requerid|reclamad|executad|^parte/.test(k)) return "PARTE_CONTRARIA";
  return "FORA";
}

// ------------------------------------------------------------------------------- o backup lido

/**
 * O backup do Astrea é lido no navegador: ao T3jus chegam só as células das abas que podem entrar
 * (a de contatos e as não reconhecidas), mais o nome e o tamanho das outras. O corpo vai em JSON
 * comprimido (gzip), pelo mesmo caminho da planilha.
 */
export interface BackupLido {
  abas: { nome: string; linhas: number; colunas: string[] | null; celulas: string[][] | null }[];
}

const celula = z.string().max(2000);
export const backupLidoSchema = z.object({
  abas: z.array(z.object({
    nome: z.string().max(100),
    linhas: z.number().int().min(0).max(1_000_000),
    colunas: z.array(z.string().max(200)).max(60).nullable(),
    celulas: z.array(z.array(celula).max(60)).max(10000).nullable(),
  })).min(1).max(20),
});

/** No navegador: o que vai ao T3jus a partir das abas lidas (decisão 7: as de fora não vão). */
export function montarBackup(abas: readonly AbaLida[]): BackupLido {
  return {
    abas: abas.map((a) => {
      const destino = destinoDaAba("ASTREA", a.nome);
      const vai = destino === null || DESTINOS_IMPORTAVEIS.includes(destino);
      return { nome: a.nome, linhas: a.linhas.length, colunas: vai ? a.colunas : null, celulas: vai ? a.linhas : null };
    }),
  };
}

/** Comprime o JSON (gzip), para caber no limite do corpo do Portal. */
export async function comprimirJson(v: unknown): Promise<Uint8Array> {
  const s = new Blob([JSON.stringify(v)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Descomprime o JSON, parando se passar de `maximo` bytes (nulo se não for gzip válido ou passar). */
export async function descomprimirJson(b: Uint8Array, maximo: number): Promise<unknown> {
  if (b.length < 2 || b[0] !== 0x1f || b[1] !== 0x8b) return null;
  try {
    const leitor = new Blob([b.slice()]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > maximo) {
        await leitor.cancel();
        return null;
      }
      partes.push(value);
    }
    const tudo = new Uint8Array(total);
    let p = 0;
    for (const x of partes) {
      tudo.set(x, p);
      p += x.length;
    }
    return JSON.parse(new TextDecoder().decode(tudo));
  } catch {
    return null;
  }
}

/** Uma aba como o banco recebe, com o destino e o que o modelo ligou. */
export interface AbaParaOBanco {
  nome: string;
  linhas: number;
  destino: DestinoAba;
  reconhecida: boolean;
  lida: boolean;
  colunas: string[];
  celulas: string[][];
  porModelo: Record<string, CampoImportacao>;
}

/** No servidor: reconhece as abas e liga as colunas pelo modelo do sistema. */
export function prepararAbas(origem: OrigemSistema, abas: readonly { nome: string; linhas: number; colunas: string[] | null; celulas: string[][] | null }[]): AbaParaOBanco[] {
  return abas.map((a, i) => {
    const conhecido = origem === "ADVBOX_PLANILHA" ? (i === 0 ? "CLIENTES" : null) : destinoDaAba(origem, a.nome);
    const lida = a.colunas !== null && a.celulas !== null && (conhecido === null || DESTINOS_IMPORTAVEIS.includes(conhecido));
    const destino: DestinoAba = conhecido ?? "FORA";
    return {
      nome: a.nome.slice(0, 100),
      linhas: lida ? a.celulas!.length : a.linhas,
      destino,
      reconhecida: conhecido !== null,
      lida,
      colunas: lida ? a.colunas! : [],
      celulas: lida ? a.celulas! : [],
      porModelo: lida && conhecido ? ligarPeloModelo(origem, conhecido, a.colunas!) : {},
    };
  });
}
