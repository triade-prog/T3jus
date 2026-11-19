// Contrato e documentos do cliente (CO-05): o que a tela confere antes de enviar e como mostra
// cada arquivo. O servidor confere de novo; isto só poupa a viagem.

import { TAMANHO_MAXIMO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "@t3jus/domain";

export interface DocumentoCliente {
  id: string;
  categoria: string;
  nome: string;
  tipo: string;
  tamanho: number;
  enviadoPor: { id: string; nome: string | null };
  enviadoEm: string;
}

/** "486 KB", "1,2 MB". */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/** "PDF", "Imagem PNG". */
export function tipoLegivel(tipo: string): string {
  if (tipo === "application/pdf") return "PDF";
  const t = TIPOS_DOCUMENTO[tipo as TipoDocumento];
  return t ? `Imagem ${t}` : tipo;
}

const POR_EXTENSAO: Record<string, TipoDocumento> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/** O tipo aceito do arquivo (pelo tipo que o navegador diz ou, sem ele, pela extensão). */
export function tipoDoArquivo(nome: string, tipo: string): TipoDocumento | null {
  if (tipo in TIPOS_DOCUMENTO) return tipo as TipoDocumento;
  if (tipo) return null;
  return POR_EXTENSAO[nome.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/** Por que o arquivo não pode ir, com o texto aprovado; null quando pode. */
export function problemaDoArquivo(nome: string, tipo: string, tamanho: number): string | null {
  if (!tipoDoArquivo(nome, tipo)) return "Tipo não aceito. Envie PDF, JPG ou PNG.";
  if (tamanho > TAMANHO_MAXIMO_DOCUMENTO) {
    return `Tem ${tamanhoLegivel(tamanho)}; o limite é 10 MB por arquivo. Diminua a resolução da digitalização e envie de novo.`;
  }
  if (tamanho === 0) return "O arquivo está vazio.";
  if (/[/\\]/.test(nome) || nome.trim().length > 200) return "O nome do arquivo é longo demais. Renomeie e envie de novo.";
  return null;
}

/** PUT do arquivo direto no Storage, no endereço de uso único que a API devolveu, com o progresso. */
export function enviarArquivo(endereco: string, arquivo: File, tipo: string, aoProgredir: (p: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", endereco);
    x.setRequestHeader("content-type", tipo);
    x.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(Math.round((e.loaded / e.total) * 100));
    };
    x.onload = () => resolve(x.status >= 200 && x.status < 300);
    x.onerror = () => resolve(false);
    x.onabort = () => resolve(false);
    x.send(arquivo);
  });
}

