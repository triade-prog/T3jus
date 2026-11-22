// A entrega da fila do WhatsApp (F0.21, PT-04). A rotina do banco (pg_cron, a cada minuto)
// chama POST /v1/rotina/whatsapp-envios quando há mensagem pronta para sair por um número da
// Meta. Esta peça pede o lote ao banco, manda cada mensagem pela Cloud API e registra cada
// resultado; as novas tentativas e o limite ficam no banco (rotina_whatsapp_registrar).

import type { Banco } from "../_shared/banco.ts";
import type { Arquivos } from "../_shared/arquivos.ts";
import { camposDoModelo, ErroMeta, type WhatsappCloud } from "../_shared/whatsapp.ts";
import { registrar } from "../_shared/registro.ts";

/** Quantas mensagens cada chamada leva (cabe no tempo da função com folga). */
export const MENSAGENS_POR_CHAMADA = 20;
/** O link do PDF que a Meta baixa vale 1 hora. */
export const VALIDADE_LINK_S = 3600;

export interface EntregaWhatsapp {
  cloud: WhatsappCloud;
  /** O token de acesso do número do escritório; null quando ainda não há. */
  tokenDe(escritorioId: string, tokenRef: string | null): Promise<string | null>;
}

interface Pendente {
  id: string;
  escritorioId: string;
  numeroId: string;
  tokenRef: string | null;
  para: string;
  texto: string | null;
  anexo: { nome: string; tipo: string; caminho: string } | null;
  modelo: { nome: string; idioma: string; texto: string } | null;
}

export interface ResultadoEntrega {
  enviadas: number;
  novamente: number;
  falhas: number;
}

export async function entregarWhatsapp(banco: Banco, arquivos: Arquivos, entrega: EntregaWhatsapp): Promise<ResultadoEntrega> {
  const lote = await banco.rpc<Pendente[]>("rotina_whatsapp_pendentes", { p_limite: MENSAGENS_POR_CHAMADA });
  const r: ResultadoEntrega = { enviadas: 0, novamente: 0, falhas: 0 };
  for (const m of lote) {
    let res = "NA_FILA";
    let metaId: string | null = null;
    try {
      const token = await entrega.tokenDe(m.escritorioId, m.tokenRef);
      if (!token) throw new ErroMeta("SEM_TOKEN", true, "A ligação do WhatsApp do escritório com a Meta precisa ser refeita");
      let parametros: string[] = [];
      if (m.modelo) {
        const campos = camposDoModelo(m.modelo.texto, m.texto ?? "");
        if (!campos) throw new ErroMeta("CAMPOS", false, "A mensagem não bate com o texto do aviso aprovado");
        parametros = campos;
      }
      let link: string | null = null;
      if (m.anexo) {
        try {
          link = await arquivos.enderecoDeLeitura(m.anexo.caminho, VALIDADE_LINK_S, m.anexo.nome);
        } catch {
          throw new ErroMeta("STORAGE", true, "O arquivo não pôde ser lido");
        }
      }
      metaId = await entrega.cloud.enviar(token, {
        numeroId: m.numeroId, para: m.para, texto: m.texto,
        anexo: m.anexo && link ? { nome: m.anexo.nome, tipo: m.anexo.tipo, link } : null,
        modelo: m.modelo ? { nome: m.modelo.nome, idioma: m.modelo.idioma, parametros } : null,
      });
    } catch (erro) {
      const e = erro instanceof ErroMeta ? erro : new ErroMeta("INESPERADO", true, "Falhou ao mandar");
      registrar("aviso", { funcao: "api-portal", rota: "whatsapp-envios", codigo: e.codigo, passageira: e.passageira });
      try {
        res = await banco.rpc<string>("rotina_whatsapp_registrar", {
          p_escritorio: m.escritorioId, p_mensagem: m.id, p_enviado: false,
          p_motivo: e.motivo, p_erro: e.codigo, p_passageira: e.passageira,
        });
      } catch (erroRegistro) {
        // A reserva vence em 5 minutos e a mensagem volta ao lote.
        registrar("erro", { funcao: "api-portal", rota: "whatsapp-envios", erro: erroRegistro });
        res = "NA_FILA";
      }
    }
    if (metaId) {
      // Saiu: registrar não pode virar falha (mandaria de novo).
      res = await banco.rpc<string>("rotina_whatsapp_registrar", {
        p_escritorio: m.escritorioId, p_mensagem: m.id, p_enviado: true, p_meta_id: metaId,
      }).catch((erroRegistro) => {
        registrar("erro", { funcao: "api-portal", rota: "whatsapp-envios", erro: erroRegistro });
        return "ENVIADA";
      });
    }
    if (res === "ENVIADA") r.enviadas++;
    else if (res === "NA_FILA") r.novamente++;
    else r.falhas++;
  }
  return r;
}
