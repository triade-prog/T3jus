"use client";
// Laterais da ficha (docs/design/aprovadas/console-v1): o que falta tratar, o resumo e a
// última nota interna. Cada aba escolhe as suas.

import { useId } from "react";
import { ESTAGIOS } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import type { FichaDoCliente, Nota } from "./ficha.ts";
import { dataHora, dataLonga } from "./tempo.ts";

export function LateralTratar({ f }: { f: FichaDoCliente }) {
  const ids = useId();
  const base = `/clientes/${f.escritorio.id}`;
  const s = new Set(f.situacoes);
  const convidado = f.socios.length > 0;
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab" style={{ paddingBottom: 4 }}>
        <h2 id={`${ids}-t`} style={{ fontSize: 20 }}>
          A tratar
        </h2>
      </div>
      <ul className="tratar">
        {s.has("SEM_CONTATO") ? (
          <li>
            <span className="selo selo-atencao">Sem contato</span>
            <a href={`${base}/ficha?editar=1`}>
              Cadastrar
              <Icone nome="dir" className="ico ico-s" />
            </a>
          </li>
        ) : null}
        {s.has("SEM_CONTRATO") ? (
          <li>
            <span className="selo selo-atencao">Sem contrato</span>
            <a href={`${base}/contrato`}>
              Registrar
              <Icone nome="dir" className="ico ico-s" />
            </a>
          </li>
        ) : null}
        {s.has("SEM_SOCIO") || !f.socios.some((x) => x.senhaCriadaEm) ? (
          <li>
            <span className="selo selo-atencao">Sem sócio</span>
            <span className="ok">{convidado ? "Convite enviado" : "Ainda não convidado"}</span>
            <a href={`${base}/socio`}>
              {convidado ? "Ver" : "Convidar"}
              <Icone nome="dir" className="ico ico-s" />
            </a>
          </li>
        ) : null}
        {s.size === 0 && f.socios.some((x) => x.senhaCriadaEm) ? (
          <li>
            <span className="selo selo-ok">
              <Icone nome="check" className="ico" />
              Em dia
            </span>
            <span className="ok">Nada a tratar agora.</span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export function LateralResumo({ f }: { f: FichaDoCliente }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab" style={{ paddingBottom: 0 }}>
        <h2 id={`${ids}-t`} style={{ fontSize: 20 }}>
          Resumo
        </h2>
      </div>
      <dl className="resumo">
        <div>
          <dt>Estágio</dt>
          <dd>{ESTAGIOS[f.cliente.estagio]}</dd>
        </div>
        <div>
          <dt>Contrato</dt>
          <dd>{f.cliente.referenciaContrato ?? "Sem referência"}</dd>
        </div>
        <div>
          <dt>Equipe T3jus</dt>
          <dd>{f.equipe.length ? [...new Set(f.equipe.map((p) => p.nome))].join(", ") : "Ninguém atribuído"}</dd>
        </div>
        <div>
          <dt>Cadastrado em</dt>
          <dd>{dataLonga(f.escritorio.criadoEm)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function UltimaNota({ nota }: { nota: Nota }) {
  const ids = useId();
  return (
    <section className="folha nota" aria-labelledby={`${ids}-t`}>
      <h2 id={`${ids}-t`} className="sobretitulo" style={{ fontFamily: "var(--sans)", fontWeight: 500 }}>
        Última nota interna
      </h2>
      <blockquote>“{nota.texto}”</blockquote>
      <footer>
        {nota.autor.nome ?? "Equipe T3jus"} · {dataHora(nota.criadoEm)}
      </footer>
    </section>
  );
}
