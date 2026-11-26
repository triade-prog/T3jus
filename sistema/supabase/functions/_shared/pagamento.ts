// A porta do meio de pagamento da cobrança dos escritórios (F1.21, CO-06). O banco decide o que
// emitir e o que cancelar (0693); esta peça só fala com o meio de pagamento escolhido. Hoje ele
// está desligado: nada é emitido e a baixa continua manual.
//
// Escolha da Carol (22/11/2026): Pix e boleto pelo Inter Empresas (boleto com Pix). A peça do
// Inter está abaixo, ainda sem credenciais; ela só liga com os segredos INTER_* nas funções e com
// configuracoes.meio_pagamento = 'inter' no banco.

import { diaBrasilia, ErroDominio } from "@t3jus/domain";

/** O que o banco manda emitir (rotina_cobranca_codigos_pendentes). */
export interface PedidoCobranca {
  /** Id da fatura ou da parcela no T3jus. */
  id: string;
  acao: "EMITIR_FATURA" | "EMITIR_PARCELA";
  /** Já emitida lá, mas sem os códigos ainda (a emissão do Inter é assíncrona): só buscar os códigos. */
  pagamentoId: string | null;
  valorCentavos: number;
  /** AAAA-MM-DD */
  vencimento: string;
  descricao: string;
  pagador: {
    nome: string;
    cnpj: string | null;
    email: string;
    /** O boleto registrado pede o endereço do pagador; a assinatura ainda não o guarda. */
    endereco?: EnderecoPagador | null;
  };
}

export interface EnderecoPagador {
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  uf: string;
  cep: string;
}

/** O que o meio de pagamento devolve ao emitir. */
export interface CobrancaEmitida {
  pagamentoId: string;
  pixCopiaCola: string | null;
  linhaBoleto: string | null;
  codigoBarras: string | null;
  boletoUrl: string | null;
}

/** A situação de uma cobrança lida no próprio meio de pagamento (fonte da baixa automática). */
export interface SituacaoCobranca {
  pagamentoId: string;
  situacao: "A_PAGAR" | "PAGA" | "CANCELADA" | "EXPIRADA";
  /** Só quando PAGA. */
  pagoEm?: string;
  valorPagoCentavos?: number;
  forma?: "PIX" | "BOLETO";
}

export interface MeioPagamento {
  /** O mesmo nome de configuracoes.meio_pagamento. */
  readonly nome: string;
  emitir(p: PedidoCobranca): Promise<CobrancaEmitida>;
  cancelar(pagamentoId: string, motivo: string): Promise<void>;
  /** Lê a cobrança no meio de pagamento. A baixa só confia nesta leitura, nunca no corpo do aviso. */
  consultar(pagamentoId: string): Promise<SituacaoCobranca>;
  /**
   * Tira do aviso recebido só os códigos das cobranças citadas. Devolve null se o aviso não for
   * deste meio (chave errada). A situação de cada uma é lida de novo com `consultar`.
   */
  codigosDoAviso(pedido: Request, corpo: unknown): string[] | null;
}

/** O meio desligado: a fila do banco vem vazia, então nada chega aqui; se chegar, recusa. */
export const meioDesligado: MeioPagamento = {
  nome: "desligado",
  emitir: () => Promise.reject(new ErroDominio("VALIDATION_ERROR", { motivo: "MEIO_DE_PAGAMENTO_DESLIGADO" })),
  cancelar: () => Promise.reject(new ErroDominio("VALIDATION_ERROR", { motivo: "MEIO_DE_PAGAMENTO_DESLIGADO" })),
  consultar: () => Promise.reject(new ErroDominio("VALIDATION_ERROR", { motivo: "MEIO_DE_PAGAMENTO_DESLIGADO" })),
  codigosDoAviso: () => null,
};

