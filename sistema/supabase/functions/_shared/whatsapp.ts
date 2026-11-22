// Envio pela API do WhatsApp Cloud da Meta (F0.21, PT-04). Só monta e manda: o que sai, para
// quem e se vai como texto livre ou como aviso aprovado o banco já decidiu
// (rotina_whatsapp_pendentes). Aqui ficam o corpo da chamada, os campos do aviso tirados do
// texto da mensagem e o que cada erro da Meta quer dizer (passageiro ou definitivo, e o motivo
// simples que as telas mostram).
//
// Nada disto foi testado contra a Meta de verdade: falta a conta do T3jus como parceiro de
// tecnologia e um número ligado (F3.58). Os testes usam respostas no formato da documentação.

/** Versão da Graph API. Cada versão vale cerca de dois anos; WHATSAPP_GRAPH_VERSAO troca sem mexer no código. */
export const VERSAO_GRAPH = "v23.0";

export interface AnexoEnvio {
  nome: string;
  tipo: string;
  /** Endereço temporário de leitura no Storage; a Meta baixa o arquivo dele. */
  link: string;
}

export interface ModeloEnvio {
  nome: string;
  idioma: string;
  parametros: string[];
}

export interface EnvioWhatsapp {
  numeroId: string;
  /** Número de quem recebe, só dígitos, com o país (5511...). */
  para: string;
  texto: string | null;
  anexo?: AnexoEnvio | null;
  modelo?: ModeloEnvio | null;
}

export interface WhatsappCloud {
  /** Manda e devolve o id da mensagem na Meta (wamid). Falha com ErroMeta. */
  enviar(token: string, e: EnvioWhatsapp): Promise<string>;
}

export class ErroMeta extends Error {
  constructor(readonly codigo: string, readonly passageira: boolean, readonly motivo: string) {
    super(`${codigo}: ${motivo}`);
  }
}

const CAMPO = /\{([^{}]+)\}/g;

function paraRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** O parâmetro como a Meta aceita: sem quebra de linha nem tabulação, sem mais de 3 espaços seguidos. */
function limparParametro(v: string): string {
  return v.replace(/[\t\r\n]+/g, " ").replace(/ {4,}/g, "   ").trim();
}

/**
 * Os valores de cada {campo} do texto aprovado, na ordem em que aparecem, tirados do texto que
 * foi para a fila (o mesmo que a tela mostra). Null quando o texto não bate com o modelo ou um
 * campo fica vazio: aí o aviso não sai.
 */
export function camposDoModelo(modelo: string, texto: string): string[] | null {
  const partes = modelo.split(CAMPO);
  // split com grupo: [literal, campo, literal, campo, ..., literal]
  const literais = partes.filter((_, i) => i % 2 === 0);
  if (literais.length === 1) return modelo === texto ? [] : null;
  const re = new RegExp(`^${literais.map(paraRegex).join("(.+?)")}$`, "s");
  const achou = re.exec(texto);
  if (!achou) return null;
  const valores = achou.slice(1).map(limparParametro);
  return valores.every((v) => v.length > 0) ? valores : null;
}

function midia(anexo: AnexoEnvio, legenda: string | null): Record<string, unknown> {
  const tipo = anexo.tipo === "IMAGEM" ? "image" : anexo.tipo === "VIDEO" ? "video" : "document";
  const corpo: Record<string, unknown> = { link: anexo.link };
  if (tipo === "document") corpo.filename = anexo.nome;
  if (legenda) corpo.caption = legenda;
  return { type: tipo, [tipo]: corpo };
}

/** O corpo do POST /{numero}/messages. */
export function corpoDaMensagem(e: EnvioWhatsapp): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to: e.para };
  if (e.modelo) {
    const componentes: Record<string, unknown>[] = [];
    if (e.anexo) {
      const m = midia(e.anexo, null);
      componentes.push({ type: "header", parameters: [m] });
    }
    if (e.modelo.parametros.length) {
      componentes.push({ type: "body", parameters: e.modelo.parametros.map((text) => ({ type: "text", text })) });
    }
    return {
      ...base, type: "template",
      template: { name: e.modelo.nome, language: { code: e.modelo.idioma }, ...(componentes.length ? { components: componentes } : {}) },
    };
  }
  if (e.anexo) return { ...base, ...midia(e.anexo, e.texto) };
  if (!e.texto) throw new ErroMeta("SEM_TEXTO", false, "A mensagem está vazia");
  return { ...base, type: "text", text: { body: e.texto, preview_url: true } };
}

