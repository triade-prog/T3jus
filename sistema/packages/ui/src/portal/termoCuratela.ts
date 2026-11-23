// O termo de curatela na ficha do cliente (F3.118; AP-01, CH-08), pelo desenho aprovado em
// docs/design/aprovadas/portal-responsavel-legal (estados novo-curatela, ficha-curatela e
// gerar-curatela), sem "2 páginas" (o T3jus não conta as páginas; Carol, 23/11/2026).
// Um arquivo só, PDF ou foto, até 10 MB. A ficha é salva primeiro e o termo sobe depois: no
// cadastro o cliente ainda não existe, e o banco só aceita o termo de quem já está sob curatela.

import { ehCodigoErro, type TermoCuratela } from "@t3jus/domain";
import type { ErroApi } from "../api.ts";
import { enviarArquivo, tamanhoLegivel, tipoDoArquivo } from "../console/documentos.ts";
import { diferencasCliente, type RascunhoCliente } from "./clientes.ts";
import { chamarPortal } from "./Moldura.tsx";

/** O envio que caiu no meio (o PUT no Storage não chegou): o mesmo motivo do concluir. */
const NAO_CHEGOU: ErroApi = { codigo: "VALIDATION_ERROR", detalhes: { motivo: "ARQUIVO_NAO_CHEGOU" } };

export type EnvioTermo = { ok: true; termo: TermoCuratela } | { ok: false; erro: ErroApi };

/** Iniciar, mandar o arquivo direto ao Storage e concluir. */
export async function enviarTermoCuratela(cliente: string, arquivo: File): Promise<EnvioTermo> {
  const arquivoTipo = tipoDoArquivo(arquivo.name, arquivo.type);
  if (!arquivoTipo) return { ok: false, erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["arquivoTipo"] } } };
  const ini = await chamarPortal<{ id: string; enderecoDeEnvio: string }>(`/v1/escritorio/clientes/${cliente}/termo-curatela`, {
    metodo: "POST", corpo: { nome: arquivo.name, arquivoTipo, tamanho: arquivo.size },
  });
  if (!ini.ok) return { ok: false, erro: ini.erro };
  if (!(await enviarArquivo(ini.dados.enderecoDeEnvio, arquivo, arquivoTipo, () => {}))) return { ok: false, erro: NAO_CHEGOU };
  const fim = await chamarPortal<TermoCuratela>(`/v1/escritorio/clientes/documentos/${ini.dados.id}/concluir`, { metodo: "POST", corpo: {} });
  return fim.ok ? { ok: true, termo: fim.dados } : { ok: false, erro: fim.erro };
}

/** Pede o link de 60 s (a abertura fica no histórico) e baixa. */
export async function baixarTermoCuratela(id: string): Promise<{ ok: true } | { ok: false; erro: ErroApi }> {
  const r = await chamarPortal<{ url: string }>(`/v1/escritorio/clientes/documentos/${id}/abrir`, { metodo: "POST", corpo: {} });
  if (!r.ok) return { ok: false, erro: r.erro };
  window.location.assign(r.dados.url);
  return { ok: true };
}

/** "PDF · 380 KB" ou "Foto · 1,2 MB" (sem as páginas). */
export function descricaoArquivoTermo(nome: string, tipo: string, tamanho: number): string {
  const t = tipoDoArquivo(nome, tipo);
  return `${t === "application/pdf" ? "PDF" : "Foto"} · ${tamanhoLegivel(tamanho)}`;
}

/** "termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11", com o dia em São Paulo. */
export function metaTermoNaFicha(t: Pick<TermoCuratela, "nome" | "enviadoPor" | "enviadoEm">): string {
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(t.enviadoEm));
  return `${t.nome} · enviado${t.enviadoPor?.nome ? ` por ${t.enviadoPor.nome}` : ""} em ${dia}`;
}

/** Salvar a ficha mudou algum dado? Sem mudança, o aviso fala só do termo (revisão, M7). */
export function fichaMudou(antes: RascunhoCliente, depois: RascunhoCliente): boolean {
  return diferencasCliente(antes, depois).length > 0 || antes.tipo !== depois.tipo || antes.rlMoraJunto !== depois.rlMoraJunto
    || antes.principal !== depois.principal || JSON.stringify(antes.contatos) !== JSON.stringify(depois.contatos);
}

/**
 * O código do erro do envio vai no endereço (?termo=<código>) para a ficha dizer o que houve: o
 * motivo, quando houver, senão o código da API.
 */
export function codigoDoErroDoTermo(e: ErroApi): string {
  const m = e.detalhes?.motivo;
  return typeof m === "string" && /^[A-Z_]{1,40}$/.test(m) ? m : e.codigo;
}

/** O inverso: o código lido do endereço vira o erro que textoDoErro entende. */
export function erroDoCodigoDoTermo(codigo: string | null | undefined): ErroApi | null {
  if (!codigo || !/^[A-Z_]{1,40}$/.test(codigo)) return null;
  return ehCodigoErro(codigo) ? { codigo } : { codigo: "VALIDATION_ERROR", detalhes: { motivo: codigo } };
}

/**
 * O termo que não foi guardado depois de salvar a ficha (desenho aprovado em
 * docs/design/aprovadas/portal-termo-curatela, item 1): o caso que o erro do envio indica. A frase
 * é fixa por caso; a mensagem do servidor não entra no aviso.
 */
export type CasoTermoQueFalhou = "ARQUIVO" | "CONEXAO" | "NAO_CURATELA" | "SESSAO" | "PERMISSAO" | "OUTRO";

export function casoDoTermoQueFalhou(e: ErroApi | null | undefined): CasoTermoQueFalhou {
  const m = typeof e?.detalhes?.motivo === "string" ? e.detalhes.motivo : null;
  if (m === "ARQUIVO_NAO_CHEGOU") return "CONEXAO"; // o envio caiu no meio
  if (m === "CLIENTE_NAO_CURATELA") return "NAO_CURATELA";
  switch (e?.codigo) {
    // Recusa do arquivo (tipo, tamanho, vazio); um motivo que não é do arquivo cai em "outro".
    case "VALIDATION_ERROR": return !m || m.startsWith("ARQUIVO_") ? "ARQUIVO" : "OUTRO";
    case "UPSTREAM_UNAVAILABLE": return "CONEXAO";
    case "UNAUTHORIZED": return "SESSAO";
    case "FORBIDDEN": return "PERMISSAO";
    default: return "OUTRO";
  }
}

/** A frase do aviso, com o primeiro nome do cliente onde o desenho pede. */
export function fraseDoTermoQueFalhou(e: ErroApi | null | undefined, primeiro: string): string {
  const mande = ` Mande de novo em “Mudar”, na folha Quem assina por ${primeiro}.`;
  const inicio = "O termo de curatela não foi guardado:";
  switch (casoDoTermoQueFalhou(e)) {
    case "ARQUIVO": return `${inicio} o arquivo precisa ser PDF ou foto, até 10 MB.${mande}`;
    case "CONEXAO": return `${inicio} não deu para falar com o T3jus.${mande}`;
    case "NAO_CURATELA": return `${inicio} ${primeiro} não está mais sob curatela na ficha.`;
    case "SESSAO": return `${inicio} sua sessão terminou. Entre de novo para enviar o termo.`;
    case "PERMISSAO": return `${inicio} o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos.`;
    case "OUTRO": return `${inicio} algo deu errado do nosso lado.${mande}`;
  }
}
