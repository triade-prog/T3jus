// Fim da guarda de 5 anos (F0.15): apagar a pasta do escritório no Storage. O banco não apaga
// arquivo (só o registro), então a api-console lista a pasta pela API do Storage e apaga em
// lotes. Todo caminho de arquivo do escritório começa com o id dele.

export interface LimpezaArquivos {
  /**
   * Apaga até `maximo` arquivos da pasta `<pasta>/` no bucket. `restam` diz se pode ter
   * sobrado algum (a próxima chamada continua de onde parou).
   */
  apagarPasta(bucket: string, pasta: string, maximo: number): Promise<{ apagados: number; restam: boolean }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Só pasta de escritório: nunca a raiz do bucket. */
export function pastaValida(pasta: string): boolean {
  return UUID.test(pasta);
}

interface ItemLista {
  name: string;
  id: string | null;
}

export function storageLimpeza(url: string, chaveServico: string, buscar: typeof fetch = fetch): LimpezaArquivos {
  const base = `${url}/storage/v1`;
  const cabecalhos = { apikey: chaveServico, authorization: `Bearer ${chaveServico}`, "content-type": "application/json" };

  async function listar(bucket: string, prefixo: string, offset: number): Promise<ItemLista[]> {
    const r = await buscar(`${base}/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({ prefix: prefixo, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
    return (await r.json()) as ItemLista[];
  }

  return {
    async apagarPasta(bucket, pasta, maximo) {
      if (!pastaValida(pasta)) throw new Error("Pasta inválida");
      const arquivos: string[] = [];
      const pastas = [pasta];
      // Os arquivos ficam em subpastas (peticoes/, peticoes/modelos/): o item sem id é pasta.
      while (pastas.length && arquivos.length < maximo) {
        const prefixo = pastas.shift()!;
        for (let offset = 0; arquivos.length < maximo; offset += 1000) {
          const itens = await listar(bucket, prefixo, offset);
          for (const i of itens) {
            if (i.id === null) pastas.push(`${prefixo}/${i.name}`);
            else if (arquivos.length < maximo) arquivos.push(`${prefixo}/${i.name}`);
          }
          if (itens.length < 1000) break;
        }
      }
      for (let i = 0; i < arquivos.length; i += 1000) {
        const r = await buscar(`${base}/object/${encodeURIComponent(bucket)}`, {
          method: "DELETE",
          headers: cabecalhos,
          body: JSON.stringify({ prefixes: arquivos.slice(i, i + 1000) }),
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      }
      return { apagados: arquivos.length, restam: arquivos.length >= maximo || pastas.length > 0 };
    },
  };
}