// Erros da Cloud API (developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes).
const PASSAGEIROS = new Set([1, 2, 4, 80007, 130429, 131000, 131016, 131056, 131057, 133004]);
const LIGACAO = new Set([0, 3, 10, 190, 200, 33]);
const MOTIVOS: Record<number, string> = {
  131026: "O número do cliente não recebe mensagens pelo WhatsApp",
  131047: "Fora da janela de 24 horas, a Meta só aceita aviso aprovado",
  131049: "A Meta segurou o aviso para não cansar o cliente com mensagens",
  131050: "O cliente pediu à Meta para não receber estas mensagens",
  131031: "A conta do escritório na Meta está bloqueada",
  131042: "A conta do escritório na Meta tem pagamento pendente",
  131021: "A mensagem iria para o próprio número do escritório",
  131051: "A Meta não aceita este tipo de mensagem",
  131052: "A Meta não conseguiu baixar o arquivo",
  131053: "A Meta não conseguiu baixar o arquivo",
  132000: "A Meta recusou os campos do aviso",
  132001: "O aviso não existe na Meta com este nome",
  132005: "O aviso ficou longo demais com os campos preenchidos",
  132007: "A Meta recusou o aviso pelas regras dela",
  132012: "A Meta recusou os campos do aviso",
  132015: "A Meta pausou este aviso",
  132016: "A Meta desativou este aviso",
  131008: "A Meta recusou os campos do aviso",
  131009: "A Meta recusou os campos do aviso",
  368: "A Meta bloqueou o envio pelas regras dela",
};

interface ErroGraph {
  code?: number;
  error_subcode?: number;
  message?: string;
}

/** O que um erro da Meta quer dizer: passageiro (tenta de novo) ou definitivo, e o motivo simples. */
export function classificarErro(status: number, erro: ErroGraph | null): ErroMeta {
  const codigo = typeof erro?.code === "number" ? erro.code : null;
  const rotulo = codigo === null ? `HTTP ${status}` : String(codigo);
  if (codigo !== null && LIGACAO.has(codigo)) {
    return new ErroMeta(rotulo, true, "A ligação do WhatsApp do escritório com a Meta precisa ser refeita");
  }
  if ((codigo !== null && PASSAGEIROS.has(codigo)) || status === 429 || status >= 500 || (codigo === null && status === 0)) {
    return new ErroMeta(rotulo, true, status === 429 || codigo === 130429 || codigo === 131056 || codigo === 80007 || codigo === 4
      ? "A Meta pediu para esperar: muitas mensagens de uma vez"
      : "A Meta não respondeu");
  }
  const motivo = (codigo !== null && MOTIVOS[codigo])
    || (codigo !== null && codigo >= 132000 && codigo < 133000 ? "A Meta recusou o aviso" : `A Meta recusou a mensagem (código ${rotulo})`);
  return new ErroMeta(rotulo, false, motivo);
}

export function whatsappCloud(versao: string = VERSAO_GRAPH, buscar: typeof fetch = fetch): WhatsappCloud {
  return {
    async enviar(token, e) {
      const corpo = corpoDaMensagem(e);
      let r: Response;
      try {
        r = await buscar(`https://graph.facebook.com/${versao}/${encodeURIComponent(e.numeroId)}/messages`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(corpo),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        throw new ErroMeta("REDE", true, "A Meta não respondeu");
      }
      const dados = await r.json().catch(() => null) as { messages?: { id?: string }[]; error?: ErroGraph } | null;
      const id = dados?.messages?.[0]?.id;
      if (r.ok && typeof id === "string" && id) return id;
      throw classificarErro(r.status, dados?.error ?? null);
    },
  };
}
