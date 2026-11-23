// Os textos da folha "Prazo do comprovante" (F3.134, AP-08), pelo desenho aprovado em
// docs/design/aprovadas/portal-prazo-comprovante (_fonte/prazo.py). Funções puras, com testes.

import { PRAZO_COMPROVANTE, type PedidoComprovanteAberto, type PrazoComprovanteSalvo, type PreviaPrazoComprovante } from "@t3jus/domain";

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const primeiro = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** O número de dias que vale, ou null fora de 30 a 365 (o campo "Outro prazo" é texto). */
export function lerDias(t: string | number): number | null {
  const s = String(t).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= PRAZO_COMPROVANTE.min && n <= PRAZO_COMPROVANTE.max ? n : null;
}

/** "Hoje, 3 dos 41 comprovantes nas fichas dos clientes têm mais de 90 dias…" (sem o negrito). */
export function textoAgora(vencidos: number, total: number, dias: number): { antes: string; destaque: string; depois: string } | null {
  if (!total) return null;
  if (!vencidos) {
    return { antes: "Hoje, ", destaque: total === 1 ? "o 1" : `nenhum dos ${total}`, depois: ` ${plural(total, "comprovante", "comprovantes")} nas fichas dos clientes ${total === 1 ? "está em dia" : `tem mais de ${dias} dias`}.` };
  }
  return {
    antes: "Hoje, ",
    destaque: `${vencidos} ${total === 1 ? "de" : "dos"} ${total}`,
    depois: ` ${plural(total, "comprovante", "comprovantes")} nas fichas dos clientes ${plural(vencidos, "tem", "têm")} mais de ${dias} dias e ${plural(vencidos, "está", "estão")} em “Precisa de atenção”.`,
  };
}

export type Efeito =
  | { tipo: "outro" }
  | { tipo: "atual" }
  | { tipo: "zero" }
  | { tipo: "nada"; total: number }
  | { tipo: "passam"; destaque: string; resto: string }
  | { tipo: "voltam"; destaque: string; resto: string };

/** O quadro do efeito: o que muda nos selos com o prazo escolhido. */
export function textoEfeito(dias: number | null, atual: number, total: number, p: PreviaPrazoComprovante | null): Efeito {
  if (dias === null) return { tipo: "outro" };
  if (dias === atual) return { tipo: "atual" };
  if (!total) return { tipo: "zero" };
  if (!p) return { tipo: "nada", total };
  if (p.passamAQtd) {
    const ja = p.vencidosAgora
      ? ` Com ${p.vencidosAgora === 1 ? "o 1 que já tinha" : `os ${p.vencidosAgora} que já tinham`} mais de ${atual}, são ${p.vencidosCom} de ${p.totalComComprovante}.`
      : ` São ${p.vencidosCom} de ${p.totalComComprovante}.`;
    return {
      tipo: "passam",
      destaque: `${p.passamAQtd} ${plural(p.passamAQtd, "comprovante passa", "comprovantes passam")} a ficar com “Mais de ${dias} dias”`,
      resto: ` e ${plural(p.passamAQtd, "sobe", "sobem")} para “Precisa de atenção” na ficha.${ja}`,
    };
  }
  if (p.voltamAEmDiaQtd) {
    return {
      tipo: "voltam",
      destaque: `${p.voltamAEmDiaQtd} ${plural(p.voltamAEmDiaQtd, "comprovante volta", "comprovantes voltam")} a “Em dia”`,
      resto: p.vencidosCom
        ? `. Continuam com mais de ${dias} dias: ${p.vencidosCom} de ${p.totalComComprovante}.`
        : `. Nenhum comprovante fica com mais de ${dias} dias.`,
    };
  }
  return { tipo: "nada", total: p.totalComComprovante };
}

/** O pedido de comprovante que continua aberto quando o comprovante volta a "Em dia". */
export function textoPedidoAberto(cliente: string, dataDocumento: string, p: PedidoComprovanteAberto, hoje: string, varios: boolean): string {
  const quando = p.pedidoEm === hoje ? "hoje" : `em ${ddmm(p.pedidoEm)}`;
  const para = p.contato ? ` a ${p.contato.nome}${p.contato.papel ? `, ${p.contato.papel.toLowerCase()} de ${primeiro(cliente)}` : ""}` : "";
  const caso = varios ? `o caso ${p.caso}` : `o caso de ${primeiro(cliente)}`;
  return `O pedido de comprovante novo para ${caso}, feito ${quando}${p.peloWhatsapp ? ` pelo WhatsApp${para}` : ""}, continua aberto. `
    + `Se o de ${ddmm(dataDocumento)} servir, marque “Já chegou” no caso.`;
}

/** A caixa "Trocar também no texto que vai ao cliente". */
export function textoCaixa(de: number, para: number, listas: number): string {
  return `“dos últimos ${de} dias” passa a “dos últimos ${para} dias” no comprovante ${listas === 1 ? "da lista que diz" : `das ${listas} listas que dizem`} o prazo.`;
}

/** O aviso depois de salvar. `comFrase`: havia texto para trocar (a caixa estava à vista). */
export function textoSalvo(r: PrazoComprovanteSalvo, trocar: boolean, comFrase: boolean): { titulo: string; texto: string } {
  const n = r.validadeDias;
  if (!r.mudou) return { titulo: `O prazo continua em ${n} dias.`, texto: "Nada mudou: nem os selos, nem o texto ao cliente." };
  const selos = r.passaramA
    ? `Os selos das fichas já mudaram: ${r.passaramA} ${plural(r.passaramA, "comprovante passou", "comprovantes passaram")} a “Mais de ${n} dias”.`
    : r.voltaramAEmDia
      ? `Os selos das fichas já mudaram: ${r.voltaramAEmDia} ${plural(r.voltaramAEmDia, "comprovante voltou", "comprovantes voltaram")} a “Em dia”.`
      : "Nenhum selo das fichas mudou de lado.";
  let texto = "";
  if (trocar && r.textosTrocados) {
    texto = ` O texto ao cliente passou a dizer “dos últimos ${n} dias” em ${r.listasTrocadas} ${plural(r.listasTrocadas, "lista", "listas")}.`;
  } else if (comFrase && !trocar) {
    texto = " O texto ao cliente não mudou.";
  }
  if (trocar && r.naoCouberam) {
    texto += ` ${r.naoCouberam} ${plural(r.naoCouberam, "texto ficou como estava", "textos ficaram como estavam")}, porque passaria de 300 letras: mude no “Como pedir”.`;
  }
  return {
    titulo: `O prazo agora é de ${n} dias.`,
    texto: `${selos}${texto} Nenhum pedido saiu agora, e os casos já abertos não mudam: o comprovante é pedido de novo quando um caso abrir.`,
  };
}

/** "Mudado por você hoje, às 10h25: de 90 para 60 dias." A hora é a de Brasília. */
export function textoMudado(de: number, para: number, agora: Date): string {
  const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const h = f.find((x) => x.type === "hour")?.value ?? "00";
  const m = f.find((x) => x.type === "minute")?.value ?? "00";
  return `Mudado por você hoje, às ${h}h${m}: de ${de} para ${para} dias. Fica no histórico do escritório.`;
}
