// Acesso ao banco: só chamadas de funções (RPC do PostgREST com a chave de serviço). A regra
// que não pode falhar fica no banco; a chave de serviço não lê nenhuma tabela direto (0002).

import { ErroDominio, ERROS_BANCO } from "@t3jus/domain";

export class ErroBanco extends Error {
  constructor(readonly codigo: string, mensagem: string, readonly detalhe?: string) {
    super(mensagem);
    this.name = "ErroBanco";
  }
}

export interface Banco {
  /** tempoMs: quanto esperar pela resposta (padrão 8 s; a exportação dos dados espera mais). */
  rpc<T>(funcao: string, args?: Record<string, unknown>, tempoMs?: number): Promise<T>;
}

export function bancoPostgrest(url: string, chaveServico: string, buscar: typeof fetch = fetch): Banco {
  return {
    async rpc<T>(funcao: string, args: Record<string, unknown> = {}, tempoMs = 8000): Promise<T> {
      if (!/^[a-z_][a-z0-9_]*$/.test(funcao)) throw new Error("Nome de função inválido");
      const r = await buscar(`${url}/rest/v1/rpc/${funcao}`, {
        method: "POST",
        headers: { apikey: chaveServico, authorization: `Bearer ${chaveServico}`, "content-type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(tempoMs),
      });
      const texto = await r.text();
      const corpo = texto ? JSON.parse(texto) : null;
      if (!r.ok) {
        throw new ErroBanco(String(corpo?.code ?? r.status), String(corpo?.message ?? "erro no banco"), corpo?.details ?? undefined);
      }
      return corpo as T;
    },
  };
}

/**
 * Erro do banco com código próprio (TC401, TC404, TC409, TC422, TC023) vira o erro da API. No
 * conflito de versão (PT-19), o detalhe traz a versão nova e o registro atual; no dado
 * inválido, os campos ou o motivo da recusa, para a tela dizer o que fazer.
 */
export function traduzirErroBanco(e: ErroBanco): ErroDominio | null {
  const codigo = ERROS_BANCO[e.codigo];
  if (!codigo) return null;
  if ((codigo === "VERSION_CONFLICT" || codigo === "VALIDATION_ERROR") && e.detalhe) {
    try {
      const detalhe = JSON.parse(e.detalhe);
      if (detalhe && typeof detalhe === "object" && !Array.isArray(detalhe)) return new ErroDominio(codigo, detalhe);
    } catch {
      // detalhe sem JSON: segue sem detalhes
    }
  }
  // Na recusa de permissão, só o motivo passa (ex.: AREA_NAO_LIBERADA), para a tela explicar.
  if (codigo === "FORBIDDEN" && e.detalhe) {
    try {
      const motivo = JSON.parse(e.detalhe)?.motivo;
      if (typeof motivo === "string" && /^[A-Z_]{1,40}$/.test(motivo)) return new ErroDominio(codigo, { motivo });
    } catch {
      // sem motivo
    }
  }
  return new ErroDominio(codigo);
}
