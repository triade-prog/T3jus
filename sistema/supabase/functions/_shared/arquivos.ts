// Arquivos no Supabase Storage (CO-05), com a chave de serviço e só no servidor. O bucket é
// privado: o navegador nunca recebe a chave, só endereços assinados de uso curto. O envio vai
// direto do navegador para o Storage (o arquivo não passa pela API nem pela Vercel).

export interface InfoArquivo {
  tamanho: number;
  tipo: string;
}

export interface Arquivos {
  /** Endereço de envio de uso único para o caminho (PUT do arquivo). */
  enderecoDeEnvio(caminho: string): Promise<string>;
  /** Tamanho e tipo do arquivo que chegou; null se não chegou. */
  info(caminho: string): Promise<InfoArquivo | null>;
  /** Endereço de leitura que vale por poucos segundos, já com o nome para baixar. */
  enderecoDeLeitura(caminho: string, segundos: number, nomeParaBaixar: string): Promise<string>;
  /** Grava o arquivo montado no servidor (as petições, EX-09). Com substituir, troca o que houver. */
  enviar(caminho: string, dados: Uint8Array, tipo: string, substituir?: boolean): Promise<void>;
  /** Os bytes do arquivo; null se não existe. */
  baixar(caminho: string): Promise<Uint8Array | null>;
}

export const BUCKET_DOCUMENTOS = "documentos-console";
/** Documentos dos casos no Portal (EX-05): dado do escritório, num bucket separado. */
export const BUCKET_DOCUMENTOS_PORTAL = "documentos-portal";
/** O link de abrir vale 60 segundos: o suficiente para o navegador começar a baixar. */
export const VALIDADE_LEITURA_S = 60;

export function arquivosStorage(url: string, chaveServico: string, bucket = BUCKET_DOCUMENTOS, buscar: typeof fetch = fetch): Arquivos {
  const base = `${url}/storage/v1`;
  const cabecalhos = { apikey: chaveServico, authorization: `Bearer ${chaveServico}`, "content-type": "application/json" };
  const objeto = (caminho: string) => `${encodeURIComponent(bucket)}/${caminho.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async enderecoDeEnvio(caminho) {
      const r = await buscar(`${base}/object/upload/sign/${objeto(caminho)}`, { method: "POST", headers: cabecalhos, body: "{}", signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      const { url: assinado } = (await r.json()) as { url: string };
      return `${base}${assinado}`;
    },
    async info(caminho) {
      const r = await buscar(`${base}/object/info/authenticated/${objeto(caminho)}`, { headers: cabecalhos, signal: AbortSignal.timeout(8000) });
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      const o = (await r.json()) as { size?: number; content_type?: string; metadata?: { size?: number; mimetype?: string } };
      const tamanho = o.size ?? o.metadata?.size;
      const tipo = o.content_type ?? o.metadata?.mimetype;
      return typeof tamanho === "number" && typeof tipo === "string" ? { tamanho, tipo } : null;
    },
    async enderecoDeLeitura(caminho, segundos, nomeParaBaixar) {
      const r = await buscar(`${base}/object/sign/${objeto(caminho)}`, {
        method: "POST", headers: cabecalhos, body: JSON.stringify({ expiresIn: segundos }), signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      const { signedURL } = (await r.json()) as { signedURL: string };
      return `${base}${signedURL}&download=${encodeURIComponent(nomeParaBaixar)}`;
    },
    async enviar(caminho, dados, tipo, substituir = false) {
      const r = await buscar(`${base}/object/${objeto(caminho)}`, {
        method: "POST",
        headers: { apikey: chaveServico, authorization: `Bearer ${chaveServico}`, "content-type": tipo, "x-upsert": substituir ? "true" : "false" },
        body: dados.slice().buffer,
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
    },
    async baixar(caminho) {
      const r = await buscar(`${base}/object/authenticated/${objeto(caminho)}`, { headers: { apikey: chaveServico, authorization: `Bearer ${chaveServico}` }, signal: AbortSignal.timeout(15000) });
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