/** Comparação em tempo constante da chave do aviso. */
function chaveConfere(recebida: string | null, esperada: string): boolean {
  if (!recebida || !esperada) return false;
  const a = new TextEncoder().encode(recebida);
  const b = new TextEncoder().encode(esperada);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

const reais = (centavos: number) => Number((centavos / 100).toFixed(2));
const centavos = (v: unknown) => Math.round(Number(v ?? 0) * 100);

// -------------------------------------------------------------------------------------------
// Inter Empresas: API de Cobrança v3 (boleto com Pix).
//
// A CONFERIR NO SANDBOX antes de ligar: os caminhos e campos abaixo seguem a API de Cobrança v3
// do Inter como ela era conhecida até 2026, mas a documentação (developers.inter.co) não pôde ser
// lida daqui. As chamadas exigem o certificado da integração (mTLS): o `buscar` recebido já vem
// com o certificado e a chave (Deno.createHttpClient no index.ts).

export interface ConfigInter {
  clientId: string;
  clientSecret: string;
  /** Número da conta corrente (cabeçalho x-conta-corrente), quando a integração tem mais de uma. */
  conta?: string | null;
  /** Chave que vai no endereço do aviso (?chave=...), para descartar chamada que não é do Inter. */
  chaveAviso: string;
  base?: string;
}

const BASE_INTER = "https://cdpj.partners.bancointer.com.br";
const ESCOPOS_INTER = "boleto-cobranca.read boleto-cobranca.write";

export function meioInter(cfg: ConfigInter, buscar: typeof fetch = fetch): MeioPagamento {
  const base = cfg.base ?? BASE_INTER;
  let token: { valor: string; ate: number } | null = null;

  async function autenticar(): Promise<string> {
    if (token && token.ate > Date.now() + 60_000) return token.valor;
    const r = await buscar(`${base}/oauth/v2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "client_credentials", scope: ESCOPOS_INTER }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Inter recusou o token (${r.status})`);
    const j = await r.json() as { access_token: string; expires_in?: number };
    token = { valor: j.access_token, ate: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return token.valor;
  }

  async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const r = await buscar(`${base}${caminho}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${await autenticar()}`,
        "content-type": "application/json",
        ...(cfg.conta ? { "x-conta-corrente": cfg.conta } : {}),
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Inter respondeu ${r.status} em ${metodo} ${caminho.split("?")[0]}`);
    const texto = await r.text();
    return (texto ? JSON.parse(texto) : {}) as T;
  }

  interface CobrancaInter {
    cobranca?: { codigoSolicitacao?: string; situacao?: string; valorTotalRecebido?: number | string; dataSituacao?: string | null; origemRecebimento?: string };
    boleto?: { linhaDigitavel?: string; codigoBarras?: string };
    pix?: { pixCopiaECola?: string };
  }

  async function consultar(pagamentoId: string): Promise<SituacaoCobranca> {
    const j = await chamar<CobrancaInter>("GET", `/cobranca/v3/cobrancas/${encodeURIComponent(pagamentoId)}`);
    const s = (j.cobranca?.situacao ?? "").toUpperCase();
    if (s === "RECEBIDO" || s === "MARCADO_RECEBIDO") {
      return {
        pagamentoId, situacao: "PAGA",
        // Não há documentação do formato no repositório: data pura ou instante, sai o dia de Brasília (F3.182).
        pagoEm: diaBrasilia(j.cobranca?.dataSituacao ?? ""),
        valorPagoCentavos: centavos(j.cobranca?.valorTotalRecebido),
        forma: (j.cobranca?.origemRecebimento ?? "").toUpperCase() === "PIX" ? "PIX" : "BOLETO",
      };
    }
    if (s === "CANCELADO") return { pagamentoId, situacao: "CANCELADA" };
    if (s === "EXPIRADO") return { pagamentoId, situacao: "EXPIRADA" };
    return { pagamentoId, situacao: "A_PAGAR" };
  }

  async function codigos(pagamentoId: string): Promise<CobrancaEmitida> {
    const j = await chamar<CobrancaInter>("GET", `/cobranca/v3/cobrancas/${encodeURIComponent(pagamentoId)}`);
    return {
      pagamentoId,
      pixCopiaCola: j.pix?.pixCopiaECola ?? null,
      linhaBoleto: j.boleto?.linhaDigitavel ?? null,
      codigoBarras: j.boleto?.codigoBarras ?? null,
      boletoUrl: null,
    };
  }

  return {
    nome: "inter",
    async emitir(p) {
      if (p.pagamentoId) return await codigos(p.pagamentoId);
      const e = p.pagador.endereco;
      if (!p.pagador.cnpj) throw new ErroDominio("VALIDATION_ERROR", { motivo: "PAGADOR_SEM_CNPJ" });
      if (!e) throw new ErroDominio("VALIDATION_ERROR", { motivo: "PAGADOR_SEM_ENDERECO" });
      const { codigoSolicitacao } = await chamar<{ codigoSolicitacao: string }>("POST", "/cobranca/v3/cobrancas", {
        // seuNumero tem até 15 caracteres: a referência curta do T3jus.
        seuNumero: `T3${p.acao === "EMITIR_FATURA" ? "F" : "P"}${p.id.replace(/-/g, "").slice(0, 12)}`,
        valorNominal: reais(p.valorCentavos),
        dataVencimento: p.vencimento,
        numDiasAgenda: 60,
        pagador: {
          cpfCnpj: p.pagador.cnpj, tipoPessoa: "JURIDICA", nome: p.pagador.nome.slice(0, 100), email: p.pagador.email,
          endereco: e.logradouro, numero: e.numero ?? "", complemento: e.complemento ?? "", bairro: e.bairro ?? "",
          cidade: e.cidade, uf: e.uf, cep: e.cep.replace(/\D/g, ""),
        },
        mensagem: { linha1: p.descricao.slice(0, 78) },
      });
      // A emissão é assíncrona no Inter: os códigos vêm na consulta. Se ainda não vierem, o
      // código fica gravado e a próxima rodada busca só os códigos, sem emitir de novo.
      return await codigos(codigoSolicitacao).catch(() => ({ pagamentoId: codigoSolicitacao, pixCopiaCola: null, linhaBoleto: null, codigoBarras: null, boletoUrl: null }));
    },
    async cancelar(pagamentoId, motivo) {
      await chamar("POST", `/cobranca/v3/cobrancas/${encodeURIComponent(pagamentoId)}/cancelar`, { motivoCancelamento: motivo.slice(0, 50) });
    },
    consultar,
    codigosDoAviso(pedido, corpo) {
      if (!chaveConfere(new URL(pedido.url).searchParams.get("chave"), cfg.chaveAviso)) return null;
      const lista = Array.isArray(corpo) ? corpo : [corpo];
      return lista
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>).codigoSolicitacao : null))
        .filter((c): c is string => typeof c === "string" && c.length > 0 && c.length <= 120)
        .slice(0, 50);
    },
  };
}
