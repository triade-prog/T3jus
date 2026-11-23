"use client";
// O acerto do caso encerrado na ficha do caso (EX-17, F3.128), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 5, decisões 21 e 22): o quadro
// "Acerto no Financeiro", com o que já foi feito e o que falta. Valores e o link para a ficha do
// repasse só para quem tem a área Financeiro; quem não tem lê quem cuida.

import { reais, type FichaCaso, type ResumoAcertoCaso } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import { primeiroNome } from "./equipe.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const dia = (x: string) => (/^\d{4}-\d{2}-\d{2}$/.test(x) ? diaCurto(x) : new Intl.DateTimeFormat("pt-BR", { ...fuso, day: "2-digit", month: "2-digit" }).format(new Date(x)));
const LEV: Record<string, string> = { RPV: "RPV recebida", ALVARA: "Alvará levantado", PRECATORIO: "Precatório recebido", ACORDO: "Acordo recebido" };
const RES: Record<string, string> = { GANHO: "ganho", PERDA: "perda", ACORDO: "acordo" };

/** O selo do cabeçalho e a frase do âmbar da etapa (decisão 21). */
export function textoAcertoNoCaso(f: FichaCaso): { selo: string; frase: string } | null {
  const a = f.acerto;
  if (!a?.pendente) return null;
  const quando = f.encerradoEm ? ` em ${dia(f.encerradoEm)}` : "";
  const res = f.resultado ? ` com ${RES[f.resultado] ?? f.resultado.toLowerCase()}` : "";
  const falta = a.comValores && a.outros?.length
    ? `pagar ${juntarComE(a.outros.map((o) => o.nome))} e encerrar`
    : "encerrar";
  return {
    selo: "Encerrado · acerto pendente",
    frase: a.comValores ? `Encerrado${res}${quando}. Falta o acerto no Financeiro: ${falta}.` : `Encerrado${res}${quando}. O acerto está com o Financeiro.`,
  };
}

export function hrefDoAcerto(a: ResumoAcertoCaso | null | undefined): string | null {
  return a?.pendente && a.levantamentoId ? ROTAS_FINANCEIRO.repasse(a.levantamentoId) : null;
}

export function FolhaAcertoCaso({ a }: { a: ResumoAcertoCaso }) {
  const v = a.comValores;
  const itens: { ok: boolean; titulo: React.ReactNode; sub?: string }[] = [];
  for (const x of a.exitos) {
    itens.push(x.feito
      ? { ok: true, titulo: x.naoCobrado ? "Êxito não cobrado" : "Êxito conferido",
          sub: v ? [x.valor ? reais(x.valor) : null, x.por ? `por ${primeiroNome(x.por.nome)}` : null, x.em ? `em ${dia(x.em)}` : null].filter(Boolean).join(" · ") : undefined }
      : { ok: false, titulo: <><b>Êxito</b> esperando a conferência</>, sub: v && x.valor ? reais(x.valor) : undefined });
  }
  if (a.entrou) itens.push({ ok: true, titulo: LEV[a.entrou.tipo] ?? "Dinheiro recebido", sub: v ? [a.entrou.valor ? reais(a.entrou.valor) : null, `em ${dia(a.entrou.em)}`].filter(Boolean).join(" · ") : undefined });
  for (const r of a.repasses) {
    const p = primeiroNome(r.cliente);
    itens.push(r.feito
      ? { ok: true, titulo: `${p} recebeu a parte que cabe ao cliente`, sub: v ? [r.valor ? reais(r.valor) : null, r.em ? `em ${dia(r.em)}` : null].filter(Boolean).join(" · ") : undefined }
      : { ok: false, titulo: <><b>{p}:</b> falta repassar{v && r.valor ? ` ${reais(r.valor)}` : ""}</>, sub: r.prazo ? `até ${dia(r.prazo)}` : undefined });
  }
  if (v) {
    for (const o of a.outros ?? []) itens.push({ ok: false, titulo: <><b>{o.nome}:</b> falta pagar{o.valor ? ` ${reais(o.valor)}` : ""}</>, sub: o.prazo ? `até ${dia(o.prazo)}` : undefined });
  } else if (a.faltaOutros) {
    itens.push({ ok: false, titulo: "Faltam pagamentos a terceiros", sub: "Os valores ficam no Financeiro" });
  }
  const abertos = a.contratos.filter((c) => c.situacao === "ATIVO");
  const sub = a.fechado
    ? `Encerrado no financeiro em ${dia(a.fechado.em)}${a.fechado.por ? `, por ${a.fechado.por.nome}` : ""}`
    : v ? "O que falta para o caso sair de “acerto pendente”" : a.quemCuida?.length ? `Quem cuida: ${juntarComE(a.quemCuida.map(primeiroNome))}, da área Financeiro` : "Quem cuida: a área Financeiro";
  return (
    <section className="folha" aria-labelledby="t-acerto">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-acerto" style={{ fontSize: 20 }}>Acerto no Financeiro</h2>
          <p className="sub">{sub}</p>
        </div>
      </div>
      <ul className="jf-acerto">
        {itens.map((x, i) => (
          <li key={i} className={x.ok ? undefined : "falta"}>
            <Icone nome={x.ok ? "check" : "alerta"} className="ico" />
            <span>{x.titulo}{x.ok ? <span className="sr">: feito</span> : <span className="sr">: falta</span>}{x.sub ? <small>{x.sub}</small> : null}</span>
          </li>
        ))}
        {!a.fechado && a.entrou ? (
          <li>
            <Icone nome="relogio" className="ico" />
            <span>
              Depois: encerrar no financeiro{abertos.length ? ` e ${abertos.length === 1 ? `o contrato ${abertos[0]!.numero}` : `os contratos ${juntarComE(abertos.map((c) => c.numero))}`}` : ""}
              {abertos.length ? <small>Os dois de uma vez, na mesma janela</small> : null}
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
