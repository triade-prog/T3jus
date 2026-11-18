// Senha vazada (tela de nova senha e convite aprovadas): confere a senha nova nas listas
// públicas de senhas vazadas (Have I Been Pwned, faixa por k-anonimato). Só os 5 primeiros
// caracteres do SHA-1 saem do servidor; a senha e o hash completo nunca saem. Se o serviço
// não responder, a troca segue (a regra dos 12 caracteres continua valendo) e o erro é
// registrado.

import { registrar } from "./registro.ts";

export type ConferirVazada = (senha: string) => Promise<boolean>;

async function sha1Hex(texto: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Lê a resposta da faixa: linhas "SUFIXO:CONTAGEM"; as de contagem 0 são enchimento. */
export function sufixoNaFaixa(faixa: string, sufixo: string): boolean {
  return faixa.split("\n").some((linha) => {
    const [s, n] = linha.trim().split(":");
    return s === sufixo && Number(n) > 0;
  });
}

export function conferirVazadaHibp(buscar: typeof fetch = fetch, tempoMs = 3000): ConferirVazada {
  return async (senha) => {
    const hash = await sha1Hex(senha);
    try {
      const r = await buscar(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
        headers: { "Add-Padding": "true" },
        signal: AbortSignal.timeout(tempoMs),
      });
      if (!r.ok) throw new Error(`HIBP respondeu ${r.status}`);
      return sufixoNaFaixa(await r.text(), hash.slice(5));
    } catch (e) {
      registrar("erro", { funcao: "senha", rota: "vazada", erro: e });
      return false;
    }
  };
}
