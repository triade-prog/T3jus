// Fim da guarda de 5 anos (F0.15): apagar a pasta do escritório no Storage. O banco não apaga
// arquivo (só o registro), então a api-console lista a pasta pela API do Storage e apaga em
// lotes. Todo caminho de arquivo do escritório começa com o id dele.
//
// Exclusão a pedido do titular (F3.141; PT-11): apagar arquivos um a um, pelos caminhos exatos
// que o banco pôs na fila arquivos_apagar (0970). Só dois formatos, sempre dentro da pasta do
// escritório: <escritório>/<documento> e <escritório>/propostas/<proposta>-v<n>.docx.

export interface LimpezaArquivos {
  /**
   * Apaga até `maximo` arquivos da pasta `<pasta>/` no bucket. `restam` diz se pode ter
   * sobrado algum (a próxima chamada continua de onde parou).
   */
  apagarPasta(bucket: string, pasta: string, maximo: number): Promise<{ apagados: number; restam: boolean }>;
  /**
   * Apaga os objetos de caminho exato (até 1.000 por pedido). Objeto que não existe conta como
   * sucesso: o que importa é ele não estar lá depois. Caminho fora dos dois formatos nem sai.
   */
  apagarObjetos(bucket: string, caminhos: string[]): Promise<{ apagados: number }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Só pasta de escritório: nunca a raiz do bucket. */
export function pastaValida(pasta: string): boolean {
  return UUID.test(pasta);
}

const UUID_SOLTO = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// A mesma regra do check arquivos_apagar_caminho (0970).
const CAMINHO = new RegExp(`^${UUID_SOLTO}/(${UUID_SOLTO}|propostas/${UUID_SOLTO}-v[1-9][0-9]{0,8}\\.docx)$`);

/** Só arquivo de um dos dois formatos da fila, dentro da pasta de um escritório. */
export function caminhoValido(caminho: string): boolean {
  return !caminho.includes("..") && CAMINHO.test(caminho) && pastaValida(caminho.split("/")[0]!);
}

/** O único bucket de onde a fila apaga arquivo a arquivo. */
export const BUCKET_EXCLUSAO = "documentos-portal";

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

  /**
   * O DELETE em lote do Storage apaga por nome exato, apesar de o campo se chamar `prefixes`
   * (não é apagar por prefixo de pasta). É nisso que apagarPasta e apagarObjetos se apoiam.
   */
  async function apagarLote(bucket: string, nomes: string[]): Promise<number> {
    let apagados = 0;
    for (let i = 0; i < nomes.length; i += 1000) {
      const r = await buscar(`${base}/object/${encodeURIComponent(bucket)}`, {
        method: "DELETE",
        headers: cabecalhos,
        body: JSON.stringify({ prefixes: nomes.slice(i, i + 1000) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}`);
      const saiu = await r.json().catch(() => null);
      apagados += Array.isArray(saiu) ? saiu.length : 0;
    }
    return apagados;
  }

  return {
    async apagarObjetos(bucket, caminhos) {
      if (bucket !== BUCKET_EXCLUSAO) throw new Error("Bucket inválido");
      if (caminhos.some((c) => !caminhoValido(c))) throw new Error("Caminho inválido");
      return { apagados: await apagarLote(bucket, caminhos) };
    },
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
      await apagarLote(bucket, arquivos);
      return { apagados: arquivos.length, restam: arquivos.length >= maximo || pastas.length > 0 };
    },
  };
}
