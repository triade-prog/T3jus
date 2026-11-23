"use client";
// O acerto do caso encerrado na ficha do caso (EX-17, F3.128, F3.132), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 5, decisões 21 e 22) e, sem
// levantamento, em docs/design/aprovadas/portal-fechamento-sem-levantamento (estados 3 e 4): o
// quadro "Acerto no Financeiro", com o que já foi feito e o que falta. Valores e o link só para
// quem tem a área Financeiro; quem não tem lê quem cuida. Os textos estão em acertoCaso.ts.

import { hojeBrasilia, type ResumoAcertoCaso } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { dia } from "./fechamento.ts";
import { itensDoAcerto } from "./acertoCaso.ts";
import { juntarComE } from "./clientes.ts";
import { primeiroNome } from "./equipe.ts";

export { hrefDoAcerto, textoAcertoNoCaso } from "./acertoCaso.ts";

export function FolhaAcertoCaso({ a, caso }: { a: ResumoAcertoCaso; caso?: { encerradoEm: string | null; resultado: string | null } }) {
  const v = a.comValores;
  const itens = itensDoAcerto(a, caso ?? { encerradoEm: null, resultado: null }, hojeBrasilia());
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
          <li key={i} className={x.tom === "falta" ? "falta" : undefined}>
            <Icone nome={x.tom === "ok" ? "check" : x.tom === "falta" ? "alerta" : "relogio"} className="ico" />
            <span>
              {x.forte ? <b>{x.forte}</b> : null}{x.texto}
              {x.tom === "ok" ? <span className="sr">: feito</span> : x.tom === "falta" ? <span className="sr">: falta</span> : null}
              {x.sub ? <small>{x.sub}</small> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
